import 'server-only';
import { createOrderDataStore } from '../../infrastructure/admin/order-data-store';
import type { ActionResult } from '../action-result';
import { runAction } from '../run-action';
import { guardAdminAction, type SessionExpiredCode } from './admin-action';
import type { AdminContext } from './admin-context';
import { saveBasicOrderData, type BasicDataCode, type BasicDataOutcome } from './edit-basic-data';

// Composición de producción de la corrección de datos básicos (CHG-13). La sesión se comprueba en CADA llamada
// (`SESSION_EXPIRED` antes de cualquier lectura o escritura) y un fallo inesperado se convierte en `INTERNAL_ERROR` sin
// detalles. `authenticate` lo aporta el adaptador de `src/app`. NUNCA se registran nombres, teléfonos, correos ni cuerpos.
export function saveBasicOrderDataAction(
  authenticate: () => Promise<AdminContext | null>,
  raw: unknown,
): Promise<ActionResult<BasicDataOutcome, BasicDataCode | SessionExpiredCode>> {
  return runAction<BasicDataOutcome, BasicDataCode | SessionExpiredCode>(
    () => guardAdminAction(authenticate, (admin) => saveBasicOrderData(admin, raw, { store: createOrderDataStore(), now: () => new Date() })),
    { surface: 'admin' },
  );
}
