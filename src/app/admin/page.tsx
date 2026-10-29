import type { Metadata } from "next";
import { AdminShell } from "./_components/admin-shell";
import { requireAdmin } from "./_lib/auth";

// Entrada administrativa protegida (ADM-02, solo la FRONTERA de CHG-08): exige una sesión válida y no muestra datos
// de negocio. El Dashboard, el listado y la búsqueda llegan en CHG-09a sobre este mismo shell. La autorización se
// resuelve antes de generar contenido: sin sesión válida la respuesta es una redirección al acceso.
export const metadata: Metadata = {
  title: "Panel de taller",
};

export default async function AdminHome() {
  await requireAdmin();
  return (
    <AdminShell>
      <h1 className="text-h2 text-content">Panel de taller</h1>
      <p className="mt-2 max-w-prose text-body text-content-secondary">
        Sesión iniciada. Las herramientas de gestión de órdenes se habilitarán en los próximos cambios.
      </p>
    </AdminShell>
  );
}
