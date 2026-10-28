import { describe, expect, it } from 'vitest';
import { readConfig } from './env';

describe('readConfig', () => {
  it('usa development por defecto y no inventa valores opcionales', () => {
    expect(readConfig({})).toEqual({ nodeEnv: 'development' });
  });

  it('lee NODE_ENV, NEXT_RUNTIME, entorno de despliegue y SHA válidos', () => {
    expect(
      readConfig({
        NODE_ENV: 'production',
        NEXT_RUNTIME: 'nodejs',
        VERCEL_ENV: 'preview',
        VERCEL_GIT_COMMIT_SHA: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
      }),
    ).toEqual({
      nodeEnv: 'production',
      runtime: 'nodejs',
      deploymentEnvironment: 'preview',
      deploymentSha: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    });
  });

  it('descarta valores con formato inesperado', () => {
    expect(
      readConfig({ NODE_ENV: 'weird', NEXT_RUNTIME: 'deno', VERCEL_ENV: 'a b\nc', VERCEL_GIT_COMMIT_SHA: 'not-a-sha' }),
    ).toEqual({ nodeEnv: 'development' });
  });

  it('no expone variables ajenas al contrato', () => {
    const config = JSON.stringify(readConfig({ DATABASE_URL: 'postgresql://x', SECRET_TOKEN: 'canary-secret' }));
    expect(config).not.toContain('canary-secret');
    expect(config).not.toContain('postgresql');
  });
});
