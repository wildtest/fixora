import { safeErrorFields } from '@/infrastructure/logging/safe-error';
import type { LogSurface, Logger } from '@/infrastructure/logging/logger';
import { getLogger } from '@/infrastructure/logging/server-logger';
import type { ActionFailure, ActionResult } from './action-result';

// Frontera de ejecución de código propio de FIXORA; no es un detector de errores del framework.
//
//   adaptador de src/app  →  runAction(...)  →  caso de uso de application  →  domain / infrastructure
//
// Convención: `redirect()`, `permanentRedirect()`, `notFound()`, `cookies()`, `headers()` y cualquier
// otra API de Next (que puede lanzar excepciones de control de flujo o aplazar el render) se ejecutan
// en el adaptador de `src/app`, ANTES o DESPUÉS de `runAction`, nunca dentro del callback. El adaptador
// prepara la entrada (contexto, sesión, cabeceras ya leídas) y pasa valores; actúa sobre el resultado
// (redirect, revalidate…) fuera de la frontera. `application/` no puede importar Next (regla de lint),
// así que no hace falta heurística: no se inspecciona `digest` ni `Error.message` y no se usa
// `unstable_rethrow`.
//
// Los fallos esperados de negocio no son excepciones: se expresan con códigos tipados de cada change.
// `onRequestError` (instrumentation) no usa `runAction`: observa lo que escapa de las fronteras.

export type RunActionOptions = {
  readonly logger?: Logger;
  // Referencia opaca de la petición (p. ej. `x-vercel-id` ya leído por el adaptador).
  readonly requestId?: string;
  readonly surface?: LogSurface;
  readonly newReference?: () => string;
};

export async function runAction<T, C extends string = never>(
  operation: () => Promise<ActionResult<T, C>> | ActionResult<T, C>,
  options: RunActionOptions = {},
): Promise<ActionResult<T, C>> {
  try {
    return await operation();
  } catch (error) {
    const reference = options.requestId ?? (options.newReference ?? (() => crypto.randomUUID()))();
    try {
      (options.logger ?? getLogger()).error({
        event: 'infrastructure.failure',
        requestId: reference,
        surface: options.surface ?? 'system',
        resultCode: 'INTERNAL_ERROR',
        routeType: 'action',
        ...safeErrorFields(error),
      });
    } catch {
      // Un fallo de logging no cambia el resultado devuelto.
    }
    const failure: ActionFailure<never> = { ok: false, code: 'INTERNAL_ERROR', reference };
    // `ActionResult` es condicional sobre `C` (no resoluble con `C` genérico); `INTERNAL_ERROR` siempre es válido.
    return failure as unknown as ActionResult<T, C>;
  }
}
