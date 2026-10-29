import 'server-only';
import { isNoteVisibility, type NoteVisibility } from '../../domain/repair/note';
import { isOrderStatus, type OrderStatus } from '../../domain/repair/order-status';
import { getPrisma } from '../db/client';
import type { PrismaClient } from '../db/generated/client.ts';
import { runInTransaction, transactionClient } from '../db/transaction';
import { newUuid } from '../security/crypto';

// Repositorio funcional de las notas (CHG-12 D3/D5): una transacción `READ COMMITTED` por operación. Lo PRIMERO que hace
// cada operación es BLOQUEAR LA FILA de `repair_orders` (`SELECT ... FOR UPDATE`, SQL parametrizado) y leer su estado; así
// se serializa con el cierre de la orden: la transición a Entregado/Cancelado (CHG-10) hace su `UPDATE` sobre esa misma
// fila. Nota primero ⇒ se confirma y el cierre procede después; cierre primero ⇒ la operación ve el estado final y se
// rechaza. El bloqueo NO se adquiere con una actualización artificial ni tocando `updated_at`. Orden de adquisición
// consistente: primero la fila de la orden y luego la nota (sin orden inverso en ningún camino: sin deadlocks).
// Las notas NO modifican `repair_orders.version` (ADR-006): no invalidan una confirmación E11 abierta.
// Sin `GenericRepository` ni tipos de Prisma hacia arriba. Las reglas (terminalidad, validación, no-op) viven en aplicación.

export type LockedOrder = { readonly status: OrderStatus };

export type StoredNote = { readonly id: string; readonly version: number; readonly content: string; readonly visibility: NoteVisibility };

export type NotesUnit = {
  /** Bloquea la fila de la orden y devuelve su estado; `null` si no existe. Debe llamarse ANTES que cualquier otra operación. */
  lockOrder(orderId: string): Promise<LockedOrder | null>;
  /** La nota SOLO si pertenece a esa orden (un `noteId` de otra orden se trata como inexistente). */
  findNote(orderId: string, noteId: string): Promise<StoredNote | null>;
  insertNote(note: { orderId: string; visibility: NoteVisibility; content: string; now: Date }): Promise<{ id: string }>;
  /** `UPDATE ... WHERE id AND order_id AND version = expectedVersion` (+1). 0 filas ⇒ `stale`. */
  updateNote(change: { orderId: string; noteId: string; expectedVersion: number; content: string; now: Date }): Promise<'applied' | 'stale'>;
  /** Borrado físico condicionado a la versión revisada. 0 filas ⇒ `stale`. */
  deleteNote(change: { orderId: string; noteId: string; expectedVersion: number }): Promise<'applied' | 'stale'>;
};

export type OrderNotesStore = {
  inTransaction<T>(work: (unit: NotesUnit) => Promise<T>): Promise<T>;
};

const TRANSACTION = { maxWaitMs: 5_000, timeoutMs: 15_000 } as const;

type OrderRow = { status: string };
type NoteRow = { id: string; version: number; content: string; visibility: string };

export function createOrderNotesStore(prisma: PrismaClient = getPrisma()): OrderNotesStore {
  return {
    inTransaction(work) {
      return runInTransaction(
        async (context) => {
          const tx = transactionClient(context);
          const unit: NotesUnit = {
            async lockOrder(orderId) {
              const rows = await tx.$queryRaw<OrderRow[]>`
                SELECT o."status"::text AS "status" FROM "repair_orders" o WHERE o."id" = ${orderId}::uuid FOR UPDATE`;
              const row = rows[0];
              if (!row) return null;
              if (!isOrderStatus(row.status)) throw new Error('Estado almacenado no válido.');
              return { status: row.status };
            },

            async findNote(orderId, noteId) {
              const rows = await tx.$queryRaw<NoteRow[]>`
                SELECT n."id"::text AS "id", n."version" AS "version", n."content" AS "content", n."visibility"::text AS "visibility"
                FROM "order_notes" n WHERE n."id" = ${noteId}::uuid AND n."order_id" = ${orderId}::uuid`;
              const row = rows[0];
              if (!row) return null;
              if (!isNoteVisibility(row.visibility)) throw new Error('Visibilidad almacenada no válida.');
              return { id: row.id, version: row.version, content: row.content, visibility: row.visibility };
            },

            async insertNote({ orderId, visibility, content, now }) {
              const id = newUuid();
              const at = now.toISOString();
              await tx.$executeRaw`
                INSERT INTO "order_notes" ("id", "order_id", "visibility", "content", "version", "created_at", "updated_at")
                VALUES (${id}::uuid, ${orderId}::uuid, ${visibility}::note_visibility, ${content}, 1, ${at}::timestamptz, ${at}::timestamptz)`;
              return { id };
            },

            async updateNote({ orderId, noteId, expectedVersion, content, now }) {
              const updated = await tx.$executeRaw`
                UPDATE "order_notes"
                SET "content" = ${content}, "version" = "version" + 1, "updated_at" = ${now.toISOString()}::timestamptz
                WHERE "id" = ${noteId}::uuid AND "order_id" = ${orderId}::uuid AND "version" = ${expectedVersion}::int`;
              return updated === 0 ? 'stale' : 'applied';
            },

            async deleteNote({ orderId, noteId, expectedVersion }) {
              const deleted = await tx.$executeRaw`
                DELETE FROM "order_notes"
                WHERE "id" = ${noteId}::uuid AND "order_id" = ${orderId}::uuid AND "version" = ${expectedVersion}::int`;
              return deleted === 0 ? 'stale' : 'applied';
            },
          };
          return work(unit);
        },
        TRANSACTION,
        prisma,
      );
    },
  };
}
