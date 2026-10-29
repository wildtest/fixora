import { describe, expect, it, vi } from 'vitest';
import type { PublicOrderView } from '../domain/repair/public-order-view';
import { clientSubject, UNKNOWN_SUBJECT } from '../infrastructure/security/client-subject';
import { trackOrder, type LimiterDecision, type TrackOrderDependencies } from './track-order';
import { trackOrderFromRequest } from './track-order-service';
import type { Logger } from '../infrastructure/logging/logger';

const ORDER: PublicOrderView = {
  trackingCode: '23456789BDFG',
  status: 'SOLICITUD_RECIBIDA',
  device: { type: 'LAPTOP', brand: 'Lenovo', model: null },
  problemDescription: 'No enciende',
  statusTimeline: [{ status: 'SOLICITUD_RECIBIDA', occurredAt: '2026-10-28T15:00:00.000Z' }],
  repairDetails: null,
  publicNotes: [],
};
const allowed: LimiterDecision = { status: 'allowed' };

function setup(overrides: Partial<TrackOrderDependencies> = {}) {
  const calls: string[] = [];
  const dependencies: TrackOrderDependencies = {
    isBlocked: vi.fn(async () => (calls.push('isBlocked'), allowed)),
    recordFailure: vi.fn(async () => (calls.push('recordFailure'), allowed)),
    findByTrackingCode: vi.fn(async (code: string) => (calls.push(`find:${code}`), code === ORDER.trackingCode ? ORDER : null)),
    onEvent: vi.fn(),
    ...overrides,
  };
  return { dependencies, calls };
}

describe('trackOrder — orden seguro [SC-02] [SC-13] [E4]', () => {
  it('éxito: limitador → normalizar → buscar; el acierto NO cuenta como fallo', async () => {
    const { dependencies, calls } = setup();
    const result = await trackOrder('  23456789bdfg ', '203.0.113.7', dependencies);
    expect(result).toEqual({ ok: true, data: ORDER });
    expect(calls).toEqual(['isBlocked', 'find:23456789BDFG']);
  });

  it('inexistente y mal formado dan el MISMO resultado y ambos cuentan como fallo', async () => {
    const { dependencies, calls } = setup();
    const missing = await trackOrder('222222222222', 's', dependencies);
    const malformed = await trackOrder('no-es-un-codigo', 's', dependencies);
    expect(missing).toEqual({ ok: false, code: 'TRACKING_NOT_FOUND' });
    expect(malformed).toEqual(missing);
    expect(calls.filter((c) => c === 'recordFailure')).toHaveLength(2);
  });

  it('un código mal formado no toca la tabla de órdenes', async () => {
    const { dependencies } = setup();
    for (const raw of ['', 'corto', 42, null, undefined, { code: '23456789BDFG' }]) {
      expect(await trackOrder(raw, 's', dependencies)).toEqual({ ok: false, code: 'TRACKING_NOT_FOUND' });
    }
    expect(dependencies.findByTrackingCode).not.toHaveBeenCalled();
  });

  it('bloqueado: RATE_LIMITED aun con un código válido, sin consultar la orden ni contar el fallo', async () => {
    const { dependencies } = setup({ isBlocked: async () => ({ status: 'blocked', blockedUntil: new Date() }) });
    expect(await trackOrder('23456789BDFG', 's', dependencies)).toEqual({ ok: false, code: 'RATE_LIMITED' });
    expect(dependencies.findByTrackingCode).not.toHaveBeenCalled();
    expect(dependencies.recordFailure).not.toHaveBeenCalled();
    expect(dependencies.onEvent).toHaveBeenCalledWith('lookup.rate_limited');
  });

  it('limitador no disponible: FALLA CERRADO (SERVICE_UNAVAILABLE) sin consultar ninguna orden, distinto de RATE_LIMITED', async () => {
    const { dependencies } = setup({ isBlocked: async () => ({ status: 'unavailable' }) });
    const result = await trackOrder('23456789BDFG', 's', dependencies);
    expect(result).toEqual({ ok: false, code: 'SERVICE_UNAVAILABLE' });
    expect(result).not.toEqual({ ok: false, code: 'RATE_LIMITED' });
    expect(dependencies.findByTrackingCode).not.toHaveBeenCalled();
    expect(dependencies.onEvent).toHaveBeenCalledWith('limiter.unavailable');
  });

  it('si no se puede registrar el fallo, también falla cerrado', async () => {
    const { dependencies } = setup({ recordFailure: async () => ({ status: 'unavailable' }) });
    expect(await trackOrder('222222222222', 's', dependencies)).toEqual({ ok: false, code: 'SERVICE_UNAVAILABLE' });
  });

  it('el fallo que provoca el bloqueo sigue respondiendo «no encontrado»', async () => {
    const { dependencies } = setup({ recordFailure: async () => ({ status: 'blocked', blockedUntil: new Date() }) });
    expect(await trackOrder('222222222222', 's', dependencies)).toEqual({ ok: false, code: 'TRACKING_NOT_FOUND' });
  });
});

describe('clientSubject (sujeto del limitador)', () => {
  it('toma el primer valor, en minúsculas y recortado', () => {
    expect(clientSubject(' 203.0.113.7 , 10.0.0.1')).toBe('203.0.113.7');
    expect(clientSubject('2001:DB8::1')).toBe('2001:db8:0:0::/64'); // IPv6: se reduce a su prefijo /64 (CHG-14)
  });

  it('sin cabecera o con un valor desmesurado usa un sujeto compartido (nunca el vacío)', () => {
    for (const value of [null, undefined, '', '   ', 'x'.repeat(65)]) expect(clientSubject(value)).toBe(UNKNOWN_SUBJECT);
  });
});

describe('trackOrderFromRequest — fallos inesperados [SC-11]', () => {
  it('devuelve INTERNAL_ERROR genérico y registra sin código, cuerpo, origen ni datos', async () => {
    const lines: string[] = [];
    const logger: Logger = {
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: (fields) => void lines.push(JSON.stringify(fields)),
    };
    const { dependencies } = setup({
      findByTrackingCode: async () => {
        throw Object.assign(new Error('CANARY 23456789BDFG 203.0.113.7 SELECT * FROM repair_orders'), { code: 'P1001' });
      },
    });
    const result = await trackOrderFromRequest('23456789BDFG', '203.0.113.7', () => dependencies, { logger, requestId: 'req-2' });
    expect(result).toEqual({ ok: false, code: 'INTERNAL_ERROR', reference: 'req-2' });
    const output = lines.join('\n');
    expect(output).toContain('P1001');
    for (const leak of ['CANARY', '23456789BDFG', '203.0.113.7', 'SELECT']) expect(output).not.toContain(leak);
  });
});
