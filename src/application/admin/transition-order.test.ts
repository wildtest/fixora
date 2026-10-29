import { describe, expect, it } from 'vitest';
import type { OrderTransitionStore, TransitionChange, TransitionSnapshot, TransitionUnit } from '../../infrastructure/admin/order-transition-store';
import { issueAdminContext } from './admin-context';
import { parseTransitionCommand, transitionOrder } from './transition-order';

// Caso de uso de la transición con un repositorio falso: precedencia, entrada hostil y ninguna escritura ante rechazos.
const admin = issueAdminContext('admin-1');
const ID = '0f8fad5b-d9cb-469f-a165-70867728950e';
const NOW = new Date('2026-10-29T10:00:00.000Z');

function setup(snapshot: TransitionSnapshot | null, applyResult: 'applied' | 'stale' = 'applied') {
  const applied: TransitionChange[] = [];
  let loads = 0;
  const unit: TransitionUnit = {
    load: async () => {
      loads += 1;
      return snapshot;
    },
    apply: async (change) => {
      applied.push(change);
      return applyResult;
    },
  };
  const store: OrderTransitionStore = { inTransaction: (work) => work(unit) };
  return { deps: { store, now: () => NOW }, applied, loads: () => loads };
}

const command = (overrides: Record<string, unknown> = {}) => ({ orderId: ID, targetStatus: 'EQUIPO_RECIBIDO', expectedVersion: 1, confirmed: false, ...overrides });
const order = (status: TransitionSnapshot['status'], version = 1, hasDiagnosisAndCost = false): TransitionSnapshot => ({ status, version, hasDiagnosisAndCost });

describe('parseTransitionCommand: entrada no confiable', () => {
  it('acepta solo orderId UUID, targetStatus del enum, expectedVersion entero ≥ 1; confirmed solo cuenta si es true', () => {
    expect(parseTransitionCommand(command({ orderId: ID.toUpperCase(), confirmed: true }))).toEqual({
      orderId: ID, targetStatus: 'EQUIPO_RECIBIDO', expectedVersion: 1, confirmed: true,
    });
    for (const confirmed of [false, 'true', 1, 'yes', null, undefined]) {
      expect(parseTransitionCommand(command({ confirmed }))?.confirmed, String(confirmed)).toBe(false);
    }
  });

  it('rechaza lo malformado sin llegar a ninguna capa inferior', () => {
    for (const bad of [
      null, undefined, 'texto', 42, [],
      command({ orderId: 'no-uuid' }), command({ orderId: '23456789BDFG' }), command({ orderId: undefined }),
      command({ targetStatus: 'NO_EXISTE' }), command({ targetStatus: "x'; DROP TABLE y;--" }), command({ targetStatus: undefined }),
      command({ expectedVersion: 0 }), command({ expectedVersion: -1 }), command({ expectedVersion: 1.5 }),
      command({ expectedVersion: '3' }), command({ expectedVersion: Number.NaN }), command({ expectedVersion: Infinity }),
    ]) {
      expect(parseTransitionCommand(bad), JSON.stringify(bad)).toBeNull();
    }
  });

  it('ignora campos desconocidos y nunca toma fromStatus ni capacidades del cliente', () => {
    const parsed = parseTransitionCommand({ ...command(), fromStatus: 'ENTREGADO', canTransition: true, nextStatus: 'ENTREGADO', admin: true });
    expect(parsed).toEqual({ orderId: ID, targetStatus: 'EQUIPO_RECIBIDO', expectedVersion: 1, confirmed: false });
    expect(Object.keys(parsed!).sort()).toEqual(['confirmed', 'expectedVersion', 'orderId', 'targetStatus']);
  });
});

describe('transitionOrder', () => {
  it('entrada inválida u orden inexistente: VALIDATION_FAILED sin escribir', async () => {
    const missing = setup(null);
    expect(await transitionOrder(admin, command(), missing.deps)).toEqual({ ok: false, code: 'VALIDATION_FAILED' });
    expect(missing.applied).toEqual([]);
    const bad = setup(order('SOLICITUD_RECIBIDA'));
    expect(await transitionOrder(admin, command({ orderId: 'x' }), bad.deps)).toEqual({ ok: false, code: 'VALIDATION_FAILED' });
    expect(bad.loads()).toBe(0); // la entrada inválida ni siquiera abre la transacción
  });

  it('transición válida sin confirmación: se aplica una sola vez con la versión esperada y el mismo instante', async () => {
    const { deps, applied } = setup(order('SOLICITUD_RECIBIDA'));
    expect(await transitionOrder(admin, command(), deps)).toEqual({ ok: true, data: { status: 'EQUIPO_RECIBIDO', version: 2 } });
    expect(applied).toEqual([{ orderId: ID, from: 'SOLICITUD_RECIBIDA', to: 'EQUIPO_RECIBIDO', expectedVersion: 1, now: NOW }]);
  });

  it('STALE_ORDER gana a las reglas del ciclo de vida: vista desactualizada con destino ya inválido', async () => {
    // La vista vio la versión 5; otra acción llevó la orden a la 6 y a CANCELADO; el destino viejo ya sería inválido.
    const { deps, applied } = setup(order('CANCELADO', 6));
    const result = await transitionOrder(admin, command({ targetStatus: 'EQUIPO_RECIBIDO', expectedVersion: 5 }), deps);
    expect(result).toEqual({ ok: false, code: 'STALE_ORDER' });
    expect(applied).toEqual([]);
  });

  it('con la misma versión, un par no permitido es TRANSITION_NOT_ALLOWED (incluidas las salidas de estados finales)', async () => {
    for (const [from, target] of [['SOLICITUD_RECIBIDA', 'ENTREGADO'], ['ENTREGADO', 'CANCELADO'], ['CANCELADO', 'SOLICITUD_RECIBIDA'], ['EN_REPARACION', 'EN_REPARACION']] as const) {
      const { deps, applied } = setup(order(from));
      expect(await transitionOrder(admin, command({ targetStatus: target, confirmed: true }), deps), `${from}>${target}`).toEqual({ ok: false, code: 'TRANSITION_NOT_ALLOWED' });
      expect(applied).toEqual([]);
    }
  });

  it('sin diagnóstico y costo no avanza a Esperando aprobación aunque se confirme; con ambos, exige confirmación', async () => {
    const blocked = setup(order('EN_DIAGNOSTICO', 3, false));
    expect(await transitionOrder(admin, command({ targetStatus: 'ESPERANDO_APROBACION', expectedVersion: 3, confirmed: true }), blocked.deps)).toEqual({
      ok: false, code: 'DIAGNOSIS_AND_COST_REQUIRED',
    });
    const ready = setup(order('EN_DIAGNOSTICO', 3, true));
    expect(await transitionOrder(admin, command({ targetStatus: 'ESPERANDO_APROBACION', expectedVersion: 3 }), ready.deps)).toEqual({ ok: false, code: 'CONFIRMATION_REQUIRED' });
    expect(blocked.applied.concat(ready.applied)).toEqual([]);
  });

  it('las cuatro confirmaciones E11 sin confirmar no escriben nada y confirmadas sí se aplican', async () => {
    const cases = [
      ['EN_DIAGNOSTICO', 'ESPERANDO_APROBACION', true],
      ['ESPERANDO_APROBACION', 'EN_REPARACION', true],
      ['EQUIPO_RECIBIDO', 'CANCELADO', false],
      ['LISTO_PARA_RECOJO', 'ENTREGADO', false],
    ] as const;
    for (const [from, target, hasData] of cases) {
      const without = setup(order(from, 4, hasData));
      expect(await transitionOrder(admin, command({ targetStatus: target, expectedVersion: 4 }), without.deps), `${from}>${target}`).toEqual({ ok: false, code: 'CONFIRMATION_REQUIRED' });
      expect(without.applied).toEqual([]);
      const confirmed = setup(order(from, 4, hasData));
      expect((await transitionOrder(admin, command({ targetStatus: target, expectedVersion: 4, confirmed: true }), confirmed.deps)).ok, `${from}>${target}`).toBe(true);
      expect(confirmed.applied).toHaveLength(1);
    }
  });

  it('la cancelación no depende del diagnóstico y costo', async () => {
    const { deps } = setup(order('EN_DIAGNOSTICO', 2, false));
    expect((await transitionOrder(admin, command({ targetStatus: 'CANCELADO', expectedVersion: 2, confirmed: true }), deps)).ok).toBe(true);
  });

  it('segunda barrera: si el UPDATE condicional no afecta filas, STALE_ORDER', async () => {
    const { deps, applied } = setup(order('SOLICITUD_RECIBIDA'), 'stale');
    expect(await transitionOrder(admin, command(), deps)).toEqual({ ok: false, code: 'STALE_ORDER' });
    expect(applied).toHaveLength(1); // se intentó, y la base de datos lo rechazó por versión
  });

  it('un fallo inesperado de la transacción se propaga (la acción lo convierte en INTERNAL_ERROR)', async () => {
    const store: OrderTransitionStore = { inTransaction: async () => Promise.reject(new Error('base caída')) };
    await expect(transitionOrder(admin, command(), { store, now: () => NOW })).rejects.toThrow('base caída');
  });
});
