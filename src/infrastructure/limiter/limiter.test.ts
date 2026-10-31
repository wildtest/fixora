import { describe, expect, it, vi } from 'vitest';
import { createLimiter, recordFailureWithCleanup } from './limiter';
import { subjectKey } from './subject-key';

describe('subjectKey (HMAC del sujeto)', () => {
  const secret = 's'.repeat(32);

  it('es determinista con el mismo secreto y distinta con otro', () => {
    expect(subjectKey(secret, '203.0.113.7')).toBe(subjectKey(secret, '203.0.113.7'));
    expect(subjectKey(secret, '203.0.113.7')).not.toBe(subjectKey('t'.repeat(32), '203.0.113.7'));
    expect(subjectKey(secret, '203.0.113.7')).not.toBe(subjectKey(secret, '203.0.113.8'));
  });

  it('nunca contiene el sujeto en claro y no es un SHA-256 simple', () => {
    const key = subjectKey(secret, '203.0.113.7');
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(key).not.toContain('203');
  });
});

describe('fallo cerrado del limitador', () => {
  const failing = {
    $queryRaw: vi.fn().mockRejectedValue(new Error('canary-connection postgresql://u:canary-pw@host/db')),
    $executeRaw: vi.fn().mockRejectedValue(new Error('canary-connection')),
  };
  const limiter = createLimiter({
    db: failing as never,
    hmacSecret: 's'.repeat(32),
    now: () => new Date('2026-10-28T10:00:00.000Z'),
  });
  const policy = { maxFailures: 3, windowMs: 60_000, blockMs: 120_000 };

  it('devuelve unavailable (nunca allowed) si cae el almacén', async () => {
    expect(await limiter.isBlocked('203.0.113.7', 'PUBLIC_TRACKING')).toEqual({ status: 'unavailable' });
    expect(await limiter.recordFailure('203.0.113.7', 'ADMIN_LOGIN', policy)).toEqual({ status: 'unavailable' });
    expect(await limiter.cleanupExpired('PUBLIC_TRACKING', 60_000, 10)).toBe('unavailable');
  });

  it('el resultado no arrastra el error de la base de datos', async () => {
    const result = JSON.stringify(await limiter.recordFailure('203.0.113.7', 'ADMIN_LOGIN', policy));
    expect(result).not.toContain('canary');
  });
});

// CR-001 (revisión final): la limpieza oportunista del TD §22 se ejecuta tras cada fallo, sin alterar la decisión.
describe('recordFailureWithCleanup', () => {
  const policy = { maxFailures: 3, windowMs: 60_000, blockMs: 120_000 };
  const blocked = { status: 'blocked' as const, blockedUntil: new Date('2026-10-28T10:02:00.000Z') };

  it('registra el fallo, limpia la misma superficie con la ventana de la política y devuelve la decisión intacta', async () => {
    const recordFailure = vi.fn().mockResolvedValue(blocked);
    const cleanupExpired = vi.fn().mockResolvedValue(3);
    const decision = await recordFailureWithCleanup({ recordFailure, cleanupExpired }, 's', 'ADMIN_LOGIN', policy);
    expect(decision).toBe(blocked);
    expect(recordFailure).toHaveBeenCalledWith('s', 'ADMIN_LOGIN', policy);
    expect(cleanupExpired).toHaveBeenCalledWith('ADMIN_LOGIN', policy.windowMs, 20);
  });

  it('un fallo o la indisponibilidad de la limpieza no cambia ni propaga nada', async () => {
    const recordFailure = vi.fn().mockResolvedValue({ status: 'allowed' });
    for (const cleanupExpired of [vi.fn().mockRejectedValue(new Error('boom')), vi.fn().mockResolvedValue('unavailable')]) {
      expect(await recordFailureWithCleanup({ recordFailure, cleanupExpired }, 's', 'PUBLIC_TRACKING', policy)).toEqual({ status: 'allowed' });
    }
  });

  it('si el registro del fallo no está disponible (falla cerrada) lo devuelve tal cual', async () => {
    const recordFailure = vi.fn().mockResolvedValue({ status: 'unavailable' });
    const cleanupExpired = vi.fn().mockResolvedValue('unavailable');
    expect(await recordFailureWithCleanup({ recordFailure, cleanupExpired }, 's', 'PUBLIC_TRACKING', policy)).toEqual({ status: 'unavailable' });
  });
});
