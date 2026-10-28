import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { lockOrderRow } from '../../src/infrastructure/db/row-lock';
import { runInTransaction, transactionClient } from '../../src/infrastructure/db/transaction';
import type { PrismaClient } from '../../src/infrastructure/db/generated/client.ts';
import { appPrisma, ownerPg } from './support/connections';
import { NOW, insertOrder } from './support/fixtures';
import { resetTestDatabase } from './support/reset';

// Primitivas de transacción y de bloqueo de fila con el rol de aplicación (tareas 2.3, 6.1, 6.2).
const OPTIONS = { maxWaitMs: 10_000, timeoutMs: 30_000 };
let prisma: PrismaClient;

beforeAll(() => {
  prisma = appPrisma();
});
afterAll(async () => {
  await prisma.$disconnect();
});
beforeEach(async () => {
  await resetTestDatabase();
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('cliente del runtime (rol de aplicación por la conexión pooled)', () => {
  it('conecta como fixora_app', async () => {
    const rows = await prisma.$queryRaw<{ u: string }[]>`SELECT current_user::text AS u`;
    expect(rows[0].u).toBe('fixora_app');
  });
});

describe('transacción atómica', () => {
  const createOrder = (tx: ReturnType<typeof transactionClient>, id: string, code: string) =>
    tx.repairOrder.create({
      data: {
        id, trackingCode: code, status: 'SOLICITUD_RECIBIDA', customerName: 'Cliente Ficticio',
        customerNameSearch: 'cliente ficticio', customerPhone: '000000000', deviceType: 'CELULAR', brand: 'MarcaX',
        problemDescription: 'prueba', version: 1, createdAt: new Date(NOW), updatedAt: new Date(NOW),
      },
    });

  it('confirma todo el trabajo cuando termina bien', async () => {
    const id = randomUUID();
    await runInTransaction(
      async (ctx) => {
        const tx = transactionClient(ctx);
        await createOrder(tx, id, 'AAAAAAAAAAAA');
        await tx.orderStatusHistory.create({ data: { id: randomUUID(), orderId: id, fromStatus: null, toStatus: 'SOLICITUD_RECIBIDA', occurredAt: new Date(NOW) } });
      },
      OPTIONS,
      prisma,
    );
    const counts = await prisma.$queryRaw<{ o: number; h: number }[]>`
      SELECT (SELECT count(*)::int FROM repair_orders) AS o, (SELECT count(*)::int FROM order_status_history) AS h`;
    expect(counts[0]).toEqual({ o: 1, h: 1 });
  });

  it('revierte TODO el trabajo si algo falla a mitad', async () => {
    const id = randomUUID();
    await expect(
      runInTransaction(
        async (ctx) => {
          const tx = transactionClient(ctx);
          await createOrder(tx, id, 'BBBBBBBBBBBB');
          // Transición inválida: la segunda barrera (CHECK) rechaza el evento y deshace también la orden.
          await tx.orderStatusHistory.create({ data: { id: randomUUID(), orderId: id, fromStatus: 'ENTREGADO', toStatus: 'SOLICITUD_RECIBIDA', occurredAt: new Date(NOW) } });
        },
        OPTIONS,
        prisma,
      ),
    ).rejects.toThrow();
    const counts = await prisma.$queryRaw<{ o: number; h: number }[]>`
      SELECT (SELECT count(*)::int FROM repair_orders) AS o, (SELECT count(*)::int FROM order_status_history) AS h`;
    expect(counts[0]).toEqual({ o: 0, h: 0 });
  });

  it('usa READ COMMITTED explícito', async () => {
    const level = await runInTransaction(
      async (ctx) => transactionClient(ctx).$queryRaw<{ level: string }[]>`SELECT current_setting('transaction_isolation') AS level`,
      OPTIONS,
      prisma,
    );
    expect(level[0].level).toBe('read committed');
  });

  it('no reintenta automáticamente: el trabajo se ejecuta una sola vez aunque falle', async () => {
    let attempts = 0;
    await expect(
      runInTransaction(async () => {
        attempts += 1;
        throw new Error('fallo del caso de uso');
      }, OPTIONS, prisma),
    ).rejects.toThrow('fallo del caso de uso');
    expect(attempts).toBe(1);
  });

  it('respeta el tiempo de espera recibido como parámetro', async () => {
    await expect(
      runInTransaction(async (ctx) => {
        await transactionClient(ctx).$queryRaw`SELECT pg_sleep(2)`;
      }, { maxWaitMs: 5_000, timeoutMs: 300 }, prisma),
    ).rejects.toThrow();
  });

  it('el contexto es opaco y deja de ser válido al terminar la transacción', async () => {
    let leaked: Parameters<typeof transactionClient>[0] | undefined;
    await runInTransaction(async (ctx) => {
      leaked = ctx;
      expect(Object.keys(ctx)).toEqual([]);
    }, OPTIONS, prisma);
    expect(() => transactionClient(leaked as never)).toThrow();
  });
});

describe('bloqueo de fila de la orden (SELECT … FOR UPDATE)', () => {
  it('devuelve false si la orden no existe y true si existe', async () => {
    const owner = await ownerPg();
    try {
      const id = await insertOrder(owner);
      const result = await runInTransaction(async (ctx) => [await lockOrderRow(ctx, id), await lockOrderRow(ctx, randomUUID())], OPTIONS, prisma);
      expect(result).toEqual([true, false]);
    } finally {
      await owner.end();
    }
  });

  it('el segundo bloqueo ESPERA hasta que el primero termina (dos conexiones reales)', async () => {
    const owner = await ownerPg();
    const id = await insertOrder(owner);
    await owner.end();
    const events: string[] = [];
    let firstHasLock!: () => void;
    const firstLocked = new Promise<void>((resolve) => (firstHasLock = resolve));

    const first = runInTransaction(async (ctx) => {
      await lockOrderRow(ctx, id);
      events.push('1:bloqueó');
      firstHasLock();
      await sleep(1_500);
      events.push('1:termina');
    }, OPTIONS, prisma);

    await firstLocked;
    const second = runInTransaction(async (ctx) => {
      events.push('2:pide');
      await lockOrderRow(ctx, id);
      events.push('2:bloqueó');
    }, OPTIONS, prisma);

    await Promise.all([first, second]);
    expect(events).toEqual(['1:bloqueó', '2:pide', '1:termina', '2:bloqueó']);
  });
});
