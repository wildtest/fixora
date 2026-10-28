// Primitivas técnicas transversales de validación. Sin reglas de negocio:
// cada change funcional define sus propios campos, límites y formatos.

export type FieldErrorCode = 'REQUIRED' | 'INVALID_FORMAT' | 'TOO_LONG';

export type FieldErrors = Readonly<Record<string, FieldErrorCode>>;

export type ValidationResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly fieldErrors: FieldErrors };

export function hasNullCharacter(value: string): boolean {
  return value.includes('\u0000');
}

export function trimBusinessText(value: string): string {
  return value.trim();
}

export type TextFieldOptions = {
  readonly maxLength: number;
  readonly required?: boolean;
  // `false` para contraseñas, tokens y claves: nunca se recortan.
  readonly trim?: boolean;
};

// `maxLength` cuenta puntos de código Unicode, no unidades UTF-16.
export function validateTextField(
  field: string,
  raw: string,
  { maxLength, required = true, trim = true }: TextFieldOptions,
): ValidationResult<string> {
  if (hasNullCharacter(raw)) {
    return { ok: false, fieldErrors: { [field]: 'INVALID_FORMAT' } };
  }
  const value = trim ? trimBusinessText(raw) : raw;
  if (required && value.length === 0) {
    return { ok: false, fieldErrors: { [field]: 'REQUIRED' } };
  }
  if (Array.from(value).length > maxLength) {
    return { ok: false, fieldErrors: { [field]: 'TOO_LONG' } };
  }
  return { ok: true, value };
}
