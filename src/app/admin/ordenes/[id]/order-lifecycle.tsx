"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { AllowedTransition } from "@/domain/repair/lifecycle";
import { formatSoles } from "@/domain/repair/money";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/domain/repair/order-status";
import { Alert } from "../../../_components/alert";
import { ButtonLink } from "../../../_components/button-link";
import { ConfirmDialog, type DialogVariant } from "./confirm-dialog";
import { transitionOrderStatus } from "./actions";

// Acciones de ciclo de vida de ADM-04 (CHG-10 D8), FUERA del Repair Journey: como máximo el avance normal del estado
// actual («Avanzar a …», primaria) y, donde corresponda, «Cancelar orden» (contorno destructivo). Sin selector libre,
// sin etapas clicables y SIN lógica de transición: este componente solo consume `allowedTransitions` (indicación de
// presentación) y envía `targetStatus`, `expectedVersion` y `confirmed`; el servidor lo recalcula todo. Sin mutación
// optimista: el estado de negocio proviene del resultado y del refresco del servidor. En estados finales no hay controles.

type Failure =
  | "STALE_ORDER"
  | "TRANSITION_NOT_ALLOWED"
  | "CONFIRMATION_REQUIRED"
  | "DIAGNOSIS_AND_COST_REQUIRED"
  | "SESSION_EXPIRED"
  | "UNEXPECTED";

type DialogSpec = {
  variant: DialogVariant;
  title: (code: string) => string;
  description?: string;
  alert: { variant: "info" | "warning" | "error"; title?: string; text: string };
};

// Copy de DESIGN §12 (la redacción final es ajustable sin alterar las consecuencias). El resumen de diagnóstico y costo
// del #1 y la frase sobre notas del #3 llegan con CHG-11 y CHG-12; aquí no se muestran datos ni instrucciones inexistentes.
const DIALOGS: Partial<Record<OrderStatus, DialogSpec>> = {
  ESPERANDO_APROBACION: {
    variant: "normal",
    title: () => "¿Publicar diagnóstico y costo estimado?",
    description: "Revisa los datos. Al confirmar quedarán congelados y disponibles para el cliente.",
    alert: { variant: "info", text: "Después no podrán modificarse." },
  },
  EN_REPARACION: {
    variant: "warning",
    title: () => "¿El cliente aprobó la reparación?",
    description: "Confirma solo si el cliente aprobó fuera de FIXORA.",
    alert: { variant: "warning", title: "No se puede deshacer.", text: "Desde este momento la reparación ya no podrá cancelarse." },
  },
  CANCELADO: {
    variant: "destructive",
    title: (code) => `¿Cancelar la orden ${code}?`,
    description: "Si quieres dejar una explicación pública o interna, regístrala antes de confirmar.",
    alert: { variant: "error", title: "Acción irreversible.", text: "La orden quedará cerrada y no podrá reabrirse." },
  },
  ENTREGADO: {
    variant: "warning",
    title: () => "¿Marcar como entregado?",
    alert: { variant: "warning", text: "La orden quedará cerrada y no podrá modificarse." },
  },
};

const FAILURES: Record<Exclude<Failure, "SESSION_EXPIRED">, { variant: "warning" | "error"; title: string; text: string; refresh: boolean }> = {
  STALE_ORDER: {
    variant: "warning",
    title: "La orden cambió desde que abriste esta pantalla",
    text: "La acción no se ejecutó. Actualiza para ver la información vigente.",
    refresh: true,
  },
  TRANSITION_NOT_ALLOWED: {
    variant: "warning",
    title: "El cambio de estado ya no está disponible",
    text: "La orden cambió desde que la revisaste. Actualízala e inténtalo nuevamente.",
    refresh: true,
  },
  CONFIRMATION_REQUIRED: { variant: "warning", title: "Confirma la acción", text: "Debes confirmar esta acción antes de continuar.", refresh: false },
  DIAGNOSIS_AND_COST_REQUIRED: {
    variant: "warning",
    title: "Faltan datos de la reparación",
    text: "Completa el diagnóstico y el costo estimado antes de continuar.",
    refresh: false,
  },
  UNEXPECTED: { variant: "error", title: "Ocurrió un problema inesperado.", text: "Inténtalo nuevamente.", refresh: true },
};

// Resumen del diálogo #1 (DESIGN §12): el diagnóstico y el costo vigentes que se publicarán. Corresponde a la versión revisada:
// si cambian antes de confirmar, la confirmación vieja devuelve STALE_ORDER y no se publica nada.
function PublicationSummary({ summary }: { summary: { diagnosis: string | null; estimatedCost: string | null } }) {
  return (
    <dl data-testid="publication-summary" className="space-y-3 rounded-md bg-surface-secondary p-4">
      <div>
        <dt className="text-label text-content-secondary">Diagnóstico</dt>
        <dd data-testid="summary-diagnosis" className="mt-0.5 max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-body text-content [overflow-wrap:anywhere]">
          {summary.diagnosis}
        </dd>
      </div>
      <div>
        <dt className="text-label text-content-secondary">Costo estimado</dt>
        <dd data-testid="summary-cost" className="mt-0.5 text-card-title tabular-nums text-primary-active">
          {summary.estimatedCost === null ? null : formatSoles(summary.estimatedCost)}
        </dd>
      </div>
    </dl>
  );
}

const secondaryButton =
  "transition-soft inline-flex h-11 w-full items-center justify-center rounded-sm bg-primary-subtle px-4 text-button text-primary-active hover:bg-secondary-hover md:w-auto lg:h-10";

export function OrderLifecycle({
  orderId,
  trackingCode,
  status,
  version,
  allowedTransitions,
  summary,
}: {
  orderId: string;
  trackingCode: string;
  status: OrderStatus;
  version: number;
  allowedTransitions: readonly AllowedTransition[];
  /** Diagnóstico y costo vigentes de la versión revisada: es lo que muestra el resumen del diálogo #1. */
  summary: { diagnosis: string | null; estimatedCost: string | null };
}) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [dialog, setDialog] = useState<AllowedTransition | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // El rechazo se asocia a la versión revisada: cuando el servidor entrega una versión nueva, el aviso deja de aplicar.
  const [rejection, setFailure] = useState<{ code: Failure; version: number } | null>(null);
  const [applied, setApplied] = useState<OrderStatus | null>(null);

  const failure = rejection !== null && rejection.version === version ? rejection.code : null;

  const advance = allowedTransitions.find((t) => t.targetStatus !== "CANCELADO");
  const cancel = allowedTransitions.find((t) => t.targetStatus === "CANCELADO");
  if (!advance && !cancel) return null; // estados finales: sin acciones

  const busy = submitting || refreshing;

  function refresh() {
    setFailure(null);
    startRefresh(() => router.refresh());
  }

  async function run(transition: AllowedTransition, confirmed: boolean) {
    if (busy) return;
    setSubmitting(true);
    setFailure(null);
    setApplied(null);
    try {
      const result = await transitionOrderStatus({ orderId, targetStatus: transition.targetStatus, expectedVersion: version, confirmed });
      setDialog(null);
      if (result.ok) {
        setApplied(result.data.status);
        startRefresh(() => router.refresh());
      } else if (result.code === "SESSION_EXPIRED") {
        setFailure({ code: "SESSION_EXPIRED", version });
      } else if (result.code in FAILURES) {
        setFailure({ code: result.code as Failure, version });
      } else {
        setFailure({ code: "UNEXPECTED", version });
      }
    } catch {
      setDialog(null);
      setFailure({ code: "UNEXPECTED", version });
    } finally {
      setSubmitting(false);
    }
  }

  function start(transition: AllowedTransition) {
    if (busy || transition.blockedReason) return;
    if (transition.requiresConfirmation) setDialog(transition);
    else void run(transition, false);
  }

  const spec = dialog ? DIALOGS[dialog.targetStatus] : undefined;

  return (
    <section aria-labelledby="acciones-titulo" data-testid="lifecycle-actions" className="space-y-4">
      <h2 id="acciones-titulo" className="text-h3 text-content">
        Acciones de la orden
      </h2>

      {failure === "SESSION_EXPIRED" ? (
        <Alert variant="warning" role="alert" title="Tu sesión expiró" action={<ButtonLink href="/admin/acceso">Ir al inicio de sesión</ButtonLink>}>
          La acción no se ejecutó. Inicia sesión nuevamente para continuar.
        </Alert>
      ) : failure ? (
        <Alert
          variant={FAILURES[failure].variant}
          role="alert"
          title={FAILURES[failure].title}
          action={
            FAILURES[failure].refresh ? (
              <button type="button" onClick={refresh} disabled={busy} className={secondaryButton}>
                Actualizar orden
              </button>
            ) : undefined
          }
        >
          {FAILURES[failure].text}
        </Alert>
      ) : applied ? (
        <Alert variant="success" role="status" title="Estado actualizado">
          La orden pasó a «{ORDER_STATUS_LABELS[applied]}» y el cambio quedó registrado en el historial.
        </Alert>
      ) : null}

      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-start">
        {advance ? (
          <div className="flex flex-col gap-1">
            <button
              type="button"
              disabled={busy || Boolean(advance.blockedReason)}
              aria-describedby={advance.blockedReason ? "avance-bloqueado" : undefined}
              onClick={() => start(advance)}
              className="transition-soft inline-flex h-11 w-full items-center justify-center rounded-sm bg-primary px-4 text-button text-white hover:bg-primary-hover active:bg-primary-active disabled:cursor-default disabled:bg-surface-secondary disabled:text-content-disabled md:w-auto lg:h-10"
            >
              Avanzar a {ORDER_STATUS_LABELS[advance.targetStatus]}
            </button>
            {advance.blockedReason ? (
              <p id="avance-bloqueado" data-testid="advance-blocked" className="max-w-md text-small text-content-secondary">
                Faltan datos de la reparación: completa el diagnóstico y el costo estimado antes de avanzar.
              </p>
            ) : null}
          </div>
        ) : null}
        {cancel ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => start(cancel)}
            className="transition-soft inline-flex h-11 w-full items-center justify-center rounded-sm border border-danger bg-surface px-4 text-button text-danger-text hover:bg-danger-soft disabled:cursor-default disabled:border-line disabled:text-content-disabled md:w-auto lg:h-10"
          >
            Cancelar orden
          </button>
        ) : null}
      </div>

      {dialog && spec ? (
        <ConfirmDialog
          variant={spec.variant}
          chip={`${ORDER_STATUS_LABELS[status]} → ${ORDER_STATUS_LABELS[dialog.targetStatus]}`}
          title={spec.title(trackingCode)}
          description={spec.description}
          summary={dialog.targetStatus === "ESPERANDO_APROBACION" ? <PublicationSummary summary={summary} /> : undefined}
          alert={spec.alert}
          actionLabel={dialog.targetStatus === "CANCELADO" ? "Cancelar orden" : `Avanzar a ${ORDER_STATUS_LABELS[dialog.targetStatus]}`}
          pending={busy}
          onConfirm={() => void run(dialog, true)}
          onBack={() => setDialog(null)}
        />
      ) : null}
    </section>
  );
}
