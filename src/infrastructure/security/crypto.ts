import { createHash, randomBytes, randomUUID } from 'node:crypto';

// Primitivas criptográficas del servidor (CSPRNG y SHA-256 de `node:crypto`). Nunca `Math.random`.

/** Bytes aleatorios criptográficamente seguros (fuente del código de seguimiento). */
export function secureRandomBytes(length: number): Uint8Array {
  return randomBytes(length);
}

export function newUuid(): string {
  return randomUUID();
}

/** SHA-256 en hexadecimal; de las claves de idempotencia solo se persiste esto. */
export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
