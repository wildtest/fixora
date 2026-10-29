import 'server-only';
import { isDeviceType } from '../../domain/repair/device-type';
import { isOrderStatus } from '../../domain/repair/order-status';
import type { AdminOrderDetailDTO, AdminStatusEvent } from '../../domain/admin/order-detail';
import { getPrisma } from '../db/client';
import type { PrismaClient } from '../db/generated/client.ts';

// Repositorio administrativo del DETALLE de una orden (CHG-09b D4). Lectura específica, sin `GenericRepository` y
// sin tipos de Prisma hacia arriba. Dos consultas acotadas (la orden y sus eventos de estado), sin N+1, que
// SELECCIONAN solo las columnas del DTO: no leen diagnóstico, costo, notas, historiales de diagnóstico o costo,
// `version` ni `updated_at`. El identificador llega ya validado como UUID por la frontera.

export type AdminOrderDetailStore = {
  findById(id: string): Promise<AdminOrderDetailDTO | null>;
};

type OrderRow = {
  id: string;
  tracking_code: string;
  status: string;
  created_at: Date;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  device_type: string;
  brand: string;
  model: string | null;
  problem_description: string;
};

type EventRow = { from_status: string | null; to_status: string; occurred_at: Date };

export function createAdminOrderDetailStore(prisma: Pick<PrismaClient, '$queryRaw'> = getPrisma()): AdminOrderDetailStore {
  return {
    async findById(id) {
      const orders = await prisma.$queryRaw<OrderRow[]>`
        SELECT o."id"::text AS "id", o."tracking_code", o."status"::text AS "status", o."created_at",
               o."customer_name", o."customer_phone", o."customer_email",
               o."device_type"::text AS "device_type", o."brand", o."model", o."problem_description"
        FROM "repair_orders" o WHERE o."id" = ${id}::uuid`;
      const order = orders[0];
      if (!order) return null;
      if (!isOrderStatus(order.status) || !isDeviceType(order.device_type)) {
        throw new Error('Estado o tipo de equipo almacenado no válido.');
      }

      // Del más reciente al más antiguo; el `id` del evento solo desempata (no se selecciona).
      const events = await prisma.$queryRaw<EventRow[]>`
        SELECT h."from_status"::text AS "from_status", h."to_status"::text AS "to_status", h."occurred_at"
        FROM "order_status_history" h WHERE h."order_id" = ${id}::uuid
        ORDER BY h."occurred_at" DESC, h."id" DESC`;
      const statusHistory: AdminStatusEvent[] = events.map((event) => {
        if (!isOrderStatus(event.to_status) || (event.from_status !== null && !isOrderStatus(event.from_status))) {
          throw new Error('Estado de historial no válido.');
        }
        return { fromStatus: event.from_status as AdminStatusEvent['fromStatus'], toStatus: event.to_status, occurredAt: event.occurred_at.toISOString() };
      });

      return {
        id: order.id,
        trackingCode: order.tracking_code,
        status: order.status,
        createdAt: order.created_at.toISOString(),
        customer: { name: order.customer_name, phone: order.customer_phone, email: order.customer_email },
        device: { type: order.device_type, brand: order.brand, model: order.model },
        problemDescription: order.problem_description,
        statusHistory,
      };
    },
  };
}
