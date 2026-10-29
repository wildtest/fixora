import type { ReactNode } from "react";
import { formatLimaDateTime } from "@/domain/repair/format-date";
import type { Journey, JourneyStage, JourneyStageState } from "@/domain/repair/journey";
import { Alert } from "./alert";
import { CheckIcon } from "./form-icons";
import { CloseIcon } from "./icons";

// Repair Journey (DESIGN.md §7): siete etapas con el nombre exacto del PRD. Componente de PRESENTACIÓN puro: recibe
// un `Journey` ya calculado y no decide transiciones. Vertical en móvil (riel a la izquierda) y horizontal en
// escritorio, con desplazamiento INTERNO si el contenedor es más estrecho (nunca desborda la página). El estado se
// lee por forma del marcador, texto y peso del nombre; el color es la cuarta señal.

const STATE_TEXT: Record<JourneyStageState, string> = {
  completed: "Completado",
  current: "Estado actual",
  final: "Estado final",
  pending: "Pendiente",
  "cancelled-here": "Cancelado en esta etapa",
  "not-reached": "No alcanzado",
};

function Marker({ stage }: { stage: JourneyStage }): ReactNode {
  const base = "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full text-caption tabular-nums";
  switch (stage.state) {
    case "completed":
      return (
        <span className={`${base} bg-primary text-white`}>
          <CheckIcon size={16} />
        </span>
      );
    case "final":
      return (
        <span className={`${base} bg-success text-white ring-4 ring-success-soft`}>
          <CheckIcon size={16} />
        </span>
      );
    case "current":
      return <span className={`${base} border-2 border-primary bg-surface text-primary-active ring-4 ring-primary-subtle`}>{stage.number}</span>;
    case "cancelled-here":
      return (
        <span className={`${base} bg-danger text-white`}>
          <CloseIcon size={16} />
        </span>
      );
    case "not-reached":
      return <span className={`${base} bg-surface-secondary text-content-muted`}>{stage.number}</span>;
    default:
      return <span className={`${base} border-2 border-line bg-surface text-content-muted`}>{stage.number}</span>;
  }
}

function Connector({ stage }: { stage: JourneyStage }) {
  const solid = stage.state === "completed" ? "bg-primary" : "bg-line";
  return (
    <span
      aria-hidden="true"
      className={`absolute left-[13px] top-7 h-[calc(100%-1.75rem)] w-0.5 lg:left-7 lg:top-[13px] lg:h-0.5 lg:w-[calc(100%-1.75rem)] ${solid}`}
    />
  );
}

export function RepairJourney({ journey, title = "Recorrido de tu reparación" }: { journey: Journey; title?: string }) {
  return (
    <section aria-labelledby="journey-title" data-testid="repair-journey">
      <h2 id="journey-title" className="text-h3 text-content">
        {title}
      </h2>
      <p data-testid="journey-headline" className="mt-1 text-small text-content-secondary">
        {journey.headline}
      </p>
      <div className="mt-4 lg:overflow-x-auto lg:pb-2">
        <ol className="flex flex-col lg:min-w-[720px] lg:flex-row">
          {journey.stages.map((stage, index) => {
            const active = stage.state === "current" || stage.state === "final";
            const muted = stage.state === "pending" || stage.state === "not-reached";
            return (
              <li
                key={stage.status}
                data-state={stage.state}
                aria-current={active ? "step" : undefined}
                className="relative flex gap-3 pb-6 last:pb-0 lg:min-w-24 lg:flex-1 lg:flex-col lg:pb-0 lg:pr-2"
              >
                {index < journey.stages.length - 1 ? <Connector stage={stage} /> : null}
                <Marker stage={stage} />
                <div className="min-w-0 lg:mt-3">
                  <p className={`text-body ${active || stage.state === "cancelled-here" ? "font-semibold" : "font-medium"} ${muted ? "text-content-muted" : "text-content"}`}>
                    {stage.name}
                  </p>
                  <p className={`text-small tabular-nums ${muted ? "text-content-muted" : "text-content-secondary"}`}>
                    {stage.occurredAt ? formatLimaDateTime(stage.occurredAt) : "—"} · {STATE_TEXT[stage.state]}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
      {journey.cancelled ? (
        <div className="mt-4">
          <Alert variant="error" role="status" title={`Orden cancelada durante «${journey.cancelled.from}»`}>
            La orden está cerrada. Las etapas siguientes no se realizaron.
            {journey.cancelled.occurredAt ? ` Cancelada el ${formatLimaDateTime(journey.cancelled.occurredAt)}.` : ""}
          </Alert>
        </div>
      ) : null}
    </section>
  );
}
