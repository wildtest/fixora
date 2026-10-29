import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  describeTarget,
  parseArgs,
  provisionAdmin,
  resolveDirectUrl,
  runProvision,
  type ProvisionIo,
  type Queryable,
} from '../../scripts/admin-provision.ts';
import { parseHash, verifyPassword } from '../../src/infrastructure/security/password-hash.ts';

// Aprovisionamiento del administrador (CHG-08, D14): sin base de datos, con un cliente falso y valores canario.
// Las URL son de pruebas con credenciales FICTICIAS «canary».

const CANARY_PASSWORD = 'CANARY-contraseña-que-no-debe-aparecer';
const OWNER_URL = 'postgresql://owner_canary:canary-secret@ep-quiet-sun-123456.sa-east-1.aws.neon.tech/neondb?sslmode=verify-full';

type Recorded = { sql: string; params: unknown[] | undefined };

function fakeDb(existing: { id: string }[] = []) {
  const recorded: Recorded[] = [];
  const db: Queryable = {
    async query(sql, params) {
      recorded.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
      return { rows: sql.startsWith('SELECT id FROM admin_users') ? existing : [] };
    },
  };
  return { db, recorded };
}

describe('provisionAdmin', () => {
  it('crea al administrador con el correo normalizado y un hash scrypt (nunca el texto claro)', async () => {
    const { db, recorded } = fakeDb();
    const outcome = await provisionAdmin(db, { email: '  Admin@Taller.EXAMPLE ', password: CANARY_PASSWORD });
    expect(outcome).toBe('created');
    const insert = recorded.find((r) => r.sql.startsWith('INSERT INTO admin_users'));
    expect(insert).toBeDefined();
    const [, email, hash] = insert!.params as [string, string, string];
    expect(email).toBe('admin@taller.example');
    expect(hash).not.toContain('CANARY');
    expect(parseHash(hash)).toMatchObject({ ln: 17, r: 8, p: 1 });
    expect(await verifyPassword(CANARY_PASSWORD, hash)).toBe(true); // el mismo hasheador que el login
    expect(recorded.map((r) => r.sql.split(' ')[0])).toEqual(['BEGIN', 'SELECT', 'INSERT', 'COMMIT']);
  });

  it('si ya existe, ROTA la credencial (singleton) e invalida todas las sesiones', async () => {
    const { db, recorded } = fakeDb([{ id: 'admin-1' }]);
    expect(await provisionAdmin(db, { email: 'nuevo@taller.example', password: CANARY_PASSWORD })).toBe('rotated');
    const sqls = recorded.map((r) => r.sql);
    expect(sqls.some((s) => s.startsWith('INSERT'))).toBe(false);
    expect(sqls.some((s) => s.startsWith('UPDATE admin_users'))).toBe(true);
    const wipe = recorded.find((r) => r.sql.startsWith('DELETE FROM admin_sessions'));
    expect(wipe?.params).toEqual(['admin-1']);
  });

  it('aplica la política de 15 a 128 caracteres, que admite espacios y Unicode', async () => {
    const { db } = fakeDb();
    await expect(provisionAdmin(db, { email: 'a@b.example', password: 'a'.repeat(14) })).rejects.toThrow(/entre 15 y 128/);
    await expect(provisionAdmin(db, { email: 'a@b.example', password: 'a'.repeat(129) })).rejects.toThrow(/entre 15 y 128/);
    await expect(provisionAdmin(db, { email: 'a@b.example', password: '  ñandú 😀 con espacios  ' })).resolves.toBe('created');
  });

  it('rechaza correos inválidos y hace ROLLBACK si la base falla', async () => {
    await expect(provisionAdmin(fakeDb().db, { email: 'sin-arroba', password: CANARY_PASSWORD })).rejects.toThrow(/correo/);
    const recorded: string[] = [];
    const failing: Queryable = {
      async query(sql) {
        recorded.push(sql.split(' ')[0]!);
        if (sql.startsWith('INSERT')) throw new Error('violación del singleton');
        return { rows: [] };
      },
    };
    await expect(provisionAdmin(failing, { email: 'a@b.example', password: CANARY_PASSWORD })).rejects.toThrow('singleton');
    expect(recorded).toEqual(['BEGIN', 'SELECT', 'INSERT', 'ROLLBACK']);
  });
});

describe('línea de comandos', () => {
  it('exige entorno y correo válidos; el correo se normaliza', () => {
    expect(parseArgs(['--environment=production', '--email= Admin@X.EXAMPLE '])).toEqual({ environment: 'production', email: 'admin@x.example' });
    expect(() => parseArgs(['--email=a@b.example'])).toThrow(/--environment/);
    expect(() => parseArgs(['--environment=staging', '--email=a@b.example'])).toThrow(/--environment/);
    expect(() => parseArgs(['--environment=test'])).toThrow(/--email/);
    // La contraseña NUNCA se acepta por argumento.
    expect(() => parseArgs(['--environment=test', '--email=a@b.example', '--password=x'])).not.toThrow();
    expect(parseArgs(['--environment=test', '--email=a@b.example', '--password=x'])).not.toHaveProperty('password');
  });

  it('usa DIRECT_URL (development/production) o TEST_DIRECT_URL (test), solo conexiones directas', () => {
    const env = { DIRECT_URL: OWNER_URL, TEST_DIRECT_URL: OWNER_URL.replace('quiet-sun', 'test-moon') };
    expect(resolveDirectUrl('development', env)).toBe(env.DIRECT_URL);
    expect(resolveDirectUrl('production', env)).toBe(env.DIRECT_URL);
    expect(resolveDirectUrl('test', env)).toBe(env.TEST_DIRECT_URL);
    expect(() => resolveDirectUrl('production', {})).toThrow(/DIRECT_URL/);
    expect(() => resolveDirectUrl('production', { DIRECT_URL: OWNER_URL.replace('ep-quiet', 'ep-quiet-pooler').replace('-123456', '-123456-pooler') })).toThrow();
  });

  it('describe el destino ocultando el identificador del endpoint y sin credenciales', () => {
    const target = describeTarget(OWNER_URL);
    expect(target).toBe('ep-<ID>.sa-east-1.aws.neon.tech / neondb');
    expect(target).not.toMatch(/canary|owner_|123456/);
  });
});

function io(answers: { line: string; passwords: string[] }, db: Queryable) {
  const out: string[] = [];
  const passwords = [...answers.passwords];
  let ended = 0;
  const impl: ProvisionIo = {
    write: (line) => out.push(line),
    readLine: async () => answers.line,
    readPassword: async () => passwords.shift() ?? '',
    connect: async () => ({ ...db, end: async () => void (ended += 1) }),
  };
  return { impl, out, ended: () => ended };
}

describe('runProvision', () => {
  const env = { DIRECT_URL: OWNER_URL };
  const argv = ['--environment=production', '--email=admin@taller.example'];

  it('muestra entorno, destino y administrador; con confirmación crea, y nunca imprime contraseña, hash ni URL', async () => {
    const { db, recorded } = fakeDb();
    const { impl, out, ended } = io({ line: 'PRODUCTION', passwords: [CANARY_PASSWORD, CANARY_PASSWORD] }, db);
    expect(await runProvision(argv, env, impl)).toBe(0);
    expect(out[0]).toBe('Entorno: PRODUCTION');
    expect(out[1]).toContain('ep-<ID>');
    expect(out.at(-1)).toBe('Administrador creado.');
    const everything = out.join('\n') + JSON.stringify(recorded.filter((r) => !r.sql.startsWith('INSERT')));
    expect(everything).not.toMatch(/CANARY|scrypt\$|canary-secret|owner_canary|postgresql:/);
    expect(ended()).toBe(1);
  });

  it('sin la confirmación exacta del entorno no hace ningún cambio ni se conecta', async () => {
    const { db, recorded } = fakeDb();
    const { impl, out } = io({ line: 'production', passwords: [CANARY_PASSWORD, CANARY_PASSWORD] }, db);
    expect(await runProvision(argv, env, impl)).toBe(1);
    expect(out.at(-1)).toMatch(/Cancelado/);
    expect(recorded).toEqual([]);
  });

  it('contraseña fuera de política o que no coincide: no hace ningún cambio y no la repite', async () => {
    for (const passwords of [['corta', 'corta'], [CANARY_PASSWORD, CANARY_PASSWORD + 'x']]) {
      const { db, recorded } = fakeDb();
      const { impl, out } = io({ line: 'PRODUCTION', passwords }, db);
      expect(await runProvision(argv, env, impl)).toBe(1);
      expect(recorded).toEqual([]);
      expect(out.join('\n')).not.toContain('CANARY');
    }
  });

  it('configuración ausente o argumentos inválidos: error que nombra la variable, no su valor', async () => {
    const { db } = fakeDb();
    const first = io({ line: 'PRODUCTION', passwords: [] }, db);
    expect(await runProvision(argv, {}, first.impl)).toBe(2);
    expect(first.out.join('\n')).toContain('DIRECT_URL');
    const second = io({ line: 'PRODUCTION', passwords: [] }, db);
    expect(await runProvision(['--email=a@b.example'], env, second.impl)).toBe(1);
  });
});

describe('el script operativo', () => {
  it('no es un endpoint ni parte del runtime: ningún archivo de src/ lo importa y no hay ruta de aprovisionamiento', () => {
    const source = readFileSync(new URL('../../scripts/admin-provision.ts', import.meta.url), 'utf8');
    expect(source).toContain("from '../src/infrastructure/security/password-hash.ts'");
    expect(source).not.toMatch(/process\.argv.*password/i);
    expect(source).not.toMatch(/console\.log/);
  });
});
