import { normalizeCustomerNameSearch } from '../repair/customer-name-search';
import type { DeviceType } from '../repair/device-type';
import { isOrderStatus, ORDER_STATUSES, type OrderStatus } from '../repair/order-status';
import { normalizeTrackingCode } from '../repair/tracking-lookup';

// Lectura administrativa de órdenes (CHG-09a): DTO con LISTA POSITIVA (TD §17), clasificación de la búsqueda,
// validación del filtro y de la página, y cálculo de la paginación. Puro e isomórfico. Estos tipos son
// administrativos y distintos de los públicos: nunca llevan teléfono, correo, descripción, diagnóstico, costo,
// notas, historiales ni `version`.

export const ORDERS_PAGE_SIZE = 20;
export const DASHBOARD_RECENT_LIMIT = 5;
/** Tope defensivo del texto buscado (un nombre real es mucho más corto). */
export const SEARCH_MAX_LENGTH = 100;

export type AdminOrderListItem = {
  readonly id: string;
  readonly trackingCode: string;
  readonly customerName: string;
  readonly device: { readonly type: DeviceType; readonly brand: string; readonly model: string | null };
  readonly status: OrderStatus;
  /** Instante de registro (UTC, ISO 8601); la interfaz lo presenta en `America/Lima`. */
  readonly createdAt: string;
};

export type AdminOrderPage = {
  readonly items: readonly AdminOrderListItem[];
  readonly page: number;
  readonly pageSize: typeof ORDERS_PAGE_SIZE;
  readonly totalItems: number;
  readonly totalPages: number;
};

export type AdminDashboardDTO = {
  readonly countsByStatus: Readonly<Record<OrderStatus, number>>;
  readonly recentOrders: readonly AdminOrderListItem[];
};

export type OrderSearch =
  | { readonly kind: 'none' }
  | { readonly kind: 'code'; readonly trackingCode: string }
  | { readonly kind: 'name'; readonly normalizedName: string };

/**
 * Un único campo (TD §19): `trim`; si tras la normalización de E15 cumple EXACTAMENTE el formato del código, búsqueda
 * exacta por código; si no cumple y no está vacío, subcadena del nombre normalizado; vacío, sin criterio. Sin
 * parcial, prefijo ni difuso sobre el código y sin respaldo «código no encontrado → buscar nombre».
 */
export function classifySearch(input: unknown): OrderSearch {
  if (typeof input !== 'string') return { kind: 'none' };
  const text = input.slice(0, SEARCH_MAX_LENGTH).trim();
  if (text === '') return { kind: 'none' };
  const trackingCode = normalizeTrackingCode(text);
  if (trackingCode !== null) return { kind: 'code', trackingCode };
  const normalizedName = normalizeCustomerNameSearch(text);
  return normalizedName === '' ? { kind: 'none' } : { kind: 'name', normalizedName };
}

/** Filtro de estado: solo valores del enum de dominio; cualquier otra cosa se ignora («Todos»). */
export function parseStatusFilter(input: unknown): OrderStatus | null {
  return isOrderStatus(input) ? input : null;
}

/** Página solicitada: entero ≥ 1; no enteros, cero, negativos, NaN o infinitos se normalizan a 1. */
export function parsePage(input: unknown): number {
  const value = typeof input === 'string' && /^\d{1,9}$/.test(input.trim()) ? Number(input.trim()) : input;
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1 ? value : 1;
}

export type PageWindow = { readonly page: number; readonly totalPages: number; readonly offset: number };

/** Sin resultados: página 1, 0 páginas. Con resultados, una página mayor se sirve como la última válida. */
export function pageWindow(totalItems: number, requestedPage: number): PageWindow {
  if (totalItems <= 0) return { page: 1, totalPages: 0, offset: 0 };
  const totalPages = Math.ceil(totalItems / ORDERS_PAGE_SIZE);
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  return { page, totalPages, offset: (page - 1) * ORDERS_PAGE_SIZE };
}

/** Completa con cero los ocho estados; ignora cualquier estado desconocido. */
export function completeCounts(partial: Readonly<Record<string, number>>): Record<OrderStatus, number> {
  const counts = {} as Record<OrderStatus, number>;
  for (const status of ORDER_STATUSES) counts[status] = Math.max(0, Math.trunc(partial[status] ?? 0));
  return counts;
}

/** Claves permitidas de un elemento de lista (lista positiva); las pruebas las comparan con lo que realmente sale. */
export const LIST_ITEM_KEYS = ['createdAt', 'customerName', 'device', 'id', 'status', 'trackingCode'] as const;
