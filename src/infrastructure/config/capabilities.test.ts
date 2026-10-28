import { describe, expect, it } from 'vitest';
import { readDatabaseConfig, readLimiterConfig } from './capabilities';
import { ConfigError } from './database-url';
import { readMigrationConfig, readTestConfig } from './migration';

const CANARY = 'canary-password-9f3a';
const url = (host: string, db: string, user = 'app') =>
  `postgresql://${user}:${CANARY}@${host}/${db}?sslmode=verify-full`;
const POOLED = 'ep-abc-pooler.region.aws.neon.tech';
const DIRECT = 'ep-abc.region.aws.neon.tech';

function thrown(fn: () => unknown): ConfigError {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(ConfigError);
    return error as ConfigError;
  }
  throw new Error('no lanzó');
}

describe('importar la configuración no exige variables (perezosa)', () => {
  it('las capacidades solo se evalúan al invocarlas', () => {
    expect(() => readDatabaseConfig({})).toThrow(ConfigError);
    expect(() => readLimiterConfig({})).toThrow(ConfigError);
    expect(() => readMigrationConfig({})).toThrow(ConfigError);
    expect(() => readTestConfig({})).toThrow(ConfigError);
  });
});

describe('capacidad database', () => {
  it('falla de forma segura si falta DATABASE_URL y no busca credenciales alternativas', () => {
    const error = thrown(() => readDatabaseConfig({ DIRECT_URL: url(DIRECT, 'neondb'), TEST_DATABASE_URL: url(POOLED, 'x') }));
    expect(error.code).toBe('CONFIG_MISSING');
    expect(error.variable).toBe('DATABASE_URL');
  });

  it('acepta una URL pooled con verify-full', () => {
    expect(readDatabaseConfig({ DATABASE_URL: url(POOLED, 'neondb') }).databaseUrl).toContain('-pooler');
  });

  it.each([
    ['conexión directa', url(DIRECT, 'neondb')],
    ['sslmode=require', `postgresql://a:${CANARY}@${POOLED}/db?sslmode=require`],
    ['sin sslmode', `postgresql://a:${CANARY}@${POOLED}/db`],
    ['protocolo ajeno', `mysql://a:${CANARY}@${POOLED}/db?sslmode=verify-full`],
    ['no es URL', `${CANARY} esto no es una url`],
  ])('rechaza %s sin revelar el valor', (_name, value) => {
    const error = thrown(() => readDatabaseConfig({ DATABASE_URL: value }));
    expect(error.code).toBe('CONFIG_INVALID');
    expect(error.message).not.toContain(CANARY);
    expect(JSON.stringify(error)).not.toContain(CANARY);
    expect(String(error.stack)).not.toContain(CANARY);
  });
});

describe('capacidad limiter', () => {
  it('exige un secreto dedicado de longitud suficiente', () => {
    expect(thrown(() => readLimiterConfig({})).code).toBe('CONFIG_MISSING');
    const short = thrown(() => readLimiterConfig({ RATE_LIMIT_HMAC_SECRET: CANARY }));
    expect(short.code).toBe('CONFIG_INVALID');
    expect(short.message).not.toContain(CANARY);
    expect(readLimiterConfig({ RATE_LIMIT_HMAC_SECRET: 'x'.repeat(32) }).hmacSecret).toHaveLength(32);
  });
});

describe('capacidad migration y guardias de la base de sombra (D-8)', () => {
  const direct = url(DIRECT, 'neondb', 'owner');

  it('sin SHADOW_DATABASE_URL solo devuelve DIRECT_URL', () => {
    expect(readMigrationConfig({ DIRECT_URL: direct })).toEqual({ directUrl: direct });
  });

  it('acepta una base de sombra distinta del mismo endpoint directo', () => {
    const shadow = url(DIRECT, 'fixora_shadow', 'owner');
    expect(readMigrationConfig({ DIRECT_URL: direct, SHADOW_DATABASE_URL: shadow }).shadowDatabaseUrl).toBe(shadow);
  });

  it.each([
    ['igual a DIRECT_URL', direct],
    ['misma base de datos que el target', url(DIRECT, 'neondb', 'otro')],
    ['conexión pooled', url(POOLED, 'fixora_shadow', 'owner')],
  ])('PARA si la sombra es %s', (_name, shadow) => {
    const error = thrown(() => readMigrationConfig({ DIRECT_URL: direct, SHADOW_DATABASE_URL: shadow }));
    expect(error.variable).toBe('SHADOW_DATABASE_URL');
    expect(error.message).not.toContain(CANARY);
  });

  it.each(['DATABASE_URL', 'TEST_DATABASE_URL', 'TEST_DIRECT_URL'])('PARA si la sombra coincide con %s', (name) => {
    const shadow = url(DIRECT, 'fixora_shadow', 'owner');
    expect(() => readMigrationConfig({ DIRECT_URL: direct, SHADOW_DATABASE_URL: shadow, [name]: shadow })).toThrow(
      ConfigError,
    );
  });

  it('DIRECT_URL no puede ser pooled', () => {
    expect(thrown(() => readMigrationConfig({ DIRECT_URL: url(POOLED, 'neondb', 'owner') })).variable).toBe('DIRECT_URL');
  });
});

describe('capacidad test', () => {
  const testApp = url(POOLED, 'neondb', 'fixora_app');
  const testOwner = url(DIRECT, 'neondb', 'neondb_owner');

  it('acepta rol de aplicación pooled y propietario directo del mismo endpoint', () => {
    expect(readTestConfig({ TEST_DATABASE_URL: testApp, TEST_DIRECT_URL: testOwner })).toEqual({
      testDatabaseUrl: testApp,
      testDirectUrl: testOwner,
    });
  });

  it('rechaza el mismo rol en ambas conexiones y endpoints distintos', () => {
    expect(() => readTestConfig({ TEST_DATABASE_URL: url(POOLED, 'neondb', 'neondb_owner'), TEST_DIRECT_URL: testOwner })).toThrow(
      ConfigError,
    );
    expect(() =>
      readTestConfig({ TEST_DATABASE_URL: url('ep-otro-pooler.region.aws.neon.tech', 'neondb', 'fixora_app'), TEST_DIRECT_URL: testOwner }),
    ).toThrow(ConfigError);
  });
});
