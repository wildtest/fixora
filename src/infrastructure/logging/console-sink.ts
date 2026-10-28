import 'server-only';
import type { LogSink } from './logger';

// Único punto donde se escribe a la salida estándar (excepción acotada de `no-console`).
// El nivel viaja dentro del JSON; el canal solo separa stdout (debug/info) de stderr (warn/error).
export const consoleSink: LogSink = {
  write(level, line) {
    if (level === 'warn') console.warn(line);
    else if (level === 'error') console.error(line);
    else console.log(line);
  },
};
