import { normalizeTrackingCode } from '../domain/repair/tracking-lookup';
import type { PublicOrderView } from '../domain/repair/public-order-view';
import type { ActionResult } from './action-result';

// Caso de uso público de seguimiento (CHG-06 D3/D5). Orden seguro:
//   sujeto → limitador (¿bloqueado? ¿no disponible?) → normalizar → buscar → registrar fallo.
// Mal formado e inexistente comparten TRACKING_NOT_FOUND y ambos cuentan como fallo; un acierto no cuenta.
// Si el limitador no puede evaluarse, FALLA CERRADO: SERVICE_UNAVAILABLE sin consultar ninguna orden.

export type TrackOrderCode = 'TRACKING_NOT_FOUND' | 'RATE_LIMITED' | 'SERVICE_UNAVAILABLE';

/** Política de la consulta pública (TD §22): 10 fallos en 10 minutos bloquean 15 minutos. */
export const LOOKUP_POLICY = { maxFailures: 10, windowMs: 10 * 60_000, blockMs: 15 * 60_000 } as const;

export type LimiterDecision =
  | { readonly status: 'allowed' }
  | { readonly status: 'blocked'; readonly blockedUntil: Date }
  | { readonly status: 'unavailable' };

export type TrackOrderDependencies = {
  readonly isBlocked: (subject: string) => Promise<LimiterDecision>;
  readonly recordFailure: (subject: string) => Promise<LimiterDecision>;
  readonly findByTrackingCode: (trackingCode: string) => Promise<PublicOrderView | null>;
  /** Evento operativo sin datos sensibles (ni código ni origen). */
  readonly onEvent: (event: 'lookup.rate_limited' | 'limiter.unavailable') => void;
};

type Result = ActionResult<PublicOrderView, TrackOrderCode>;

export async function trackOrder(rawCode: unknown, subject: string, dependencies: TrackOrderDependencies): Promise<Result> {
  const blocked = await dependencies.isBlocked(subject);
  if (blocked.status === 'unavailable') {
    dependencies.onEvent('limiter.unavailable');
    return { ok: false, code: 'SERVICE_UNAVAILABLE' };
  }
  if (blocked.status === 'blocked') {
    dependencies.onEvent('lookup.rate_limited');
    return { ok: false, code: 'RATE_LIMITED' };
  }

  const failure = async (): Promise<Result> => {
    const recorded = await dependencies.recordFailure(subject);
    if (recorded.status === 'unavailable') {
      dependencies.onEvent('limiter.unavailable');
      return { ok: false, code: 'SERVICE_UNAVAILABLE' };
    }
    return { ok: false, code: 'TRACKING_NOT_FOUND' };
  };

  const trackingCode = typeof rawCode === 'string' ? normalizeTrackingCode(rawCode) : null;
  if (trackingCode === null) return failure(); // mal formado: no toca la tabla de órdenes
  const order = await dependencies.findByTrackingCode(trackingCode);
  if (order === null) return failure();
  return { ok: true, data: order };
}
