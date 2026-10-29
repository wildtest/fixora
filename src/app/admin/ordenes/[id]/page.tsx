import type { Metadata } from "next";
import Link from "next/link";
import { getAdminOrderDetail } from "@/application/admin/order-detail";
import { ButtonLink } from "../../../_components/button-link";
import { EmptyState } from "../../../_components/empty-state";
import { SearchOffIcon } from "../../../_components/icons";
import { AdminShell } from "../../_components/admin-shell";
import { requireAdmin } from "../../_lib/auth";
import { OrderDetailView } from "./order-detail-view";

// ADM-04 — Detalle administrativo en solo lectura (CHG-09b). Orden de comprobaciones (D8):
//   petición → requireAdmin() → validar/consultar el id → detalle o «orden no encontrada».
// Sin sesión válida se aplica CHG-08 (redirección al acceso) y NUNCA se muestra «orden no encontrada» antes de
// autorizar. Un id mal formado y un UUID inexistente producen el mismo estado dentro del shell administrativo, sin
// mostrar el identificador ni detalles técnicos. Dinámico, sin caché; `noindex` por el layout de `/admin`.
export const metadata: Metadata = {
  title: "Detalle de la orden",
};

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const order = await getAdminOrderDetail(admin, id);

  return (
    <AdminShell>
      {order ? (
        <>
          <Link
            href="/admin/ordenes"
            className="transition-soft mb-4 inline-flex h-10 items-center rounded-sm text-label text-primary hover:text-primary-hover"
          >
            ← Volver al listado
          </Link>
          <OrderDetailView order={order} />
        </>
      ) : (
        <EmptyState
          icon={<SearchOffIcon size={24} />}
          title="Orden no encontrada"
          action={<ButtonLink href="/admin/ordenes">Volver al listado</ButtonLink>}
        >
          La orden que intentas consultar no existe o ya no está disponible.
        </EmptyState>
      )}
    </AdminShell>
  );
}
