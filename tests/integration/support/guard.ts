import { ConfigError, parseDatabaseUrl } from '../../../src/infrastructure/config/database-url.ts';
import { readTestConfig, type TestConfig } from '../../../src/infrastructure/config/migration.ts';

// Guardia anti-desastre (CHG-02, D-13): se ejecuta ANTES de cualquier operación destructiva sobre la base de
// pruebas. Ante cualquier duda o error, aborta. No se basa en que el nombre de la base contenga «test»: la
// comprobación decisiva es el marcador explícito en un esquema ajeno a Prisma, que solo existe en la rama `test`.

export class GuardError extends Error {
  constructor(reason: string) {
    super(`Guardia de pruebas: ${reason}`);
    this.name = 'GuardError';
  }
}

export type MarkerReader = (ownerUrl: string) => Promise<string | null>;
type EnvSource = Readonly<Record<string, string | undefined>>;

export const MARKER_QUERY = "SELECT value FROM fixora_ops.environment_marker WHERE key = 'environment'";

// Lectura real del marcador con la conexión del propietario de pruebas.
export const readMarkerFromDatabase: MarkerReader = async (ownerUrl) => {
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: ownerUrl });
  try {
    await client.connect();
    const result = await client.query<{ value: string }>(MARKER_QUERY);
    return result.rows[0]?.value ?? null;
  } finally {
    await client.end().catch(() => undefined);
  }
};

function destination(name: string, value: string): string {
  const parsed = parseDatabaseUrl(name, value);
  return `${parsed.host.replace('-pooler', '')}/${parsed.database}`;
}

export async function assertTestEnvironment(
  env: EnvSource = process.env,
  readMarker: MarkerReader = readMarkerFromDatabase,
): Promise<TestConfig> {
  let config: TestConfig;
  try {
    config = readTestConfig(env);
  } catch (error) {
    throw new GuardError(error instanceof ConfigError ? error.message : 'configuración TEST_* no válida');
  }

  // TEST_* debe ser distinto de las URL normales cuando estén disponibles para el proceso.
  const testDestination = destination('TEST_DIRECT_URL', config.testDirectUrl);
  for (const name of ['DATABASE_URL', 'DIRECT_URL'] as const) {
    const normal = env[name];
    if (normal === undefined || normal.trim() === '') continue;
    let normalDestination: string;
    try {
      normalDestination = destination(name, normal);
    } catch {
      throw new GuardError(`${name} presente pero no verificable`);
    }
    if (normalDestination === testDestination) {
      throw new GuardError(`TEST_* apunta al mismo destino que ${name}`);
    }
  }

  let marker: string | null;
  try {
    marker = await readMarker(config.testDirectUrl);
  } catch {
    throw new GuardError('no se pudo comprobar el marcador de entorno de test');
  }
  if (marker !== 'test') throw new GuardError('el marcador de entorno de test no existe o no es de test');
  return config;
}
