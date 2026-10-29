import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type pg from 'pg';
import { issueAdminContext } from '../../src/application/admin/admin-context';
import { saveDiagnosis, saveEstimatedCost } from '../../src/application/admin/edit-diagnosis-cost';
import { getAdminOrderDetail } from '../../src/application/admin/order-detail';
import { transitionOrder } from '../../src/application/admin/transition-order';
import type { OrderStatus } from '../../src/domain/repair/order-status';
import { createAdminOrderDetailStore } from '../../src/infrastructure/admin/admin-order-detail-store';
import { createOrderEditStore, type OrderEditStore } from '../../src/infrastructure/admin/order-edit-store';
import { createOrderTransitionStore } from '../../src/infrastructure/admin/order-transition-store';
import type { PrismaClient } from '../../src/infrastructure/db/generated/client.ts';
import { createPublicOrderStore } from '../../src/infrastructure/tracking/public-order-store';
import { appPrisma, ownerPg } from './support/connections';
import { resetTestDatabase } from './support/reset';

// Diagnóstico y costo estimado contra PostgreSQL real con el rol de aplicación (CHG-11). Sin mocks de Prisma. Datos FICTICIOS.
const admin = issueAdminContext('admin-de-prueba');
const T0 = new Date('2026-10-28T10:00:00.000Z');
const CODE = '23456789BDFG';
// SC-07 (CHECK de la base de datos): estos estados exigen diagnóstico y costo.
const NEEDS_DATA: readonly OrderStatus[] = ['ESPERANDO_APROBACION', 'EN_REPARACION', 'LISTO_PARA_RECOJO', 'ENTREGADO'];
const PATH: Record<string, [string | null, string][]> = {
  SOLICITUD_RECIBIDA: [[null, 'SOLICITUD_RECIBIDA']],
  EQUIPO_RECIBIDO: [[null, 'SOLICITUD_RECIBIDA'], ['SOLICITUD_RECIBIDA', 'EQUIPO_RECIBIDO']],
  EN_DIAGNOSTICO: [[null, 'SOLICITUD_RECIBIDA'], ['SOLICITUD_RECIBIDA', 'EQUIPO_RECIBIDO'], ['EQUIPO_RECIBIDO', 'EN_DIAGNOSTICO']],
  ESPERANDO_APROBACION: [[null, 'SOLICITUD_RECIBIDA'], ['SOLICITUD_RECIBIDA', 'EQUIPO_RECIBIDO'], ['EQUIPO_RECIBIDO', 'EN_DIAGNOSTICO'], ['EN_DIAGNOSTICO', 'ESPERANDO_APROBACION']],
};

let prisma: PrismaClient;
let owner: pg.Client;
let tick = 0;

const editStore = (): OrderEditStore => createOrderEditStore(prisma);
const clock = () => new Date(T0.getTime() + (tick += 60_000));
const deps = (store: OrderEditStore = editStore()) => ({ store, now: clock });
const transitionDeps = () => ({ store: createOrderTransitionStore(prisma), now: clock });

type Seed = { status?: OrderStatus; version?: number; diagnosis?: string | null; cost?: string | null; code?: string; history?: [string | null, string][] };

async function insertOrder(options: Seed = {}) {
  const status = options.status ?? 'SOLICITUD_RECIBIDA';
  const id = randomUUID();
  const withData = NEEDS_DATA.includes(status);
  const diagnosis = options.diagnosis === undefined ? (withData ? 'CANARY-DIAGNOSTICO' : null) : options.diagnosis;
  const cost = options.cost === undefined ? (withData ? '150.00' : null) : options.cost;
  await owner.query(
    `INSERT INTO repair_orders (id, tracking_code, status, customer_name, customer_name_search, customer_phone, customer_email,
       device_type, brand, model, problem_description, diagnosis, estimated_cost, version, created_at, updated_at)
     VALUES ($1, $2, $3::order_status, 'CANARY-NOMBRE', 'canary-nombre', 'CANARY-TELEFONO', 'canary@example.com', 'LAPTOP', 'Lenovo', 'T14',
       'No enciende', $4, $5::numeric, $6, $7::timestamptz, $7::timestamptz)`,
    [id, options.code ?? CODE, status, diagnosis, cost, options.version ?? 1, T0.toISOString()],
  );
  const path = options.history ?? PATH[status] ?? [[null, 'SOLICITUD_RECIBIDA']];
  let minute = 0;
  for (const [from, to] of path) {
    await owner.query(
      'INSERT INTO order_status_history (id, order_id, from_status, to_status, occurred_at) VALUES ($1, $2, $3::order_status, $4::order_status, $5::timestamptz)',
      [randomUUID(), id, from, to, new Date(T0.getTime() + (minute += 1) * 1000).toISOString()],
    );
  }
  return id;
}

const row = async (id: string) =>
  (await owner.query('SELECT status::text AS status, version, diagnosis, estimated_cost::text AS cost FROM repair_orders WHERE id = $1', [id])).rows[0]!;
const diagnosisEvents = async (id: string) =>
  (await owner.query('SELECT previous_value AS "previous", new_value AS "next" FROM diagnosis_history WHERE order_id = $1 ORDER BY occurred_at, id', [id])).rows;
const costEvents = async (id: string) =>
  (await owner.query('SELECT previous_value::text AS "previous", new_value::text AS "next" FROM cost_history WHERE order_id = $1 ORDER BY occurred_at, id', [id])).rows;
const snapshot = async (id: string) => JSON.stringify([await row(id), await diagnosisEvents(id), await costEvents(id)]);

const diag = (orderId: string, diagnosis: unknown, expectedVersion: number) => ({ orderId, diagnosis, expectedVersion });
const cost = (orderId: string, estimatedCost: unknown, expectedVersion: number) => ({ orderId, estimatedCost, expectedVersion });

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

describe('diagnóstico: crear, modificar, limpiar y no-op', () => {
  it('crea, modifica y limpia con un evento propio cada vez, versión +1 efectiva y ningún evento de costo', async () => {
    const id = await insertOrder({ status: 'EN_DIAGNOSTICO' });
    expect(await saveDiagnosis(admin, diag(id, '  Placa dañada  ', 1), deps())).toEqual({ ok: true, data: { version: 2, changed: true } });
    expect(await saveDiagnosis(admin, diag(id, 'Placa dañada y batería', 2), deps())).toEqual({ ok: true, data: { version: 3, changed: true } });
    expect(await saveDiagnosis(admin, diag(id, '   ', 3), deps())).toEqual({ ok: true, data: { version: 4, changed: true } });
    expect(await row(id)).toMatchObject({ diagnosis: null, version: 4 });
    expect(await diagnosisEvents(id)).toEqual([
      { previous: null, next: 'Placa dañada' },
      { previous: 'Placa dañada', next: 'Placa dañada y batería' },
      { previous: 'Placa dañada y batería', next: null },
    ]);
    expect(await costEvents(id)).toEqual([]);
  });

  it('un valor idéntico es un no-op: sin versión nueva y sin historial', async () => {
    const id = await insertOrder({ status: 'EN_DIAGNOSTICO', diagnosis: 'Placa dañada', cost: null });
    expect(await saveDiagnosis(admin, diag(id, ' Placa dañada ', 1), deps())).toEqual({ ok: true, data: { version: 1, changed: false } });
    expect(await row(id)).toMatchObject({ version: 1 });
    expect(await diagnosisEvents(id)).toEqual([]);
  });

  it('2000 caracteres es válido y 2001 se rechaza con TOO_LONG sin escribir; el marcado se conserva como texto', async () => {
    const id = await insertOrder({ status: 'EQUIPO_RECIBIDO' });
    expect(await saveDiagnosis(admin, diag(id, 'a'.repeat(2001), 1), deps())).toEqual({ ok: false, code: 'VALIDATION_FAILED', fieldErrors: { diagnosis: 'TOO_LONG' } });
    expect(await row(id)).toMatchObject({ version: 1, diagnosis: null });
    expect((await saveDiagnosis(admin, diag(id, '<script>alert(1)</script>'.padEnd(2000, 'x'), 1), deps())).ok).toBe(true);
    expect((await row(id)).diagnosis).toMatch(/^<script>alert\(1\)<\/script>x+$/);
  });
});

describe('costo estimado: dinero exacto', () => {
  it('guarda siempre con dos decimales (NUMERIC) y registra los valores anterior y nuevo exactos', async () => {
    const id = await insertOrder({ status: 'EN_DIAGNOSTICO' });
    await saveEstimatedCost(admin, cost(id, '50', 1), deps());
    await saveEstimatedCost(admin, cost(id, '50.5', 2), deps());
    await saveEstimatedCost(admin, cost(id, '1250.50', 3), deps());
    expect((await row(id)).cost).toBe('1250.50');
    expect(await costEvents(id)).toEqual([
      { previous: null, next: '50.00' },
      { previous: '50.00', next: '50.50' },
      { previous: '50.50', next: '1250.50' },
    ]);
  });

  it('conserva la exactitud donde number fallaría (montos de más de 15 dígitos significativos)', async () => {
    const id = await insertOrder({ status: 'EN_DIAGNOSTICO' });
    await saveEstimatedCost(admin, cost(id, '123456789012345678.90', 1), deps());
    expect((await row(id)).cost).toBe('123456789012345678.90');
    const detail = await getAdminOrderDetail(admin, id, createAdminOrderDetailStore(prisma));
    expect(detail?.estimatedCost).toBe('123456789012345678.90');
    expect(detail?.history.find((e) => e.type === 'COST')).toMatchObject({ next: '123456789012345678.90' });
  });

  it('rechaza cero, negativos, más de dos decimales y no numéricos sin redondear ni escribir', async () => {
    const id = await insertOrder({ status: 'EN_DIAGNOSTICO' });
    const before = await snapshot(id);
    for (const bad of ['0', '0.00', '-5', '50.123', '1.005', 'abc', '5,50', 'S/ 50']) {
      expect(await saveEstimatedCost(admin, cost(id, bad, 1), deps()), bad).toEqual({
        ok: false, code: 'VALIDATION_FAILED', fieldErrors: { estimatedCost: 'INVALID_FORMAT' },
      });
    }
    expect(await snapshot(id)).toBe(before);
  });

  it('limpiar deja el costo ausente (nunca cero) y un costo igual por valor («50» frente a 50.00) es un no-op', async () => {
    const id = await insertOrder({ status: 'EN_DIAGNOSTICO', cost: '50.00' });
    expect(await saveEstimatedCost(admin, cost(id, '50', 1), deps())).toEqual({ ok: true, data: { version: 1, changed: false } });
    expect(await costEvents(id)).toEqual([]);
    expect(await saveEstimatedCost(admin, cost(id, '', 1), deps())).toEqual({ ok: true, data: { version: 2, changed: true } });
    expect((await row(id)).cost).toBeNull();
    expect(await costEvents(id)).toEqual([{ previous: '50.00', next: null }]);
  });
});

describe('guardados independientes y concurrencia', () => {
  it('guardar el diagnóstico solo crea su evento; guardar el costo, el suyo; cada uno usa la versión vigente', async () => {
    const id = await insertOrder({ status: 'EN_DIAGNOSTICO' });
    await saveDiagnosis(admin, diag(id, 'Falla', 1), deps());
    expect([await diagnosisEvents(id), await costEvents(id)]).toEqual([[{ previous: null, next: 'Falla' }], []]);
    // El costo debe usar la versión 2 (no la 1): con la 1 es una edición desfasada.
    expect(await saveEstimatedCost(admin, cost(id, '10', 1), deps())).toEqual({ ok: false, code: 'STALE_ORDER' });
    expect(await saveEstimatedCost(admin, cost(id, '10', 2), deps())).toEqual({ ok: true, data: { version: 3, changed: true } });
    expect([(await diagnosisEvents(id)).length, (await costEvents(id)).length]).toEqual([1, 1]);
  });

  it('dos pestañas con la misma versión: una gana y la otra recibe STALE_ORDER, aunque editen campos distintos (sin fusión)', async () => {
    const id = await insertOrder({ status: 'EN_DIAGNOSTICO' });
    const [a, b] = await Promise.all([saveDiagnosis(admin, diag(id, 'Desde A', 1), deps()), saveEstimatedCost(admin, cost(id, '77', 1), deps())]);
    expect([a, b].filter((r) => r.ok)).toHaveLength(1);
    expect([a, b].filter((r) => !r.ok && r.code === 'STALE_ORDER')).toHaveLength(1);
    expect((await row(id)).version).toBe(2);
    expect((await diagnosisEvents(id)).length + (await costEvents(id)).length).toBe(1);
  });

  it('carrera posterior a la carga: el UPDATE condicional afecta 0 filas y devuelve STALE_ORDER sin historial', async () => {
    const id = await insertOrder({ status: 'EN_DIAGNOSTICO' });
    const real = editStore();
    const racing: OrderEditStore = {
      inTransaction: (work) =>
        real.inTransaction((unit) =>
          work({
            ...unit,
            load: async (orderId) => {
              const loaded = await unit.load(orderId);
              await owner.query('UPDATE repair_orders SET version = version + 1 WHERE id = $1', [orderId]);
              return loaded;
            },
          }),
        ),
    };
    expect(await saveDiagnosis(admin, diag(id, 'Tarde', 1), deps(racing))).toEqual({ ok: false, code: 'STALE_ORDER' });
    expect(await row(id)).toMatchObject({ version: 2, diagnosis: null });
    expect(await diagnosisEvents(id)).toEqual([]);
  });

  it('atomicidad: si falla el evento de historial se revierte también el valor y la versión', async () => {
    const id = await insertOrder({ status: 'EN_DIAGNOSTICO' });
    await owner.query("ALTER TABLE diagnosis_history ADD CONSTRAINT zz_test_block CHECK (new_value <> 'BOOM') NOT VALID");
    await owner.query('ALTER TABLE cost_history ADD CONSTRAINT zz_test_block CHECK (new_value <> 999) NOT VALID');
    try {
      await expect(saveDiagnosis(admin, diag(id, 'BOOM', 1), deps())).rejects.toThrow();
      await expect(saveEstimatedCost(admin, cost(id, '999', 1), deps())).rejects.toThrow();
    } finally {
      await owner.query('ALTER TABLE diagnosis_history DROP CONSTRAINT zz_test_block');
      await owner.query('ALTER TABLE cost_history DROP CONSTRAINT zz_test_block');
    }
    expect(await row(id)).toMatchObject({ version: 1, diagnosis: null, cost: null });
    expect([await diagnosisEvents(id), await costEvents(id)]).toEqual([[], []]);
  });
});

describe('congelamiento y terminalidad', () => {
  it.each(['ESPERANDO_APROBACION', 'EN_REPARACION', 'LISTO_PARA_RECOJO'] as const)(
    '%s con la versión vigente: DIAGNOSIS_AND_COST_FROZEN, sin escritura, sin versión nueva y sin historial',
    async (status) => {
      const id = await insertOrder({ status, history: [[null, 'SOLICITUD_RECIBIDA']] });
      const before = await snapshot(id);
      expect(await saveDiagnosis(admin, diag(id, 'Otro', 1), deps())).toEqual({ ok: false, code: 'DIAGNOSIS_AND_COST_FROZEN' });
      expect(await saveEstimatedCost(admin, cost(id, '1', 1), deps())).toEqual({ ok: false, code: 'DIAGNOSIS_AND_COST_FROZEN' });
      expect(await snapshot(id)).toBe(before);
    },
  );

  it.each(['ENTREGADO', 'CANCELADO'] as const)('%s: ORDER_CLOSED (solo para estados finales), sin escritura', async (status) => {
    const id = await insertOrder({ status, history: [[null, 'SOLICITUD_RECIBIDA']] });
    const before = await snapshot(id);
    expect(await saveDiagnosis(admin, diag(id, 'Otro', 1), deps())).toEqual({ ok: false, code: 'ORDER_CLOSED' });
    expect(await saveEstimatedCost(admin, cost(id, '1', 1), deps())).toEqual({ ok: false, code: 'ORDER_CLOSED' });
    expect(await snapshot(id)).toBe(before);
  });

  it('precedencia: con una versión distinta, una orden congelada o final responde STALE_ORDER primero', async () => {
    for (const status of ['ESPERANDO_APROBACION', 'ENTREGADO'] as const) {
      const id = await insertOrder({ status, version: 5, history: [[null, 'SOLICITUD_RECIBIDA']], code: status === 'ENTREGADO' ? '22222222222B' : CODE });
      expect(await saveDiagnosis(admin, diag(id, 'x', 4), deps()), status).toEqual({ ok: false, code: 'STALE_ORDER' });
      expect(await row(id)).toMatchObject({ version: 5 });
    }
  });

  it('flujo real: editar, avanzar a Esperando aprobación (se congela) y la edición posterior se rechaza', async () => {
    const id = await insertOrder({ status: 'EN_DIAGNOSTICO' });
    expect(await transitionOrder(admin, { orderId: id, targetStatus: 'ESPERANDO_APROBACION', expectedVersion: 1, confirmed: true }, transitionDeps())).toEqual({ ok: false, code: 'DIAGNOSIS_AND_COST_REQUIRED' });
    await saveDiagnosis(admin, diag(id, 'Cambio de pantalla', 1), deps());
    await saveEstimatedCost(admin, cost(id, '180', 2), deps());
    const advanced = await transitionOrder(admin, { orderId: id, targetStatus: 'ESPERANDO_APROBACION', expectedVersion: 3, confirmed: true }, transitionDeps());
    expect(advanced).toEqual({ ok: true, data: { status: 'ESPERANDO_APROBACION', version: 4 } });
    expect(await saveDiagnosis(admin, diag(id, 'Cambio de batería', 4), deps())).toEqual({ ok: false, code: 'DIAGNOSIS_AND_COST_FROZEN' });
    expect(await row(id)).toMatchObject({ diagnosis: 'Cambio de pantalla', cost: '180.00', version: 4 });
  });

  it('(E11) la confirmación abierta en la versión N queda desactualizada si el diagnóstico o el costo cambian: STALE_ORDER y no se publica nada', async () => {
    const id = await insertOrder({ status: 'EN_DIAGNOSTICO', diagnosis: 'Diagnóstico revisado', cost: '100.00', version: 7 });
    // El administrador abrió el diálogo con la versión 7 y, antes de confirmar, el costo cambia (versión 8).
    await saveEstimatedCost(admin, cost(id, '120', 7), deps());
    const stale = await transitionOrder(admin, { orderId: id, targetStatus: 'ESPERANDO_APROBACION', expectedVersion: 7, confirmed: true }, transitionDeps());
    expect(stale).toEqual({ ok: false, code: 'STALE_ORDER' });
    expect((await row(id)).status).toBe('EN_DIAGNOSTICO');
    expect((await createPublicOrderStore(prisma).findByTrackingCode(CODE))?.repairDetails).toBeNull();
    // Con el resumen revisado de nuevo (versión 8) se confirma y se publica el valor vigente.
    expect((await transitionOrder(admin, { orderId: id, targetStatus: 'ESPERANDO_APROBACION', expectedVersion: 8, confirmed: true }, transitionDeps())).ok).toBe(true);
    expect((await createPublicOrderStore(prisma).findByTrackingCode(CODE))?.repairDetails).toEqual({ diagnosis: 'Diagnóstico revisado', estimatedCost: '120.00' });
  });
});

describe('publicación: derivada del estado, nunca de la presencia de valores (SC-11)', () => {
  /** Proyección pública que registra lo que la base de datos le devolvió, para demostrar que no cargó valores no autorizados. */
  function spyingPublicStore() {
    const returned: unknown[] = [];
    const spy = {
      $queryRaw: async (...args: Parameters<PrismaClient['$queryRaw']>) => {
        const rows = await prisma.$queryRaw(...args);
        returned.push(rows);
        return rows;
      },
    } as unknown as PrismaClient;
    return { store: createPublicOrderStore(spy), returned };
  }

  it('(1) En diagnóstico con ambos valores guardados: repairDetails = null y los valores ni siquiera salen de la base de datos', async () => {
    await insertOrder({ status: 'EN_DIAGNOSTICO', diagnosis: 'CANARY-DIAGNOSTICO-INTERNO', cost: '321.50' });
    const { store, returned } = spyingPublicStore();
    const view = await store.findByTrackingCode(CODE);
    expect(view?.repairDetails).toBeNull();
    expect(JSON.stringify(returned)).not.toMatch(/CANARY-DIAGNOSTICO-INTERNO|321/);
    expect(JSON.stringify(view)).not.toMatch(/CANARY|321|repairDetails":\{/);
  });

  it('antes de la aprobación (Solicitud recibida, Equipo recibido) tampoco se publica nada aunque existan los valores', async () => {
    for (const [status, code] of [['SOLICITUD_RECIBIDA', '33333333333B'], ['EQUIPO_RECIBIDO', '44444444444B']] as const) {
      await insertOrder({ status, diagnosis: 'CANARY-INTERNO', cost: '10.00', code });
      const { store, returned } = spyingPublicStore();
      expect((await store.findByTrackingCode(code))?.repairDetails, status).toBeNull();
      expect(JSON.stringify(returned), status).not.toContain('CANARY-INTERNO');
    }
  });

  it('(2) cancelada ANTES de Esperando aprobación: null (los valores existen internamente)', async () => {
    await insertOrder({ status: 'CANCELADO', diagnosis: 'CANARY-INTERNO', cost: '99.00', history: [[null, 'SOLICITUD_RECIBIDA'], ['SOLICITUD_RECIBIDA', 'EQUIPO_RECIBIDO'], ['EQUIPO_RECIBIDO', 'EN_DIAGNOSTICO'], ['EN_DIAGNOSTICO', 'CANCELADO']] });
    const { store, returned } = spyingPublicStore();
    expect((await store.findByTrackingCode(CODE))?.repairDetails).toBeNull();
    expect(JSON.stringify(returned)).not.toMatch(/CANARY-INTERNO|99/);
  });

  it('(3) desde Esperando aprobación: repairDetails con los valores vigentes y el costo exacto', async () => {
    for (const [status, code] of [['ESPERANDO_APROBACION', '55555555555B'], ['EN_REPARACION', '66666666666B'], ['LISTO_PARA_RECOJO', '77777777777B'], ['ENTREGADO', '88888888888B']] as const) {
      await insertOrder({ status, diagnosis: 'Cambio de pantalla', cost: '180.50', code, history: [[null, 'SOLICITUD_RECIBIDA']] });
      expect((await createPublicOrderStore(prisma).findByTrackingCode(code))?.repairDetails, status).toEqual({ diagnosis: 'Cambio de pantalla', estimatedCost: '180.50' });
    }
  });

  it('(4) alcanzó Esperando aprobación y luego se canceló: siguen visibles', async () => {
    await insertOrder({
      status: 'CANCELADO',
      diagnosis: 'Cambio de pantalla',
      cost: '180.50',
      history: [[null, 'SOLICITUD_RECIBIDA'], ['SOLICITUD_RECIBIDA', 'EQUIPO_RECIBIDO'], ['EQUIPO_RECIBIDO', 'EN_DIAGNOSTICO'], ['EN_DIAGNOSTICO', 'ESPERANDO_APROBACION'], ['ESPERANDO_APROBACION', 'CANCELADO']],
    });
    expect((await createPublicOrderStore(prisma).findByTrackingCode(CODE))?.repairDetails).toEqual({ diagnosis: 'Cambio de pantalla', estimatedCost: '180.50' });
  });

  it('el DTO público de una orden completamente poblada no lleva historiales, versión, ids ni datos administrativos ni versiones anteriores', async () => {
    const id = await insertOrder({ status: 'EN_DIAGNOSTICO' });
    await saveDiagnosis(admin, diag(id, 'CANARY-PRIMERA-VERSION', 1), deps());
    await saveDiagnosis(admin, diag(id, 'Diagnóstico final', 2), deps());
    await saveEstimatedCost(admin, cost(id, '90', 3), deps());
    await saveEstimatedCost(admin, cost(id, '95.5', 4), deps());
    await transitionOrder(admin, { orderId: id, targetStatus: 'ESPERANDO_APROBACION', expectedVersion: 5, confirmed: true }, transitionDeps());
    const view = await createPublicOrderStore(prisma).findByTrackingCode(CODE);
    expect(Object.keys(view!).sort()).toEqual(['device', 'problemDescription', 'repairDetails', 'status', 'statusTimeline', 'trackingCode']);
    expect(Object.keys(view!.repairDetails!).sort()).toEqual(['diagnosis', 'estimatedCost']);
    expect(view!.repairDetails).toEqual({ diagnosis: 'Diagnóstico final', estimatedCost: '95.50' });
    expect(JSON.stringify(view)).not.toMatch(/CANARY|Quispe|\b90\.00|history|version|"id"|customer|phone|email|published|previous/i);
  });

  it('el módulo público no importa lo administrativo ni lee los historiales de diagnóstico y costo', () => {
    const source = readFileSync('src/infrastructure/tracking/public-order-store.ts', 'utf8');
    expect(source).not.toMatch(/diagnosis_history|cost_history|domain\/admin|infrastructure\/admin|application\/admin/);
  });
});

describe('historial administrativo combinado', () => {
  it('combina estado, diagnóstico y costo del más reciente al más antiguo, con montos exactos y sin autor', async () => {
    const id = await insertOrder({ status: 'EN_DIAGNOSTICO' });
    await saveDiagnosis(admin, diag(id, 'Falla leve', 1), deps());
    await saveEstimatedCost(admin, cost(id, '150', 2), deps());
    await saveDiagnosis(admin, diag(id, 'Placa dañada', 3), deps());
    await saveEstimatedCost(admin, cost(id, '180', 4), deps());
    const detail = await getAdminOrderDetail(admin, id, createAdminOrderDetailStore(prisma));
    const summary = detail!.history.map((e) =>
      e.type === 'STATUS' ? `STATUS:${e.toStatus}` : `${e.type}:${e.previous ?? '∅'}>${e.next ?? '∅'}`,
    );
    expect(summary.slice(0, 4)).toEqual(['COST:150.00>180.00', 'DIAGNOSIS:Falla leve>Placa dañada', 'COST:∅>150.00', 'DIAGNOSIS:∅>Falla leve']);
    expect(summary.slice(4)).toEqual(['STATUS:EN_DIAGNOSTICO', 'STATUS:EQUIPO_RECIBIDO', 'STATUS:SOLICITUD_RECIBIDA']);
    expect(JSON.stringify(detail!.history)).not.toMatch(/author|autor|session|ip"/i);
  });

  it('desempate determinista con el mismo instante: estado < diagnóstico < costo, y luego id descendente; estable entre consultas', async () => {
    const id = await insertOrder({ status: 'EN_DIAGNOSTICO', history: [[null, 'SOLICITUD_RECIBIDA']] });
    const same = new Date('2026-11-01T00:00:00.000Z').toISOString();
    await owner.query("INSERT INTO diagnosis_history (id, order_id, previous_value, new_value, occurred_at) VALUES ('00000000-0000-4000-8000-0000000000d1', $1, NULL, 'D1', $2::timestamptz), ('00000000-0000-4000-8000-0000000000d2', $1, 'D1', 'D2', $2::timestamptz)", [id, same]);
    await owner.query("INSERT INTO cost_history (id, order_id, previous_value, new_value, occurred_at) VALUES ('00000000-0000-4000-8000-0000000000c1', $1, NULL, 10, $2::timestamptz)", [id, same]);
    await owner.query("INSERT INTO order_status_history (id, order_id, from_status, to_status, occurred_at) VALUES ('00000000-0000-4000-8000-0000000000a1', $1, 'SOLICITUD_RECIBIDA', 'EQUIPO_RECIBIDO', $2::timestamptz)", [id, same]);
    const read = async () => (await getAdminOrderDetail(admin, id, createAdminOrderDetailStore(prisma)))!.history.slice(0, 4).map((e) => (e.type === 'STATUS' ? 'S' : e.type === 'DIAGNOSIS' ? `D:${e.next}` : 'C'));
    const first = await read();
    expect(first).toEqual(['S', 'D:D2', 'D:D1', 'C']);
    expect(await read()).toEqual(first);
  });
});

describe('lectura administrativa', () => {
  it('expone diagnóstico, costo canónico, indicación de edición y «nunca se publicó» por el recorrido (no por los valores)', async () => {
    const editable = await insertOrder({ status: 'EN_DIAGNOSTICO', diagnosis: 'Interno', cost: '60.00' });
    let detail = await getAdminOrderDetail(admin, editable, createAdminOrderDetailStore(prisma));
    expect(detail).toMatchObject({ diagnosis: 'Interno', estimatedCost: '60.00', canEditDiagnosisAndCost: true, neverPublished: false });
    expect(detail?.allowedTransitions[0]).toEqual({ targetStatus: 'ESPERANDO_APROBACION', requiresConfirmation: true }); // ya no está bloqueado

    await resetTestDatabase();
    const never = await insertOrder({ status: 'CANCELADO', diagnosis: 'Interno', cost: '60.00', history: [[null, 'SOLICITUD_RECIBIDA'], ['SOLICITUD_RECIBIDA', 'CANCELADO']] });
    detail = await getAdminOrderDetail(admin, never, createAdminOrderDetailStore(prisma));
    expect(detail).toMatchObject({ canEditDiagnosisAndCost: false, neverPublished: true });

    await resetTestDatabase();
    const after = await insertOrder({
      status: 'CANCELADO',
      diagnosis: 'Publicado',
      cost: '60.00',
      history: [[null, 'SOLICITUD_RECIBIDA'], ['SOLICITUD_RECIBIDA', 'EQUIPO_RECIBIDO'], ['EQUIPO_RECIBIDO', 'EN_DIAGNOSTICO'], ['EN_DIAGNOSTICO', 'ESPERANDO_APROBACION'], ['ESPERANDO_APROBACION', 'CANCELADO']],
    });
    detail = await getAdminOrderDetail(admin, after, createAdminOrderDetailStore(prisma));
    expect(detail).toMatchObject({ neverPublished: false });
  });

  it('sin valores no hay S/ 0.00: diagnóstico y costo llegan como null', async () => {
    const id = await insertOrder({ status: 'EN_DIAGNOSTICO' });
    const detail = await getAdminOrderDetail(admin, id, createAdminOrderDetailStore(prisma));
    expect(detail).toMatchObject({ diagnosis: null, estimatedCost: null });
    expect(JSON.stringify(detail)).not.toMatch(/S\/ 0|"estimatedCost":"0\.00"/);
  });
});
