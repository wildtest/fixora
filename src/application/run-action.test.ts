import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Logger } from '@/infrastructure/logging/logger';
import type { ActionResult } from './action-result';
import { runAction } from './run-action';

type DemoCode = 'NOT_ALLOWED' | 'RATE_LIMITED';

function fakeLogger() {
  const calls: unknown[] = [];
  const log = (fields: unknown) => void calls.push(fields);
  const logger: Logger = { debug: log, info: log, warn: log, error: log };
  return { logger, calls };
}

describe('ActionResult (tipos)', () => {
  it('admite éxito y fallos tipados con una unión cerrada', () => {
    const success: ActionResult<number, DemoCode> = { ok: true, data: 1 };
    const failure: ActionResult<number, DemoCode> = { ok: false, code: 'NOT_ALLOWED', retryAfterSeconds: 3 };
    const internal: ActionResult<number, DemoCode> = { ok: false, code: 'INTERNAL_ERROR', reference: 'r-1' };
    const fields: ActionResult<number, DemoCode> = { ok: false, code: 'RATE_LIMITED', fieldErrors: { name: 'REQUIRED' } };
    expect([success, failure, internal, fields]).toHaveLength(4);
  });

  it('solo INTERNAL_ERROR es transversal cuando no hay códigos propios', () => {
    const only: ActionResult<number> = { ok: false, code: 'INTERNAL_ERROR' };
    expect(only.ok).toBe(false);
    // @ts-expect-error un código no declarado no compila
    const unknown: ActionResult<number> = { ok: false, code: 'NOT_ALLOWED' };
    expect(unknown.ok).toBe(false);
  });

  it('rechaza un string abierto como parámetro de códigos', () => {
    // @ts-expect-error `string` abierto convierte el resultado en `never`
    const open: ActionResult<number, string> = { ok: false, code: 'CUALQUIER_COSA' };
    expect(open).toBeDefined();
  });

  it('rechaza un código ajeno a la unión', () => {
    // @ts-expect-error 'OTHER' no pertenece a DemoCode
    const wrong: ActionResult<number, DemoCode> = { ok: false, code: 'OTHER' };
    expect(wrong).toBeDefined();
  });
});

describe('runAction', () => {
  it('devuelve el resultado del caso de uso (síncrono o asíncrono)', async () => {
    expect(await runAction(() => ({ ok: true, data: 'x' }) as ActionResult<string>)).toEqual({ ok: true, data: 'x' });
    expect(
      await runAction<number, DemoCode>(async () => ({ ok: false, code: 'NOT_ALLOWED' })),
    ).toEqual({ ok: false, code: 'NOT_ALLOWED' });
  });

  it('un error inesperado produce INTERNAL_ERROR con referencia opaca y registro sanitizado', async () => {
    const { logger, calls } = fakeLogger();
    const result = await runAction(
      () => {
        throw Object.assign(new TypeError('CANARY-MULTILINE linea1\nlinea2 at secret.ts:1'), {
          stack: 'CANARY-STACK',
          code: 'ECONNRESET',
        });
      },
      { logger, newReference: () => 'ref-123', surface: 'public' },
    );
    expect(result).toEqual({ ok: false, code: 'INTERNAL_ERROR', reference: 'ref-123' });
    expect(calls).toEqual([
      {
        event: 'infrastructure.failure',
        requestId: 'ref-123',
        surface: 'public',
        resultCode: 'INTERNAL_ERROR',
        routeType: 'action',
        errorName: 'TypeError',
        errorCode: 'ECONNRESET',
      },
    ]);
    const serialized = JSON.stringify([result, calls]);
    expect(serialized).not.toMatch(/CANARY|linea1|secret\.ts|stack/);
  });

  it('un valor lanzado que no es Error también produce INTERNAL_ERROR sin filtrarlo', async () => {
    const { logger, calls } = fakeLogger();
    const result = await runAction(
      async () => {
        throw 'CANARY-STRING-THROWN';
      },
      { logger, newReference: () => 'ref-9' },
    );
    expect(result).toEqual({ ok: false, code: 'INTERNAL_ERROR', reference: 'ref-9' });
    expect(JSON.stringify([result, calls])).not.toContain('CANARY');
  });

  it('usa el requestId recibido como referencia y no contiene identificadores de negocio', async () => {
    const { logger } = fakeLogger();
    const result = await runAction(
      () => {
        throw new Error('x');
      },
      { logger, requestId: 'iad1::abc-123' },
    );
    expect(result).toEqual({ ok: false, code: 'INTERNAL_ERROR', reference: 'iad1::abc-123' });
    const generated = await runAction(
      () => {
        throw new Error('x');
      },
      { logger },
    );
    expect((generated as { reference: string }).reference).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('un fallo del logger no cambia el resultado', async () => {
    const broken: Logger = {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {
        throw new Error('sink roto');
      },
    };
    const result = await runAction(
      () => {
        throw new Error('x');
      },
      { logger: broken, newReference: () => 'ref-1' },
    );
    expect(result).toEqual({ ok: false, code: 'INTERNAL_ERROR', reference: 'ref-1' });
  });

  it('el módulo no importa Next ni usa digest, message o unstable_rethrow para decidir', () => {
    const source = readFileSync(new URL('./run-action.ts', import.meta.url), 'utf8');
    const code = source
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n');
    expect(code).not.toMatch(/from ['"]next/);
    expect(code).not.toMatch(/unstable_rethrow|NEXT_REDIRECT|\.digest|\.message/);
  });
});
