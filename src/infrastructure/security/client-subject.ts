// Sujeto del limitador (TD §22): el origen del cliente tal como lo publica la plataforma. En Vercel, la cabecera
// documentada `x-vercel-forwarded-for` (la plataforma la establece; el código de negocio nunca lee
// `X-Forwarded-For` arbitrario). La acción lee las cabeceras del framework y pasa el valor aquí.
//
// La normalización de IPv6 y la canonicalización por prefijo siguen DIFERIDAS a la Spec de seguridad (no se fija
// `/64`): hoy solo se recorta y se pasa a minúsculas. El sujeto nunca se almacena en claro: el limitador guarda
// únicamente su HMAC.

const MAX_SUBJECT_LENGTH = 64;
/** Sujeto compartido cuando la plataforma no informa el origen (desarrollo local): ante la duda, todos juntos. */
export const UNKNOWN_SUBJECT = 'unknown';

export function clientSubject(forwardedFor: string | null | undefined): string {
  const first = forwardedFor?.split(',')[0]?.trim().toLowerCase() ?? '';
  return first.length > 0 && first.length <= MAX_SUBJECT_LENGTH ? first : UNKNOWN_SUBJECT;
}
