import { describe, expect, it } from 'vitest';
import { DIAGNOSIS_MAX_LENGTH, normalizeDiagnosis } from './diagnosis';
import { canEditDiagnosisAndCost, isDiagnosisAndCostPublic } from './lifecycle';
import { centsToMoney, formatSoles, moneyEquals, moneyToCents, parseMoney } from './money';
import { ORDER_STATUSES, type OrderStatus } from './order-status';

describe('diagnóstico: normalización', () => {
  it('recorta el espacio exterior; un diagnóstico vacío o solo con espacios es ausente', () => {
    expect(normalizeDiagnosis('  Placa dañada  ')).toEqual({ ok: true, value: 'Placa dañada' });
    for (const empty of ['', '   ', '\n\t ']) expect(normalizeDiagnosis(empty)).toEqual({ ok: true, value: null });
  });

  it('el límite es de 2000 caracteres de texto medidos tras el recorte: 2000 vale, 2001 es TOO_LONG', () => {
    expect(DIAGNOSIS_MAX_LENGTH).toBe(2000);
    expect(normalizeDiagnosis('a'.repeat(2000)).ok).toBe(true);
    expect(normalizeDiagnosis(`  ${'a'.repeat(2000)}  `).ok).toBe(true); // el recorte va antes del límite
    expect(normalizeDiagnosis('a'.repeat(2001))).toEqual({ ok: false, fieldErrors: { diagnosis: 'TOO_LONG' } });
  });

  it('cuenta caracteres de texto (puntos de código), no unidades UTF-16', () => {
    expect(normalizeDiagnosis('😀'.repeat(2000)).ok).toBe(true); // 4000 unidades UTF-16
    expect(normalizeDiagnosis('😀'.repeat(2001)).ok).toBe(false);
  });

  it('rechaza el carácter nulo y los valores que no son texto', () => {
    expect(normalizeDiagnosis('hola\u0000mundo')).toEqual({ ok: false, fieldErrors: { diagnosis: 'INVALID_FORMAT' } });
    for (const bad of [undefined, null, 5, {}, ['x']]) expect(normalizeDiagnosis(bad).ok, String(bad)).toBe(false);
  });

  it('el marcado se conserva como texto literal (sin transformar ni escapar)', () => {
    const input = '<script>alert(1)</script> {{7*7}} ${x}';
    expect(normalizeDiagnosis(input)).toEqual({ ok: true, value: input });
  });
});

describe('dinero: primitiva exacta', () => {
  it('canonicaliza a exactamente dos decimales', () => {
    expect(parseMoney('50')).toEqual({ ok: true, canonical: '50.00' });
    expect(parseMoney('50.5')).toEqual({ ok: true, canonical: '50.50' });
    expect(parseMoney('50.55')).toEqual({ ok: true, canonical: '50.55' });
    expect(parseMoney(' 1250.50 ')).toEqual({ ok: true, canonical: '1250.50' });
    expect(parseMoney('007')).toEqual({ ok: true, canonical: '7.00' });
    expect(parseMoney('0.01')).toEqual({ ok: true, canonical: '0.01' });
  });

  it('rechaza más de dos decimales SIN redondear', () => {
    for (const bad of ['50.123', '1.005', '0.001', '2.999']) expect(parseMoney(bad), bad).toEqual({ ok: false, error: 'INVALID_FORMAT' });
  });

  it('rechaza cero, negativos, vacío, coma decimal, miles, símbolos de moneda y todo lo no numérico', () => {
    for (const bad of ['0', '0.00', '000', '-5', '-0.01', '+5', '', '   ', '5,50', '1,250.50', 'S/ 50', '$50', '50 soles', 'abc', '1e3', '.5', '5.', '0x10', 'Infinity', 'NaN']) {
      expect(parseMoney(bad), bad).toEqual({ ok: false, error: 'INVALID_FORMAT' });
    }
    for (const bad of [undefined, null, 50, {}, ['50']]) expect(parseMoney(bad).ok, String(bad)).toBe(false);
  });

  it('es exacta donde number fallaría (0.1 + 0.2, 1.005, montos de más de 15 dígitos significativos)', () => {
    expect(0.1 + 0.2).not.toBe(0.3); // el punto flotante falla; la primitiva no usa number
    expect(moneyToCents('0.30')).toBe(BigInt(30));
    expect(moneyToCents('0.10')! + moneyToCents('0.20')!).toBe(moneyToCents('0.30'));
    expect(parseMoney('1.00')).toEqual({ ok: true, canonical: '1.00' });
    // 18 dígitos enteros: Number los redondearía.
    expect(parseMoney('123456789012345678.90')).toEqual({ ok: true, canonical: '123456789012345678.90' });
    expect(parseMoney('9007199254740993.01')).toEqual({ ok: true, canonical: '9007199254740993.01' }); // > Number.MAX_SAFE_INTEGER
    expect(centsToMoney(BigInt(18000))).toBe('180.00');
    expect(centsToMoney(BigInt(5))).toBe('0.05');
  });

  it('la igualdad es por valor: «50» y «50.00» son el mismo costo', () => {
    expect(moneyEquals('50', '50.00')).toBe(true);
    expect(moneyEquals('50.5', '50.50')).toBe(true);
    expect(moneyEquals('50.00', '50.01')).toBe(false);
    expect(moneyEquals('x', '50.00')).toBe(false);
  });

  it('se presenta como «S/ » + dos decimales, sin separador de miles', () => {
    expect(formatSoles('180.00')).toBe('S/ 180.00');
    expect(formatSoles('1250.5')).toBe('S/ 1250.50');
    expect(formatSoles('1234567.89')).toBe('S/ 1234567.89');
  });
});

describe('editabilidad y publicación derivadas del estado', () => {
  it('diagnóstico y costo son editables solo en los tres primeros estados', () => {
    const editable = ORDER_STATUSES.filter((status) => canEditDiagnosisAndCost(status));
    expect(editable).toEqual(['SOLICITUD_RECIBIDA', 'EQUIPO_RECIBIDO', 'EN_DIAGNOSTICO']);
  });

  it('se publican desde Esperando aprobación; antes, nunca, aunque existan los valores', () => {
    const publicStates = (reached: boolean) => ORDER_STATUSES.filter((status: OrderStatus) => isDiagnosisAndCostPublic(status, reached));
    expect(publicStates(false)).toEqual(['ESPERANDO_APROBACION', 'EN_REPARACION', 'LISTO_PARA_RECOJO', 'ENTREGADO']);
    expect(publicStates(true)).toEqual(['ESPERANDO_APROBACION', 'EN_REPARACION', 'LISTO_PARA_RECOJO', 'ENTREGADO', 'CANCELADO']);
  });

  it('Cancelado se decide por el recorrido (llegó o no a Esperando aprobación), no por la presencia de valores', () => {
    expect(isDiagnosisAndCostPublic('CANCELADO', false)).toBe(false);
    expect(isDiagnosisAndCostPublic('CANCELADO', true)).toBe(true);
  });
});
