import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': fromRoot('./src'),
      'server-only': fromRoot('./tests/stubs/server-only.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/tooling/**/*.test.ts'],
  },
});
