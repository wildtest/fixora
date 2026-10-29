import { describe, expect, it } from 'vitest';
import {
  ALL_STATUS_PAIRS,
  allowedTransitions,
  canCancel,
  evaluateTransition,
  isTerminal,
  isTransitionAllowed,
  presentTransitions,
  requiresConfirmation,
} from './lifecycle';
import { ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderStatus } from './order-status';

// Los 10 pares válidos de la máquina V1 (PRD §4.4). Todo lo demás se rechaza.
const VALID: ReadonlyArray<readonly [OrderStatus, OrderStatus]> = [
  ['SOLICITUD_RECIBIDA', 'EQUIPO_RECIBIDO'],
  ['SOLICITUD_RECIBIDA', 'CANCELADO'],
  ['EQUIPO_RECIBIDO', 'EN_DIAGNOSTICO'],
  ['EQUIPO_RECIBIDO', 'CANCELADO'],
  ['EN_DIAGNOSTICO', 'ESPERANDO_APROBACION'],
  ['EN_DIAGNOSTICO', 'CANCELADO'],
  ['ESPERANDO_APROBACION', 'EN_REPARACION'],
  ['ESPERANDO_APROBACION', 'CANCELADO'],
  ['EN_REPARACION', 'LISTO_PARA_RECOJO'],
  ['LISTO_PARA_RECOJO', 'ENTREGADO'],
];
const isValid = (from: OrderStatus, to: OrderStatus) => VALID.some(([f, t]) => f === from && t === to);

describe('estados', () => {
  it('existen exactamente ocho, con los nombres exactos del PRD', () => {
    expect(ORDER_STATUSES).toHaveLength(8);
    expect(Object.values(ORDER_STATUS_LABELS)).toEqual([
      'Solicitud recibida', 'Equipo recibido', 'En diagnóstico', 'Esperando aprobación', 'En reparación', 'Listo para recojo', 'Entregado', 'Cancelado',
    ]);
  });
});

describe('matriz de transiciones: barrido exhaustivo de los 64 pares', () => {
  it('hay 64 pares: 10 permitidos y 54 rechazados', () => {
    expect(ALL_STATUS_PAIRS).toHaveLength(64);
    const allowed = ALL_STATUS_PAIRS.filter(([from, to]) => isTransitionAllowed(from, to));
    expect(allowed).toHaveLength(10);
    expect(ALL_STATUS_PAIRS.length - allowed.length).toBe(54);
  });

  it.each(ALL_STATUS_PAIRS.map((pair) => [...pair]))('%s → %s se resuelve según la matriz aprobada', (from, to) => {
    const f = from as OrderStatus;
    const t = to as OrderStatus;
    expect(isTransitionAllowed(f, t)).toBe(isValid(f, t));
    const rejection = evaluateTransition({ from: f, to: t, confirmed: true, hasDiagnosisAndCost: true });
    expect(rejection === null).toBe(isValid(f, t));
    if (!isValid(f, t)) expect(rejection).toBe('TRANSITION_NOT_ALLOWED');
  });

  it('el mismo estado, los saltos, los retrocesos y la reapertura se rechazan', () => {
    expect(isTransitionAllowed('EN_REPARACION', 'EN_REPARACION')).toBe(false); // mismo estado
    expect(isTransitionAllowed('SOLICITUD_RECIBIDA', 'ENTREGADO')).toBe(false); // salto
    expect(isTransitionAllowed('EN_REPARACION', 'EN_DIAGNOSTICO')).toBe(false); // retroceso
    expect(isTransitionAllowed('CANCELADO', 'SOLICITUD_RECIBIDA')).toBe(false); // reapertura
    expect(isTransitionAllowed('ENTREGADO', 'EN_REPARACION')).toBe(false);
  });
});

describe('estados finales y cancelación', () => {
  it('Entregado y Cancelado son finales y no tienen salidas; los demás no lo son', () => {
    for (const status of ORDER_STATUSES) {
      const final = status === 'ENTREGADO' || status === 'CANCELADO';
      expect(isTerminal(status), status).toBe(final);
      if (final) expect(allowedTransitions(status)).toEqual([]);
    }
  });

  it('la cancelación solo se permite desde los cuatro primeros estados', () => {
    const cancellable = ORDER_STATUSES.filter((status) => canCancel(status));
    expect(cancellable).toEqual(['SOLICITUD_RECIBIDA', 'EQUIPO_RECIBIDO', 'EN_DIAGNOSTICO', 'ESPERANDO_APROBACION']);
  });
});

describe('confirmaciones E11', () => {
  it('se exigen SOLO en los cuatro casos: →Esperando aprobación, →En reparación, cualquier cancelación y →Entregado', () => {
    const confirming = ALL_STATUS_PAIRS.filter(([from, to]) => requiresConfirmation(from, to));
    expect(confirming.map(([from, to]) => `${from}>${to}`).sort()).toEqual(
      [
        'EN_DIAGNOSTICO>ESPERANDO_APROBACION',
        'ESPERANDO_APROBACION>EN_REPARACION',
        'LISTO_PARA_RECOJO>ENTREGADO',
        'SOLICITUD_RECIBIDA>CANCELADO',
        'EQUIPO_RECIBIDO>CANCELADO',
        'EN_DIAGNOSTICO>CANCELADO',
        'ESPERANDO_APROBACION>CANCELADO',
      ].sort(),
    );
    // Los seis avances sin confirmación.
    expect(requiresConfirmation('SOLICITUD_RECIBIDA', 'EQUIPO_RECIBIDO')).toBe(false);
    expect(requiresConfirmation('EQUIPO_RECIBIDO', 'EN_DIAGNOSTICO')).toBe(false);
    expect(requiresConfirmation('EN_REPARACION', 'LISTO_PARA_RECOJO')).toBe(false);
  });

  it('un par no permitido nunca "requiere confirmación"', () => {
    expect(requiresConfirmation('ENTREGADO', 'CANCELADO')).toBe(false);
    expect(requiresConfirmation('EN_REPARACION', 'CANCELADO')).toBe(false);
  });
});

describe('evaluateTransition: precedencia de reglas sobre la instantánea', () => {
  const base = { confirmed: true, hasDiagnosisAndCost: true } as const;

  it('el par no permitido gana a cualquier otra regla', () => {
    expect(evaluateTransition({ from: 'ENTREGADO', to: 'CANCELADO', confirmed: false, hasDiagnosisAndCost: false })).toBe('TRANSITION_NOT_ALLOWED');
  });

  it('sin diagnóstico y costo no se puede pasar a Esperando aprobación, ni siquiera confirmando', () => {
    expect(evaluateTransition({ from: 'EN_DIAGNOSTICO', to: 'ESPERANDO_APROBACION', ...base, hasDiagnosisAndCost: false })).toBe('DIAGNOSIS_AND_COST_REQUIRED');
    expect(evaluateTransition({ from: 'EN_DIAGNOSTICO', to: 'ESPERANDO_APROBACION', ...base })).toBeNull();
  });

  it('el prerrequisito se evalúa antes que la confirmación', () => {
    expect(evaluateTransition({ from: 'EN_DIAGNOSTICO', to: 'ESPERANDO_APROBACION', confirmed: false, hasDiagnosisAndCost: false })).toBe('DIAGNOSIS_AND_COST_REQUIRED');
    expect(evaluateTransition({ from: 'EN_DIAGNOSTICO', to: 'ESPERANDO_APROBACION', confirmed: false, hasDiagnosisAndCost: true })).toBe('CONFIRMATION_REQUIRED');
  });

  it('la cancelación no depende de diagnóstico y costo, pero sí de la confirmación', () => {
    expect(evaluateTransition({ from: 'EN_DIAGNOSTICO', to: 'CANCELADO', confirmed: true, hasDiagnosisAndCost: false })).toBeNull();
    expect(evaluateTransition({ from: 'EN_DIAGNOSTICO', to: 'CANCELADO', confirmed: false, hasDiagnosisAndCost: false })).toBe('CONFIRMATION_REQUIRED');
  });

  it('los avances sin confirmación E11 se aplican sin ella', () => {
    expect(evaluateTransition({ from: 'SOLICITUD_RECIBIDA', to: 'EQUIPO_RECIBIDO', confirmed: false, hasDiagnosisAndCost: false })).toBeNull();
    expect(evaluateTransition({ from: 'EN_REPARACION', to: 'LISTO_PARA_RECOJO', confirmed: false, hasDiagnosisAndCost: false })).toBeNull();
  });
});

describe('presentTransitions (indicación de presentación)', () => {
  it('avance y cancelación coexisten; el avance a Esperando aprobación aparece bloqueado y la cancelación sigue disponible', () => {
    expect(presentTransitions('EN_DIAGNOSTICO', false)).toEqual([
      { targetStatus: 'ESPERANDO_APROBACION', requiresConfirmation: true, blockedReason: 'DIAGNOSIS_AND_COST_REQUIRED' },
      { targetStatus: 'CANCELADO', requiresConfirmation: true },
    ]);
    expect(presentTransitions('EN_DIAGNOSTICO', true)).toEqual([
      { targetStatus: 'ESPERANDO_APROBACION', requiresConfirmation: true },
      { targetStatus: 'CANCELADO', requiresConfirmation: true },
    ]);
  });

  it('refleja las confirmaciones y las cancelaciones permitidas de cada estado', () => {
    expect(presentTransitions('SOLICITUD_RECIBIDA', false)).toEqual([
      { targetStatus: 'EQUIPO_RECIBIDO', requiresConfirmation: false },
      { targetStatus: 'CANCELADO', requiresConfirmation: true },
    ]);
    expect(presentTransitions('EN_REPARACION', false)).toEqual([{ targetStatus: 'LISTO_PARA_RECOJO', requiresConfirmation: false }]);
    expect(presentTransitions('LISTO_PARA_RECOJO', false)).toEqual([{ targetStatus: 'ENTREGADO', requiresConfirmation: true }]);
  });

  it('en estados finales no hay acciones', () => {
    expect(presentTransitions('ENTREGADO', true)).toEqual([]);
    expect(presentTransitions('CANCELADO', true)).toEqual([]);
  });
});
