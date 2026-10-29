import 'server-only';
import { isOrderStatus, type OrderStatus } from '../../domain/repair/order-status';
import { getPrisma } from '../db/client';
import type { PrismaClient } from '../db/generated/client.ts';
import { runInTransaction, transactionClient } from '../db/transaction';
import { newUuid } from '../security/crypto';

// Repositorio funcional de la transición de estado (CHG-10 D4/D5): UNA transacción `READ COMMITTED` con la carga de la
// orden vigente, el `UPDATE` condicional por versión y el evento de historial. Sin `GenericRepository` ni tipos de Prisma
// hacia arriba. Este módulo NO conoce las reglas del ciclo de vida (viven en `domain/` y las aplica el caso de uso):
// solo ofrece las dos operaciones atómicas y la segunda barrera de concurrencia (la versión del `UPDATE`).

export type TransitionSnapshot = {
  readonly status: OrderStatus;
  readonly version: number;
  /** Solo PRESENCIA de diagnóstico y costo (no se cargan sus valores). */
  readonly hasDiagnosisAndCost: boolean;
};

export type TransitionChange = {
  readonly orderId: string;
  readonly from: OrderStatus;
  readonly to: OrderStatus;
  readonly expectedVersion: number;
  /** Mismo instante para `updated_at` y para el evento de historial. */
  readonly now: Date;
};

export type TransitionUnit = {
  /** Orden vigente, o `null` si no existe. Sin bloqueo de fila: la integridad la da la versión. */
  load(orderId: string): Promise<TransitionSnapshot | null>;
  /**
   * `UPDATE ... WHERE id AND version = expectedVersion` (+1 a la versión) y, solo si afectó una fila, el evento de
   * historial. 0 filas ⇒ `stale` (otra transición ganó después de la carga): no se escribe nada.
   */
  apply(change: TransitionChange): Promise<'applied' | 'stale'>;
};

export type OrderTransitionStore = {
  inTransaction<T>(work: (unit: TransitionUnit) => Promise<T>): Promise<T>;
};

const TRANSACTION = { maxWaitMs: 5_000, timeoutMs: 15_000 } as const;

type SnapshotRow = { status: string; version: number; has_diagnosis_and_cost: boolean };

export function createOrderTransitionStore(prisma: PrismaClient = getPrisma()): OrderTransitionStore {
  return {
    inTransaction(work) {
      return runInTransaction(
        async (context) => {
          const tx = transactionClient(context);
          const unit: TransitionUnit = {
            async load(orderId) {
              const rows = await tx.$queryRaw<SnapshotRow[]>`
                SELECT o."status"::text AS "status", o."version" AS "version",
                       (o."diagnosis" IS NOT NULL AND btrim(o."diagnosis") <> '' AND o."estimated_cost" IS NOT NULL) AS "has_diagnosis_and_cost"
                FROM "repair_orders" o WHERE o."id" = ${orderId}::uuid`;
              const row = rows[0];
              if (!row) return null;
              if (!isOrderStatus(row.status)) throw new Error('Estado almacenado no válido.');
              return { status: row.status, version: row.version, hasDiagnosisAndCost: row.has_diagnosis_and_cost === true };
            },

            async apply({ orderId, from, to, expectedVersion, now }) {
              const at = now.toISOString();
              const updated = await tx.$executeRaw`
                UPDATE "repair_orders"
                SET "status" = ${to}::order_status, "version" = "version" + 1, "updated_at" = ${at}::timestamptz
                WHERE "id" = ${orderId}::uuid AND "version" = ${expectedVersion}::int AND "status" = ${from}::order_status`;
              if (updated === 0) return 'stale';
              // Un solo evento por transición efectiva, en la MISMA transacción: si falla, se revierte también el UPDATE.
              await tx.$executeRaw`
                INSERT INTO "order_status_history" ("id", "order_id", "from_status", "to_status", "occurred_at")
                VALUES (${newUuid()}::uuid, ${orderId}::uuid, ${from}::order_status, ${to}::order_status, ${at}::timestamptz)`;
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
