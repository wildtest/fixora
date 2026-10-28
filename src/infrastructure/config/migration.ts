import {
  ConfigError,
  requireDirect,
  requirePooled,
  requireVariable,
  targetIdentity,
  type EnvSource,
} from './database-url.ts';

// Capacidades de operación: migraciones (`migration`) y entorno de pruebas (`test`). Sin `server-only` ni
// alias `@/` para que los scripts operativos las ejecuten con Node 24 nativo (CHG-02, D-14). No las importa
// el código de aplicación (regla de lint): `DIRECT_URL` es del propietario/migrador y no existe en el runtime.

export type MigrationConfig = {
  readonly directUrl: string;
  readonly shadowDatabaseUrl?: string;
};

export type TestConfig = {
  readonly testDatabaseUrl: string;
  readonly testDirectUrl: string;
};

// Guardias de la base de sombra (D-8): si alguna falla, STOP antes de ejecutar nada.
export function readMigrationConfig(env: EnvSource): MigrationConfig {
  const directUrl = requireVariable(env, 'DIRECT_URL');
  const direct = requireDirect('DIRECT_URL', directUrl);
  const shadowRaw = env.SHADOW_DATABASE_URL;
  if (shadowRaw === undefined || shadowRaw.trim() === '') return { directUrl };

  const shadow = requireDirect('SHADOW_DATABASE_URL', shadowRaw);
  if (shadowRaw === directUrl) {
    throw new ConfigError('CONFIG_INVALID', 'SHADOW_DATABASE_URL', 'no puede ser igual a DIRECT_URL');
  }
  if (shadow.database === direct.database) {
    throw new ConfigError('CONFIG_INVALID', 'SHADOW_DATABASE_URL', 'debe apuntar a una base de datos distinta');
  }
  for (const name of ['DATABASE_URL', 'TEST_DATABASE_URL', 'TEST_DIRECT_URL'] as const) {
    const other = env[name];
    if (other && other === shadowRaw) {
      throw new ConfigError('CONFIG_INVALID', 'SHADOW_DATABASE_URL', `no puede ser igual a ${name}`);
    }
  }
  return { directUrl, shadowDatabaseUrl: shadowRaw };
}

export function readTestConfig(env: EnvSource): TestConfig {
  const testDatabaseUrl = requireVariable(env, 'TEST_DATABASE_URL');
  const testDirectUrl = requireVariable(env, 'TEST_DIRECT_URL');
  const app = requirePooled('TEST_DATABASE_URL', testDatabaseUrl);
  const owner = requireDirect('TEST_DIRECT_URL', testDirectUrl);
  if (app.host.replace('-pooler', '') !== owner.host.replace('-pooler', '') || app.database !== owner.database) {
    throw new ConfigError('CONFIG_INVALID', 'TEST_DATABASE_URL', 'debe apuntar al mismo endpoint y base que TEST_DIRECT_URL');
  }
  if (targetIdentity(app) === targetIdentity(owner)) {
    throw new ConfigError('CONFIG_INVALID', 'TEST_DATABASE_URL', 'el rol de aplicación debe ser distinto del propietario');
  }
  return { testDatabaseUrl, testDirectUrl };
}
