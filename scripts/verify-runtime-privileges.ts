// Verificación de privilegios del rol runtime por CATÁLOGO (CHG-07 D8, consume CHG-02): sin endpoint, sin
// operaciones destructivas y sin datos. El rol se evalúa a sí mismo (`current_user`) con la conexión de runtime:
//   node --env-file-if-exists=.env.local scripts/verify-runtime-privileges.ts      (variable: DATABASE_URL)
// No imprime la URL. Sale con 1 si algún privilegio no coincide con lo aprobado (D-7 de CHG-02).
import pg from 'pg';
import { fileURLToPath } from 'node:url';
import { ConfigError, requirePooled, requireVariable } from '../src/infrastructure/config/database-url.ts';

type TableExpectation = { readonly table: string; readonly granted: readonly string[]; readonly denied: readonly string[] };
type ColumnExpectation = { readonly table: string; readonly column: string; readonly update: boolean };

export const TABLES: readonly TableExpectation[] = [
  { table: 'repair_orders', granted: ['SELECT', 'INSERT'], denied: ['UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] },
  { table: 'order_status_history', granted: ['SELECT', 'INSERT'], denied: ['UPDATE', 'DELETE', 'TRUNCATE'] },
  { table: 'diagnosis_history', granted: ['SELECT', 'INSERT'], denied: ['UPDATE', 'DELETE', 'TRUNCATE'] },
  { table: 'cost_history', granted: ['SELECT', 'INSERT'], denied: ['UPDATE', 'DELETE', 'TRUNCATE'] },
  { table: 'registration_idempotency', granted: ['SELECT', 'INSERT'], denied: ['UPDATE', 'DELETE', 'TRUNCATE'] },
  { table: 'order_notes', granted: ['SELECT', 'INSERT', 'DELETE'], denied: ['UPDATE', 'TRUNCATE'] },
  { table: 'admin_users', granted: ['SELECT'], denied: ['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'] },
  { table: 'admin_sessions', granted: ['SELECT', 'INSERT', 'DELETE'], denied: ['UPDATE', 'TRUNCATE'] },
  { table: 'rate_limit_buckets', granted: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'], denied: ['TRUNCATE'] },
];

// UPDATE por columnas aprobado (CHG-02, tarea 5.5): lo inmutable no se puede actualizar.
export const COLUMNS: readonly ColumnExpectation[] = [
  ...['status', 'customer_name', 'customer_name_search', 'customer_phone', 'customer_email', 'device_type', 'brand', 'model', 'problem_description', 'diagnosis', 'estimated_cost', 'version', 'updated_at'].map(
    (column) => ({ table: 'repair_orders', column, update: true }),
  ),
  ...['id', 'tracking_code', 'created_at'].map((column) => ({ table: 'repair_orders', column, update: false })),
  ...['content', 'version', 'updated_at'].map((column) => ({ table: 'order_notes', column, update: true })),
  ...['id', 'order_id', 'visibility', 'created_at'].map((column) => ({ table: 'order_notes', column, update: false })),
  { table: 'admin_sessions', column: 'last_seen_at', update: true },
  ...['expires_at', 'token_hash', 'admin_user_id'].map((column) => ({ table: 'admin_sessions', column, update: false })),
];

export type Queryable = { query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }> };

export async function verifyRuntimePrivileges(db: Queryable): Promise<string[]> {
  const problems: string[] = [];
  const asBool = async (sql: string, params: unknown[]) => Boolean((await db.query(sql, params)).rows[0]?.ok);

  const role = (await db.query('SELECT current_user::text AS role')).rows[0]?.role;
  const attrs = (await db.query(
    'SELECT rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls FROM pg_roles WHERE rolname = current_user',
  )).rows[0];
  if (!attrs || Object.values(attrs).some(Boolean)) problems.push(`el rol ${String(role)} tiene atributos elevados`);
  const memberships = (await db.query(
    'SELECT r.rolname FROM pg_auth_members m JOIN pg_roles r ON r.oid = m.roleid JOIN pg_roles u ON u.oid = m.member WHERE u.rolname = current_user',
  )).rows;
  if (memberships.length > 0) problems.push('el rol runtime es miembro de otros roles (p. ej. neon_superuser)');

  // Sin DDL: no puede crear en `public` ni ser propietario de objetos.
  if (await asBool("SELECT has_schema_privilege(current_user, 'public', 'CREATE') AS ok", [])) problems.push('puede crear objetos en public (DDL)');
  const owned = (await db.query(
    "SELECT count(*)::int AS n FROM pg_class c JOIN pg_roles r ON r.oid = c.relowner WHERE r.rolname = current_user AND c.relnamespace = 'public'::regnamespace",
  )).rows[0]?.n;
  if (Number(owned) > 0) problems.push('es propietario de objetos en public');

  for (const { table, granted, denied } of TABLES) {
    for (const privilege of granted) {
      if (!(await asBool('SELECT has_table_privilege(current_user, $1, $2) AS ok', [`public.${table}`, privilege]))) {
        problems.push(`${table}: falta ${privilege}`);
      }
    }
    for (const privilege of denied) {
      // `UPDATE` de tabla completa es siempre denegado: el permitido es por columnas (abajo).
      if (await asBool('SELECT has_table_privilege(current_user, $1, $2) AS ok', [`public.${table}`, privilege])) {
        problems.push(`${table}: tiene ${privilege} (debe estar denegado)`);
      }
    }
  }
  for (const { table, column, update } of COLUMNS) {
    const has = await asBool('SELECT has_column_privilege(current_user, $1, $2, $3) AS ok', [`public.${table}`, column, 'UPDATE']);
    if (has !== update) problems.push(`${table}.${column}: UPDATE ${has ? 'concedido' : 'denegado'} (esperado ${update ? 'concedido' : 'denegado'})`);
  }
  // Sin secuencias: claves UUID y compuesta.
  const sequences = (await db.query("SELECT count(*)::int AS n FROM pg_class c WHERE c.relkind = 'S' AND c.relnamespace = 'public'::regnamespace")).rows[0]?.n;
  if (Number(sequences) > 0) problems.push('existen secuencias en public');
  return problems;
}

async function main(): Promise<void> {
  try {
    const url = requireVariable(process.env, 'DATABASE_URL');
    requirePooled('DATABASE_URL', url);
    const client = new pg.Client({ connectionString: url });
    await client.connect();
    try {
      const problems = await verifyRuntimePrivileges(client);
      if (problems.length > 0) {
        process.stderr.write(`Privilegios del rol runtime NO conformes (${problems.length}):\n${problems.map((p) => ` - ${p}`).join('\n')}\n`);
        process.exit(1);
      }
      const checks = TABLES.reduce((n, t) => n + t.granted.length + t.denied.length, 0) + COLUMNS.length;
      process.stdout.write(`Privilegios del rol runtime conformes (${checks} comprobaciones por catálogo).\n`);
    } finally {
      await client.end();
    }
  } catch (error) {
    process.stderr.write(`${error instanceof ConfigError ? error.message : 'No se pudo verificar los privilegios.'}\n`);
    process.exit(1);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
