import Link from "next/link";
import type { AdminOrderListItem } from "@/domain/admin/order-directory";
import { DEVICE_TYPE_LABELS } from "@/domain/repair/device-type";
import { formatLimaDateTime } from "@/domain/repair/format-date";
import { StatusBadge } from "../../_components/tracking-result";

// Order row (escritorio) / order card (móvil), DESIGN.md §6.7. Un solo marcado con el MISMO orden de lectura:
// código, estado, equipo, cliente, fecha, acción. La fila completa es clicable mediante UN enlace real «Ver detalle»
// (`Link`, con foco visible y operable por teclado) cuyo objetivo se extiende a toda la fila; no hay `div onClick` ni
// controles anidados. El destino usa el UUID interno, nunca el código de seguimiento (secreto bearer). El cliente y el
// texto del usuario se renderizan como texto: React los escapa.
export function OrderRow({ order }: { order: AdminOrderListItem }) {
  const device = [DEVICE_TYPE_LABELS[order.device.type], [order.device.brand, order.device.model].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(" · ");
  return (
    <li
      data-testid="order-row"
      className="transition-soft relative flex min-h-[72px] flex-col gap-1 px-4 py-4 hover:bg-page lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto_auto] lg:items-center lg:gap-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 lg:block">
        <span data-testid="order-code" className="font-mono text-[0.9375rem] font-medium tracking-[0.04em] text-content">
          {order.trackingCode}
        </span>
        <span className="text-small text-content-muted lg:mt-0.5 lg:block">{formatLimaDateTime(order.createdAt)}</span>
      </div>
      <span data-testid="order-customer" className="text-body text-content lg:truncate">
        {order.customerName}
      </span>
      <span className="text-small text-content-secondary lg:truncate">{device}</span>
      <span className="mt-1 lg:mt-0 lg:justify-self-end">
        <StatusBadge status={order.status} />
      </span>
      <Link
        href={`/admin/ordenes/${order.id}`}
        aria-label={`Ver detalle de la orden ${order.trackingCode}`}
        className="transition-soft mt-2 inline-flex h-11 items-center justify-center rounded-sm bg-primary-subtle px-4 text-button text-primary-active after:absolute after:inset-0 hover:bg-secondary-hover lg:mt-0 lg:h-10 lg:justify-self-end"
      >
        Ver detalle
      </Link>
    </li>
  );
}

/** Contenedor único con divisores (no cards sueltas). */
export function OrderList({ orders, label }: { orders: readonly AdminOrderListItem[]; label: string }) {
  return (
    <ul aria-label={label} className="divide-y divide-line overflow-hidden rounded-md border border-line bg-surface">
      {orders.map((order) => (
        <OrderRow key={order.id} order={order} />
      ))}
    </ul>
  );
}
