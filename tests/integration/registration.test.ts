import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type pg from 'pg';
import { registerRepair, type RegisterRepairDependencies } from '../../src/application/register-repair';
import { generateTrackingCode, isTrackingCode } from '../../src/domain/repair/tracking-code';
import type { PrismaClient } from '../../src/infrastructure/db/generated/client.ts';
import { MAX_CODE_ATTEMPTS, createRegistrationStore } from '../../src/infrastructure/registration/registration-store';
import { newUuid, secureRandomBytes, sha256Hex } from '../../src/infrastructure/security/crypto';
import { appPrisma, ownerPg } from './support/connections';
import { insertOrder } from './support/fixtures';
import { resetTestDatabase } from './support/reset';

// Registro de reparaciones contra PostgreSQL real con el rol de aplicación (CHG-05). Sin mocks de Prisma.
const FORM = {
  customerName: 'Ana Muñoz',
  customerPhone: '+51 987 654 321',
  customerEmail: '',
  deviceType: 'LAPTOP',
  brand: 'Lenovo',
  model: '',
  problemDescription: 'No enciende <b>nada</b>',
};
const newKey = () => Buffer.from(secureRandomBytes(32)).toString('base64url');

let prisma: PrismaClient;
let owner: pg.Client;

function dependencies(overrides: Partial<RegisterRepairDependencies> = {}): RegisterRepairDependencies {
  const store = createRegistrationStore(prisma);
  return {
    register: (command) => store.register(command),
    newOrderId: newUuid,
    newTrackingCode: () => generateTrackingCode(secureRandomBytes),
    hashKey: sha256Hex,
    now: () => new Date('2026-10-28T10:00:00.000Z'),
    ...overrides,
  };
}

const count = async (table: string) =>
  (await owner.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n as number;

beforeAll(async () => {
  prisma = appPrisma();
  owner = await ownerPg();
});
afterAll(async () => {
  await prisma.$disconnect();
  await owner.end();
});
beforeEach(async () => {
  await resetTestDatabase();
});

describe('[SC-01] registro exitoso', () => {
  it('crea una orden en SOLICITUD_RECIBIDA con su evento inicial y la asociación de idempotencia, de forma atómica', async () => {
    const key = newKey();
    const result = await registerRepair(FORM, key, dependencies());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(isTrackingCode(result.data.trackingCode)).toBe(true);

    const order = (await owner.query('SELECT * FROM repair_orders')).rows;
    expect(order).toHaveLength(1);
    expect(order[0]).toMatchObject({
      tracking_code: result.data.trackingCode,
      status: 'SOLICITUD_RECIBIDA',
      customer_name: 'Ana Muñoz',
      customer_name_search: 'ana munoz', // poblado en el mismo INSERT, no en una actualización posterior
      customer_phone: '+51 987 654 321',
      customer_email: null,
      device_type: 'LAPTOP',
      brand: 'Lenovo',
      model: null,
      problem_description: 'No enciende <b>nada</b>', // texto literal, sin interpretar
      diagnosis: null,
      estimated_cost: null,
      version: 1,
    });
    const history = (await owner.query('SELECT * FROM order_status_history')).rows;
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ order_id: order[0].id, from_status: null, to_status: 'SOLICITUD_RECIBIDA' });
    expect((await owner.query('SELECT key_hash, order_id FROM registration_idempotency')).rows).toEqual([
      { key_hash: sha256Hex(key), order_id: order[0].id },
    ]);
    expect(await count('diagnosis_history')).toBe(0);
    expect(await count('cost_history')).toBe(0);
    expect(await count('order_notes')).toBe(0);
  });

  it('la clave cruda no se persiste en ninguna tabla [E1]', async () => {
    const key = newKey();
    await registerRepair(FORM, key, dependencies());
    for (const table of ['repair_orders', 'order_status_history', 'registration_idempotency']) {
      const dump = JSON.stringify((await owner.query(`SELECT * FROM ${table}`)).rows);
      expect(dump, table).not.toContain(key);
    }
  });

  it('correo y modelo informados se guardan; la confirmación es un DTO mínimo', async () => {
    const result = await registerRepair({ ...FORM, customerEmail: 'ana@example.com', model: 'T14' }, newKey(), dependencies());
    expect(result.ok && Object.keys(result.data).sort()).toEqual(['device', 'trackingCode']);
    expect(result.ok && result.data.device).toEqual({ type: 'LAPTOP', brand: 'Lenovo', model: 'T14' });
    const row = (await owner.query('SELECT customer_email, model FROM repair_orders')).rows[0];
    expect(row).toEqual({ customer_email: 'ana@example.com', model: 'T14' });
  });

  it('el código cumple el formato aprobado y no guarda relación con los datos', async () => {
    const a = await registerRepair(FORM, newKey(), dependencies());
    const b = await registerRepair(FORM, newKey(), dependencies());
    expect(a.ok && b.ok && a.data.trackingCode !== b.data.trackingCode).toBe(true);
    expect(a.ok && a.data.trackingCode).toMatch(/^[2-9BDFGHJKMNPRSTWX]{12}$/);
  });
});

describe('[SC-16] validación sin efectos', () => {
  it('una entrada inválida no crea orden, historial ni idempotencia, y no consume la clave', async () => {
    const key = newKey();
    const rejected = await registerRepair({ ...FORM, customerPhone: '12' }, key, dependencies());
    expect(rejected).toMatchObject({ ok: false, code: 'VALIDATION_FAILED', fieldErrors: { customerPhone: 'INVALID_FORMAT' } });
    expect(await count('repair_orders')).toBe(0);
    expect(await count('order_status_history')).toBe(0);
    expect(await count('registration_idempotency')).toBe(0);
    // Corregida, la MISMA clave registra normalmente.
    expect((await registerRepair(FORM, key, dependencies())).ok).toBe(true);
    expect(await count('repair_orders')).toBe(1);
  });
});

describe('[E1] idempotencia', () => {
  it('el replay del mismo intento devuelve el mismo resultado sin crear una segunda orden', async () => {
    const key = newKey();
    const first = await registerRepair(FORM, key, dependencies());
    const second = await registerRepair(FORM, key, dependencies());
    const third = await registerRepair({ ...FORM, brand: 'Otra' }, key, dependencies()); // aunque el cuerpo cambie, es el mismo intento
    expect(second).toEqual(first);
    expect(third).toEqual(first);
    expect(await count('repair_orders')).toBe(1);
    expect(await count('order_status_history')).toBe(1);
  });

  it('el envío simultáneo del mismo intento deja una sola orden y todas las respuestas traen el mismo código', async () => {
    const key = newKey();
    const results = await Promise.all(Array.from({ length: 8 }, () => registerRepair(FORM, key, dependencies())));
    const codes = new Set(results.map((r) => (r.ok ? r.data.trackingCode : 'ERROR')));
    expect(codes.size).toBe(1);
    expect(codes.has('ERROR')).toBe(false);
    expect(await count('repair_orders')).toBe(1);
    expect(await count('order_status_history')).toBe(1);
    expect(await count('registration_idempotency')).toBe(1);
  });

  it('dos solicitudes deliberadas con datos iguales son dos órdenes independientes', async () => {
    const a = await registerRepair(FORM, newKey(), dependencies());
    const b = await registerRepair(FORM, newKey(), dependencies());
    expect(a.ok && b.ok && a.data.trackingCode).not.toBe(b.ok && b.data.trackingCode);
    expect(await count('repair_orders')).toBe(2);
  });
});

describe('[E17] unicidad del código y colisiones', () => {
  it('ante una colisión asigna otro código y no repite el existente', async () => {
    const owner0 = await insertOrder(owner, { tracking_code: 'ABCDEFGHJKMN' });
    expect(owner0).toBeTruthy();
    const codes = ['ABCDEFGHJKMN', 'ABCDEFGHJKMN', 'PRSTWX234567'];
    let calls = 0;
    const result = await registerRepair(FORM, newKey(), dependencies({ newTrackingCode: () => codes[calls++] ?? 'WWWWWWWWWWWW' }));
    expect(result).toEqual({ ok: true, data: expect.objectContaining({ trackingCode: 'PRSTWX234567' }) });
    expect(calls).toBe(3);
    expect(await count('repair_orders')).toBe(2);
    expect((await owner.query('SELECT count(DISTINCT tracking_code)::int AS n FROM repair_orders')).rows[0].n).toBe(2);
  });

  it('si todos los intentos colisionan, falla de forma segura sin dejar nada parcial', async () => {
    await insertOrder(owner, { tracking_code: 'ABCDEFGHJKMN' });
    let calls = 0;
    await expect(
      registerRepair(FORM, newKey(), dependencies({ newTrackingCode: () => (calls++, 'ABCDEFGHJKMN') })),
    ).rejects.toThrow();
    expect(calls).toBe(MAX_CODE_ATTEMPTS);
    expect(await count('repair_orders')).toBe(1); // solo la preexistente
    expect(await count('order_status_history')).toBe(0);
    expect(await count('registration_idempotency')).toBe(0);
  });

  it('el código de una orden no puede reemplazarse con el rol de aplicación', async () => {
    const result = await registerRepair(FORM, newKey(), dependencies());
    expect(result.ok).toBe(true);
    await expect(prisma.$executeRaw`UPDATE "repair_orders" SET "tracking_code" = 'ZZZZZZZZZZZZ'`).rejects.toThrow();
  });
});

describe('atomicidad', () => {
  it('si falla el evento inicial no queda ninguna orden: todo se deshace', async () => {
    await owner.query('ALTER TABLE order_status_history RENAME TO order_status_history_off');
    try {
      await expect(registerRepair(FORM, newKey(), dependencies())).rejects.toThrow();
    } finally {
      await owner.query('ALTER TABLE order_status_history_off RENAME TO order_status_history');
    }
    expect(await count('repair_orders')).toBe(0);
    expect(await count('registration_idempotency')).toBe(0);
  });

  it('si falla la asociación de idempotencia no queda ninguna orden ni historial', async () => {
    await owner.query('ALTER TABLE registration_idempotency RENAME TO registration_idempotency_off');
    try {
      await expect(registerRepair(FORM, newKey(), dependencies())).rejects.toThrow();
    } finally {
      await owner.query('ALTER TABLE registration_idempotency_off RENAME TO registration_idempotency');
    }
    expect(await count('repair_orders')).toBe(0);
    expect(await count('order_status_history')).toBe(0);
  });
});
