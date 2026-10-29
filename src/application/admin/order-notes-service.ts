import 'server-only';
import { createOrderNotesStore } from '../../infrastructure/admin/order-notes-store';
import type { ActionResult } from '../action-result';
import { runAction } from '../run-action';
import { guardAdminAction, type SessionExpiredCode } from './admin-action';
import type { AdminContext } from './admin-context';
import { createNote, deleteNote, editNote, type ChangeNoteOutcome, type CreateNoteOutcome, type NoteCode } from './order-notes';

// Composición de producción de las notas (CHG-12). La sesión se comprueba en CADA llamada (`SESSION_EXPIRED` antes de
// abrir la transacción o leer nada) y un fallo inesperado se convierte en `INTERNAL_ERROR` sin detalles. `authenticate`
// lo aporta el adaptador de `src/app`. NUNCA se registra el contenido de una nota.
type Authenticate = () => Promise<AdminContext | null>;

const dependencies = () => ({ store: createOrderNotesStore(), now: () => new Date() });

export function createNoteAction(authenticate: Authenticate, raw: unknown): Promise<ActionResult<CreateNoteOutcome, NoteCode | SessionExpiredCode>> {
  return runAction<CreateNoteOutcome, NoteCode | SessionExpiredCode>(
    () => guardAdminAction(authenticate, (admin) => createNote(admin, raw, dependencies())),
    { surface: 'admin' },
  );
}

export function editNoteAction(authenticate: Authenticate, raw: unknown): Promise<ActionResult<ChangeNoteOutcome, NoteCode | SessionExpiredCode>> {
  return runAction<ChangeNoteOutcome, NoteCode | SessionExpiredCode>(
    () => guardAdminAction(authenticate, (admin) => editNote(admin, raw, dependencies())),
    { surface: 'admin' },
  );
}

export function deleteNoteAction(authenticate: Authenticate, raw: unknown): Promise<ActionResult<{ readonly deleted: true }, NoteCode | SessionExpiredCode>> {
  return runAction<{ readonly deleted: true }, NoteCode | SessionExpiredCode>(
    () => guardAdminAction(authenticate, (admin) => deleteNote(admin, raw, dependencies())),
    { surface: 'admin' },
  );
}
