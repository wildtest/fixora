import 'server-only';
import { createOrderEditStore } from '../../infrastructure/admin/order-edit-store';
import type { ActionResult } from '../action-result';
import { runAction } from '../run-action';
import { guardAdminAction, type SessionExpiredCode } from './admin-action';
import type { AdminContext } from './admin-context';
import { saveDiagnosis, saveEstimatedCost, type EditCode, type EditOutcome } from './edit-diagnosis-cost';

// Composición de producción de la edición de diagnóstico y costo (CHG-11). La sesión se comprueba en CADA llamada
// (`SESSION_EXPIRED` antes de cualquier lectura o escritura) y un fallo inesperado se convierte en `INTERNAL_ERROR`
// sin detalles. `authenticate` lo aporta el adaptador de `src/app`. Nunca se registra el diagnóstico ni el costo.
type EditResult = Promise<ActionResult<EditOutcome, EditCode | SessionExpiredCode>>;

const dependencies = () => ({ store: createOrderEditStore(), now: () => new Date() });

export function saveDiagnosisAction(authenticate: () => Promise<AdminContext | null>, raw: unknown): EditResult {
  return runAction<EditOutcome, EditCode | SessionExpiredCode>(
    () => guardAdminAction(authenticate, (admin) => saveDiagnosis(admin, raw, dependencies())),
    { surface: 'admin' },
  );
}

export function saveEstimatedCostAction(authenticate: () => Promise<AdminContext | null>, raw: unknown): EditResult {
  return runAction<EditOutcome, EditCode | SessionExpiredCode>(
    () => guardAdminAction(authenticate, (admin) => saveEstimatedCost(admin, raw, dependencies())),
    { surface: 'admin' },
  );
}
