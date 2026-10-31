import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { PrismaClient } from '../../src/infrastructure/db/generated/client.ts';
import { createLimiter, recordFailureWithCleanup, type LimiterPolicy } from '../../src/infrastructure/limiter/limiter';
import { subjectKey } from '../../src/infrastructure/limiter/subject-key';
import { appPrisma, ownerPg } from './support/connections';
import { resetTestDatabase } from './support/reset';

// Limitador sobre PostgreSQL real con el rol de aplicación (tarea 8.x). Reloj inyectable.
const SECRET = 'test-only-hmac-secret-0123456789abcdef';
const POLICY: LimiterPolicy = { maxFailures: 3, windowMs: 60_000, blockMs: 120_000 };
const T0 = new Date('2026-10-28T10:00:00.000Z');
const at = (ms: number) => new Date(T0.getTime() + ms);
const SUBJECT = '203.0.113.7';
let prisma: PrismaClient;
let clock = T0;
const limiter = () => createLimiter({ db: prisma, hmacSecret: SECRET, now: () => clock });

beforeAll(() => {
  prisma = appPrisma();
});
afterAll(async () => {
  await prisma.$disconnect();
});
beforeEach(async () => {
  clock = T0;
  await resetTestDatabase();
});

describe('ventana, umbral, bloqueo y expiración', () => {
  it('no bloquea antes del umbral y bloquea al alcanzarlo', async () => {
    const l = limiter();
    expect(await l.isBlocked(SUBJECT, 'PUBLIC_TRACKING')).toEqual({ status: 'allowed' });
    expect(await l.recordFailure(SUBJECT, 'PUBLIC_TRACKING', POLICY)).toEqual({ status: 'allowed' });
    clock = at(1_000);
    expect(await l.recordFailure(SUBJECT, 'PUBLIC_TRACKING', POLICY)).toEqual({ status: 'allowed' });
    clock = at(2_000);
    const third = await l.recordFailure(SUBJECT, 'PUBLIC_TRACKING', POLICY);
    expect(third).toEqual({ status: 'blocked', blockedUntil: at(2_000 + POLICY.blockMs) });
    expect(await l.isBlocked(SUBJECT, 'PUBLIC_TRACKING')).toEqual({ status: 'blocked', blockedUntil: at(2_000 + POLICY.blockMs) });
  });

  it('un fallo con el bloqueo vigente no lo extiende ni suma', async () => {
    const l = limiter();
    for (const ms of [0, 1_000, 2_000]) {
      clock = at(ms);
      await l.recordFailure(SUBJECT, 'PUBLIC_TRACKING', POLICY);
    }
    clock = at(30_000);
    expect(await l.recordFailure(SUBJECT, 'PUBLIC_TRACKING', POLICY)).toEqual({ status: 'blocked', blockedUntil: at(2_000 + POLICY.blockMs) });
  });

  it('el bloqueo expira y el contador se reinicia', async () => {
    const l = limiter();
    for (const ms of [0, 1_000, 2_000]) {
      clock = at(ms);
      await l.recordFailure(SUBJECT, 'PUBLIC_TRACKING', POLICY);
    }
    clock = at(2_000 + POLICY.blockMs + 1);
    expect(await l.isBlocked(SUBJECT, 'PUBLIC_TRACKING')).toEqual({ status: 'allowed' });
    // Tras expirar, vuelven a hacer falta 3 fallos para bloquear.
    expect(await l.recordFailure(SUBJECT, 'PUBLIC_TRACKING', POLICY)).toEqual({ status: 'allowed' });
    clock = at(2_000 + POLICY.blockMs + 2);
    expect(await l.recordFailure(SUBJECT, 'PUBLIC_TRACKING', POLICY)).toEqual({ status: 'allowed' });
  });

  it('la ventana vencida reinicia el contador (fallos espaciados no bloquean)', async () => {
    const l = limiter();
    for (const ms of [0, 61_000, 122_000, 183_000]) {
      clock = at(ms);
      expect(await l.recordFailure(SUBJECT, 'PUBLIC_TRACKING', POLICY), `t=${ms}`).toEqual({ status: 'allowed' });
    }
  });

  it('las superficies y los sujetos son independientes', async () => {
    const l = limiter();
    for (const ms of [0, 1_000, 2_000]) {
      clock = at(ms);
      await l.recordFailure(SUBJECT, 'PUBLIC_TRACKING', POLICY);
    }
    expect((await l.isBlocked(SUBJECT, 'ADMIN_LOGIN')).status).toBe('allowed');
    expect((await l.isBlocked('198.51.100.9', 'PUBLIC_TRACKING')).status).toBe('allowed');
  });

  it('con maxFailures = 1 el primer fallo ya bloquea', async () => {
    const decision = await limiter().recordFailure(SUBJECT, 'ADMIN_LOGIN', { maxFailures: 1, windowMs: 60_000, blockMs: 10_000 });
    expect(decision).toEqual({ status: 'blocked', blockedUntil: at(10_000) });
  });
});

describe('concurrencia con conexiones reales', () => {
  it('los fallos simultáneos se cuentan sin perder ninguno', async () => {
    const l = limiter();
    const policy: LimiterPolicy = { maxFailures: 5, windowMs: 60_000, blockMs: 60_000 };
    const results = await Promise.all(Array.from({ length: 5 }, () => l.recordFailure(SUBJECT, 'ADMIN_LOGIN', policy)));
    expect(results.every((r) => r.status !== 'unavailable')).toBe(true);
    expect((await l.isBlocked(SUBJECT, 'ADMIN_LOGIN')).status).toBe('blocked');
    const owner = await ownerPg();
    try {
      const rows = await owner.query('SELECT failure_count FROM rate_limit_buckets');
      expect(rows.rows).toEqual([{ failure_count: 5 }]);
    } finally {
      await owner.end();
    }
  });
});

describe('privacidad del almacén', () => {
  it('guarda solo el HMAC del sujeto: nunca la IP en claro', async () => {
    await limiter().recordFailure(SUBJECT, 'PUBLIC_TRACKING', POLICY);
    const owner = await ownerPg();
    try {
      const rows = await owner.query('SELECT subject_key FROM rate_limit_buckets');
      expect(rows.rows).toEqual([{ subject_key: subjectKey(SECRET, SUBJECT) }]);
      const dump = JSON.stringify((await owner.query('SELECT * FROM rate_limit_buckets')).rows);
      expect(dump).not.toContain(SUBJECT);
      expect(dump).not.toContain(SECRET);
    } finally {
      await owner.end();
    }
  });
});

describe('fallo cerrado ante la caída del almacén', () => {
  it('devuelve unavailable (nunca allowed) cuando la tabla no es alcanzable', async () => {
    const owner = await ownerPg();
    try {
      await owner.query('ALTER TABLE rate_limit_buckets RENAME TO rate_limit_buckets_off');
      const l = limiter();
      try {
        expect(await l.isBlocked(SUBJECT, 'PUBLIC_TRACKING')).toEqual({ status: 'unavailable' });
        expect(await l.recordFailure(SUBJECT, 'PUBLIC_TRACKING', POLICY)).toEqual({ status: 'unavailable' });
      } finally {
        await owner.query('ALTER TABLE rate_limit_buckets_off RENAME TO rate_limit_buckets');
      }
    } finally {
      await owner.end();
    }
  });
});

describe('limpieza oportunista acotada', () => {
  it('elimina solo filas con ventana y bloqueo vencidos, respetando el tope, y no toca bloqueos vigentes', async () => {
    const l = limiter();
    // Bloqueado y vigente.
    for (const ms of [0, 1_000, 2_000]) {
      clock = at(ms);
      await l.recordFailure('bloqueado', 'PUBLIC_TRACKING', POLICY);
    }
    // Tres sujetos con un fallo viejo (ventana vencida más adelante).
    clock = at(0);
    for (const subject of ['viejo-1', 'viejo-2', 'viejo-3']) await l.recordFailure(subject, 'PUBLIC_TRACKING', POLICY);
    // Un sujeto reciente (ventana vigente).
    clock = at(110_000);
    await l.recordFailure('reciente', 'PUBLIC_TRACKING', POLICY);

    clock = at(115_000); // viejos: ventana vencida; bloqueado: vigente hasta 122 s; reciente: ventana vigente
    expect(await l.cleanupExpired('PUBLIC_TRACKING', POLICY.windowMs, 2)).toBe(2); // tope
    expect(await l.cleanupExpired('PUBLIC_TRACKING', POLICY.windowMs, 10)).toBe(1); // el viejo restante

    const owner = await ownerPg();
    try {
      const remaining = (await owner.query('SELECT subject_key FROM rate_limit_buckets')).rows.map((r) => r.subject_key).sort();
      expect(remaining).toEqual([subjectKey(SECRET, 'bloqueado'), subjectKey(SECRET, 'reciente')].sort());
    } finally {
      await owner.end();
    }
    expect((await l.isBlocked('bloqueado', 'PUBLIC_TRACKING')).status).toBe('blocked');
  });
});

describe('recordFailureWithCleanup sobre PostgreSQL real (CR-001)', () => {
  it('registra el fallo y elimina los cubos vencidos sin tocar el cubo recién registrado ni los bloqueos vigentes', async () => {
    const l = limiter();
    clock = at(0);
    await l.recordFailure('viejo', 'PUBLIC_TRACKING', POLICY);
    for (const ms of [0, 1_000, 2_000]) {
      clock = at(ms);
      await l.recordFailure('bloqueado', 'PUBLIC_TRACKING', POLICY);
    }
    clock = at(100_000); // 'viejo': ventana vencida; 'bloqueado': bloqueo vigente hasta 122 s
    expect(await recordFailureWithCleanup(l, 'nuevo', 'PUBLIC_TRACKING', POLICY)).toEqual({ status: 'allowed' });

    const owner = await ownerPg();
    try {
      const remaining = (await owner.query('SELECT subject_key FROM rate_limit_buckets')).rows.map((r) => r.subject_key).sort();
      expect(remaining).toEqual([subjectKey(SECRET, 'bloqueado'), subjectKey(SECRET, 'nuevo')].sort());
    } finally {
      await owner.end();
    }
  });
});
