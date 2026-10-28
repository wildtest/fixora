import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { MARKER_QUERY, GuardError, assertTestEnvironment } from './support/guard';
import { appPg, ownerPg } from './support/connections';
import { applyTestMigrations, rebuildTestSchema, resetTestDatabase, type OwnerQueryable } from './support/reset';
import { insertOrder } from './support/fixtures';

// Guardia anti-desastre, reinicio y migraciones del harness (tareas 7.1–7.6).
const marked = async () => 'test';
const unmarked = async () => null;

function fakeOwner() {
  const query = vi.fn(async () => ({ rows: [{ tablename: 'repair_orders' }] }));
  const end = vi.fn(async () => undefined);
  return { owner: { query, end } as OwnerQueryable, query, end };
}

describe('guardia: aborta ANTES de cualquier operación destructiva', () => {
  it('con las variables TEST_* ausentes', async () => {
    const { owner, query } = fakeOwner();
    await expect(resetTestDatabase({ env: {}, readMarker: marked, connectOwner: async () => owner })).rejects.toThrow(GuardError);
    expect(query).not.toHaveBeenCalled();
  });

  it('sin marcador de entorno de test', async () => {
    const { owner, query } = fakeOwner();
    await expect(
      resetTestDatabase({ env: process.env, readMarker: unmarked, connectOwner: async () => owner }),
    ).rejects.toThrow(/marcador/);
    expect(query).not.toHaveBeenCalled();
  });

  it('reconstruir el esquema y migrar se niegan a ejecutarse sin marcador', async () => {
    const { owner, query } = fakeOwner();
    await expect(
      rebuildTestSchema({ env: process.env, readMarker: unmarked, connectOwner: async () => owner }),
    ).rejects.toThrow(/marcador/);
    await expect(applyTestMigrations({ env: process.env, readMarker: unmarked })).rejects.toThrow(/marcador/);
    expect(query).not.toHaveBeenCalled();
  });

  it('si no se puede comprobar el marcador (error de conexión)', async () => {
    const { owner, query } = fakeOwner();
    const broken = async () => {
      throw new Error('canary-connection-detail');
    };
    const error = await resetTestDatabase({ env: process.env, readMarker: broken, connectOwner: async () => owner }).catch((e) => e);
    expect(error).toBeInstanceOf(GuardError);
    expect(String(error.message)).not.toContain('canary');
    expect(query).not.toHaveBeenCalled();
  });

  it('con TEST_* igual a la URL de desarrollo (DATABASE_URL o DIRECT_URL)', async () => {
    const { owner, query } = fakeOwner();
    for (const name of ['DATABASE_URL', 'DIRECT_URL']) {
      const env = { ...process.env, [name]: process.env.TEST_DIRECT_URL };
      await expect(resetTestDatabase({ env, readMarker: marked, connectOwner: async () => owner })).rejects.toThrow(/mismo destino/);
    }
    expect(query).not.toHaveBeenCalled();
  });

  it('contra una base real sin marcador (la base `postgres` de la misma rama)', async () => {
    // La base `postgres` no tiene `fixora_ops`: la comprobación real falla y la guardia aborta.
    const env = {
      ...process.env,
      TEST_DIRECT_URL: swapDatabase(process.env.TEST_DIRECT_URL as string, 'postgres'),
      TEST_DATABASE_URL: swapDatabase(process.env.TEST_DATABASE_URL as string, 'postgres'),
    };
    await expect(assertTestEnvironment(env)).rejects.toThrow(GuardError);
  });
});

function swapDatabase(value: string, database: string): string {
  const url = new URL(value);
  url.pathname = `/${database}`;
  return url.toString();
}

describe('reinicio controlado', () => {
  it('se ejecuta en la rama test marcada y vacía todas las tablas, incluidas las técnicas', async () => {
    const owner = await ownerPg();
    try {
      await insertOrder(owner);
      await owner.query(
        `INSERT INTO rate_limit_buckets (subject_key, surface, window_start, failure_count, updated_at)
         VALUES ('k', 'PUBLIC_TRACKING', now(), 1, now())`,
      );
      await resetTestDatabase();
      const counts = await owner.query(
        'SELECT (SELECT count(*)::int FROM repair_orders) AS orders, (SELECT count(*)::int FROM rate_limit_buckets) AS buckets',
      );
      expect(counts.rows[0]).toEqual({ orders: 0, buckets: 0 });
    } finally {
      await owner.end();
    }
  });

  it('el marcador existe, es de test y no se pierde tras migrate deploy', async () => {
    const owner = await ownerPg();
    try {
      expect((await owner.query(MARKER_QUERY)).rows[0]).toEqual({ value: 'test' });
      await rebuildTestSchema();
      expect((await owner.query(MARKER_QUERY)).rows[0]).toEqual({ value: 'test' });
    } finally {
      await owner.end();
    }
  });

  it('el marcador no provoca drift: Prisma solo gestiona public y migrate status sigue limpio', async () => {
    const owner = await ownerPg();
    try {
      const schemas = await owner.query("SELECT table_schema FROM information_schema.tables WHERE table_name = 'environment_marker'");
      expect(schemas.rows).toEqual([{ table_schema: 'fixora_ops' }]);
      const inPublic = await owner.query("SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'environment_marker'");
      expect(inPublic.rowCount).toBe(0);
    } finally {
      await owner.end();
    }
  });

  it('el rol de aplicación no tiene acceso al esquema del marcador', async () => {
    const app = await appPg();
    try {
      await expect(app.query(MARKER_QUERY)).rejects.toMatchObject({ code: '42501' });
    } finally {
      await app.end();
    }
  });
});

describe('proceso hijo con DATABASE_URL = TEST_DATABASE_URL (modo aplicación de pruebas)', () => {
  it('el helper destructivo NO corre dentro del hijo: la guardia aborta', () => {
    const resetModule = new URL('./support/reset.ts', import.meta.url).href;
    const script = `
      import { resetTestDatabase } from ${JSON.stringify(resetModule)};
      try { await resetTestDatabase(); console.log('RAN'); } catch (error) { console.log('ABORTED:' + error.name); }
    `;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
      env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
      encoding: 'utf8',
      cwd: fileURLToPath(new URL('../../', import.meta.url)),
    });
    expect(result.stdout.trim()).toBe('ABORTED:GuardError');
  });
});
