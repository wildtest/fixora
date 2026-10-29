import 'server-only';
import { isDeviceType, type DeviceType } from '../../domain/repair/device-type';
import { isOrderStatus, type OrderStatus } from '../../domain/repair/order-status';
import type { RepairRequestInput } from '../../domain/repair/repair-request';
import { getPrisma } from '../db/client';
import type { PrismaClient } from '../db/generated/client.ts';
import { runInTransaction, transactionClient } from '../db/transaction';

// Repositorio de la corrección de datos básicos (CHG-13 D5/D7/D8): una transacción `READ COMMITTED` con la carga de la
// orden vigente y UNA sola sentencia `UPDATE` condicional por versión que escribe, con LISTA CERRADA de columnas, los siete
// datos corregibles y, cuando el nombre cambió, `customer_name_search` en la MISMA sentencia (nunca un segundo UPDATE).
// Nunca toca `id`, `tracking_code`, `status`, `diagnosis`, `estimated_cost` ni `created_at`, ni escribe historiales ni
// notas. Las reglas (existencia, versión, terminalidad, validación, no-op) viven en aplicación; aquí solo está la segunda
// barrera de concurrencia (0 filas ⇒ `stale`). El bloqueo de fila de CHG-12 NO se usa: la versión basta (D5).

export type BasicDataSnapshot = RepairRequestInput & {
  readonly status: OrderStatus;
  readonly version: number;
};

export type BasicDataChange = {
  readonly orderId: string;
  readonly expectedVersion: number;
  readonly data: RepairRequestInput;
  /** Valor derivado de búsqueda; `null` cuando el nombre NO cambió (la columna no se reescribe). */
  readonly nameSearch: string | null;
  readonly now: Date;
};

export type BasicDataUnit = {
  load(orderId: string): Promise<BasicDataSnapshot | null>;
  apply(change: BasicDataChange): Promise<'applied' | 'stale'>;
};

export type OrderDataStore = {
  inTransaction<T>(work: (unit: BasicDataUnit) => Promise<T>): Promise<T>;
};

const TRANSACTION = { maxWaitMs: 5_000, timeoutMs: 15_000 } as const;

type Row = {
  status: string;
  version: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  device_type: string;
  brand: string;
  model: string | null;
  problem_description: string;
};

export function createOrderDataStore(prisma: PrismaClient = getPrisma()): OrderDataStore {
  return {
    inTransaction(work) {
      return runInTransaction(
        async (context) => {
          const tx = transactionClient(context);
          const unit: BasicDataUnit = {
            async load(orderId) {
              const rows = await tx.$queryRaw<Row[]>`
                SELECT o."status"::text AS "status", o."version" AS "version", o."customer_name", o."customer_phone",
                       o."customer_email", o."device_type"::text AS "device_type", o."brand", o."model", o."problem_description"
                FROM "repair_orders" o WHERE o."id" = ${orderId}::uuid`;
              const row = rows[0];
              if (!row) return null;
              if (!isOrderStatus(row.status) || !isDeviceType(row.device_type)) throw new Error('Estado o tipo de equipo almacenado no válido.');
              return {
                status: row.status,
                version: row.version,
                customerName: row.customer_name,
                customerPhone: row.customer_phone,
                customerEmail: row.customer_email,
                deviceType: row.device_type as DeviceType,
                brand: row.brand,
                model: row.model,
                problemDescription: row.problem_description,
              };
            },

            async apply({ orderId, expectedVersion, data, nameSearch, now }) {
              const at = now.toISOString();
              // `customer_name_search` solo se reescribe si el nombre cambió; `COALESCE` conserva el valor vigente si no.
              const updated = await tx.$executeRaw`
                UPDATE "repair_orders"
                SET "customer_name" = ${data.customerName},
                    "customer_name_search" = COALESCE(${nameSearch}::text, "customer_name_search"),
                    "customer_phone" = ${data.customerPhone},
                    "customer_email" = ${data.customerEmail}::text,
                    "device_type" = ${data.deviceType}::device_type,
                    "brand" = ${data.brand},
                    "model" = ${data.model}::text,
                    "problem_description" = ${data.problemDescription},
                    "version" = "version" + 1,
                    "updated_at" = ${at}::timestamptz
                WHERE "id" = ${orderId}::uuid AND "version" = ${expectedVersion}::int
                  AND "status" NOT IN ('ENTREGADO', 'CANCELADO')`;
              return updated === 0 ? 'stale' : 'applied';
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
