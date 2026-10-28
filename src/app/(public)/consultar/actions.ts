'use server';

import { headers } from 'next/headers';
import type { ActionResult } from '@/application/action-result';
import type { TrackOrderCode } from '@/application/track-order';
import { trackOrderFromRequest } from '@/application/track-order-service';
import type { PublicOrderView } from '@/domain/repair/public-order-view';

// Server Action de la consulta pública (CHG-06 D1). Cuerpo explícito: un único argumento de texto (nunca
// `FormData` indiscriminado; no hay REST ni /api/tracking). La cabecera del origen la lee el adaptador, fuera de
// `runAction`. El código viaja en el cuerpo, nunca en la URL, y no se registra.
export async function trackOrderAction(trackingCode: string): Promise<ActionResult<PublicOrderView, TrackOrderCode>> {
  const requestHeaders = await headers();
  return trackOrderFromRequest(trackingCode, requestHeaders.get('x-vercel-forwarded-for'));
}
