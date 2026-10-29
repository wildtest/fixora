# Informe del Security Pass — FIXORA V1

> Registro formal de CHG-14 `security-hardening-pass` (PRD `SC-18`; reverificación de `SC-11` y `SC-12`). Verifica y endurece: **no es dueño de ningún control** (los controles viven en CHG-01, 02, 03, 06, 07, 08, 10, 11, 12 y 13). Sin secretos, tokens, códigos de seguimiento reales, IP ni PII: la evidencia está saneada y los datos de prueba son ficticios.
>
> Fecha: 2026-10-29 · Base: `main` `7f0a91e` (CHG-01…CHG-13 archivados; M4 implementada) · Despliegue verificado: Production en Vercel (`fixora-rho-one.vercel.app`) y el build de producción local (`next build` + `next start`).

## 1. Resultado

| Puerta de salida (design D16) | Resultado |
|---|---|
| Critical abiertos | **0** |
| High abiertos | **0** |
| Hallazgos de `SC-11` abiertos | **0** |
| Hallazgos de `SC-12` abiertos | **0** |
| Cada hallazgo real con disposición final explícita (sin `Deferred` ni estado transitorio) | **Sí** (SEC-001 `Fixed`; SEC-002 `Accepted Risk`; SEC-003 y SEC-004 son observaciones `Informational`) |
| Changes correctivos funcionales requeridos | **Ninguno** (ningún hallazgo exige cambiar el comportamiento observable) |
| Resultados de AV-3 disponibles | **Sí**: variables inyectadas y conexión como `fixora_app` (CHG-07) y fuente de IP real (este informe, §4.2) |
| `npm audit --audit-level=high` | 0 vulnerabilidades (producción y desarrollo) |

## 2. Metodología y límites

Cada comprobación referencia un control con dueño, un procedimiento reproducible y un resultado esperado derivado de las fuentes (PRD, Technical Design §21–§25, ADR). Se ejecutó (a) contra el **despliegue real** todo lo que depende de Vercel y es seguro y no destructivo (cabeceras, redirecciones, `robots`, identidad del limitador), y (b) contra el **build de producción local sobre PostgreSQL real** lo que exige una sesión administrativa o escritura. Sin pruebas de carga, estrés ni tráfico agresivo; sin escáneres sin análisis; sin datos persistentes de prueba en Production.

**Límites declarados** (no son hallazgos; ver SEC-003): el agente no dispone de credenciales de Production (ni de la base de datos, ni de una sesión administrativa de Production) ni de acceso por CLI/API a los Runtime Logs de Vercel o a los paneles de Vercel/Neon/GitHub. Esas comprobaciones se apoyan en la evidencia previa del propietario (CHG-07) y en el control equivalente local.

## 3. Inventario de controles → verificación

| Control (dueño) | Qué se comprobó | Resultado | Evidencia |
|---|---|---|---|
| Logger cerrado, `runAction`, referencia opaca (CHG-01) | Esquema cerrado, sin `console.*` fuera del destino, errores desconocidos sin `message`/`stack`, canarios | Conforme | `src/infrastructure/logging/*.test.ts`; `src/application/run-action.test.ts`; `src/application/admin/admin-logging.test.ts`; `src/security-static.test.ts` |
| Roles, privilegios, historiales *append-only* (CHG-02) | Rol runtime sin DDL, sin `DELETE` en órdenes, historiales solo `SELECT/INSERT`, `admin_users` solo lectura, `UPDATE` solo por columnas (sin `id`, `tracking_code`, `created_at`) | Conforme | `tests/integration/privileges.test.ts`; `tests/integration/runtime-privileges.test.ts`; `tests/integration/zz-role-grants.test.ts` |
| CI, auditoría, secretos, acciones fijadas por SHA (CHG-03) | `npm audit` 0 hallazgos; 419+ archivos sin secretos; todas las acciones fijadas por SHA completo; `permissions: contents: read` | Conforme | `npm run ci:audit`; `npm run ci:secrets`; `.github/workflows/ci.yml` |
| Proyección pública y limitador de consulta (CHG-06, 10, 11, 12, 13) | Orden **completamente poblada** (nombre, teléfono, correo, equipo, descripción, diagnóstico, costo, notas `PUBLIC` e `INTERNAL`, historiales): solo sale lo autorizado, en proyección y serialización | Conforme | `tests/integration/tracking.test.ts`; `tests/integration/order-notes.test.ts`; `tests/integration/order-data-correction.test.ts`; `tests/e2e/track.spec.ts`; `tests/e2e/security.spec.ts` |
| Entorno, migración, Preview (CHG-07) | Migración solo desde `main` con aprobación y vínculo al SHA; Preview sin base ni secretos de Production | Conforme según la evidencia del propietario (SEC-003) | `docs/09-deploy/PRODUCTION-ENVIRONMENT.md`; `tests/tooling/production-ops.test.ts` |
| Sesión, cookie, `requireAdmin`, limitador de login (CHG-08) | Token opaco, scrypt, expiración por inactividad y absoluta, revocación, cierre y Atrás/Adelante, cookie `__Host-` con atributos, error uniforme, limitador antes de `scrypt` | Conforme (cookie verificada en el build de producción; SEC-003 para Production) | `tests/integration/admin-access.test.ts`; `tests/e2e/admin-access.spec.ts`; `src/application/admin/admin.test.ts` |
| Acciones administrativas (CHG-10, 11, 12, 13) | Invocación directa sin sesión de **todas** las acciones (transición, diagnóstico, costo, crear/editar/eliminar nota, corrección de datos): `SESSION_EXPIRED` y ninguna escritura; además, estructura estática: toda acción exportada pasa por la guardia | Conforme | `tests/integration/support/admin-action-matrix.ts` (usada por `tests/integration/admin-access.test.ts`); `src/security-static.test.ts`; `tests/e2e/security.spec.ts` |

## 4. Verificaciones del Security Pass

### 4.1 Despliegue real (Production) — cabeceras, redirecciones y robots

Capturadas con peticiones de solo lectura el 2026-10-29. Rutas públicas (`/`, `/registrar`, `/consultar`) y 404:

| Cabecera | Valor observado |
|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; frame-src 'none'` (sin terceros, sin `unsafe-eval`; `unsafe-inline` solo en `script-src` por el *shell* estático, decisión de AV-1) |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` (publicada por Vercel; la aplicación no la duplica) |
| `X-Content-Type-Options` / `X-Frame-Options` / `Referrer-Policy` | `nosniff` / `DENY` / `no-referrer` |
| `Permissions-Policy` | cámara, micrófono, geolocalización, pago, USB e `interest-cohort` deshabilitados |
| `Cross-Origin-Opener-Policy` / `Cross-Origin-Resource-Policy` | `same-origin` / `same-origin` |
| `X-Powered-By` | ausente |

`/admin/acceso`: CSP con **nonce distinto por petición** y presente en el HTML de esa misma respuesta (`script-src 'self' 'nonce-…' 'strict-dynamic'`, `style-src 'self' 'nonce-…'`, sin `unsafe-inline` ni `unsafe-eval`), `X-Robots-Tag: noindex, nofollow`. `/admin` y `/admin/ordenes/<uuid>` sin sesión responden `307` a `/admin/acceso` sin contenido. `http://` redirige `308` a HTTPS. `robots` en HTML: `/` indexable; `/registrar`, `/consultar` y `/admin/**` `noindex, nofollow`. `/api/*` no existe (`404`). Una Server Action con identificador inválido responde `400` genérico y `no-store` sin detalles.

### 4.2 Fuente de IP confiable del limitador (residuo de CHG-07 / AV-3)

Pregunta: ¿qué identidad usa el limitador de la consulta pública en Vercel y puede el cliente falsearla?

Procedimiento (sin registrar ninguna IP): contra Production, **14 consultas** de códigos bien formados e inexistentes, cada una enviando un valor **distinto** de `x-vercel-forwarded-for` (IPv4 e IPv6 de documentación); después una consulta **sin** esa cabecera; después una consulta desde **otro origen de red real** (un ejecutor de GitHub Actions, rama desechable ya eliminada).

| Observación | Conclusión |
|---|---|
| Las 14 consultas con cabeceras falseadas distintas acumularon fallos en **un mismo cubo**: el origen quedó bloqueado (`RATE_LIMITED`, "Demasiados intentos") y siguió bloqueado con otro valor falseado y **sin** cabecera | La plataforma **sobrescribe** el valor enviado por el cliente: el sujeto del limitador no es controlable por el cliente (no hay elusión rotando la cabecera) |
| Desde el ejecutor de GitHub Actions (otra IP) las consultas respondieron "No encontramos…" (no bloqueado) **mientras** el origen del agente seguía bloqueado (comprobado ~30 s después) | El sujeto **no** es un valor compartido (`unknown`): la plataforma entrega la IP real del cliente en `x-vercel-forwarded-for` y el limitador distingue orígenes |
| Con la cabecera ausente (no reproducible en Vercel, que siempre la establece), el código usa `unknown`, un único cubo compartido | Falla segura hacia el límite, nunca hacia la elusión (prueba unitaria) |

Identidad final: `HMAC(RATE_LIMIT_HMAC_SECRET, canon(IP del cliente))`, nunca la IP en claro. La canonicalización (SEC-001) cierra el diferimiento de TD §22: IPv4 en forma decimal canónica; IPv6 reducida a su prefijo **/64**; IPv6 mapeada a IPv4 como esa IPv4; cualquier valor que no sea una IP válida cuenta como `unknown`.

### 4.3 Autenticación, sesión y autorización (`SC-12`)

- Sin sesión, `/admin/**`, un UUID de orden conocido, ADM-04, el panel y el directorio no entregan datos (redirección sin contenido; `tests/e2e/security.spec.ts`).
- Todas las acciones administrativas actuales (siete: transición, diagnóstico, costo, crear/editar/eliminar nota y corrección de datos) rechazan la invocación directa sin sesión con `SESSION_EXPIRED` y sin escritura, con cookie ausente, mal formada, inventada, expirada y eliminada (matriz `admin-action-matrix.ts`, con control positivo).
- Una Server Action reproducida con la cookie de la víctima pero `Origin` ajeno es **rechazada** (CSRF) y el control positivo de mismo origen sí se ejecuta; sin cookie responde `SESSION_EXPIRED` sin escritura (`tests/e2e/security.spec.ts`). `SameSite=Strict` y la comprobación `Origin`/`Host` de Next actúan en profundidad; no hay token CSRF propio ni CORS configurado.
- Sesión opaca de 256 bits con hash SHA-256 persistido, `scrypt` con hash ficticio para correos inexistentes, expiración por inactividad (60 min) y absoluta (12 h), revocación, cierre de sesión con Atrás/Adelante sin datos, y cookie `__Host-fixora_session` (`HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`, sin `Domain`, sin `Max-Age`) verificada en el build de producción (pruebas citadas en §3).
- Redirecciones: todas son a rutas constantes; no hay redirección abierta.

### 4.4 Seguridad del navegador y la aplicación

- **XSS almacenado:** valores canario (`<script>`, `<img onerror>`, `<svg onload>`, `javascript:`) en descripción, marca, modelo, nombre, diagnóstico, nota pública y nota interna se muestran como texto literal en el panel y en la consulta pública y no se ejecutan (`tests/e2e/security.spec.ts`). Auditoría estática: sin `dangerouslySetInnerHTML`, `eval`, `new Function`, `innerHTML`, `document.write` ni `localStorage`/`sessionStorage`/`IndexedDB`/`document.cookie` en el código de producción (`src/security-static.test.ts`).
- **SQL:** todo SQL crudo es plantilla etiquetada parametrizada; ninguno usa `$queryRawUnsafe`/`$executeRawUnsafe`, la forma de llamada ni `Prisma.raw`/`Prisma.sql` (prueba estática). La búsqueda por nombre trata `%`, `_` y `\` como literales (`tests/integration/admin-orders.test.ts`).
- **CSP y cabeceras del build:** `tests/e2e/security.spec.ts` y `tests/e2e/admin-access.spec.ts` comprueban el contrato del TD §21.7 en el build; Production (§4.1) lo confirma para las rutas alcanzables sin sesión.
- **Caché y fuga:** respuestas administrativas autenticadas con `no-store`/`private` (`tests/e2e/admin-access.spec.ts`, `admin-orders.spec.ts`, `admin-order-detail.spec.ts`); respuesta de la consulta pública `no-store` (`tests/e2e/track.spec.ts`); ni el código de seguimiento, ni PII, ni notas internas llegan a la URL, al almacenamiento del navegador ni al HTML (`tests/e2e/security.spec.ts`).

### 4.5 Privacidad (`SC-11`)

Con la orden completamente poblada, `PublicOrderView` contiene únicamente `trackingCode`, `status`, `device` (`type`, `brand`, `model`), `problemDescription`, `statusTimeline`, `repairDetails` (condicionado al estado) y `publicNotes` (`content`, `createdAt`). Ausentes: nombre, teléfono, correo, UUID, versión, ids y versiones de nota, notas internas, historiales de diagnóstico y costo, metadatos administrativos y la columna derivada de búsqueda. Verificado sobre la proyección y su serialización, la respuesta de la Server Action y el HTML. La corrección de datos (CHG-13) no amplía la superficie pública (equipo y descripción sí; nombre, teléfono y correo no).

### 4.6 Registros, secretos y errores

Pruebas con *sink* canario (incluido un error de `message` multilínea con apariencia sensible) confirman que no se registran nombres, teléfonos, correos, códigos, descripciones, diagnósticos, contenido de notas, cuerpos de acción, cookies, tokens, SQL, `error.message` ni `stack`; la interfaz solo muestra una referencia opaca. `npm run ci:secrets` no encuentra secretos en el repositorio; los secretos de Production viven solo en Vercel y en el Environment `production` de GitHub según `docs/09-deploy/PRODUCTION-ENVIRONMENT.md`.

### 4.7 Dependencias y cadena de suministro

`package-lock.json` versión 3 con 640 paquetes resueltos por HTTPS; `npm audit --audit-level=high` y `npm audit` completo: **0 vulnerabilidades**; acciones de GitHub fijadas por SHA completo y `permissions: contents: read`. Sin actualizaciones masivas: ningún riesgo reproducible lo exige.

## 5. Hallazgos

| ID | Área | Severidad | Disposición | Estado |
|---|---|---|---|---|
| SEC-001 | Limitador / fuente de IP | Medium | `Fixed` | Cerrado (retest verde) |
| SEC-002 | Cabeceras (plataforma) | Low | `Accepted Risk` | Cerrado |
| SEC-003 | Alcance de la verificación | Informational | — (observación) | No es una vulnerabilidad abierta |
| SEC-004 | Cadena de suministro | Informational | — (observación) | No es una vulnerabilidad abierta |

### SEC-001 — El sujeto del limitador no se canonicalizaba

- **Descripción:** `clientSubject` solo recortaba y pasaba a minúsculas el primer valor de `x-vercel-forwarded-for`. Una IPv6 completa se usaba tal cual como sujeto, de modo que un cliente que controla un prefijo asignado (un /64 son 2⁶⁴ direcciones) podía rotar la dirección de host y eludir tanto el límite de la consulta pública (10 fallos/10 min) como el del login (5 fallos/15 min). Cualquier cadena de hasta 64 caracteres era además un sujeto válido (cubos arbitrarios si la plataforma no sobrescribiera la cabecera).
- **Control esperado (TD §22):** «la clave del limitador no puede usar sin más la dirección IPv6 completa si eso permite eludir el límite rotando direcciones dentro del prefijo». El TD difirió la longitud del prefijo a la Spec de seguridad.
- **Severidad inicial:** Medium (debilita un control de abuso; no expone datos ni autorización, por lo que no viola `SC-11` ni `SC-12`).
- **Evidencia inicial:** revisión del código (`src/infrastructure/security/client-subject.ts` antes del cambio) y de los tres consumidores (consulta pública, login, pruebas) + §4.2.
- **Remediación (técnica, sin cambio observable):** canonicalización antes del HMAC: IPv4 decimal canónica; IPv6 → prefijo /64; IPv6 mapeada a IPv4 → esa IPv4; todo lo que no sea una IP válida → `unknown`. Decisión de seguridad registrada aquí (cierra el diferimiento del TD §22 y de CHG-06/CHG-08): **/64**, el tamaño de la red que un proveedor asigna a un único cliente; un prefijo más corto agruparía a clientes distintos y facilitaría el bloqueo cruzado.
- **Retest:** `src/infrastructure/security/client-subject.test.ts` (direcciones distintas del mismo /64 → el mismo sujeto; /64 distintos → sujetos distintos; formas comprimidas/expandidas; mapeo IPv4; entradas inválidas y basura → `unknown`; sin cubos nuevos por basura distinta) y los E2E que usan un /64 distinto por prueba para aislar el limitador (`tests/e2e/track.spec.ts`, `admin-access.spec.ts`).
- **Disposición final:** `Fixed`.

### SEC-002 — `Access-Control-Allow-Origin: *` en las páginas prerenderizadas

- **Descripción:** Vercel añade `Access-Control-Allow-Origin: *` a las respuestas prerenderizadas (`/`, `/registrar`, `/consultar`, `/admin/acceso`, 404) cuando la petición trae `Origin`. Es comportamiento de la plataforma y no se configura en la aplicación. La CORP `same-origin` de la aplicación no lo anula para peticiones en modo CORS.
- **Impacto:** un sitio ajeno puede leer el HTML de esas páginas estáticas, que es público y no contiene datos de órdenes, PII ni nonces útiles (el nonce es por petición). Las respuestas con datos (resultado de la consulta, páginas administrativas autenticadas) no son estáticas; el comodín además es incompatible con peticiones con credenciales, y la cookie de sesión es `SameSite=Strict`.
- **Severidad:** Low. No viola `SC-11` ni `SC-12`.
- **Disposición final:** `Accepted Risk` (comportamiento de plataforma, sin exposición de datos; revisar si se añade `vercel.json`/WAF en el futuro).

### SEC-003 — Verificaciones que dependen de credenciales o paneles de Production (observación)

El agente no pudo reproducir en Production: la inspección de la cookie de sesión efectiva (exige una sesión administrativa de Production), la revisión de los Runtime Logs reales (sin acceso por CLI/API), la repetición de `ops:privileges` contra la base de Production y la auditoría de variables de Vercel/Neon/GitHub (paneles). Se apoyan en: (a) la ejecución de `ops:privileges` contra Production por el propietario el 2026-10-28 sobre la migración `20261028062222_init`, cuya identidad no ha cambiado desde entonces (CHG-10…CHG-13 no añaden migraciones); (b) el mismo esquema y los mismos privilegios verificados en la rama de pruebas con las pruebas de §3; (c) la matriz de secretos y el estado verificado del propietario en `docs/09-deploy/PRODUCTION-ENVIRONMENT.md`; (d) la cookie verificada en el build de producción, que fija los mismos atributos por código sin dependencia de la plataforma. Acción opcional para el propietario si desea cerrar el círculo en Production: iniciar sesión una vez en `/admin/acceso` con el administrador de Production, inspeccionar la cookie `__Host-fixora_session` en las herramientas del navegador y revisar los Runtime Logs del último despliegue (sin PII). No modifica nada.

### SEC-004 — Dependabot no configurado (observación)

El TD §21.8 menciona «Dependabot o equivalente». No hay `.github/dependabot.yml`; el control equivalente vigente es la puerta de `npm audit` en cada PR (CHG-03) con el historial de 0 vulnerabilidades. Se deja registrado como mejora opcional, sin riesgo abierto.

## 6. Cobertura de la regresión automatizada (D12)

| Área | Pruebas |
|---|---|
| Autenticación y sesión | `tests/integration/admin-access.test.ts`, `tests/e2e/admin-access.spec.ts`, `src/application/admin/admin.test.ts`, `src/infrastructure/security/*.test.ts` |
| Autorización directa de acciones | matriz `tests/integration/support/admin-action-matrix.ts`; `src/security-static.test.ts` |
| `SC-11` | `tests/integration/tracking.test.ts`, `order-notes.test.ts`, `order-data-correction.test.ts`, `diagnosis-estimate.test.ts`; `tests/e2e/track.spec.ts`, `security.spec.ts` |
| XSS | `tests/e2e/security.spec.ts`; `src/security-static.test.ts` |
| Inyección SQL | `src/security-static.test.ts`; `tests/integration/admin-orders.test.ts` |
| CSRF | `tests/e2e/security.spec.ts` |
| Limitación e identidad del sujeto | `tests/integration/limiter.test.ts`, `src/infrastructure/security/client-subject.test.ts`, E2E de bloqueo |
| Privilegios | `tests/integration/privileges.test.ts`, `runtime-privileges.test.ts`, `zz-role-grants.test.ts` |
| CSP y cabeceras | `tests/e2e/security.spec.ts`, `public-entry.spec.ts`, `admin-access.spec.ts`; `src/infrastructure/security/admin-csp.test.ts` |
| Dependencias y secretos | `npm run ci:audit`, `npm run ci:secrets` |

## 7. Anexo — ejecución final

Regresión completa sobre el HEAD enviado a la PR (sin cambios de código ni de pruebas posteriores): `lint` y `typecheck` sin errores; 613 pruebas unitarias; cobertura de `domain/` 100 % de líneas y 97,43 % de ramas; 262 pruebas de integración sobre PostgreSQL real; 280 pruebas E2E (desktop y móvil; 4 omitidas por diseño); `build` correcto; trazabilidad 37/37 (verificado 31 · implementado 3 · parcial 2 · pendiente 1); `ci:secrets` y `ci:audit` sin hallazgos. Los criterios que siguen sin cierre no pertenecen a CHG-14: `SC-14` (parcial; cierre de integración en CHG-15), `SC-15` (parcial; revisión manual de CHG-15), `SC-20` (pendiente; smoke de release de CHG-15), y `E7`, `E8` y `E11` (implementados con su prueba en verde; su cierre como verificado corresponde a la auditoría de CHG-15, no al Security Pass).
