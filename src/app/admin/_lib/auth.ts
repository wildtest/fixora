import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { AdminContext } from "@/application/admin/admin-context";
import { authenticateSession } from "@/application/admin/admin-service";
import { sessionCookieSettings } from "@/application/admin/session-cookie";

// Autorización de la zona administrativa (CHG-08, D9). La autoridad es la fila de sesión en PostgreSQL; la mera
// presencia de la cookie no prueba nada. Todo esto es dinámico y no usa `use cache`. Cualquier sesión no válida
// (cookie ausente, inventada, vencida o eliminada) se trata igual.

async function readToken(): Promise<string | undefined> {
  const { name } = sessionCookieSettings();
  return (await cookies()).get(name)?.value;
}

// Una sola comprobación por petición de renderizado (layout y página comparten el resultado).
const authenticateRender = cache(async (): Promise<AdminContext | null> => authenticateSession(await readToken()));

/** Administrador de la petición de renderizado o `null`. No redirige. */
export function currentAdmin(): Promise<AdminContext | null> {
  return authenticateRender();
}

/**
 * Páginas y lecturas administrativas: sin sesión válida redirige al acceso ANTES de generar contenido (307).
 * Si el navegador traía una cookie que ya no vale, el acceso muestra el aviso de sesión expirada.
 */
export async function requireAdmin(): Promise<AdminContext> {
  const admin = await authenticateRender();
  if (admin === null) {
    const hadCookie = (await readToken()) !== undefined;
    redirect(hadCookie ? "/admin/acceso?motivo=expirada" : "/admin/acceso");
  }
  return admin;
}

/** Autenticación de una Server Action (sin caché): el adaptador la pasa a los casos de uso de `application`. */
export async function authenticateRequest(): Promise<AdminContext | null> {
  return authenticateSession(await readToken());
}
