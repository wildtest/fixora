import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appPg, ownerPg } from './support/connections';
import { NOW, insertOrder, insertStatusEvent, sqlState } from './support/fixtures';
import { resetTestDatabase } from './support/reset';

// Privilegios del rol de aplicación: ACL (catálogo) Y comportamiento real (tareas 5.2, 5.4, 5.5).
// Un GRANT que no lanza excepción no prueba nada: se comprueban ambos.
const INSUFFICIENT_PRIVILEGE = '42501';
let app: pg.Client;
let owner: pg.Client;

beforeAll(async () => {
  app = await appPg();
  owner = await ownerPg();
});
afterAll(async () => {
  await app.end();
  await owner.end();
});
beforeEach(async () => {
  await resetTestDatabase();
});

const tablePrivilege = async (table: string, privilege: string) =>
  (await app.query('SELECT has_table_privilege(current_user, $1, $2) AS ok', [`public.${table}`, privilege])).rows[0].ok as boolean;
const columnPrivilege = async (table: string, column: string, privilege: string) =>
  (await app.query('SELECT has_column_privilege(current_user, $1, $2, $3) AS ok', [`public.${table}`, column, privilege])).rows[0].ok as boolean;

describe('identidad y atributos del rol de aplicación', () => {
  it('se conecta como fixora_app, sin superusuario, DDL ni membresías, y con TLS', async () => {
    expect((await app.query('SELECT current_user AS u')).rows[0].u).toBe('fixora_app');
    const attrs = await app.query(
      'SELECT rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls FROM pg_roles WHERE rolname = current_user',
    );
    expect(attrs.rows[0]).toEqual({ rolsuper: false, rolcreatedb: false, rolcreaterole: false, rolreplication: false, rolbypassrls: false });
    const memberships = await app.query(
      'SELECT r.rolname FROM pg_auth_members m JOIN pg_roles r ON r.oid = m.roleid JOIN pg_roles u ON u.oid = m.member WHERE u.rolname = current_user',
    );
    expect(memberships.rows).toEqual([]); // en particular, no es miembro de neon_superuser
    // TLS del cliente hacia el pooler (el socket es TLS); sslmode=verify-full lo exige la configuración.
    expect((app as unknown as { connection: { stream: { encrypted?: boolean } } }).connection.stream.encrypted).toBe(true);
  });

  it('no puede ejecutar DDL (crear, alterar ni borrar objetos)', async () => {
    expect(await sqlState(app.query('CREATE TABLE public.intruso (id int)'))).toBe(INSUFFICIENT_PRIVILEGE);
    expect(await sqlState(app.query('ALTER TABLE repair_orders ADD COLUMN x int'))).toBe(INSUFFICIENT_PRIVILEGE);
    expect(await sqlState(app.query('DROP TABLE repair_orders'))).toBe(INSUFFICIENT_PRIVILEGE);
    expect(await sqlState(app.query('TRUNCATE repair_orders'))).toBe(INSUFFICIENT_PRIVILEGE);
    expect(await sqlState(app.query('CREATE SCHEMA intruso'))).toBe(INSUFFICIENT_PRIVILEGE);
    expect(await sqlState(app.query("CREATE ROLE intruso LOGIN"))).toBe(INSUFFICIENT_PRIVILEGE);
  });

  it('no existen secuencias ni se concedió privilegio de secuencia (claves UUID)', async () => {
    const sequences = await owner.query("SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relkind = 'S' AND n.nspname = 'public'");
    expect(sequences.rowCount).toBe(0);
  });
});

describe('matriz de privilegios por tabla (catálogo)', () => {
  const matrix: Record<string, { granted: string[]; denied: string[] }> = {
    repair_orders: { granted: ['SELECT', 'INSERT'], denied: ['DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] },
    order_status_history: { granted: ['SELECT', 'INSERT'], denied: ['UPDATE', 'DELETE', 'TRUNCATE'] },
    diagnosis_history: { granted: ['SELECT', 'INSERT'], denied: ['UPDATE', 'DELETE', 'TRUNCATE'] },
    cost_history: { granted: ['SELECT', 'INSERT'], denied: ['UPDATE', 'DELETE', 'TRUNCATE'] },
    registration_idempotency: { granted: ['SELECT', 'INSERT'], denied: ['UPDATE', 'DELETE', 'TRUNCATE'] },
    order_notes: { granted: ['SELECT', 'INSERT', 'DELETE'], denied: ['TRUNCATE'] },
    admin_users: { granted: ['SELECT'], denied: ['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'] },
    admin_sessions: { granted: ['SELECT', 'INSERT', 'DELETE'], denied: ['TRUNCATE'] },
    rate_limit_buckets: { granted: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'], denied: ['TRUNCATE'] },
  };

  for (const [table, { granted, denied }] of Object.entries(matrix)) {
    it(`${table}: concedidos ${granted.join('/')} y denegados ${denied.join('/')}`, async () => {
      for (const privilege of granted) expect(await tablePrivilege(table, privilege), `${privilege}`).toBe(true);
      for (const privilege of denied) expect(await tablePrivilege(table, privilege), `${privilege}`).toBe(false);
    });
  }

  it('UPDATE de tabla completa no existe en ninguna tabla: solo por columnas donde se aprobó', async () => {
    // has_table_privilege(UPDATE) es verdadero solo con el privilegio de tabla; los GRANT son por columnas.
    for (const table of ['repair_orders', 'order_notes', 'admin_sessions']) {
      expect(await tablePrivilege(table, 'UPDATE'), table).toBe(false);
    }
    const acl = await owner.query(
      "SELECT relname, relacl::text AS acl FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' AND relname IN ('repair_orders', 'order_notes', 'admin_sessions')",
    );
    for (const row of acl.rows) expect(row.acl, row.relname).not.toMatch(/fixora_app=[a-zA-Z]*w/);
  });
});

describe('UPDATE por columnas (tarea 5.5 — adoptado)', () => {
  it('repair_orders: columnas mutables concedidas; id, tracking_code y created_at no', async () => {
    for (const column of ['status', 'customer_name', 'customer_name_search', 'customer_phone', 'customer_email', 'device_type', 'brand', 'model', 'problem_description', 'diagnosis', 'estimated_cost', 'version', 'updated_at']) {
      expect(await columnPrivilege('repair_orders', column, 'UPDATE'), column).toBe(true);
    }
    for (const column of ['id', 'tracking_code', 'created_at']) {
      expect(await columnPrivilege('repair_orders', column, 'UPDATE'), column).toBe(false);
    }
  });

  it('repair_orders: el comportamiento coincide con la ACL', async () => {
    const id = await insertOrder(owner);
    const ok = await app.query('UPDATE repair_orders SET brand = $2, version = version + 1, updated_at = $3::timestamptz WHERE id = $1', [id, 'MarcaY', NOW]);
    expect(ok.rowCount).toBe(1);
    expect(await sqlState(app.query("UPDATE repair_orders SET tracking_code = 'ZZZZZZZZZZZZ' WHERE id = $1", [id]))).toBe(INSUFFICIENT_PRIVILEGE);
    expect(await sqlState(app.query('UPDATE repair_orders SET id = $2 WHERE id = $1', [id, randomUUID()]))).toBe(INSUFFICIENT_PRIVILEGE);
    expect(await sqlState(app.query('UPDATE repair_orders SET created_at = now() WHERE id = $1', [id]))).toBe(INSUFFICIENT_PRIVILEGE);
    expect(await sqlState(app.query('DELETE FROM repair_orders WHERE id = $1', [id]))).toBe(INSUFFICIENT_PRIVILEGE);
  });

  it('order_notes: content, version y updated_at actualizables; visibility, created_at, id y order_id no', async () => {
    const orderId = await insertOrder(owner);
    const noteId = randomUUID();
    await app.query(
      `INSERT INTO order_notes (id, order_id, visibility, content, version, created_at, updated_at)
       VALUES ($1, $2, 'INTERNAL', 'nota', 1, $3::timestamptz, $3::timestamptz)`,
      [noteId, orderId, NOW],
    );
    expect((await app.query("UPDATE order_notes SET content = 'editada', version = 2, updated_at = $2::timestamptz WHERE id = $1", [noteId, NOW])).rowCount).toBe(1);
    expect(await sqlState(app.query("UPDATE order_notes SET visibility = 'PUBLIC' WHERE id = $1", [noteId]))).toBe(INSUFFICIENT_PRIVILEGE);
    expect(await sqlState(app.query('UPDATE order_notes SET created_at = now() WHERE id = $1', [noteId]))).toBe(INSUFFICIENT_PRIVILEGE);
    expect(await sqlState(app.query('UPDATE order_notes SET order_id = $2 WHERE id = $1', [noteId, orderId]))).toBe(INSUFFICIENT_PRIVILEGE);
    expect((await app.query('DELETE FROM order_notes WHERE id = $1', [noteId])).rowCount).toBe(1);
  });

  it('admin_sessions: solo last_seen_at es actualizable; se puede crear y cerrar', async () => {
    const adminId = randomUUID();
    await owner.query(
      "INSERT INTO admin_users (id, email, password_hash, created_at, updated_at) VALUES ($1, 'admin@example.test', 'h', $2::timestamptz, $2::timestamptz)",
      [adminId, NOW],
    );
    const sessionId = randomUUID();
    await app.query(
      "INSERT INTO admin_sessions (id, admin_user_id, token_hash, created_at, last_seen_at, expires_at) VALUES ($1, $2, 'th', $3::timestamptz, $3::timestamptz, $3::timestamptz + interval '12 hours')",
      [sessionId, adminId, NOW],
    );
    expect((await app.query("UPDATE admin_sessions SET last_seen_at = $2::timestamptz WHERE id = $1", [sessionId, NOW])).rowCount).toBe(1);
    expect(await sqlState(app.query("UPDATE admin_sessions SET expires_at = now() WHERE id = $1", [sessionId]))).toBe(INSUFFICIENT_PRIVILEGE);
    expect(await sqlState(app.query("UPDATE admin_sessions SET token_hash = 'otro' WHERE id = $1", [sessionId]))).toBe(INSUFFICIENT_PRIVILEGE);
    expect((await app.query('DELETE FROM admin_sessions WHERE id = $1', [sessionId])).rowCount).toBe(1);
  });
});

describe('historiales append-only e idempotencia para el runtime (comportamiento)', () => {
  it('permite INSERT y SELECT; deniega UPDATE y DELETE', async () => {
    const orderId = await insertOrder(owner);
    await insertStatusEvent(app, orderId, null, 'SOLICITUD_RECIBIDA');
    expect((await app.query('SELECT count(*)::int AS n FROM order_status_history WHERE order_id = $1', [orderId])).rows[0].n).toBe(1);
    expect(await sqlState(app.query("UPDATE order_status_history SET to_status = 'CANCELADO' WHERE order_id = $1", [orderId]))).toBe(INSUFFICIENT_PRIVILEGE);
    expect(await sqlState(app.query('DELETE FROM order_status_history WHERE order_id = $1', [orderId]))).toBe(INSUFFICIENT_PRIVILEGE);

    await app.query('INSERT INTO diagnosis_history (id, order_id, previous_value, new_value, occurred_at) VALUES ($1, $2, NULL, $3, $4::timestamptz)', [randomUUID(), orderId, 'diag', NOW]);
    await app.query('INSERT INTO cost_history (id, order_id, previous_value, new_value, occurred_at) VALUES ($1, $2, NULL, 10.5, $3::timestamptz)', [randomUUID(), orderId, NOW]);
    await app.query('INSERT INTO registration_idempotency (key_hash, order_id, created_at) VALUES ($1, $2, $3::timestamptz)', ['hash-1', orderId, NOW]);
    for (const [table, setter] of [['diagnosis_history', "new_value = 'x'"], ['cost_history', 'new_value = 1'], ['registration_idempotency', "key_hash = 'otro'"]] as const) {
      expect(await sqlState(app.query(`UPDATE ${table} SET ${setter}`)), `UPDATE ${table}`).toBe(INSUFFICIENT_PRIVILEGE);
      expect(await sqlState(app.query(`DELETE FROM ${table}`)), `DELETE ${table}`).toBe(INSUFFICIENT_PRIVILEGE);
    }
  });

  it('admin_users: solo lectura para el runtime', async () => {
    expect(await sqlState(app.query("INSERT INTO admin_users (id, email, password_hash, created_at, updated_at) VALUES ($1, 'a@example.test', 'h', now(), now())", [randomUUID()]))).toBe(INSUFFICIENT_PRIVILEGE);
    expect(await sqlState(app.query('SELECT count(*) FROM admin_users'))).toBeNull();
    expect(await sqlState(app.query("UPDATE admin_users SET email = 'x'"))).toBe(INSUFFICIENT_PRIVILEGE);
    expect(await sqlState(app.query('DELETE FROM admin_users'))).toBe(INSUFFICIENT_PRIVILEGE);
  });
});
