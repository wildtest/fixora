import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';

// Hash de contraseña del administrador (CHG-08, D3): `scrypt` asíncrono de `node:crypto`, sal aleatoria única y
// formato versionado y autodescriptivo. Sin `server-only` ni alias `@/` para que el script de aprovisionamiento
// lo ejecute con Node 24 nativo y use EXACTAMENTE el mismo hasheador que el login.
//
//   scrypt$v1$ln=17,r=8,p=1$<sal base64url>$<clave derivada base64url>
//
// Parámetros: N = 2^17, r = 8, p = 1 (configuración recomendada por OWASP), medidos en Node 24 (≈ 275 ms y
// ≈ 128 MiB por verificación); `maxmem` deja el doble de lo que scrypt necesita (Node rechaza por defecto
// por encima de 32 MiB, valor que NO es una decisión de seguridad). Nunca se guarda ni compara texto claro.

export const SCRYPT_PARAMS = { ln: 17, r: 8, p: 1 } as const;
export const KEY_LENGTH = 32;
export const SALT_LENGTH = 16;

const FORMAT = /^scrypt\$v1\$ln=(\d{1,2}),r=(\d{1,2}),p=(\d{1,2})\$([A-Za-z0-9_-]+)\$([A-Za-z0-9_-]+)$/;
const MAX_REQUIRED_MEMORY = 256 * 2 ** 20;

export type ScryptParams = { readonly ln: number; readonly r: number; readonly p: number };
export type ParsedHash = ScryptParams & { readonly salt: Buffer; readonly key: Buffer };

const requiredMemory = ({ ln, r }: ScryptParams): number => 128 * 2 ** ln * r;

function deriveKey(password: string, salt: Buffer, params: ScryptParams, keyLength: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      keyLength,
      { N: 2 ** params.ln, r: params.r, p: params.p, maxmem: 2 * requiredMemory(params) + 2 ** 20 },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}

/** Parser estricto: cualquier hash mal formado o con parámetros fuera de límites devuelve `null`. */
export function parseHash(encoded: string): ParsedHash | null {
  const match = FORMAT.exec(encoded);
  if (!match) return null;
  const [ln, r, p] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (ln < 14 || ln > 20 || r < 1 || r > 16 || p < 1 || p > 4) return null;
  if (requiredMemory({ ln, r, p }) > MAX_REQUIRED_MEMORY) return null;
  const salt = Buffer.from(match[4]!, 'base64url');
  const key = Buffer.from(match[5]!, 'base64url');
  if (salt.length < SALT_LENGTH || salt.length > 64 || key.length < 32 || key.length > 64) return null;
  // Canónico: la codificación debe ser la que produciría este mismo contenido.
  if (salt.toString('base64url') !== match[4] || key.toString('base64url') !== match[5]) return null;
  return { ln, r, p, salt, key };
}

export function encodeHash(params: ScryptParams, salt: Buffer, key: Buffer): string {
  return `scrypt$v1$ln=${params.ln},r=${params.r},p=${params.p}$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

export async function hashPassword(password: string, params: ScryptParams = SCRYPT_PARAMS): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  return encodeHash(params, salt, await deriveKey(password, salt, params, KEY_LENGTH));
}

/** Verifica con comparación de tiempo constante. Un hash mal formado nunca verifica (y no lanza). */
export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const parsed = parseHash(encoded);
  if (parsed === null) return false;
  const candidate = await deriveKey(password, parsed.salt, parsed, parsed.key.length);
  return timingSafeEqual(candidate, parsed.key);
}

let dummy: Promise<string> | undefined;

/**
 * Hash ficticio de parámetros equivalentes (D4): se verifica cuando el correo no existe para recorrer el mismo
 * trabajo que una cuenta real. Se genera una vez por proceso con una contraseña aleatoria que nadie conoce.
 */
export function dummyHash(): Promise<string> {
  dummy ??= hashPassword(randomBytes(24).toString('base64url'));
  return dummy;
}
