import type { Metadata } from "next";
import Link from "next/link";
import { dashboardFor } from "@/application/admin/order-directory-service";
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from "@/domain/repair/order-status";
import { AssignmentIcon } from "../_components/icons";
import { EmptyState } from "../_components/empty-state";
import { StatusBadge } from "../_components/tracking-result";
import { AdminShell } from "./_components/admin-shell";
import { OrderList } from "./_components/order-row";
import { requireAdmin } from "./_lib/auth";

// ADM-02 — Dashboard (CHG-09a). Una card por cada uno de los ocho estados con su conteo y el enlace «Ver en el
// listado» (filtra el directorio por ese estado vía `?estado=`), y las cinco órdenes registradas más recientemente.
// Sin gráficos, tendencias, reportes ni métricas. Sin control de detalle (CHG-09b). La autorización se resuelve ANTES
// de leer ningún dato de órdenes; el panel es dinámico y no usa caché: refleja el estado persistido vigente.
export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function AdminDashboard() {
  const admin = await requireAdmin();
  const { countsByStatus, recentOrders } = await dashboardFor(admin);

  return (
    <AdminShell>
      <h1 className="text-h2 text-content">Dashboard</h1>

      <section aria-labelledby="estados-titulo" className="mt-6">
        <h2 id="estados-titulo" className="text-h3 text-content">
          Órdenes por estado
        </h2>
        <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {ORDER_STATUSES.map((status) => (
            <li
              key={status}
              data-testid={`status-card-${status}`}
              className="flex flex-col gap-2 rounded-md border border-line bg-surface p-4"
            >
              <StatusBadge status={status} />
              <p data-testid="status-count" className="text-card-title tabular-nums text-content">
                {countsByStatus[status]}
              </p>
              <Link
                href={`/admin/ordenes?estado=${status}`}
                aria-label={`Ver en el listado: ${ORDER_STATUS_LABELS[status]}`}
                className="transition-soft text-label text-primary hover:text-primary-hover"
              >
                Ver en el listado
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="recientes-titulo" className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <h2 id="recientes-titulo" className="text-h3 text-content">
            Órdenes recientes
          </h2>
          <Link href="/admin/ordenes" className="transition-soft text-label text-primary hover:text-primary-hover">
            Ver todas
          </Link>
        </div>
        <div className="mt-3">
          {recentOrders.length > 0 ? (
            <OrderList orders={recentOrders} label="Órdenes recientes" />
          ) : (
            <EmptyState icon={<AssignmentIcon size={24} />} title="Aún no hay órdenes">
              Cuando un cliente registre una reparación, aparecerá aquí.
            </EmptyState>
          )}
        </div>
      </section>
    </AdminShell>
  );
}
