import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLogger } from './logger';
import { buildRequestErrorLog, handleRequestError } from './request-error';

const error = Object.assign(new TypeError('CANARY-MULTILINE linea1\nlinea2 token=CANARY-TOKEN'), {
  digest: '1234567890',
});
const request = {
  path: '/consultar?codigo=CANARY-TRACKING-FX-1234&token=CANARY-SECRET',
  method: 'POST',
  headers: {
    'x-vercel-id': 'iad1::abc-123',
    cookie: 'session=CANARY-COOKIE',
    authorization: 'Bearer CANARY-BEARER',
  },
};
const context = { routePath: '/app/consultar/[codigo]', routeType: 'render', routerKind: 'App Router' };

function serialize(fields: ReturnType<typeof buildRequestErrorLog>): string {
  const lines: string[] = [];
  createLogger({
    sink: { write: (_level, line) => lines.push(line) },
    now: () => new Date('2026-10-27T12:00:00.000Z'),
    debugEnabled: true,
  }).error(fields);
  return lines[0];
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('buildRequestErrorLog', () => {
  it('construye el evento con la lista blanca del TD §23', () => {
    expect(buildRequestErrorLog(error, request, context)).toEqual({
      event: 'infrastructure.failure',
      requestId: 'iad1::abc-123',
      surface: 'public',
      errorName: 'TypeError',
      digest: '1234567890',
      routeType: 'render',
      routePattern: '/app/consultar/[codigo]',
    });
  });

  it('no filtra message, pila, path con query, cabeceras ni cookies (canarios)', () => {
    const out = serialize(buildRequestErrorLog(error, request, context));
    expect(out).not.toMatch(/CANARY|linea1|consultar\?|cookie|authorization|Bearer|stack/i);
    expect(out).toContain('iad1::abc-123');
  });

  it('deriva la superficie admin del patrón de ruta', () => {
    expect(buildRequestErrorLog(error, request, { routePath: '/app/admin/ordenes', routeType: 'action' }).surface).toBe(
      'admin',
    );
    expect(buildRequestErrorLog(error, request, undefined).surface).toBe('system');
  });

  it('ignora un routeType desconocido y genera requestId si falta x-vercel-id', () => {
    const fields = buildRequestErrorLog(error, { headers: {} }, { routePath: '/', routeType: 'weird' }, () => 'gen-1');
    expect(fields.routeType).toBeUndefined();
    expect(fields.requestId).toBe('gen-1');
  });
});

describe('handleRequestError', () => {
  it('registra en el runtime Node sin filtrar datos', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs');
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await handleRequestError(error, request, context);
    expect(spy).toHaveBeenCalledTimes(1);
    const line = String(spy.mock.calls[0][0]);
    expect(JSON.parse(line)).toMatchObject({ level: 'error', event: 'infrastructure.failure', requestId: 'iad1::abc-123' });
    expect(line).not.toMatch(/CANARY|linea1|consultar\?|cookie/i);
  });

  it('no registra fuera del runtime Node', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'edge');
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await handleRequestError(error, request, context);
    expect(spy).not.toHaveBeenCalled();
  });

  it('nunca lanza', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs');
    vi.spyOn(console, 'error').mockImplementation(() => {
      throw new Error('sink roto');
    });
    await expect(handleRequestError(error, request, context)).resolves.toBeUndefined();
  });
});
