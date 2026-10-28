import Link from "next/link";
import { EntryPoint } from "./entry-point";
import { ENTRY_POINTS } from "./entry-points";
import { LockIcon, LogoIcon } from "./icons";
import { MobileMenu } from "./mobile-menu";

// Cabecera pública (DESIGN.md §4.1–§4.3): barra de 64 en escritorio y 56 en móvil, fondo Surface y borde inferior de 1 px.
// Escritorio: logotipo, «Inicio · Registrar reparación · Consultar estado» y, a la derecha y separado, «Acceso Taller».
// Móvil/tablet: logotipo y botón «Menú». El escritorio de la navegación empieza en `lg`.
export function SiteHeader() {
  return (
    <header className="relative border-b border-line bg-surface">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 md:px-6 lg:h-16 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-sm text-h3 text-content"
          aria-label="FIXORA, inicio"
        >
          <span className="text-primary">
            <LogoIcon size={28} />
          </span>
          FIXORA
        </Link>

        <nav aria-label="Principal" className="ml-10 hidden flex-1 items-center justify-between lg:flex">
          <ul className="flex items-center gap-2">
            <li>
              <Link
                href="/"
                className="transition-soft inline-flex h-10 items-center rounded-sm px-3 text-label text-content-secondary hover:bg-primary-subtle hover:text-primary-active"
              >
                Inicio
              </Link>
            </li>
            <li>
              <EntryPoint entry={ENTRY_POINTS.register} variant="nav" />
            </li>
            <li>
              <EntryPoint entry={ENTRY_POINTS.consult} variant="nav" />
            </li>
          </ul>
          <div>
            <EntryPoint entry={ENTRY_POINTS.workshop} variant="workshop" icon={<LockIcon size={18} />} />
          </div>
        </nav>

        <MobileMenu />
      </div>
    </header>
  );
}
