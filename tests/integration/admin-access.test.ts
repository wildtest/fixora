import { createHash, randomBytes } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type pg from 'pg';
import { provisionAdmin } from '../../scripts/admin-provision.ts';
import { createAdminStore } from '../../src/infrastructure/admin/admin-store';
import { createSessionService } from '../../src/application/admin/session-service';
import {
  LOGIN_POLICY,
  signIn,
  type SignInDependencies,
  type SignInEvent,
} from '../../src/application/admin/sign-in';
import type { PrismaClient } from '../../src/infrastructure/db/generated/client.ts';
import { createLimiter } from '../../src/infrastructure/limiter/limiter';
import { dummyHash, verifyPassword } from '../../src/infrastructure/security/password-hash';
import { createGate } from '../../src/infrastructure/security/scrypt-gate';
import { registeredActions, type MatrixContext } from './support/admin-action-matrix';
import { appPg, appPrisma, ownerPg } from './support/connections';
import { insertOrder } from './support/fixtures';
import { resetTestDatabase } from './support/reset';

// Acceso administrativo contra PostgreSQL real con el rol de aplicación (CHG-08). Sin mocks de Prisma. Reloj
// inyectable. Administrador FICTICIO; las contraseñas son datos de prueba de la rama aislada `test`.
const SECRET = 'test-only-hmac-secret-0123456789abcdef';
const EMAIL = 'admin@taller.example';
const PASSWORD = '  Contraseña ficticia de prueba 123  ';
const SUBJECT = '203.0.113.50';
const T0 = new Date('2026-10-28T10:00:00.000Z');
const MIN = 60_000;
const at = (ms: number) => new Date(T0.getTime() + ms);
const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

let prisma: PrismaClient;
let owner: pg.Client;
let clock = T0;
let adminId: string;

function services(options: { limiterDb?: Pick<PrismaClient, '$queryRaw' | '$executeRaw'>; gate?: ReturnType<typeof createGate> } = {}) {
  const store = createAdminStore(prisma);
  const sessions = createSessionService({
    store,
    now: () => clock,
    newId: () => crypto.randomUUID(),
    newToken: () => randomBytes(32).toString('base64url'),
    hashToken: sha256,
  });
  const limiter = createLimiter({ db: options.limiterDb ?? prisma, hmacSecret: SECRET, now: () => clock });
  const gate = options.gate ?? createGate();
  const events: SignInEvent[] = [];
  const counters = { scrypt: 0 };
  const dependencies: SignInDependencies = {
    isBlocked: (subject) => limiter.isBlocked(subject, 'ADMIN_LOGIN'),
    recordFailure: (subject) => limiter.recordFailure(subject, 'ADMIN_LOGIN', LOGIN_POLICY),
    findAdminByEmail: (email) => store.findAdminByEmail(email),
    dummyHash,
    checkPassword: async (password, hash) => {
      const result = await gate.run(async () => {
        counters.scrypt += 1;
        return verifyPassword(password, hash);
      });
      if (result.status === 'busy') return 'busy';
      return result.value ? 'valid' : 'invalid';
    },
    issueSession: (id) => sessions.issue(id),
    onEvent: (event) => events.push(event),
  };
  return { store, sessions, limiter, dependencies, events, counters };
}

beforeAll(async () => {
  prisma = appPrisma();
  owner = await ownerPg();
});
afterAll(async () => {
  await prisma.$disconnect();
  await owner.end();
});
beforeEach(async () => {
  clock = T0;
  await resetTestDatabase();
  await provisionAdmin(owner, { email: EMAIL, password: PASSWORD, now: T0 });
  adminId = String((await owner.query('SELECT id FROM admin_users')).rows[0]!.id);
});

async function login(deps: SignInDependencies, password = PASSWORD, email = EMAIL, subject = SUBJECT) {
  return signIn({ email, password }, subject, deps);
}

describe('inicio de sesión y persistencia de la sesión', () => {
  it('credenciales correctas (contraseña exacta, correo normalizado): crea una sesión; solo persiste SHA-256 del token', async () => {
    const { dependencies } = services();
    const result = await login(dependencies, PASSWORD, `  ${EMAIL.toUpperCase()} `);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const token = result.data.sessionToken;
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const { rows } = await owner.query('SELECT token_hash, created_at, last_seen_at, expires_at, admin_user_id FROM admin_sessions');
    expect(rows).toHaveLength(1);
    expect(rows[0]!.token_hash).toBe(sha256(token));
    expect(rows[0]!.token_hash).not.toBe(token);
    expect(JSON.stringify(rows)).not.toContain(token);
    expect(rows[0]!.admin_user_id).toBe(adminId);
    expect((rows[0]!.expires_at as Date).getTime() - (rows[0]!.created_at as Date).getTime()).toBe(12 * 60 * MIN);
  });

  it('la contraseña se compara EXACTAMENTE: sin recortar espacios ni cambiar mayúsculas', async () => {
    const { dependencies } = services();
    for (const wrong of [PASSWORD.trim(), PASSWORD.toLowerCase(), PASSWORD.toUpperCase(), `${PASSWORD} `]) {
      expect(await login(dependencies, wrong)).toEqual({ ok: false, code: 'INVALID_CREDENTIALS' });
    }
    expect((await login(dependencies, PASSWORD)).ok).toBe(true);
  });

  it('cada inicio de sesión crea una sesión nueva e independiente', async () => {
    const { dependencies } = services();
    const [a, b] = [await login(dependencies), await login(dependencies)];
    expect(a.ok && b.ok && a.data.sessionToken !== b.data.sessionToken).toBe(true);
    expect((await owner.query('SELECT 1 FROM admin_sessions')).rowCount).toBe(2);
  });

  it('contraseña incorrecta y correo inexistente: la MISMA clasificación pública, ambos recorren scrypt y ambos cuentan', async () => {
    const { dependencies, counters, events } = services();
    const wrong = await login(dependencies, 'contraseña incorrecta del administrador');
    const unknown = await login(dependencies, 'contraseña incorrecta del administrador', 'nadie@taller.example');
    expect(wrong).toEqual({ ok: false, code: 'INVALID_CREDENTIALS' });
    expect(unknown).toEqual(wrong);
    expect(counters.scrypt).toBe(2); // el correo inexistente verifica contra el hash ficticio
    expect(events).toEqual(['auth.login.failed', 'auth.login.failed']);
    const bucket = await owner.query("SELECT failure_count FROM rate_limit_buckets WHERE surface = 'ADMIN_LOGIN'");
    expect(bucket.rows[0]!.failure_count).toBe(2);
    expect((await owner.query('SELECT 1 FROM admin_sessions')).rowCount).toBe(0);
  });

  it('entrada vacía o enorme: el mismo resultado genérico sin ejecutar scrypt', async () => {
    const { dependencies, counters } = services();
    for (const password of ['', 'x'.repeat(129)]) {
      expect(await login(dependencies, password)).toEqual({ ok: false, code: 'INVALID_CREDENTIALS' });
    }
    expect(counters.scrypt).toBe(0);
  });
});

describe('limitador de acceso (5 fallos / 15 min / bloqueo 15 min)', () => {
  it('bloquea al 5.º fallo; un origen bloqueado con credenciales correctas no ejecuta scrypt ni inicia sesión', async () => {
    const { dependencies, counters, events } = services();
    for (let i = 0; i < 5; i += 1) {
      clock = at(i * 1000);
      expect(await login(dependencies, `mala ${i}`)).toEqual({ ok: false, code: 'INVALID_CREDENTIALS' });
    }
    const before = counters.scrypt;
    clock = at(6000);
    expect(await login(dependencies)).toEqual({ ok: false, code: 'RATE_LIMITED' });
    expect(counters.scrypt).toBe(before); // bloqueado: no se ejecuta scrypt
    expect(events.at(-1)).toBe('auth.rate_limited');
    expect((await owner.query('SELECT 1 FROM admin_sessions')).rowCount).toBe(0);
  });

  it('sin bloqueo permanente: pasados 15 minutos el administrador puede iniciar sesión', async () => {
    const { dependencies } = services();
    for (let i = 0; i < 5; i += 1) await login(dependencies, `mala ${i}`);
    expect(await login(dependencies)).toEqual({ ok: false, code: 'RATE_LIMITED' });
    clock = at(15 * MIN + 1);
    expect((await login(dependencies)).ok).toBe(true);
  });

  it('los aciertos no cuentan como fallo y otro origen no se ve afectado', async () => {
    const { dependencies } = services();
    for (let i = 0; i < 4; i += 1) await login(dependencies, `mala ${i}`);
    expect((await login(dependencies)).ok).toBe(true);
    expect((await login(dependencies, PASSWORD, EMAIL, '198.51.100.99')).ok).toBe(true);
    expect((await owner.query("SELECT failure_count FROM rate_limit_buckets WHERE surface = 'ADMIN_LOGIN'")).rows[0]!.failure_count).toBe(4);
  });

  it('falla cerrada: si el limitador no está disponible, SERVICE_UNAVAILABLE (nunca credenciales inválidas) y sin sesión', async () => {
    const broken = {
      $queryRaw: () => Promise.reject(new Error('base de datos caída')),
      $executeRaw: () => Promise.reject(new Error('base de datos caída')),
    } as unknown as Pick<PrismaClient, '$queryRaw' | '$executeRaw'>;
    const { dependencies, counters, events } = services({ limiterDb: broken });
    expect(await login(dependencies)).toEqual({ ok: false, code: 'SERVICE_UNAVAILABLE' });
    expect(counters.scrypt).toBe(0);
    expect(events).toEqual(['limiter.unavailable']);
    expect((await owner.query('SELECT 1 FROM admin_sessions')).rowCount).toBe(0);
  });

  it('sistema saturado: sin capacidad para otra verificación, SERVICE_UNAVAILABLE y no cuenta como fallo', async () => {
    const gate = createGate({ maxConcurrent: 1, maxQueued: 0, maxWaitMs: 10 });
    let release!: () => void;
    const held = gate.run(() => new Promise<void>((resolve) => (release = resolve)));
    const { dependencies } = services({ gate });
    expect(await login(dependencies)).toEqual({ ok: false, code: 'SERVICE_UNAVAILABLE' });
    expect((await owner.query("SELECT 1 FROM rate_limit_buckets WHERE surface = 'ADMIN_LOGIN'")).rowCount).toBe(0);
    release();
    await held;
    expect((await login(dependencies)).ok).toBe(true);
  });
});

describe('vigencia de la sesión (autoridad: PostgreSQL)', () => {
  async function newSession() {
    const { dependencies, sessions, store } = services();
    const result = await login(dependencies);
    if (!result.ok) throw new Error('el inicio de sesión de la prueba falló');
    return { token: result.data.sessionToken, sessions, store };
  }

  it('una sesión válida autoriza y devuelve el contexto del administrador', async () => {
    const { token, sessions } = await newSession();
    clock = at(10 * MIN);
    expect(await sessions.authenticate(token)).toMatchObject({ adminId });
  });

  it('expira por inactividad (60 min) aunque el navegador conserve la credencial, y se elimina la fila', async () => {
    const { token, sessions } = await newSession();
    clock = at(60 * MIN);
    expect(await sessions.authenticate(token)).toBeNull();
    expect((await owner.query('SELECT 1 FROM admin_sessions')).rowCount).toBe(0);
  });

  it('expira de forma absoluta a las 12 horas aunque haya habido actividad', async () => {
    const { token, sessions } = await newSession();
    for (let minutes = 50; minutes < 12 * 60; minutes += 50) {
      clock = at(minutes * MIN);
      expect(await sessions.authenticate(token), `minuto ${minutes}`).not.toBeNull();
    }
    clock = at(12 * 60 * MIN);
    expect(await sessions.authenticate(token)).toBeNull();
  });

  it('el rol de aplicación solo actualiza last_seen_at (con throttling); expires_at no cambia', async () => {
    const { token, sessions } = await newSession();
    const original = (await owner.query('SELECT expires_at, last_seen_at FROM admin_sessions')).rows[0]!;
    clock = at(10_000); // dentro del intervalo de throttling
    await sessions.authenticate(token);
    expect((await owner.query('SELECT last_seen_at FROM admin_sessions')).rows[0]!.last_seen_at).toEqual(original.last_seen_at);
    clock = at(5 * MIN);
    await sessions.authenticate(token);
    const after = (await owner.query('SELECT expires_at, last_seen_at FROM admin_sessions')).rows[0]!;
    expect(after.last_seen_at).toEqual(at(5 * MIN));
    expect(after.expires_at).toEqual(original.expires_at);
  });

  it('cookie inventada, forma válida pero inexistente, ausente o mal formada: no autoriza', async () => {
    const { sessions } = await newSession();
    for (const token of [randomBytes(32).toString('base64url'), 'A'.repeat(43), 'corto', '', undefined, 'x'.repeat(500)]) {
      expect(await sessions.authenticate(token), String(token).slice(0, 12)).toBeNull();
    }
  });

  it('sesión eliminada en el servidor: ya no autoriza', async () => {
    const { token, sessions } = await newSession();
    await owner.query('DELETE FROM admin_sessions');
    expect(await sessions.authenticate(token)).toBeNull();
  });

  it('cerrar sesión elimina la fila (idempotente) y deja de autorizar', async () => {
    const { token, sessions } = await newSession();
    await sessions.revoke(token);
    expect((await owner.query('SELECT 1 FROM admin_sessions')).rowCount).toBe(0);
    await expect(sessions.revoke(token)).resolves.toBeUndefined();
    expect(await sessions.authenticate(token)).toBeNull();
  });

  it('la limpieza oportunista elimina sesiones vencidas al crear una nueva, de forma acotada', async () => {
    const { sessions } = await newSession();
    clock = at(13 * 60 * MIN);
    const token = await sessions.issue(adminId);
    const rows = (await owner.query('SELECT token_hash FROM admin_sessions')).rows;
    expect(rows).toEqual([{ token_hash: sha256(token) }]);
  });
});

describe('autorización de acciones administrativas (SC-12, E10)', () => {
  let context: MatrixContext;

  beforeEach(async () => {
    const { sessions } = services();
    context = { prisma, owner, sessions, orderId: await insertOrder(owner) };
  });

  it('control positivo: con sesión válida la acción SÍ se ejecuta y recibe el contexto', async () => {
    const { dependencies } = services();
    const result = await login(dependencies);
    if (!result.ok) throw new Error('el inicio de sesión de la prueba falló');
    for (const action of registeredActions(context)) {
      const before = await action.snapshot();
      expect(await action.invoke(result.data.sessionToken), action.name).toEqual({ ok: true, data: { by: adminId } });
      expect(await action.snapshot(), action.name).not.toBe(before);
    }
  });

  it('sin sesión válida NINGUNA acción registrada se ejecuta: SESSION_EXPIRED, sin escritura ni estado parcial', async () => {
    const { dependencies } = services();
    const live = await login(dependencies);
    if (!live.ok) throw new Error('el inicio de sesión de la prueba falló');
    const expired = live.data.sessionToken;
    clock = at(61 * MIN);

    const invalid: Array<[string, string | undefined]> = [
      ['sin cookie', undefined],
      ['mal formada', 'basura'],
      ['inventada con forma válida', randomBytes(32).toString('base64url')],
      ['expirada', expired],
    ];
    for (const action of registeredActions(context)) {
      const before = await action.snapshot();
      for (const [label, token] of invalid) {
        expect(await action.invoke(token), `${action.name} — ${label}`).toEqual({ ok: false, code: 'SESSION_EXPIRED' });
        expect(await action.snapshot(), `${action.name} — ${label}`).toBe(before);
      }
    }

    // Eliminada en el servidor.
    clock = T0;
    const again = await login(dependencies);
    if (!again.ok) throw new Error('el inicio de sesión de la prueba falló');
    await owner.query('DELETE FROM admin_sessions');
    for (const action of registeredActions(context)) {
      const before = await action.snapshot();
      expect(await action.invoke(again.data.sessionToken), action.name).toEqual({ ok: false, code: 'SESSION_EXPIRED' });
      expect(await action.snapshot()).toBe(before);
    }
  });

  it('no existe una mutación de depuración ni un registro de acciones en el producto', async () => {
    const { readdirSync, readFileSync, statSync } = await import('node:fs');
    const { join } = await import('node:path');
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((entry) => {
        const path = join(dir, entry);
        if (entry === 'generated') return [];
        return statSync(path).isDirectory() ? walk(path) : [path];
      });
    const offenders = walk('src')
      .filter((file) => /\.(ts|tsx)$/.test(file) && !file.endsWith('.test.ts') && !file.endsWith('.test.tsx'))
      .filter((file) => /ADMIN_ACTION_MATRIX|registeredActions|exampleAdminAction/.test(readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]);
  });
});

describe('aprovisionamiento contra PostgreSQL real', () => {
  it('mantiene el singleton: aprovisionar de nuevo ROTA la credencial y NO crea otro administrador', async () => {
    const { dependencies } = services();
    const first = await login(dependencies);
    expect(first.ok).toBe(true);
    expect((await owner.query('SELECT 1 FROM admin_sessions')).rowCount).toBe(1);

    const rotated = await provisionAdmin(owner, { email: 'otro@taller.example', password: 'una contraseña nueva y larga 456', now: at(MIN) });
    expect(rotated).toBe('rotated');
    expect((await owner.query('SELECT 1 FROM admin_users')).rowCount).toBe(1);
    expect(String((await owner.query('SELECT id FROM admin_users')).rows[0]!.id)).toBe(adminId);
    // La rotación invalida TODAS las sesiones.
    expect((await owner.query('SELECT 1 FROM admin_sessions')).rowCount).toBe(0);

    // La contraseña anterior ya no sirve; la nueva sí.
    expect(await login(dependencies, PASSWORD)).toEqual({ ok: false, code: 'INVALID_CREDENTIALS' });
    expect((await login(dependencies, 'una contraseña nueva y larga 456', 'otro@taller.example')).ok).toBe(true);
  });

  it('el hash almacenado es scrypt versionado, sin texto claro', async () => {
    const { rows } = await owner.query('SELECT password_hash FROM admin_users');
    const stored = String(rows[0]!.password_hash);
    expect(stored).toMatch(/^scrypt\$v1\$ln=17,r=8,p=1\$/);
    expect(stored).not.toContain('Contraseña');
    expect(await verifyPassword(PASSWORD, stored)).toBe(true);
    expect(await verifyPassword(PASSWORD.trim(), stored)).toBe(false);
  });

  it('el rol runtime NUNCA crea, rota ni borra administradores (solo lectura de admin_users)', async () => {
    const app = await appPg();
    try {
      const statements = [
        "INSERT INTO admin_users (id, singleton, email, password_hash, created_at, updated_at) VALUES (gen_random_uuid(), true, 'x@y.example', 'h', now(), now())",
        "UPDATE admin_users SET password_hash = 'otro'",
        'DELETE FROM admin_users',
        "UPDATE admin_sessions SET expires_at = now() + interval '1 year'",
      ];
      for (const statement of statements) {
        await expect(app.query(statement), statement).rejects.toMatchObject({ code: '42501' });
      }
    } finally {
      await app.end();
    }
  });
});
