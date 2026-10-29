import type { Metadata } from "next";
import { directoryPageFor } from "@/application/admin/order-directory-service";
import { parseStatusFilter } from "@/domain/admin/order-directory";
import { AdminShell } from "../_components/admin-shell";
import { requireAdmin } from "../_lib/auth";
import { OrderDirectory } from "./order-directory";

// ADM-03 — Listado de órdenes (CHG-09a). La carga inicial es un Server Component que lee SOLO el filtro de estado de
// la URL (`?estado=`, convención de TD §19, la usa «Ver en el listado» del panel); un valor inválido se ignora y se
// muestra todo. La búsqueda y la página NO van en la URL: viven en el estado del contenedor de cliente y viajan por
// Server Action. Dinámico, sin caché.
export const metadata: Metadata = {
  title: "Listado de órdenes",
};

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await requireAdmin();
  const { estado } = await searchParams;
  const status = parseStatusFilter(typeof estado === "string" ? estado : undefined);
  const initial = await directoryPageFor(admin, { status });

  return (
    <AdminShell>
      <OrderDirectory initialPage={initial} initialStatus={status} />
    </AdminShell>
  );
}
