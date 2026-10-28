import { describe, expect, it } from 'vitest';
import { ConfigError } from '../config/database-url';
import { readDatabaseConfig } from '../config/capabilities';
import { createLogger, type LogLevel } from '../logging/logger';
import { safeErrorFields } from '../logging/safe-error';

// Valores canario sobre el logger de CHG-01 (tarea 9.1): ni los errores de configuración ni los de base de
// datos pueden arrastrar valores de conexión, contraseñas o parámetros SQL a los registros.
const PASSWORD = 'CANARY-PASSWORD-hunter2';
const URL_WITH_SECRET = `postgresql://fixora_app:${PASSWORD}@ep-canary-pooler.region.aws.neon.tech/neondb?sslmode=require`;

function capture() {
  const lines: { level: LogLevel; line: string }[] = [];
  const logger = createLogger({
    sink: { write: (level, line) => lines.push({ level, line }) },
    now: () => new Date('2026-10-28T12:00:00.000Z'),
    debugEnabled: true,
  });
  return { logger, lines };
}

function logFailure(error: unknown) {
  const { logger, lines } = capture();
  logger.error({ event: 'infrastructure.failure', requestId: 'iad1::abc-123', surface: 'system', ...safeErrorFields(error) });
  return lines.map((entry) => entry.line).join('\n');
}

describe('los errores de persistencia no filtran secretos a los registros', () => {
  it('un error de configuración nombra la variable, nunca el valor', () => {
    let error: unknown;
    try {
      readDatabaseConfig({ DATABASE_URL: URL_WITH_SECRET }); // sslmode=require: rechazada
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(ConfigError);
    const output = logFailure(error);
    expect(output).not.toContain(PASSWORD);
    expect(output).not.toContain('postgresql');
    expect(output).not.toContain('ep-canary');
  });

  it('un error de Prisma/PostgreSQL con la URL y el SQL en el mensaje solo conserva nombre y código conocido', () => {
    const error = Object.assign(
      new Error(`connect failed ${URL_WITH_SECRET}; SELECT * FROM repair_orders WHERE customer_phone = '+51999000111'`),
      { name: 'PrismaClientKnownRequestError', code: 'P1001', meta: { query: 'SELECT secret', params: [PASSWORD] } },
    );
    const output = logFailure(error);
    expect(output).toContain('P1001');
    expect(output).not.toContain(PASSWORD);
    expect(output).not.toContain('SELECT');
    expect(output).not.toContain('51999000111');
    expect(output).not.toContain('postgresql');
  });

  it('un código desconocido de base de datos se degrada a UNKNOWN_INFRASTRUCTURE_ERROR', () => {
    const output = logFailure(Object.assign(new Error(URL_WITH_SECRET), { code: `X${PASSWORD}` }));
    expect(output).toContain('UNKNOWN_INFRASTRUCTURE_ERROR');
    expect(output).not.toContain(PASSWORD);
  });
});
