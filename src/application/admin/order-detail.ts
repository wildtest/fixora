import 'server-only';
import { parseOrderId, type AdminOrderDetailDTO } from '../../domain/admin/order-detail';
import { canEditBasicData, canEditDiagnosisAndCost, canManageNotes, presentTransitions } from '../../domain/repair/lifecycle';
import { createAdminOrderDetailStore, type AdminOrderDetailStore } from '../../infrastructure/admin/admin-order-detail-store';
import type { AdminContext } from './admin-context';

// Caso de uso del detalle administrativo (CHG-09b D2/D8). Recibe el `AdminContext` como prueba estructural de que la
// sesión se comprobó ANTES (la página ejecuta `requireAdmin()` primero; nunca se revela «orden no encontrada» antes
// de autorizar). Un identificador mal formado se resuelve como orden no encontrada SIN consultar la base de datos, y
// es indistinguible de un UUID válido que no corresponde a ninguna orden. Sin registros del contenido.

export type OrderDetailReader = Pick<AdminOrderDetailStore, 'findById'>;

export async function getAdminOrderDetail(
  _admin: AdminContext,
  rawId: unknown,
  store: OrderDetailReader = createAdminOrderDetailStore(),
): Promise<AdminOrderDetailDTO | null> {
  const id = parseOrderId(rawId);
  if (id === null) return null;
  const record = await store.findById(id);
  if (record === null) return null;
  const { reachedApproval, ...detail } = record;
  const hasDiagnosisAndCost = record.diagnosis !== null && record.diagnosis.trim() !== '' && record.estimatedCost !== null;
  return {
    ...detail,
    allowedTransitions: presentTransitions(record.status, hasDiagnosisAndCost),
    canEditDiagnosisAndCost: canEditDiagnosisAndCost(record.status),
    canManageNotes: canManageNotes(record.status),
    canEditBasicData: canEditBasicData(record.status),
    neverPublished: record.status === 'CANCELADO' && !reachedApproval,
  };
}
