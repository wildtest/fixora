"use server";

import type { ActionResult } from "@/application/action-result";
import type { SessionExpiredCode } from "@/application/admin/admin-action";
import type { TransitionCode, TransitionOutcome } from "@/application/admin/transition-order";
import { transitionOrderAction } from "@/application/admin/transition-order-service";
import { authenticateRequest } from "../../_lib/auth";

// Cambio de estado de una orden (CHG-10 D2). Server Action de cuerpo explícito { orderId, targetStatus,
// expectedVersion, confirmed } (nunca `FormData` indiscriminado; no hay REST). La sesión se vuelve a comprobar en CADA
// llamada (`SESSION_EXPIRED` antes de cualquier lectura o escritura). El destino es siempre explícito y el servidor
// recalcula todo: ignora cualquier afirmación del cliente sobre qué está permitido, bloqueado o confirmado.
export type TransitionRequest = {
  readonly orderId: string;
  readonly targetStatus: string;
  readonly expectedVersion: number;
  readonly confirmed: boolean;
};

export async function transitionOrderStatus(
  request: TransitionRequest,
): Promise<ActionResult<TransitionOutcome, TransitionCode | SessionExpiredCode>> {
  return transitionOrderAction(authenticateRequest, request);
}
