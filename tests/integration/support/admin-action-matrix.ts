import type pg from 'pg';
import { guardAdminAction } from '../../../src/application/admin/admin-action';
import type { AdminContext } from '../../../src/application/admin/admin-context';
import type { SessionService } from '../../../src/application/admin/session-service';
import type { ActionResult } from '../../../src/application/action-result';
import { transitionOrder } from '../../../src/application/admin/transition-order';
import type { PrismaClient } from '../../../src/infrastructure/db/generated/client.ts';
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

/** Todas las acciones administrativas registradas. Los changes posteriores añaden aquí las suyas. */
export function registeredActions(context: MatrixContext): readonly MatrixAction[] {
  return [exampleAdminAction(context), transitionAction(context)];
}
