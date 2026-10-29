"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { DIAGNOSIS_MAX_LENGTH } from "@/domain/repair/diagnosis";
import { formatSoles } from "@/domain/repair/money";
import type { OrderStatus } from "@/domain/repair/order-status";
import { Alert } from "../../../_components/alert";
import { ButtonLink } from "../../../_components/button-link";
import { LockIcon } from "../../../_components/icons";
import { saveDiagnosis, saveEstimatedCost } from "./actions";

// Diagnóstico y costo estimado en el bloque Público de ADM-04 (CHG-11 D7, DESIGN §11). DOS guardados independientes
// (uno por campo; cada uno con su `expectedVersion`, transacción e historial). Editables solo en los tres primeros
// estados; desde Esperando aprobación están CONGELADOS («Congelado», borde discontinuo, candado, sin guardar) y en
// Entregado/Cancelado son de solo lectura («Solo lectura»; «Nunca se publicó al cliente» si la orden se canceló sin
// alcanzar Esperando aprobación). `canEdit` es una INDICACIÓN: el servidor lo recalcula en cada guardado. Sin mutación
// optimista: el valor vigente proviene del servidor tras `refresh()`. Nunca se muestra `S/ 0.00` ni valores técnicos.

type Failure = "STALE_ORDER" | "ORDER_CLOSED" | "DIAGNOSIS_AND_COST_FROZEN" | "SESSION_EXPIRED" | "UNEXPECTED";

const FAILURES: Record<Failure, { variant: "warning" | "error"; title: string; text: string; refresh: boolean }> = {
  STALE_ORDER: {
    variant: "warning",
    title: "La orden cambió desde que abriste esta pantalla",
    text: "La acción no se ejecutó. Actualiza para ver la información vigente.",
    refresh: true,
  },
  ORDER_CLOSED: {
    variant: "warning",
    title: "La orden ya fue cerrada",
    text: "Esta orden ya no admite cambios. Actualízala para ver su estado actual.",
    refresh: true,
  },
  DIAGNOSIS_AND_COST_FROZEN: {
    variant: "warning",
    title: "El diagnóstico y el costo ya están congelados",
    text: "Ya no pueden modificarse. Actualiza para ver la información vigente.",
    refresh: true,
  },
  SESSION_EXPIRED: { variant: "warning", title: "Tu sesión expiró", text: "La acción no se ejecutó. Inicia sesión nuevamente para continuar.", refresh: false },
  UNEXPECTED: { variant: "error", title: "Ocurrió un problema inesperado.", text: "Inténtalo nuevamente.", refresh: true },
};

const secondaryButton =
  "transition-soft inline-flex h-11 w-full items-center justify-center rounded-sm bg-primary-subtle px-4 text-button text-primary-active hover:bg-secondary-hover disabled:cursor-default disabled:bg-surface-secondary disabled:text-content-disabled md:w-auto lg:h-10";
const CONTROL =
  "transition-soft block w-full rounded-sm bg-surface px-3 text-body text-content placeholder:text-content-muted hover:border-content-secondary";

type FieldState = { failure: Failure | null; fieldError: string | null; pending: boolean };
const IDLE: FieldState = { failure: null, fieldError: null, pending: false };

function NotVisibleLabel() {
  return (
    <p className="mt-1 text-caption text-content-secondary" data-testid="not-visible-label">
      Aún no visible para el cliente
    </p>
  );
}

function FailureAlert({ failure, onRefresh, busy }: { failure: Failure; onRefresh: () => void; busy: boolean }) {
  const spec = FAILURES[failure];
  return (
    <div className="mt-2">
      <Alert
        variant={spec.variant}
        role="alert"
        title={spec.title}
        action={
          failure === "SESSION_EXPIRED" ? (
            <ButtonLink href="/admin/acceso">Ir al inicio de sesión</ButtonLink>
          ) : spec.refresh ? (
            <button type="button" onClick={onRefresh} disabled={busy} className={secondaryButton}>
              Actualizar orden
            </button>
          ) : undefined
        }
      >
        {spec.text}
      </Alert>
    </div>
  );
}

function classify(code: string): Failure {
  return code === "STALE_ORDER" || code === "ORDER_CLOSED" || code === "DIAGNOSIS_AND_COST_FROZEN" || code === "SESSION_EXPIRED"
    ? code
    : "UNEXPECTED";
}

function ReadOnlyField({ label, status, neverPublished, children, testId }: { label: string; status: OrderStatus; neverPublished: boolean; children: React.ReactNode; testId: string }) {
  const terminal = status === "ENTREGADO" || status === "CANCELADO";
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <dt className="text-label text-content-secondary">{label}</dt>
        <span className="inline-flex items-center gap-1 text-caption text-content-secondary" data-testid={`${testId}-state`}>
          <LockIcon size={14} />
          {terminal ? "Solo lectura" : "Congelado"}
        </span>
      </div>
      <dd data-testid={testId} className="mt-0.5 whitespace-pre-wrap break-words rounded-sm border border-dashed border-line-strong bg-surface-secondary p-3 text-body text-content-secondary [overflow-wrap:anywhere]">
        {children}
      </dd>
      {neverPublished ? (
        <p className="mt-1 text-caption text-content-secondary" data-testid="never-published">
          Nunca se publicó al cliente
        </p>
      ) : null}
    </div>
  );
}

const absent = <span className="text-content-muted">No registrado</span>;

export function DiagnosisCostPanel({
  orderId,
  version,
  status,
  diagnosis,
  estimatedCost,
  canEdit,
  neverPublished,
}: {
  orderId: string;
  version: number;
  status: OrderStatus;
  diagnosis: string | null;
  estimatedCost: string | null;
  canEdit: boolean;
  neverPublished: boolean;
}) {
  if (!canEdit) {
    return (
      <dl className="space-y-4">
        <ReadOnlyField label="Diagnóstico" status={status} neverPublished={neverPublished} testId="diagnosis-readonly">
          {diagnosis ?? absent}
        </ReadOnlyField>
        <ReadOnlyField label="Costo estimado" status={status} neverPublished={neverPublished} testId="cost-readonly">
          {estimatedCost === null ? absent : formatSoles(estimatedCost)}
        </ReadOnlyField>
      </dl>
    );
  }
  // El `key` de cada formulario es SU valor vigente: tras guardar ese campo se reinicia con el valor del servidor, y guardar
  // el otro no borra lo que se esté escribiendo en éste. Los avisos de éxito viven aquí para sobrevivir a ese reinicio.
  return (
    <EditableFields
      orderId={orderId}
      version={version}
      diagnosis={diagnosis ?? ""}
      estimatedCost={estimatedCost ?? ""}
    />
  );
}

// El refresco del servidor es COMPARTIDO por los dos formularios: mientras la orden se recarga (la versión cambia tras un
// guardado), ninguno de los dos guarda, para que un envío nunca viaje con la versión anterior.
type Refresh = { busy: boolean; afterSave: () => void; now: () => void };

function EditableFields({ orderId, version, diagnosis, estimatedCost }: { orderId: string; version: number; diagnosis: string; estimatedCost: string }) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const refresh: Refresh = { busy: refreshing, afterSave: () => startRefresh(() => router.refresh()), now: () => startRefresh(() => router.refresh()) };
  const [notices, setNotices] = useState<{ diagnosis: string | null; cost: string | null }>({ diagnosis: null, cost: null });
  return (
    <>
      <DiagnosisForm
        key={`d-${diagnosis}`}
        orderId={orderId}
        version={version}
        initial={diagnosis}
        refresh={refresh}
        notice={notices.diagnosis}
        onNotice={(diagnosisNotice) => setNotices((current) => ({ ...current, diagnosis: diagnosisNotice }))}
      />
      <CostForm
        key={`c-${estimatedCost}`}
        orderId={orderId}
        version={version}
        initial={estimatedCost}
        refresh={refresh}
        notice={notices.cost}
        onNotice={(costNotice) => setNotices((current) => ({ ...current, cost: costNotice }))}
      />
    </>
  );
}

type NoticeProps = { notice: string | null; onNotice: (notice: string | null) => void; refresh: Refresh };

function useFieldSave(refresh: Refresh) {
  const [state, setState] = useState<FieldState>(IDLE);
  return {
    state,
    setState,
    refreshing: refresh.busy,
    refresh: () => {
      setState(IDLE);
      refresh.now();
    },
    refreshAfterSave: refresh.afterSave,
  };
}

function DiagnosisForm({ orderId, version, initial, notice, onNotice, refresh: shared }: { orderId: string; version: number; initial: string } & NoticeProps) {
  const [text, setText] = useState(initial);
  const { state, setState, refreshing, refresh, refreshAfterSave } = useFieldSave(shared);
  const busy = state.pending || refreshing;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setState({ ...IDLE, pending: true });
    onNotice(null);
    try {
      const result = await saveDiagnosis({ orderId, diagnosis: text, expectedVersion: version });
      if (result.ok) {
        setState(IDLE);
        onNotice(result.data.changed ? "Diagnóstico guardado." : "Sin cambios que guardar.");
        if (result.data.changed) refreshAfterSave();
      } else if (result.code === "VALIDATION_FAILED") {
        const error = result.fieldErrors?.diagnosis;
        setState({
          ...IDLE,
          fieldError:
            error === "TOO_LONG"
              ? `El diagnóstico no puede superar los ${DIAGNOSIS_MAX_LENGTH} caracteres.`
              : "El diagnóstico contiene caracteres no permitidos.",
        });
      } else {
        setState({ ...IDLE, failure: classify(result.code) });
      }
    } catch {
      setState({ ...IDLE, failure: "UNEXPECTED" });
    }
  }

  return (
    <form noValidate onSubmit={submit} aria-label="Diagnóstico" data-testid="diagnosis-form">
      <label htmlFor="diagnosis" className="text-label text-content-secondary">
        Diagnóstico
      </label>
      <textarea
        id="diagnosis"
        name="diagnosis"
        rows={4}
        value={text}
        onChange={(event) => setText(event.target.value)}
        aria-invalid={state.fieldError ? true : undefined}
        aria-describedby={state.fieldError ? "diagnosis-error" : undefined}
        className={`${CONTROL} mt-0.5 min-h-28 resize-y py-3 ${state.fieldError ? "border-2 border-danger" : "border border-line-strong"}`}
      />
      <NotVisibleLabel />
      {state.fieldError ? (
        <p id="diagnosis-error" role="alert" className="mt-1 text-small text-danger-text">
          {state.fieldError}
        </p>
      ) : null}
      {state.failure ? <FailureAlert failure={state.failure} onRefresh={refresh} busy={busy} /> : null}
      <div className="mt-3 flex items-center gap-3">
        <button type="submit" disabled={busy} className={secondaryButton}>
          {state.pending ? "Guardando…" : "Guardar diagnóstico"}
        </button>
        {notice ? (
          <p role="status" data-testid="diagnosis-notice" className="text-small text-success">
            {notice}
          </p>
        ) : null}
      </div>
    </form>
  );
}

function CostForm({ orderId, version, initial, notice, onNotice, refresh: shared }: { orderId: string; version: number; initial: string } & NoticeProps) {
  const [text, setText] = useState(initial);
  const { state, setState, refreshing, refresh, refreshAfterSave } = useFieldSave(shared);
  const busy = state.pending || refreshing;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setState({ ...IDLE, pending: true });
    onNotice(null);
    try {
      const result = await saveEstimatedCost({ orderId, estimatedCost: text, expectedVersion: version });
      if (result.ok) {
        setState(IDLE);
        onNotice(result.data.changed ? "Costo guardado." : "Sin cambios que guardar.");
        if (result.data.changed) refreshAfterSave();
      } else if (result.code === "VALIDATION_FAILED") {
        setState({ ...IDLE, fieldError: "Ingresa un monto mayor que cero con hasta dos decimales." });
      } else {
        setState({ ...IDLE, failure: classify(result.code) });
      }
    } catch {
      setState({ ...IDLE, failure: "UNEXPECTED" });
    }
  }

  return (
    <form noValidate onSubmit={submit} aria-label="Costo estimado" data-testid="cost-form">
      <label htmlFor="estimatedCost" className="text-label text-content-secondary">
        Costo estimado
      </label>
      <div className="mt-0.5 flex items-center gap-2">
        <span aria-hidden="true" className="text-body text-content-secondary">
          S/
        </span>
        <input
          id="estimatedCost"
          name="estimatedCost"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={text}
          onChange={(event) => setText(event.target.value)}
          aria-invalid={state.fieldError ? true : undefined}
          aria-describedby={state.fieldError ? "cost-error cost-hint" : "cost-hint"}
          className={`${CONTROL} h-11 max-w-48 ${state.fieldError ? "border-2 border-danger" : "border border-line-strong"}`}
        />
      </div>
      <p id="cost-hint" className="mt-1 text-small text-content-secondary">
        Monto mayor que cero, con hasta dos decimales.
      </p>
      <NotVisibleLabel />
      {state.fieldError ? (
        <p id="cost-error" role="alert" className="mt-1 text-small text-danger-text">
          {state.fieldError}
        </p>
      ) : null}
      {state.failure ? <FailureAlert failure={state.failure} onRefresh={refresh} busy={busy} /> : null}
      <div className="mt-3 flex items-center gap-3">
        <button type="submit" disabled={busy} className={secondaryButton}>
          {state.pending ? "Guardando…" : "Guardar costo"}
        </button>
        {notice ? (
          <p role="status" data-testid="cost-notice" className="text-small text-success">
            {notice}
          </p>
        ) : null}
      </div>
    </form>
  );
}
