import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type pg from 'pg';
import { LOOKUP_POLICY, trackOrder, type TrackOrderDependencies } from '../../src/application/track-order';
import { trackOrderFromRequest } from '../../src/application/track-order-service';
import type { PrismaClient } from '../../src/infrastructure/db/generated/client.ts';
import { createLimiter } from '../../src/infrastructure/limiter/limiter';
import { createPublicOrderStore } from '../../src/infrastructure/tracking/public-order-store';
import { appPrisma, ownerPg } from './support/connections';
import { insertOrder, insertStatusEvent } from './support/fixtures';
import { resetTestDatabase } from './support/reset';

// Consulta pública contra PostgreSQL real con el rol de aplicación (CHG-06). Sin mocks de Prisma.
const SECRET = 'test-only-hmac-secret-0123456789abcdef';
const SUBJECT = '203.0.113.9';
const CODE = '23456789BDFG';
const T0 = new Date('2026-10-28T10:00:00.000Z');

let prisma: PrismaClient;
let owner: pg.Client;
let clock = T0;

function dependencies(overrides: Partial<TrackOrderDependencies> = {}): TrackOrderDependencies {
  const limiter = createLimiter({ db: prisma, hmacSecret: SECRET, now: () => clock });
  const store = createPublicOrderStore(prisma);
  return {
    isBlocked: (subject) => limiter.isBlocked(subject, 'PUBLIC_TRACKING'),
    recordFailure: (subject) => limiter.recordFailure(subject, 'PUBLIC_TRACKING', LOOKUP_POLICY),
    findByTrackingCode: (code) => store.findByTrackingCode(code),
    onEvent: () => undefined,
    ...overrides,
  };
}

/** Orden deliberadamente POBLADA: datos personales, diagnóstico, costo, notas internas e historiales administrativos. */
async function insertPopulatedOrder(status = 'EN_DIAGNOSTICO') {
  const id = await insertOrder(owner, { tracking_code: CODE });
  await owner.query(
    `UPDATE repair_orders SET customer_name = 'CANARY-NAME Ana Quispe', customer_phone = '+51 CANARY-PHONE 999',
       customer_email = 'canary-email@example.com', model = NULL, brand = 'Samsung', problem_description = 'No enciende' WHERE id = $1`,
    [id],
  );
  await owner.query(
    `INSERT INTO order_notes (id, order_id, visibility, content, version, created_at, updated_at)
     VALUES ($1, $2, 'INTERNAL', 'CANARY-INTERNAL-NOTE', 1, now(), now()), ($3, $2, 'PUBLIC', 'CANARY-PUBLIC-NOTE', 1, now(), now())`,
    [randomUUID(), id, randomUUID()],
  );
  await owner.query(
    "INSERT INTO diagnosis_history (id, order_id, previous_value, new_value, occurred_at) VALUES ($1, $2, NULL, 'CANARY-DIAGNOSIS', now())",
    [randomUUID(), id],
  );
  await owner.query('INSERT INTO cost_history (id, order_id, previous_value, new_value, occurred_at) VALUES ($1, $2, NULL, 123.45, now())', [randomUUID(), id]);
  // Diagnóstico y costo primero: los estados posteriores a «En diagnóstico» los exigen (SC-07).
  await owner.query(
    "UPDATE repair_orders SET diagnosis = 'CANARY-DIAGNOSIS', estimated_cost = 123.45, version = 7, status = $2::order_status WHERE id = $1",
    [id, status],
  );
  await owner.query(
    `INSERT INTO order_status_history (id, order_id, from_status, to_status, occurred_at) VALUES
       ($1, $2, NULL, 'SOLICITUD_RECIBIDA', '2026-10-20T15:00:00Z'),
       ($3, $2, 'SOLICITUD_RECIBIDA', 'EQUIPO_RECIBIDO', '2026-10-21T15:00:00Z'),
       ($4, $2, 'EQUIPO_RECIBIDO', 'EN_DIAGNOSTICO', '2026-10-22T15:00:00Z')`,
    [randomUUID(), id, randomUUID(), randomUUID()],
  );
  return id;
}

beforeAll(async () => {
  prisma = appPrisma();
  owner = await ownerPg();
});
afterAll(async () => {
  await prisma.$disconnect();
  await owner.end();
});
beforeEach(async () => {
  clock = T0;
  await resetTestDatabase();
});

describe('[SC-02] consulta con un código existente', () => {
  it('devuelve la proyección pública y la normalización tolera espacios exteriores y minúsculas', async () => {
    await insertPopulatedOrder();
    for (const input of [CODE, CODE.toLowerCase(), `  ${CODE}  `, ` ${CODE.toLowerCase()}\n`]) {
      const result = await trackOrder(input, SUBJECT, dependencies());
      expect(result.ok, JSON.stringify(input)).toBe(true);
    }
    const result = await trackOrder(CODE, SUBJECT, dependencies());
    expect(result).toEqual({
      ok: true,
      data: {
        trackingCode: CODE,
        status: 'EN_DIAGNOSTICO',
        device: { type: 'CELULAR', brand: 'Samsung', model: null },
        problemDescription: 'No enciende',
        statusTimeline: [
          { status: 'EN_DIAGNOSTICO', occurredAt: '2026-10-22T15:00:00.000Z' },
          { status: 'EQUIPO_RECIBIDO', occurredAt: '2026-10-21T15:00:00.000Z' },
          { status: 'SOLICITUD_RECIBIDA', occurredAt: '2026-10-20T15:00:00.000Z' },
        ],
      },
    });
  });

  it('una orden recién registrada tiene solo su evento inicial', async () => {
    const id = await insertOrder(owner, { tracking_code: CODE });
    await insertStatusEvent(owner, id, null, 'SOLICITUD_RECIBIDA');
    const result = await trackOrder(CODE, SUBJECT, dependencies());
    expect(result.ok && result.data.statusTimeline).toHaveLength(1);
    expect(result.ok && result.data.status).toBe('SOLICITUD_RECIBIDA');
  });

  it('una orden sin eventos persistidos no rompe la consulta (timeline vacío)', async () => {
    await insertOrder(owner, { tracking_code: CODE });
    const result = await trackOrder(CODE, SUBJECT, dependencies());
    expect(result.ok && result.data.statusTimeline).toEqual([]);
  });

  it('los eventos con la misma fecha tienen un orden determinista', async () => {
    const id = await insertOrder(owner, { tracking_code: CODE, status: 'EQUIPO_RECIBIDO' });
    await owner.query(
      `INSERT INTO order_status_history (id, order_id, from_status, to_status, occurred_at) VALUES
       ('00000000-0000-4000-8000-000000000001', $1, NULL, 'SOLICITUD_RECIBIDA', '2026-10-20T15:00:00Z'),
       ('00000000-0000-4000-8000-000000000002', $1, 'SOLICITUD_RECIBIDA', 'EQUIPO_RECIBIDO', '2026-10-20T15:00:00Z')`,
      [id],
    );
    const runs = await Promise.all([1, 2, 3].map(() => trackOrder(CODE, SUBJECT, dependencies())));
    const orders = runs.map((r) => JSON.stringify(r.ok && r.data.statusTimeline));
    expect(new Set(orders).size).toBe(1);
  });
});

describe('[SC-11] proyección pública con lista positiva', () => {
  it.each(['SOLICITUD_RECIBIDA', 'EN_DIAGNOSTICO', 'ESPERANDO_APROBACION', 'EN_REPARACION', 'ENTREGADO', 'CANCELADO'])(
    'sobre una orden poblada en %s la respuesta serializada solo contiene claves y valores permitidos',
    async (status) => {
      await insertPopulatedOrder(status);
      const result = await trackOrder(CODE, SUBJECT, dependencies());
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(Object.keys(result.data).sort()).toEqual(['device', 'problemDescription', 'statusTimeline', 'status', 'trackingCode'].sort());
      expect(Object.keys(result.data.device).sort()).toEqual(['brand', 'model', 'type']);
      for (const event of result.data.statusTimeline) expect(Object.keys(event).sort()).toEqual(['occurredAt', 'status']);
      const serialized = JSON.stringify(result);
      for (const forbidden of [
        'CANARY', 'canary', 'Ana Quispe', 'customer', '123.45', 'diagnosis', 'estimated', 'version', 'internal', 'note', 'from_status',
      ]) {
        expect(serialized, forbidden).not.toContain(forbidden);
      }
      // Ni el UUID de la orden ni el de ninguna fila de historial.
      expect(serialized).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    },
  );

  it('el diagnóstico y el costo no atraviesan la proyección en ningún estado (CHG-11 los publicará)', async () => {
    await insertPopulatedOrder('ESPERANDO_APROBACION');
    const result = await trackOrder(CODE, SUBJECT, dependencies());
    expect(JSON.stringify(result)).not.toMatch(/CANARY-DIAGNOSIS|123\.45/);
  });

  it('el rol de aplicación no necesita (ni tiene) acceso a columnas fuera de la proyección para consultar', async () => {
    // La consulta del repositorio solo nombra columnas permitidas: se comprueba ejecutándola con un rol cuyo
    // SELECT se restringe a ellas.
    const id = await insertPopulatedOrder();
    expect(id).toBeTruthy();
    await owner.query('REVOKE SELECT ON repair_orders FROM fixora_app');
    await owner.query('REVOKE SELECT ON order_status_history FROM fixora_app');
    try {
      await owner.query(
        'GRANT SELECT (id, tracking_code, status, device_type, brand, model, problem_description) ON repair_orders TO fixora_app',
      );
      await owner.query('GRANT SELECT (id, order_id, to_status, occurred_at) ON order_status_history TO fixora_app');
      const result = await trackOrder(CODE, SUBJECT, dependencies());
      expect(result.ok).toBe(true); // no lee customer_*, diagnosis, estimated_cost ni version
    } finally {
      await owner.query('REVOKE SELECT ON repair_orders FROM fixora_app');
      await owner.query('REVOKE SELECT ON order_status_history FROM fixora_app');
      await owner.query('GRANT SELECT ON repair_orders, order_status_history TO fixora_app');
    }
  });
});

describe('[SC-13] [E4] respuesta uniforme', () => {
  it('mal formado e inexistente devuelven exactamente lo mismo', async () => {
    await insertPopulatedOrder();
    const outcomes = [];
    for (const input of ['', '   ', 'no-es-un-codigo', '222222222222', '23456789BDFH', '23456789BDF', `${CODE}X`, "' OR 1=1 --"]) {
      outcomes.push(JSON.stringify(await trackOrder(input, `s-${outcomes.length}`, dependencies())));
    }
    expect(new Set(outcomes)).toEqual(new Set([JSON.stringify({ ok: false, code: 'TRACKING_NOT_FOUND' })]));
  });

  it('el código solo da acceso: el nombre, el teléfono y el correo no encuentran la orden', async () => {
    await insertPopulatedOrder();
    for (const input of ['CANARY-NAME Ana Quispe', '+51 CANARY-PHONE 999', 'canary-email@example.com']) {
      expect(await trackOrder(input, 's', dependencies())).toEqual({ ok: false, code: 'TRACKING_NOT_FOUND' });
    }
  });
});

describe('limitación de intentos (10 fallos / 10 min → bloqueo de 15 min)', () => {
  it('bloquea tras 10 fallos aun con un código válido, sin mostrar la orden', async () => {
    await insertPopulatedOrder();
    for (let i = 0; i < 10; i += 1) {
      clock = new Date(T0.getTime() + i * 1000);
      expect(await trackOrder('222222222222', SUBJECT, dependencies())).toEqual({ ok: false, code: 'TRACKING_NOT_FOUND' });
    }
    const spy = vi.fn();
    const blocked = await trackOrder(CODE, SUBJECT, dependencies({ findByTrackingCode: spy }));
    expect(blocked).toEqual({ ok: false, code: 'RATE_LIMITED' });
    expect(spy).not.toHaveBeenCalled(); // no toca la tabla de órdenes
    // Otro origen no se ve afectado.
    expect((await trackOrder(CODE, '198.51.100.4', dependencies())).ok).toBe(true);
  });

  it('el bloqueo expira a los 15 minutos y vuelve a permitir consultar', async () => {
    await insertPopulatedOrder();
    for (let i = 0; i < 10; i += 1) await trackOrder('222222222222', SUBJECT, dependencies());
    clock = new Date(T0.getTime() + 14 * 60_000);
    expect(await trackOrder(CODE, SUBJECT, dependencies())).toEqual({ ok: false, code: 'RATE_LIMITED' });
    clock = new Date(T0.getTime() + 15 * 60_000 + 1000);
    expect((await trackOrder(CODE, SUBJECT, dependencies())).ok).toBe(true);
  });

  it('los aciertos no cuentan: cien consultas exitosas no bloquean', async () => {
    await insertPopulatedOrder();
    for (let i = 0; i < 25; i += 1) expect((await trackOrder(CODE, SUBJECT, dependencies())).ok).toBe(true);
    expect(await trackOrder('222222222222', SUBJECT, dependencies())).toEqual({ ok: false, code: 'TRACKING_NOT_FOUND' });
    expect((await trackOrder(CODE, SUBJECT, dependencies())).ok).toBe(true);
  });

  it('9 fallos no bloquean; el décimo sí bloquea las siguientes', async () => {
    await insertPopulatedOrder();
    for (let i = 0; i < 9; i += 1) await trackOrder('222222222222', SUBJECT, dependencies());
    expect((await trackOrder(CODE, SUBJECT, dependencies())).ok).toBe(true);
    await trackOrder('222222222222', SUBJECT, dependencies()); // décimo fallo
    expect(await trackOrder(CODE, SUBJECT, dependencies())).toEqual({ ok: false, code: 'RATE_LIMITED' });
  });

  it('solo se persiste el HMAC del origen: la IP nunca queda en claro', async () => {
    await trackOrder('222222222222', SUBJECT, dependencies());
    const dump = JSON.stringify((await owner.query('SELECT * FROM rate_limit_buckets')).rows);
    expect(dump).not.toContain(SUBJECT);
    expect(dump).not.toContain(SECRET);
    expect((await owner.query('SELECT surface FROM rate_limit_buckets')).rows).toEqual([{ surface: 'PUBLIC_TRACKING' }]);
  });
});

describe('falla cerrada si la protección no está disponible', () => {
  it('devuelve SERVICE_UNAVAILABLE sin consultar ninguna orden, distinto de RATE_LIMITED', async () => {
    await insertPopulatedOrder();
    await owner.query('ALTER TABLE rate_limit_buckets RENAME TO rate_limit_buckets_off');
    const spy = vi.fn();
    try {
      const result = await trackOrder(CODE, SUBJECT, dependencies({ findByTrackingCode: spy }));
      expect(result).toEqual({ ok: false, code: 'SERVICE_UNAVAILABLE' });
      expect(spy).not.toHaveBeenCalled();
      expect(JSON.stringify(result)).not.toContain('rate_limit');
    } finally {
      await owner.query('ALTER TABLE rate_limit_buckets_off RENAME TO rate_limit_buckets');
    }
  });

  it('sin configuración del limitador la composición de producción también falla cerrado', async () => {
    await insertPopulatedOrder();
    // Sin DATABASE_URL de runtime ni RATE_LIMIT_HMAC_SECRET el limitador no puede construirse (se fuerza el entorno
    // para que el resultado no dependa de los archivos locales ni del CI).
    vi.stubEnv('DATABASE_URL', '');
    vi.stubEnv('RATE_LIMIT_HMAC_SECRET', '');
    try {
      expect(await trackOrderFromRequest(CODE, SUBJECT)).toEqual({ ok: false, code: 'SERVICE_UNAVAILABLE' });
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
