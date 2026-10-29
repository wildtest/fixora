import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DemoNotice } from "../../_components/demo-notice";
import { LogoIcon } from "../../_components/icons";
import { SessionExpiredAlert } from "../_components/access-alert";
import { currentAdmin } from "../_lib/auth";
import { SignInForm } from "./sign-in-form";

// ADM-01 — Acceso administrativo (CHG-08). Una columna centrada, sin navegación del taller ni datos. Una sesión
// válida que llega aquí se envía a la entrada protegida sin volver a mostrar el formulario (detalle de UX). El aviso
// de sesión expirada solo aparece cuando el navegador traía una cookie que ya no vale.
export const metadata: Metadata = {
  title: "Acceso al taller",
};

export default async function AccessPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (await currentAdmin()) redirect("/admin");
  const { motivo } = await searchParams;

  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center px-4 md:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2 rounded-sm text-h3 text-content" aria-label="FIXORA, inicio">
            <span className="text-primary">
              <LogoIcon size={28} />
            </span>
            FIXORA
          </Link>
        </div>
      </header>
      <DemoNotice />
      <main id="contenido" className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 md:py-12 lg:px-8">
        {motivo === "expirada" ? (
          <div className="mx-auto mb-4 w-full max-w-md">
            <SessionExpiredAlert />
          </div>
        ) : null}
        <SignInForm />
      </main>
    </>
  );
}
