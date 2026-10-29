import { journeyTimeline, type AdminHistoryEvent, type AdminOrderDetailDTO } from "@/domain/admin/order-detail";
import { formatLimaDateTime } from "@/domain/repair/format-date";
import { buildJourney } from "@/domain/repair/journey";
import { formatSoles } from "@/domain/repair/money";
import { ORDER_STATUS_LABELS } from "@/domain/repair/order-status";
import { DescriptionIcon, LockIcon, PaymentsIcon, SyncAltIcon, VisibilityIcon } from "../../../_components/icons";
import { RepairJourney } from "../../../_components/repair-journey";
import { StatusBadge } from "../../../_components/tracking-result";
import { DiagnosisCostPanel } from "./diagnosis-cost-panel";
import { BasicDataBar, BasicDataProvider, InternalBasicData, PublicBasicData } from "./basic-data";
import { NotesPanel } from "./notes-panel";
import { OrderLifecycle } from "./order-lifecycle";

// Detalle administrativo (ADM-04). Estructura de DESIGN, de arriba abajo y SOLO lo que existe: cabecera → Repair
// Journey (presentación, compartido con PUB-05) → acciones de ciclo de vida (CHG-10, FUERA del Journey) → bloques
// Público e Interno (DESIGN §9, cinco señales: etiqueta textual, icono, encabezado, tipo de borde y posición). Las
// notas (CHG-12) viven en cada bloque según su visibilidad; sin marcadores vacíos de funciones futuras (la corrección, CHG-13).
// Todo contenido del cliente se renderiza como texto (React lo escapa) y se ajusta sin desbordar la página.

const NO_DIAGNOSIS = "sin diagnóstico";
const NO_COST = "sin costo";

// Entrada del historial administrativo combinado (DESIGN §8.2): marcador cuadrado con icono por tipo de cambio, el tipo en
// negrita + fecha y el contenido «{anterior} → {nuevo}» (en el primer registro, solo el valor). Sin autor.
function HistoryEntry({ event }: { event: AdminHistoryEvent }) {
  const Icon = event.type === "STATUS" ? SyncAltIcon : event.type === "DIAGNOSIS" ? DescriptionIcon : PaymentsIcon;
  const label = event.type === "STATUS" ? "Estado" : event.type === "DIAGNOSIS" ? "Diagnóstico" : "Costo estimado";
  let content: React.ReactNode;
  if (event.type === "STATUS") {
    content = (
      <>
        {event.fromStatus ? `${ORDER_STATUS_LABELS[event.fromStatus]} → ` : null}
        <strong>{ORDER_STATUS_LABELS[event.toStatus]}</strong>
      </>
    );
  } else {
    const show = event.type === "COST" ? (value: string | null) => (value === null ? NO_COST : formatSoles(value)) : (value: string | null) => value ?? NO_DIAGNOSIS;
    content =
      event.previous === null && event.next !== null ? (
        <strong>{show(event.next)}</strong>
      ) : (
        <>
          {show(event.previous)} → <strong>{show(event.next)}</strong>
        </>
      );
  }
  return (
    <li data-testid="history-event" data-type={event.type} className="flex gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-xs bg-surface-secondary text-content-secondary">
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-small text-content-secondary">
          <span className="font-semibold text-content">{label}</span> · {formatLimaDateTime(event.occurredAt)}
        </p>
        <p data-testid="history-change" className="whitespace-pre-wrap break-words text-body text-content [overflow-wrap:anywhere]">
          {content}
        </p>
      </div>
    </li>
  );
}

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

      <OrderLifecycle
        orderId={order.id}
        trackingCode={order.trackingCode}
        status={order.status}
        version={order.version}
        allowedTransitions={order.allowedTransitions}
        summary={{ diagnosis: order.diagnosis, estimatedCost: order.estimatedCost }}
      />

      <BasicDataProvider
        order={{
          orderId: order.id,
          version: order.version,
          canEdit: order.canEditBasicData,
          customer: order.customer,
          device: order.device,
          problemDescription: order.problemDescription,
        }}
      >
      <BasicDataBar />
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
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
          <PublicBasicData />
          <div className="space-y-4 border-t border-line px-4 py-4" data-testid="diagnosis-cost">
            <DiagnosisCostPanel
              orderId={order.id}
              version={order.version}
              status={order.status}
              diagnosis={order.diagnosis}
              estimatedCost={order.estimatedCost}
              canEdit={order.canEditDiagnosisAndCost}
              neverPublished={order.neverPublished}
            />
          </div>
          <div className="border-t border-line px-4 py-4">
            <NotesPanel orderId={order.id} visibility="PUBLIC" notes={order.publicNotes} canManage={order.canManageNotes} />
          </div>
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
            <InternalBasicData />

            <NotesPanel orderId={order.id} visibility="INTERNAL" notes={order.internalNotes} canManage={order.canManageNotes} />

            <section aria-labelledby="historial-titulo" data-testid="status-history" className="rounded-sm border border-dashed border-line-strong p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 id="historial-titulo" className="text-label text-content">
                  Historial administrativo
                </h3>
                <span className="inline-flex items-center gap-1 text-caption text-content-secondary">
                  <LockIcon size={14} />
                  Solo taller
                </span>
              </div>
              <ol className="mt-3 space-y-3">
                {order.history.map((event, index) => (
                  <HistoryEntry key={`${event.type}-${event.occurredAt}-${index}`} event={event} />
                ))}
              </ol>
            </section>
          </div>
        </section>
      </div>
      </BasicDataProvider>
    </div>
  );
}
