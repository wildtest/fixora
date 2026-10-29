import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type pg from 'pg';
import { issueAdminContext } from '../../src/application/admin/admin-context';
import { getAdminOrderDetail } from '../../src/application/admin/order-detail';
import { DETAIL_KEYS } from '../../src/domain/admin/order-detail';
import { createAdminOrderDetailStore } from '../../src/infrastructure/admin/admin-order-detail-store';
import type { PrismaClient } from '../../src/infrastructure/db/generated/client.ts';
import { createPublicOrderStore } from '../../src/infrastructure/tracking/public-order-store';
import { appPrisma, ownerPg } from './support/connections';
import { resetTestDatabase } from './support/reset';

// Detalle administrativo contra PostgreSQL real con el rol de aplicación (CHG-09b). Datos FICTICIOS, deliberadamente
// poblados con información privada y de funciones futuras para comprobar que NO se carga ni se expone.
const admin = issueAdminContext('admin-de-prueba');
const CODE = '23456789BDFG';
const T0 = new Date('2026-10-28T10:00:00.000Z');
const at = (minutes: number) => new Date(T0.getTime() + minutes * 60_000).toISOString();

let prisma: PrismaClient;
let owner: pg.Client;

async function insertOrder(overrides: { id?: string; email?: string | null; model?: string | null; status?: string } = {}) {
  const id = overrides.id ?? randomUUID();
  await owner.query(
    `INSERT INTO repair_orders (id, tracking_code, status, customer_name, customer_name_search, customer_phone, customer_email,
       device_type, brand, model, problem_description, diagnosis, estimated_cost, version, created_at, updated_at)
     VALUES ($1, $2, $3::order_status, 'CANARY-NOMBRE Ana Quispe', 'canary-nombre ana quispe', '+51 CANARY-TELEFONO 999', $4,
       'LAPTOP', 'Lenovo', $5, 'No enciende <b>nada</b>', 'CANARY-DIAGNOSTICO', 321.50, 9, $6::timestamptz, $6::timestamptz)`,
    [id, CODE, overrides.status ?? 'SOLICITUD_RECIBIDA', overrides.email === undefined ? 'canary-correo@example.com' : overrides.email, overrides.model === undefined ? 'T14' : overrides.model, T0.toISOString()],
  );
  return id;
}

async function insertEvent(orderId: string, from: string | null, to: string, occurredAt: string, id = randomUUID()) {
  await owner.query(
    'INSERT INTO order_status_history (id, order_id, from_status, to_status, occurred_at) VALUES ($1, $2, $3::order_status, $4::order_status, $5::timestamptz)',
    [id, orderId, from, to, occurredAt],
  );
}

const store = () => createAdminOrderDetailStore(prisma);

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

describe('detalle de una orden existente', () => {
  it('devuelve todos los campos administrativos permitidos y SOLO esas claves', async () => {
    const id = await insertOrder();
    await insertEvent(id, null, 'SOLICITUD_RECIBIDA', at(0));
    const detail = await getAdminOrderDetail(admin, id, store());
    expect(detail).not.toBeNull();
    expect(Object.keys(detail!).sort()).toEqual([...DETAIL_KEYS]);
    expect(detail).toMatchObject({
      version: 9,
      allowedTransitions: [
        { targetStatus: 'EQUIPO_RECIBIDO', requiresConfirmation: false },
        { targetStatus: 'CANCELADO', requiresConfirmation: true },
      ],
      id,
      trackingCode: CODE,
      status: 'SOLICITUD_RECIBIDA',
      createdAt: T0.toISOString(),
      customer: { name: 'CANARY-NOMBRE Ana Quispe', phone: '+51 CANARY-TELEFONO 999', email: 'canary-correo@example.com' },
      device: { type: 'LAPTOP', brand: 'Lenovo', model: 'T14' },
      problemDescription: 'No enciende <b>nada</b>', // texto crudo: la interfaz lo escapa
    });
  });

  it('sin sobrecarga: no devuelve diagnóstico, costo, notas, versión ni historiales de otras funciones', async () => {
    const id = await insertOrder();
    await owner.query(
      `INSERT INTO order_notes (id, order_id, visibility, content, version, created_at, updated_at)
       VALUES ($1, $3, 'INTERNAL', 'CANARY-NOTA-INTERNA', 1, now(), now()), ($2, $3, 'PUBLIC', 'CANARY-NOTA-PUBLICA', 1, now(), now())`,
      [randomUUID(), randomUUID(), id],
    );
    await owner.query("INSERT INTO diagnosis_history (id, order_id, previous_value, new_value, occurred_at) VALUES ($1, $2, NULL, 'CANARY-HIST-DIAGNOSTICO', now())", [randomUUID(), id]);
    await owner.query('INSERT INTO cost_history (id, order_id, previous_value, new_value, occurred_at) VALUES ($1, $2, NULL, 777.77, now())', [randomUUID(), id]);
    const json = JSON.stringify(await getAdminOrderDetail(admin, id, store()));
    expect(json).not.toMatch(/CANARY-DIAGNOSTICO|CANARY-NOTA|CANARY-HIST|321|777|"diagnosis"|"estimatedCost"|"notes"|"capabilities"|hasDiagnosisAndCost/);
  });

  it('el repositorio no menciona columnas ni tablas de funciones futuras en sus consultas', () => {
    const source = readFileSync('src/infrastructure/admin/admin-order-detail-store.ts', 'utf8')
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n');
    // Solo se admite la PRESENCIA de diagnóstico y costo (para decidir la transición), nunca sus valores.
    const withoutPresence = source
      .replaceAll('o."diagnosis" IS NOT NULL', '')
      .replaceAll('btrim(o."diagnosis")', '')
      .replaceAll('o."estimated_cost" IS NOT NULL', '');
    for (const forbidden of ['"diagnosis"', 'estimated_cost', 'updated_at', 'order_notes', 'diagnosis_history', 'cost_history', 'queryRawUnsafe']) {
      expect(withoutPresence, forbidden).not.toContain(forbidden);
    }
  });

  it('correo y modelo nulos llegan como null (la interfaz los presenta como «No informado»)', async () => {
    const id = await insertOrder({ email: null, model: null });
    const detail = await getAdminOrderDetail(admin, id, store());
    expect(detail?.customer.email).toBeNull();
    expect(detail?.device.model).toBeNull();
  });

  it('refleja el estado actual persistido', async () => {
    const id = await insertOrder({ status: 'EN_REPARACION' });
    expect((await getAdminOrderDetail(admin, id, store()))?.status).toBe('EN_REPARACION');
  });
});

describe('orden no encontrada', () => {
  it('UUID inexistente e identificador mal formado: ambos null; el mal formado ni siquiera consulta la base de datos', async () => {
    await insertOrder();
    expect(await getAdminOrderDetail(admin, randomUUID(), store())).toBeNull();
    const spy = vi.fn(store().findById);
    for (const raw of ['no-es-un-uuid', CODE, "x'; DROP TABLE repair_orders;--", '']) {
      expect(await getAdminOrderDetail(admin, raw, { findById: spy }), raw).toBeNull();
    }
    expect(spy).not.toHaveBeenCalled();
    expect((await owner.query('SELECT 1 FROM repair_orders')).rowCount).toBe(1);
  });

  it('conocer el UUID de otra orden no mezcla datos: cada identificador devuelve solo su orden', async () => {
    const a = await insertOrder({ id: randomUUID() });
    const b = randomUUID();
    await owner.query(
      `INSERT INTO repair_orders (id, tracking_code, status, customer_name, customer_name_search, customer_phone, device_type, brand,
         problem_description, version, created_at, updated_at)
       VALUES ($1, '33333333333B', 'SOLICITUD_RECIBIDA', 'Segunda Persona', 'segunda persona', '000', 'CELULAR', 'MarcaB', 'Otra', 1, now(), now())`,
      [b],
    );
    expect((await getAdminOrderDetail(admin, b, store()))?.customer.name).toBe('Segunda Persona');
    expect((await getAdminOrderDetail(admin, a, store()))?.trackingCode).toBe(CODE);
  });
});

describe('historial de estados', () => {
  it('orden recién registrada: solo NULL → Solicitud recibida con su fecha, sin eventos inventados', async () => {
    const id = await insertOrder();
    await insertEvent(id, null, 'SOLICITUD_RECIBIDA', at(0));
    const detail = await getAdminOrderDetail(admin, id, store());
    expect(detail?.statusHistory).toEqual([{ fromStatus: null, toStatus: 'SOLICITUD_RECIBIDA', occurredAt: at(0) }]);
  });

  it('varios cambios: del más reciente al más antiguo, con el estado anterior', async () => {
    const id = await insertOrder({ status: 'EN_DIAGNOSTICO' });
    await insertEvent(id, null, 'SOLICITUD_RECIBIDA', at(0));
    await insertEvent(id, 'SOLICITUD_RECIBIDA', 'EQUIPO_RECIBIDO', at(10));
    await insertEvent(id, 'EQUIPO_RECIBIDO', 'EN_DIAGNOSTICO', at(20));
    const history = (await getAdminOrderDetail(admin, id, store()))!.statusHistory;
    expect(history.map((event) => event.toStatus)).toEqual(['EN_DIAGNOSTICO', 'EQUIPO_RECIBIDO', 'SOLICITUD_RECIBIDA']);
    expect(history[0]).toEqual({ fromStatus: 'EQUIPO_RECIBIDO', toStatus: 'EN_DIAGNOSTICO', occurredAt: at(20) });
    expect(history.at(-1)?.fromStatus).toBeNull();
  });

  it('orden estable ante el mismo instante (desempate por id descendente) en cada consulta', async () => {
    const id = await insertOrder({ status: 'ESPERANDO_APROBACION' });
    await insertEvent(id, null, 'SOLICITUD_RECIBIDA', at(0), '00000000-0000-4000-8000-000000000001');
    await insertEvent(id, 'SOLICITUD_RECIBIDA', 'EQUIPO_RECIBIDO', at(5), '00000000-0000-4000-8000-000000000002');
    await insertEvent(id, 'EQUIPO_RECIBIDO', 'EN_DIAGNOSTICO', at(5), '00000000-0000-4000-8000-000000000003');
    const first = (await getAdminOrderDetail(admin, id, store()))!.statusHistory.map((e) => e.toStatus);
    const second = (await getAdminOrderDetail(admin, id, store()))!.statusHistory.map((e) => e.toStatus);
    expect(first).toEqual(['EN_DIAGNOSTICO', 'EQUIPO_RECIBIDO', 'SOLICITUD_RECIBIDA']);
    expect(second).toEqual(first);
  });
});

describe('regresión de SC-11: lo administrativo no llega a la consulta pública', () => {
  it('una orden con datos personales visibles en administración sigue sin exponerlos en la vista pública', async () => {
    const id = await insertOrder();
    await insertEvent(id, null, 'SOLICITUD_RECIBIDA', at(0));
    expect(await getAdminOrderDetail(admin, id, store())).toMatchObject({ customer: { name: 'CANARY-NOMBRE Ana Quispe' } });

    const publicView = await createPublicOrderStore(prisma).findByTrackingCode(CODE);
    expect(publicView).not.toBeNull();
    const json = JSON.stringify(publicView);
    expect(json).not.toMatch(/CANARY|canary|Quispe|id"|statusHistory|customer|phone|email|fromStatus|321|"version"/);
    expect(Object.keys(publicView!).sort()).toEqual(['device', 'problemDescription', 'status', 'statusTimeline', 'trackingCode']);
  });

  it('el módulo público no importa nada administrativo', () => {
    for (const file of ['src/infrastructure/tracking/public-order-store.ts', 'src/application/track-order.ts', 'src/application/track-order-service.ts', 'src/domain/repair/public-order-view.ts']) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/domain\/admin|infrastructure\/admin|application\/admin/);
    }
  });
});
