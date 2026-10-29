// Dinero del costo estimado (CHG-11 D2, TD §8): primitiva PURA y exacta. El costo se representa en el dominio como
// CADENA DECIMAL CANÓNICA con exactamente dos decimales («50.00», «1250.50»); NUNCA como `number`. PEN implícito, sin
// almacenar moneda y sin máximo de negocio. Se compara con céntimos enteros (`BigInt`) y jamás se redondea.

// `BigInt(...)` y no literales `123n`: el objetivo de TypeScript del proyecto (ES2017) no admite literales BigInt.
const ZERO = BigInt(0);
const HUNDRED = BigInt(100);

const MONEY_INPUT = /^(\d+)(?:\.(\d{1,2}))?$/;

export type MoneyResult = { readonly ok: true; readonly canonical: string } | { readonly ok: false; readonly error: 'INVALID_FORMAT' };

/** Céntimos exactos de una cadena canónica o aceptada; `null` si no es un decimal válido de hasta dos decimales. */
export function moneyToCents(value: string): bigint | null {
  const match = MONEY_INPUT.exec(value);
  if (!match) return null;
  const whole = match[1]!;
  const fraction = (match[2] ?? '').padEnd(2, '0');
  return BigInt(whole) * HUNDRED + BigInt(fraction);
}

/** Forma canónica de dos decimales a partir de céntimos (`18000n → "180.00"`). */
export function centsToMoney(cents: bigint): string {
  const whole = cents / HUNDRED;
  const fraction = (cents % HUNDRED).toString().padStart(2, '0');
  return `${whole.toString()}.${fraction}`;
}

/**
 * Parseo estricto del monto introducido: dígitos con un punto decimal opcional y como máximo dos decimales; se
 * rechaza (sin redondear) lo que tenga más, la coma decimal, los separadores de miles, los símbolos de moneda, el
 * signo, los vacíos, el cero y todo lo no numérico. `50 → 50.00` y `50.5 → 50.50`.
 */
export function parseMoney(input: unknown): MoneyResult {
  if (typeof input !== 'string') return { ok: false, error: 'INVALID_FORMAT' };
  const cents = moneyToCents(input.trim());
  if (cents === null || cents <= ZERO) return { ok: false, error: 'INVALID_FORMAT' };
  return { ok: true, canonical: centsToMoney(cents) };
}

/** Igualdad por valor: «50» y «50.00» son el mismo costo. Ambos extremos deben ser cadenas decimales válidas. */
export function moneyEquals(a: string, b: string): boolean {
  const left = moneyToCents(a);
  const right = moneyToCents(b);
  return left !== null && right !== null && left === right;
}

/** Presentación: `S/ ` + dos decimales, sin separador de miles ni `Intl.NumberFormat`. */
export function formatSoles(canonical: string): string {
  const cents = moneyToCents(canonical);
  return `S/ ${cents === null ? canonical : centsToMoney(cents)}`;
}
