import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type pg from 'pg';
import { guardAdminAction } from '../../src/application/admin/admin-action';
import { issueAdminContext } from '../../src/application/admin/admin-context';
import { createSessionService } from '../../src/application/admin/session-service';
import { listOrders, loadDashboard } from '../../src/application/admin/order-directory';
import { LIST_ITEM_KEYS, ORDERS_PAGE_SIZE } from '../../src/domain/admin/order-directory';
import { normalizeCustomerNameSearch } from '../../src/domain/repair/customer-name-search';
import { createAdminOrderStore } from '../../src/infrastructure/admin/admin-order-store';
import { createAdminStore } from '../../src/infrastructure/admin/admin-store';
import type { PrismaClient } from '../../src/infrastructure/db/generated/client.ts';
import { sha256Hex } from '../../src/infrastructure/security/crypto';
import { appPrisma, ownerPg } from './support/connections';
import { resetTestDatabase } from './support/reset';

// Lectura administrativa de órdenes contra PostgreSQL real con el rol de aplicación (CHG-09a). Sin mocks de Prisma.
// Todos los datos son FICTICIOS. Las órdenes se siembran con el propietario de la rama `test`.
const ALPHABET = '23456789BDFGHJKMNPRSTWX';
const admin = issueAdminContext('admin-de-prueba');
const T0 = new Date('2026-10-28T10:00:00.000Z');
const at = (minutes: number) => new Date(T0.getTime() + minutes * 60_000);

let prisma: PrismaClient;
let owner: pg.Client;
let counter = 0;

const code = () => {
  counter += 1;
  const digits = counter.toString(23).padStart(12, '0');
  return Array.from(digits, (digit) => ALPHABET[parseInt(digit, 23)]).join('');
};

type Seed = { code?: string; name?: string; status?: string; createdAt?: Date; brand?: string; model?: string | null; id?: string };

async function seed(overrides: Seed = {}): Promise<{ id: string; code: string }> {
  const id = overrides.id ?? randomUUID();
  const trackingCode = overrides.code ?? code();
  const name = overrides.name ?? 'Cliente Ficticio';
  await owner.query(
    `INSERT INTO repair_orders (id, tracking_code, status, customer_name, customer_name_search, customer_phone, customer_email,
       device_type, brand, model, problem_description, diagnosis, estimated_cost, version, created_at, updated_at)
     VALUES ($1, $2, $3::order_status, $4, $5, 'CANARY-TELEFONO-555', 'canary-correo@example.com', 'LAPTOP', $6, $7,
       'CANARY-DESCRIPCION-PRIVADA', 'CANARY-DIAGNOSTICO', 99.5, 7, $8::timestamptz, $8::timestamptz)`,
    [id, trackingCode, overrides.status ?? 'SOLICITUD_RECIBIDA', name, normalizeCustomerNameSearch(name), overrides.brand ?? 'MarcaX', overrides.model === undefined ? 'M1' : overrides.model, (overrides.createdAt ?? T0).toISOString()],
  );
  return { id, code: trackingCode };
}

const store = () => createAdminOrderStore(prisma);
const list = (input: Parameters<typeof listOrders>[1] = {}) => listOrders(admin, input, store());

beforeAll(async () => {
  prisma = appPrisma();
  owner = await ownerPg();
});
afterAll(async () => {
  await prisma.$disconnect();
  await owner.end();
});
beforeEach(async () => {
  counter = 0;
  await resetTestDatabase();
});

describe('panel: conteos por estado y recientes', () => {
  it('base vacía: los ocho estados en cero y sin recientes', async () => {
    const dashboard = await loadDashboard(admin, store());
    expect(Object.values(dashboard.countsByStatus)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    expect(dashboard.recentOrders).toEqual([]);
  });

  it('cuenta cada estado, completa con cero los demás y refleja el estado persistido actual', async () => {
    for (const status of ['EN_REPARACION', 'EN_REPARACION', 'ENTREGADO', 'CANCELADO']) await seed({ status });
    const { countsByStatus } = await loadDashboard(admin, store());
    expect(countsByStatus).toMatchObject({ EN_REPARACION: 2, ENTREGADO: 1, CANCELADO: 1, SOLICITUD_RECIBIDA: 0, EN_DIAGNOSTICO: 0 });
    await seed({ status: 'EN_DIAGNOSTICO' });
    expect((await loadDashboard(admin, store())).countsByStatus.EN_DIAGNOSTICO).toBe(1);
  });

  it('como máximo cinco recientes, la registrada más recientemente primero, con independencia de la actualización', async () => {
    for (let i = 0; i < 7; i += 1) await seed({ createdAt: at(i), name: `Cliente ${i}` });
    // Una orden antigua con una actualización reciente NO sube: «recientes» = registradas más recientemente.
    await owner.query("UPDATE repair_orders SET updated_at = now() WHERE customer_name = 'Cliente 0'");
    const { recentOrders } = await loadDashboard(admin, store());
    expect(recentOrders.map((o) => o.customerName)).toEqual(['Cliente 6', 'Cliente 5', 'Cliente 4', 'Cliente 3', 'Cliente 2']);
  });

  it('menos de cinco: devuelve todas', async () => {
    await seed();
    await seed({ createdAt: at(1) });
    expect((await loadDashboard(admin, store())).recentOrders).toHaveLength(2);
  });
});

describe('proyección mínima (lista positiva)', () => {
  it('cada elemento tiene SOLO las claves permitidas y ningún dato privado', async () => {
    await seed({ model: null });
    const { items } = await list();
    expect(Object.keys(items[0]!).sort()).toEqual([...LIST_ITEM_KEYS]);
    expect(Object.keys(items[0]!.device).sort()).toEqual(['brand', 'model', 'type']);
    expect(items[0]!.device.model).toBeNull();
    expect(JSON.stringify(items)).not.toMatch(/CANARY|canary|99\.5|"version"/);
  });

  it('el repositorio no menciona columnas privadas en sus consultas', () => {
    const source = readFileSync('src/infrastructure/admin/admin-order-store.ts', 'utf8').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    for (const column of ['customer_phone', 'customer_email', 'problem_description', 'diagnosis', 'estimated_cost', '"version"', 'order_notes', 'history']) {
      expect(source, column).not.toContain(column);
    }
    expect(source).not.toContain('queryRawUnsafe');
  });
});

describe('directorio: orden, búsqueda, filtro y paginación', () => {
  it('por defecto: todas, la registrada más recientemente primero', async () => {
    await seed({ createdAt: at(0), name: 'Antigua' });
    await seed({ createdAt: at(10), name: 'Reciente' });
    const page = await list();
    expect(page.items.map((o) => o.customerName)).toEqual(['Reciente', 'Antigua']);
    expect(page).toMatchObject({ page: 1, pageSize: 20, totalItems: 2, totalPages: 1 });
  });

  it('búsqueda por código: exacta, con minúsculas y espacios exteriores; el código parcial no coincide', async () => {
    const target = await seed({ name: 'Ana' });
    await seed({ name: 'Otra' });
    for (const text of [target.code, `  ${target.code.toLowerCase()} \n`]) {
      expect((await list({ search: text })).items.map((o) => o.trackingCode)).toEqual([target.code]);
    }
    const partial = await list({ search: target.code.slice(0, 8) });
    expect(partial.items).toEqual([]); // se busca como nombre: ningún nombre lo contiene
    expect(partial.totalItems).toBe(0);
  });

  it('un código inexistente NO cae a una búsqueda por nombre', async () => {
    await seed({ name: 'Nombre cualquiera' });
    const missing = await list({ search: '22222222222B' });
    expect(missing.items).toEqual([]);
  });

  it('búsqueda parcial por nombre sin distinguir mayúsculas ni tildes: «munoz» encuentra «Muñoz»', async () => {
    await seed({ name: 'Carlos Muñoz' });
    await seed({ name: 'José Ángel Pérez' });
    await seed({ name: 'Otra Persona' });
    expect((await list({ search: 'munoz' })).items.map((o) => o.customerName)).toEqual(['Carlos Muñoz']);
    expect((await list({ search: 'MUÑOZ' })).items.map((o) => o.customerName)).toEqual(['Carlos Muñoz']);
    expect((await list({ search: 'jose angel' })).items.map((o) => o.customerName)).toEqual(['José Ángel Pérez']);
    expect((await list({ search: 'ez' })).items.map((o) => o.customerName)).toEqual(['José Ángel Pérez']);
  });

  it('%, _ y \\ se buscan como caracteres LITERALES, no como comodines', async () => {
    await seed({ name: 'Descuento 100% Ruiz', createdAt: at(1) });
    await seed({ name: 'Ana_Maria Soto', createdAt: at(2) });
    await seed({ name: 'Dir C:\\Temp Vega', createdAt: at(3) });
    await seed({ name: 'Pedro Gomez', createdAt: at(4) });
    const names = async (search: string) => (await list({ search })).items.map((o) => o.customerName);
    expect(await names('%')).toEqual(['Descuento 100% Ruiz']);
    expect(await names('_')).toEqual(['Ana_Maria Soto']);
    expect(await names('\\')).toEqual(['Dir C:\\Temp Vega']);
    expect(await names('a_m')).toEqual(['Ana_Maria Soto']);
    expect(await names('%%')).toEqual([]);
    expect(await names('_%')).toEqual([]);
  });

  it('no busca por teléfono, correo, marca, descripción ni diagnóstico', async () => {
    await seed({ name: 'Persona Normal', brand: 'MarcaUnica' });
    for (const text of ['CANARY-TELEFONO-555', 'canary-correo@example.com', 'MarcaUnica', 'CANARY-DESCRIPCION-PRIVADA', 'CANARY-DIAGNOSTICO']) {
      expect((await list({ search: text })).items, text).toEqual([]);
    }
  });

  it('filtro por estado, «todos», búsqueda + filtro y total del conjunto filtrado', async () => {
    await seed({ name: 'Juan Perez', status: 'EN_DIAGNOSTICO', createdAt: at(1) });
    await seed({ name: 'Juan Soto', status: 'ENTREGADO', createdAt: at(2) });
    await seed({ name: 'Maria Luna', status: 'EN_DIAGNOSTICO', createdAt: at(3) });
    expect((await list({ status: 'EN_DIAGNOSTICO' })).totalItems).toBe(2);
    expect((await list({ status: '' })).totalItems).toBe(3);
    const both = await list({ search: 'juan', status: 'EN_DIAGNOSTICO' });
    expect(both.items.map((o) => o.customerName)).toEqual(['Juan Perez']);
    expect(both.totalItems).toBe(1);
  });

  it('un estado inválido se ignora de forma segura (muestra todo), sin error ni SQL', async () => {
    await seed();
    for (const status of ['NO_EXISTE', "x'; DROP TABLE repair_orders;--", 42]) {
      expect((await list({ status })).totalItems, String(status)).toBe(1);
    }
    expect((await owner.query('SELECT 1 FROM repair_orders')).rowCount).toBe(1);
  });

  it('páginas de 20: segunda página, última válida para una inexistente y no enteras a la primera', async () => {
    for (let i = 0; i < 25; i += 1) await seed({ name: `Cliente ${String(i).padStart(2, '0')}`, createdAt: at(i) });
    const first = await list({ page: 1 });
    expect(first.items).toHaveLength(ORDERS_PAGE_SIZE);
    expect(first).toMatchObject({ totalItems: 25, totalPages: 2, page: 1 });
    expect(first.items[0]!.customerName).toBe('Cliente 24');
    const second = await list({ page: 2 });
    expect(second.items).toHaveLength(5);
    expect(second.items.at(-1)!.customerName).toBe('Cliente 00');
    expect((await list({ page: 99 })).page).toBe(2); // la última válida
    for (const page of [0, -1, 1.5, Number.NaN, 'abc']) expect((await list({ page })).page, String(page)).toBe(1);
  });

  it('desempate determinista con el mismo instante: sin repetir ni omitir entre páginas', async () => {
    for (let i = 0; i < 45; i += 1) await seed({ createdAt: T0 });
    const seen: string[] = [];
    for (const page of [1, 2, 3]) seen.push(...(await list({ page })).items.map((o) => o.id));
    expect(seen).toHaveLength(45);
    expect(new Set(seen).size).toBe(45);
    const again: string[] = [];
    for (const page of [1, 2, 3]) again.push(...(await list({ page })).items.map((o) => o.id));
    expect(again).toEqual(seen); // mismo orden en cada consulta
  });

  it('sin resultados: conjunto vacío, página 1 y cero páginas (no es un error)', async () => {
    await seed({ name: 'Alguien' });
    expect(await list({ search: 'nadie con este nombre' })).toEqual({ items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 0 });
    expect(await list({ search: 'nadie', page: 5 })).toMatchObject({ page: 1, totalPages: 0 });
  });
});

describe('autorización de la lectura interactiva (regresión de SC-12)', () => {
  async function sessions() {
    const adminId = randomUUID();
    await owner.query("INSERT INTO admin_users (id, singleton, email, password_hash, created_at, updated_at) VALUES ($1, true, 'a@b.example', 'h', now(), now())", [adminId]);
    const service = createSessionService({
      store: createAdminStore(prisma),
      now: () => new Date(),
      newId: randomUUID,
      newToken: () => randomBytes(32).toString('base64url'),
      hashToken: sha256Hex,
    });
    return { adminId, service, token: await service.issue(adminId) };
  }

  it('sin sesión válida NO se entregan datos ni se ejecuta la búsqueda; con sesión, sí', async () => {
    await seed({ name: 'Cliente Privado' });
    const { searchOrdersAction } = await import('../../src/application/admin/order-directory-service');
    const { service, token } = await sessions();
    // Control positivo: con una sesión válida el mismo guardia SÍ entrega la página.
    const allowed = await guardAdminAction(() => service.authenticate(token), async (a) => ({ ok: true as const, data: await listOrders(a, { search: 'privado' }, store()) }));
    expect(allowed.ok && allowed.data.items.map((o) => o.customerName)).toEqual(['Cliente Privado']);
    const invalid: Array<string | undefined> = [undefined, 'basura', randomBytes(32).toString('base64url')];
    for (const candidate of invalid) {
      const result = await searchOrdersAction(() => service.authenticate(candidate), { search: 'privado' });
      expect(result, String(candidate)).toEqual({ ok: false, code: 'SESSION_EXPIRED' });
    }
    // Eliminada en el servidor.
    await owner.query('DELETE FROM admin_sessions');
    expect(await searchOrdersAction(() => service.authenticate(token), {})).toEqual({ ok: false, code: 'SESSION_EXPIRED' });
  });
});
