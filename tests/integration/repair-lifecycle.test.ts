import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type pg from 'pg';
import { issueAdminContext } from '../../src/application/admin/admin-context';
import { getAdminOrderDetail } from '../../src/application/admin/order-detail';
import { transitionOrder } from '../../src/application/admin/transition-order';
import { ALL_STATUS_PAIRS, isTransitionAllowed } from '../../src/domain/repair/lifecycle';
import { ORDER_STATUSES, type OrderStatus } from '../../src/domain/repair/order-status';
import { createAdminOrderDetailStore } from '../../src/infrastructure/admin/admin-order-detail-store';
import { createOrderTransitionStore, type OrderTransitionStore } from '../../src/infrastructure/admin/order-transition-store';
import type { PrismaClient } from '../../src/infrastructure/db/generated/client.ts';
import { createPublicOrderStore } from '../../src/infrastructure/tracking/public-order-store';
import { appPrisma, ownerPg } from './support/connections';
import { resetTestDatabase } from './support/reset';

// Ciclo de vida de la reparación contra PostgreSQL real con el rol de aplicación (CHG-10). Sin mocks de Prisma. Datos
// FICTICIOS. Los fixtures de diagnóstico y costo se preparan directamente con el propietario (no hay UI ni endpoint).
const admin = issueAdminContext('admin-de-prueba');
const T0 = new Date('2026-10-28T10:00:00.000Z');
const NOW = new Date('2026-10-29T15:30:00.000Z');
const CODE = '23456789BDFG';
// SC-07 (CHECK de la base de datos): estos estados exigen diagnóstico y costo.
const NEEDS_DATA: readonly OrderStatus[] = ['ESPERANDO_APROBACION', 'EN_REPARACION', 'LISTO_PARA_RECOJO', 'ENTREGADO'];

let prisma: PrismaClient;
let owner: pg.Client;

const store = (): OrderTransitionStore => createOrderTransitionStore(prisma);
const deps = (s: OrderTransitionStore = store()) => ({ store: s, now: () => NOW });
/** Reloj que avanza un minuto en cada cambio: los eventos tienen instantes distintos (sin empates en el orden). */
const ticking = () => {
  let t = NOW.getTime();
  return { store: store(), now: () => new Date((t += 60_000)) };
};

async function insertOrder(options: { status?: OrderStatus; version?: number; diagnosis?: string | null; cost?: number | null; code?: string } = {}) {
  const status = options.status ?? 'SOLICITUD_RECIBIDA';
  const id = randomUUID();
  const withData = NEEDS_DATA.includes(status);
  const diagnosis = options.diagnosis === undefined ? (withData ? 'CANARY-DIAGNOSTICO' : null) : options.diagnosis;
  const cost = options.cost === undefined ? (withData ? 150 : null) : options.cost;
  await owner.query(
    `INSERT INTO repair_orders (id, tracking_code, status, customer_name, customer_name_search, customer_phone, customer_email,
       device_type, brand, model, problem_description, diagnosis, estimated_cost, version, created_at, updated_at)
     VALUES ($1, $2, $3::order_status, 'CANARY-NOMBRE', 'canary-nombre', 'CANARY-TELEFONO', 'canary@example.com', 'LAPTOP', 'Lenovo', 'T14',
       'No enciende', $4, $5, $6, $7::timestamptz, $7::timestamptz)`,
    [id, options.code ?? CODE, status, diagnosis, cost, options.version ?? 1, T0.toISOString()],
  );
  await owner.query(
    'INSERT INTO order_status_history (id, order_id, from_status, to_status, occurred_at) VALUES ($1, $2, NULL, $3::order_status, $4::timestamptz)',
    [randomUUID(), id, 'SOLICITUD_RECIBIDA', T0.toISOString()],
  );
  return id;
}

const state = async (id: string) =>
  (await owner.query('SELECT status::text AS status, version, updated_at, diagnosis, estimated_cost FROM repair_orders WHERE id = $1', [id])).rows[0]!;
const history = async (id: string) =>
  (await owner.query('SELECT from_status::text AS "from", to_status::text AS "to", occurred_at FROM order_status_history WHERE order_id = $1 ORDER BY occurred_at, id', [id])).rows;

const command = (orderId: string, targetStatus: OrderStatus, expectedVersion = 1, confirmed = false) => ({ orderId, targetStatus, expectedVersion, confirmed });

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

describe('transición válida', () => {
  it('cambia el estado, incrementa la versión una vez y crea exactamente un evento con el mismo instante', async () => {
    const id = await insertOrder();
    expect(await transitionOrder(admin, command(id, 'EQUIPO_RECIBIDO'), deps())).toEqual({ ok: true, data: { status: 'EQUIPO_RECIBIDO', version: 2 } });
    const row = await state(id);
    expect(row).toMatchObject({ status: 'EQUIPO_RECIBIDO', version: 2 });
    expect((row.updated_at as Date).toISOString()).toBe(NOW.toISOString());
    expect(await history(id)).toEqual([
      { from: null, to: 'SOLICITUD_RECIBIDA', occurred_at: T0 },
      { from: 'SOLICITUD_RECIBIDA', to: 'EQUIPO_RECIBIDO', occurred_at: NOW },
    ]);
  });

  it.each(ALL_STATUS_PAIRS.filter(([from, to]) => isTransitionAllowed(from, to)).map((pair) => [...pair]))(
    'las diez transiciones permitidas funcionan de extremo a extremo: %s → %s',
    async (from, to) => {
      const f = from as OrderStatus;
      const t = to as OrderStatus;
      const id = await insertOrder({ status: f, diagnosis: f === 'EN_DIAGNOSTICO' ? 'Diagnóstico ficticio' : undefined, cost: f === 'EN_DIAGNOSTICO' ? 99 : undefined });
      const result = await transitionOrder(admin, command(id, t, 1, true), deps());
      expect(result, `${f}>${t}`).toEqual({ ok: true, data: { status: t, version: 2 } });
      expect((await history(id)).at(-1)).toMatchObject({ from: f, to: t });
      // La segunda barrera de la base de datos (CHECK de pares) coincide con la tabla de dominio.
      expect((await state(id)).status).toBe(t);
    },
  );

  it('reflejo público: el estado, el evento y el recorrido cambian, sin datos administrativos; un cambio rechazado no altera lo público', async () => {
    const id = await insertOrder();
    const publicStore = createPublicOrderStore(prisma);
    const clock = ticking();
    await transitionOrder(admin, command(id, 'EQUIPO_RECIBIDO'), clock);
    let view = await publicStore.findByTrackingCode(CODE);
    expect(view?.status).toBe('EQUIPO_RECIBIDO');
    expect(view?.statusTimeline.map((e) => e.status)).toEqual(['EQUIPO_RECIBIDO', 'SOLICITUD_RECIBIDA']);
    expect(Object.keys(view!).sort()).toEqual(['device', 'problemDescription', 'repairDetails', 'status', 'statusTimeline', 'trackingCode']);
    expect(JSON.stringify(view)).not.toMatch(/CANARY|canary|version|confirm|"id"/);

    await transitionOrder(admin, command(id, 'ENTREGADO', 2, true), clock); // rechazada
    view = await publicStore.findByTrackingCode(CODE);
    expect(view?.status).toBe('EQUIPO_RECIBIDO');
    expect(view?.statusTimeline).toHaveLength(2);

    await transitionOrder(admin, command(id, 'CANCELADO', 2, true), clock);
    view = await publicStore.findByTrackingCode(CODE);
    expect(view?.status).toBe('CANCELADO');
    expect(view?.statusTimeline[0]).toMatchObject({ status: 'CANCELADO' });
  });

  it('reflejo administrativo: estado, versión, historial y acciones vigentes', async () => {
    const id = await insertOrder();
    await transitionOrder(admin, command(id, 'EQUIPO_RECIBIDO'), deps());
    const detail = await getAdminOrderDetail(admin, id, createAdminOrderDetailStore(prisma));
    expect(detail).toMatchObject({ status: 'EQUIPO_RECIBIDO', version: 2 });
    expect(detail?.statusHistory.map((e) => e.toStatus)).toEqual(['EQUIPO_RECIBIDO', 'SOLICITUD_RECIBIDA']);
    expect(detail?.allowedTransitions).toEqual([
      { targetStatus: 'EN_DIAGNOSTICO', requiresConfirmation: false },
      { targetStatus: 'CANCELADO', requiresConfirmation: true },
    ]);
  });
});

describe('transiciones inválidas y estados finales: sin ninguna escritura', () => {
  it('las 54 combinaciones restantes de los 64 pares se rechazan sin modificar la orden ni su historial', async () => {
    let rejected = 0;
    for (const from of ORDER_STATUSES) {
      const id = await insertOrder({ status: from, code: `${from.slice(0, 2)}${randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}` });
      const before = JSON.stringify([await state(id), await history(id)]);
      for (const to of ORDER_STATUSES) {
        if (isTransitionAllowed(from, to)) continue;
        expect(await transitionOrder(admin, command(id, to, 1, true), deps()), `${from}>${to}`).toEqual({ ok: false, code: 'TRANSITION_NOT_ALLOWED' });
        rejected += 1;
      }
      expect(JSON.stringify([await state(id), await history(id)]), from).toBe(before);
    }
    expect(rejected).toBe(54);
  });

  it('Entregado y Cancelado son terminales: ningún cambio de estado, ni siquiera cancelar', async () => {
    for (const status of ['ENTREGADO', 'CANCELADO'] as const) {
      const id = await insertOrder({ status, code: status === 'ENTREGADO' ? '22222222222B' : '33333333333B' });
      for (const to of ORDER_STATUSES) {
        expect(await transitionOrder(admin, command(id, to, 1, true), deps()), `${status}>${to}`).toEqual({ ok: false, code: 'TRANSITION_NOT_ALLOWED' });
      }
      expect((await state(id)).version).toBe(1);
    }
  });

  it('la cancelación solo desde los cuatro primeros estados', async () => {
    for (const from of ['EN_REPARACION', 'LISTO_PARA_RECOJO'] as const) {
      const id = await insertOrder({ status: from, code: from === 'EN_REPARACION' ? '44444444444B' : '55555555555B' });
      expect(await transitionOrder(admin, command(id, 'CANCELADO', 1, true), deps())).toEqual({ ok: false, code: 'TRANSITION_NOT_ALLOWED' });
    }
    const ok = await insertOrder({ status: 'ESPERANDO_APROBACION', code: '66666666666B' });
    expect((await transitionOrder(admin, command(ok, 'CANCELADO', 1, true), deps())).ok).toBe(true);
  });
});

describe('confirmaciones E11 comprobadas por el servidor', () => {
  const cases: ReadonlyArray<readonly [OrderStatus, OrderStatus, boolean]> = [
    ['EN_DIAGNOSTICO', 'ESPERANDO_APROBACION', true],
    ['ESPERANDO_APROBACION', 'EN_REPARACION', true],
    ['EQUIPO_RECIBIDO', 'CANCELADO', false],
    ['LISTO_PARA_RECOJO', 'ENTREGADO', true],
  ];

  it.each(cases.map((c) => [...c]))('%s → %s sin confirmación: CONFIRMATION_REQUIRED y ninguna escritura', async (from, to, withData) => {
    const f = from as OrderStatus;
    const id = await insertOrder({ status: f, diagnosis: withData ? 'Diag' : null, cost: withData ? 10 : null });
    const before = JSON.stringify([await state(id), await history(id)]);
    expect(await transitionOrder(admin, command(id, to as OrderStatus, 1, false), deps())).toEqual({ ok: false, code: 'CONFIRMATION_REQUIRED' });
    expect(JSON.stringify([await state(id), await history(id)])).toBe(before);
  });

  it('los avances fuera de las cuatro confirmaciones se aplican sin ella', async () => {
    const id = await insertOrder();
    expect((await transitionOrder(admin, command(id, 'EQUIPO_RECIBIDO', 1, false), deps())).ok).toBe(true);
    expect((await transitionOrder(admin, command(id, 'EN_DIAGNOSTICO', 2, false), deps())).ok).toBe(true);
  });

  it('la aprobación del cliente solo cambia el estado: no se guarda canal, firma ni marca de confirmación', async () => {
    const id = await insertOrder({ status: 'ESPERANDO_APROBACION' });
    await transitionOrder(admin, command(id, 'EN_REPARACION', 1, true), deps());
    const columns = (await owner.query("SELECT column_name FROM information_schema.columns WHERE table_name IN ('repair_orders','order_status_history')")).rows.map((r) => String(r.column_name));
    expect(columns.filter((c) => /confirm|approv|signature|channel/i.test(c))).toEqual([]);
  });
});

describe('prerrequisito de diagnóstico y costo (SC-07, seguro por defecto)', () => {
  it.each([
    ['falta el costo', 'Diagnóstico', null],
    ['falta el diagnóstico', null, 100],
    ['faltan ambos', null, null],
    ['diagnóstico en blanco', '   ', 100],
  ])('%s: DIAGNOSIS_AND_COST_REQUIRED, incluso confirmando, sin escrituras', async (_label, diagnosis, cost) => {
    const id = await insertOrder({ status: 'EN_DIAGNOSTICO', diagnosis: diagnosis as string | null, cost: cost as number | null });
    const before = JSON.stringify([await state(id), await history(id)]);
    expect(await transitionOrder(admin, command(id, 'ESPERANDO_APROBACION', 1, true), deps())).toEqual({ ok: false, code: 'DIAGNOSIS_AND_COST_REQUIRED' });
    expect(JSON.stringify([await state(id), await history(id)])).toBe(before);
  });

  it('con ambos presentes y confirmación, avanza; la cancelación nunca depende de ellos', async () => {
    const ready = await insertOrder({ status: 'EN_DIAGNOSTICO', diagnosis: 'Diagnóstico ficticio', cost: 120, code: '77777777777B' });
    expect((await transitionOrder(admin, command(ready, 'ESPERANDO_APROBACION', 1, true), deps())).ok).toBe(true);
    const bare = await insertOrder({ status: 'EN_DIAGNOSTICO', code: '88888888888B' });
    expect((await transitionOrder(admin, command(bare, 'CANCELADO', 1, true), deps())).ok).toBe(true);
  });

  it('el avance a Esperando aprobación aparece bloqueado en la lectura administrativa y la cancelación sigue disponible', async () => {
    const id = await insertOrder({ status: 'EN_DIAGNOSTICO' });
    const detail = await getAdminOrderDetail(admin, id, createAdminOrderDetailStore(prisma));
    expect(detail?.allowedTransitions).toEqual([
      { targetStatus: 'ESPERANDO_APROBACION', requiresConfirmation: true, blockedReason: 'DIAGNOSIS_AND_COST_REQUIRED' },
      { targetStatus: 'CANCELADO', requiresConfirmation: true },
    ]);
    expect(JSON.stringify(detail)).not.toMatch(/CANARY-DIAGNOSTICO/);
  });
});

describe('precedencia de resultados', () => {
  it('(A) vista desactualizada con destino ya inválido: STALE_ORDER, no TRANSITION_NOT_ALLOWED', async () => {
    const id = await insertOrder({ version: 5 });
    // Otra acción llevó la orden a la versión 6 y a CANCELADO.
    await owner.query("UPDATE repair_orders SET status = 'CANCELADO', version = 6 WHERE id = $1", [id]);
    expect(await transitionOrder(admin, command(id, 'EQUIPO_RECIBIDO', 5), deps())).toEqual({ ok: false, code: 'STALE_ORDER' });
  });

  it('(B) misma versión y destino no permitido: TRANSITION_NOT_ALLOWED', async () => {
    const id = await insertOrder();
    expect(await transitionOrder(admin, command(id, 'ENTREGADO', 1, true), deps())).toEqual({ ok: false, code: 'TRANSITION_NOT_ALLOWED' });
  });

  it('(C) misma versión, transición válida sin diagnóstico y costo: DIAGNOSIS_AND_COST_REQUIRED', async () => {
    const id = await insertOrder({ status: 'EN_DIAGNOSTICO' });
    expect(await transitionOrder(admin, command(id, 'ESPERANDO_APROBACION', 1, true), deps())).toEqual({ ok: false, code: 'DIAGNOSIS_AND_COST_REQUIRED' });
  });

  it('(D) confirmación E11 desactualizada: el diálogo se abrió en la versión N, otra mutación llevó a N+1 → STALE_ORDER', async () => {
    const id = await insertOrder({ status: 'ESPERANDO_APROBACION', version: 4 });
    // Otra mutación efectiva (p. ej. una corrección de datos) subió la versión sin cambiar el estado.
    await owner.query('UPDATE repair_orders SET version = version + 1 WHERE id = $1', [id]);
    const result = await transitionOrder(admin, command(id, 'EN_REPARACION', 4, true), deps());
    expect(result).toEqual({ ok: false, code: 'STALE_ORDER' }); // no CONFIRMATION_REQUIRED ni TRANSITION_NOT_ALLOWED
    expect((await state(id)).status).toBe('ESPERANDO_APROBACION');
  });

  it('una orden inexistente o una entrada inválida: VALIDATION_FAILED sin escribir', async () => {
    await insertOrder();
    expect(await transitionOrder(admin, command(randomUUID(), 'EQUIPO_RECIBIDO'), deps())).toEqual({ ok: false, code: 'VALIDATION_FAILED' });
    expect(await transitionOrder(admin, { orderId: 'x', targetStatus: 'EQUIPO_RECIBIDO', expectedVersion: 1 }, deps())).toEqual({ ok: false, code: 'VALIDATION_FAILED' });
  });
});

describe('concurrencia optimista: dos barreras', () => {
  it('carrera posterior a la carga: el UPDATE condicional afecta 0 filas y devuelve STALE_ORDER (la comparación temprana no basta)', async () => {
    const id = await insertOrder();
    const real = store();
    // Tras cargar la versión 1 (y comprobar que coincide), otra transacción la lleva a la 2 antes del UPDATE.
    const racing: OrderTransitionStore = {
      inTransaction: (work) =>
        real.inTransaction((unit) =>
          work({
            load: async (orderId) => {
              const snapshot = await unit.load(orderId);
              await owner.query("UPDATE repair_orders SET status = 'EQUIPO_RECIBIDO', version = 2 WHERE id = $1", [orderId]);
              return snapshot;
            },
            apply: (change) => unit.apply(change),
          }),
        ),
    };
    expect(await transitionOrder(admin, command(id, 'EQUIPO_RECIBIDO'), deps(racing))).toEqual({ ok: false, code: 'STALE_ORDER' });
    expect(await state(id)).toMatchObject({ status: 'EQUIPO_RECIBIDO', version: 2 });
    expect(await history(id)).toHaveLength(1); // solo el evento inicial: ningún evento nuevo
  });

  it('dos cambios simultáneos con la misma expectedVersion: uno se aplica, el otro recibe STALE_ORDER y hay un solo evento nuevo', async () => {
    for (let round = 0; round < 3; round += 1) {
      const id = await insertOrder({ code: `99999999999${'BDFGHJ'[round]}` });
      const [a, b] = await Promise.all([
        transitionOrder(admin, command(id, 'EQUIPO_RECIBIDO'), deps()),
        transitionOrder(admin, command(id, 'CANCELADO', 1, true), deps()),
      ]);
      const results = [a, b];
      expect(results.filter((r) => r.ok)).toHaveLength(1);
      expect(results.filter((r) => !r.ok && r.code === 'STALE_ORDER')).toHaveLength(1);
      expect((await state(id)).version).toBe(2);
      expect(await history(id)).toHaveLength(2);
    }
  });

  it('el mismo comando enviado dos veces a la vez solo se aplica una vez', async () => {
    const id = await insertOrder();
    const results = await Promise.all([transitionOrder(admin, command(id, 'EQUIPO_RECIBIDO'), deps()), transitionOrder(admin, command(id, 'EQUIPO_RECIBIDO'), deps())]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(await history(id)).toHaveLength(2);
  });

  it('las notas no incrementan la versión de la orden', async () => {
    const id = await insertOrder();
    await owner.query("INSERT INTO order_notes (id, order_id, visibility, content, version, created_at, updated_at) VALUES ($1, $2, 'INTERNAL', 'CANARY-NOTA', 1, now(), now())", [randomUUID(), id]);
    expect((await state(id)).version).toBe(1);
    expect((await transitionOrder(admin, command(id, 'EQUIPO_RECIBIDO', 1), deps())).ok).toBe(true);
  });
});

describe('atomicidad orden + historial', () => {
  it('si falla el evento de historial, se revierte también el cambio de la orden (nunca estado sin evento)', async () => {
    const id = await insertOrder();
    // Falla forzada SOLO para filas nuevas: el INSERT del evento viola esta restricción.
    await owner.query("ALTER TABLE order_status_history ADD CONSTRAINT zz_test_block CHECK (to_status <> 'EQUIPO_RECIBIDO') NOT VALID");
    try {
      await expect(transitionOrder(admin, command(id, 'EQUIPO_RECIBIDO'), deps())).rejects.toThrow();
    } finally {
      await owner.query('ALTER TABLE order_status_history DROP CONSTRAINT zz_test_block');
    }
    expect(await state(id)).toMatchObject({ status: 'SOLICITUD_RECIBIDA', version: 1 });
    expect(await history(id)).toHaveLength(1);
  });

  it('si algo falla después de escribir orden y evento, la transacción revierte ambos', async () => {
    const id = await insertOrder();
    const real = store();
    const failing: OrderTransitionStore = {
      inTransaction: (work) =>
        real.inTransaction((unit) =>
          work({
            load: (orderId) => unit.load(orderId),
            apply: async (change) => {
              await unit.apply(change);
              throw new Error('fallo inyectado tras escribir');
            },
          }),
        ),
    };
    await expect(transitionOrder(admin, command(id, 'EQUIPO_RECIBIDO'), deps(failing))).rejects.toThrow('fallo inyectado');
    expect(await state(id)).toMatchObject({ status: 'SOLICITUD_RECIBIDA', version: 1 });
    expect(await history(id)).toHaveLength(1);
  });
});

describe('auditoría del baseline de persistencia (CHG-02)', () => {
  it('el rol de aplicación solo puede insertar en el historial (append-only) y actualizar columnas permitidas de la orden', async () => {
    const id = await insertOrder();
    const { default: pgModule } = await import('pg');
    const { readTestConfig } = await import('../../src/infrastructure/config/migration.ts');
    const app = new pgModule.Client({ connectionString: readTestConfig(process.env).testDatabaseUrl });
    await app.connect();
    try {
      for (const statement of [
        "UPDATE order_status_history SET to_status = 'ENTREGADO'",
        'DELETE FROM order_status_history',
        "UPDATE repair_orders SET tracking_code = 'ZZZZZZZZZZZZ'",
        'DELETE FROM repair_orders',
      ]) {
        await expect(app.query(statement), statement).rejects.toMatchObject({ code: '42501' });
      }
      // El CHECK de pares valida cada fila por separado y NO la secuencia: un par permitido pero fuera de secuencia entra.
      await expect(
        app.query("INSERT INTO order_status_history (id, order_id, from_status, to_status, occurred_at) VALUES ($1, $2, 'EN_REPARACION', 'LISTO_PARA_RECOJO', now())", [randomUUID(), id]),
      ).resolves.toBeDefined();
      await expect(
        app.query("INSERT INTO order_status_history (id, order_id, from_status, to_status, occurred_at) VALUES ($1, $2, 'ENTREGADO', 'SOLICITUD_RECIBIDA', now())", [randomUUID(), id]),
      ).rejects.toMatchObject({ code: '23514' });
    } finally {
      await app.end();
    }
  });

  it('el módulo público no importa nada del ciclo de vida administrativo', () => {
    for (const file of ['src/infrastructure/tracking/public-order-store.ts', 'src/application/track-order.ts', 'src/domain/repair/public-order-view.ts']) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/order-transition-store|transition-order|domain\/repair\/lifecycle/);
    }
  });
});
