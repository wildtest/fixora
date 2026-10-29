import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminOrderListItem } from '../../domain/admin/order-directory';
import { createLogger, type LogLevel } from '../../infrastructure/logging/logger';
import { issueAdminContext } from './admin-context';
import { listOrders, loadDashboard, type OrderReader } from './order-directory';

// Casos de uso de lectura administrativa (CHG-09a) con un repositorio falso, y registros con valores canario.
const lines: string[] = [];

vi.mock('../../infrastructure/logging/server-logger', () => ({
  getLogger: () =>
    createLogger({
      sink: { write: (_level: LogLevel, line: string) => void lines.push(line) },
      now: () => new Date('2026-10-28T10:00:00.000Z'),
      debugEnabled: true,
    }),
}));

const { searchOrdersAction } = await import('./order-directory-service');

const admin = issueAdminContext('admin-1');
const item = (n: number): AdminOrderListItem => ({
  id: `id-${n}`,
  trackingCode: '23456789BDFG',
  customerName: `Cliente ${n}`,
  device: { type: 'CELULAR', brand: 'X', model: null },
  status: 'EN_REPARACION',
  createdAt: '2026-10-28T10:00:00.000Z',
});

function fakeStore(total: number, overrides: Partial<OrderReader> = {}) {
  const calls = { count: [] as unknown[], page: [] as unknown[], recent: [] as number[] };
  const store: OrderReader = {
    countByStatus: async () => ({ EN_REPARACION: 4, DESCONOCIDO: 9 }),
    recent: async (limit) => {
      calls.recent.push(limit);
      return [item(1)];
    },
    count: async (criteria) => {
      calls.count.push(criteria);
      return total;
    },
    page: async (criteria, offset, limit) => {
      calls.page.push({ criteria, offset, limit });
      return [item(2)];
    },
    ...overrides,
  };
  return { store, calls };
}

beforeEach(() => {
  lines.length = 0;
});

describe('panel', () => {
  it('pide cinco recientes, completa con cero los ocho estados y descarta estados desconocidos', async () => {
    const { store, calls } = fakeStore(0);
    const dashboard = await loadDashboard(admin, store);
    expect(calls.recent).toEqual([5]);
    expect(Object.keys(dashboard.countsByStatus)).toHaveLength(8);
    expect(dashboard.countsByStatus).toMatchObject({ EN_REPARACION: 4, ENTREGADO: 0 });
    expect(dashboard.countsByStatus).not.toHaveProperty('DESCONOCIDO');
    expect(dashboard.recentOrders).toHaveLength(1);
  });
});

describe('directorio', () => {
  it('clasifica la búsqueda, valida el estado y la página antes de llegar al repositorio', async () => {
    const { store, calls } = fakeStore(45);
    const page = await listOrders(admin, { search: ' Muñoz ', status: 'ENTREGADO', page: '2' }, store);
    expect(calls.count).toEqual([{ search: { kind: 'name', normalizedName: 'munoz' }, status: 'ENTREGADO' }]);
    expect(calls.page).toEqual([{ criteria: calls.count[0], offset: 20, limit: 20 }]);
    expect(page).toMatchObject({ page: 2, pageSize: 20, totalItems: 45, totalPages: 3 });
  });

  it('entrada hostil: estado inválido y página basura nunca llegan al repositorio', async () => {
    const { store, calls } = fakeStore(5);
    await listOrders(admin, { search: 42, status: "x'; DROP TABLE y;--", page: 'abc' }, store);
    expect(calls.count).toEqual([{ search: { kind: 'none' }, status: null }]);
    expect(calls.page).toEqual([{ criteria: calls.count[0], offset: 0, limit: 20 }]);
  });

  it('sin resultados no consulta la página y devuelve el estado vacío', async () => {
    const { store, calls } = fakeStore(0);
    expect(await listOrders(admin, { page: 7 }, store)).toEqual({ items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 0 });
    expect(calls.page).toEqual([]);
  });

  it('una página inexistente se sirve como la última válida', async () => {
    const { store, calls } = fakeStore(41);
    expect((await listOrders(admin, { page: 99 }, store)).page).toBe(3);
    expect(calls.page).toEqual([{ criteria: calls.count[0], offset: 40, limit: 20 }]);
  });

  it('un fallo del repositorio se propaga (la acción lo convierte en INTERNAL_ERROR)', async () => {
    const { store } = fakeStore(1, { count: async () => Promise.reject(new Error('base caída')) });
    await expect(listOrders(admin, {}, store)).rejects.toThrow('base caída');
  });
});

describe('Server Action de lectura', () => {
  it('sin sesión válida devuelve SESSION_EXPIRED sin tocar la base de datos ni registrar nada', async () => {
    const result = await searchOrdersAction(async () => null, { search: 'CANARY-BUSQUEDA-NOMBRE' });
    expect(result).toEqual({ ok: false, code: 'SESSION_EXPIRED' });
    expect(lines).toEqual([]);
  });

  it('un fallo inesperado devuelve INTERNAL_ERROR y NO registra el texto buscado ni datos', async () => {
    // Sin DATABASE_URL el repositorio de producción no puede construirse: fallo inesperado real.
    const result = await searchOrdersAction(async () => admin, { search: 'CANARY-BUSQUEDA-NOMBRE', status: 'ENTREGADO' });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.code).toBe('INTERNAL_ERROR');
    expect(lines.length).toBeGreaterThanOrEqual(1);
    expect(lines.join('\n')).not.toMatch(/CANARY|BUSQUEDA|ENTREGADO/);
    expect(JSON.parse(lines[0]!)).toMatchObject({ event: 'infrastructure.failure', surface: 'admin', resultCode: 'INTERNAL_ERROR' });
  });
});
