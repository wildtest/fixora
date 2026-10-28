import 'server-only';
import { ConfigError, requirePooled, requireVariable, type EnvSource } from './database-url';

// Capacidades de configuración que usa la aplicación (CHG-02, D-12). Se evalúan de forma perezosa, al usar
// la capacidad: importar este módulo nunca lee ni exige variables, de modo que `build` y un Preview compilan
// sin secretos. Una capacidad sin configuración falla de forma segura y no busca credenciales alternativas.
// `DIRECT_URL` no pertenece al código de aplicación: ver `migration.ts`.

export type DatabaseConfig = { readonly databaseUrl: string };
export type LimiterConfig = { readonly hmacSecret: string };

const MIN_HMAC_SECRET_LENGTH = 32;

export function readDatabaseConfig(env: EnvSource = process.env): DatabaseConfig {
  const databaseUrl = requireVariable(env, 'DATABASE_URL');
  requirePooled('DATABASE_URL', databaseUrl);
  return { databaseUrl };
}

export function readLimiterConfig(env: EnvSource = process.env): LimiterConfig {
  const hmacSecret = requireVariable(env, 'RATE_LIMIT_HMAC_SECRET');
  if (hmacSecret.length < MIN_HMAC_SECRET_LENGTH) {
    throw new ConfigError('CONFIG_INVALID', 'RATE_LIMIT_HMAC_SECRET', `longitud mínima de ${MIN_HMAC_SECRET_LENGTH}`);
  }
  return { hmacSecret };
}
