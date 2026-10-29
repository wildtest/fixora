import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type pg from 'pg';
import { issueAdminContext } from '../../src/application/admin/admin-context';
import { getAdminOrderDetail } from '../../src/application/admin/order-detail';
import { createNote, deleteNote, editNote } from '../../src/application/admin/order-notes';
import { transitionOrder } from '../../src/application/admin/transition-order';
import type { OrderStatus } from '../../src/domain/repair/order-status';
import { createAdminOrderDetailStore } from '../../src/infrastructure/admin/admin-order-detail-store';
import { createOrderNotesStore, type OrderNotesStore } from '../../src/infrastructure/admin/order-notes-store';
import { createOrderTransitionStore } from '../../src/infrastructure/admin/order-transition-store';
import type { PrismaClient } from '../../src/infrastructure/db/generated/client.ts';
import { createPublicOrderStore } from '../../src/infrastructure/tracking/public-order-store';
import { appPrisma, ownerPg } from './support/connections';
import { resetTestDatabase } from './support/reset';

// Notas públicas e internas contra PostgreSQL real con el rol de aplicación (CHG-12). Sin mocks de Prisma. Datos FICTICIOS.
const admin = issueAdminContext('admin-de-prueba');
const T0 = new Date('2026-10-28T10:00:00.000Z');
const CODE = '23456789BDFG';
const OTHER_CODE = '34567892CDFG';
const NEEDS_DATA: readonly OrderStatus[] = ['ESPERANDO_APROBACION', 'EN_REPARACION', 'LISTO_PARA_RECOJO', 'ENTREGADO'];

let prisma: PrismaClient;
let owner: pg.Client;
let tick = 0;

const clock = () => new Date(T0.getTime() + (tick += 60_000));
const deps = (store: OrderNotesStore = createOrderNotesStore(prisma)) => ({ store, now: clock });
const transitionDeps = () => ({ store: createOrderTransitionStore(prisma), now: clock });
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function insertOrder(status: OrderStatus = 'EN_DIAGNOSTICO', code = CODE, version = 1) {
  const id = randomUUID();
  const withData = NEEDS_DATA.includes(status);
  await owner.query(
    `INSERT INTO repair_orders (id, tracking_code, status, customer_name, customer_name_search, customer_phone, customer_email,
       device_type, brand, model, problem_description, diagnosis, estimated_cost, version, created_at, updated_at)
     VALUES ($1, $2, $3::order_status, 'CANARY-NOMBRE', 'canary-nombre', 'CANARY-TELEFONO', 'canary@example.com', 'LAPTOP', 'Lenovo', 'T14',
       'No enciende', $4, $5::numeric, $6, $7::timestamptz, $7::timestamptz)`,
    [id, code, status, withData ? 'Diagnóstico' : null, withData ? '100.00' : null, version, T0.toISOString()],
  );
  await owner.query(
    'INSERT INTO order_status_history (id, order_id, from_status, to_status, occurred_at) VALUES ($1, $2, NULL, $3::order_status, $4::timestamptz)',
    [randomUUID(), id, 'SOLICITUD_RECIBIDA', T0.toISOString()],
  );
  return id;
}

const orderRow = async (id: string) =>
  (await owner.query('SELECT status::text AS status, version, updated_at FROM repair_orders WHERE id = $1', [id])).rows[0]!;
const noteRows = async (orderId: string) =>
  (await owner.query('SELECT id::text AS id, visibility::text AS visibility, content, version, updated_at FROM order_notes WHERE order_id = $1 ORDER BY created_at, id', [orderId])).rows;
const historyCount = async (id: string) =>
  Number((await owner.query('SELECT (SELECT count(*) FROM order_status_history WHERE order_id = $1) + (SELECT count(*) FROM diagnosis_history WHERE order_id = $1) + (SELECT count(*) FROM cost_history WHERE order_id = $1) AS n', [id])).rows[0]!.n);

const make = (orderId: string, content: unknown, visibility: unknown = 'PUBLIC') => ({ orderId, visibility, content });
const edit = (orderId: string, noteId: string, content: unknown, expectedNoteVersion: number) => ({ orderId, noteId, expectedNoteVersion, content });
const remove = (orderId: string, noteId: string, expectedNoteVersion: number) => ({ orderId, noteId, expectedNoteVersion });

async function created(orderId: string, content = 'Nota', visibility: 'PUBLIC' | 'INTERNAL' = 'PUBLIC') {
  const result = await createNote(admin, make(orderId, content, visibility), deps());
  if (!result.ok) throw new Error('No se pudo crear la nota de prueba.');
  return result.data.noteId;
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
  tick = 0;
  await resetTestDatabase();
});

describe('crear, editar y eliminar', () => {
  it('crea notas con versión 1, visibilidad fija y SIN tocar la versión, el estado ni el historial de la orden', async () => {
    const id = await insertOrder('EN_REPARACION', CODE, 5);
    const before = await orderRow(id);
    const history = await historyCount(id);
    const pub = await createNote(admin, make(id, '  Pieza en camino  ', 'PUBLIC'), deps());
    const internal = await createNote(admin, make(id, 'Cliente impaciente', 'INTERNAL'), deps());
    expect(pub).toMatchObject({ ok: true, data: { version: 1 } });
    expect(internal).toMatchObject({ ok: true, data: { version: 1 } });
    expect((await noteRows(id)).map((n) => [n.visibility, n.content, n.version])).toEqual([
      ['PUBLIC', 'Pieza en camino', 1],
      ['INTERNAL', 'Cliente impaciente', 1],
    ]);
    expect(await orderRow(id)).toEqual(before); // ni version, ni status, ni updated_at
    expect(await historyCount(id)).toBe(history); // las notas no tienen historial
  });

  it('crea en los seis estados no finales (también con diagnóstico y costo congelados)', async () => {
    for (const [i, status] of (['SOLICITUD_RECIBIDA', 'EQUIPO_RECIBIDO', 'EN_DIAGNOSTICO', 'ESPERANDO_APROBACION', 'EN_REPARACION', 'LISTO_PARA_RECOJO'] as const).entries()) {
      const id = await insertOrder(status, `2345678${i + 2}BDFG`.slice(0, 12));
      expect((await createNote(admin, make(id, `Nota ${status}`, 'INTERNAL'), deps())).ok, status).toBe(true);
    }
  });

  it('valida el contenido: vacío, 2001 caracteres y U+0000 no escriben; 2000 sí', async () => {
    const id = await insertOrder();
    expect(await createNote(admin, make(id, '   '), deps())).toEqual({ ok: false, code: 'VALIDATION_FAILED', fieldErrors: { content: 'REQUIRED' } });
    expect(await createNote(admin, make(id, 'a'.repeat(2001)), deps())).toEqual({ ok: false, code: 'VALIDATION_FAILED', fieldErrors: { content: 'TOO_LONG' } });
    expect(await createNote(admin, make(id, 'a\u0000b'), deps())).toEqual({ ok: false, code: 'VALIDATION_FAILED', fieldErrors: { content: 'INVALID_FORMAT' } });
    expect(await noteRows(id)).toEqual([]);
    expect((await createNote(admin, make(id, 'a'.repeat(2000)), deps())).ok).toBe(true);
  });

  it('edita con +1 de versión de la NOTA, mantiene la visibilidad y no toca la orden; el idéntico es un no-op', async () => {
    const id = await insertOrder('EN_DIAGNOSTICO', CODE, 3);
    const noteId = await created(id, 'Antes', 'INTERNAL');
    const orderBefore = await orderRow(id);
    expect(await editNote(admin, edit(id, noteId, '  Después ', 1), deps())).toEqual({ ok: true, data: { version: 2, changed: true } });
    const [changed] = await noteRows(id);
    expect(changed).toMatchObject({ content: 'Después', version: 2, visibility: 'INTERNAL' });
    const stamp = changed!.updated_at;
    // Idéntico (tras el trim) con la versión vigente: éxito sin UPDATE, versión ni updated_at.
    expect(await editNote(admin, edit(id, noteId, 'Después', 2), deps())).toEqual({ ok: true, data: { version: 2, changed: false } });
    expect((await noteRows(id))[0]).toMatchObject({ version: 2, updated_at: stamp });
    expect(await orderRow(id)).toEqual(orderBefore);
  });

  it('elimina físicamente sin dejar rastro y una segunda eliminación es NOTE_NOT_FOUND', async () => {
    const id = await insertOrder();
    const noteId = await created(id);
    expect(await deleteNote(admin, remove(id, noteId, 1), deps())).toEqual({ ok: true, data: { deleted: true } });
    expect(await noteRows(id)).toEqual([]);
    expect(await deleteNote(admin, remove(id, noteId, 1), deps())).toEqual({ ok: false, code: 'NOTE_NOT_FOUND' });
  });

  it('un noteId de OTRA orden es NOTE_NOT_FOUND y no se modifica ni se elimina', async () => {
    const a = await insertOrder('EN_DIAGNOSTICO', CODE);
    const b = await insertOrder('EN_DIAGNOSTICO', OTHER_CODE);
    const noteOfB = await created(b, 'De B');
    expect(await editNote(admin, edit(a, noteOfB, 'Hack', 1), deps())).toEqual({ ok: false, code: 'NOTE_NOT_FOUND' });
    expect(await deleteNote(admin, remove(a, noteOfB, 1), deps())).toEqual({ ok: false, code: 'NOTE_NOT_FOUND' });
    expect((await noteRows(b))[0]).toMatchObject({ content: 'De B', version: 1 });
  });
});

describe('concurrencia de la nota (STALE_NOTE) y orden cerrada', () => {
  it('versión obsoleta: STALE_NOTE sin cambios, incluso con texto coincidente (no es un no-op)', async () => {
    const id = await insertOrder();
    const noteId = await created(id, 'Uno');
    await editNote(admin, edit(id, noteId, 'Dos', 1), deps());
    expect(await editNote(admin, edit(id, noteId, 'Tres', 1), deps())).toEqual({ ok: false, code: 'STALE_NOTE' });
    expect(await editNote(admin, edit(id, noteId, 'Dos', 1), deps())).toEqual({ ok: false, code: 'STALE_NOTE' });
    expect(await deleteNote(admin, remove(id, noteId, 1), deps())).toEqual({ ok: false, code: 'STALE_NOTE' });
    expect((await noteRows(id))[0]).toMatchObject({ content: 'Dos', version: 2 });
  });

  it('dos ediciones simultáneas con la misma versión: exactamente una gana y la otra recibe STALE_NOTE', async () => {
    const id = await insertOrder();
    const noteId = await created(id, 'Base');
    const [a, b] = await Promise.all([
      editNote(admin, edit(id, noteId, 'Desde A', 1), deps()),
      editNote(admin, edit(id, noteId, 'Desde B', 1), deps()),
    ]);
    expect([a.ok, b.ok].sort()).toEqual([false, true]);
    expect([a, b].find((r) => !r.ok)).toEqual({ ok: false, code: 'STALE_NOTE' });
    expect((await noteRows(id))[0]).toMatchObject({ version: 2 });
  });

  it('Entregado y Cancelado: ORDER_CLOSED para crear, editar y eliminar, sin escribir; las notas existentes se conservan', async () => {
    for (const [i, status] of (['ENTREGADO', 'CANCELADO'] as const).entries()) {
      const id = await insertOrder(status, `2345678${i + 2}BDFG`.slice(0, 12));
      await owner.query(
        "INSERT INTO order_notes (id, order_id, visibility, content, version, created_at, updated_at) VALUES ($1, $2, 'PUBLIC', 'Previa', 1, now(), now())",
        [randomUUID(), id],
      );
      const [existing] = await noteRows(id);
      expect(await createNote(admin, make(id, 'Nueva'), deps()), status).toEqual({ ok: false, code: 'ORDER_CLOSED' });
      expect(await editNote(admin, edit(id, existing!.id, 'Cambio', 1), deps())).toEqual({ ok: false, code: 'ORDER_CLOSED' });
      expect(await deleteNote(admin, remove(id, existing!.id, 1), deps())).toEqual({ ok: false, code: 'ORDER_CLOSED' });
      expect((await noteRows(id)).map((n) => n.content)).toEqual(['Previa']);
    }
  });

  it('el rol de aplicación puede bloquear la fila de la orden (FOR UPDATE) con sus privilegios de columna', async () => {
    const id = await insertOrder();
    expect((await createNote(admin, make(id, 'Con bloqueo'), deps())).ok).toBe(true);
  });
});

describe('carreras reales entre una nota y el cierre de la orden', () => {
  it('cierre primero: una orden bloqueada por la cancelación hace que la nota concurrente vea CANCELADO y se rechace', async () => {
    const id = await insertOrder('EN_DIAGNOSTICO');
    await owner.query('BEGIN');
    try {
      await owner.query("UPDATE repair_orders SET status = 'CANCELADO'::order_status, version = version + 1 WHERE id = $1", [id]);
      const pending = createNote(admin, make(id, 'Llegó tarde'), deps());
      await sleep(300); // la nota ya está esperando el bloqueo de la fila
      await owner.query('COMMIT');
      expect(await pending).toEqual({ ok: false, code: 'ORDER_CLOSED' });
    } finally {
      await owner.query('ROLLBACK').catch(() => undefined);
    }
    expect(await noteRows(id)).toEqual([]);
  });

  it('nota primero: la nota se confirma y la cancelación concurrente procede después, con la nota conservada', async () => {
    const id = await insertOrder('EN_DIAGNOSTICO');
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const real = createOrderNotesStore(prisma);
    // La nota retiene el bloqueo de la fila hasta que se libera la puerta.
    const gated: OrderNotesStore = {
      inTransaction: (work) =>
        real.inTransaction(async (unit) =>
          work({
            ...unit,
            lockOrder: async (orderId) => {
              const locked = await unit.lockOrder(orderId);
              await gate;
              return locked;
            },
          }),
        ),
    };
    const note = createNote(admin, make(id, 'Explicación previa', 'PUBLIC'), deps(gated));
    await sleep(300);
    const cancel = transitionOrder(admin, { orderId: id, targetStatus: 'CANCELADO', expectedVersion: 1, confirmed: true }, transitionDeps());
    await sleep(300); // la cancelación espera detrás del bloqueo de la nota
    release();
    expect((await note).ok).toBe(true);
    expect((await cancel).ok).toBe(true);
    expect(await orderRow(id)).toMatchObject({ status: 'CANCELADO', version: 2 });
    expect((await noteRows(id)).map((n) => n.content)).toEqual(['Explicación previa']);
  });

  it('nota vs Listo para recojo → Entregado: cualquiera de los dos órdenes serializados deja un resultado coherente', async () => {
    const id = await insertOrder('LISTO_PARA_RECOJO');
    const noteId = await created(id, 'Base', 'INTERNAL');
    const [edited, delivered] = await Promise.all([
      editNote(admin, edit(id, noteId, 'Editada', 1), deps()),
      transitionOrder(admin, { orderId: id, targetStatus: 'ENTREGADO', expectedVersion: 1, confirmed: true }, transitionDeps()),
    ]);
    expect(delivered.ok).toBe(true);
    const [note] = await noteRows(id);
    if (edited.ok) expect(note).toMatchObject({ content: 'Editada', version: 2 });
    else {
      expect(edited).toEqual({ ok: false, code: 'ORDER_CLOSED' });
      expect(note).toMatchObject({ content: 'Base', version: 1 });
    }
    expect((await orderRow(id)).status).toBe('ENTREGADO');
  });

  it('una confirmación E11 abierta NO se invalida por notas: la transición con la versión anterior sigue siendo válida', async () => {
    const id = await insertOrder('EN_DIAGNOSTICO', CODE, 4);
    await created(id, 'Una', 'PUBLIC');
    await created(id, 'Otra', 'INTERNAL');
    const result = await transitionOrder(admin, { orderId: id, targetStatus: 'CANCELADO', expectedVersion: 4, confirmed: true }, transitionDeps());
    expect(result.ok).toBe(true);
  });
});

describe('lecturas y privacidad [SC-11]', () => {
  it('el detalle administrativo separa las notas por visibilidad, de la más reciente a la más antigua, con su versión', async () => {
    const id = await insertOrder('EN_REPARACION');
    await created(id, 'Pública 1', 'PUBLIC');
    await created(id, 'Interna 1', 'INTERNAL');
    const second = await created(id, 'Pública 2', 'PUBLIC');
    await editNote(admin, edit(id, second, 'Pública 2 editada', 1), deps());
    const detail = await getAdminOrderDetail(admin, id, createAdminOrderDetailStore(prisma));
    expect(detail?.publicNotes.map((n) => [n.content, n.version])).toEqual([['Pública 2 editada', 2], ['Pública 1', 1]]);
    expect(detail?.internalNotes.map((n) => [n.content, n.version])).toEqual([['Interna 1', 1]]);
    expect(detail?.canManageNotes).toBe(true);
    const closed = await insertOrder('ENTREGADO', OTHER_CODE);
    expect((await getAdminOrderDetail(admin, closed, createAdminOrderDetailStore(prisma)))?.canManageNotes).toBe(false);
  });

  it('la consulta pública solo devuelve notas PÚBLICAS de ESA orden como {content, createdAt}, sin internas, ids ni versión', async () => {
    const id = await insertOrder('EN_DIAGNOSTICO');
    const other = await insertOrder('EN_DIAGNOSTICO', OTHER_CODE);
    await created(id, 'CANARY-INTERNAL-NOTE', 'INTERNAL');
    await created(id, 'Primera visible', 'PUBLIC');
    await created(id, 'Segunda visible', 'PUBLIC');
    await created(other, 'CANARY-OTRA-ORDEN', 'PUBLIC');
    const view = await createPublicOrderStore(prisma).findByTrackingCode(CODE);
    expect(view?.publicNotes.map((n) => n.content)).toEqual(['Segunda visible', 'Primera visible']);
    for (const note of view!.publicNotes) expect(Object.keys(note).sort()).toEqual(['content', 'createdAt']);
    const json = JSON.stringify(view);
    expect(json).not.toMatch(/CANARY|"id"|"version"|visibility|INTERNAL/i);
    // Editar o eliminar se refleja de inmediato en la vista pública; una nota eliminada desaparece.
    const [first] = (await noteRows(id)).filter((n) => n.content === 'Primera visible');
    await deleteNote(admin, remove(id, first!.id, 1), deps());
    expect((await createPublicOrderStore(prisma).findByTrackingCode(CODE))?.publicNotes.map((n) => n.content)).toEqual(['Segunda visible']);
  });

  it('las notas públicas se ven en cualquier estado, incluida una orden cancelada, junto con el resto de la vista', async () => {
    const id = await insertOrder('EN_DIAGNOSTICO');
    await created(id, 'Motivo de la cancelación', 'PUBLIC');
    await transitionOrder(admin, { orderId: id, targetStatus: 'CANCELADO', expectedVersion: 1, confirmed: true }, transitionDeps());
    const view = await createPublicOrderStore(prisma).findByTrackingCode(CODE);
    expect(view?.status).toBe('CANCELADO');
    expect(view?.publicNotes.map((n) => n.content)).toEqual(['Motivo de la cancelación']);
  });
});
