import { describe, expect, it, vi } from 'vitest';
import type { ActionResult } from '../action-result';
import { guardAdminAction } from './admin-action';
import { issueAdminContext } from './admin-context';
import { cookieSettingsFor, DEV_COOKIE_NAME, HOST_COOKIE_NAME } from './session-cookie';
import { createSessionService, type SessionStore } from './session-service';
import {
  LOGIN_POLICY,
  signIn,
  type LimiterDecision,
  type PasswordCheck,
  type SignInDependencies,
  type SignInEvent,
} from './sign-in';

const ADMIN = { id: 'admin-1', passwordHash: 'hash-ficticio' };
const allowed: LimiterDecision = { status: 'allowed' };

type Overrides = Partial<SignInDependencies>;

function setup(overrides: Overrides = {}) {
  const events: SignInEvent[] = [];
  const calls = { check: 0, dummy: 0, find: 0, issue: 0, failures: 0 };
  const dependencies: SignInDependencies = {
    isBlocked: async () => allowed,
    recordFailure: async () => {
      calls.failures += 1;
      return allowed;
    },
    findAdminByEmail: async (email) => {
      calls.find += 1;
      return email === 'admin@taller.example' ? ADMIN : null;
    },
    dummyHash: async () => {
      calls.dummy += 1;
      return 'hash-ficticio-equivalente';
    },
    checkPassword: async (password, hash): Promise<PasswordCheck> => {
      calls.check += 1;
      return hash === ADMIN.passwordHash && password === 'contraseña correcta 123' ? 'valid' : 'invalid';
    },
    issueSession: async () => {
      calls.issue += 1;
      return 'token-crudo';
    },
    onEvent: (event) => events.push(event),
    ...overrides,
  };
  return { dependencies, events, calls };
}

const good = { email: ' Admin@Taller.EXAMPLE ', password: 'contraseña correcta 123' };

describe('signIn', () => {
  it('política: 5 fallos en 15 minutos bloquean 15 minutos', () => {
    expect(LOGIN_POLICY).toEqual({ maxFailures: 5, windowMs: 15 * 60_000, blockMs: 15 * 60_000 });
  });

  it('credenciales correctas: crea la sesión y devuelve el token solo al adaptador', async () => {
    const { dependencies, calls, events } = setup();
    expect(await signIn(good, 'origen', dependencies)).toEqual({ ok: true, data: { sessionToken: 'token-crudo' } });
    expect(calls).toMatchObject({ issue: 1, failures: 0, dummy: 0 });
    expect(events).toEqual([]);
  });

  it('contraseña incorrecta y correo inexistente devuelven EXACTAMENTE el mismo resultado', async () => {
    const wrong = await signIn({ ...good, password: 'otra contraseña distinta' }, 'o', setup().dependencies);
    const unknown = setup();
    const missing = await signIn({ email: 'nadie@taller.example', password: 'otra contraseña distinta' }, 'o', unknown.dependencies);
    expect(wrong).toEqual({ ok: false, code: 'INVALID_CREDENTIALS' });
    expect(missing).toEqual(wrong);
    // El correo inexistente recorre la verificación contra el hash ficticio (reduce, no elimina, la diferencia de tiempo).
    expect(unknown.calls).toMatchObject({ dummy: 1, check: 1, failures: 1, issue: 0 });
  });

  it('un fallo cuenta contra el limitador y un acierto no', async () => {
    const fail = setup();
    await signIn({ ...good, password: 'otra contraseña distinta' }, 'o', fail.dependencies);
    expect(fail.calls.failures).toBe(1);
    expect(fail.events).toEqual(['auth.login.failed']);
    const ok = setup();
    await signIn(good, 'o', ok.dependencies);
    expect(ok.calls.failures).toBe(0);
  });

  it('entrada vacía, mal formada o enorme: el mismo resultado genérico, sin gastar scrypt ni consultar nada', async () => {
    for (const input of [
      { email: '', password: '' },
      { email: good.email, password: '' },
      { email: good.email, password: 'x'.repeat(129) },
      { email: good.email, password: 42 },
      { email: good.email, password: undefined },
    ]) {
      const { dependencies, calls } = setup();
      expect(await signIn(input, 'o', dependencies)).toEqual({ ok: false, code: 'INVALID_CREDENTIALS' });
      expect(calls).toMatchObject({ check: 0, find: 0, dummy: 0, failures: 1 });
    }
  });

  it('correo mal formado con contraseña aceptable recorre la verificación ficticia y falla igual', async () => {
    const { dependencies, calls } = setup();
    expect(await signIn({ email: 'sin-arroba', password: 'una contraseña' }, 'o', dependencies)).toEqual({
      ok: false,
      code: 'INVALID_CREDENTIALS',
    });
    expect(calls).toMatchObject({ find: 0, dummy: 1, check: 1 });
  });

  it('bloqueado: RATE_LIMITED sin ejecutar scrypt, ni con credenciales correctas, y sin contar más fallos', async () => {
    const { dependencies, calls, events } = setup({
      isBlocked: async () => ({ status: 'blocked', blockedUntil: new Date() }),
    });
    expect(await signIn(good, 'o', dependencies)).toEqual({ ok: false, code: 'RATE_LIMITED' });
    expect(calls).toMatchObject({ check: 0, find: 0, issue: 0, failures: 0 });
    expect(events).toEqual(['auth.rate_limited']);
  });

  it('limitador no disponible: falla cerrada con SERVICE_UNAVAILABLE, nunca INVALID_CREDENTIALS ni acceso', async () => {
    const { dependencies, calls, events } = setup({ isBlocked: async () => ({ status: 'unavailable' }) });
    expect(await signIn(good, 'o', dependencies)).toEqual({ ok: false, code: 'SERVICE_UNAVAILABLE' });
    expect(calls).toMatchObject({ check: 0, issue: 0 });
    expect(events).toEqual(['limiter.unavailable']);
  });

  it('si el limitador falla al registrar el fallo, SERVICE_UNAVAILABLE', async () => {
    const { dependencies } = setup({ recordFailure: async () => ({ status: 'unavailable' }) });
    expect(await signIn({ ...good, password: 'otra contraseña distinta' }, 'o', dependencies)).toEqual({
      ok: false,
      code: 'SERVICE_UNAVAILABLE',
    });
  });

  it('sistema saturado (busy): SERVICE_UNAVAILABLE, nunca credenciales inválidas, y no cuenta como fallo', async () => {
    const { dependencies, calls } = setup({ checkPassword: async () => 'busy' });
    expect(await signIn(good, 'o', dependencies)).toEqual({ ok: false, code: 'SERVICE_UNAVAILABLE' });
    expect(calls).toMatchObject({ failures: 0, issue: 0 });
  });

  it('un error inesperado se propaga (runAction lo convierte en INTERNAL_ERROR)', async () => {
    const { dependencies } = setup({
      issueSession: async () => {
        throw new Error('base de datos caída');
      },
    });
    await expect(signIn(good, 'o', dependencies)).rejects.toThrow('base de datos caída');
  });
});

describe('servicio de sesión', () => {
  const T0 = new Date('2026-10-28T10:00:00.000Z');
  const at = (ms: number) => new Date(T0.getTime() + ms);
  const MIN = 60_000;
  const TOKEN = 'A'.repeat(43);

  function sessionSetup(now: { value: Date }) {
    const rows = new Map<string, { id: string; adminUserId: string; lastSeenAt: Date; expiresAt: Date }>();
    const store: SessionStore = {
      createSession: async ({ id, adminUserId, tokenHash, now: created, expiresAt }) => {
        rows.set(tokenHash, { id, adminUserId, lastSeenAt: created, expiresAt });
      },
      findSessionByTokenHash: async (hash) => rows.get(hash) ?? null,
      touchSession: async (id, seen) => {
        for (const row of rows.values()) if (row.id === id) row.lastSeenAt = seen;
      },
      deleteSessionById: async (id) => {
        for (const [hash, row] of rows) if (row.id === id) rows.delete(hash);
      },
      deleteSessionByTokenHash: async (hash) => {
        rows.delete(hash);
      },
      deleteExpiredSessions: async () => 0,
    };
    let counter = 0;
    const service = createSessionService({
      store,
      now: () => now.value,
      newId: () => `id-${(counter += 1)}`,
      newToken: () => TOKEN,
      hashToken: (token) => `sha:${token}`,
    });
    return { service, rows };
  }

  it('crea la sesión persistiendo solo el hash del token y la expiración absoluta de 12 horas', async () => {
    const now = { value: T0 };
    const { service, rows } = sessionSetup(now);
    expect(await service.issue('admin-1')).toBe(TOKEN);
    expect([...rows.keys()]).toEqual([`sha:${TOKEN}`]);
    expect(rows.get(`sha:${TOKEN}`)?.expiresAt).toEqual(at(12 * 60 * MIN));
  });

  it('autentica una sesión válida y devuelve el contexto del administrador', async () => {
    const now = { value: T0 };
    const { service } = sessionSetup(now);
    await service.issue('admin-1');
    now.value = at(10 * MIN);
    expect(await service.authenticate(TOKEN)).toMatchObject({ adminId: 'admin-1' });
  });

  it('rechaza (null) cookie ausente, mal formada o inexistente, sin tocar el almacén en los dos primeros casos', async () => {
    const find = vi.fn(async () => null);
    const service = createSessionService({
      store: {
        createSession: async () => undefined,
        findSessionByTokenHash: find,
        touchSession: async () => undefined,
        deleteSessionById: async () => undefined,
        deleteSessionByTokenHash: async () => undefined,
        deleteExpiredSessions: async () => 0,
      },
      now: () => T0,
      newId: () => 'id',
      newToken: () => TOKEN,
      hashToken: (token) => `sha:${token}`,
    });
    expect(await service.authenticate(undefined)).toBeNull();
    expect(await service.authenticate('corto')).toBeNull();
    expect(await service.authenticate('!'.repeat(43))).toBeNull();
    expect(find).not.toHaveBeenCalled();
    expect(await service.authenticate('B'.repeat(43))).toBeNull(); // forma válida pero inexistente
    expect(find).toHaveBeenCalledTimes(1);
  });

  it('expira a los 60 minutos de inactividad y elimina la fila vencida', async () => {
    const now = { value: T0 };
    const { service, rows } = sessionSetup(now);
    await service.issue('admin-1');
    now.value = at(60 * MIN);
    expect(await service.authenticate(TOKEN)).toBeNull();
    expect(rows.size).toBe(0);
  });

  it('la actividad extiende la inactividad pero NUNCA el máximo absoluto de 12 horas', async () => {
    const now = { value: T0 };
    const { service } = sessionSetup(now);
    await service.issue('admin-1');
    // Actividad cada 50 minutos: siempre dentro de la inactividad.
    for (let minutes = 50; minutes < 12 * 60; minutes += 50) {
      now.value = at(minutes * MIN);
      expect(await service.authenticate(TOKEN), `minuto ${minutes}`).not.toBeNull();
    }
    now.value = at(12 * 60 * MIN);
    expect(await service.authenticate(TOKEN)).toBeNull();
  });

  it('throttling: la actividad no se persiste en cada petición', async () => {
    const now = { value: T0 };
    const { service, rows } = sessionSetup(now);
    await service.issue('admin-1');
    now.value = at(10_000);
    await service.authenticate(TOKEN);
    expect(rows.get(`sha:${TOKEN}`)?.lastSeenAt).toEqual(T0);
    now.value = at(61_000);
    await service.authenticate(TOKEN);
    expect(rows.get(`sha:${TOKEN}`)?.lastSeenAt).toEqual(at(61_000));
  });

  it('revocar elimina la fila, es idempotente y tolera tokens ausentes o mal formados', async () => {
    const now = { value: T0 };
    const { service, rows } = sessionSetup(now);
    await service.issue('admin-1');
    await service.revoke(TOKEN);
    expect(rows.size).toBe(0);
    await expect(service.revoke(TOKEN)).resolves.toBeUndefined();
    await expect(service.revoke(undefined)).resolves.toBeUndefined();
    await expect(service.revoke('basura')).resolves.toBeUndefined();
    expect(await service.authenticate(TOKEN)).toBeNull();
  });
});

describe('guardAdminAction (patrón de acción administrativa)', () => {
  type Code = 'STALE';

  it('sin sesión válida NO ejecuta el trabajo y devuelve SESSION_EXPIRED', async () => {
    const work = vi.fn(async (): Promise<ActionResult<string, Code>> => ({ ok: true, data: 'x' }));
    expect(await guardAdminAction(async () => null, work)).toEqual({ ok: false, code: 'SESSION_EXPIRED' });
    expect(work).not.toHaveBeenCalled();
  });

  it('con sesión válida ejecuta el trabajo con el contexto y propaga su resultado', async () => {
    const admin = issueAdminContext('admin-1');
    const work = vi.fn(async (): Promise<ActionResult<string, Code>> => ({ ok: false, code: 'STALE' }));
    expect(await guardAdminAction(async () => admin, work)).toEqual({ ok: false, code: 'STALE' });
    expect(work).toHaveBeenCalledWith(admin);
  });

  it('el contexto de administrador es inmutable', () => {
    const admin = issueAdminContext('admin-1');
    expect(Object.isFrozen(admin)).toBe(true);
  });
});

describe('cookie de sesión', () => {
  it('producción: __Host-, HttpOnly, Secure, SameSite=Strict, Path=/ y sin Domain, Max-Age ni Expires', () => {
    const { name, options } = cookieSettingsFor('production');
    expect(name).toBe(HOST_COOKIE_NAME);
    expect(options).toEqual({ httpOnly: true, secure: true, sameSite: 'strict', path: '/' });
    expect(Object.keys(options)).not.toEqual(expect.arrayContaining(['domain', 'maxAge', 'expires']));
  });

  it('desarrollo local: nombre y Secure compatibles con localhost, sin degradar HttpOnly ni SameSite', () => {
    const { name, options } = cookieSettingsFor('development');
    expect(name).toBe(DEV_COOKIE_NAME);
    expect(options).toMatchObject({ httpOnly: true, secure: false, sameSite: 'strict', path: '/' });
  });

  it('las pruebas usan la configuración endurecida de producción', () => {
    expect(cookieSettingsFor('test')).toEqual(cookieSettingsFor('production'));
  });
});
