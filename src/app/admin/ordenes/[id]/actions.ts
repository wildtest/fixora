"use server";

import type { ActionResult } from "@/application/action-result";
import type { SessionExpiredCode } from "@/application/admin/admin-action";
import type { EditCode, EditOutcome } from "@/application/admin/edit-diagnosis-cost";
import { saveDiagnosisAction, saveEstimatedCostAction } from "@/application/admin/edit-diagnosis-cost-service";
import type { TransitionCode, TransitionOutcome } from "@/application/admin/transition-order";
import { transitionOrderAction } from "@/application/admin/transition-order-service";
import { authenticateRequest } from "../../_lib/auth";

// Acciones de escritura del detalle administrativo. Todas son Server Actions de cuerpo explícito (nunca `FormData`
// indiscriminado; no hay REST), vuelven a comprobar la sesión en CADA llamada (`SESSION_EXPIRED` antes de cualquier
// lectura o escritura) y recalculan todo en el servidor: ignoran cualquier afirmación del cliente sobre qué está permitido,
// bloqueado, confirmado o congelado. No se registra ningún cuerpo.

// --- CHG-10: cambio de estado -------------------------------------------------------------------------------------
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

// --- CHG-11: diagnóstico y costo estimado (dos operaciones INDEPENDIENTES, cada una con su versión e historial) ---------
export type SaveDiagnosisRequest = { readonly orderId: string; readonly diagnosis: string; readonly expectedVersion: number };
export type SaveCostRequest = { readonly orderId: string; readonly estimatedCost: string; readonly expectedVersion: number };

export async function saveDiagnosis(request: SaveDiagnosisRequest): Promise<ActionResult<EditOutcome, EditCode | SessionExpiredCode>> {
  return saveDiagnosisAction(authenticateRequest, request);
}

export async function saveEstimatedCost(request: SaveCostRequest): Promise<ActionResult<EditOutcome, EditCode | SessionExpiredCode>> {
  return saveEstimatedCostAction(authenticateRequest, request);
}
