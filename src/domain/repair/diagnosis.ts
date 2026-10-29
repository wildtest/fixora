import { hasNullCharacter, trimBusinessText, type FieldErrors } from '../validation/validation';

// Diagnóstico (CHG-11 D1): un único texto orientado al cliente. Normalización pura: `trim` exterior; vacío tras el `trim`
// → ausente (`null`); `U+0000` rechazado; máximo de 2000 caracteres de TEXTO (puntos de código, como las demás
// validaciones V1) medidos tras el `trim`. El contenido es siempre texto: nunca se interpreta como HTML.

export const DIAGNOSIS_MAX_LENGTH = 2000;

export type DiagnosisResult =
  | { readonly ok: true; readonly value: string | null }
  | { readonly ok: false; readonly fieldErrors: FieldErrors };

export function normalizeDiagnosis(input: unknown): DiagnosisResult {
  if (typeof input !== 'string') return { ok: false, fieldErrors: { diagnosis: 'INVALID_FORMAT' } };
  if (hasNullCharacter(input)) return { ok: false, fieldErrors: { diagnosis: 'INVALID_FORMAT' } };
  const value = trimBusinessText(input);
  if (value.length === 0) return { ok: true, value: null };
  if (Array.from(value).length > DIAGNOSIS_MAX_LENGTH) return { ok: false, fieldErrors: { diagnosis: 'TOO_LONG' } };
  return { ok: true, value };
}
