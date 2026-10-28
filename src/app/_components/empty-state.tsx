import type { ReactNode } from "react";

// Estado vacío (DESIGN.md §6.14 y A.4): card centrada con icono en cuadro de 48, título, texto y acción.
export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="mx-auto flex w-full max-w-md flex-col items-center rounded-md border border-line bg-surface px-6 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-md bg-surface-secondary text-content-secondary">
        {icon}
      </span>
      <h1 className="mt-4 text-h3 text-content">{title}</h1>
      <p className="mt-2 text-small text-content-secondary">{children}</p>
      {action ? <div className="mt-6 flex w-full flex-col md:w-auto">{action}</div> : null}
    </section>
  );
}
