import Link from "next/link";
import type { ComponentProps } from "react";

// Enlace-botón (DESIGN.md §6.1): alto 44 en móvil / 40 en escritorio, radio 6, texto 15/600.
// Una sola acción primaria por vista o bloque.

const VARIANTS = {
  primary: "bg-primary text-white hover:bg-primary-hover active:bg-primary-active",
  secondary: "bg-primary-subtle text-primary-active hover:bg-secondary-hover",
  ghost: "px-3 text-primary hover:bg-primary-subtle hover:text-primary-hover",
} as const;

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: keyof typeof VARIANTS }) {
  return (
    <Link
      {...props}
      className={`transition-soft inline-flex h-11 items-center justify-center gap-2 rounded-sm text-button lg:h-10 ${
        variant === "ghost" ? "" : "px-4"
      } ${VARIANTS[variant]} ${className}`}
    />
  );
}
