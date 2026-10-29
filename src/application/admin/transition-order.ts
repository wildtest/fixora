import { parseOrderId } from '../../domain/admin/order-detail';
import { evaluateTransition } from '../../domain/repair/lifecycle';
import { isOrderStatus, type OrderStatus } from '../../domain/repair/order-status';
import type { OrderTransitionStore } from '../../infrastructure/admin/order-transition-store';
import type { ActionResult } from '../action-result';
import type { AdminContext } from './admin-context';

// Caso de uso de la transición de estado (CHG-10 D2–D5). Orden de evaluación (precedencia):
//   sesión (la comprueba el guardia, antes de esto) → entrada → orden existente → versión vigente (STALE_ORDER)
//   → reglas del ciclo de vida sobre ESA instantánea (par, diagnóstico y costo, confirmación) → UPDATE condicional
//   por versión (0 filas ⇒ STALE_ORDER) → evento de historial, todo en una transacción.
// `expectedVersion` es la instantánea que el administrador REVISÓ: si ya no coincide, la intención se construyó sobre
// datos obsoletos y se responde STALE_ORDER ANTES de evaluar la transición contra el estado nuevo. La comparación
// temprana NO sustituye a la segunda barrera (el UPDATE condicional). Los fallos esperados son valores tipados.

export type TransitionCode =
  | 'VALIDATION_FAILED'
  | 'STALE_ORDER'
  | 'TRANSITION_NOT_ALLOWED'
  | 'DIAGNOSIS_AND_COST_REQUIRED'
  | 'CONFIRMATION_REQUIRED';

export type TransitionCommand = {
  readonly orderId: string;
  readonly targetStatus: OrderStatus;
  readonly expectedVersion: number;
  /** Solo significa que el administrador confirmó en la interfaz: no se persiste (CHG-10 D2). */
  readonly confirmed: boolean;
};

export type TransitionOutcome = { readonly status: OrderStatus; readonly version: number };

/**
 * Parseo explícito de un cuerpo NO confiable: solo `orderId` (UUID), `targetStatus` (enum), `expectedVersion` (entero
 * ≥ 1) y `confirmed` (solo `true` cuenta). Los campos desconocidos se ignoran; nunca se acepta `fromStatus`,
 * `canTransition` ni «avanzar»: el destino es siempre explícito y el servidor carga el estado vigente.
 */
export function parseTransitionCommand(raw: unknown): TransitionCommand | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const body = raw as Record<string, unknown>;
  const orderId = parseOrderId(body.orderId);
  const { targetStatus, expectedVersion } = body;
  if (orderId === null || !isOrderStatus(targetStatus)) return null;
  if (typeof expectedVersion !== 'number' || !Number.isSafeInteger(expectedVersion) || expectedVersion < 1) return null;
  return { orderId, targetStatus, expectedVersion, confirmed: body.confirmed === true };
}

export type TransitionDependencies = {
  readonly store: OrderTransitionStore;
  readonly now: () => Date;
};

type Result = ActionResult<TransitionOutcome, TransitionCode>;

export async function transitionOrder(_admin: AdminContext, raw: unknown, { store, now }: TransitionDependencies): Promise<Result> {
  const command = parseTransitionCommand(raw);
  if (command === null) return { ok: false, code: 'VALIDATION_FAILED' };
  const { orderId, targetStatus, expectedVersion, confirmed } = command;

  return store.inTransaction<Result>(async (unit) => {
    const current = await unit.load(orderId);
    if (current === null) return { ok: false, code: 'VALIDATION_FAILED' };
    if (current.version !== expectedVersion) return { ok: false, code: 'STALE_ORDER' };

    const rejection = evaluateTransition({
      from: current.status,
      to: targetStatus,
      confirmed,
      hasDiagnosisAndCost: current.hasDiagnosisAndCost,
    });
    if (rejection !== null) return { ok: false, code: rejection };

    const applied = await unit.apply({ orderId, from: current.status, to: targetStatus, expectedVersion, now: now() });
    if (applied === 'stale') return { ok: false, code: 'STALE_ORDER' };
    return { ok: true, data: { status: targetStatus, version: expectedVersion + 1 } };
  });
}
