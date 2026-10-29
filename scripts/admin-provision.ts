// Aprovisionamiento y rotación del único administrador (CHG-08, D14; TD §26). Script OPERATIVO EXTERNO: no es un
// endpoint, ni una pantalla, ni parte del runtime. El rol runtime (`fixora_app`) solo LEE `admin_users`: la
// creación y la rotación las hace una credencial privilegiada separada (la del migrador de la rama).
//
//   node --env-file-if-exists=.env.local scripts/admin-provision.ts --environment=development --email=<correo>
//
// - La contraseña se pide de forma interactiva y oculta (nunca por argumento ni por variable de entorno), con la
//   política de 15 a 128 caracteres (admite espacios y Unicode), y se confirma dos veces.
// - Usa EXACTAMENTE el mismo hasheador y la misma normalización de correo que el login.
// - Mantiene el singleton (CHG-02): crea al administrador o, si ya existe, rota su credencial.
// - Al rotar invalida TODAS las sesiones. Es también el mecanismo de recuperación (RIE-10).
// - Muestra el destino (host con el identificador del endpoint ocultado, y base) y el entorno, y exige confirmar
//   escribiendo el nombre del entorno. Nunca imprime la contraseña, el hash ni la URL de conexión.
import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { isProvisionPasswordAcceptable, parseEmail, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../src/domain/admin/credentials.ts';
import { ConfigError, parseDatabaseUrl, requireDirect, requireVariable, type EnvSource } from '../src/infrastructure/config/database-url.ts';
import { hashPassword } from '../src/infrastructure/security/password-hash.ts';

export const ENVIRONMENTS = ['development', 'test', 'production'] as const;
export type Environment = (typeof ENVIRONMENTS)[number];

export type Queryable = { query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }> };
export type ProvisionOutcome = 'created' | 'rotated';

/** Crea o rota al único administrador en una transacción; al rotar invalida todas las sesiones. */
export async function provisionAdmin(
  db: Queryable,
  input: { readonly email: string; readonly password: string; readonly now?: Date },
): Promise<ProvisionOutcome> {
  const email = parseEmail(input.email);
  if (email === null) throw new Error('El correo no es válido.');
  if (!isProvisionPasswordAcceptable(input.password)) {
    throw new Error(`La contraseña debe tener entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres.`);
  }
  const hash = await hashPassword(input.password);
  const now = (input.now ?? new Date()).toISOString();

  await db.query('BEGIN');
  try {
    const existing = await db.query('SELECT id FROM admin_users FOR UPDATE');
    let outcome: ProvisionOutcome;
    if (existing.rows.length > 0) {
      const id = String(existing.rows[0]!.id);
      await db.query('UPDATE admin_users SET email = $2, password_hash = $3, updated_at = $4::timestamptz WHERE id = $1', [id, email, hash, now]);
      // Rotar la credencial invalida todas las sesiones existentes.
      await db.query('DELETE FROM admin_sessions WHERE admin_user_id = $1', [id]);
      outcome = 'rotated';
    } else {
      await db.query(
        'INSERT INTO admin_users (id, singleton, email, password_hash, created_at, updated_at) VALUES ($1, true, $2, $3, $4::timestamptz, $4::timestamptz)',
        [randomUUID(), email, hash, now],
      );
      outcome = 'created';
    }
    await db.query('COMMIT');
    return outcome;
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}

/** Destino legible sin secretos: el identificador del endpoint se oculta (`ep-<ID>`). */
export function describeTarget(url: string): string {
  const parsed = parseDatabaseUrl('DIRECT_URL', url);
  const host = parsed.host.replace(/^ep-[\w-]+/, 'ep-<ID>');
  return `${host} / ${parsed.database}`;
}

export type CliOptions = { readonly environment: Environment; readonly email: string };

export function parseArgs(argv: readonly string[]): CliOptions {
  const read = (name: string) => argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
  const environment = read('environment');
  if (!ENVIRONMENTS.some((candidate) => candidate === environment)) {
    throw new Error(`Falta --environment=<${ENVIRONMENTS.join('|')}>.`);
  }
  const email = parseEmail(read('email'));
  if (email === null) throw new Error('Falta --email=<correo válido>.');
  return { environment: environment as Environment, email };
}

export type ProvisionIo = {
  readonly write: (line: string) => void;
  readonly readPassword: (question: string) => Promise<string>;
  readonly readLine: (question: string) => Promise<string>;
  readonly connect: (url: string) => Promise<Queryable & { end(): Promise<void> }>;
};

/** `development`/`production` usan `DIRECT_URL`; `test` usa `TEST_DIRECT_URL` (solo la rama de pruebas). */
export function resolveDirectUrl(environment: Environment, env: EnvSource): string {
  const name = environment === 'test' ? 'TEST_DIRECT_URL' : 'DIRECT_URL';
  const value = requireVariable(env, name);
  requireDirect(name, value);
  return value;
}

export async function runProvision(argv: readonly string[], env: EnvSource, io: ProvisionIo): Promise<number> {
  let options: CliOptions;
  let url: string;
  try {
    options = parseArgs(argv);
    url = resolveDirectUrl(options.environment, env);
  } catch (error) {
    io.write(error instanceof Error ? error.message : 'Argumentos no válidos.');
    return error instanceof ConfigError ? 2 : 1;
  }

  const label = options.environment.toUpperCase();
  io.write(`Entorno: ${label}`);
  io.write(`Destino: ${describeTarget(url)}`);
  io.write(`Administrador: ${options.email}`);
  if ((await io.readLine(`Escribe ${label} para confirmar: `)).trim() !== label) {
    io.write('Cancelado: la confirmación no coincide. No se hizo ningún cambio.');
    return 1;
  }

  const password = await io.readPassword('Contraseña (15–128 caracteres): ');
  if (!isProvisionPasswordAcceptable(password)) {
    io.write(`La contraseña debe tener entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres. No se hizo ningún cambio.`);
    return 1;
  }
  if ((await io.readPassword('Repite la contraseña: ')) !== password) {
    io.write('Las contraseñas no coinciden. No se hizo ningún cambio.');
    return 1;
  }

  const client = await io.connect(url);
  try {
    const outcome = await provisionAdmin(client, { email: options.email, password });
    io.write(
      outcome === 'created'
        ? 'Administrador creado.'
        : 'Credencial del administrador rotada; todas las sesiones fueron invalidadas.',
    );
    return 0;
  } finally {
    await client.end();
  }
}

// --- Entrada de línea de comandos (fuera de las pruebas) --------------------------------------------------------

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: Boolean(process.stdin.isTTY) });
    let muted = false;
    const writer = rl as unknown as { _writeToOutput: (text: string) => void };
    const original = writer._writeToOutput.bind(rl);
    writer._writeToOutput = (text) => {
      if (!muted) original(text);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
    muted = true;
  });
}

function promptLine(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  const code = await runProvision(process.argv.slice(2), process.env, {
    write: (line) => process.stdout.write(`${line}\n`),
    readPassword: promptHidden,
    readLine: promptLine,
    connect: async (url) => {
      const client = new pg.Client({ connectionString: url });
      await client.connect();
      return client as unknown as Queryable & { end(): Promise<void> };
    },
  });
  process.exit(code);
}
