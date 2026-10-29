import type { ReactNode } from "react";
import { DemoNotice } from "../../_components/demo-notice";
import { Icon, LockIcon, LogoIcon } from "../../_components/icons";
import { signOutAction } from "../actions";
import { AdminNav } from "./admin-nav";

// Shell administrativo (DESIGN.md §4.4–§4.6). Escritorio: sidebar de 240 con logotipo y «Panel de taller», las dos
// entradas (Dashboard, Listado de órdenes) y «Cerrar sesión» al pie. Móvil: barra superior de 56 con «FIXORA · Panel
// de taller» y «Salir», y debajo dos pestañas. «Cerrar sesión»/«Salir» está en toda la navegación administrativa,
// en tono neutro (es salida, no destrucción). La acción de cierre es un formulario con una Server Action (CHG-08).
function LogoutIcon() {
  return (
    <Icon size={18}>
      <path d="M9 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H9" />
      <path d="M16 8l4 4-4 4" />
      <path d="M20 12H9" />
    </Icon>
  );
}

function LogoutForm({ children }: { children: ReactNode }) {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        aria-label="Cerrar sesión"
        className="transition-soft inline-flex h-10 w-full items-center gap-2 rounded-sm px-3 text-label text-content-secondary hover:bg-primary-subtle hover:text-primary-active"
      >
        <LogoutIcon />
        {children}
      </button>
    </form>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <a
        href="#contenido"
        className="sr-only rounded-sm bg-surface px-4 py-2 text-button text-primary focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-20"
      >
        Saltar al contenido
      </a>

      <aside className="hidden border-r border-line bg-surface lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:justify-between lg:p-4">
        <div>
          <p className="flex items-center gap-2 px-3 py-2 text-h3 text-content">
            <span className="text-primary">
              <LogoIcon size={28} />
            </span>
            <span>
              FIXORA
              <span className="block text-small text-content-secondary">Panel de taller</span>
            </span>
          </p>
          <div className="mt-4">
            <AdminNav variant="sidebar" />
          </div>
        </div>
        <div>
          <p data-testid="admin-status" className="flex items-center gap-1.5 px-3 pb-2 text-small text-content-secondary">
            <LockIcon size={16} />
            Sesión iniciada
          </p>
          <LogoutForm>Cerrar sesión</LogoutForm>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="border-b border-line bg-surface lg:hidden">
          <div className="flex h-14 items-center justify-between gap-3 px-4 md:px-6">
            <p className="inline-flex items-center gap-2 text-h3 text-content">
              <span className="text-primary">
                <LogoIcon size={28} />
              </span>
              <span>
                FIXORA <span className="text-content-secondary">· Panel de taller</span>
              </span>
            </p>
            <div className="w-24">
              <LogoutForm>Salir</LogoutForm>
            </div>
          </div>
          <AdminNav variant="tabs" />
        </header>
        <DemoNotice />
        <main id="contenido" className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6 md:py-10 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
