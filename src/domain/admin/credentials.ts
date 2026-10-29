// Reglas puras de credenciales del administrador (CHG-08, D2). Una única función de normalización del correo
// compartida por el login y el aprovisionamiento (TD §15): `trim` + minúsculas. La contraseña NUNCA se recorta
// ni se transforma.

export const EMAIL_MAX_LENGTH = 254;
export const PASSWORD_MIN_LENGTH = 15;
export const PASSWORD_MAX_LENGTH = 128;

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+$/;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** Correo ya normalizado, con forma mínima de dirección y longitud acotada; si no, `null`. */
export function parseEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = normalizeEmail(value);
  return email.length > 0 && email.length <= EMAIL_MAX_LENGTH && EMAIL_SHAPE.test(email) ? email : null;
}

/** Longitud en caracteres Unicode (puntos de código), no en unidades UTF-16. */
export function passwordLength(value: string): number {
  return Array.from(value).length;
}

/** Login: lo vacío o de más de 128 caracteres se rechaza sin explicar la causa (D2). */
export function isLoginPasswordAcceptable(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && passwordLength(value) <= PASSWORD_MAX_LENGTH;
}

/** Política del aprovisionamiento/rotación externos: de 15 a 128 caracteres; admite espacios y Unicode. */
export function isProvisionPasswordAcceptable(value: string): boolean {
  const length = passwordLength(value);
  return length >= PASSWORD_MIN_LENGTH && length <= PASSWORD_MAX_LENGTH;
}
