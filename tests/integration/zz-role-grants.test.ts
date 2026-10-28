import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type pg from 'pg';
import { ownerPg } from './support/connections';
import { rebuildTestSchema } from './support/reset';

// Los GRANT de la migración fallan de forma EXPLÍCITA si el rol de aplicación no existe (tarea 5.3).
// Se hace en la rama `test` marcada renombrando el rol un instante; siempre se restaura y se reconstruye.
// Nombre `zz-…` para que corra el último; aun así el propio test restaura el estado.
let owner: pg.Client;

beforeAll(async () => {
  owner = await ownerPg();
});
afterAll(async () => {
  await owner.end();
});

describe('migrate deploy con y sin el rol de aplicación', () => {
  it('sin el rol: falla con un mensaje explícito; con el rol: se aplica', async () => {
    await owner.query('ALTER ROLE fixora_app RENAME TO fixora_app_ausente');
    let failure: unknown;
    try {
      await rebuildTestSchema();
    } catch (error) {
      failure = error;
    } finally {
      await owner.query('ALTER ROLE fixora_app_ausente RENAME TO fixora_app');
    }
    expect(String(failure)).toContain('El rol de aplicación fixora_app no existe');

    // Con el rol creado vuelve a migrar y deja el esquema listo para el resto de la suite.
    const output = await rebuildTestSchema();
    expect(output).toMatch(/migration\(s\) have been applied|Applying migration/);
    const grants = await owner.query("SELECT has_table_privilege('fixora_app', 'public.repair_orders', 'SELECT') AS ok");
    expect(grants.rows[0].ok).toBe(true);
  });
});
