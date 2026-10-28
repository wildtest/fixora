import 'server-only';
import { transactionClient, type TransactionContext } from './transaction';

/**
 * Bloquea la fila de la orden (`SELECT … FOR UPDATE`, SQL parametrizado) hasta el fin de la transacción.
 * Devuelve `false` si la orden no existe. Las notas y los cierres la usan para serializarse (CHG-12).
 */
export async function lockOrderRow(context: TransactionContext, orderId: string): Promise<boolean> {
  const rows = await transactionClient(context).$queryRaw<{ id: string }[]>`
    SELECT "id"::text AS "id" FROM "repair_orders" WHERE "id" = ${orderId}::uuid FOR UPDATE`;
  return rows.length === 1;
}
