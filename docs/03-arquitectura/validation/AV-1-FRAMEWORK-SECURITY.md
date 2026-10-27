# AV-1 — Framework / Seguridad

**AV-1: PASS** (siete experimentos de siete; resultado final, revisado y aprobado). **Fecha:** 2026-10-27. **Gate:** Architecture Validation Gate (TD §29), Fase 7.0.

Este documento es **evidencia de validación**, no una decisión nueva ni un cambio de arquitectura. No contradice el Technical Design ni los ADR. No hay `ARCHITECTURE REVIEW REQUIRED`. La condición de STOP (CSP administrativa estricta que no funcione ni con el árbol totalmente dinámico) **no se activó**.

## 1. Entorno del spike

| Elemento | Valor |
|---|---|
| Node.js | **v24.22.1** (binario portable oficial, `node-v24.22.1-win-x64.zip`, SHA-256 verificado contra `SHASUMS256.txt` de nodejs.org); el Node global del usuario (v26.11.1) no se modificó |
| npm (del Node portable) | 11.19.1 |
| Next.js | 16.4.3 (Turbopack, producción: `next build` + `next start`) |
| React / React DOM | 19.3.0 / 19.3.0 |
| TypeScript | 6.0.3 (no 7.x: `typescript-eslint` acepta `<6.1.0`) |
| `@types/node` / `@types/react` / `@types/react-dom` | 24.19.2 / 19.3.0 / 19.3.0 |
| Playwright | `@playwright/test` 1.64.1 (`playwright-core` 1.64.1), solo Chromium (chromium-1248) |
| SO | Windows 11, x64 |
| Configuración | `cacheComponents: true`, `partialPrefetching: true`, `poweredByHeader: false`, `Referrer-Policy: no-referrer` en todas las rutas |

Spike fuera del repositorio (directorio temporal `fixora-architecture-validation/av1-framework/`), con sesión **falsa** (cookie `HttpOnly`, `SameSite=Strict`, sin base de datos, sin usuarios reales ni `scrypt`). Todo se comprobó con `next build` + `next start` (no con `next dev`) y un navegador real (Chromium). Rutas: `/` (pública, estática), `/consultar` y `/consultar-naive` (públicas, estado efímero ficticio), `/admin/acceso` y `/admin/spike` (administrativas, dinámicas). Comandos principales: `tsc --noEmit` (rc=0), `next build` (rc=0), `playwright test` (8 pruebas, 8 correctas).

## 2. Resumen de experimentos

| ID | Experimento | Resultado |
|---|---|---|
| AV1-01 | `/admin/**` totalmente dinámico con `cacheComponents` | PASS |
| AV1-02 | CSP administrativa estricta con nonce | PASS |
| AV1-03 | Coexistencia con la ruta pública estática | PASS |
| AV1-04 | Server Action + `redirect()` fuera de `try/catch` | PASS |
| AV1-05 | Cierre de sesión + Back/Forward | PASS |
| AV1-06 | Estado público sensible bajo Cache Components / Activity | PASS (con el mecanismo de reinicio) |
| AV1-07 | Origin/Host con `Referrer-Policy: no-referrer` | PASS |

## 3. Detalle

### AV1-01 — `/admin/**` dinámico
- **Qué hace falta:** `await connection()` en el **layout** de `/admin` (fuera de cualquier `<Suspense>`) **más** `export const instant = false`. Sin `instant = false`, `next build` falla con *blocking-prerender-dynamic* («accessed outside of `<Suspense>`»). Con `connection()` solo dentro de un `<Suspense>` la ruta queda como *Partial Prerender* (`◐`), no totalmente dinámica.
- **Evidencia de build:** `ƒ /admin/acceso`, `ƒ /admin/spike` (Dynamic) frente a `○ /`, `○ /consultar` (Static); `ƒ Proxy (Middleware)`.
- **Evidencia de ejecución:** dos peticiones consecutivas devuelven marcas de tiempo distintas (renderizado por petición); `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`. Sin cookie, el cuerpo no contiene el contenido protegido.
- **Observación (no bloqueante):** una visita sin sesión devuelve `200` y la redirección a `/admin/acceso` viaja por el flujo de streaming (no un `307`) cuando el guardián está dentro de un `<Suspense>`; no se expone contenido administrativo. Si CHG-08 quiere un `307` real, debe resolver la autorización antes de cualquier frontera `<Suspense>`. La cabecera `x-nextjs-prerender: 1` aparece incluso en la ruta dinámica y no se interpretó como señal.

### AV1-02 — CSP con nonce
- **CSP efectiva (nonce sustituido):** `default-src 'self'; script-src 'self' 'nonce-<NONCE>' 'strict-dynamic'; style-src 'self' 'nonce-<NONCE>'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; frame-src 'none'`.
- **Resultados:** el nonce cambia entre peticiones; 17 de 17 `<script>` llevan el nonce; 0 scripts en línea sin nonce; 0 `<style>` sin nonce; sin `unsafe-inline` ni `unsafe-eval` en `script-src`; hidratación correcta (un botón cliente responde al clic) y **0 violaciones CSP** en consola. `proxy.ts` con `matcher: ['/admin/:path*']`.
- **Contraprueba (por qué el árbol debe ser totalmente dinámico):** con la ruta como *Partial Prerender* (`connection()` solo dentro de `<Suspense>`), el HTML contenía 18 scripts de los que solo 6 llevaban nonce y 2 eran en línea sin nonce; la CSP estricta los bloqueaba y la página **no se hidrataba**. Coincide con la guía oficial (el nonce exige renderizado dinámico y PPR es incompatible con un nonce aplicado al shell estático). No se debilitó la política para «pasar».

### AV1-03 — Coexistencia pública/administrativa
- La ruta pública `/` permanece estática (`○`; `x-nextjs-cache: HIT`, `s-maxage=31536000`), sin cabecera ni atributo de nonce, mientras `/admin/**` recibe nonce: el *matcher* administrativo no fuerza renderizado dinámico a toda la aplicación.
- **CSP pública (base estática):** con `script-src 'self'` solo, la página **no se hidrata** (los scripts en línea del shell estático se bloquean). Con `script-src 'self' 'unsafe-inline'` y `style-src 'self'` (sin `unsafe-inline` en estilos) la hidratación es correcta y hay 0 violaciones. Es coherente con TD §21.3, que permite `unsafe-inline` en lo público **solo** si el shell estático lo requiere técnicamente. Esto es un dato de entrada para CHG-04.

### AV1-04 — Server Action + `redirect()`
- Fallo de aplicación simulado (dentro de `try/catch`) → estado de error mostrado, sin redirección y sin la frontera de errores; éxito → `redirect('/admin/spike')` **fuera** del `try/catch` → navegación correcta y `error.tsx` no se activa (`NEXT_REDIRECT` no se convierte en `INTERNAL_ERROR`).

### AV1-05 — Cierre de sesión + Back/Forward
- Tras el cierre, la cookie desaparece. Back/Forward/recarga **no** vuelven a mostrar el contenido protegido (instantáneas a 0, 300 y 1500 ms: `protected=false`); la visita al histórico `/admin/spike` termina en `/admin/acceso`. La petición sin cookie no devuelve contenido. La autoridad sigue siendo la del servidor en cada navegación.

### AV1-06 — Estado público sensible
- Con un código ficticio y un resultado en memoria: el código **no** aparece en la URL; tras recargar el estado desaparece. **Sin mecanismo** (`/consultar-naive`), al salir y volver con Back la **Activity restaura** el resultado y el campo (exposición real). **Con el mecanismo propuesto en CHG-06** (la limpieza del efecto, que React ejecuta al ocultar la ruta, incrementa una «época» que remonta el componente con estado limpio) el resultado y el campo quedan vacíos al volver. Conclusión: el estado público sensible exige ese reinicio explícito; el mecanismo funciona.

### AV1-07 — Origin/Host con `no-referrer`
- Con `Referrer-Policy: no-referrer`, la Server Action invocada desde el navegador (con JS) envía `Origin: http://localhost:3100` (y no envía `Referer`) y se **acepta**. Repetida con `Origin: http://evil.example` o `Origin: null` el servidor responde `500` («Invalid Server Actions request»: *`x-forwarded-host` … does not match `origin`*). La protección depende de `Origin`/`Host`, no de `Referer`; no se configuró `allowedOrigins`.
- **Observación:** una navegación POST nativa (formulario sin JS) bajo `no-referrer` envía `Origin: null` y sería rechazada; FIXORA V1 requiere JavaScript (riesgo residual 12 del TD), de modo que el flujo normal no la usa. No cambiar la política salvo que una prueba real lo exija.

## 4. Conclusiones para los changes (entradas, no decisiones nuevas)

1. **CHG-08:** layout `/admin` con `await connection()` + `export const instant = false`; `proxy.ts` con `matcher` de `/admin/**`; CSP con nonce según la tabla de §3; autorización antes de cualquier `<Suspense>` si se quiere un `307`.
2. **CHG-04:** la CSP pública base puede necesitar `script-src 'unsafe-inline'` (no `style-src`) por el shell estático; se verifica en su implementación. `unsafe-inline` se limita a las rutas públicas donde el shell estático de Next lo requiera demostrablemente y **no se extiende a `/admin/**`**, que permanece totalmente dinámico, con nonce por petición, CSP estricta y sin *fallback* `unsafe-inline` para scripts.
3. **CHG-05 / CHG-06:** el estado público sensible debe reiniciarse al ocultarse la ruta (mecanismo de §AV1-06); redirects de Server Actions fuera de `try/catch`.
4. **CHG-10 y siguientes:** las Server Actions son same-origin (aceptadas); cross-origin u `Origin: null` se rechazan bajo `Referrer-Policy: no-referrer`. No configurar `serverActions.allowedOrigins` sin una necesidad futura demostrada.

## 5. Límites del spike

Solo Chromium; HTTP en `localhost` (no se probaron `Secure`, el prefijo `__Host-`, HSTS ni `upgrade-insecure-requests`: pertenecen a CHG-08/AV-3); no es Vercel; sesión falsa; no se probó `next dev` (la CSP difiere en desarrollo) ni WebKit/Firefox. Estas comprobaciones corresponden a los changes propietarios y a AV-3.

## 6. Archivos temporales

Spike en `…/Temp/fixora-architecture-validation/av1-framework/` (Next + React + TypeScript + Playwright/Chromium, con `PLAYWRIGHT_BROWSERS_PATH` dentro del mismo directorio). **Eliminado** tras recopilar esta evidencia; ningún código del spike se copió a `src/`. Sin secretos ni cookies reales en la evidencia.
