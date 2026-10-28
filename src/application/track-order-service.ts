import 'server-only';
import { createPublicOrderStore } from '../infrastructure/tracking/public-order-store';
import { getLimiter, type Limiter } from '../infrastructure/limiter/limiter';
import { getLogger } from '../infrastructure/logging/server-logger';
import { newUuid } from '../infrastructure/security/crypto';
import { clientSubject } from '../infrastructure/security/client-subject';
import type { ActionResult } from './action-result';
import type { PublicOrderView } from '../domain/repair/public-order-view';
import { runAction, type RunActionOptions } from './run-action';
import { LOOKUP_POLICY, trackOrder, type TrackOrderCode, type TrackOrderDependencies } from './track-order';

// Composición de producción de la consulta: Server Action → sujeto → `trackOrder`. El limitador usa la primitiva
// de CHG-02 (HMAC del origen; la IP nunca se almacena en claro). Si no puede construirse (configuración ausente) o
// falla, el resultado es `unavailable` (falla cerrada), nunca «permitido».

const UNAVAILABLE_LIMITER: Pick<Limiter, 'isBlocked' | 'recordFailure'> = {
  isBlocked: async () => ({ status: 'unavailable' }),
  recordFailure: async () => ({ status: 'unavailable' }),
};

function productionLimiter(): Pick<Limiter, 'isBlocked' | 'recordFailure'> {
  try {
    return getLimiter();
  } catch {
    return UNAVAILABLE_LIMITER;
  }
}

export function productionDependencies(): TrackOrderDependencies {
  const limiter = productionLimiter();
  return {
    isBlocked: (subject) => limiter.isBlocked(subject, 'PUBLIC_TRACKING'),
    recordFailure: (subject) => limiter.recordFailure(subject, 'PUBLIC_TRACKING', LOOKUP_POLICY),
    // El repositorio se crea al usarse, solo si el limitador permitió la consulta: sin configuración de base de datos
    // el limitador ya habrá fallado cerrado y nunca se llega aquí.
    findByTrackingCode: (code) => createPublicOrderStore().findByTrackingCode(code),
    onEvent: (event) => {
      try {
        getLogger().warn({ event, requestId: newUuid(), surface: 'public' });
      } catch {
        // Un fallo de logging no cambia el resultado.
      }
    },
  };
}

/**
 * `forwardedFor` es el valor de `x-vercel-forwarded-for` ya leído por el adaptador (las cabeceras del framework
 * no se leen dentro de `runAction`).
 */
export function trackOrderFromRequest(
  rawCode: unknown,
  forwardedFor: string | null,
  dependencies: () => TrackOrderDependencies = productionDependencies,
  options: RunActionOptions = {},
): Promise<ActionResult<PublicOrderView, TrackOrderCode>> {
  return runAction(() => trackOrder(rawCode, clientSubject(forwardedFor), dependencies()), { surface: 'public', ...options });
}
