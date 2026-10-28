import 'server-only';

// Logger propio, cerrado y de servidor (TD §23, ADR-010). Una línea JSON por evento.
// Solo se serializan las claves conocidas con valores primitivos validados: no existe campo de
// mensaje libre ni se aceptan objetos, errores, FormData, request o headers.

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export const LOG_EVENTS = [
  'auth.login.failed',
  'auth.rate_limited',
  'lookup.rate_limited',
  'limiter.unavailable',
  'registration.collision_retry',
  'action.stale',
  'infrastructure.failure',
  'configuration.invalid',
] as const;
export type LogEvent = (typeof LOG_EVENTS)[number];

export const LOG_SURFACES = ['public', 'admin', 'system'] as const;
export type LogSurface = (typeof LOG_SURFACES)[number];

export const ROUTE_TYPES = ['render', 'route', 'action', 'proxy'] as const;
export type RouteType = (typeof ROUTE_TYPES)[number];

export type LogFields = {
  readonly event: LogEvent;
  readonly requestId: string;
  readonly surface: LogSurface;
  readonly resultCode?: string;
  readonly durationMs?: number;
  readonly orderId?: string;
  readonly errorName?: string;
  readonly errorCode?: string;
  readonly digest?: string;
  readonly routeType?: RouteType;
  readonly routePattern?: string;
};

export type LogSink = {
  write(level: LogLevel, line: string): void;
};

export type LoggerOptions = {
  readonly sink: LogSink;
  readonly now: () => Date;
  readonly environment?: string;
  readonly deploymentSha?: string;
  readonly debugEnabled: boolean;
};

export type Logger = {
  readonly [L in LogLevel]: (fields: LogFields) => void;
};

const REQUEST_ID = /^[A-Za-z0-9._:-]{1,128}$/;
const CODE = /^[A-Z][A-Z0-9_]{0,63}$/;
const NAME = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const DIGEST = /^[A-Za-z0-9]{1,32}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROUTE = /^\/[A-Za-z0-9_/[\]().@-]{0,199}$/;
const LABEL = /^[A-Za-z0-9_-]{1,32}$/;
const SHA = /^[0-9a-f]{7,40}$/;

function text(value: unknown, pattern: RegExp): string | undefined {
  return typeof value === 'string' && pattern.test(value) ? value : undefined;
}

function requestIdOf(value: unknown): string {
  return text(value, REQUEST_ID) ?? 'unknown';
}

function pickEnum<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return allowed.find((candidate) => candidate === value);
}

export function createLogger(options: LoggerOptions): Logger {
  const environment = text(options.environment, LABEL);
  const deploymentSha = text(options.deploymentSha, SHA);

  const emit = (level: LogLevel, input: LogFields): void => {
    try {
      if (level === 'debug' && !options.debugEnabled) return;
      const raw = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>;
      const event = pickEnum(raw.event, LOG_EVENTS);
      if (!event) return;
      const durationMs =
        typeof raw.durationMs === 'number' && Number.isFinite(raw.durationMs) && raw.durationMs >= 0
          ? Math.round(raw.durationMs)
          : undefined;
      const entry = {
        timestamp: options.now().toISOString(),
        level,
        event,
        requestId: requestIdOf(raw.requestId),
        surface: pickEnum(raw.surface, LOG_SURFACES) ?? 'system',
        resultCode: text(raw.resultCode, CODE),
        durationMs,
        orderId: text(raw.orderId, UUID),
        environment,
        deploymentSha,
        errorName: text(raw.errorName, NAME),
        errorCode: text(raw.errorCode, CODE),
        digest: text(raw.digest, DIGEST),
        routeType: pickEnum(raw.routeType, ROUTE_TYPES),
        routePattern: text(raw.routePattern, ROUTE),
      };
      // JSON.stringify omite las claves con valor `undefined`.
      options.sink.write(level, JSON.stringify(entry));
    } catch {
      // Un fallo de logging nunca debe romper la petición.
    }
  };

  return {
    debug: (fields) => emit('debug', fields),
    info: (fields) => emit('info', fields),
    warn: (fields) => emit('warn', fields),
    error: (fields) => emit('error', fields),
  };
}
