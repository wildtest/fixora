import 'server-only';
import type { AdminHistoryEvent, AdminOrderDetailDTO, AdminStatusEvent } from '../../domain/admin/order-detail';
import { isDeviceType } from '../../domain/repair/device-type';
import { centsToMoney, moneyToCents } from '../../domain/repair/money';
import { isNoteVisibility, type AdminNote } from '../../domain/repair/note';
import { isOrderStatus } from '../../domain/repair/order-status';
import { getPrisma } from '../db/client';
import type { PrismaClient } from '../db/generated/client.ts';

// Repositorio administrativo del DETALLE de una orden (CHG-09b D4, ampliado por CHG-10 y CHG-11). Lectura específica,
// sin `GenericRepository` y sin tipos de Prisma hacia arriba. Tres consultas acotadas (la orden, su historial combinado
// de estado, diagnóstico y costo, y sus notas), sin N+1, que SELECCIONAN solo las columnas del DTO. El costo se lee como TEXTO (`NUMERIC::text`) y se canonicaliza con céntimos enteros: nunca pasa por `number`.
// El identificador llega ya validado como UUID por la frontera.

/** Lectura base: el caso de uso añade `allowedTransitions`, `canEditDiagnosisAndCost`, `canManageNotes`, `canEditBasicData` y `neverPublished` (reglas de dominio). */
export type AdminOrderDetailRecord = Omit<AdminOrderDetailDTO, 'allowedTransitions' | 'canEditDiagnosisAndCost' | 'canManageNotes' | 'canEditBasicData' | 'neverPublished'> & {
  /** ¿La orden alcanzó alguna vez Esperando aprobación? (decidido por su recorrido real, no por sus valores). */
  readonly reachedApproval: boolean;
};

export type AdminOrderDetailStore = {
  findById(id: string): Promise<AdminOrderDetailRecord | null>;
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
  version: number;
  diagnosis: string | null;
  estimated_cost: string | null;
  reached_approval: boolean;
};

type NoteRow = { id: string; version: number; content: string; visibility: string; created_at: Date };
type EventRow = { kind: string; occurred_at: Date; previous: string | null; next: string | null };

function canonicalCost(value: string | null): string | null {
  if (value === null) return null;
  const cents = moneyToCents(value);
  if (cents === null) throw new Error('Costo almacenado no válido.');
  return centsToMoney(cents);
}

function toEvent(row: EventRow): AdminHistoryEvent {
  const occurredAt = row.occurred_at.toISOString();
  if (row.kind === 'STATUS') {
    if (!isOrderStatus(row.next) || (row.previous !== null && !isOrderStatus(row.previous))) throw new Error('Estado de historial no válido.');
    return { type: 'STATUS', fromStatus: row.previous as AdminStatusEvent['fromStatus'], toStatus: row.next, occurredAt };
  }
  if (row.kind === 'DIAGNOSIS') return { type: 'DIAGNOSIS', previous: row.previous, next: row.next, occurredAt };
  if (row.kind === 'COST') return { type: 'COST', previous: canonicalCost(row.previous), next: canonicalCost(row.next), occurredAt };
  throw new Error('Tipo de historial no válido.');
}

export function createAdminOrderDetailStore(prisma: Pick<PrismaClient, '$queryRaw'> = getPrisma()): AdminOrderDetailStore {
  return {
    async findById(id) {
      const orders = await prisma.$queryRaw<OrderRow[]>`
        SELECT o."id"::text AS "id", o."tracking_code", o."status"::text AS "status", o."created_at",
               o."customer_name", o."customer_phone", o."customer_email",
               o."device_type"::text AS "device_type", o."brand", o."model", o."problem_description", o."version" AS "version",
               o."diagnosis" AS "diagnosis", o."estimated_cost"::text AS "estimated_cost",
               EXISTS (SELECT 1 FROM "order_status_history" x WHERE x."order_id" = o."id" AND x."to_status" = 'ESPERANDO_APROBACION') AS "reached_approval"
        FROM "repair_orders" o WHERE o."id" = ${id}::uuid`;
      const order = orders[0];
      if (!order) return null;
      if (!isOrderStatus(order.status) || !isDeviceType(order.device_type)) {
        throw new Error('Estado o tipo de equipo almacenado no válido.');
      }

      // Historial combinado, del más reciente al más antiguo. Con el mismo instante, un desempate determinista con las
      // columnas existentes: rango fijo del tipo (estado < diagnóstico < costo) y luego `id` descendente. El rango NO
      // tiene significado cronológico: solo estabiliza el orden. Sin autor, sesión ni IP (V1 no los conserva).
      const events = await prisma.$queryRaw<EventRow[]>`
        SELECT e."kind", e."occurred_at", e."previous", e."next" FROM (
          SELECT 'STATUS' AS "kind", 0 AS "rank", h."id"::text AS "id", h."occurred_at",
                 h."from_status"::text AS "previous", h."to_status"::text AS "next"
          FROM "order_status_history" h WHERE h."order_id" = ${id}::uuid
          UNION ALL
          SELECT 'DIAGNOSIS', 1, d."id"::text, d."occurred_at", d."previous_value", d."new_value"
          FROM "diagnosis_history" d WHERE d."order_id" = ${id}::uuid
          UNION ALL
          SELECT 'COST', 2, c."id"::text, c."occurred_at", c."previous_value"::text, c."new_value"::text
          FROM "cost_history" c WHERE c."order_id" = ${id}::uuid
        ) e
        ORDER BY e."occurred_at" DESC, e."rank" ASC, e."id" DESC`;
      // Notas de ESTA orden (CHG-12), separadas por visibilidad, de la más reciente a la más antigua (desempate por `id`).
      const notes = await prisma.$queryRaw<NoteRow[]>`
        SELECT n."id"::text AS "id", n."version" AS "version", n."content", n."visibility"::text AS "visibility", n."created_at"
        FROM "order_notes" n WHERE n."order_id" = ${id}::uuid ORDER BY n."created_at" DESC, n."id" DESC`;
      const publicNotes: AdminNote[] = [];
      const internalNotes: AdminNote[] = [];
      for (const note of notes) {
        if (!isNoteVisibility(note.visibility)) throw new Error('Visibilidad almacenada no válida.');
        const view: AdminNote = { id: note.id, version: note.version, content: note.content, createdAt: note.created_at.toISOString() };
        (note.visibility === 'PUBLIC' ? publicNotes : internalNotes).push(view);
      }
      const history = events.map(toEvent);
      const statusHistory: AdminStatusEvent[] = [];
      for (const event of history) {
        if (event.type === 'STATUS') statusHistory.push({ fromStatus: event.fromStatus, toStatus: event.toStatus, occurredAt: event.occurredAt });
      }

      return {
        id: order.id,
        trackingCode: order.tracking_code,
        status: order.status,
        createdAt: order.created_at.toISOString(),
        customer: { name: order.customer_name, phone: order.customer_phone, email: order.customer_email },
        device: { type: order.device_type, brand: order.brand, model: order.model },
        problemDescription: order.problem_description,
        diagnosis: order.diagnosis,
        estimatedCost: canonicalCost(order.estimated_cost),
        publicNotes,
        internalNotes,
        statusHistory,
        history,
        version: order.version,
        reachedApproval: order.reached_approval === true,
      };
    },
  };
}
