// Validación estructural de URL de PostgreSQL (CHG-02, D-1). Pura y sin acceso a `process.env`.
// Los errores nombran la variable, nunca su valor: una URL de conexión contiene credenciales.

export type ConfigErrorCode = 'CONFIG_MISSING' | 'CONFIG_INVALID';

export class ConfigError extends Error {
  readonly code: ConfigErrorCode;
  readonly variable: string;

  constructor(code: ConfigErrorCode, variable: string, reason: string) {
    super(`Configuración ${code === 'CONFIG_MISSING' ? 'ausente' : 'inválida'}: ${variable} (${reason}).`);
    this.name = 'ConfigError';
    this.code = code;
    this.variable = variable;
  }
}

export type EnvSource = Readonly<Record<string, string | undefined>>;

export type ParsedDatabaseUrl = {
  readonly url: string;
  readonly host: string;
  readonly database: string;
  readonly user: string;
  readonly pooled: boolean;
};

export function requireVariable(env: EnvSource, name: string): string {
  const value = env[name];
  if (value === undefined || value.trim() === '') throw new ConfigError('CONFIG_MISSING', name, 'no definida');
  return value;
}

// TLS con `sslmode=verify-full` explícito (AV-2: `require` es hoy un alias en `pg` 8 y cambiará en `pg` 9).
export function parseDatabaseUrl(name: string, value: string): ParsedDatabaseUrl {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new ConfigError('CONFIG_INVALID', name, 'no es una URL');
  }
  if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') {
    throw new ConfigError('CONFIG_INVALID', name, 'el protocolo debe ser postgresql');
  }
  if (parsed.searchParams.get('sslmode') !== 'verify-full') {
    throw new ConfigError('CONFIG_INVALID', name, 'exige sslmode=verify-full explícito');
  }
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (database === '' || parsed.hostname === '' || parsed.username === '') {
    throw new ConfigError('CONFIG_INVALID', name, 'faltan host, usuario o base de datos');
  }
  return {
    url: value,
    host: parsed.hostname,
    database,
    user: decodeURIComponent(parsed.username),
    pooled: parsed.hostname.includes('-pooler'),
  };
}

export function requirePooled(name: string, value: string): ParsedDatabaseUrl {
  const parsed = parseDatabaseUrl(name, value);
  if (!parsed.pooled) throw new ConfigError('CONFIG_INVALID', name, 'debe ser una conexión pooled');
  return parsed;
}

export function requireDirect(name: string, value: string): ParsedDatabaseUrl {
  const parsed = parseDatabaseUrl(name, value);
  if (parsed.pooled) throw new ConfigError('CONFIG_INVALID', name, 'debe ser una conexión directa, no pooled');
  return parsed;
}

// Identidad lógica de un destino (host sin `-pooler`, base de datos y rol), para comparar URL distintas.
export function targetIdentity(parsed: ParsedDatabaseUrl): string {
  return `${parsed.host.replace('-pooler', '')}/${parsed.database}/${parsed.user}`;
}
