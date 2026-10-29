import type pg from 'pg';
import { guardAdminAction } from '../../../src/application/admin/admin-action';
import type { AdminContext } from '../../../src/application/admin/admin-context';
import type { SessionService } from '../../../src/application/admin/session-service';
import type { ActionResult } from '../../../src/application/action-result';
import type { PrismaClient } from '../../../src/infrastructure/db/generated/client.ts';

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
  };
}

/** Todas las acciones administrativas registradas. Los changes posteriores añaden aquí las suyas. */
export function registeredActions(context: MatrixContext): readonly MatrixAction[] {
  return [exampleAdminAction(context)];
}
