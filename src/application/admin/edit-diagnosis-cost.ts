import { parseOrderId } from '../../domain/admin/order-detail';
import { normalizeDiagnosis } from '../../domain/repair/diagnosis';
import { canEditDiagnosisAndCost, isTerminal } from '../../domain/repair/lifecycle';
import { moneyEquals, parseMoney } from '../../domain/repair/money';
import type { OrderEditStore } from '../../infrastructure/admin/order-edit-store';
import type { ActionResult } from '../action-result';
import type { AdminContext } from './admin-context';

// Edición del diagnóstico y del costo estimado (CHG-11 D3/D4): DOS operaciones independientes (`saveDiagnosis` y
// `saveEstimatedCost`), cada una con su comando, `expectedVersion`, transacción e historial. Precedencia:
//   sesión (el guardia, antes) → entrada técnica → orden existente → versión vigente (STALE_ORDER)
//   → estado final (ORDER_CLOSED) → estado congelado (DIAGNOSIS_AND_COST_FROZEN) → validar/normalizar el valor
//   → no-op (sin escrituras) → UPDATE condicional por versión (0 filas ⇒ STALE_ORDER) → historial, en una transacción.
// Cualquier rechazo deja diagnóstico, costo, versión e historiales intactos. Sin fusión, reintento ni last-write-wins.

export type EditCode = 'VALIDATION_FAILED' | 'STALE_ORDER' | 'ORDER_CLOSED' | 'DIAGNOSIS_AND_COST_FROZEN';

export type EditOutcome = {
  /** Versión vigente tras la operación (sin cambio si fue un no-op). */
  readonly version: number;
  readonly changed: boolean;
};

export type EditDependencies = { readonly store: OrderEditStore; readonly now: () => Date };

type Result = ActionResult<EditOutcome, EditCode>;

type Technical = { readonly orderId: string; readonly expectedVersion: number; readonly value: unknown };

function parseTechnical(raw: unknown, field: 'diagnosis' | 'estimatedCost'): Technical | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const body = raw as Record<string, unknown>;
  const orderId = parseOrderId(body.orderId);
  const { expectedVersion } = body;
  if (orderId === null) return null;
  if (typeof expectedVersion !== 'number' || !Number.isSafeInteger(expectedVersion) || expectedVersion < 1) return null;
  return { orderId, expectedVersion, value: body[field] };
}

export async function saveDiagnosis(_admin: AdminContext, raw: unknown, { store, now }: EditDependencies): Promise<Result> {
  const technical = parseTechnical(raw, 'diagnosis');
  if (technical === null) return { ok: false, code: 'VALIDATION_FAILED' };
  const { orderId, expectedVersion } = technical;

  return store.inTransaction<Result>(async (unit) => {
    const current = await unit.load(orderId);
    if (current === null) return { ok: false, code: 'VALIDATION_FAILED' };
    if (current.version !== expectedVersion) return { ok: false, code: 'STALE_ORDER' };
    if (isTerminal(current.status)) return { ok: false, code: 'ORDER_CLOSED' };
    if (!canEditDiagnosisAndCost(current.status)) return { ok: false, code: 'DIAGNOSIS_AND_COST_FROZEN' };

    const normalized = normalizeDiagnosis(technical.value);
    if (!normalized.ok) return { ok: false, code: 'VALIDATION_FAILED', fieldErrors: normalized.fieldErrors };
    if (normalized.value === current.diagnosis) return { ok: true, data: { version: current.version, changed: false } };

    const applied = await unit.applyDiagnosis({ orderId, expectedVersion, previous: current.diagnosis, next: normalized.value, now: now() });
    if (applied === 'stale') return { ok: false, code: 'STALE_ORDER' };
    return { ok: true, data: { version: expectedVersion + 1, changed: true } };
  });
}

export async function saveEstimatedCost(_admin: AdminContext, raw: unknown, { store, now }: EditDependencies): Promise<Result> {
  const technical = parseTechnical(raw, 'estimatedCost');
  if (technical === null) return { ok: false, code: 'VALIDATION_FAILED' };
  const { orderId, expectedVersion } = technical;

  return store.inTransaction<Result>(async (unit) => {
    const current = await unit.load(orderId);
    if (current === null) return { ok: false, code: 'VALIDATION_FAILED' };
    if (current.version !== expectedVersion) return { ok: false, code: 'STALE_ORDER' };
    if (isTerminal(current.status)) return { ok: false, code: 'ORDER_CLOSED' };
    if (!canEditDiagnosisAndCost(current.status)) return { ok: false, code: 'DIAGNOSIS_AND_COST_FROZEN' };

    // Limpiar el costo: cadena vacía (tras recortar) ⇒ ausente. Cero y negativos NO son un costo válido.
    let next: string | null;
    if (typeof technical.value === 'string' && technical.value.trim() === '') {
      next = null;
    } else {
      const parsed = parseMoney(technical.value);
      if (!parsed.ok) return { ok: false, code: 'VALIDATION_FAILED', fieldErrors: { estimatedCost: 'INVALID_FORMAT' } };
      next = parsed.canonical;
    }
    const unchanged = next === null ? current.estimatedCost === null : current.estimatedCost !== null && moneyEquals(next, current.estimatedCost);
    if (unchanged) return { ok: true, data: { version: current.version, changed: false } };

    const applied = await unit.applyCost({ orderId, expectedVersion, previous: current.estimatedCost, next, now: now() });
    if (applied === 'stale') return { ok: false, code: 'STALE_ORDER' };
    return { ok: true, data: { version: expectedVersion + 1, changed: true } };
  });
}
