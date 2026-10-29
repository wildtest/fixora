import 'server-only';
import { isDeviceType } from '../../domain/repair/device-type';
import { isOrderStatus } from '../../domain/repair/order-status';
import { centsToMoney, moneyToCents } from '../../domain/repair/money';
import type { PublicOrderView, PublicStatusEvent } from '../../domain/repair/public-order-view';
import { getPrisma } from '../db/client';
import type { PrismaClient } from '../db/generated/client.ts';

// Repositorio público de seguimiento (CHG-06 D6/D11, SC-11): una sola consulta, exacta por `tracking_code`
// (UNIQUE), que SELECCIONA únicamente las columnas autorizadas. Nunca carga una orden completa para recortarla:
// no lee `customer_*`, `id`, `version`, notas ni historiales administrativos. El diagnóstico y el costo (CHG-11) son
// una proyección CONDICIONADA en la propia consulta: solo salen de la base de datos en los estados públicos (Esperando
// aprobación, En reparación, Listo para recojo y Entregado) y en Cancelado únicamente si existe un evento hacia
// Esperando aprobación; en cualquier otro caso la consulta devuelve NULL y los valores NO se cargan en memoria. La
// presencia de valores nunca implica publicación. Las notas públicas (CHG-12) salen de una SEGUNDA consulta acotada con
// `visibility = 'PUBLIC'` explícito y solo `content` y `created_at`: las notas internas nunca se cargan en memoria.

export type PublicOrderStore = {
  findByTrackingCode(trackingCode: string): Promise<PublicOrderView | null>;
};

type NoteRow = { content: string; created_at: Date };

type Row = {
  tracking_code: string;
  status: string;
  device_type: string;
  brand: string;
  model: string | null;
  problem_description: string;
  public_diagnosis: string | null;
  public_cost: string | null;
  event_status: string | null;
  event_at: Date | null;
};

function toRepairDetails(diagnosis: string | null, cost: string | null): PublicOrderView['repairDetails'] {
  if (diagnosis === null || cost === null) return null;
  const cents = moneyToCents(cost);
  if (cents === null) throw new Error('Costo almacenado no válido.');
  return { diagnosis, estimatedCost: centsToMoney(cents) };
}

export function createPublicOrderStore(prisma: PrismaClient = getPrisma()): PublicOrderStore {
  return {
    async findByTrackingCode(trackingCode) {
      // Los eventos van del más reciente al más antiguo; el `id` del evento solo desempata (no se selecciona).
      const rows = await prisma.$queryRaw<Row[]>`
        SELECT o."tracking_code", o."status"::text AS "status", o."device_type"::text AS "device_type",
               o."brand", o."model", o."problem_description",
               CASE WHEN p."publishable" THEN o."diagnosis" END AS "public_diagnosis",
               CASE WHEN p."publishable" THEN o."estimated_cost"::text END AS "public_cost",
               h."to_status"::text AS "event_status", h."occurred_at" AS "event_at"
        FROM "repair_orders" o
        CROSS JOIN LATERAL (
          SELECT (o."status" IN ('ESPERANDO_APROBACION', 'EN_REPARACION', 'LISTO_PARA_RECOJO', 'ENTREGADO')
                  OR (o."status" = 'CANCELADO' AND EXISTS (
                        SELECT 1 FROM "order_status_history" r WHERE r."order_id" = o."id" AND r."to_status" = 'ESPERANDO_APROBACION'))) AS "publishable"
        ) p
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
      const notes = await prisma.$queryRaw<NoteRow[]>`
        SELECT n."content", n."created_at"
        FROM "order_notes" n JOIN "repair_orders" o ON o."id" = n."order_id"
        WHERE o."tracking_code" = ${trackingCode} AND n."visibility" = 'PUBLIC'
        ORDER BY n."created_at" DESC, n."id" DESC`;
      return {
        trackingCode: first.tracking_code,
        status: first.status,
        device: { type: first.device_type, brand: first.brand, model: first.model },
        problemDescription: first.problem_description,
        statusTimeline,
        repairDetails: toRepairDetails(first.public_diagnosis, first.public_cost),
        publicNotes: notes.map((n) => ({ content: n.content, createdAt: n.created_at.toISOString() })),
      };
    },
  };
}
