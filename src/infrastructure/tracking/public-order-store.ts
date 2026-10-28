import 'server-only';
import { isDeviceType } from '../../domain/repair/device-type';
import { isOrderStatus } from '../../domain/repair/order-status';
import type { PublicOrderView, PublicStatusEvent } from '../../domain/repair/public-order-view';
import { getPrisma } from '../db/client';
import type { PrismaClient } from '../db/generated/client.ts';

// Repositorio público de seguimiento (CHG-06 D6/D11, SC-11): una sola consulta, exacta por `tracking_code`
// (UNIQUE), que SELECCIONA únicamente las columnas autorizadas. Nunca carga una orden completa para recortarla:
// no lee `customer_*`, `id`, `version`, `diagnosis`, `estimated_cost`, notas ni historiales administrativos.
// `repairDetails` (CHG-11) y `publicNotes` (CHG-12) no existen todavía y no se consultan.

export type PublicOrderStore = {
  findByTrackingCode(trackingCode: string): Promise<PublicOrderView | null>;
};

type Row = {
  tracking_code: string;
  status: string;
  device_type: string;
  brand: string;
  model: string | null;
  problem_description: string;
  event_status: string | null;
  event_at: Date | null;
};

export function createPublicOrderStore(prisma: PrismaClient = getPrisma()): PublicOrderStore {
  return {
    async findByTrackingCode(trackingCode) {
      // Los eventos van del más reciente al más antiguo; el `id` del evento solo desempata (no se selecciona).
      const rows = await prisma.$queryRaw<Row[]>`
        SELECT o."tracking_code", o."status"::text AS "status", o."device_type"::text AS "device_type",
               o."brand", o."model", o."problem_description",
               h."to_status"::text AS "event_status", h."occurred_at" AS "event_at"
        FROM "repair_orders" o
        LEFT JOIN "order_status_history" h ON h."order_id" = o."id"
        WHERE o."tracking_code" = ${trackingCode}
        ORDER BY h."occurred_at" DESC NULLS LAST, h."id" DESC`;
      const first = rows[0];
      if (!first) return null;
      if (!isOrderStatus(first.status) || !isDeviceType(first.device_type)) {
        throw new Error('Estado o tipo de equipo almacenado no válido.');
      }
      const statusTimeline: PublicStatusEvent[] = [];
      for (const row of rows) {
        if (row.event_status === null || row.event_at === null) continue;
        if (!isOrderStatus(row.event_status)) throw new Error('Estado de historial no válido.');
        statusTimeline.push({ status: row.event_status, occurredAt: row.event_at.toISOString() });
      }
      return {
        trackingCode: first.tracking_code,
        status: first.status,
        device: { type: first.device_type, brand: first.brand, model: first.model },
        problemDescription: first.problem_description,
        statusTimeline,
      };
    },
  };
}
