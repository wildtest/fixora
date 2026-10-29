import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { expect, type Page } from '@playwright/test';
import { normalizeCustomerNameSearch } from '../../../src/domain/repair/customer-name-search';
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from './admin';

// Utilidades compartidas de los E2E administrativos (CHG-09a en adelante): sesión del administrador FICTICIO de la
// rama `test` y siembra de órdenes FICTICIAS con el propietario de esa rama. Nada de esto toca otra base.

const OWNER_URL = process.env.TEST_DIRECT_URL;
const ALPHABET = '23456789BDFGHJKMNPRSTWX';

export const fakeIp = () => `198.51.100.${Math.floor(Math.random() * 250) + 1}-${Math.random().toString(36).slice(2, 8)}`;
export const isMobile = (page: Page) => (page.viewportSize()?.width ?? 0) < 1024;
export const randomCode = () => Array.from({ length: 12 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
/** Fragmento único en minúsculas para aislar los datos de una prueba (solo letras: se busca como nombre). */
const tags: string[] = [];
export const uniqueTag = () => {
  const tag = `qz${Array.from({ length: 8 }, () => 'abcdefghjkmnpqrstuvwxyz'[Math.floor(Math.random() * 23)]).join('')}`;
  tags.push(tag);
  return tag;
};

/** Elimina (con el propietario de la rama `test`) las órdenes sembradas por la prueba: no deben alterar a las demás. */
export async function cleanupSeeded(): Promise<void> {
  const pending = tags.splice(0);
  if (pending.length === 0) return;
  await withOwner(async (db) => {
    for (const tag of pending) await db.query('DELETE FROM repair_orders WHERE customer_name LIKE $1', [`${tag}%`]);
  });
}

export async function withOwner<T>(work: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString: OWNER_URL });
  await client.connect();
  try {
    return await work(client);
  } finally {
    await client.end();
  }
}

export async function login(page: Page) {
  await page.setExtraHTTPHeaders({ 'x-vercel-forwarded-for': fakeIp().slice(0, 40) });
  await page.goto('/admin/acceso');
  await page.getByLabel('Correo').fill(E2E_ADMIN_EMAIL);
  await page.getByLabel('Contraseña').fill(E2E_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

export type SeedOrder = {
  readonly name: string;
  readonly status?: string;
  readonly createdAt?: Date;
  readonly code?: string;
  readonly brand?: string;
};

/** Siembra una orden FICTICIA, deliberadamente poblada con datos privados (teléfono, correo, diagnóstico, costo). */
export async function seedOrder(db: pg.Client, order: SeedOrder): Promise<string> {
  const code = order.code ?? randomCode();
  await db.query(
    `INSERT INTO repair_orders (id, tracking_code, status, customer_name, customer_name_search, customer_phone, customer_email,
       device_type, brand, model, problem_description, diagnosis, estimated_cost, version, created_at, updated_at)
     VALUES ($1, $2, $3::order_status, $4, $5, '+51 CANARY-TELEFONO 999', 'canary-correo@example.com', 'LAPTOP', $6, 'M1',
       'CANARY-DESCRIPCION', 'CANARY-DIAGNOSTICO', 150.00, 3, $7::timestamptz, $7::timestamptz)`,
    [randomUUID(), code, order.status ?? 'SOLICITUD_RECIBIDA', order.name, normalizeCustomerNameSearch(order.name), order.brand ?? 'MarcaFicticia', (order.createdAt ?? new Date()).toISOString()],
  );
  return code;
}

export async function noHorizontalOverflow(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}
