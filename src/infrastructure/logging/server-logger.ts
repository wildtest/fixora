import 'server-only';
import { getConfig } from '@/infrastructure/config/env';
import { consoleSink } from './console-sink';
import { createLogger, type Logger } from './logger';

// Logger de producción: sink de consola, reloj del sistema y entorno desde la configuración.
export function getLogger(): Logger {
  const config = getConfig();
  return createLogger({
    sink: consoleSink,
    now: () => new Date(),
    environment: config.deploymentEnvironment ?? config.nodeEnv,
    deploymentSha: config.deploymentSha,
    debugEnabled: config.nodeEnv !== 'production',
  });
}
