import {
  DASHBOARD_RECENT_LIMIT,
  ORDERS_PAGE_SIZE,
  classifySearch,
  completeCounts,
  pageWindow,
  parsePage,
  parseStatusFilter,
  type AdminDashboardDTO,
  type AdminOrderPage,
} from '../../domain/admin/order-directory';
import type { AdminOrderStore } from '../../infrastructure/admin/admin-order-store';
import type { AdminContext } from './admin-context';

// Casos de uso de lectura administrativa de órdenes (CHG-09a). Reciben el `AdminContext` como prueba estructural de
// que la sesión se comprobó antes (la autoridad es la comprobación en runtime de CHG-08). Un único caso de uso
// sirve la carga inicial (Server Component) y la lectura interactiva (Server Action). Sin caché, sin registros de
// los datos devueltos ni del texto buscado.

export type OrderReader = Pick<AdminOrderStore, 'countByStatus' | 'recent' | 'count' | 'page'>;

/** Entrada sin confiar: viene del cliente (cuerpo de la Server Action) o de la URL (`estado`). */
export type DirectoryInput = { readonly search?: unknown; readonly status?: unknown; readonly page?: unknown };

export async function loadDashboard(_admin: AdminContext, store: OrderReader): Promise<AdminDashboardDTO> {
  const [counts, recentOrders] = await Promise.all([store.countByStatus(), store.recent(DASHBOARD_RECENT_LIMIT)]);
  return { countsByStatus: completeCounts(counts), recentOrders };
}

export async function listOrders(_admin: AdminContext, input: DirectoryInput, store: OrderReader): Promise<AdminOrderPage> {
  const criteria = { search: classifySearch(input.search), status: parseStatusFilter(input.status) };
  const totalItems = await store.count(criteria);
  const { page, totalPages, offset } = pageWindow(totalItems, parsePage(input.page));
  const items = totalItems === 0 ? [] : await store.page(criteria, offset, ORDERS_PAGE_SIZE);
  return { items, page, pageSize: ORDERS_PAGE_SIZE, totalItems, totalPages };
}
