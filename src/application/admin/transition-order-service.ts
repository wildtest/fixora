import 'server-only';
import { createOrderTransitionStore } from '../../infrastructure/admin/order-transition-store';
import type { ActionResult } from '../action-result';
import { runAction } from '../run-action';
import { guardAdminAction, type SessionExpiredCode } from './admin-action';
import type { AdminContext } from './admin-context';
import { transitionOrder, type TransitionCode, type TransitionOutcome } from './transition-order';

// Composición de producción de la transición (CHG-10). El repositorio se crea al usarse. La sesión se comprueba en
// CADA llamada (`SESSION_EXPIRED` sin sesión válida, antes de cualquier lectura o escritura) y un fallo inesperado
// se convierte en `INTERNAL_ERROR` sin detalles. `authenticate` lo aporta el adaptador de `src/app`.
export function transitionOrderAction(
  authenticate: () => Promise<AdminContext | null>,
  raw: unknown,
): Promise<ActionResult<TransitionOutcome, TransitionCode | SessionExpiredCode>> {
  return runAction<TransitionOutcome, TransitionCode | SessionExpiredCode>(
    () => guardAdminAction(authenticate, (admin) => transitionOrder(admin, raw, { store: createOrderTransitionStore(), now: () => new Date() })),
    { surface: 'admin' },
  );
}
