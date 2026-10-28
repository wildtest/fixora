"use client";

import "./globals.css";
import { Alert } from "./_components/alert";
import { geistMono, geistSans } from "./fonts";

// Fallo global (DESIGN.md A.3): reemplaza al layout raíz, por lo que define su propio <html> y <body>, y carga
// sus propios estilos y fuentes mediante clases (sin estilos en línea, por la CSP pública).
// Alerta centrada sobre el fondo, con «Reintentar» y sin depender de la navegación. No muestra detalles técnicos.
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-dvh">
        <title>FIXORA</title>
        <main className="flex min-h-dvh items-center justify-center px-4 py-8 md:px-6">
          <div className="w-full max-w-xl">
            <Alert
              variant="error"
              role="alert"
              title="Ocurrió un problema inesperado."
              action={
                <button
                  type="button"
                  onClick={() => retry()}
                  className="transition-soft inline-flex h-11 w-full items-center justify-center rounded-sm bg-primary-subtle px-4 text-button text-primary-active hover:bg-secondary-hover lg:h-10 lg:w-auto"
                >
                  Reintentar
                </button>
              }
            >
              Inténtalo nuevamente.
            </Alert>
          </div>
        </main>
      </body>
    </html>
  );
}
