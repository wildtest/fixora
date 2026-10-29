import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { canEditBasicData } from '../../domain/repair/lifecycle';
import { ORDER_STATUSES, type OrderStatus } from '../../domain/repair/order-status';
import { validateRepairRequest } from '../../domain/repair/repair-request';
import type { BasicDataChange, BasicDataSnapshot, BasicDataUnit, OrderDataStore } from '../../infrastructure/admin/order-data-store';
import { issueAdminContext } from './admin-context';
import { saveBasicOrderData } from './edit-basic-data';

// Corrección de datos básicos con un repositorio falso: allowlist, validación del registro, precedencia, no-op y cambio efectivo.
const admin = issueAdminContext('admin-1');
const ID = '0f8fad5b-d9cb-469f-a165-70867728950e';
const NOW = new Date('2026-10-29T10:00:00.000Z');

const base = (status: OrderStatus = 'EN_DIAGNOSTICO', version = 3): BasicDataSnapshot => ({
  status,
  version,
  customerName: 'José Muñoz',
  customerPhone: '+51 999 111 222',
  customerEmail: 'jose@example.com',
  deviceType: 'LAPTOP',
  brand: 'Lenovo',
  model: 'T14',
  problemDescription: 'No enciende',
});

function setup(snapshot: BasicDataSnapshot | null, apply: 'applied' | 'stale' = 'applied') {
  const writes: BasicDataChange[] = [];
  const unit: BasicDataUnit = { load: async () => snapshot, apply: async (change) => (writes.push(change), apply) };
  const store: OrderDataStore = { inTransaction: (work) => work(unit) };
  return { deps: { store, now: () => NOW }, writes };
}

const command = (overrides: Record<string, unknown> = {}, expectedVersion: unknown = 3, orderId: unknown = ID) => ({
  orderId,
  expectedVersion,
  customerName: 'José Muñoz',
  customerPhone: '+51 999 111 222',
  customerEmail: 'jose@example.com',
  deviceType: 'LAPTOP',
  brand: 'Lenovo',
  model: 'T14',
  problemDescription: 'No enciende',
  ...overrides,
});

describe('canEditBasicData', () => {
  it('verdadero en los seis estados no finales (incluido Esperando aprobación) y falso en Entregado y Cancelado', () => {
    const expected = Object.fromEntries(ORDER_STATUSES.map((s) => [s, s !== 'ENTREGADO' && s !== 'CANCELADO']));
    expect(Object.fromEntries(ORDER_STATUSES.map((s) => [s, canEditBasicData(s)]))).toEqual(expected);
    expect(canEditBasicData('ESPERANDO_APROBACION')).toBe(true);
  });
});

describe('saveBasicOrderData — entrada técnica y allowlist', () => {
  it('entrada técnica inválida u orden inexistente: VALIDATION_FAILED sin escribir', async () => {
    expect(await saveBasicOrderData(admin, command(), setup(null).deps)).toEqual({ ok: false, code: 'VALIDATION_FAILED' });
    const s = setup(base());
    for (const raw of [null, 'x', command({}, 0), command({}, 1.5), command({}, '3'), command({}, 3, 'no-uuid'), command({ brand: 5 }), command({ model: undefined }), command({ customerEmail: null })]) {
      expect(await saveBasicOrderData(admin, raw, s.deps), JSON.stringify(raw)).toEqual({ ok: false, code: 'VALIDATION_FAILED' });
    }
    expect(s.writes).toEqual([]);
  });

  it('los campos fuera de la lista (código, estado, diagnóstico, costo, versión…) se ignoran y jamás llegan al repositorio', async () => {
    const s = setup(base());
    const result = await saveBasicOrderData(
      admin,
      command({ brand: 'Dell', trackingCode: 'HACK', status: 'ENTREGADO', diagnosis: 'x', estimatedCost: '999', version: 99, createdAt: '2000-01-01', id: 'otra' }),
      s.deps,
    );
    expect(result).toEqual({ ok: true, data: { version: 4, changed: true } });
    expect(s.writes).toHaveLength(1);
    expect(Object.keys(s.writes[0]!).sort()).toEqual(['data', 'expectedVersion', 'nameSearch', 'now', 'orderId']);
    expect(Object.keys(s.writes[0]!.data).sort()).toEqual(['brand', 'customerEmail', 'customerName', 'customerPhone', 'deviceType', 'model', 'problemDescription']);
    expect(JSON.stringify(s.writes[0])).not.toMatch(/HACK|ENTREGADO|"otra"|estimatedCost|diagnosis|trackingCode/);
  });
});

describe('saveBasicOrderData — precedencia', () => {
  it('versión obsoleta: STALE_ORDER, incluso si la orden ya es final o si no hay cambios', async () => {
    expect(await saveBasicOrderData(admin, command({ brand: 'Dell' }, 2), setup(base()).deps)).toEqual({ ok: false, code: 'STALE_ORDER' });
    expect(await saveBasicOrderData(admin, command({}, 2), setup(base('ENTREGADO')).deps)).toEqual({ ok: false, code: 'STALE_ORDER' });
    expect(await saveBasicOrderData(admin, command({}, 2), setup(base()).deps)).toEqual({ ok: false, code: 'STALE_ORDER' }); // el no-op no oculta la versión
  });

  it('estado final con la versión vigente: ORDER_CLOSED (antes de validar) y sin escritura', async () => {
    for (const status of ['ENTREGADO', 'CANCELADO'] as const) {
      const s = setup(base(status));
      expect(await saveBasicOrderData(admin, command({ brand: '' }), s.deps), status).toEqual({ ok: false, code: 'ORDER_CLOSED' });
      expect(s.writes).toEqual([]);
    }
  });

  it('los seis estados no finales admiten la corrección, también Esperando aprobación', async () => {
    for (const status of ['SOLICITUD_RECIBIDA', 'EQUIPO_RECIBIDO', 'EN_DIAGNOSTICO', 'ESPERANDO_APROBACION', 'EN_REPARACION', 'LISTO_PARA_RECOJO'] as const) {
      const s = setup(base(status));
      expect((await saveBasicOrderData(admin, command({ brand: 'Dell' }), s.deps)).ok, status).toBe(true);
    }
  });

  it('el UPDATE condicional que no afecta filas (carrera) devuelve STALE_ORDER', async () => {
    expect(await saveBasicOrderData(admin, command({ brand: 'Dell' }), setup(base(), 'stale').deps)).toEqual({ ok: false, code: 'STALE_ORDER' });
  });
});

describe('saveBasicOrderData — validación idéntica al registro', () => {
  it('rechaza lo que el registro rechaza, con los mismos códigos por campo, sin escribir', async () => {
    const cases: Array<[Record<string, unknown>, string, string]> = [
      [{ customerName: '   ' }, 'customerName', 'REQUIRED'],
      [{ customerName: 'a'.repeat(101) }, 'customerName', 'TOO_LONG'],
      [{ customerPhone: 'abc123456' }, 'customerPhone', 'INVALID_FORMAT'],
      [{ customerPhone: '123456' }, 'customerPhone', 'INVALID_FORMAT'],
      [{ customerEmail: 'sin-arroba' }, 'customerEmail', 'INVALID_FORMAT'],
      [{ deviceType: 'DRON' }, 'deviceType', 'INVALID_FORMAT'],
      [{ brand: '' }, 'brand', 'REQUIRED'],
      [{ problemDescription: 'a'.repeat(2001) }, 'problemDescription', 'TOO_LONG'],
      [{ model: 'a\u0000b' }, 'model', 'INVALID_FORMAT'],
    ];
    for (const [change, field, code] of cases) {
      const s = setup(base());
      const result = await saveBasicOrderData(admin, command(change), s.deps);
      expect(result, field).toEqual({ ok: false, code: 'VALIDATION_FAILED', fieldErrors: { [field]: code } });
      expect(s.writes).toEqual([]);
      // El registro habría dado exactamente el mismo veredicto.
      const registration = validateRepairRequest({ ...(command(change) as Record<string, string>) });
      expect(registration.ok).toBe(false);
    }
  });

  it('opcionales vacíos pasan a NULL y los espacios exteriores se recortan', async () => {
    const s = setup(base());
    await saveBasicOrderData(admin, command({ customerEmail: '  ', model: '', customerName: '  María Pérez  ' }), s.deps);
    expect(s.writes[0]!.data).toMatchObject({ customerEmail: null, model: null, customerName: 'María Pérez' });
  });

  it('el registro y la corrección importan el MISMO validador (sin reglas administrativas duplicadas)', () => {
    const registration = readFileSync('src/application/register-repair.ts', 'utf8');
    const correction = readFileSync('src/application/admin/edit-basic-data.ts', 'utf8');
    for (const source of [registration, correction]) expect(source).toContain('validateRepairRequest');
    expect(correction).toContain("domain/repair/repair-request");
    expect(correction).not.toMatch(/PHONE_CHARACTERS|EMAIL_SYNTAX|maxLength/);
  });
});

describe('saveBasicOrderData — no-op y cambio efectivo', () => {
  it('todos los valores normalizados iguales: éxito sin escritura ni versión nueva', async () => {
    const s = setup(base());
    expect(await saveBasicOrderData(admin, command({ customerName: '  José Muñoz ', brand: ' Lenovo ' }), s.deps)).toEqual({ ok: true, data: { version: 3, changed: false } });
    expect(s.writes).toEqual([]);
  });

  it('un solo campo distinto guarda la instantánea completa con una única versión nueva', async () => {
    const s = setup(base());
    expect(await saveBasicOrderData(admin, command({ model: 'T15' }), s.deps)).toEqual({ ok: true, data: { version: 4, changed: true } });
    expect(s.writes).toHaveLength(1);
    expect(s.writes[0]).toMatchObject({ orderId: ID, expectedVersion: 3, nameSearch: null, now: NOW });
    expect(s.writes[0]!.data.model).toBe('T15');
  });

  it('un cambio solo de mayúsculas del nombre es efectivo y recalcula la búsqueda; si el nombre no cambia no se reescribe', async () => {
    const cosmetic = setup(base());
    await saveBasicOrderData(admin, command({ customerName: 'JOSÉ MUÑOZ' }), cosmetic.deps);
    expect(cosmetic.writes[0]).toMatchObject({ nameSearch: 'jose munoz' });
    const renamed = setup(base());
    await saveBasicOrderData(admin, command({ customerName: 'María Pérez' }), renamed.deps);
    expect(renamed.writes[0]).toMatchObject({ nameSearch: 'maria perez' });
    const other = setup(base());
    await saveBasicOrderData(admin, command({ brand: 'Dell' }), other.deps);
    expect(other.writes[0]!.nameSearch).toBeNull();
  });
});
