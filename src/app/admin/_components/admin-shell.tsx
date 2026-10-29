import type { ReactNode } from "react";
import { DemoNotice } from "../../_components/demo-notice";
import { Icon, LockIcon, LogoIcon } from "../../_components/icons";
import { signOutAction } from "../actions";

// Shell administrativo MÍNIMO de CHG-08 (D12): marca «Panel de taller», aviso demostrativo, estado autenticado y
// «Cerrar sesión» («Salir» en móvil). Sin Dashboard, listado ni entradas de navegación sin destino (CHG-09a las
// añade sobre este mismo shell). La acción de cierre es un formulario con una Server Action.
function LogoutIcon() {
  return (
    <Icon size={18}>
      <path d="M9 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H9" />
      <path d="M16 8l4 4-4 4" />
      <path d="M20 12H9" />
    </Icon>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <>
      <a
        href="#contenido"
        className="sr-only rounded-sm bg-surface px-4 py-2 text-button text-primary focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-20"
      >
        Saltar al contenido
      </a>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 md:px-6 lg:h-16 lg:px-8">
          <p className="inline-flex items-center gap-2 text-h3 text-content">
            <span className="text-primary">
              <LogoIcon size={28} />
            </span>
            <span>
              FIXORA <span className="text-content-secondary">· Panel de taller</span>
            </span>
          </p>
          <div className="flex items-center gap-3">
            <p data-testid="admin-status" className="hidden items-center gap-1.5 text-small text-content-secondary md:inline-flex">
              <LockIcon size={16} />
              Sesión iniciada
            </p>
            <form action={signOutAction}>
              <button
                type="submit"
                aria-label="Cerrar sesión"
                className="transition-soft inline-flex h-10 items-center gap-2 rounded-sm px-3 text-label text-content-secondary hover:bg-primary-subtle hover:text-primary-active"
              >
                <LogoutIcon />
                <span className="hidden md:inline">Cerrar sesión</span>
                <span className="md:hidden">Salir</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      <DemoNotice />
      <main id="contenido" className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 md:py-12 lg:px-8">
        {children}
      </main>
    </>
  );
}
