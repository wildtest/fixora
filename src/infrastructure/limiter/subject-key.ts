import { createHmac } from 'node:crypto';

// Clave de sujeto del limitador (TD §22): `HMAC(secreto dedicado, sujeto canonicalizado)`. Nunca la IP en
// claro ni un SHA-256 simple. El sujeto llega ya canonicalizado (la normalización de IP es de la Spec de
// seguridad); esta primitiva no fija prefijos IPv6.
export function subjectKey(hmacSecret: string, canonicalSubject: string): string {
  return createHmac('sha256', hmacSecret).update(canonicalSubject, 'utf8').digest('hex');
}
