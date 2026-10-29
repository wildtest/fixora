import pg from 'pg';
import { provisionAdmin } from '../../../scripts/admin-provision.ts';
import { assertTestEnvironment } from '../../integration/support/guard.ts';
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from './admin.ts';

// Antes de los E2E: guardia anti-desastre (CHG-02) → administrador ficticio en la rama `test` (CHG-08, tarea 7.2).
// Usa EXACTAMENTE el mismo aprovisionamiento que el script operativo; la cuenta solo existe en la rama de pruebas.
// Si la guardia falla, no se modifica nada. El error nombra variables, nunca valores.
export default async function setup(): Promise<void> {
  const config = await assertTestEnvironment();
  const owner = new pg.Client({ connectionString: config.testDirectUrl });
  await owner.connect();
  try {
    await provisionAdmin(owner, { email: E2E_ADMIN_EMAIL, password: E2E_ADMIN_PASSWORD });
  } finally {
    await owner.end();
  }
}
