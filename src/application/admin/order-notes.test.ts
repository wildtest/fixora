import { describe, expect, it } from 'vitest';
import type { NoteVisibility } from '../../domain/repair/note';
import type { OrderStatus } from '../../domain/repair/order-status';
import type { NotesUnit, OrderNotesStore, StoredNote } from '../../infrastructure/admin/order-notes-store';
import { issueAdminContext } from './admin-context';
import { createNote, deleteNote, editNote } from './order-notes';

// Notas con un repositorio falso: precedencia, no-op, sin escritura ante rechazos y orden de las operaciones (bloqueo primero).
const admin = issueAdminContext('admin-1');
const ID = '0f8fad5b-d9cb-469f-a165-70867728950e';
const NOTE_ID = '3f8fad5b-d9cb-469f-a165-70867728950e';
const NOW = new Date('2026-10-29T10:00:00.000Z');

function setup(status: OrderStatus | null, note: StoredNote | null = null, write: 'applied' | 'stale' = 'applied') {
  const calls: string[] = [];
  const inserts: unknown[] = [];
  const updates: unknown[] = [];
  const deletes: unknown[] = [];
  const unit: NotesUnit = {
    lockOrder: async () => (calls.push('lock'), status === null ? null : { status }),
    findNote: async () => (calls.push('find'), note),
    insertNote: async (n) => (calls.push('insert'), inserts.push(n), { id: NOTE_ID }),
    updateNote: async (c) => (calls.push('update'), updates.push(c), write),
    deleteNote: async (c) => (calls.push('delete'), deletes.push(c), write),
  };
  const store: OrderNotesStore = { inTransaction: (work) => work(unit) };
  return { deps: { store, now: () => NOW }, calls, inserts, updates, deletes };
}

const stored = (version = 2, content = 'Texto', visibility: NoteVisibility = 'PUBLIC'): StoredNote => ({ id: NOTE_ID, version, content, visibility });
const create = (content: unknown, visibility: unknown = 'PUBLIC', orderId: unknown = ID) => ({ orderId, visibility, content });
const edit = (content: unknown, expectedNoteVersion: unknown = 2, noteId: unknown = NOTE_ID, orderId: unknown = ID) => ({ orderId, noteId, expectedNoteVersion, content });
const remove = (expectedNoteVersion: unknown = 2, noteId: unknown = NOTE_ID, orderId: unknown = ID) => ({ orderId, noteId, expectedNoteVersion });

describe('createNote', () => {
  it('entrada técnica inválida: VALIDATION_FAILED sin abrir la transacción de escritura', async () => {
    const s = setup('EN_DIAGNOSTICO');
    for (const raw of [null, 'x', create('x', 'PRIVATE'), create('x', 'public'), create('x', 'PUBLIC', 'no-uuid')]) {
      expect(await createNote(admin, raw, s.deps), JSON.stringify(raw)).toEqual({ ok: false, code: 'VALIDATION_FAILED' });
    }
    expect(s.calls).toEqual([]);
  });

  it('crea en los seis estados no finales con el texto recortado, la visibilidad pedida y el instante inyectado', async () => {
    for (const status of ['SOLICITUD_RECIBIDA', 'EQUIPO_RECIBIDO', 'EN_DIAGNOSTICO', 'ESPERANDO_APROBACION', 'EN_REPARACION', 'LISTO_PARA_RECOJO'] as const) {
      const s = setup(status);
      expect(await createNote(admin, create('  Hola  ', 'INTERNAL'), s.deps), status).toEqual({ ok: true, data: { noteId: NOTE_ID, version: 1 } });
      expect(s.inserts).toEqual([{ orderId: ID, visibility: 'INTERNAL', content: 'Hola', now: NOW }]);
      expect(s.calls[0]).toBe('lock'); // el bloqueo de la orden es lo primero
    }
  });

  it('orden final → ORDER_CLOSED aunque el contenido sea inválido; sin escritura', async () => {
    for (const status of ['ENTREGADO', 'CANCELADO'] as const) {
      const s = setup(status);
      expect(await createNote(admin, create('   '), s.deps)).toEqual({ ok: false, code: 'ORDER_CLOSED' });
      expect(s.inserts).toEqual([]);
    }
  });

  it('orden inexistente → VALIDATION_FAILED; contenido vacío o largo → fieldErrors', async () => {
    expect(await createNote(admin, create('x'), setup(null).deps)).toEqual({ ok: false, code: 'VALIDATION_FAILED' });
    const s = setup('EN_DIAGNOSTICO');
    expect(await createNote(admin, create(''), s.deps)).toEqual({ ok: false, code: 'VALIDATION_FAILED', fieldErrors: { content: 'REQUIRED' } });
    expect(await createNote(admin, create('a'.repeat(2001)), s.deps)).toEqual({ ok: false, code: 'VALIDATION_FAILED', fieldErrors: { content: 'TOO_LONG' } });
    expect(s.inserts).toEqual([]);
  });
});

describe('editNote', () => {
  it('entrada técnica inválida sin tocar el repositorio', async () => {
    const s = setup('EN_DIAGNOSTICO', stored());
    for (const raw of [null, edit('x', 0), edit('x', 1.5), edit('x', '2'), edit('x', 2, 'no-uuid'), edit('x', 2, NOTE_ID, 'no-uuid')]) {
      expect(await editNote(admin, raw, s.deps), JSON.stringify(raw)).toEqual({ ok: false, code: 'VALIDATION_FAILED' });
    }
    expect(s.calls).toEqual([]);
  });

  it('precedencia: ORDER_CLOSED → NOTE_NOT_FOUND → STALE_NOTE → validación', async () => {
    expect(await editNote(admin, edit(''), setup('ENTREGADO', stored()).deps)).toEqual({ ok: false, code: 'ORDER_CLOSED' });
    expect(await editNote(admin, edit(''), setup('EN_DIAGNOSTICO', null).deps)).toEqual({ ok: false, code: 'NOTE_NOT_FOUND' });
    expect(await editNote(admin, edit('', 1), setup('EN_DIAGNOSTICO', stored(2)).deps)).toEqual({ ok: false, code: 'STALE_NOTE' });
    expect(await editNote(admin, edit('', 2), setup('EN_DIAGNOSTICO', stored(2)).deps)).toEqual({ ok: false, code: 'VALIDATION_FAILED', fieldErrors: { content: 'REQUIRED' } });
  });

  it('cambia el texto: UPDATE condicional a la versión revisada y devuelve la versión siguiente', async () => {
    const s = setup('EN_REPARACION', stored(2, 'Antes'));
    expect(await editNote(admin, edit('  Después '), s.deps)).toEqual({ ok: true, data: { version: 3, changed: true } });
    expect(s.updates).toEqual([{ orderId: ID, noteId: NOTE_ID, expectedVersion: 2, content: 'Después', now: NOW }]);
  });

  it('texto idéntico tras el trim con versión vigente: éxito sin UPDATE ni versión nueva', async () => {
    const s = setup('EN_DIAGNOSTICO', stored(2, 'Mismo'));
    expect(await editNote(admin, edit(' Mismo '), s.deps)).toEqual({ ok: true, data: { version: 2, changed: false } });
    expect(s.updates).toEqual([]);
  });

  it('versión obsoleta con texto coincidente NO es un no-op: STALE_NOTE', async () => {
    const s = setup('EN_DIAGNOSTICO', stored(3, 'Mismo'));
    expect(await editNote(admin, edit('Mismo', 2), s.deps)).toEqual({ ok: false, code: 'STALE_NOTE' });
    expect(s.updates).toEqual([]);
  });

  it('el UPDATE condicional que no afecta filas (carrera) → STALE_NOTE', async () => {
    const s = setup('EN_DIAGNOSTICO', stored(2, 'Antes'), 'stale');
    expect(await editNote(admin, edit('Nuevo'), s.deps)).toEqual({ ok: false, code: 'STALE_NOTE' });
  });
});

describe('deleteNote', () => {
  it('elimina con la versión revisada; sin confirmación ni historial', async () => {
    const s = setup('LISTO_PARA_RECOJO', stored(4));
    expect(await deleteNote(admin, remove(4), s.deps)).toEqual({ ok: true, data: { deleted: true } });
    expect(s.deletes).toEqual([{ orderId: ID, noteId: NOTE_ID, expectedVersion: 4 }]);
  });

  it('precedencia y rechazos: ORDER_CLOSED, NOTE_NOT_FOUND (no idempotente), STALE_NOTE', async () => {
    expect(await deleteNote(admin, remove(), setup('CANCELADO', stored()).deps)).toEqual({ ok: false, code: 'ORDER_CLOSED' });
    expect(await deleteNote(admin, remove(), setup('EN_DIAGNOSTICO', null).deps)).toEqual({ ok: false, code: 'NOTE_NOT_FOUND' });
    const stale = setup('EN_DIAGNOSTICO', stored(3));
    expect(await deleteNote(admin, remove(2), stale.deps)).toEqual({ ok: false, code: 'STALE_NOTE' });
    expect(stale.deletes).toEqual([]);
    expect(await deleteNote(admin, remove(2), setup('EN_DIAGNOSTICO', stored(2), 'stale').deps)).toEqual({ ok: false, code: 'STALE_NOTE' });
  });

  it('entrada técnica inválida sin tocar el repositorio', async () => {
    const s = setup('EN_DIAGNOSTICO', stored());
    for (const raw of [null, remove(0), remove(2, 'no-uuid'), remove('2')]) {
      expect(await deleteNote(admin, raw, s.deps), JSON.stringify(raw)).toEqual({ ok: false, code: 'VALIDATION_FAILED' });
    }
    expect(s.calls).toEqual([]);
  });
});
