// Aprovisiona el marcador de entorno de test (CHG-02, D-13 y tarea 7.2). Script operativo AUTÓNOMO:
// `pg` + variables de entorno, sin alias `@/`, ejecutable con Node 24 nativo:
//   node --env-file-if-exists=.env.test scripts/provision-test-marker.ts
//
// - Solo para la rama Neon `test`. Nunca se ejecuta desde pruebas, arranque ni migraciones, y nada lo autocrea.
// - Es interactivo: exige escribir la confirmación exacta.
// - El marcador vive en el esquema `fixora_ops`, ajeno a Prisma (que solo gestiona `public`); el rol de
//   aplicación no tiene acceso a él.
import { createInterface } from 'node:readline';
import pg from 'pg';
import { ConfigError, parseDatabaseUrl, requireDirect, requireVariable } from '../src/infrastructure/config/database-url.ts';

const CONFIRMATION = 'PROVISION TEST MARKER';

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

try {
  const ownerUrl = requireVariable(process.env, 'TEST_DIRECT_URL');
  const owner = requireDirect('TEST_DIRECT_URL', ownerUrl);

  // Nunca contra el destino normal de desarrollo o producción.
  for (const name of ['DATABASE_URL', 'DIRECT_URL'] as const) {
    const other = process.env[name];
    if (!other) continue;
    const parsed = parseDatabaseUrl(name, other);
    if (parsed.host.replace('-pooler', '') === owner.host && parsed.database === owner.database) {
      fail(`ABORTADO: TEST_DIRECT_URL apunta al mismo destino que ${name}.`);
    }
  }

  process.stdout.write(
    `Se creará el marcador de entorno de test en: endpoint ${owner.host.slice(0, 11)}…, base "${owner.database}", rol "${owner.user}".\n` +
      `Escribe exactamente "${CONFIRMATION}" para continuar: `,
  );
  const rl = createInterface({ input: process.stdin });
  let answer = '';
  for await (const line of rl) {
    answer = line.trim();
    break;
  }
  rl.close();
  if (answer !== CONFIRMATION) fail('ABORTADO: la confirmación no coincide. No se hizo ningún cambio.');

  const client = new pg.Client({ connectionString: ownerUrl });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query('CREATE SCHEMA IF NOT EXISTS fixora_ops');
    await client.query('REVOKE ALL ON SCHEMA fixora_ops FROM PUBLIC');
    await client.query(
      'CREATE TABLE IF NOT EXISTS fixora_ops.environment_marker (key text PRIMARY KEY, value text NOT NULL)',
    );
    await client.query('REVOKE ALL ON TABLE fixora_ops.environment_marker FROM PUBLIC');
    await client.query(
      "INSERT INTO fixora_ops.environment_marker (key, value) VALUES ('environment', 'test') ON CONFLICT (key) DO NOTHING",
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
  process.stdout.write('Marcador de entorno de test creado.\n');
} catch (error) {
  fail(error instanceof ConfigError ? error.message : 'ABORTADO: no se pudo aprovisionar el marcador.');
}
