import { NextResponse, type NextRequest } from "next/server";
import { cookieSettingsFor } from "./application/admin/session-cookie";
import { getConfig } from "./infrastructure/config/env";
import { adminCsp, newNonce } from "./infrastructure/security/admin-csp";

// Proxy de la zona administrativa (CHG-08, D11). Solo cabeceras y, a lo sumo, una redirección SUPERFICIAL: NO es
// fuente de autorización. La sesión se comprueba en `requireAdmin()` contra PostgreSQL, en cada página y acción.
//   - Genera el nonce por petición y fija la CSP estricta de `/admin/**` (la pública, estática, la fija
//     `next.config.mjs` y excluye `/admin`).
//   - Una NAVEGACIÓN (GET) a una superficie protegida sin cookie de sesión se redirige al acceso con un 307 real.
//     La presencia de la cookie no prueba nada: con cookie, la comprobación de verdad la hace la página.
//     Las Server Actions (POST) nunca se redirigen aquí: cada acción comprueba su sesión y devuelve SESSION_EXPIRED.
export function proxy(request: NextRequest) {
  const { nodeEnv } = getConfig();
  const { pathname } = request.nextUrl;

  const isNavigation = request.method === "GET" && !request.headers.has("next-action");
  const isAccessScreen = pathname === "/admin/acceso" || pathname.startsWith("/admin/acceso/");
  if (isNavigation && !isAccessScreen && !request.cookies.has(cookieSettingsFor(nodeEnv).name)) {
    return NextResponse.redirect(new URL("/admin/acceso", request.url), 307);
  }

  const nonce = newNonce();
  const csp = adminCsp(nonce, nodeEnv === "development");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
