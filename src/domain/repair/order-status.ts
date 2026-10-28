// Estados de una orden (PRD §4.4, TD §7.2): ocho valores técnicos ASCII y un único mapa de etiquetas con los
// nombres exactos del PRD. Aquí NO viven la matriz de transiciones ni las reglas de cancelación (CHG-10).

export const ORDER_STATUSES = [
  'SOLICITUD_RECIBIDA',
  'EQUIPO_RECIBIDO',
  'EN_DIAGNOSTICO',
  'ESPERANDO_APROBACION',
  'EN_REPARACION',
  'LISTO_PARA_RECOJO',
  'ENTREGADO',
  'CANCELADO',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Readonly<Record<OrderStatus, string>> = {
  SOLICITUD_RECIBIDA: 'Solicitud recibida',
  EQUIPO_RECIBIDO: 'Equipo recibido',
  EN_DIAGNOSTICO: 'En diagnóstico',
  ESPERANDO_APROBACION: 'Esperando aprobación',
  EN_REPARACION: 'En reparación',
  LISTO_PARA_RECOJO: 'Listo para recojo',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
};

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === 'string' && (ORDER_STATUSES as readonly string[]).includes(value);
}
