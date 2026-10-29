"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revokeSession } from "@/application/admin/admin-service";
import { sessionCookieSettings } from "@/application/admin/session-cookie";

// Cierre de sesión (CHG-08 D10): idempotente. Elimina la fila de la sesión en el servidor y retira la cookie (con
// los mismos atributos que la fijaron: el prefijo `__Host-` exige `Secure` y `Path=/`), y redirige al acceso. Sin
// cookie o con una sesión ya inválida termina igualmente en el estado no autenticado seguro. Si la base de datos
// falla, el error se propaga y la cookie NO se retira: el administrador sigue autenticado y puede reintentar.
export async function signOutAction(): Promise<void> {
  const { name, options } = sessionCookieSettings();
  const jar = await cookies();
  await revokeSession(jar.get(name)?.value);
  jar.set(name, "", { ...options, maxAge: 0 });
  redirect("/admin/acceso");
}
