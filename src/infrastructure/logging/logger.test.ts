import { describe, expect, it } from 'vitest';
import { LOG_EVENTS, createLogger, type LogFields, type LogLevel } from './logger';

// Valores ficticios y reconocibles: ninguno debe aparecer en la salida.
const CANARIES = {
  name: 'CANARY-NAME-Maria-Lopez',
  email: 'canary-email@ejemplo.invalid',
  phone: 'CANARY-PHONE-+51999000111',
  tracking: 'CANARY-TRACKING-FX-ABCD-1234',
  secret: 'CANARY-SECRET-sk_live_0123456789',
  password: 'CANARY-PASSWORD-hunter2',
  multiline: 'CANARY-MULTILINE linea1\nlinea2 at secret/path.ts:10',
};

function setup(overrides: { debugEnabled?: boolean; environment?: string; deploymentSha?: string } = {}) {
  const lines: { level: LogLevel; line: string }[] = [];
  const logger = createLogger({
    sink: { write: (level, line) => lines.push({ level, line }) },
    now: () => new Date('2026-10-27T12:00:00.000Z'),
    debugEnabled: true,
    ...overrides,
  });
  return { logger, lines };
}

const base: LogFields = { event: 'infrastructure.failure', requestId: 'iad1::abc-123', surface: 'public' };

describe('createLogger', () => {
  it('escribe una sola línea JSON con el esquema cerrado', () => {
    const { logger, lines } = setup({ environment: 'production', deploymentSha: 'a1b2c3d' });
    logger.error({ ...base, resultCode: 'DB_UNAVAILABLE', durationMs: 12.6 });
    expect(lines).toHaveLength(1);
    expect(lines[0].line).not.toContain('\n');
    expect(JSON.parse(lines[0].line)).toEqual({
      timestamp: '2026-10-27T12:00:00.000Z',
      level: 'error',
      event: 'infrastructure.failure',
      requestId: 'iad1::abc-123',
      surface: 'public',
      resultCode: 'DB_UNAVAILABLE',
      durationMs: 13,
      environment: 'production',
      deploymentSha: 'a1b2c3d',
    });
  });

  it('el nivel va dentro del JSON y se entrega al sink', () => {
    const { logger, lines } = setup();
    logger.warn(base);
    logger.info(base);
    expect(lines.map((l) => [l.level, JSON.parse(l.line).level])).toEqual([
      ['warn', 'warn'],
      ['info', 'info'],
    ]);
  });

  it('debug se omite cuando está desactivado (producción)', () => {
    const off = setup({ debugEnabled: false });
    off.logger.debug(base);
    expect(off.lines).toHaveLength(0);
    const on = setup({ debugEnabled: true });
    on.logger.debug(base);
    expect(on.lines).toHaveLength(1);
  });

  it('descarta eventos fuera del catálogo cerrado (TD §23)', () => {
    const { logger, lines } = setup();
    for (const event of ['action.unexpected_error', 'server.unhandled_error', 'arbitrary.event', 'user.registered']) {
      logger.error({ ...base, event } as unknown as LogFields);
    }
    expect(lines).toHaveLength(0);
  });

  it('acepta cada evento del catálogo, que es exactamente el aprobado en TD §23', () => {
    expect([...LOG_EVENTS].sort()).toEqual(
      [
        'action.stale',
        'auth.login.failed',
        'auth.rate_limited',
        'configuration.invalid',
        'infrastructure.failure',
        'limiter.unavailable',
        'lookup.rate_limited',
        'registration.collision_retry',
      ].sort(),
    );
    const { logger, lines } = setup();
    for (const event of LOG_EVENTS) logger.error({ ...base, event });
    expect(lines.map((l) => JSON.parse(l.line).event)).toEqual([...LOG_EVENTS]);
  });

  it('descarta claves desconocidas y valores no primitivos (as any)', () => {
    const { logger, lines } = setup();
    logger.error({
      ...base,
      message: CANARIES.multiline,
      customerName: CANARIES.name,
      email: CANARIES.email,
      phone: CANARIES.phone,
      context: { tracking: CANARIES.tracking, password: CANARIES.password },
      error: new Error(CANARIES.multiline),
      resultCode: { nested: CANARIES.secret },
      orderId: CANARIES.tracking,
    } as unknown as LogFields);
    const out = lines[0].line;
    for (const value of Object.values(CANARIES)) expect(out).not.toContain(value);
    expect(out).not.toContain('CANARY');
    expect(Object.keys(JSON.parse(out)).sort()).toEqual(['event', 'level', 'requestId', 'surface', 'timestamp']);
  });

  it('no filtra canarios pasados por campos permitidos con formato inválido', () => {
    const { logger, lines } = setup();
    logger.error({
      ...base,
      requestId: CANARIES.multiline,
      resultCode: CANARIES.tracking,
      errorName: CANARIES.name,
      errorCode: CANARIES.secret,
      digest: CANARIES.password,
      routePattern: CANARIES.email,
      surface: CANARIES.phone,
      durationMs: Number.NaN,
    } as unknown as LogFields);
    const out = lines[0].line;
    expect(out).not.toMatch(/CANARY|canary/);
    expect(out).not.toContain('\\n');
    const parsed = JSON.parse(out);
    expect(parsed.surface).toBe('system');
    expect(parsed.durationMs).toBeUndefined();
  });

  it('acepta orderId UUID y patrón de ruta lógico', () => {
    const { logger, lines } = setup();
    logger.error({
      ...base,
      orderId: '0b9d6a52-4f3e-4c1e-9a77-1d2c3e4f5a6b',
      routeType: 'render',
      routePattern: '/app/blog/[dynamic]',
      errorName: 'TypeError',
      errorCode: 'ECONNRESET',
      digest: '1234567890',
    });
    expect(JSON.parse(lines[0].line)).toMatchObject({
      orderId: '0b9d6a52-4f3e-4c1e-9a77-1d2c3e4f5a6b',
      routeType: 'render',
      routePattern: '/app/blog/[dynamic]',
      errorName: 'TypeError',
      errorCode: 'ECONNRESET',
      digest: '1234567890',
    });
  });

  it('nunca lanza, aunque el sink falle', () => {
    const logger = createLogger({
      sink: {
        write: () => {
          throw new Error(CANARIES.multiline);
        },
      },
      now: () => new Date(),
      debugEnabled: true,
    });
    expect(() => logger.error(base)).not.toThrow();
    expect(() => logger.error(null as unknown as LogFields)).not.toThrow();
  });
});
