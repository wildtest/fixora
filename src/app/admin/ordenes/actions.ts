"use server";

import type { ActionResult } from "@/application/action-result";
import { searchOrdersAction } from "@/application/admin/order-directory-service";
import type { AdminOrderPage } from "@/domain/admin/order-directory";
import { authenticateRequest } from "../_lib/auth";

// Lectura interactiva del directorio (CHG-09a D3): Server Action de cuerpo explícito { search, status, page }.
// Vuelve a comprobar la sesión en CADA llamada (`SESSION_EXPIRED` sin sesión válida): no confía en la autorización
// del render inicial. El texto buscado puede ser un código (secreto bearer) o un nombre (PII): viaja solo en el
// cuerpo, nunca en la URL, y no se registra. Sin REST.
export type DirectoryQuery = { readonly search: string; readonly status: string; readonly page: number };

export async function searchOrders(query: DirectoryQuery): Promise<ActionResult<AdminOrderPage, "SESSION_EXPIRED">> {
  const body = typeof query === "object" && query !== null ? query : { search: undefined, status: undefined, page: undefined };
  return searchOrdersAction(authenticateRequest, { search: body.search, status: body.status, page: body.page });
}
