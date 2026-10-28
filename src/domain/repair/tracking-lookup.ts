import { isTrackingCode } from './tracking-code';

// Normalización exacta del código ingresado (TD §12, PRD E15): (1) quitar solo el espacio en blanco exterior,
// (2) convertir las letras ASCII a–z a A–Z, (3) validar longitud y alfabeto, (4) comparar exactamente.
// Sin quitar espacios o guiones interiores, sin corregir caracteres parecidos (O↔0, I/L↔1), sin completar, sin
// Unicode case folding y sin coincidencia parcial. Función propia del código de seguimiento.

const OUTER_WHITESPACE = /^[ \t\r\n]+|[ \t\r\n]+$/g;

/** Devuelve el código canónico o `null` si el texto no puede ser un código de seguimiento. */
export function normalizeTrackingCode(input: string): string | null {
  const canonical = input.replace(OUTER_WHITESPACE, '').replace(/[a-z]/g, (letter) => letter.toUpperCase());
  return isTrackingCode(canonical) ? canonical : null;
}
