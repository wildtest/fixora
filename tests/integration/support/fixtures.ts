import { randomUUID } from 'node:crypto';
import type pg from 'pg';

// Datos ficticios para las pruebas de integración (sin datos personales reales). Se insertan con la conexión
// indicada; los instantes los aporta la prueba (sin DEFAULT now() en el esquema).

export const NOW = '2026-10-28T10:00:00.000Z';

export type OrderOverrides = Partial<{
  id: string;
  tracking_code: string;
  status: string;
  diagnosis: string | null;
  estimated_cost: string | null;
  version: number;
}>;

export async function insertOrder(client: pg.Client, overrides: OrderOverrides = {}): Promise<string> {
  const id = overrides.id ?? randomUUID();
  const row = {
    tracking_code: randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase(),
    status: 'SOLICITUD_RECIBIDA',
    diagnosis: null,
    estimated_cost: null,
    version: 1,
    ...overrides,
  };
  await client.query(
    `INSERT INTO repair_orders
       (id, tracking_code, status, customer_name, customer_name_search, customer_phone, device_type, brand,
        problem_description, diagnosis, estimated_cost, version, created_at, updated_at)
     VALUES ($1, $2, $3::order_status, 'Cliente Ficticio', 'cliente ficticio', '000000000', 'CELULAR', 'MarcaX',
        'Pantalla rota de prueba', $4, $5::numeric, $6, $7::timestamptz, $7::timestamptz)`,
    [id, row.tracking_code, row.status, row.diagnosis, row.estimated_cost, row.version, NOW],
  );
  return id;
}

export async function insertStatusEvent(
  client: pg.Client,
  orderId: string,
  from: string | null,
  to: string,
): Promise<void> {
  await client.query(
    'INSERT INTO order_status_history (id, order_id, from_status, to_status, occurred_at) VALUES ($1, $2, $3::order_status, $4::order_status, $5::timestamptz)',
    [randomUUID(), orderId, from, to, NOW],
  );
}

export async function insertAdmin(client: pg.Client, email: string, singleton = true): Promise<string> {
  const id = randomUUID();
  await client.query(
    `INSERT INTO admin_users (id, singleton, email, password_hash, created_at, updated_at)
     VALUES ($1, $2, $3, 'hash-ficticio', $4::timestamptz, $4::timestamptz)`,
    [id, singleton, email, NOW],
  );
  return id;
}

export async function insertSession(client: pg.Client, adminId: string, tokenHash: string): Promise<string> {
  const id = randomUUID();
  await client.query(
    `INSERT INTO admin_sessions (id, admin_user_id, token_hash, created_at, last_seen_at, expires_at)
     VALUES ($1, $2, $3, $4::timestamptz, $4::timestamptz, $4::timestamptz + interval '12 hours')`,
    [id, adminId, tokenHash, NOW],
  );
  return id;
}

/** Código SQLSTATE del error de PostgreSQL de una promesa rechazada (o `null` si no rechazó). */
export async function sqlState(promise: Promise<unknown>): Promise<string | null> {
  try {
    await promise;
    return null;
  } catch (error) {
    return (error as { code?: string }).code ?? 'sin-código';
  }
}
