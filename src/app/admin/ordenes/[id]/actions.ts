"use server";

import type { ActionResult } from "@/application/action-result";
import type { SessionExpiredCode } from "@/application/admin/admin-action";
import type { BasicDataCode, BasicDataOutcome } from "@/application/admin/edit-basic-data";
import { saveBasicOrderDataAction } from "@/application/admin/edit-basic-data-service";
import type { EditCode, EditOutcome } from "@/application/admin/edit-diagnosis-cost";
import type { ChangeNoteOutcome, CreateNoteOutcome, NoteCode } from "@/application/admin/order-notes";
import { createNoteAction, deleteNoteAction, editNoteAction } from "@/application/admin/order-notes-service";
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

// --- CHG-12: notas públicas e internas (versión PROPIA de la nota; no tocan la versión de la orden) ----------------------
export type CreateNoteRequest = { readonly orderId: string; readonly visibility: string; readonly content: string };
export type EditNoteRequest = { readonly orderId: string; readonly noteId: string; readonly expectedNoteVersion: number; readonly content: string };
export type DeleteNoteRequest = { readonly orderId: string; readonly noteId: string; readonly expectedNoteVersion: number };

export async function createNote(request: CreateNoteRequest): Promise<ActionResult<CreateNoteOutcome, NoteCode | SessionExpiredCode>> {
  return createNoteAction(authenticateRequest, request);
}

export async function editNote(request: EditNoteRequest): Promise<ActionResult<ChangeNoteOutcome, NoteCode | SessionExpiredCode>> {
  return editNoteAction(authenticateRequest, request);
}

export async function deleteNote(request: DeleteNoteRequest): Promise<ActionResult<{ readonly deleted: true }, NoteCode | SessionExpiredCode>> {
  return deleteNoteAction(authenticateRequest, request);
}

// --- CHG-13: corrección conjunta de los datos básicos (siete campos; versión de la orden; sin historial) ----------------
export type SaveBasicDataRequest = {
  readonly orderId: string;
  readonly expectedVersion: number;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly customerEmail: string;
  readonly deviceType: string;
  readonly brand: string;
  readonly model: string;
  readonly problemDescription: string;
};

export async function saveBasicOrderData(request: SaveBasicDataRequest): Promise<ActionResult<BasicDataOutcome, BasicDataCode | SessionExpiredCode>> {
  return saveBasicOrderDataAction(authenticateRequest, request);
}
