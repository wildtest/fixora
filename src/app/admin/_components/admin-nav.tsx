"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Navegación administrativa (DESIGN.md §4.4–§4.5): «Dashboard» y «Listado de órdenes». ADM-04 no es una entrada del
// menú. En escritorio vive en el sidebar (columna); en móvil son dos pestañas fijas de 44 con la activa subrayada.
const ENTRIES = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/ordenes", label: "Listado de órdenes" },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav({ variant }: { variant: "sidebar" | "tabs" }) {
  const pathname = usePathname();
  const tabs = variant === "tabs";
  return (
    <nav aria-label={tabs ? "Secciones del taller" : "Navegación del taller"}>
      <ul className={tabs ? "flex" : "flex flex-col gap-1"}>
        {ENTRIES.map(({ href, label }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className={tabs ? "flex-1" : undefined}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={
                  tabs
                    ? `transition-soft flex h-11 items-center justify-center border-b-2 px-3 text-label ${
                        active ? "border-primary text-primary-active" : "border-transparent text-content-secondary hover:text-primary-active"
                      }`
                    : `transition-soft flex h-10 items-center rounded-sm px-3 text-label ${
                        active ? "bg-primary-subtle text-primary-active" : "text-content-secondary hover:bg-primary-subtle hover:text-primary-active"
                      }`
                }
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
