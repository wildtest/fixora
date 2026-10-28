import type { ReactNode } from "react";
import { DemoNotice } from "./demo-notice";
import { SiteHeader } from "./site-header";

// Shell público: cabecera, franja demostrativa y contenido principal. Sin pie de página (DESIGN.md no lo contempla).
// Lo usan el layout del grupo público y el `not-found` raíz, para que el 404 conserve la cabecera y la navegación.
export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <>
      <a
        href="#contenido"
        className="sr-only rounded-sm bg-surface px-4 py-2 text-button text-primary focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-20"
      >
        Saltar al contenido
      </a>
      <SiteHeader />
      <DemoNotice />
      <main id="contenido" className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 md:py-12 lg:px-8">
        {children}
      </main>
    </>
  );
}
