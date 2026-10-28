"use client";

import { Alert } from "../_components/alert";

// Error inesperado en una superficie pública (DESIGN.md A.3). El layout público (cabecera y aviso) permanece.
// Nunca se muestra el mensaje técnico, el nombre de la excepción, la pila ni el `digest` de Next: la interfaz
// no usa el `error` recibido. Los errores del servidor los registra `instrumentation.ts` (CHG-01).
// La línea «Referencia» se omite: aún no existe una referencia opaca propia de FIXORA que llegue hasta aquí.
export default function PublicError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <div className="mx-auto w-full max-w-xl">
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
