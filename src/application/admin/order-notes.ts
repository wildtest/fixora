import { parseOrderId } from '../../domain/admin/order-detail';
import { canManageNotes } from '../../domain/repair/lifecycle';
import { isNoteVisibility, normalizeNoteContent } from '../../domain/repair/note';
import type { OrderNotesStore } from '../../infrastructure/admin/order-notes-store';
import type { ActionResult } from '../action-result';
import type { AdminContext } from './admin-context';

// Operaciones de nota (CHG-12 D3/D4): `createNote`, `editNote` y `deleteNote`. Cada una abre UNA transacción cuyo primer paso
// es BLOQUEAR la fila de la orden (serialización con el cierre) y comprobar ahí que la orden no sea final. Precedencia:
//   sesión (el guardia, antes) → entrada técnica → [bloqueo de la orden] → ¿existe? → ¿final? (ORDER_CLOSED)
//   → nota de ESA orden (NOTE_NOT_FOUND) → versión de la nota (STALE_NOTE) → validar el contenido → no-op → escribir.
// La concurrencia es la de la NOTA (`expectedNoteVersion`), independiente de la versión de la orden, que las notas no tocan.
// Sin fusión, sobrescritura ni last-write-wins; la edición idéntica es un éxito sin cambio efectivo, pero NUNCA oculta una
// versión obsoleta. Sin historial, autor ni marca de «editada».

export type NoteCode = 'VALIDATION_FAILED' | 'STALE_NOTE' | 'NOTE_NOT_FOUND' | 'ORDER_CLOSED';

export type CreateNoteOutcome = { readonly noteId: string; readonly version: number };
export type ChangeNoteOutcome = { readonly version: number; readonly changed: boolean };

export type NoteDependencies = { readonly store: OrderNotesStore; readonly now: () => Date };

function body(raw: unknown): Record<string, unknown> | null {
  return typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : null;
}

function parseVersion(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1 ? value : null;
}

export async function createNote(
  _admin: AdminContext,
  raw: unknown,
  { store, now }: NoteDependencies,
): Promise<ActionResult<CreateNoteOutcome, NoteCode>> {
  const input = body(raw);
  const orderId = input ? parseOrderId(input.orderId) : null;
  if (input === null || orderId === null || !isNoteVisibility(input.visibility)) return { ok: false, code: 'VALIDATION_FAILED' };
  const visibility = input.visibility;

  return store.inTransaction<ActionResult<CreateNoteOutcome, NoteCode>>(async (unit) => {
    const order = await unit.lockOrder(orderId);
    if (order === null) return { ok: false, code: 'VALIDATION_FAILED' };
    if (!canManageNotes(order.status)) return { ok: false, code: 'ORDER_CLOSED' };
    const content = normalizeNoteContent(input.content);
    if (!content.ok) return { ok: false, code: 'VALIDATION_FAILED', fieldErrors: content.fieldErrors };
    const { id } = await unit.insertNote({ orderId, visibility, content: content.value, now: now() });
    return { ok: true, data: { noteId: id, version: 1 } };
  });
}

export async function editNote(
  _admin: AdminContext,
  raw: unknown,
  { store, now }: NoteDependencies,
): Promise<ActionResult<ChangeNoteOutcome, NoteCode>> {
  const input = body(raw);
  const orderId = input ? parseOrderId(input.orderId) : null;
  const noteId = input ? parseOrderId(input.noteId) : null; // los ids de nota también son UUID
  const expectedVersion = input ? parseVersion(input.expectedNoteVersion) : null;
  if (input === null || orderId === null || noteId === null || expectedVersion === null) return { ok: false, code: 'VALIDATION_FAILED' };

  return store.inTransaction<ActionResult<ChangeNoteOutcome, NoteCode>>(async (unit) => {
    const order = await unit.lockOrder(orderId);
    if (order === null) return { ok: false, code: 'VALIDATION_FAILED' };
    if (!canManageNotes(order.status)) return { ok: false, code: 'ORDER_CLOSED' };
    const note = await unit.findNote(orderId, noteId);
    if (note === null) return { ok: false, code: 'NOTE_NOT_FOUND' };
    // La versión obsoleta gana al no-op: una instantánea vieja no se acepta en silencio aunque el texto coincida.
    if (note.version !== expectedVersion) return { ok: false, code: 'STALE_NOTE' };
    const content = normalizeNoteContent(input.content);
    if (!content.ok) return { ok: false, code: 'VALIDATION_FAILED', fieldErrors: content.fieldErrors };
    if (content.value === note.content) return { ok: true, data: { version: note.version, changed: false } };
    const applied = await unit.updateNote({ orderId, noteId, expectedVersion, content: content.value, now: now() });
    if (applied === 'stale') return { ok: false, code: 'STALE_NOTE' };
    return { ok: true, data: { version: expectedVersion + 1, changed: true } };
  });
}

export async function deleteNote(
  _admin: AdminContext,
  raw: unknown,
  { store }: NoteDependencies,
): Promise<ActionResult<{ readonly deleted: true }, NoteCode>> {
  const input = body(raw);
  const orderId = input ? parseOrderId(input.orderId) : null;
  const noteId = input ? parseOrderId(input.noteId) : null;
  const expectedVersion = input ? parseVersion(input.expectedNoteVersion) : null;
  if (input === null || orderId === null || noteId === null || expectedVersion === null) return { ok: false, code: 'VALIDATION_FAILED' };

  return store.inTransaction<ActionResult<{ readonly deleted: true }, NoteCode>>(async (unit) => {
    const order = await unit.lockOrder(orderId);
    if (order === null) return { ok: false, code: 'VALIDATION_FAILED' };
    if (!canManageNotes(order.status)) return { ok: false, code: 'ORDER_CLOSED' };
    const note = await unit.findNote(orderId, noteId);
    if (note === null) return { ok: false, code: 'NOTE_NOT_FOUND' }; // eliminar una nota ya eliminada no es un éxito idempotente
    if (note.version !== expectedVersion) return { ok: false, code: 'STALE_NOTE' };
    const deleted = await unit.deleteNote({ orderId, noteId, expectedVersion });
    if (deleted === 'stale') return { ok: false, code: 'STALE_NOTE' };
    return { ok: true, data: { deleted: true } };
  });
}
