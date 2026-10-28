import { describe, expect, it } from 'vitest';
import { verifyRuntimePrivileges } from '../../scripts/verify-runtime-privileges.ts';
import { appPg, ownerPg } from './support/connections';

// Verificación de privilegios del rol runtime por catálogo (CHG-07 D8) sobre PostgreSQL real.
describe('verifyRuntimePrivileges contra la rama test', () => {
  it('el rol de aplicación es conforme: sin DDL, sin DELETE de órdenes, historiales append-only, sin secuencias', async () => {
    const app = await appPg();
    try {
      expect(await verifyRuntimePrivileges(app)).toEqual([]);
    } finally {
      await app.end();
    }
  });

  it('la verificación SÍ detecta un rol no conforme (el propietario/migrador no pasa como runtime)', async () => {
    const owner = await ownerPg();
    try {
      const problems = (await verifyRuntimePrivileges(owner)).join('\n');
      expect(problems).toMatch(/DELETE|DDL|atributos elevados|neon_superuser/);
    } finally {
      await owner.end();
    }
  });
});
