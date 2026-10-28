import 'server-only';
import { getConfig } from '@/infrastructure/config/env';
import { ROUTE_TYPES, type LogFields, type LogSurface, type RouteType } from './logger';
import { requestIdFrom, type HeadersLike } from './request-id';
import { safeErrorFields } from './safe-error';
import { getLogger } from './server-logger';

// Contexto estructural que entrega `onRequestError` de Next. Solo se leen `routePath` y `routeType`;
// de `request` solo `x-vercel-id` (nunca `path`, query, cuerpo, cookies ni otras cabeceras).
export type RequestErrorRequest = {
  readonly path?: string;
  readonly method?: string;
  readonly headers?: HeadersLike;
};
export type RequestErrorContext = { readonly routePath?: string; readonly routeType?: string };

function surfaceOf(routePath: string | undefined): LogSurface {
  if (routePath === undefined) return 'system';
  return routePath === '/admin' || routePath.startsWith('/admin/') || routePath.startsWith('/app/admin')
    ? 'admin'
    : 'public';
}

export function buildRequestErrorLog(
  error: unknown,
  request: RequestErrorRequest | undefined,
  context: RequestErrorContext | undefined,
  newId?: () => string,
): LogFields {
  const routeType: RouteType | undefined = ROUTE_TYPES.find((type) => type === context?.routeType);
  return {
    event: 'infrastructure.failure',
    requestId: requestIdFrom(request?.headers, newId),
    surface: surfaceOf(context?.routePath),
    ...safeErrorFields(error),
    ...(routeType && { routeType }),
    ...(context?.routePath !== undefined && { routePattern: context.routePath }),
  };
}

// Observación server-side de lo que escapa de las fronteras. Solo runtime Node; nunca lanza.
export async function handleRequestError(
  error: unknown,
  request: RequestErrorRequest | undefined,
  context: RequestErrorContext | undefined,
): Promise<void> {
  try {
    if (getConfig().runtime !== 'nodejs') return;
    getLogger().error(buildRequestErrorLog(error, request, context));
  } catch {
    // Un fallo de logging no puede romper la petición.
  }
}
