import 'server-only';

// Único acceso a `process.env` de la aplicación (TD §21.6; regla de lint).
// Solo expone lo que la fundación necesita; los secretos de BD y autenticación llegan en changes posteriores.

export type NodeEnv = 'development' | 'production' | 'test';
export type Runtime = 'nodejs' | 'edge';

export type AppConfig = {
  readonly nodeEnv: NodeEnv;
  readonly runtime?: Runtime;
  readonly deploymentEnvironment?: string;
  readonly deploymentSha?: string;
};

type EnvSource = Readonly<Record<string, string | undefined>>;

const SAFE_LABEL = /^[A-Za-z0-9_-]{1,32}$/;
const SHA = /^[0-9a-f]{7,40}$/;

function pick(value: string | undefined, pattern: RegExp): string | undefined {
  return value !== undefined && pattern.test(value) ? value : undefined;
}

export function readConfig(env: EnvSource = process.env): AppConfig {
  const nodeEnv: NodeEnv =
    env.NODE_ENV === 'production' || env.NODE_ENV === 'test' ? env.NODE_ENV : 'development';
  const runtime: Runtime | undefined =
    env.NEXT_RUNTIME === 'nodejs' || env.NEXT_RUNTIME === 'edge' ? env.NEXT_RUNTIME : undefined;
  const deploymentEnvironment = pick(env.VERCEL_ENV, SAFE_LABEL);
  const deploymentSha = pick(env.VERCEL_GIT_COMMIT_SHA, SHA);
  return {
    nodeEnv,
    ...(runtime && { runtime }),
    ...(deploymentEnvironment && { deploymentEnvironment }),
    ...(deploymentSha && { deploymentSha }),
  };
}

export function getConfig(): AppConfig {
  return readConfig();
}
