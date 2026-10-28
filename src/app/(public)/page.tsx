import type { Metadata } from "next";
import type { ReactNode } from "react";
import { EntryPoint } from "../_components/entry-point";
import { ENTRY_POINTS } from "../_components/entry-points";
import { ArrowForwardIcon, AssignmentIcon, SearchIcon } from "../_components/icons";

// PUB-01 — Landing (DESIGN.md): lema en Display, descripción breve y dos accesos de igual jerarquía visual
// (card pública con icono, título, texto y botón). El acceso al taller vive en la navegación.
// La landing es la única ruta indexable; el valor por defecto del layout raíz es noindex.
export const metadata: Metadata = {
  robots: { index: true, follow: true },
};

function EntryCard({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  action: ReactNode;
}) {
  return (
    <li className="flex flex-col rounded-md border border-line bg-surface p-6">
      <span className="flex size-10 items-center justify-center rounded-md bg-primary-subtle text-primary-active">
        {icon}
      </span>
      <h2 className="mt-4 text-card-title text-content">{title}</h2>
      <p className="mt-2 flex-1 text-body text-content-secondary">{children}</p>
      <div className="mt-6">{action}</div>
    </li>
  );
}

export default function LandingPage() {
  return (
    <div className="lg:pt-12">
      <section aria-labelledby="lema">
        <h1
          id="lema"
          className="max-w-3xl text-display-mobile text-content md:text-display"
        >
          Tu reparación, siempre bajo control.
        </h1>
        <p className="mt-4 max-w-2xl text-body-lg text-content-secondary">
          FIXORA te permite solicitar la reparación de tu equipo y consultar su estado con un código de
          seguimiento, sin crear una cuenta.
        </p>
      </section>

      <ul className="mt-8 grid gap-6 md:mt-12 md:grid-cols-2">
        <EntryCard
          icon={<AssignmentIcon size={24} />}
          title="Registra tu reparación"
          action={
            <EntryPoint
              entry={ENTRY_POINTS.register}
              variant="primary"
              icon={<ArrowForwardIcon size={20} />}
            />
          }
        >
          Cuéntanos qué le pasa a tu equipo y recibe un código de seguimiento.
        </EntryCard>
        <EntryCard
          icon={<SearchIcon size={24} />}
          title="Consulta tu reparación"
          action={
            <EntryPoint
              entry={ENTRY_POINTS.consult}
              variant="secondary"
              icon={<ArrowForwardIcon size={20} />}
            />
          }
        >
          Revisa en qué estado va tu reparación con tu código de seguimiento.
        </EntryCard>
      </ul>
    </div>
  );
}
