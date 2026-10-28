import 'server-only';
import { getPrisma } from './client';
import { Prisma, type PrismaClient } from './generated/client.ts';

// Transacción atómica (CHG-02, D-10): `READ COMMITTED` explícito, tiempos de espera como parámetros y sin
// reintentos automáticos. `application/` recibe un contexto opaco, nunca el tipo de Prisma.

declare const transactionBrand: unique symbol;

/** Contexto opaco de una transacción abierta. Solo `infrastructure` puede obtener el cliente que contiene. */
export type TransactionContext = { readonly [transactionBrand]: true };

export type TransactionOptions = {
  /** Tiempo máximo para obtener una conexión del pool, en milisegundos. */
  readonly maxWaitMs: number;
  /** Duración máxima de la transacción, en milisegundos. */
  readonly timeoutMs: number;
};

export type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'
>;

const clients = new WeakMap<TransactionContext, TransactionClient>();

/** Solo para `infrastructure`: recupera el cliente de una transacción abierta. */
export function transactionClient(context: TransactionContext): TransactionClient {
  const client = clients.get(context);
  if (!client) throw new Error('El contexto de transacción no está activo.');
  return client;
}

export async function runInTransaction<T>(
  work: (context: TransactionContext) => Promise<T>,
  options: TransactionOptions,
  prisma: PrismaClient = getPrisma(),
): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      const context = Object.freeze({}) as TransactionContext;
      clients.set(context, tx);
      try {
        return await work(context);
      } finally {
        clients.delete(context);
      }
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      maxWait: options.maxWaitMs,
      timeout: options.timeoutMs,
    },
  );
}
