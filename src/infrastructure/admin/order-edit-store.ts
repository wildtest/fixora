import 'server-only';
import { centsToMoney, moneyToCents } from '../../domain/repair/money';
import { isOrderStatus, type OrderStatus } from '../../domain/repair/order-status';
import { getPrisma } from '../db/client';
import type { PrismaClient } from '../db/generated/client.ts';
import { runInTransaction, transactionClient } from '../db/transaction';
import { newUuid } from '../security/crypto';

// Repositorio funcional de la edición de diagnóstico y costo (CHG-11 D3/D5): una transacción `READ COMMITTED` por
// guardado con la carga de la orden vigente, el `UPDATE` condicional por versión y el evento de su historial propio.
// Dos operaciones INDEPENDIENTES (cada una con su versión, transacción e historial): no existe una operación combinada
// que pueda dejar un campo guardado y el otro fallido. Sin `GenericRepository` ni tipos de Prisma hacia arriba. Las reglas
// (editabilidad, validación, no-op) viven en dominio/aplicación; aquí solo está la segunda barrera de concurrencia.
// El costo viaja SIEMPRE como cadena decimal canónica y se convierte a `NUMERIC` en la base de datos: nunca pasa por `number`.

export type EditSnapshot = {
  readonly status: OrderStatus;
  readonly version: number;
  readonly diagnosis: string | null;
  /** Cadena decimal canónica de dos decimales, o `null`. */
  readonly estimatedCost: string | null;
};

export type FieldChange = {
  readonly orderId: string;
  readonly expectedVersion: number;
  readonly previous: string | null;
  readonly next: string | null;
  /** Mismo instante para `updated_at` y para el evento de historial. */
  readonly now: Date;
};

export type EditUnit = {
  load(orderId: string): Promise<EditSnapshot | null>;
  /** `UPDATE ... WHERE id AND version = expectedVersion` (+1) y, solo si afectó una fila, su evento de historial. */
  applyDiagnosis(change: FieldChange): Promise<'applied' | 'stale'>;
  applyCost(change: FieldChange): Promise<'applied' | 'stale'>;
};

export type OrderEditStore = {
  inTransaction<T>(work: (unit: EditUnit) => Promise<T>): Promise<T>;
};

const TRANSACTION = { maxWaitMs: 5_000, timeoutMs: 15_000 } as const;

type SnapshotRow = { status: string; version: number; diagnosis: string | null; estimated_cost: string | null };

function canonicalCost(value: string | null): string | null {
  if (value === null) return null;
  const cents = moneyToCents(value);
  if (cents === null) throw new Error('Costo almacenado no válido.');
  return centsToMoney(cents);
}

export function createOrderEditStore(prisma: PrismaClient = getPrisma()): OrderEditStore {
  return {
    inTransaction(work) {
      return runInTransaction(
        async (context) => {
          const tx = transactionClient(context);
          const unit: EditUnit = {
            async load(orderId) {
              const rows = await tx.$queryRaw<SnapshotRow[]>`
                SELECT o."status"::text AS "status", o."version" AS "version", o."diagnosis" AS "diagnosis",
                       o."estimated_cost"::text AS "estimated_cost"
                FROM "repair_orders" o WHERE o."id" = ${orderId}::uuid`;
              const row = rows[0];
              if (!row) return null;
              if (!isOrderStatus(row.status)) throw new Error('Estado almacenado no válido.');
              return { status: row.status, version: row.version, diagnosis: row.diagnosis, estimatedCost: canonicalCost(row.estimated_cost) };
            },

            async applyDiagnosis({ orderId, expectedVersion, previous, next, now }) {
              const at = now.toISOString();
              const updated = await tx.$executeRaw`
                UPDATE "repair_orders"
                SET "diagnosis" = ${next}::text, "version" = "version" + 1, "updated_at" = ${at}::timestamptz
                WHERE "id" = ${orderId}::uuid AND "version" = ${expectedVersion}::int
                  AND "status" IN ('SOLICITUD_RECIBIDA', 'EQUIPO_RECIBIDO', 'EN_DIAGNOSTICO')`;
              if (updated === 0) return 'stale';
              await tx.$executeRaw`
                INSERT INTO "diagnosis_history" ("id", "order_id", "previous_value", "new_value", "occurred_at")
                VALUES (${newUuid()}::uuid, ${orderId}::uuid, ${previous}::text, ${next}::text, ${at}::timestamptz)`;
              return 'applied';
            },

            async applyCost({ orderId, expectedVersion, previous, next, now }) {
              const at = now.toISOString();
              const updated = await tx.$executeRaw`
                UPDATE "repair_orders"
                SET "estimated_cost" = ${next}::numeric, "version" = "version" + 1, "updated_at" = ${at}::timestamptz
                WHERE "id" = ${orderId}::uuid AND "version" = ${expectedVersion}::int
                  AND "status" IN ('SOLICITUD_RECIBIDA', 'EQUIPO_RECIBIDO', 'EN_DIAGNOSTICO')`;
              if (updated === 0) return 'stale';
              await tx.$executeRaw`
                INSERT INTO "cost_history" ("id", "order_id", "previous_value", "new_value", "occurred_at")
                VALUES (${newUuid()}::uuid, ${orderId}::uuid, ${previous}::numeric, ${next}::numeric, ${at}::timestamptz)`;
              return 'applied';
            },
          };
          return work(unit);
        },
        TRANSACTION,
        prisma,
      );
    },
  };
}
