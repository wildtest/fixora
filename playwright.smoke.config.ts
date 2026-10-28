import { defineConfig, devices } from '@playwright/test';

// Smoke de infraestructura de Production (CHG-07 D9): PÚBLICO, SEGURO y NO MUTANTE contra una URL real ya
// desplegada. No levanta servidor propio. `SMOKE_BASE_URL` es obligatoria y debe ser https.
//   SMOKE_BASE_URL=https://<despliegue> npm run test:smoke
// CHG-15 reutiliza este mecanismo para la ejecución final y la evidencia de SC-20 (puede añadirle aserciones).
const baseURL = process.env.SMOKE_BASE_URL;
if (!baseURL || !/^https:\/\//.test(baseURL)) {
  throw new Error('SMOKE_BASE_URL es obligatoria y debe ser una URL https (el smoke solo se ejecuta contra un despliegue real).');
}

export default defineConfig({
  testDir: 'tests/smoke',
  outputDir: 'test-results-smoke',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'off' },
  projects: [
    { name: 'smoke-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'smoke-mobile', use: { ...devices['Pixel 7'] } },
  ],
});
