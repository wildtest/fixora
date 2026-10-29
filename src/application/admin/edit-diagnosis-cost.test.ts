import { describe, expect, it } from 'vitest';
import type { OrderStatus } from '../../domain/repair/order-status';
import type { EditSnapshot, EditUnit, FieldChange, OrderEditStore } from '../../infrastructure/admin/order-edit-store';
import { issueAdminContext } from './admin-context';
import { saveDiagnosis, saveEstimatedCost } from './edit-diagnosis-cost';

// Edición de diagnóstico y costo con un repositorio falso: precedencia, validación, no-op y ninguna escritura ante rechazos.
const admin = issueAdminContext('admin-1');
const ID = '0f8fad5b-d9cb-469f-a165-70867728950e';
const NOW = new Date('2026-10-29T10:00:00.000Z');

function setup(snapshot: EditSnapshot | null, apply: 'applied' | 'stale' = 'applied') {
  const diagnosisWrites: FieldChange[] = [];
  const costWrites: FieldChange[] = [];
  const unit: EditUnit = {
    load: async () => snapshot,
    applyDiagnosis: async (change) => (diagnosisWrites.push(change), apply),
    applyCost: async (change) => (costWrites.push(change), apply),
  };
  const store: OrderEditStore = { inTransaction: (work) => work(unit) };
  return { deps: { store, now: () => NOW }, diagnosisWrites, costWrites };
}

const order = (status: OrderStatus, version = 3, diagnosis: string | null = null, estimatedCost: string | null = null): EditSnapshot => ({ status, version, diagnosis, estimatedCost });
const diagnosisCommand = (diagnosis: unknown, expectedVersion = 3, orderId: unknown = ID) => ({ orderId, diagnosis, expectedVersion });
const costCommand = (estimatedCost: unknown, expectedVersion = 3, orderId: unknown = ID) => ({ orderId, estimatedCost, expectedVersion });

describe('saveDiagnosis', () => {
  it('entrada técnica inválida u orden inexistente: VALIDATION_FAILED sin escribir', async () => {
    const missing = setup(null);
    expect(await saveDiagnosis(admin, diagnosisCommand('x'), missing.deps)).toEqual({ ok: false, code: 'VALIDATION_FAILED' });
    const bad = setup(order('EN_DIAGNOSTICO'));
    for (const raw of [null, 'x', diagnosisCommand('x', 0), diagnosisCommand('x', 1.5), diagnosisCommand('x', 3, 'no-uuid')]) {
      expect(await saveDiagnosis(admin, raw, bad.deps), JSON.stringify(raw)).toEqual({ ok: false, code: 'VALIDATION_FAILED' });
    }
    expect(bad.diagnosisWrites).toEqual([]);
  });

  it('crea, modifica y limpia en los tres primeros estados, con el valor anterior y el instante inyectado', async () => {
    for (const status of ['SOLICITUD_RECIBIDA', 'EQUIPO_RECIBIDO', 'EN_DIAGNOSTICO'] as const) {
      const created = setup(order(status));
      expect(await saveDiagnosis(admin, diagnosisCommand('  Placa dañada  '), created.deps), status).toEqual({ ok: true, data: { version: 4, changed: true } });
      expect(created.diagnosisWrites).toEqual([{ orderId: ID, expectedVersion: 3, previous: null, next: 'Placa dañada', now: NOW }]);
    }
    const modified = setup(order('EN_DIAGNOSTICO', 3, 'Falla leve'));
    await saveDiagnosis(admin, diagnosisCommand('Placa dañada'), modified.deps);
    expect(modified.diagnosisWrites[0]).toMatchObject({ previous: 'Falla leve', next: 'Placa dañada' });
    const cleared = setup(order('EN_DIAGNOSTICO', 3, 'Falla leve'));
    await saveDiagnosis(admin, diagnosisCommand('   '), cleared.deps);
    expect(cleared.diagnosisWrites[0]).toMatchObject({ previous: 'Falla leve', next: null });
  });

  it('un valor idéntico al vigente es un no-op: sin escritura, sin versión nueva', async () => {
    const same = setup(order('EN_DIAGNOSTICO', 3, 'Placa dañada'));
    expect(await saveDiagnosis(admin, diagnosisCommand('  Placa dañada '), same.deps)).toEqual({ ok: true, data: { version: 3, changed: false } });
    expect(same.diagnosisWrites).toEqual([]);
    const bothEmpty = setup(order('EQUIPO_RECIBIDO'));
    expect(await saveDiagnosis(admin, diagnosisCommand(''), bothEmpty.deps)).toEqual({ ok: true, data: { version: 3, changed: false } });
    expect(bothEmpty.diagnosisWrites).toEqual([]);
  });

  it('valida: más de 2000 caracteres → TOO_LONG por campo; el carácter nulo → INVALID_FORMAT; sin escribir', async () => {
    const { deps, diagnosisWrites } = setup(order('EN_DIAGNOSTICO'));
    expect(await saveDiagnosis(admin, diagnosisCommand('a'.repeat(2001)), deps)).toEqual({ ok: false, code: 'VALIDATION_FAILED', fieldErrors: { diagnosis: 'TOO_LONG' } });
    expect(await saveDiagnosis(admin, diagnosisCommand('a\u0000b'), deps)).toEqual({ ok: false, code: 'VALIDATION_FAILED', fieldErrors: { diagnosis: 'INVALID_FORMAT' } });
    expect((await saveDiagnosis(admin, diagnosisCommand('a'.repeat(2000)), deps)).ok).toBe(true);
    expect(diagnosisWrites).toHaveLength(1);
  });

  it('precedencia: STALE_ORDER antes que ORDER_CLOSED y que DIAGNOSIS_AND_COST_FROZEN', async () => {
    for (const status of ['ESPERANDO_APROBACION', 'ENTREGADO', 'CANCELADO'] as const) {
      const { deps, diagnosisWrites } = setup(order(status, 6));
      expect(await saveDiagnosis(admin, diagnosisCommand('x', 5), deps), status).toEqual({ ok: false, code: 'STALE_ORDER' });
      expect(diagnosisWrites).toEqual([]);
    }
  });

  it('con la versión vigente: congelado → DIAGNOSIS_AND_COST_FROZEN; final → ORDER_CLOSED; nunca escribe', async () => {
    for (const status of ['ESPERANDO_APROBACION', 'EN_REPARACION', 'LISTO_PARA_RECOJO'] as const) {
      const { deps, diagnosisWrites } = setup(order(status));
      expect(await saveDiagnosis(admin, diagnosisCommand('x'), deps), status).toEqual({ ok: false, code: 'DIAGNOSIS_AND_COST_FROZEN' });
      expect(diagnosisWrites).toEqual([]);
    }
    for (const status of ['ENTREGADO', 'CANCELADO'] as const) {
      const { deps, diagnosisWrites } = setup(order(status));
      expect(await saveDiagnosis(admin, diagnosisCommand('x'), deps), status).toEqual({ ok: false, code: 'ORDER_CLOSED' });
      expect(diagnosisWrites).toEqual([]);
    }
  });

  it('segunda barrera: si el UPDATE condicional afecta 0 filas, STALE_ORDER', async () => {
    const { deps } = setup(order('EN_DIAGNOSTICO'), 'stale');
    expect(await saveDiagnosis(admin, diagnosisCommand('x'), deps)).toEqual({ ok: false, code: 'STALE_ORDER' });
  });
});

describe('saveEstimatedCost', () => {
  it('canonicaliza a dos decimales y guarda la cadena exacta con el valor anterior', async () => {
    const { deps, costWrites } = setup(order('EN_DIAGNOSTICO', 3, null, '50.00'));
    expect(await saveEstimatedCost(admin, costCommand('50.5'), deps)).toEqual({ ok: true, data: { version: 4, changed: true } });
    expect(costWrites).toEqual([{ orderId: ID, expectedVersion: 3, previous: '50.00', next: '50.50', now: NOW }]);
  });

  it('rechaza cero, negativos, más de dos decimales y valores no numéricos SIN redondear ni escribir', async () => {
    const { deps, costWrites } = setup(order('EN_DIAGNOSTICO'));
    for (const bad of ['0', '0.00', '-1', '50.123', '1.005', 'abc', '5,50', 'S/ 50', 12, null, undefined, {}]) {
      expect(await saveEstimatedCost(admin, costCommand(bad), deps), String(bad)).toEqual({
        ok: false, code: 'VALIDATION_FAILED', fieldErrors: { estimatedCost: 'INVALID_FORMAT' },
      });
    }
    expect(costWrites).toEqual([]);
  });

  it('limpiar (cadena vacía) deja el costo ausente y no lo guarda como cero', async () => {
    const { deps, costWrites } = setup(order('EN_DIAGNOSTICO', 3, null, '50.00'));
    expect(await saveEstimatedCost(admin, costCommand('  '), deps)).toEqual({ ok: true, data: { version: 4, changed: true } });
    expect(costWrites[0]).toMatchObject({ previous: '50.00', next: null });
  });

  it('un costo igual por valor es un no-op («50» frente a 50.00; ausente frente a ausente)', async () => {
    const same = setup(order('EN_DIAGNOSTICO', 3, null, '50.00'));
    expect(await saveEstimatedCost(admin, costCommand('50'), same.deps)).toEqual({ ok: true, data: { version: 3, changed: false } });
    const empty = setup(order('EN_DIAGNOSTICO'));
    expect(await saveEstimatedCost(admin, costCommand(''), empty.deps)).toEqual({ ok: true, data: { version: 3, changed: false } });
    expect(same.costWrites.concat(empty.costWrites)).toEqual([]);
  });

  it('misma precedencia que el diagnóstico: STALE_ORDER, ORDER_CLOSED y DIAGNOSIS_AND_COST_FROZEN sin escribir', async () => {
    expect(await saveEstimatedCost(admin, costCommand('10', 1), setup(order('EN_REPARACION', 2)).deps)).toEqual({ ok: false, code: 'STALE_ORDER' });
    expect(await saveEstimatedCost(admin, costCommand('10'), setup(order('EN_REPARACION')).deps)).toEqual({ ok: false, code: 'DIAGNOSIS_AND_COST_FROZEN' });
    expect(await saveEstimatedCost(admin, costCommand('10'), setup(order('CANCELADO')).deps)).toEqual({ ok: false, code: 'ORDER_CLOSED' });
  });

  it('operaciones independientes: guardar el costo no toca el diagnóstico', async () => {
    const { deps, diagnosisWrites, costWrites } = setup(order('EN_DIAGNOSTICO', 3, 'Falla'));
    await saveEstimatedCost(admin, costCommand('99'), deps);
    expect(diagnosisWrites).toEqual([]);
    expect(costWrites).toHaveLength(1);
  });
});
