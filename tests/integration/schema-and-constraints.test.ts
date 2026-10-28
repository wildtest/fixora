import { randomUUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type pg from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ownerPg } from './support/connections';
import { NOW, insertAdmin, insertOrder, insertSession, insertStatusEvent, sqlState } from './support/fixtures';
import { resetTestDatabase } from './support/reset';

// Migraciones y restricciones declarativas contra PostgreSQL real (tareas 4.1–4.4, 3.5).
const CHECK_VIOLATION = '23514';
const UNIQUE_VIOLATION = '23505';
const FK_VIOLATION = '23503'; // FK sin fila padre
const RESTRICT_VIOLATION = '23001'; // ON DELETE RESTRICT
let db: pg.Client;

beforeAll(async () => {
  db = await ownerPg();
});
afterAll(async () => {
  await db.end();
});
beforeEach(async () => {
  await resetTestDatabase();
});

describe('[SC-14] migración inicial (base vacía → esquema actual solo con migraciones)', () => {
  it('crea las tablas y los enums del modelo V1', async () => {
    const tables = await db.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY 1");
    expect(tables.rows.map((r) => r.tablename)).toEqual([
      '_prisma_migrations',
      'admin_sessions',
      'admin_users',
      'cost_history',
      'diagnosis_history',
      'order_notes',
      'order_status_history',
      'rate_limit_buckets',
      'registration_idempotency',
      'repair_orders',
    ]);
    const enums = await db.query(
      "SELECT t.typname, array_agg(e.enumlabel::text ORDER BY e.enumsortorder) AS labels FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid GROUP BY 1 ORDER BY 1",
    );
    const byName = Object.fromEntries(enums.rows.map((r) => [r.typname, r.labels]));
    expect(byName.order_status).toEqual([
      'SOLICITUD_RECIBIDA', 'EQUIPO_RECIBIDO', 'EN_DIAGNOSTICO', 'ESPERANDO_APROBACION',
      'EN_REPARACION', 'LISTO_PARA_RECOJO', 'ENTREGADO', 'CANCELADO',
    ]);
    expect(byName.device_type).toEqual(['CELULAR', 'TABLET', 'LAPTOP', 'PC', 'CONSOLA', 'OTRO']);
    expect(byName.note_visibility).toEqual(['PUBLIC', 'INTERNAL']);
    expect(byName.rate_limit_surface).toEqual(['PUBLIC_TRACKING', 'ADMIN_LOGIN']);
  });

  it('todos los instantes son timestamptz(3) y el costo es NUMERIC sin precisión', async () => {
    const instants = await db.query(
      "SELECT table_name, column_name, data_type, datetime_precision FROM information_schema.columns WHERE table_schema = 'public' AND data_type LIKE 'timestamp%' AND table_name <> '_prisma_migrations'",
    );
    expect(instants.rows.length).toBeGreaterThan(0);
    for (const row of instants.rows) {
      expect(row.data_type, `${row.table_name}.${row.column_name}`).toBe('timestamp with time zone');
      expect(row.datetime_precision).toBe(3);
    }
    const money = await db.query(
      "SELECT table_name, column_name, data_type, numeric_precision, numeric_scale FROM information_schema.columns WHERE table_schema = 'public' AND column_name IN ('estimated_cost', 'previous_value', 'new_value') AND data_type = 'numeric'",
    );
    expect(money.rows.length).toBe(3);
    for (const row of money.rows) {
      expect(row.numeric_precision).toBeNull();
      expect(row.numeric_scale).toBeNull();
    }
  });

  it('no existen triggers de negocio ni secuencias', async () => {
    const triggers = await db.query(
      "SELECT tgname FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE NOT t.tgisinternal AND n.nspname = 'public'",
    );
    expect(triggers.rows).toEqual([]);
    const sequences = await db.query("SELECT relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relkind = 'S' AND n.nspname = 'public'");
    expect(sequences.rows).toEqual([]);
  });

  it('la migración no contiene contraseñas, URL de conexión ni nombres de secretos', () => {
    const dir = fileURLToPath(new URL('../../prisma/migrations/', import.meta.url));
    const sql = readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => readFileSync(`${dir}${entry.name}/migration.sql`, 'utf8'))
      .join('\n');
    expect(sql).not.toMatch(/PASSWORDs+'/i);
    expect(sql).not.toMatch(/postgres(ql)?:\/\//i);
    expect(sql).not.toMatch(/_URL|SECRET|API_KEY/);
    expect(sql).not.toMatch(/CREATE\s+(OR\s+REPLACE\s+)?(TRIGGER|FUNCTION|ROLE)/i);
  });
});

describe('CHECK de órdenes y notas', () => {
  it('version >= 1 en órdenes y notas', async () => {
    expect(await sqlState(insertOrder(db, { version: 0 }))).toBe(CHECK_VIOLATION);
    expect(await sqlState(insertOrder(db, { version: 1 }))).toBeNull();
    const orderId = await insertOrder(db);
    const note = (version: number) =>
      db.query(
        `INSERT INTO order_notes (id, order_id, visibility, content, version, created_at, updated_at)
         VALUES ($1, $2, 'INTERNAL', 'nota', $3, $4::timestamptz, $4::timestamptz)`,
        [randomUUID(), orderId, version, NOW],
      );
    expect(await sqlState(note(0))).toBe(CHECK_VIOLATION);
    expect(await sqlState(note(1))).toBeNull();
  });

  it('costo: nulo o > 0 con a lo sumo dos decimales', async () => {
    for (const bad of ['0', '-1', '-0.01', '1.234', '0.001']) {
      expect(await sqlState(insertOrder(db, { estimated_cost: bad })), bad).toBe(CHECK_VIOLATION);
    }
    for (const good of ['0.01', '1', '180.5', '180.50', '12345678901234567890123456789.12']) {
      expect(await sqlState(insertOrder(db, { estimated_cost: good })), good).toBeNull();
    }
    expect(await sqlState(insertOrder(db, { estimated_cost: null }))).toBeNull();
  });

  it('SC-07: ESPERANDO_APROBACION y posteriores exigen diagnóstico y costo; CANCELADO no', async () => {
    for (const status of ['ESPERANDO_APROBACION', 'EN_REPARACION', 'LISTO_PARA_RECOJO', 'ENTREGADO']) {
      expect(await sqlState(insertOrder(db, { status })), status).toBe(CHECK_VIOLATION);
      expect(await sqlState(insertOrder(db, { status, diagnosis: 'x', estimated_cost: null })), status).toBe(CHECK_VIOLATION);
      expect(await sqlState(insertOrder(db, { status, diagnosis: null, estimated_cost: '10' })), status).toBe(CHECK_VIOLATION);
      expect(await sqlState(insertOrder(db, { status, diagnosis: 'x', estimated_cost: '10' })), status).toBeNull();
    }
    // CANCELADO sin diagnóstico ni costo es aceptado (TD §11).
    expect(await sqlState(insertOrder(db, { status: 'CANCELADO' }))).toBeNull();
    for (const status of ['SOLICITUD_RECIBIDA', 'EQUIPO_RECIBIDO', 'EN_DIAGNOSTICO']) {
      expect(await sqlState(insertOrder(db, { status })), status).toBeNull();
    }
  });
});

describe('CHECK de transiciones de una fila en order_status_history', () => {
  const allowed: [string, string][] = [
    ['SOLICITUD_RECIBIDA', 'EQUIPO_RECIBIDO'],
    ['SOLICITUD_RECIBIDA', 'CANCELADO'],
    ['EQUIPO_RECIBIDO', 'EN_DIAGNOSTICO'],
    ['EQUIPO_RECIBIDO', 'CANCELADO'],
    ['EN_DIAGNOSTICO', 'ESPERANDO_APROBACION'],
    ['EN_DIAGNOSTICO', 'CANCELADO'],
    ['ESPERANDO_APROBACION', 'EN_REPARACION'],
    ['ESPERANDO_APROBACION', 'CANCELADO'],
    ['EN_REPARACION', 'LISTO_PARA_RECOJO'],
    ['LISTO_PARA_RECOJO', 'ENTREGADO'],
  ];

  it('acepta el evento inicial y los 10 pares permitidos', async () => {
    const orderId = await insertOrder(db);
    expect(await sqlState(insertStatusEvent(db, orderId, null, 'SOLICITUD_RECIBIDA'))).toBeNull();
    for (const [from, to] of allowed) {
      const id = await insertOrder(db);
      expect(await sqlState(insertStatusEvent(db, id, from, to)), `${from}→${to}`).toBeNull();
    }
  });

  it('rechaza saltos, retrocesos, reapertura y eventos iniciales distintos del permitido', async () => {
    const rejected: [string | null, string][] = [
      [null, 'EQUIPO_RECIBIDO'],
      [null, 'CANCELADO'],
      ['SOLICITUD_RECIBIDA', 'ENTREGADO'],
      ['SOLICITUD_RECIBIDA', 'EN_DIAGNOSTICO'],
      ['EQUIPO_RECIBIDO', 'SOLICITUD_RECIBIDA'],
      ['EN_REPARACION', 'EN_DIAGNOSTICO'],
      ['ENTREGADO', 'EN_REPARACION'],
      ['CANCELADO', 'SOLICITUD_RECIBIDA'],
      ['EN_REPARACION', 'CANCELADO'],
      ['LISTO_PARA_RECOJO', 'CANCELADO'],
      ['SOLICITUD_RECIBIDA', 'SOLICITUD_RECIBIDA'],
    ];
    for (const [from, to] of rejected) {
      const id = await insertOrder(db);
      expect(await sqlState(insertStatusEvent(db, id, from, to)), `${from}→${to}`).toBe(CHECK_VIOLATION);
    }
  });
});

describe('unicidades y claves foráneas', () => {
  it('tracking_code único', async () => {
    await insertOrder(db, { tracking_code: 'ABCDEFGHJKMN' });
    expect(await sqlState(insertOrder(db, { tracking_code: 'ABCDEFGHJKMN' }))).toBe(UNIQUE_VIOLATION);
  });

  it('(order_id, to_status) único: una orden no entra dos veces en el mismo estado', async () => {
    const id = await insertOrder(db);
    await insertStatusEvent(db, id, null, 'SOLICITUD_RECIBIDA');
    expect(await sqlState(insertStatusEvent(db, id, null, 'SOLICITUD_RECIBIDA'))).toBe(UNIQUE_VIOLATION);
    expect(await sqlState(insertStatusEvent(db, id, 'SOLICITUD_RECIBIDA', 'EQUIPO_RECIBIDO'))).toBeNull();
  });

  it('idempotencia: key_hash único y una sola fila por orden', async () => {
    const a = await insertOrder(db);
    const b = await insertOrder(db);
    const put = (hash: string, orderId: string) =>
      db.query('INSERT INTO registration_idempotency (key_hash, order_id, created_at) VALUES ($1, $2, $3::timestamptz)', [hash, orderId, NOW]);
    await put('h1', a);
    expect(await sqlState(put('h1', b))).toBe(UNIQUE_VIOLATION);
    expect(await sqlState(put('h2', a))).toBe(UNIQUE_VIOLATION);
    expect(await sqlState(put('h2', b))).toBeNull();
  });

  it('administrador: email único, token_hash único y singleton', async () => {
    const admin = await insertAdmin(db, 'admin@example.test');
    // Segundo administrador: rechazado por el singleton aunque cambie el correo.
    expect(await sqlState(insertAdmin(db, 'otro@example.test'))).toBe(UNIQUE_VIOLATION);
    // Y no se puede esquivar con singleton = false.
    expect(await sqlState(insertAdmin(db, 'tercero@example.test', false))).toBe(CHECK_VIOLATION);
    await insertSession(db, admin, 'token-hash-1');
    expect(await sqlState(insertSession(db, admin, 'token-hash-1'))).toBe(UNIQUE_VIOLATION);
    expect(await sqlState(insertSession(db, admin, 'token-hash-2'))).toBeNull();
  });

  it('el email del administrador tiene índice único propio (el singleton lo enmascara en las filas)', async () => {
    const indexes = await db.query(
      "SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'admin_users' AND indexdef LIKE 'CREATE UNIQUE%'",
    );
    const definitions = indexes.rows.map((r) => r.indexdef as string);
    expect(definitions.some((d) => d.includes('(email)'))).toBe(true);
    expect(definitions.some((d) => d.includes('(singleton)'))).toBe(true);
  });

  it('no se puede eliminar una orden con dependientes (RESTRICT)', async () => {
    const id = await insertOrder(db);
    await insertStatusEvent(db, id, null, 'SOLICITUD_RECIBIDA');
    expect(await sqlState(db.query('DELETE FROM repair_orders WHERE id = $1', [id]))).toBe(RESTRICT_VIOLATION);
    await db.query('DELETE FROM order_status_history WHERE order_id = $1', [id]);
    expect(await sqlState(db.query('DELETE FROM repair_orders WHERE id = $1', [id]))).toBeNull();
  });

  it('una fila dependiente exige una orden existente', async () => {
    expect(await sqlState(insertStatusEvent(db, randomUUID(), null, 'SOLICITUD_RECIBIDA'))).toBe(FK_VIOLATION);
  });

  it('eliminar al administrador elimina sus sesiones (CASCADE)', async () => {
    const admin = await insertAdmin(db, 'admin@example.test');
    await insertSession(db, admin, 'token-hash-1');
    await db.query('DELETE FROM admin_users WHERE id = $1', [admin]);
    expect((await db.query('SELECT count(*)::int AS n FROM admin_sessions')).rows[0].n).toBe(0);
  });
});
