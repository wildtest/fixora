import { ORDER_STATUSES, type OrderStatus } from './order-status';

// Máquina de estados V1 (PRD §4.4 y §4.8, TD §7.2/§7.3, CHG-10 D1): UNA tabla declarativa y funciones puras. Ocho
// estados, DIEZ transiciones válidas; las otras 54 combinaciones de los 64 pares se rechazan (saltos, retrocesos,
// reapertura, mismo estado y salidas de un estado final). Sin XState y sin copias de estas reglas en React, en la
// Server Action ni en el repositorio: la interfaz consume `presentTransitions` y el servidor lo recalcula todo.

export const TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  SOLICITUD_RECIBIDA: ['EQUIPO_RECIBIDO', 'CANCELADO'],
  EQUIPO_RECIBIDO: ['EN_DIAGNOSTICO', 'CANCELADO'],
  EN_DIAGNOSTICO: ['ESPERANDO_APROBACION', 'CANCELADO'],
  ESPERANDO_APROBACION: ['EN_REPARACION', 'CANCELADO'],
  EN_REPARACION: ['LISTO_PARA_RECOJO'],
  LISTO_PARA_RECOJO: ['ENTREGADO'],
  ENTREGADO: [],
  CANCELADO: [],
};

export function allowedTransitions(from: OrderStatus): readonly OrderStatus[] {
  return TRANSITIONS[from];
}

export function isTransitionAllowed(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Estados finales (`SC-09`): sin transiciones de salida; una orden final no se reabre ni se revierte. */
export function isTerminal(status: OrderStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

/** La cancelación solo se permite desde los cuatro primeros estados y es irreversible. */
export function canCancel(from: OrderStatus): boolean {
  return isTransitionAllowed(from, 'CANCELADO');
}

/**
 * Las cuatro confirmaciones `E11` (PRD §7.3): →Esperando aprobación, →En reparación, cualquier cancelación permitida
 * y →Entregado. Solo se pide confirmación para un par PERMITIDO; el resto de avances no la exige.
 */
export function requiresConfirmation(from: OrderStatus, to: OrderStatus): boolean {
  if (!isTransitionAllowed(from, to)) return false;
  return (
    to === 'CANCELADO' ||
    (from === 'EN_DIAGNOSTICO' && to === 'ESPERANDO_APROBACION') ||
    (from === 'ESPERANDO_APROBACION' && to === 'EN_REPARACION') ||
    (from === 'LISTO_PARA_RECOJO' && to === 'ENTREGADO')
  );
}

/** `EN_DIAGNOSTICO → ESPERANDO_APROBACION` exige diagnóstico y costo estimado (`SC-07`). */
export function requiresDiagnosisAndCost(from: OrderStatus, to: OrderStatus): boolean {
  return from === 'EN_DIAGNOSTICO' && to === 'ESPERANDO_APROBACION';
}

export type LifecycleRejection = 'TRANSITION_NOT_ALLOWED' | 'DIAGNOSIS_AND_COST_REQUIRED' | 'CONFIRMATION_REQUIRED';

/**
 * Reglas del ciclo de vida sobre la instantánea vigente (el orden fino de CHG-10 D3): primero el par permitido; luego
 * el prerrequisito de diagnóstico y costo; luego la confirmación `E11`. `null` = el cambio puede aplicarse. Si la
 * presencia de diagnóstico y costo no puede comprobarse, el llamador pasa `false` (seguro por defecto).
 */
export function evaluateTransition(input: {
  readonly from: OrderStatus;
  readonly to: OrderStatus;
  readonly confirmed: boolean;
  readonly hasDiagnosisAndCost: boolean;
}): LifecycleRejection | null {
  const { from, to, confirmed, hasDiagnosisAndCost } = input;
  if (!isTransitionAllowed(from, to)) return 'TRANSITION_NOT_ALLOWED';
  if (requiresDiagnosisAndCost(from, to) && !hasDiagnosisAndCost) return 'DIAGNOSIS_AND_COST_REQUIRED';
  if (requiresConfirmation(from, to) && !confirmed) return 'CONFIRMATION_REQUIRED';
  return null;
}

/** Indicación de presentación (nunca autoridad): lo que la interfaz puede ofrecer para el estado actual. */
export type AllowedTransition = {
  readonly targetStatus: OrderStatus;
  readonly requiresConfirmation: boolean;
  /** Solo cuando la interfaz necesita explicar por qué el avance no está disponible. */
  readonly blockedReason?: 'DIAGNOSIS_AND_COST_REQUIRED';
};

export function presentTransitions(status: OrderStatus, hasDiagnosisAndCost: boolean): readonly AllowedTransition[] {
  return allowedTransitions(status).map((targetStatus) => ({
    targetStatus,
    requiresConfirmation: requiresConfirmation(status, targetStatus),
    ...(requiresDiagnosisAndCost(status, targetStatus) && !hasDiagnosisAndCost
      ? { blockedReason: 'DIAGNOSIS_AND_COST_REQUIRED' as const }
      : {}),
  }));
}

export const ALL_STATUS_PAIRS: readonly (readonly [OrderStatus, OrderStatus])[] = ORDER_STATUSES.flatMap((from) =>
  ORDER_STATUSES.map((to) => [from, to] as const),
);

/**
 * Diagnóstico y costo son editables SOLO en los tres primeros estados (CHG-11 D4). Desde Esperando aprobación quedan
 * congelados y en Entregado/Cancelado son de solo lectura. La interfaz lo usa como indicación; el servidor lo recalcula.
 */
export function canEditDiagnosisAndCost(status: OrderStatus): boolean {
  return status === 'SOLICITUD_RECIBIDA' || status === 'EQUIPO_RECIBIDO' || status === 'EN_DIAGNOSTICO';
}

/**
 * ¿Se publican al cliente el diagnóstico y el costo? (CHG-11 D6): se derivan del ESTADO, nunca de que los valores
 * existan. Públicos en Esperando aprobación, En reparación, Listo para recojo y Entregado; en Cancelado solo si la orden
 * llegó alguna vez a Esperando aprobación (`reachedApproval`, decidido por el recorrido real de la orden).
 */
export function isDiagnosisAndCostPublic(status: OrderStatus, reachedApproval: boolean): boolean {
  if (status === 'CANCELADO') return reachedApproval;
  return status === 'ESPERANDO_APROBACION' || status === 'EN_REPARACION' || status === 'LISTO_PARA_RECOJO' || status === 'ENTREGADO';
}

/**
 * Las notas se gestionan (crear, editar, eliminar) en los seis estados NO finales y son de solo lectura en Entregado y
 * Cancelado (CHG-12 D1). NO se aplican a las notas las reglas de congelamiento de diagnóstico y costo. La interfaz lo usa
 * como indicación; el servidor lo recalcula dentro de la transacción protegida por el bloqueo de la fila de la orden.
 */
export function canManageNotes(status: OrderStatus): boolean {
  return !isTerminal(status);
}

/**
 * ¿Pueden corregirse los datos básicos (CHG-13 D4)? En los seis estados no finales, incluido Esperando aprobación; nunca en
 * Entregado ni Cancelado. NO se aplica el congelamiento de diagnóstico y costo. La interfaz lo usa como indicación; el
 * servidor lo recalcula con la orden vigente en cada guardado.
 */
export function canEditBasicData(status: OrderStatus): boolean {
  return !isTerminal(status);
}
