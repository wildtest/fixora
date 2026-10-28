import Link from "next/link";
import { useId, type ReactNode } from "react";
import { UNAVAILABLE_LABEL, type EntryPointDefinition } from "./entry-points";

// Punto de entrada público. Disponible → `Link` a la ruta canónica. No disponible → control
// deshabilitado (sin `href`, sin navegación, no enfocable) con el motivo visible junto al control
// (DESIGN.md §6.1: «el motivo se explica junto al botón»).

export type EntryPointVariant = "primary" | "secondary" | "nav" | "workshop" | "menu";

type Styles = { link: string; wrap: string; button: string; caption: string };

const BUTTON_BASE =
  "transition-soft inline-flex h-11 w-full items-center justify-center gap-2 rounded-sm px-4 text-button lg:h-10 lg:w-auto";

const STYLES: Record<EntryPointVariant, Styles> = {
  primary: {
    link: `${BUTTON_BASE} bg-primary text-white hover:bg-primary-hover active:bg-primary-active`,
    wrap: "flex flex-col items-start gap-2 lg:flex-row lg:items-center lg:gap-3",
    button: `${BUTTON_BASE} cursor-default bg-surface-secondary text-content-disabled`,
    caption: "text-small text-content-secondary",
  },
  secondary: {
    link: `${BUTTON_BASE} bg-primary-subtle text-primary-active hover:bg-secondary-hover`,
    wrap: "flex flex-col items-start gap-2 lg:flex-row lg:items-center lg:gap-3",
    button: `${BUTTON_BASE} cursor-default bg-surface-secondary text-content-disabled`,
    caption: "text-small text-content-secondary",
  },
  nav: {
    link: "transition-soft inline-flex h-10 items-center rounded-sm px-3 text-label text-content-secondary hover:bg-primary-subtle hover:text-primary-active",
    wrap: "inline-flex flex-col items-start rounded-sm bg-surface-secondary px-3 py-1",
    button: "cursor-default text-label text-content-disabled",
    caption: "text-caption text-content-secondary",
  },
  workshop: {
    link: "transition-soft inline-flex h-10 items-center gap-2 rounded-sm px-3 text-label text-content-secondary hover:bg-primary-subtle hover:text-primary-active",
    wrap: "inline-flex flex-col items-start rounded-sm bg-surface-secondary px-3 py-1",
    button: "inline-flex cursor-default items-center gap-2 text-label text-content-disabled",
    caption: "text-caption text-content-secondary",
  },
  menu: {
    link: "transition-soft flex min-h-12 w-full items-center gap-3 px-4 text-body text-content hover:bg-primary-subtle",
    wrap: "flex min-h-12 w-full flex-wrap items-center justify-between gap-x-3 bg-surface-secondary px-4 py-2",
    button: "inline-flex cursor-default items-center gap-3 text-body text-content-disabled",
    caption: "text-caption text-content-secondary",
  },
};

export function EntryPoint({
  entry,
  variant,
  icon,
  onNavigate,
}: {
  entry: EntryPointDefinition;
  variant: EntryPointVariant;
  icon?: ReactNode;
  onNavigate?: () => void;
}) {
  const captionId = useId();
  const styles = STYLES[variant];

  if (entry.available) {
    return (
      <Link href={entry.href} className={styles.link} onClick={onNavigate}>
        {icon}
        {entry.label}
      </Link>
    );
  }

  return (
    <span className={styles.wrap}>
      <button type="button" disabled aria-describedby={captionId} className={styles.button}>
        {icon}
        {entry.label}
      </button>
      <span id={captionId} className={styles.caption}>
        {UNAVAILABLE_LABEL}
      </span>
    </span>
  );
}
