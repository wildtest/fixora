import type pg from 'pg';
import { guardAdminAction } from '../../../src/application/admin/admin-action';
import type { AdminContext } from '../../../src/application/admin/admin-context';
import type { SessionService } from '../../../src/application/admin/session-service';
import type { ActionResult } from '../../../src/application/action-result';
import { saveDiagnosis, saveEstimatedCost } from '../../../src/application/admin/edit-diagnosis-cost';
import { saveBasicOrderData } from '../../../src/application/admin/edit-basic-data';
import { createNote, deleteNote, editNote } from '../../../src/application/admin/order-notes';
import { transitionOrder } from '../../../src/application/admin/transition-order';
import type { PrismaClient } from '../../../src/infrastructure/db/generated/client.ts';
import { createOrderDataStore } from '../../../src/infrastructure/admin/order-data-store';
import { createOrderNotesStore } from '../../../src/infrastructure/admin/order-notes-store';
import { createOrderEditStore } from '../../../src/infrastructure/admin/order-edit-store';
import { createOrderTransitionStore } from '../../../src/infrastructure/admin/order-transition-store';

// Matriz de autorización de acciones administrativas (CHG-08, tarea 5.4). EXCLUSIVAMENTE infraestructura de pruebas:
// no existe registro de acciones en el producto (ni en `domain`, `application`, la base de datos o metadatos de
// ejecución). Verifica la regresión «acción administrativa invocada directamente + sin sesión válida →
// `SESSION_EXPIRED` → sin cambio de estado».
//
// Cada change administrativo posterior AÑADE sus acciones a `registeredActions()` con una entrada
// { name, invoke, snapshot }: CHG-10 (transición de estado), CHG-11 (`saveDiagnosis`, `saveEstimatedCost`),
// CHG-12 (`createNote`, `editNote`, `deleteNote`) y CHG-13 (`saveBasicOrderData`), o sus nombres finales.
// CHG-14 solo reverifica la matriz completa.

export type MatrixAction = {
  readonly name: string;
  /** Invoca la acción real como la invocaría un cliente, con el token de la cookie (o ninguno). */
  readonly invoke: (token: string | undefined) => Promise<{ readonly ok: boolean; readonly code?: string; readonly data?: unknown }>;
  /** Fotografía del estado que la acción mutaría; sin sesión válida debe quedar IDÉNTICA. */
  readonly snapshot: () => Promise<string>;
  /** ¿El resultado es un éxito de ESTA acción? (control positivo con una sesión válida). */
  readonly succeeded: (result: { readonly ok: boolean; readonly data?: unknown }) => boolean;
};

export type MatrixContext = {
  readonly prisma: PrismaClient;
  readonly owner: pg.Client;
  readonly sessions: SessionService;
  readonly orderId: string;
};

/** Acción de EJEMPLO del patrón (5.2): `requireAdmin → validar → caso de uso → escritura`. No es una mutación del producto. */
export function exampleAdminAction(context: MatrixContext): MatrixAction {
  const { prisma, owner, sessions, orderId } = context;
  return {
    name: 'exampleAdminAction (patrón de 5.2)',
    invoke: (token) =>
      guardAdminAction(
        () => sessions.authenticate(token),
        async (admin: AdminContext): Promise<ActionResult<{ readonly by: string }, never>> => {
          await prisma.$executeRaw`UPDATE "repair_orders" SET "brand" = 'MUTADA-POR-LA-ACCION' WHERE "id" = ${orderId}::uuid`;
          return { ok: true, data: { by: admin.adminId } };
        },
      ),
    snapshot: async () => {
      const { rows } = await owner.query('SELECT brand, version, updated_at FROM repair_orders WHERE id = $1', [orderId]);
      return JSON.stringify(rows);
    },
    succeeded: (result) => result.ok && (result.data as { by?: string } | undefined)?.by !== undefined,
  };
}

/** CHG-10: cambio de estado (`transitionOrderStatus`). Sin sesión válida no lee ni escribe nada. */
export function transitionAction(context: MatrixContext): MatrixAction {
  const { prisma, owner, sessions, orderId } = context;
  return {
    name: 'transitionOrderStatus (CHG-10)',
    invoke: (token) =>
      guardAdminAction(
        () => sessions.authenticate(token),
        (admin: AdminContext) =>
          transitionOrder(
            admin,
            { orderId, targetStatus: 'EQUIPO_RECIBIDO', expectedVersion: 1, confirmed: false },
            { store: createOrderTransitionStore(prisma), now: () => new Date() },
          ),
      ),
    snapshot: async () => {
      const orders = await owner.query('SELECT status::text AS status, version, updated_at FROM repair_orders WHERE id = $1', [orderId]);
      const history = await owner.query('SELECT from_status::text AS f, to_status::text AS t FROM order_status_history WHERE order_id = $1 ORDER BY id', [orderId]);
      return JSON.stringify({ orders: orders.rows, history: history.rows });
    },
    succeeded: (result) => result.ok,
  };
}

/** CHG-11: `saveDiagnosis` y `saveEstimatedCost` (dos operaciones independientes). Sin sesión válida no leen ni escriben nada. */
function editAction(context: MatrixContext, kind: 'diagnosis' | 'cost'): MatrixAction {
  const { prisma, owner, sessions, orderId } = context;
  const run = kind === 'diagnosis' ? saveDiagnosis : saveEstimatedCost;
  return {
    name: kind === 'diagnosis' ? 'saveDiagnosis (CHG-11)' : 'saveEstimatedCost (CHG-11)',
    invoke: async (token) => {
      // La versión vigente: un rechazo SIN sesión debe deberse a la sesión, nunca a una versión desfasada.
      const version = Number((await owner.query('SELECT version FROM repair_orders WHERE id = $1', [orderId])).rows[0]!.version);
      return guardAdminAction(
        () => sessions.authenticate(token),
        (admin: AdminContext) =>
          run(
            admin,
            kind === 'diagnosis'
              ? { orderId, diagnosis: 'Diagnóstico de la matriz', expectedVersion: version }
              : { orderId, estimatedCost: '123.45', expectedVersion: version },
            { store: createOrderEditStore(prisma), now: () => new Date() },
          ),
      );
    },
    snapshot: async () => {
      const orders = await owner.query('SELECT status::text AS status, version, diagnosis, estimated_cost::text AS cost FROM repair_orders WHERE id = $1', [orderId]);
      const diagnosis = await owner.query('SELECT count(*)::int AS n FROM diagnosis_history WHERE order_id = $1', [orderId]);
      const cost = await owner.query('SELECT count(*)::int AS n FROM cost_history WHERE order_id = $1', [orderId]);
      return JSON.stringify({ orders: orders.rows, diagnosisEvents: diagnosis.rows, costEvents: cost.rows });
    },
    succeeded: (result) => result.ok && (result.data as { changed?: boolean } | undefined)?.changed === true,
  };
}

/** CHG-12: `createNote`, `editNote` y `deleteNote`. Sin sesión válida no leen ni escriben nada (ni siquiera bloquean la orden). */
function noteAction(context: MatrixContext, kind: 'create' | 'edit' | 'delete'): MatrixAction {
  const { prisma, owner, sessions, orderId } = context;
  const deps = () => ({ store: createOrderNotesStore(prisma), now: () => new Date() });
  return {
    name: `${kind}Note (CHG-12)`,
    invoke: async (token) => {
      // Una nota existente con su versión vigente: un rechazo SIN sesión debe deberse a la sesión, nunca a una versión desfasada.
      const note = (await owner.query('SELECT id::text AS id, version FROM order_notes WHERE order_id = $1 ORDER BY created_at, id LIMIT 1', [orderId])).rows[0];
      const noteId = (note?.id as string | undefined) ?? '00000000-0000-4000-8000-000000000000';
      const expectedNoteVersion = Number(note?.version ?? 1);
      return guardAdminAction(
        () => sessions.authenticate(token),
        (admin: AdminContext) =>
          (kind === 'create'
            ? createNote(admin, { orderId, visibility: 'INTERNAL', content: 'Nota de la matriz' }, deps())
            : kind === 'edit'
              ? editNote(admin, { orderId, noteId, expectedNoteVersion, content: `Editada por la matriz ${Date.now()}` }, deps())
              : deleteNote(admin, { orderId, noteId, expectedNoteVersion }, deps())) as unknown as Promise<ActionResult<unknown, never>>,
      );
    },
    snapshot: async () => {
      const orders = await owner.query('SELECT status::text AS status, version, updated_at FROM repair_orders WHERE id = $1', [orderId]);
      const notes = await owner.query('SELECT id::text AS id, visibility::text AS v, content, version, updated_at FROM order_notes WHERE order_id = $1 ORDER BY id', [orderId]);
      return JSON.stringify({ orders: orders.rows, notes: notes.rows });
    },
    succeeded: (result) => result.ok,
  };
}

/** CHG-13: `saveBasicOrderData` (corrección conjunta de datos básicos). Sin sesión válida no lee ni escribe nada. */
export function basicDataAction(context: MatrixContext): MatrixAction {
  const { prisma, owner, sessions, orderId } = context;
  return {
    name: 'saveBasicOrderData (CHG-13)',
    invoke: async (token) => {
      // La versión vigente: un rechazo SIN sesión debe deberse a la sesión, nunca a una versión desfasada.
      const version = Number((await owner.query('SELECT version FROM repair_orders WHERE id = $1', [orderId])).rows[0]!.version);
      return guardAdminAction(
        () => sessions.authenticate(token),
        (admin: AdminContext) =>
          saveBasicOrderData(
            admin,
            {
              orderId,
              expectedVersion: version,
              customerName: 'Nombre de la matriz',
              customerPhone: '+51 999 000 111',
              customerEmail: '',
              deviceType: 'LAPTOP',
              brand: `Marca de la matriz ${Date.now()}`,
              model: '',
              problemDescription: 'Descripción de la matriz',
            },
            { store: createOrderDataStore(prisma), now: () => new Date() },
          ),
      );
    },
    snapshot: async () => {
      const { rows } = await owner.query(
        'SELECT status::text AS status, version, updated_at, customer_name, customer_name_search, customer_phone, customer_email, device_type::text AS device_type, brand, model, problem_description FROM repair_orders WHERE id = $1',
        [orderId],
      );
      return JSON.stringify(rows);
    },
    succeeded: (result) => result.ok && (result.data as { changed?: boolean } | undefined)?.changed === true,
  };
}

/** Todas las acciones administrativas registradas. Los changes posteriores añaden aquí las suyas. */
export function registeredActions(context: MatrixContext): readonly MatrixAction[] {
  return [exampleAdminAction(context), transitionAction(context), editAction(context, 'diagnosis'), editAction(context, 'cost'),
    noteAction(context, 'create'), noteAction(context, 'edit'), noteAction(context, 'delete'), basicDataAction(context)];
}
