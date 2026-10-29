import type { ReactNode } from "react";
import { DEVICE_TYPE_LABELS } from "@/domain/repair/device-type";
import { formatLimaDateTime } from "@/domain/repair/format-date";
import { formatSoles } from "@/domain/repair/money";
import { buildJourney } from "@/domain/repair/journey";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/domain/repair/order-status";
import type { PublicOrderView } from "@/domain/repair/public-order-view";
import { RepairJourney } from "./repair-journey";

// PUB-05 — Seguimiento público (DESIGN.md): SOLO la información pública autorizada (PRD §4.6). Recibe el
// `PublicOrderView` (lista positiva) y nunca consulta nada. Sin acciones que modifiquen datos. Diagnóstico y costo
// (CHG-11) y notas públicas (CHG-12) son secciones separadas; si no hay ninguno se muestra el vacío informativo de E6.

const BADGE: Record<OrderStatus, string> = {
  SOLICITUD_RECIBIDA: "bg-primary-subtle text-primary-active",
  EQUIPO_RECIBIDO: "bg-primary-subtle text-primary-active",
  EN_DIAGNOSTICO: "bg-primary-subtle text-primary-active",
  ESPERANDO_APROBACION: "bg-warning-soft text-warning",
  EN_REPARACION: "bg-primary-subtle text-primary-active",
  LISTO_PARA_RECOJO: "bg-success-soft text-success",
  ENTREGADO: "bg-success-soft text-success",
  CANCELADO: "bg-danger-soft text-danger-text",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span data-testid="status-badge" className={`inline-flex items-center rounded-full px-3 py-1 text-label ${BADGE[status]}`}>
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

export function TrackingResult({ order, actions }: { order: PublicOrderView; actions?: ReactNode }) {
  const journey = buildJourney(order.status, order.statusTimeline);
  const { device } = order;
  return (
    <div data-testid="tracking-result" className="mx-auto w-full max-w-3xl space-y-8">
      <header>
        <h1 id="resultado-titulo" tabIndex={-1} className="text-h2 text-content focus:outline-none">
          Seguimiento de tu reparación
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="text-label text-content-secondary">Código de seguimiento</span>
          <span
            data-testid="result-code"
            className="whitespace-nowrap rounded-xs bg-primary-subtle px-1.5 py-0.5 font-mono text-[0.9375rem] font-medium tracking-[0.04em] text-primary-active"
          >
            {order.trackingCode}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <span className="text-label text-content-secondary">Estado actual</span>
          <StatusBadge status={order.status} />
        </div>
      </header>

      <section aria-labelledby="equipo-title" className="rounded-md border border-line bg-surface p-6">
        <h2 id="equipo-title" className="text-h3 text-content">
          Tu equipo
        </h2>
        <dl className="mt-4 rounded-md bg-surface-secondary p-4 text-body">
          <div className="flex flex-wrap justify-between gap-x-4">
            <dt className="text-label text-content-secondary">Tipo</dt>
            <dd className="font-medium">{DEVICE_TYPE_LABELS[device.type]}</dd>
          </div>
          <div className="mt-2 flex flex-wrap justify-between gap-x-4">
            <dt className="text-label text-content-secondary">Marca</dt>
            <dd className="font-medium">{device.brand}</dd>
          </div>
          {device.model ? (
            <div className="mt-2 flex flex-wrap justify-between gap-x-4">
              <dt className="text-label text-content-secondary">Modelo</dt>
              <dd className="font-medium">{device.model}</dd>
            </div>
          ) : null}
        </dl>
        <h3 className="mt-6 text-label text-content-secondary">Descripción del problema</h3>
        <p data-testid="result-description" className="mt-1 whitespace-pre-wrap break-words text-body text-content">
          {order.problemDescription}
        </p>
      </section>

      <RepairJourney journey={journey} />

      <section aria-labelledby="historial-title">
        <h2 id="historial-title" className="text-h3 text-content">
          Historial de estados
        </h2>
        <ol data-testid="status-timeline" className="mt-4 space-y-3">
          {order.statusTimeline.map((event, index) => (
            <li key={`${event.status}-${event.occurredAt}-${index}`} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className={`mt-1.5 size-3 shrink-0 rounded-full ${index === 0 ? "border-2 border-primary bg-surface" : "bg-primary"}`}
              />
              <div className="min-w-0">
                <p className={`text-body ${index === 0 ? "font-semibold" : "font-medium"} text-content`}>
                  {ORDER_STATUS_LABELS[event.status]}
                </p>
                <p className="text-small tabular-nums text-content-secondary">{formatLimaDateTime(event.occurredAt)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {order.repairDetails ? (
        // Diagnóstico y costo públicos (CHG-11, DESIGN §11.3): tarjeta propia con el costo destacado (24/32, 600, Primary
        // active, `S/` + dos decimales) y el diagnóstico como texto de lectura, distinta de las notas públicas (CHG-12).
        <section aria-labelledby="diagnostico-title" data-testid="repair-details" className="rounded-md border border-line bg-surface p-6">
          <h2 id="diagnostico-title" className="text-h3 text-content">
            Diagnóstico y costo estimado
          </h2>
          <p className="mt-4 text-label text-content-secondary">Costo estimado</p>
          <p data-testid="public-cost" className="text-[1.5rem] font-semibold leading-8 tabular-nums text-primary-active md:text-[2rem] md:leading-10">
            {formatSoles(order.repairDetails.estimatedCost)}
          </p>
          <h3 className="mt-6 text-label text-content-secondary">Diagnóstico</h3>
          <p data-testid="public-diagnosis" className="mt-1 whitespace-pre-wrap break-words text-body text-content [overflow-wrap:anywhere]">
            {order.repairDetails.diagnosis}
          </p>
        </section>
      ) : null}

      {order.publicNotes.length > 0 ? (
        // Notas públicas (CHG-12): del más reciente al más antiguo, solo contenido y fecha. Texto plano (React lo escapa).
        <section aria-labelledby="notas-title" data-testid="public-notes" className="rounded-md border border-line bg-surface p-6">
          <h2 id="notas-title" className="text-h3 text-content">
            Notas del taller
          </h2>
          <ul className="mt-4 space-y-4">
            {order.publicNotes.map((note, index) => (
              <li key={`${note.createdAt}-${index}`} data-testid="public-note">
                <p className="text-small tabular-nums text-content-secondary">{formatLimaDateTime(note.createdAt)}</p>
                <p data-testid="public-note-content" className="mt-0.5 whitespace-pre-wrap break-words text-body text-content [overflow-wrap:anywhere]">
                  {note.content}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!order.repairDetails && order.publicNotes.length === 0 ? (
        <section aria-labelledby="mas-info-title" className="rounded-md bg-surface-secondary p-4">
          <h2 id="mas-info-title" className="text-label text-content">
            Diagnóstico, costo y notas
          </h2>
          <p data-testid="more-info-empty" className="mt-1 text-small text-content-secondary">
            Todavía no hay información adicional disponible. Cuando el taller la publique, aparecerá aquí.
          </p>
        </section>
      ) : null}

      {actions ? <div className="flex flex-col gap-2 md:flex-row">{actions}</div> : null}
    </div>
  );
}
