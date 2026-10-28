import { describe, expect, it } from 'vitest';
import { safeErrorFields } from './safe-error';

describe('safeErrorFields', () => {
  it('extrae solo name, un código conocido y digest', () => {
    const error = Object.assign(new TypeError('CANARY-MULTILINE linea1\nlinea2'), {
      code: 'ECONNRESET',
      digest: '1234567890',
      cause: new Error('CANARY-CAUSE'),
      customer: 'CANARY-NAME',
    });
    const fields = safeErrorFields(error);
    expect(fields).toEqual({ errorName: 'TypeError', errorCode: 'ECONNRESET', digest: '1234567890' });
    const out = JSON.stringify(fields);
    expect(out).not.toMatch(/CANARY|linea1|stack/);
  });

  it('un código desconocido se registra como UNKNOWN_INFRASTRUCTURE_ERROR sin inspeccionarlo', () => {
    const fields = safeErrorFields(Object.assign(new Error('x'), { code: 'P9999-CANARY-SECRET' }));
    expect(fields.errorCode).toBe('UNKNOWN_INFRASTRUCTURE_ERROR');
    expect(JSON.stringify(fields)).not.toContain('CANARY');
  });

  it('descarta nombres y digests con formato inválido', () => {
    const fields = safeErrorFields({ name: 'CANARY name\nwith newline', digest: 'CANARY digest with spaces' });
    expect(fields).toEqual({});
  });

  it('valores no objeto no producen campos', () => {
    expect(safeErrorFields('CANARY-STRING')).toEqual({});
    expect(safeErrorFields(null)).toEqual({});
    expect(safeErrorFields(undefined)).toEqual({});
    expect(safeErrorFields(42)).toEqual({});
  });

  it('no lanza con objetos hostiles', () => {
    const hostile = new Proxy(
      {},
      {
        get() {
          throw new Error('CANARY-PROXY');
        },
      },
    );
    expect(safeErrorFields(hostile)).toEqual({});
  });
});
