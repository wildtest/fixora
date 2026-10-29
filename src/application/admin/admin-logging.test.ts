import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLogger, type LogLevel } from '../../infrastructure/logging/logger';

// Logs del acceso administrativo (CHG-08, tarea 8.1): solo eventos del catálogo cerrado y NADA sensible. Se prueba
// con valores canario a través del logger real (lista positiva) para comprobar que ninguno llega a una línea.
const lines: string[] = [];

vi.mock('../../infrastructure/logging/server-logger', () => ({
  getLogger: () =>
    createLogger({
      sink: { write: (_level: LogLevel, line: string) => void lines.push(line) },
      now: () => new Date('2026-10-28T10:00:00.000Z'),
      debugEnabled: true,
    }),
}));

const { productionSignInDependencies, signInFromRequest } = await import('./admin-service');

const CANARY = {
  email: 'canary-correo@secreto.example',
  password: 'CANARY-CONTRASEÑA-SECRETA',
  ip: '203.0.113.77-CANARY-IP',
  token: 'CANARY-TOKEN-DE-SESION',
  hash: 'scrypt$v1$ln=17,r=8,p=1$CANARY-SAL$CANARY-CLAVE',
};

beforeEach(() => {
  lines.length = 0;
});

function dependencies(overrides: Partial<ReturnType<typeof productionSignInDependencies>>) {
  return () => ({
    ...productionSignInDependencies(),
    findAdminByEmail: async () => ({ id: 'admin-1', passwordHash: CANARY.hash }),
    dummyHash: async () => CANARY.hash,
    issueSession: async () => CANARY.token,
    ...overrides,
  });
}

async function attempt(overrides: Partial<ReturnType<typeof productionSignInDependencies>>) {
  return signInFromRequest({ email: CANARY.email, password: CANARY.password }, CANARY.ip, dependencies(overrides));
}

describe('registros del acceso administrativo', () => {
  it('un fallo emite auth.login.failed sin correo, contraseña, hash, token ni origen', async () => {
    await attempt({
      isBlocked: async () => ({ status: 'allowed' }),
      recordFailure: async () => ({ status: 'allowed' }),
      checkPassword: async () => 'invalid',
    });
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0]!)).toMatchObject({ event: 'auth.login.failed', surface: 'admin', level: 'warn' });
  });

  it('un bloqueo emite auth.rate_limited y la falla del limitador emite limiter.unavailable', async () => {
    await attempt({ isBlocked: async () => ({ status: 'blocked', blockedUntil: new Date() }) });
    await attempt({ isBlocked: async () => ({ status: 'unavailable' }) });
    expect(lines.map((line) => JSON.parse(line).event)).toEqual(['auth.rate_limited', 'limiter.unavailable']);
  });

  it('un inicio de sesión correcto NO se registra', async () => {
    const result = await attempt({
      isBlocked: async () => ({ status: 'allowed' }),
      checkPassword: async () => 'valid',
    });
    expect(result).toEqual({ ok: true, data: { sessionToken: CANARY.token } });
    expect(lines).toEqual([]);
  });

  it('ninguna línea contiene valores canario (correo, contraseña, hash, sal, token, IP, FormData)', async () => {
    await attempt({ isBlocked: async () => ({ status: 'allowed' }), recordFailure: async () => ({ status: 'allowed' }), checkPassword: async () => 'invalid' });
    await attempt({ isBlocked: async () => ({ status: 'blocked', blockedUntil: new Date() }) });
    await attempt({ isBlocked: async () => ({ status: 'unavailable' }) });
    await attempt({
      isBlocked: async () => ({ status: 'allowed' }),
      checkPassword: async () => {
        throw new Error(`fallo con ${CANARY.password} y ${CANARY.hash}`);
      },
    });
    const everything = lines.join('\n');
    expect(lines.length).toBeGreaterThanOrEqual(4);
    expect(everything).not.toMatch(/CANARY|canary|secreto\.example|scrypt\$|203\.0\.113/);
    for (const line of lines) {
      const entry = JSON.parse(line) as Record<string, unknown>;
      expect(Object.keys(entry).sort().every((key) => ['timestamp', 'level', 'event', 'requestId', 'surface', 'resultCode', 'routeType', 'errorName', 'errorCode', 'digest', 'environment', 'deploymentSha'].includes(key))).toBe(true);
    }
  });
});
