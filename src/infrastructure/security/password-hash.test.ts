import { describe, expect, it } from 'vitest';
import {
  KEY_LENGTH,
  SALT_LENGTH,
  SCRYPT_PARAMS,
  dummyHash,
  encodeHash,
  hashPassword,
  parseHash,
  verifyPassword,
} from './password-hash';

// Parámetros reducidos (mínimo permitido por el parser) para que las pruebas sean rápidas; una prueba usa los reales.
const FAST = { ln: 14, r: 8, p: 1 } as const;

describe('hash de contraseña (scrypt versionado)', () => {
  it('codifica de forma versionada y autodescriptiva, sin la contraseña en claro', async () => {
    const hash = await hashPassword('contraseña-de-prueba-ficticia', FAST);
    expect(hash).toMatch(/^scrypt\$v1\$ln=14,r=8,p=1\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/);
    expect(hash).not.toContain('contraseña');
    const parsed = parseHash(hash);
    expect(parsed).toMatchObject({ ln: 14, r: 8, p: 1 });
    expect(parsed?.salt.length).toBe(SALT_LENGTH);
    expect(parsed?.key.length).toBe(KEY_LENGTH);
  });

  it('verifica la contraseña correcta y rechaza la incorrecta', async () => {
    const hash = await hashPassword('Correcta y larga 123', FAST);
    expect(await verifyPassword('Correcta y larga 123', hash)).toBe(true);
    expect(await verifyPassword('correcta y larga 123', hash)).toBe(false);
    expect(await verifyPassword('Correcta y larga 123 ', hash)).toBe(false);
    expect(await verifyPassword('', hash)).toBe(false);
  });

  it('trata la contraseña como secuencia exacta: espacios, mayúsculas y Unicode', async () => {
    const password = '  Ñandú 😀 con espacios  ';
    const hash = await hashPassword(password, FAST);
    expect(await verifyPassword(password, hash)).toBe(true);
    expect(await verifyPassword(password.trim(), hash)).toBe(false);
    expect(await verifyPassword(password.toLowerCase(), hash)).toBe(false);
  });

  it('usa una sal distinta en cada hash', async () => {
    const [a, b] = await Promise.all([hashPassword('misma-contraseña-123', FAST), hashPassword('misma-contraseña-123', FAST)]);
    expect(a).not.toBe(b);
  });

  it('los parámetros reales son N=2^17, r=8, p=1 y verifican de extremo a extremo', async () => {
    expect(SCRYPT_PARAMS).toEqual({ ln: 17, r: 8, p: 1 });
    const hash = await hashPassword('verificación con los parámetros reales', SCRYPT_PARAMS);
    expect(hash).toContain('ln=17,r=8,p=1');
    expect(await verifyPassword('verificación con los parámetros reales', hash)).toBe(true);
  });

  it('un hash mal formado o con parámetros fuera de límites nunca verifica y no lanza', async () => {
    const good = await hashPassword('x'.repeat(15), FAST);
    const [, , , salt, key] = good.split('$');
    const bad = [
      '',
      'texto-claro',
      'scrypt$v2$ln=14,r=8,p=1$' + `${salt}$${key}`,
      `scrypt$v1$ln=13,r=8,p=1$${salt}$${key}`, // coste por debajo del mínimo
      `scrypt$v1$ln=21,r=8,p=1$${salt}$${key}`, // coste por encima del máximo
      `scrypt$v1$ln=19,r=16,p=1$${salt}$${key}`, // memoria requerida fuera de límites
      `scrypt$v1$ln=14,r=0,p=1$${salt}$${key}`,
      `scrypt$v1$ln=14,r=8,p=9$${salt}$${key}`,
      `scrypt$v1$ln=14,r=8,p=1$corta$${key}`,
      `scrypt$v1$ln=14,r=8,p=1$${salt}$corta`,
      `scrypt$v1$ln=14,r=8,p=1$${salt}=$${key}`, // relleno no canónico
      good + '$extra',
      good.replace('scrypt', 'argon2'),
    ];
    for (const encoded of bad) {
      expect(parseHash(encoded), encoded).toBeNull();
      expect(await verifyPassword('x'.repeat(15), encoded), encoded).toBe(false);
    }
  });

  it('encodeHash y parseHash son inversos', () => {
    const salt = Buffer.alloc(SALT_LENGTH, 7);
    const key = Buffer.alloc(KEY_LENGTH, 9);
    const parsed = parseHash(encodeHash(FAST, salt, key));
    expect(parsed?.salt.equals(salt)).toBe(true);
    expect(parsed?.key.equals(key)).toBe(true);
  });

  it('el hash ficticio tiene los mismos parámetros que el real y nunca verifica una contraseña', async () => {
    const dummy = await dummyHash();
    expect(await dummyHash()).toBe(dummy); // una vez por proceso
    expect(parseHash(dummy)).toMatchObject(SCRYPT_PARAMS);
    expect(await verifyPassword('contraseña-de-prueba-ficticia', dummy)).toBe(false);
  });
});
