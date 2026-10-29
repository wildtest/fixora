import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// Orquestación global de pruebas (CHG-03, D-1). Dos proyectos de Vitest; E2E vive en Playwright.
//   unit        → rápido y paralelo; sin base de datos.
//   integration → PostgreSQL real en la rama Neon `test`; SERIAL (una sola base compartida). Su globalSetup
//                 invoca la guardia anti-desastre y la preparación de migraciones de CHG-02 (no se reimplementan).
export default defineConfig({
  test: {
    projects: [
      {
        extends: false,
        resolve: {
          alias: {
            '@': fromRoot('./src'),
            'server-only': fromRoot('./tests/stubs/server-only.ts'),
          },
        },
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.{ts,tsx}', 'tests/tooling/**/*.test.ts', 'tests/trace/**/*.test.ts'],
          // Las pruebas de herramientas lanzan procesos (CLI de Prisma, scripts de CI) que, bajo carga, pueden
          // superar los 5 s por defecto sin que haya un fallo real.
          testTimeout: 30_000,
        },
      },
      {
        extends: false,
        resolve: {
          alias: {
            '@': fromRoot('./src'),
            'server-only': fromRoot('./tests/stubs/server-only.ts'),
          },
        },
        test: {
          name: 'integration',
          environment: 'node',
          include: ['tests/integration/**/*.test.ts'],
          globalSetup: ['tests/integration/support/global-setup.ts'],
          fileParallelism: false,
          maxWorkers: 1,
          // Arranque en frío de Neon: tiempos de espera generosos (los reintentos no ocultan fallos).
          testTimeout: 60_000,
          hookTimeout: 180_000,
        },
      },
      {
        // `seed:demo` (CHG-15 D10): proyecto explícito, fuera de `unit` e `integration`; no se ejecuta en CI ni en build.
        extends: false,
        resolve: {
          alias: {
            '@': fromRoot('./src'),
            'server-only': fromRoot('./tests/stubs/server-only.ts'),
          },
        },
        test: {
          name: 'seed',
          environment: 'node',
          include: ['scripts/seed/**/*.seed.ts'],
          testTimeout: 180_000,
        },
      },
    ],
    // Cobertura V8 SELECTIVA (D-2): umbral de 90 % de líneas y de ramas únicamente sobre `domain/` y los módulos
    // puros que se añadan a esta lista por revisión de PR. Sin umbral global ni en UI, Next, `infrastructure/`,
    // Prisma, código generado ni configuración. La trazabilidad (`test:trace`) es una compuerta distinta.
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      reportsDirectory: 'coverage',
      include: ['src/domain/**/*.ts'],
      exclude: ['**/*.test.ts'],
      thresholds: { lines: 90, branches: 90 },
    },
  },
});
