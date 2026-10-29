import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type pg from 'pg';
import { issueAdminContext } from '../../src/application/admin/admin-context';
import { saveBasicOrderData } from '../../src/application/admin/edit-basic-data';
import { saveDiagnosis } from '../../src/application/admin/edit-diagnosis-cost';
import { getAdminOrderDetail } from '../../src/application/admin/order-detail';
import { listOrders } from '../../src/application/admin/order-directory';
import { createNote } from '../../src/application/admin/order-notes';
import { transitionOrder } from '../../src/application/admin/transition-order';
import { normalizeCustomerNameSearch } from '../../src/domain/repair/customer-name-search';
import type { OrderStatus } from '../../src/domain/repair/order-status';
import { createAdminOrderDetailStore } from '../../src/infrastructure/admin/admin-order-detail-store';
import { createAdminOrderStore } from '../../src/infrastructure/admin/admin-order-store';
import { createOrderDataStore } from '../../src/infrastructure/admin/order-data-store';
import { createOrderEditStore } from '../../src/infrastructure/admin/order-edit-store';
import { createOrderNotesStore } from '../../src/infrastructure/admin/order-notes-store';
import { createOrderTransitionStore } from '../../src/infrastructure/admin/order-transition-store';
import type { PrismaClient } from '../../src/infrastructure/db/generated/client.ts';
import { createPublicOrderStore } from '../../src/infrastructure/tracking/public-order-store';
import { appPrisma, ownerPg } from './support/connections';
import { resetTestDatabase } from './support/reset';

// Corrección de datos básicos contra PostgreSQL real con el rol de aplicación (CHG-13). Sin mocks de Prisma. Datos FICTICIOS.
const admin = issueAdminContext('admin-de-prueba');
const T0 = new Date('2026-10-28T10:00:00.000Z');
const CODE = '23456789BDFG';
const NEEDS_DATA: readonly OrderStatus[] = ['ESPERANDO_APROBACION', 'EN_REPARACION', 'LISTO_PARA_RECOJO', 'ENTREGADO'];

let prisma: PrismaClient;
let owner: pg.Client;
let tick = 0;

const clock = () => new Date(T0.getTime() + (tick += 60_000));
const deps = () => ({ store: createOrderDataStore(prisma), now: clock });
const transitionDeps = () => ({ store: createOrderTransitionStore(prisma), now: clock });

async function insertOrder(status: OrderStatus = 'EN_DIAGNOSTICO', options: { code?: string; version?: number; name?: string } = {}) {
  const id = randomUUID();
  const withData = NEEDS_DATA.includes(status);
  const name = options.name ?? 'José Muñoz';
  await owner.query(
    `INSERT INTO repair_orders (id, tracking_code, status, customer_name, customer_name_search, customer_phone, customer_email,
       device_type, brand, model, problem_description, diagnosis, estimated_cost, version, created_at, updated_at)
     VALUES ($1, $2, $3::order_status, $4, $5, '+51 999 111 222', 'jose@example.com', 'LAPTOP', 'Lenovo', 'T14',
       'No enciende', $6, $7::numeric, $8, $9::timestamptz, $9::timestamptz)`,
    [id, options.code ?? CODE, status, name, normalizeCustomerNameSearch(name), withData ? 'CANARY-DIAGNOSTICO' : null, withData ? '150.00' : null, options.version ?? 1, T0.toISOString()],
  );
  await owner.query(
    'INSERT INTO order_status_history (id, order_id, from_status, to_status, occurred_at) VALUES ($1, $2, NULL, $3::order_status, $4::timestamptz)',
    [randomUUID(), id, 'SOLICITUD_RECIBIDA', T0.toISOString()],
  );
  return id;
}

const row = async (id: string) =>
  (
    await owner.query(
      `SELECT tracking_code, status::text AS status, version, created_at, updated_at, customer_name, customer_name_search, customer_phone,
              customer_email, device_type::text AS device_type, brand, model, problem_description, diagnosis, estimated_cost::text AS cost
       FROM repair_orders WHERE id = $1`,
      [id],
    )
  ).rows[0]!;
const counts = async (id: string) =>
  (
    await owner.query(
      `SELECT (SELECT count(*) FROM order_status_history WHERE order_id = $1)::int AS status_events,
              (SELECT count(*) FROM diagnosis_history WHERE order_id = $1)::int AS diagnosis_events,
              (SELECT count(*) FROM cost_history WHERE order_id = $1)::int AS cost_events,
              (SELECT count(*) FROM order_notes WHERE order_id = $1)::int AS notes`,
      [id],
    )
  ).rows[0]!;

const fix = (id: string, version: number, overrides: Record<string, unknown> = {}) => ({
  orderId: id,
  expectedVersion: version,
  customerName: 'José Muñoz',
  customerPhone: '+51 999 111 222',
  customerEmail: 'jose@example.com',
  deviceType: 'LAPTOP',
  brand: 'Lenovo',
  model: 'T14',
  problemDescription: 'No enciende',
  ...overrides,
});

beforeAll(async () => {
  prisma = appPrisma();
  owner = await ownerPg();
});
afterAll(async () => {
  await prisma.$disconnect();
  await owner.end();
});
beforeEach(async () => {
  tick = 0;
  await resetTestDatabase();
});

describe('corrección efectiva', () => {
  it('varios campos: todos cambian, version + 1 exactamente, sin historial ni notas nuevas, código y fecha intactos', async () => {
    const id = await insertOrder('EN_DIAGNOSTICO', { version: 4 });
    const before = await row(id);
    const eventsBefore = await counts(id);
    const result = await saveBasicOrderData(
      admin,
      fix(id, 4, { customerName: '  María Pérez  ', customerPhone: '(01) 555-1234', customerEmail: '', deviceType: 'TABLET', brand: 'Apple', model: '', problemDescription: 'Pantalla rota' }),
      deps(),
    );
    expect(result).toEqual({ ok: true, data: { version: 5, changed: true } });
    const after = await row(id);
    expect(after).toMatchObject({
      customer_name: 'María Pérez',
      customer_name_search: 'maria perez',
      customer_phone: '(01) 555-1234',
      customer_email: null,
      device_type: 'TABLET',
      brand: 'Apple',
      model: null,
      problem_description: 'Pantalla rota',
      version: 5,
    });
    expect(after.tracking_code).toBe(before.tracking_code);
    expect(after.created_at).toEqual(before.created_at);
    expect(after.status).toBe(before.status);
    expect(after.diagnosis).toBe(before.diagnosis);
    expect(after.cost).toBe(before.cost);
    expect(await counts(id)).toEqual(eventsBefore);
  });

  it('un solo campo (modelo): version + 1 y los demás campos idénticos', async () => {
    const id = await insertOrder('EQUIPO_RECIBIDO');
    const before = await row(id);
    expect(await saveBasicOrderData(admin, fix(id, 1, { model: 'T15' }), deps())).toEqual({ ok: true, data: { version: 2, changed: true } });
    const after = await row(id);
    expect({ ...after, model: undefined, version: undefined, updated_at: undefined }).toEqual({ ...before, model: undefined, version: undefined, updated_at: undefined });
    expect(after).toMatchObject({ model: 'T15', version: 2 });
  });

  it('un cambio solo de mayúsculas del nombre es efectivo; la búsqueda derivada se conserva', async () => {
    const id = await insertOrder();
    expect(await saveBasicOrderData(admin, fix(id, 1, { customerName: 'JOSÉ MUÑOZ' }), deps())).toEqual({ ok: true, data: { version: 2, changed: true } });
    expect(await row(id)).toMatchObject({ customer_name: 'JOSÉ MUÑOZ', customer_name_search: 'jose munoz', version: 2 });
  });

  it('Esperando aprobación admite la corrección sin tocar el diagnóstico ni el costo publicados', async () => {
    const id = await insertOrder('ESPERANDO_APROBACION');
    expect((await saveBasicOrderData(admin, fix(id, 1, { brand: 'Dell' }), deps())).ok).toBe(true);
    expect(await row(id)).toMatchObject({ brand: 'Dell', diagnosis: 'CANARY-DIAGNOSTICO', cost: '150.00', status: 'ESPERANDO_APROBACION' });
  });

  it('todo o nada: un valor inválido entre valores válidos no cambia ningún dato', async () => {
    const id = await insertOrder();
    const before = await row(id);
    const result = await saveBasicOrderData(admin, fix(id, 1, { brand: 'Dell', customerPhone: 'abc' }), deps());
    expect(result).toEqual({ ok: false, code: 'VALIDATION_FAILED', fieldErrors: { customerPhone: 'INVALID_FORMAT' } });
    expect(await row(id)).toEqual(before);
  });
});

describe('no-op, código inmutable y allowlist', () => {
  it('datos idénticos tras normalizar: éxito sin UPDATE (versión y updated_at iguales) y sin historial', async () => {
    const id = await insertOrder();
    const before = await row(id);
    const eventsBefore = await counts(id);
    expect(await saveBasicOrderData(admin, fix(id, 1, { customerName: ' José Muñoz ', brand: '  Lenovo' }), deps())).toEqual({ ok: true, data: { version: 1, changed: false } });
    expect(await row(id)).toEqual(before);
    expect(await counts(id)).toEqual(eventsBefore);
  });

  it('una carga manipulada con código, estado, diagnóstico, costo o versión no escribe nada fuera de la lista', async () => {
    const id = await insertOrder('EN_DIAGNOSTICO', { version: 2 });
    const before = await row(id);
    const result = await saveBasicOrderData(
      admin,
      fix(id, 2, { brand: 'Dell', trackingCode: '22222222222B', status: 'ENTREGADO', diagnosis: 'HACK', estimatedCost: '999', version: 99, createdAt: '2000-01-01T00:00:00Z' }),
      deps(),
    );
    expect(result).toEqual({ ok: true, data: { version: 3, changed: true } });
    const after = await row(id);
    expect(after).toMatchObject({ tracking_code: before.tracking_code, status: 'EN_DIAGNOSTICO', diagnosis: before.diagnosis, cost: before.cost, version: 3, brand: 'Dell' });
    expect(after.created_at).toEqual(before.created_at);
  });

  it('el rol de aplicación no puede reescribir el código ni la fecha de registro (privilegios por columna)', async () => {
    const id = await insertOrder();
    await expect(prisma.$executeRaw`UPDATE "repair_orders" SET "tracking_code" = '22222222222B' WHERE "id" = ${id}::uuid`).rejects.toThrow();
    await expect(prisma.$executeRaw`UPDATE "repair_orders" SET "created_at" = now() WHERE "id" = ${id}::uuid`).rejects.toThrow();
  });
});

describe('orden cerrada y versión', () => {
  it('Entregado y Cancelado con la versión vigente: ORDER_CLOSED sin cambios', async () => {
    for (const [i, status] of (['ENTREGADO', 'CANCELADO'] as const).entries()) {
      const id = await insertOrder(status, { code: `2345678${i + 2}BDFG`.slice(0, 12) });
      const before = await row(id);
      expect(await saveBasicOrderData(admin, fix(id, 1, { brand: 'Dell' }), deps()), status).toEqual({ ok: false, code: 'ORDER_CLOSED' });
      expect(await row(id)).toEqual(before);
    }
  });

  it('versión obsoleta: STALE_ORDER, también sobre una orden ya cerrada y sin ocultarse tras un no-op', async () => {
    const id = await insertOrder('LISTO_PARA_RECOJO', { version: 3 });
    await transitionOrder(admin, { orderId: id, targetStatus: 'ENTREGADO', expectedVersion: 3, confirmed: true }, transitionDeps());
    expect(await saveBasicOrderData(admin, fix(id, 3, { brand: 'Dell' }), deps())).toEqual({ ok: false, code: 'STALE_ORDER' });
    const open = await insertOrder('EN_DIAGNOSTICO', { code: '34567892CDFG', version: 5 });
    expect(await saveBasicOrderData(admin, fix(open, 4), deps())).toEqual({ ok: false, code: 'STALE_ORDER' }); // sin cambios, pero la vista era vieja
  });

  it('dos correcciones con la misma versión: exactamente una gana y la otra recibe STALE_ORDER sin mezclar valores', async () => {
    const id = await insertOrder();
    const [a, b] = await Promise.all([
      saveBasicOrderData(admin, fix(id, 1, { brand: 'Desde A', model: 'A1' }), deps()),
      saveBasicOrderData(admin, fix(id, 1, { brand: 'Desde B', model: 'B1' }), deps()),
    ]);
    expect([a.ok, b.ok].sort()).toEqual([false, true]);
    expect([a, b].find((r) => !r.ok)).toEqual({ ok: false, code: 'STALE_ORDER' });
    const after = await row(id);
    expect(after.version).toBe(2);
    expect(['Desde A|A1', 'Desde B|B1']).toContain(`${after.brand}|${after.model}`);
  });

  it('una transición, un diagnóstico o una nota interponiéndose: la transición y el diagnóstico invalidan la corrección; la nota no', async () => {
    const byTransition = await insertOrder('SOLICITUD_RECIBIDA', { code: '23456782BDFG' });
    await transitionOrder(admin, { orderId: byTransition, targetStatus: 'EQUIPO_RECIBIDO', expectedVersion: 1, confirmed: false }, transitionDeps());
    expect(await saveBasicOrderData(admin, fix(byTransition, 1, { brand: 'Dell' }), deps())).toEqual({ ok: false, code: 'STALE_ORDER' });

    const byDiagnosis = await insertOrder('EN_DIAGNOSTICO', { code: '23456783BDFG' });
    await saveDiagnosis(admin, { orderId: byDiagnosis, diagnosis: 'Nuevo', expectedVersion: 1 }, { store: createOrderEditStore(prisma), now: clock });
    expect(await saveBasicOrderData(admin, fix(byDiagnosis, 1, { brand: 'Dell' }), deps())).toEqual({ ok: false, code: 'STALE_ORDER' });

    const byNote = await insertOrder('EN_DIAGNOSTICO', { code: '23456784BDFG' });
    await createNote(admin, { orderId: byNote, visibility: 'INTERNAL', content: 'Una nota' }, { store: createOrderNotesStore(prisma), now: clock });
    expect(await saveBasicOrderData(admin, fix(byNote, 1, { brand: 'Dell' }), deps())).toEqual({ ok: true, data: { version: 2, changed: true } });
  });

  it('invalidación de E11: una corrección efectiva invalida la confirmación abierta; un guardado sin cambios no', async () => {
    const effective = await insertOrder('EN_DIAGNOSTICO', { code: '23456785BDFG', version: 4 });
    await saveBasicOrderData(admin, fix(effective, 4, { customerPhone: '+51 988 777 666' }), deps());
    const stale = await transitionOrder(admin, { orderId: effective, targetStatus: 'CANCELADO', expectedVersion: 4, confirmed: true }, transitionDeps());
    expect(stale).toMatchObject({ ok: false, code: 'STALE_ORDER' });
    expect((await row(effective)).status).toBe('EN_DIAGNOSTICO');

    const noop = await insertOrder('EN_DIAGNOSTICO', { code: '23456786BDFG', version: 4 });
    await saveBasicOrderData(admin, fix(noop, 4), deps());
    const ok = await transitionOrder(admin, { orderId: noop, targetStatus: 'CANCELADO', expectedVersion: 4, confirmed: true }, transitionDeps());
    expect(ok.ok).toBe(true);
  });
});

describe('búsqueda por nombre y lecturas [SC-11]', () => {
  const list = (search: string) => listOrders(admin, { search }, createAdminOrderStore(prisma));

  it('corregir «José Muñoz» → «María Pérez»: ambos valores cambian atómicamente; la búsqueda anterior ya no la encuentra y la nueva sí', async () => {
    const id = await insertOrder();
    expect((await list('jose munoz')).items.map((o) => o.trackingCode)).toHaveLength(1);
    await saveBasicOrderData(admin, fix(id, 1, { customerName: 'María Pérez' }), deps());
    expect(await row(id)).toMatchObject({ customer_name: 'María Pérez', customer_name_search: 'maria perez' });
    expect((await list('jose munoz')).items).toHaveLength(0);
    expect((await list('maria perez')).items.map((o) => o.customerName)).toEqual(['María Pérez']);
    expect((await list('MARÍA')).items).toHaveLength(1); // misma regla que un nombre registrado
  });

  it('sin cambio de nombre la columna derivada no se reescribe', async () => {
    const id = await insertOrder();
    await owner.query("UPDATE repair_orders SET customer_name_search = 'valor-sentinela' WHERE id = $1", [id]);
    await saveBasicOrderData(admin, fix(id, 1, { brand: 'Dell' }), deps());
    expect((await row(id)).customer_name_search).toBe('valor-sentinela');
  });

  it('el detalle administrativo refleja los valores vigentes y el orden de recientes sigue siendo por antigüedad', async () => {
    const older = await insertOrder('EN_DIAGNOSTICO', { code: '23456787BDFG' });
    await owner.query("UPDATE repair_orders SET created_at = created_at - interval '1 day' WHERE id = $1", [older]);
    const newer = await insertOrder('EN_DIAGNOSTICO', { code: '23456788BDFG', name: 'Otra Persona' });
    await saveBasicOrderData(admin, fix(older, 1, { brand: 'Dell' }), deps());
    const detail = await getAdminOrderDetail(admin, older, createAdminOrderDetailStore(prisma));
    expect(detail).toMatchObject({ canEditBasicData: true, device: { brand: 'Dell' }, version: 2 });
    const page = await listOrders(admin, {}, createAdminOrderStore(prisma));
    expect(page.items.map((o) => o.trackingCode).slice(0, 2)).toEqual(['23456788BDFG', '23456787BDFG']);
    void newer;
  });

  it('el reflejo público: equipo y descripción corregidos; nombre, teléfono y correo siguen fuera; sin evento nuevo en la línea de tiempo', async () => {
    const id = await insertOrder('EN_DIAGNOSTICO');
    const timelineBefore = (await createPublicOrderStore(prisma).findByTrackingCode(CODE))!.statusTimeline;
    await saveBasicOrderData(admin, fix(id, 1, { deviceType: 'PC', brand: 'HP', model: '', problemDescription: 'No arranca', customerName: 'CANARY-NOMBRE-NUEVO', customerPhone: '+51 977 123 4567', customerEmail: 'canary-nuevo@example.com' }), deps());
    const view = await createPublicOrderStore(prisma).findByTrackingCode(CODE);
    expect(view).toMatchObject({ device: { type: 'PC', brand: 'HP', model: null }, problemDescription: 'No arranca' });
    expect(view!.statusTimeline).toEqual(timelineBefore);
    const json = JSON.stringify(view);
    expect(json).not.toMatch(/CANARY|canary-nuevo|977 ?123|"version"|"id"|customer/i);
    expect(Object.keys(view!).sort()).toEqual(['device', 'problemDescription', 'publicNotes', 'repairDetails', 'status', 'statusTimeline', 'trackingCode']);
  });
});
