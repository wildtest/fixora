"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CloseIcon, LockIcon, MenuIcon } from "./icons";
import { EntryPoint } from "./entry-point";
import { ENTRY_POINTS } from "./entry-points";
import Link from "next/link";

// Menú móvil (DESIGN.md §4.2): botón «Menú» rotulado de 44 (texto + icono) y panel a ancho completo con
// filas de 48; «Acceso Taller» tras un separador. Sin barra inferior. Se cierra al navegar y con Escape.
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="transition-soft inline-flex h-11 items-center gap-2 rounded-sm px-3 text-button text-content-secondary hover:bg-primary-subtle hover:text-primary-active"
      >
        Menú
        {open ? <CloseIcon /> : <MenuIcon />}
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="absolute inset-x-0 top-full z-10 rounded-b-lg border-b border-line bg-surface shadow-level-2"
      >
        <nav aria-label="Principal">
          <ul className="py-2">
            <li>
              <Link
                href="/"
                onClick={close}
                className="transition-soft flex min-h-12 w-full items-center px-4 text-body text-content hover:bg-primary-subtle"
              >
                Inicio
              </Link>
            </li>
            <li>
              <EntryPoint entry={ENTRY_POINTS.register} variant="menu" onNavigate={close} />
            </li>
            <li>
              <EntryPoint entry={ENTRY_POINTS.consult} variant="menu" onNavigate={close} />
            </li>
            <li role="separator" className="my-2 border-t border-line" />
            <li>
              <EntryPoint
                entry={ENTRY_POINTS.workshop}
                variant="menu"
                icon={<LockIcon size={20} />}
                onNavigate={close}
              />
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
