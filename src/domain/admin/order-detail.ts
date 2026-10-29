import type { DeviceType } from '../repair/device-type';
import type { OrderStatus } from '../repair/order-status';
import type { PublicStatusEvent } from '../repair/public-order-view';

// Detalle administrativo de una orden en SOLO LECTURA (CHG-09b D3): DTO con LISTA POSITIVA (TD §17), construido
// propiedad por propiedad con lo que esta pantalla presenta. Es distinto y NO asignable al `PublicOrderView`.
// Excluidos a propósito: diagnóstico y costo (CHG-11), notas (CHG-12), historiales de diagnóstico y costo,
// `version` y `capabilities` (CHG-10), `updatedAt`. Puro e isomórfico.

export type AdminStatusEvent = {
  /** `null` solo en el registro inicial (interno: no se presenta). */
  readonly fromStatus: OrderStatus | null;
  readonly toStatus: OrderStatus;
  /** ISO 8601 UTC; la interfaz lo presenta en `America/Lima`. */
  readonly occurredAt: string;
};

export type AdminOrderDetailDTO = {
  readonly id: string;
  readonly trackingCode: string;
  readonly status: OrderStatus;
  readonly createdAt: string;
  readonly customer: { readonly name: string; readonly phone: string; readonly email: string | null };
  readonly device: { readonly type: DeviceType; readonly brand: string; readonly model: string | null };
  readonly problemDescription: string;
  /** Del más reciente al más antiguo. */
  readonly statusHistory: readonly AdminStatusEvent[];
};

/** Claves permitidas del DTO (lista positiva); las pruebas las comparan con lo que realmente sale. */
export const DETAIL_KEYS = ['createdAt', 'customer', 'device', 'id', 'problemDescription', 'status', 'statusHistory', 'trackingCode'] as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Valida el identificador de la ruta en la frontera: un valor mal formado nunca llega a la base de datos. */
export function parseOrderId(raw: unknown): string | null {
  return typeof raw === 'string' && UUID.test(raw) ? raw.toLowerCase() : null;
}

/** Eventos del Repair Journey (presentación): el recorrido solo necesita el estado alcanzado y su fecha. */
export function journeyTimeline(history: readonly AdminStatusEvent[]): PublicStatusEvent[] {
  return history.map((event) => ({ status: event.toStatus, occurredAt: event.occurredAt }));
}

export const ABSENT_TEXT = 'No informado';
