import type { ReactNode } from "react";
import { ABSENT_TEXT, journeyTimeline, type AdminOrderDetailDTO } from "@/domain/admin/order-detail";
import { DEVICE_TYPE_LABELS } from "@/domain/repair/device-type";
import { formatLimaDateTime } from "@/domain/repair/format-date";
import { buildJourney } from "@/domain/repair/journey";
import { ORDER_STATUS_LABELS } from "@/domain/repair/order-status";
import { LockIcon, SyncAltIcon, VisibilityIcon } from "../../../_components/icons";
import { RepairJourney } from "../../../_components/repair-journey";
import { StatusBadge } from "../../../_components/tracking-result";

// Detalle administrativo de SOLO LECTURA (ADM-04, CHG-09b). Estructura de DESIGN, de arriba abajo y SOLO lo que existe:
// cabecera → Repair Journey (presentación, compartido con PUB-05) → bloques Público e Interno (DESIGN §9, cinco
// señales: etiqueta textual, icono, encabezado, tipo de borde y posición). Sin controles de modificación, deshabilitados
// ni marcadores vacíos de funciones futuras (diagnóstico, costo y notas llegan con CHG-11/12; transiciones con CHG-10).
// Todo contenido del cliente se renderiza como texto (React lo escapa) y se ajusta sin desbordar la página.

function Field({ label, children, testId }: { label: string; children: ReactNode; testId?: string }) {
  return (
    <div>
      <dt className="text-label text-content-secondary">{label}</dt>
      <dd data-testid={testId} className="mt-0.5 whitespace-pre-wrap break-words text-body text-content [overflow-wrap:anywhere]">
        {children}
      </dd>
    </div>
  );
}

const absent = <span className="text-content-muted">{ABSENT_TEXT}</span>;

export function OrderDetailView({ order }: { order: AdminOrderDetailDTO }) {
  const journey = buildJourney(order.status, journeyTimeline(order.statusHistory));
  return (
    <div data-testid="order-detail" className="space-y-8">
      <header>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-h2 text-content">Detalle de la orden</h1>
          <StatusBadge status={order.status} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-label text-content-secondary">Código de seguimiento</span>
          <span
            data-testid="detail-code"
            className="whitespace-nowrap rounded-xs bg-primary-subtle px-1.5 py-0.5 font-mono text-[0.9375rem] font-medium tracking-[0.04em] text-primary-active"
          >
            {order.trackingCode}
          </span>
          <span data-testid="detail-created" className="text-small text-content-secondary">
            Registrada el {formatLimaDateTime(order.createdAt)}
          </span>
        </div>
      </header>

      <RepairJourney journey={journey} title="Recorrido de la reparación" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <section aria-labelledby="bloque-publico" data-testid="block-public" className="overflow-hidden rounded-md border border-info-line bg-surface">
          <header className="flex items-start gap-3 border-b border-info-line bg-primary-subtle px-4 py-3">
            <span className="mt-0.5 text-primary-active">
              <VisibilityIcon size={20} />
            </span>
            <div>
              <h2 id="bloque-publico" className="text-h3 text-content">
                Público — Visible al cliente
              </h2>
              <p className="text-small text-content-secondary">Lo que el cliente puede ver con su código</p>
            </div>
          </header>
          <dl className="space-y-4 px-4 py-4">
            <Field label="Tipo de equipo">{DEVICE_TYPE_LABELS[order.device.type]}</Field>
            <Field label="Marca">{order.device.brand}</Field>
            <Field label="Modelo" testId="detail-model">
              {order.device.model ?? absent}
            </Field>
            <Field label="Descripción del problema" testId="detail-problem">
              {order.problemDescription}
            </Field>
          </dl>
        </section>

        <section aria-labelledby="bloque-interno" data-testid="block-internal" className="overflow-hidden rounded-md border border-dashed border-line-strong bg-surface">
          <header className="flex items-start gap-3 border-b border-dashed border-line-strong bg-surface-secondary px-4 py-3">
            <span className="mt-0.5 text-content-secondary">
              <LockIcon size={20} />
            </span>
            <div>
              <h2 id="bloque-interno" className="text-h3 text-content">
                Interno — Solo taller
              </h2>
              <p className="text-small text-content-secondary">Nunca se muestra al cliente</p>
            </div>
          </header>
          <div className="space-y-6 px-4 py-4">
            <dl className="space-y-4">
              <Field label="Nombre" testId="detail-name">
                {order.customer.name}
              </Field>
              <Field label="Teléfono" testId="detail-phone">
                {order.customer.phone}
              </Field>
              <Field label="Correo" testId="detail-email">
                {order.customer.email ?? absent}
              </Field>
            </dl>

            <section aria-labelledby="historial-titulo" data-testid="status-history" className="rounded-sm border border-dashed border-line-strong p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 id="historial-titulo" className="text-label text-content">
                  Historial de estados
                </h3>
                <span className="inline-flex items-center gap-1 text-caption text-content-secondary">
                  <LockIcon size={14} />
                  Solo taller
                </span>
              </div>
              <ol className="mt-3 space-y-3">
                {order.statusHistory.map((event) => (
                  <li key={`${event.toStatus}-${event.occurredAt}`} data-testid="history-event" className="flex gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-xs bg-surface-secondary text-content-secondary">
                      <SyncAltIcon size={18} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-small text-content-secondary">
                        <span className="font-semibold text-content">Estado</span> · {formatLimaDateTime(event.occurredAt)}
                      </p>
                      <p data-testid="history-change" className="text-body text-content">
                        {event.fromStatus ? `${ORDER_STATUS_LABELS[event.fromStatus]} → ` : null}
                        <strong>{ORDER_STATUS_LABELS[event.toStatus]}</strong>
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </section>
      </div>
    </div>
  );
}
