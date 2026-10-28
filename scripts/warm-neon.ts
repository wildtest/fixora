// Calentamiento de la rama Neon `test` antes de las pruebas (CHG-03, D-5): script propio, sin acciones de
// terceros. Reutiliza la configuración de CHG-02 (`TEST_DIRECT_URL`) y NUNCA imprime URL ni credenciales.
//   node scripts/warm-neon.ts
import pg from 'pg';
import { requireDirect, requireVariable } from '../src/infrastructure/config/database-url.ts';

// Valores por defecto para el arranque en frío de Neon; ajustables solo para las pruebas del propio script.
const ATTEMPTS = Number(process.env.WARM_NEON_ATTEMPTS ?? 6);
const PAUSE_MS = Number(process.env.WARM_NEON_PAUSE_MS ?? 5_000);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

try {
  const url = requireVariable(process.env, 'TEST_DIRECT_URL');
  requireDirect('TEST_DIRECT_URL', url);
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 30_000 });
    try {
      await client.connect();
      await client.query('SELECT 1');
      process.stdout.write(`Neon test caliente (intento ${attempt}/${ATTEMPTS}).\n`);
      await client.end();
      process.exit(0);
    } catch {
      await client.end().catch(() => undefined);
      process.stdout.write(`Neon test no respondió (intento ${attempt}/${ATTEMPTS}).\n`);
      if (attempt < ATTEMPTS) await sleep(PAUSE_MS);
    }
  }
  process.stderr.write('Neon test no respondió tras el calentamiento.\n');
  process.exit(1);
} catch (error) {
  // Solo el motivo de configuración (nombra la variable, nunca su valor).
  process.stderr.write(`${error instanceof Error ? error.message : 'Fallo de configuración.'}\n`);
  process.exit(1);
}
