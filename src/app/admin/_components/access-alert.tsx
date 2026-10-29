import type { SignInCode } from "@/application/admin/sign-in";
import { Alert } from "../../_components/alert";

// Resultados no exitosos del acceso administrativo (DESIGN.md §13.3 y Apéndice A.5). Son estados DISTINTOS en título
// y significado: credenciales inválidas (Error, mensaje GENÉRICO que no indica qué dato falló), demasiados intentos
// (Warning) y servicio no disponible (Warning, no afirma nada sobre el usuario). Ninguno revela si el correo existe,
// ni cuántos intentos quedan, ni reglas de contraseña.

export type AccessFailureCode = SignInCode | "INTERNAL_ERROR";

const retryButton =
  "transition-soft inline-flex h-11 w-full items-center justify-center rounded-sm bg-primary-subtle px-4 text-button text-primary-active hover:bg-secondary-hover md:w-auto lg:h-10";

export function AccessAlert({ code, onRetry }: { code: AccessFailureCode; onRetry?: () => void }) {
  switch (code) {
    case "INVALID_CREDENTIALS":
      return (
        <Alert variant="error" role="alert" title="No pudimos iniciar sesión">
          Revisa tus datos e inténtalo nuevamente.
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

/** Sesión expirada (DESIGN.md §13.4, `E10`). Con `href`, ofrece «Ir al inicio de sesión» (acciones interrumpidas). */
export function SessionExpiredAlert({ children }: { children?: string }) {
  return (
    <Alert variant="warning" role="alert" title="Tu sesión expiró">
      {children ?? "Inicia sesión nuevamente para continuar."}
    </Alert>
  );
}
