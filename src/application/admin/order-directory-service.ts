import 'server-only';
import { createAdminOrderStore } from '../../infrastructure/admin/admin-order-store';
import type { ActionResult } from '../action-result';
import { runAction } from '../run-action';
import type { AdminDashboardDTO, AdminOrderPage } from '../../domain/admin/order-directory';
import type { AdminContext } from './admin-context';
import { guardAdminAction } from './admin-action';
import { listOrders, loadDashboard, type DirectoryInput } from './order-directory';

// Composición de producción de la lectura administrativa (CHG-09a). El repositorio se crea al usarse.

export function dashboardFor(admin: AdminContext): Promise<AdminDashboardDTO> {
  return loadDashboard(admin, createAdminOrderStore());
}

export function directoryPageFor(admin: AdminContext, input: DirectoryInput): Promise<AdminOrderPage> {
  return listOrders(admin, input, createAdminOrderStore());
}

/**
 * Lectura interactiva del directorio (Server Action): la sesión se vuelve a comprobar en CADA acción
 * (`SESSION_EXPIRED` sin sesión válida) y un fallo inesperado se convierte en `INTERNAL_ERROR` sin detalles.
 * `authenticate` lo aporta el adaptador de `src/app` (que es quien lee la cookie).
 */
export function searchOrdersAction(
  authenticate: () => Promise<AdminContext | null>,
  input: DirectoryInput,
): Promise<ActionResult<AdminOrderPage, 'SESSION_EXPIRED'>> {
  return runAction<AdminOrderPage, 'SESSION_EXPIRED'>(
    () =>
      guardAdminAction(authenticate, async (admin) => ({ ok: true as const, data: await directoryPageFor(admin, input) })),
    { surface: 'admin' },
  );
}
