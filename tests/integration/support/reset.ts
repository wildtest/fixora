import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { assertTestEnvironment, type MarkerReader } from './guard.ts';

// Operaciones destructivas del harness (CHG-02, D-13): TODAS pasan primero por la guardia y solo usan TEST_*.
// Nada de esto se ejecuta desde la aplicación, el arranque ni las migraciones.

type EnvSource = Readonly<Record<string, string | undefined>>;
export type OwnerQueryable = { query(sql: string): Promise<{ rows: { tablename: string }[] }>; end(): Promise<void> };
export type HarnessOptions = {
  readonly env?: EnvSource;
  readonly readMarker?: MarkerReader;
  readonly connectOwner?: (url: string) => Promise<OwnerQueryable>;
};

const root = fileURLToPath(new URL('../../../', import.meta.url));
const prismaCli = fileURLToPath(new URL('../../../node_modules/prisma/build/index.js', import.meta.url));

const connectDefault = async (url: string): Promise<OwnerQueryable> => {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  return client as unknown as OwnerQueryable;
};

const quote = (identifier: string) => `"${identifier.replaceAll('"', '""')}"`;

/** Vacía las tablas de aplicación (incluye sesiones, limitador e idempotencia) de la rama `test` marcada. */
export async function resetTestDatabase(options: HarnessOptions = {}): Promise<void> {
  const config = await assertTestEnvironment(options.env, options.readMarker);
  const owner = await (options.connectOwner ?? connectDefault)(config.testDirectUrl);
  try {
    const { rows } = await owner.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'",
    );
    if (rows.length > 0) {
      await owner.query(`TRUNCATE TABLE ${rows.map((row) => quote(row.tablename)).join(', ')} RESTART IDENTITY CASCADE`);
    }
  } finally {
    await owner.end();
  }
}

/** Aplica las migraciones versionadas al esquema de test (solo tras la guardia, con TEST_DIRECT_URL). */
export async function applyTestMigrations(options: HarnessOptions = {}): Promise<string> {
  const config = await assertTestEnvironment(options.env, options.readMarker);
  const result = spawnSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
    cwd: root,
    // Entorno mínimo: el CLI solo ve la conexión del propietario de pruebas.
    env: {
      PATH: process.env.PATH ?? '',
      SystemRoot: process.env.SystemRoot ?? '',
      DIRECT_URL: config.testDirectUrl,
    } as unknown as NodeJS.ProcessEnv,
    encoding: 'utf8',
  });
  const output = `${result.stdout}${result.stderr}`.replace(/postgres(ql)?:\/\/\S+/g, '<redacted>').replace(/ep-[\w.-]+/g, 'ep-<ID>');
  if (result.status !== 0) throw new Error(`migrate deploy falló:\n${output}`);
  return output;
}

/** Parte de un esquema `public` vacío y llega al esquema actual solo con migraciones. */
export async function rebuildTestSchema(options: HarnessOptions = {}): Promise<string> {
  const config = await assertTestEnvironment(options.env, options.readMarker);
  const owner = await (options.connectOwner ?? connectDefault)(config.testDirectUrl);
  try {
    await owner.query('DROP SCHEMA IF EXISTS public CASCADE');
    await owner.query('CREATE SCHEMA public');
  } finally {
    await owner.end();
  }
  return applyTestMigrations(options);
}
