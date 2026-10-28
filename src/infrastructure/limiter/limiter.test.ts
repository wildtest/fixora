import { describe, expect, it, vi } from 'vitest';
import { createLimiter } from './limiter';
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
