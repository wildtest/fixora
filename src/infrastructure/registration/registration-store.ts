import 'server-only';
import { isDeviceType, type DeviceType } from '../../domain/repair/device-type';
import { normalizeCustomerNameSearch } from '../../domain/repair/customer-name-search';
import type { RepairRequestInput } from '../../domain/repair/repair-request';
import { getPrisma } from '../db/client';
import type { PrismaClient } from '../db/generated/client.ts';
import { runInTransaction, transactionClient } from '../db/transaction';
import { newUuid } from '../security/crypto';

// Repositorio funcional de registro (CHG-05 D5): orden + evento inicial + asociación de idempotencia en UNA
// transacción, con SQL parametrizado. Sin repositorio genérico y sin tipos de Prisma hacia arriba.
// Las dos unicidades (`tracking_code`, `key_hash`) se resuelven con `ON CONFLICT DO NOTHING` y no con
// excepciones: el UNIQUE de la base de datos es la segunda barrera, no el flujo normal.

export type RegistrationConfirmation = {
  readonly trackingCode: string;
  readonly device: { readonly type: DeviceType; readonly brand: string; readonly model: string | null };
};

export type RegistrationCommand = {
  readonly orderId: string;
  readonly request: RepairRequestInput;
  /** SHA-256 de la clave de idempotencia (la clave cruda nunca llega aquí). */
  readonly keyHash: string;
  readonly now: Date;
  /** Genera un código nuevo; se invoca de nuevo ante una colisión. */
  readonly newTrackingCode: () => string;
};

export type RegistrationStore = {
  register(command: RegistrationCommand): Promise<RegistrationConfirmation>;
};

/** Intentos acotados ante una colisión del código (54 bits de entropía: prácticamente nunca ocurre). */
export const MAX_CODE_ATTEMPTS = 5;
const TRANSACTION = { maxWaitMs: 5_000, timeoutMs: 15_000 } as const;

class KeyAlreadyUsed extends Error {}
class CodeCollision extends Error {}

type ReplayRow = { tracking_code: string; device_type: string; brand: string; model: string | null };

function toConfirmation(row: ReplayRow): RegistrationConfirmation {
  if (!isDeviceType(row.device_type)) throw new Error('Tipo de equipo almacenado no válido.');
  return { trackingCode: row.tracking_code, device: { type: row.device_type, brand: row.brand, model: row.model } };
}

export function createRegistrationStore(prisma: PrismaClient = getPrisma()): RegistrationStore {
  async function findByKeyHash(keyHash: string): Promise<RegistrationConfirmation | null> {
    const rows = await prisma.$queryRaw<ReplayRow[]>`
      SELECT o."tracking_code", o."device_type"::text AS "device_type", o."brand", o."model"
      FROM "registration_idempotency" i
      JOIN "repair_orders" o ON o."id" = i."order_id"
      WHERE i."key_hash" = ${keyHash}`;
    return rows[0] ? toConfirmation(rows[0]) : null;
  }

  async function insertOnce(command: RegistrationCommand, trackingCode: string): Promise<RegistrationConfirmation> {
    const { request, keyHash, orderId } = command;
    const at = command.now.toISOString();
    return runInTransaction(
      async (context) => {
        const tx = transactionClient(context);
        const inserted = await tx.$executeRaw`
          INSERT INTO "repair_orders"
            ("id", "tracking_code", "status", "customer_name", "customer_name_search", "customer_phone",
             "customer_email", "device_type", "brand", "model", "problem_description", "version",
             "created_at", "updated_at")
          VALUES
            (${orderId}::uuid, ${trackingCode}, 'SOLICITUD_RECIBIDA'::order_status, ${request.customerName},
             ${normalizeCustomerNameSearch(request.customerName)}, ${request.customerPhone},
             ${request.customerEmail}, ${request.deviceType}::device_type, ${request.brand}, ${request.model},
             ${request.problemDescription}, 1, ${at}::timestamptz, ${at}::timestamptz)
          ON CONFLICT ("tracking_code") DO NOTHING`;
        if (inserted === 0) throw new CodeCollision();

        await tx.$executeRaw`
          INSERT INTO "order_status_history" ("id", "order_id", "from_status", "to_status", "occurred_at")
          VALUES (${newUuid()}::uuid, ${orderId}::uuid, NULL, 'SOLICITUD_RECIBIDA'::order_status, ${at}::timestamptz)`;

        // Si otra transacción con la misma clave ya confirmó (o confirma mientras esperamos), no se inserta
        // nada: se deshace esta transacción completa y se devuelve el resultado original.
        const associated = await tx.$executeRaw`
          INSERT INTO "registration_idempotency" ("key_hash", "order_id", "created_at")
          VALUES (${keyHash}, ${orderId}::uuid, ${at}::timestamptz)
          ON CONFLICT ("key_hash") DO NOTHING`;
        if (associated === 0) throw new KeyAlreadyUsed();

        return {
          trackingCode,
          device: { type: request.deviceType, brand: request.brand, model: request.model },
        };
      },
      TRANSACTION,
      prisma,
    );
  }

  return {
    async register(command) {
      // Replay del mismo intento: mismo resultado, sin crear nada.
      const existing = await findByKeyHash(command.keyHash);
      if (existing) return existing;

      for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS; attempt += 1) {
        try {
          return await insertOnce(command, command.newTrackingCode());
        } catch (error) {
          if (error instanceof CodeCollision) continue;
          if (error instanceof KeyAlreadyUsed) {
            const winner = await findByKeyHash(command.keyHash);
            if (winner) return winner;
            continue; // el ganador deshizo su transacción: se reintenta
          }
          throw error;
        }
      }
      throw new Error('No se pudo asignar un código de seguimiento único.');
    },
  };
}
