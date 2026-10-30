import { defineConfig, devices } from '@playwright/test';

// Smoke de infraestructura de Production (CHG-07 D9): PÚBLICO, SEGURO y NO MUTANTE contra una URL real ya
// desplegada. No levanta servidor propio. `SMOKE_BASE_URL` es obligatoria y debe ser https.
//   SMOKE_BASE_URL=https://<despliegue> npm run test:smoke
// CHG-15 reutiliza este mecanismo para la ejecución final y la evidencia de SC-20 (puede añadirle aserciones).
const baseURL = process.env.SMOKE_BASE_URL;
// Solo `https://` (despliegue real) o, para ensayar el propio smoke sin tocar Production, `http://localhost` / `http://127.0.0.1`.
if (!baseURL || !/^(https:\/\/|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$))/.test(baseURL)) {
  throw new Error('SMOKE_BASE_URL es obligatoria y debe ser una URL https (o http://localhost para ensayar el smoke).');
}

export default defineConfig({
  testDir: 'tests/smoke',
  outputDir: 'test-results-smoke',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  // Con `SMOKE_TRACKING_CODE` (secreto) no se conservan *traces* ni capturas: el código no debe quedar en ningún artefacto.
  use: process.env.SMOKE_TRACKING_CODE
    ? { baseURL, trace: 'off', screenshot: 'off', video: 'off' }
    : { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'off' },
  projects: [
    { name: 'smoke-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'smoke-mobile', use: { ...devices['Pixel 7'] } },
  ],
});
