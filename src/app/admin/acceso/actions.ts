"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { signInFromRequest } from "@/application/admin/admin-service";
import { sessionCookieSettings } from "@/application/admin/session-cookie";
import type { SignInCode } from "@/application/admin/sign-in";

// Server Action del inicio de sesión (CHG-08 D1). Cuerpo explícito: un único objeto { email, password } (nunca
// `FormData` indiscriminado). La comprobación Origin/Host la hace Next. La cabecera del origen, la cookie y el
// `redirect()` se resuelven aquí, en el adaptador, fuera de `runAction`. Ni la contraseña ni el token se devuelven
// al cliente ni se registran: el token solo viaja en la cabecera `Set-Cookie`.
export type SignInFailure = { readonly ok: false; readonly code: SignInCode | "INTERNAL_ERROR" };

export async function signInAction(credentials: { email: string; password: string }): Promise<SignInFailure> {
  const body = typeof credentials === "object" && credentials !== null ? credentials : { email: undefined, password: undefined };
  const requestHeaders = await headers();
  const result = await signInFromRequest(
    { email: body.email, password: body.password },
    requestHeaders.get("x-vercel-forwarded-for"),
  );
  if (!result.ok) return { ok: false, code: result.code };

  const { name, options } = sessionCookieSettings();
  (await cookies()).set(name, result.data.sessionToken, options);
  redirect("/admin");
}
