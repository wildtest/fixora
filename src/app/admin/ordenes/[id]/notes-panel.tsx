"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { formatLimaDateTime } from "@/domain/repair/format-date";
import { NOTE_MAX_LENGTH, type AdminNote, type NoteVisibility } from "@/domain/repair/note";
import { Alert } from "../../../_components/alert";
import { ButtonLink } from "../../../_components/button-link";
import { LockIcon, VisibilityIcon } from "../../../_components/icons";
import { createNote, deleteNote, editNote } from "./actions";

// Notas del detalle administrativo (CHG-12 D6/D7, ADM-04). Un compositor y una lista por bloque: Público («Lo verá el
// cliente», acción primaria «Publicar nota») e Interno («Solo la verá el taller», acción secundaria «Guardar nota interna»).
// La visibilidad la fija el bloque donde se crea y es inmutable. Cada nota lleva SU versión; editar y eliminar la envían y
// el servidor decide. Eliminar es inmediato (sin diálogo, sin papelera). `canManage` es una INDICACIÓN: el servidor lo
// recalcula en cada operación; en estados finales no hay controles («Solo lectura»). Sin mutación optimista: el estado
// vigente viene del servidor tras `refresh()`. Nunca se registra el contenido.

type Failure = "STALE_NOTE" | "NOTE_NOT_FOUND" | "ORDER_CLOSED" | "SESSION_EXPIRED" | "UNEXPECTED";

const FAILURES: Record<Failure, { variant: "warning" | "error"; title: string; text: string; refreshLabel: string | null }> = {
  STALE_NOTE: {
    variant: "warning",
    title: "La nota cambió desde que abriste esta pantalla",
    text: "La acción no se ejecutó. Actualiza para ver la nota vigente.",
    refreshLabel: "Actualizar notas",
  },
  NOTE_NOT_FOUND: { variant: "warning", title: "La nota ya no existe", text: "Actualiza para ver las notas vigentes.", refreshLabel: "Actualizar notas" },
  ORDER_CLOSED: {
    variant: "warning",
    title: "La orden ya fue cerrada",
    text: "Esta orden ya no admite notas. Actualízala para ver su estado actual.",
    refreshLabel: "Actualizar orden",
  },
  SESSION_EXPIRED: { variant: "warning", title: "Tu sesión expiró", text: "La acción no se ejecutó. Inicia sesión nuevamente para continuar.", refreshLabel: null },
  UNEXPECTED: { variant: "error", title: "Ocurrió un problema inesperado.", text: "Inténtalo nuevamente.", refreshLabel: "Actualizar notas" },
};

function classify(code: string): Failure {
  return code === "STALE_NOTE" || code === "NOTE_NOT_FOUND" || code === "ORDER_CLOSED" || code === "SESSION_EXPIRED" ? code : "UNEXPECTED";
}

const primaryButton =
  "transition-soft inline-flex h-11 w-full items-center justify-center rounded-sm bg-primary px-4 text-button text-white hover:bg-primary-hover active:bg-primary-active disabled:cursor-default disabled:bg-surface-secondary disabled:text-content-disabled md:w-auto lg:h-10";
const secondaryButton =
  "transition-soft inline-flex h-11 w-full items-center justify-center rounded-sm bg-primary-subtle px-4 text-button text-primary-active hover:bg-secondary-hover disabled:cursor-default disabled:bg-surface-secondary disabled:text-content-disabled md:w-auto lg:h-10";
const CONTROL =
  "transition-soft block w-full rounded-sm bg-surface px-3 py-3 text-body text-content placeholder:text-content-muted hover:border-content-secondary min-h-24 resize-y";

const COPY: Record<NoteVisibility, { heading: string; hint: string; submit: string; testId: string; Icon: typeof LockIcon; badge: string }> = {
  PUBLIC: { heading: "Notas públicas", hint: "Lo verá el cliente", submit: "Publicar nota", testId: "public", Icon: VisibilityIcon, badge: "Visible al cliente" },
  INTERNAL: { heading: "Notas internas", hint: "Solo la verá el taller", submit: "Guardar nota interna", testId: "internal", Icon: LockIcon, badge: "Solo taller" },
};

function FailureAlert({ failure, onRefresh, busy }: { failure: Failure; onRefresh: () => void; busy: boolean }) {
  const spec = FAILURES[failure];
  return (
    <div className="mt-2" data-testid="note-failure" data-code={failure}>
      <Alert
        variant={spec.variant}
        role="alert"
        title={spec.title}
        action={
          failure === "SESSION_EXPIRED" ? (
            <ButtonLink href="/admin/acceso">Ir al inicio de sesión</ButtonLink>
          ) : spec.refreshLabel ? (
            <button type="button" onClick={onRefresh} disabled={busy} className={secondaryButton}>
              {spec.refreshLabel}
            </button>
          ) : undefined
        }
      >
        {spec.text}
      </Alert>
    </div>
  );
}

function fieldMessage(error: string | undefined): string {
  if (error === "REQUIRED") return "Escribe el contenido de la nota.";
  if (error === "TOO_LONG") return `La nota no puede superar los ${NOTE_MAX_LENGTH} caracteres.`;
  return "La nota contiene caracteres no permitidos.";
}

export function NotesPanel({
  orderId,
  visibility,
  notes,
  canManage,
}: {
  orderId: string;
  visibility: NoteVisibility;
  notes: readonly AdminNote[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const copy = COPY[visibility];
  const refresh = () => startRefresh(() => router.refresh());

  return (
    <section aria-labelledby={`notas-${copy.testId}`} data-testid={`notes-${copy.testId}`} className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 id={`notas-${copy.testId}`} className="text-label text-content">
          {copy.heading}
        </h3>
        <span className="inline-flex items-center gap-1 text-caption text-content-secondary">
          <copy.Icon size={14} />
          {canManage ? copy.hint : "Solo lectura"}
        </span>
      </div>
      {canManage ? <Composer orderId={orderId} visibility={visibility} busy={refreshing} afterSave={refresh} onRefresh={refresh} /> : null}
      {notes.length === 0 ? (
        <p data-testid={`notes-${copy.testId}-empty`} className="text-small text-content-secondary">
          Todavía no hay notas.
        </p>
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
            <NoteItem
              key={`${note.id}-${note.version}`}
              orderId={orderId}
              visibility={visibility}
              note={note}
              canManage={canManage}
              busy={refreshing}
              afterChange={refresh}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function Composer({
  orderId,
  visibility,
  busy: refreshing,
  afterSave,
  onRefresh,
}: {
  orderId: string;
  visibility: NoteVisibility;
  busy: boolean;
  afterSave: () => void;
  onRefresh: () => void;
}) {
  const copy = COPY[visibility];
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const busy = pending || refreshing;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setPending(true);
    setFieldError(null);
    setFailure(null);
    try {
      const submitted = text;
      const result = await createNote({ orderId, visibility, content: submitted });
      if (result.ok) {
        setText((current) => (current === submitted ? "" : current)); // no borra lo que se haya escrito mientras tanto
        afterSave();
      } else if (result.code === "VALIDATION_FAILED") {
        setFieldError(fieldMessage(result.fieldErrors?.content));
      } else {
        setFailure(classify(result.code));
      }
    } catch {
      setFailure("UNEXPECTED");
    } finally {
      setPending(false);
    }
  }

  const id = `note-${copy.testId}`;
  return (
    <form noValidate onSubmit={submit} aria-label={copy.heading} data-testid={`${id}-form`}>
      <label htmlFor={id} className="text-label text-content-secondary">
        Nueva nota
      </label>
      <textarea
        id={id}
        name="content"
        rows={3}
        value={text}
        onChange={(event) => setText(event.target.value)}
        aria-invalid={fieldError ? true : undefined}
        aria-describedby={fieldError ? `${id}-error` : undefined}
        className={`${CONTROL} mt-0.5 ${fieldError ? "border-2 border-danger" : "border border-line-strong"}`}
      />
      <p className="mt-1 text-caption text-content-secondary">{copy.hint}</p>
      {fieldError ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-small text-danger-text">
          {fieldError}
        </p>
      ) : null}
      {failure ? <FailureAlert failure={failure} onRefresh={onRefresh} busy={busy} /> : null}
      <div className="mt-3">
        <button type="submit" disabled={busy} className={visibility === "PUBLIC" ? primaryButton : secondaryButton}>
          {pending ? "Guardando…" : copy.submit}
        </button>
      </div>
    </form>
  );
}

function NoteItem({
  orderId,
  visibility,
  note,
  canManage,
  busy: refreshing,
  afterChange,
}: {
  orderId: string;
  visibility: NoteVisibility;
  note: AdminNote;
  canManage: boolean;
  busy: boolean;
  afterChange: () => void;
}) {
  const copy = COPY[visibility];
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(note.content);
  const [pending, setPending] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const busy = pending || refreshing;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setPending(true);
    setFieldError(null);
    setFailure(null);
    try {
      const result = await editNote({ orderId, noteId: note.id, expectedNoteVersion: note.version, content: text });
      if (result.ok) {
        setEditing(false);
        if (result.data.changed) afterChange();
      } else if (result.code === "VALIDATION_FAILED") {
        setFieldError(fieldMessage(result.fieldErrors?.content));
      } else {
        setFailure(classify(result.code));
      }
    } catch {
      setFailure("UNEXPECTED");
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (busy) return;
    setPending(true);
    setFailure(null);
    try {
      const result = await deleteNote({ orderId, noteId: note.id, expectedNoteVersion: note.version });
      if (result.ok) afterChange();
      else setFailure(classify(result.code));
    } catch {
      setFailure("UNEXPECTED");
    } finally {
      setPending(false);
    }
  }

  return (
    <li data-testid="note-item" data-visibility={visibility} className="rounded-sm border border-line bg-surface p-3">
      <p className="flex flex-wrap items-center gap-x-2 text-caption text-content-secondary">
        <span className="inline-flex items-center gap-1 font-semibold">
          <copy.Icon size={14} />
          {copy.badge}
        </span>
        <span aria-hidden="true">·</span>
        <span>{formatLimaDateTime(note.createdAt)}</span>
      </p>
      {editing ? (
        <form noValidate onSubmit={save} className="mt-2" aria-label="Editar nota" data-testid="note-edit-form">
          <label htmlFor={`edit-${note.id}`} className="sr-only">
            Contenido de la nota
          </label>
          <textarea
            id={`edit-${note.id}`}
            rows={3}
            value={text}
            onChange={(event) => setText(event.target.value)}
            aria-invalid={fieldError ? true : undefined}
            aria-describedby={fieldError ? `edit-${note.id}-error` : undefined}
            className={`${CONTROL} ${fieldError ? "border-2 border-danger" : "border border-line-strong"}`}
          />
          {fieldError ? (
            <p id={`edit-${note.id}-error`} role="alert" className="mt-1 text-small text-danger-text">
              {fieldError}
            </p>
          ) : null}
          <div className="mt-2 flex flex-col gap-2 md:flex-row">
            <button type="submit" disabled={busy} className={secondaryButton}>
              {pending ? "Guardando…" : "Guardar cambios"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setEditing(false);
                setText(note.content);
                setFieldError(null);
              }}
              className={secondaryButton}
            >
              Descartar
            </button>
          </div>
        </form>
      ) : (
        <p data-testid="note-content" className="mt-1 whitespace-pre-wrap break-words text-body text-content [overflow-wrap:anywhere]">
          {note.content}
        </p>
      )}
      {failure ? <FailureAlert failure={failure} onRefresh={afterChange} busy={busy} /> : null}
      {canManage && !editing ? (
        <div className="mt-2 flex flex-col gap-2 md:flex-row">
          <button type="button" disabled={busy} onClick={() => setEditing(true)} className={secondaryButton}>
            Editar
          </button>
          <button type="button" disabled={busy} onClick={remove} className={secondaryButton}>
            Eliminar
          </button>
        </div>
      ) : null}
    </li>
  );
}
