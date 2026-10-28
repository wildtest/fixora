import type { DeviceType } from './device-type';
import type { OrderStatus } from './order-status';

// Proyección pública de una orden (TD §17, SC-11): lista positiva construida propiedad por propiedad.
// Solo lo que PRD §4.6 autoriza hoy. NO existen aquí ni se anticipan `repairDetails` (CHG-11) ni `publicNotes`
// (CHG-12). Sin datos del cliente, UUID, versión, notas internas ni historiales administrativos.

export type PublicStatusEvent = {
  readonly status: OrderStatus;
  /** ISO 8601 UTC. */
  readonly occurredAt: string;
};

export type PublicOrderView = {
  readonly trackingCode: string;
  readonly status: OrderStatus;
  readonly device: { readonly type: DeviceType; readonly brand: string; readonly model: string | null };
  readonly problemDescription: string;
  /** Eventos públicos de estado ya persistidos, del más reciente al más antiguo. */
  readonly statusTimeline: readonly PublicStatusEvent[];
};
