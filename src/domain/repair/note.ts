import { hasNullCharacter, trimBusinessText, type FieldErrors } from '../validation/validation';

// Notas de una orden (CHG-12 D1): dos visibilidades CERRADAS e inmutables tras crear (para corregirla se elimina la nota y
// se crea otra). Validación pura del contenido: `trim` exterior; vacío tras el `trim` → `REQUIRED` (a diferencia del
// diagnóstico NO equivale a ausente: nunca se almacena una fila vacía); `U+0000` rechazado; máximo de 2000 caracteres de
// TEXTO (puntos de código, como las demás validaciones V1) medidos tras el `trim`, para ambas visibilidades. El contenido
// es siempre texto: nunca se interpreta como HTML ni Markdown.

export const NOTE_VISIBILITIES = ['PUBLIC', 'INTERNAL'] as const;
export type NoteVisibility = (typeof NOTE_VISIBILITIES)[number];

export const NOTE_MAX_LENGTH = 2000;

export function isNoteVisibility(value: unknown): value is NoteVisibility {
  return typeof value === 'string' && (NOTE_VISIBILITIES as readonly string[]).includes(value);
}

export type NoteContentResult =
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly fieldErrors: FieldErrors };

export function normalizeNoteContent(input: unknown): NoteContentResult {
  if (typeof input !== 'string') return { ok: false, fieldErrors: { content: 'REQUIRED' } };
  if (hasNullCharacter(input)) return { ok: false, fieldErrors: { content: 'INVALID_FORMAT' } };
  const value = trimBusinessText(input);
  if (value.length === 0) return { ok: false, fieldErrors: { content: 'REQUIRED' } };
  if (Array.from(value).length > NOTE_MAX_LENGTH) return { ok: false, fieldErrors: { content: 'TOO_LONG' } };
  return { ok: true, value };
}

/** Nota para el administrador (los ids y las versiones nunca llegan al HTML público). */
export type AdminNote = {
  readonly id: string;
  /** Control técnico de concurrencia de la nota: no es historial ni se muestra. */
  readonly version: number;
  readonly content: string;
  /** ISO 8601 UTC; la interfaz lo presenta en `America/Lima`. */
  readonly createdAt: string;
};

/** Nota pública (lista positiva): sin id, versión, visibilidad, `updated_at` ni `order_id`. */
export type PublicNote = {
  readonly content: string;
  readonly createdAt: string;
};
