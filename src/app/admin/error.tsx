"use client";

import { Alert } from "../_components/alert";

// Error inesperado en la zona administrativa (DESIGN.md A.3). Mensaje seguro con vía de recuperación; nunca el
// mensaje técnico, la pila ni el `digest` de Next (los errores del servidor los registra `instrumentation.ts`).
export default function AdminError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-12">
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
  );
}
