import pg from 'pg';
import { createPrismaClient } from '../../../src/infrastructure/db/client';
import type { PrismaClient } from '../../../src/infrastructure/db/generated/client.ts';
import { readTestConfig } from '../../../src/infrastructure/config/migration.ts';

// Las dos conexiones del harness (CHG-02, D-13): el rol de aplicación ejecuta lo probado; el propietario
// de la rama de pruebas solo prepara, inspecciona y reinicia (y siempre tras la guardia).

export function appPrisma(env: Readonly<Record<string, string | undefined>> = process.env): PrismaClient {
  return createPrismaClient(readTestConfig(env).testDatabaseUrl);
}

export async function appPg(env: Readonly<Record<string, string | undefined>> = process.env): Promise<pg.Client> {
  const client = new pg.Client({ connectionString: readTestConfig(env).testDatabaseUrl });
  await client.connect();
  return client;
}

export async function ownerPg(env: Readonly<Record<string, string | undefined>> = process.env): Promise<pg.Client> {
  const client = new pg.Client({ connectionString: readTestConfig(env).testDirectUrl });
  await client.connect();
  return client;
}
