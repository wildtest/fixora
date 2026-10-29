import { randomBytes } from 'node:crypto';
import { defineConfig, devices } from '@playwright/test';

// Base de Playwright (CHG-03, D-3). Siempre contra `next build` + `next start`, nunca `next dev`.
// El build lo hace el script `test:e2e` (un solo build por ejecución); aquí solo se levanta el servidor.
// Sin reintentos: una prueba fallida no pasa a verde por reintento. Evidencia solo ante fallo.
const PORT = 3100;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: 'tests/e2e',
  // Administrador FICTICIO en la rama `test` (CHG-08), tras la guardia anti-desastre.
  globalSetup: './tests/e2e/support/global-setup.ts',
  outputDir: 'test-results',
  fullyParallel: false,
  // Un solo worker siempre: los proyectos comparten la base de pruebas y el limitador (varias pruebas la alteran a propósito).
  workers: 1,
  retries: 0,
  forbidOnly: isCI,
  reporter: isCI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    // Suite funcional completa en escritorio; flujos públicos críticos y responsive en móvil.
    // `webkit-mobile` (TD §24, ADR-008) se difiere como ampliación futura; Firefox fuera del CI de V1.
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'chromium-mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npm run start -- --hostname 127.0.0.1 --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      // La aplicación de prueba usa SOLO la base de pruebas; nunca la de desarrollo que cargue `.env.local`.
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? '',
      DIRECT_URL: '',
      // Secreto del limitador solo para esta ejecución: el de CI viene del Environment `test`; en local es efímero.
      RATE_LIMIT_HMAC_SECRET: process.env.RATE_LIMIT_HMAC_SECRET || randomBytes(32).toString('hex'),
      NEXT_TELEMETRY_DISABLED: '1',
    },
  },
});
