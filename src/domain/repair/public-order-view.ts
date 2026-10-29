import type { DeviceType } from './device-type';
import type { OrderStatus } from './order-status';

// Proyección pública de una orden (TD §17, SC-11): lista positiva construida propiedad por propiedad.
// Solo lo que PRD §4.6 autoriza. `repairDetails` (CHG-11) existe SOLO cuando el diagnóstico y el costo son públicos
// (desde Esperando aprobación; en Cancelado solo si la orden llegó a esa etapa) y `publicNotes` (CHG-12) no existe aún.
// Sin datos del cliente, UUID, versión, notas internas, indicador «publicado» ni historiales administrativos.

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
  /** `null` mientras no sean públicos: la presencia de valores NUNCA implica publicación. Valores vigentes y congelados. */
  readonly repairDetails: PublicRepairDetails | null;
};

export type PublicRepairDetails = {
  readonly diagnosis: string;
  /** Cadena decimal canónica de dos decimales (nunca `number`). */
  readonly estimatedCost: string;
};
