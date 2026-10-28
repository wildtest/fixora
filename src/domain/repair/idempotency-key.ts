// Clave de idempotencia del registro (TD §13): aleatoria y de alta entropía, generada en el cliente por intento.
// Solo se persiste su SHA-256. Aquí solo se valida su forma (base64url de al menos 32 caracteres).

const PATTERN = /^[A-Za-z0-9_-]{32,128}$/;

export function isIdempotencyKey(value: unknown): value is string {
  return typeof value === 'string' && PATTERN.test(value);
}
