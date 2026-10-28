import type { TrackOrderCode } from "@/application/track-order";
import { Alert } from "./alert";

// Resultados no exitosos de la consulta pública (DESIGN.md §13.2 y Apéndice A.5). Son estados DISTINTOS en título y
// significado: no encontrado (Error), demasiados intentos (Warning, afirma que se superó un límite) y servicio no
// disponible (Warning, no afirma nada sobre el usuario). Ninguno revela si algún código era correcto.

export type LookupFailureCode = TrackOrderCode | "INTERNAL_ERROR";

const retryButton =
  "transition-soft inline-flex h-11 w-full items-center justify-center rounded-sm bg-primary-subtle px-4 text-button text-primary-active hover:bg-secondary-hover md:w-auto lg:h-10";

export function LookupAlert({ code, onRetry }: { code: LookupFailureCode; onRetry?: () => void }) {
  switch (code) {
    case "TRACKING_NOT_FOUND":
      return (
        <Alert variant="error" role="alert" title="No encontramos una reparación con ese código.">
          Verifica el código e inténtalo nuevamente.
        </Alert>
      );
    case "RATE_LIMITED":
      return (
        <Alert variant="warning" role="alert" title="Demasiados intentos">
          Inténtalo nuevamente más tarde.
        </Alert>
      );
    case "SERVICE_UNAVAILABLE":
      return (
        <Alert
          variant="warning"
          role="alert"
          title="Servicio no disponible temporalmente"
          action={
            onRetry ? (
              <button type="button" onClick={onRetry} className={retryButton}>
                Reintentar
              </button>
            ) : undefined
          }
        >
          Inténtalo nuevamente más tarde.
        </Alert>
      );
    default:
      return (
        <Alert
          variant="error"
          role="alert"
          title="Ocurrió un problema inesperado."
          action={
            onRetry ? (
              <button type="button" onClick={onRetry} className={retryButton}>
                Reintentar
              </button>
            ) : undefined
          }
        >
          Inténtalo nuevamente.
        </Alert>
      );
  }
}
