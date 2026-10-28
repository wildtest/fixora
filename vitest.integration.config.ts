import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// Pruebas de integración contra PostgreSQL real, en la rama Neon `test` (CHG-02, D-13). Seriales: una sola
// base compartida. La guardia anti-desastre se ejecuta antes de cualquier operación destructiva.
// La orquestación global y la CI son de CHG-03.
export default defineConfig({
  resolve: {
    alias: {
      '@': fromRoot('./src'),
      'server-only': fromRoot('./tests/stubs/server-only.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    globalSetup: ['tests/integration/support/global-setup.ts'],
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 60_000,
    hookTimeout: 180_000,
  },
});
