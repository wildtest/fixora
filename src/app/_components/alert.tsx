import type { ReactNode } from "react";
import { ErrorIcon, ScienceIcon } from "./icons";

// Alerta / banner (DESIGN.md §6.11): fondo suave + borde 1 px del semántico + icono 20 + título 15/600 + texto 14;
// radio 8, padding 12/16, sin bordes laterales gruesos. Solo las variantes que usa este change: Info y Error.

const VARIANTS = {
  info: { box: "border-info-line bg-info-soft", title: "text-info-text", text: "text-info-text", Icon: ScienceIcon },
  error: { box: "border-danger-line bg-danger-soft", title: "text-danger-text", text: "text-content-secondary", Icon: ErrorIcon },
} as const;

export function Alert({
  variant,
  title,
  children,
  action,
  role,
}: {
  variant: keyof typeof VARIANTS;
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  role?: "alert" | "status" | "note";
}) {
  const { box, title: titleClass, text, Icon } = VARIANTS[variant];
  return (
    <div role={role} className={`flex flex-col gap-3 rounded-md border px-4 py-3 ${box}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 shrink-0 ${titleClass}`}>
          <Icon size={20} />
        </span>
        <div className="min-w-0 flex-1">
          {title ? <p className={`text-button ${titleClass}`}>{title}</p> : null}
          <p className={`text-small ${text}`}>{children}</p>
        </div>
      </div>
      {action ? <div className="flex flex-col md:flex-row">{action}</div> : null}
    </div>
  );
}
