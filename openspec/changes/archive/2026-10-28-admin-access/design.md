# Design

## Context

CHG-08 define el contrato de acceso administrativo V1 y la base de autorización que consumirán CHG-09a, 09b, 10, 11, 12 y 13. Sigue `TECHNICAL-DESIGN.md` (§15, §16, §21.3, §21.4, §22, §23, §6) y ADR-004/ADR-007 sin reabrirlos. Consume: `ActionResult`/`runAction`/logger (CHG-01), `admin_users`, `admin_sessions`, limitador, roles y harness (CHG-02), shell, alertas y patrones (CHG-04). La materialización es solo planificación: no se instalan librerías de autenticación, no se crea ningún administrador real ni se configura Production.

## Goals / Non-Goals

**Goals:** login seguro del único administrador; sesión opaca con autoridad en PostgreSQL; `requireAdmin()` y `AdminContext` reutilizables; logout efectivo; protección contra fuerza bruta con falla cerrada; frontera operativa de aprovisionamiento.

**Non-Goals:** dashboard, listados, búsqueda, filtros, órdenes y cualquier lógica de negocio administrativa (CHG-09a en adelante); registro, recuperación o cambio de contraseña; MFA; múltiples administradores, roles, RBAC o permisos; cierre de todas las sesiones; panel de sesiones; auditoría de accesos; redefinir CSP (CHG-04/CHG-14).

## Decisions

### D1. Flujo de inicio de sesión
```text
ADM-01 /admin/acceso (contenedor de cliente)
  → Server Action adaptadora (cuerpo explícito: { email, password })
  → comprobación Origin/Host (incorporada de Next; sin allowedOrigins)
  → derivación del sujeto (IP normalizada; abstracción de infraestructura)
  → limitador (5 fallos / 15 min / bloqueo 15 min)  [antes de scrypt]
  → tope de concurrencia de scrypt (acotado)
  → verificador de credenciales (scrypt real o hash ficticio)
  → servicio de sesión: token CSPRNG 256 bits → SHA-256 → fila en admin_sessions
  → Set-Cookie (cookies() en el adaptador, fuera de runAction)
  → entrada administrativa protegida
```
Resultados tipados: `INVALID_CREDENTIALS`, `RATE_LIMITED`, `SERVICE_UNAVAILABLE` (más `INTERNAL_ERROR` transversal de CHG-01). No existen `USER_NOT_FOUND` ni `WRONG_PASSWORD`. `redirect()` y `cookies()` se ejecutan en el adaptador, nunca dentro del callback de `runAction`.

### D2. Entrada y credenciales
- Correo: el TD §15 fija expresamente que se normaliza (`trim` + minúsculas) antes de buscar y de almacenar; se mantiene esa regla (fuente: TD §15). Debe ser **simétrica** entre aprovisionamiento y login mediante **una única función compartida del lado del servidor, probada**; nunca una regla distinta en cada lado ni un cambio de mayúsculas solo en la UI. Es solo un identificador. Contraseña: **sin `trim` ni transformación**, de 15 a 128 caracteres en el aprovisionamiento; el login rechaza como `INVALID_CREDENTIALS` genérico lo vacío o de más de 128 (evita costes por cargas enormes) sin distinguir la causa y **sin mostrar nunca pistas de política** («mínimo 15 caracteres», reglas de aprovisionamiento, parámetros de `scrypt`): ADM-01 solo pide correo y contraseña. El límite superior de 128 sí protege el procesamiento. Las diferencias de normalización no deben permitir enumerar la cuenta.
- La política de 15–128 se aplica al **aprovisionamiento/rotación externos**, no hay interfaz de cambio.
- `bodySizeLimit` explícito de Server Actions bajo el predeterminado (valor final de la Spec/implementación).

### D3. Hash de contraseña
- `scrypt` asíncrono de `node:crypto` (no el síncrono), sal aleatoria y única por hash de **al menos 16 bytes** (salvo que el TD exija más; la sal no es secreta), formato **versionado y autodescriptivo** que guarda algoritmo, parámetros, longitud de clave, sal y clave derivada; comparación de tiempo constante con una primitiva de `node:crypto`, no con `===` sobre cadenas. Nunca texto claro ni cifrado reversible; no se reabren Argon2, bcrypt ni PBKDF2.
- **Parámetros: candidato inicial de referencia, no tupla final.** El TD los difiere a la Spec y exige medirlos en el runtime objetivo. Se acepta como **candidato** `N = 2^17`, `r = 8`, `p = 1` (configuración actualmente recomendada por OWASP); **no queda congelado para Production** y permanece como **PRE-IMPLEMENTATION SECURITY VALIDATION** hasta un *benchmark* real en Node 24, el runtime efectivo, la memoria efectiva, la concurrencia acotada y el objetivo de Vercel.
- **`maxmem`.** Con `N = 2^17` y `r = 8` el consumo de scrypt ronda **128 MiB**, y Node usa por defecto unos **32 MiB** de `maxmem`, rechazando la operación cuando se excede. El preflight de implementación debe validar explícitamente `N`, `r`, `p`, `maxmem`, longitud de la clave derivada, longitud de la sal, tiempo, memoria y concurrencia. No se fija ahora un `maxmem` arbitrario: debe dejar margen seguro sobre el cálculo requerido y comprobarse en el *benchmark*.
- **No se degradan los parámetros en silencio.** Si el *benchmark* demuestra que el candidato no es viable con la concurrencia y la memoria disponibles: (1) se revisan las configuraciones de scrypt recomendadas vigentes por OWASP, (2) se elige una alternativa recomendada, (3) se mide, (4) se documenta el motivo y (5) se aprueba antes de implementar. Los valores por defecto de Node no son una decisión de seguridad.
- El parser del formato rechaza cualquier hash mal formado o con parámetros fuera de límites.

### D4. Orden seguro y camino del correo inexistente
Solicitud → sujeto → limitador → (bloqueado: `RATE_LIMITED` sin ejecutar scrypt) → (no disponible: `SERVICE_UNAVAILABLE`, falla cerrada) → compuerta de capacidad de scrypt (saturada: `SERVICE_UNAVAILABLE`) → búsqueda del administrador → verificación. La falla del limitador y la falta de capacidad nunca se presentan como `INVALID_CREDENTIALS`. Para un correo inexistente (o entrada mal formada que deba tratarse como fallo genérico) se verifica igualmente contra un **hash ficticio de parámetros equivalentes**, con el mismo `INVALID_CREDENTIALS`. Esto reduce —sin afirmar eliminar— las diferencias de tiempo; no se promete igualdad exacta ni se prueba con temporización. Un fallo cuenta contra el limitador.

### D5. Tope de concurrencia de scrypt
Un tope pequeño de verificaciones simultáneas por instancia, **acotado**: sin cola ilimitada ni memoria indefinida, sin planificador complejo. Si no puede admitirse una verificación dentro del límite o la espera acotada, el resultado es `SERVICE_UNAVAILABLE`, **nunca `INVALID_CREDENTIALS`**. No es un control distribuido de seguridad (el control principal es el limitador persistente). Tamaño y espera: **PRE-IMPLEMENTATION SECURITY DETAIL**, tras medir.

### D6. Limitador
Consume la primitiva de CHG-02 (`allowed | blocked | unavailable`; política recibida como parámetro: 5 / 15 min / 15 min). La IP nunca se almacena en claro; clave `HMAC(RATE_LIMIT_HMAC_SECRET, sujeto)`; fuente `x-vercel-forwarded-for` mediante abstracción (AV-3); normalización IPv6/prefijo diferida (no se fija `/64`). Sin bloqueo permanente de la cuenta única. Los intentos válidos no cuentan como fallo; su efecto sobre un contador previo es detalle de implementación si CHG-02 no lo fija. Estados `INVALID_CREDENTIALS`, `RATE_LIMITED` y `SERVICE_UNAVAILABLE` son distintos para la UI (DESIGN §13.3 y Apéndice A.5).

### D7. Sesión
| Aspecto | Decisión |
|---|---|
| Token | 256 bits de CSPRNG; opaco: no JWT, no UUID, no objeto firmado, sin rol en la cookie |
| Persistencia | Solo `SHA-256(token)` en `token_hash` (`UNIQUE`); el token crudo nunca se persiste ni registra |
| Fila | `id`, `admin_user_id` (FK `CASCADE`), `token_hash`, `created_at`, `last_seen_at`, `expires_at`; sin IP ni user-agent |
| Inactividad / absoluta | 60 minutos / 12 horas desde el login; vigencia efectiva = la menor de ambas; sin *refresh token* ni extensión |
| `last_seen_at` | Actualización con *throttling* (frecuencia: detalle de implementación) sin permitir que la optimización extienda la sesión más allá del contrato |
| Autoridad | La fila de PostgreSQL; la cookie solo porta el token y su presencia no prueba validez |
| Múltiples sesiones | El TD no limita a una: cada login crea un token independiente; no se inventa «una sola sesión» ni se confunde con multi-admin |
| Limpieza | Oportunista (login o validación), sin cron; una fila vencida nunca es válida aunque exista físicamente |
| Fijación | Cada login emite un token nuevo; nunca se reutiliza un token previo del cliente |

### D8. Cookie
Producción: `__Host-fixora_session`, `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`, sin `Domain`. **Es una *session cookie*: el login normal no establece `Max-Age` ni `Expires`** y no hay renovación deslizante de la cookie; el deslizamiento existe solo en `last_seen` para la inactividad del servidor y nunca supera las 12 horas absolutas. La duración real de la autorización **no depende de la vida de la cookie**: PostgreSQL es la autoridad y cada autorización comprueba inactividad ≤ 60 min y antigüedad ≤ 12 h; una cookie que sigue en el navegador tras expirar la fila no concede acceso (`presencia de cookie ≠ sesión autenticada`). **Cerrar el navegador no es una frontera de seguridad** (algunos navegadores restauran cookies de sesión); el control sigue siendo la fila, los tiempos y el logout. Sin `localStorage`, `sessionStorage` ni *refresh token*. En logout se elimina la fila **y** se retira la cookie (conceptualmente `Max-Age=0` o el mecanismo correcto de Next, conservando nombre, `Path` y atributos necesarios); la invalidación en BD ocurre aunque el navegador no borre la cookie. En desarrollo local se admite un nombre/configuración compatible solo si `__Host-`/`Secure` lo exigen en `localhost`, sin degradar Production y sin formar parte de la spec.

### D9. Autorización: `requireAdmin()` y `AdminContext`
- `requireAdmin()` (`server-only`) en cada página, lectura y **Server Action administrativa**: lee la cookie → `SHA-256` → busca la fila → comprueba existencia, vigencia absoluta e inactividad → *throttling* de `last_seen_at`. Nunca `use cache`; puede deduplicarse dentro de una petición cuando el framework lo permita de forma segura. Mutación: `requireAdmin → validar entrada → caso de uso → transacción`.
- Sin sesión válida: **páginas `/admin/**`** → redirección segura a `/admin/acceso`; **acciones** → no se ejecuta y se devuelve `SESSION_EXPIRED` (código fijado por TD §16 y backlog; no se introduce `UNAUTHORIZED`; DESIGN §13.4: «Tu sesión expiró» con «Ir al inicio de sesión»); sin estado parcial. Una acción no depende de una redirección previa del layout. **Semántica uniforme:** no se distingue públicamente con códigos distintos entre cookie ausente, token mal formado o inexistente, fila eliminada, inactividad, antigüedad máxima o sesión revocada: todas significan «no existe una sesión administrativa válida» y mapean a `SESSION_EXPIRED`. Los registros internos solo distinguirían eventos si el catálogo del TD lo permite y sin revelar secretos.
- `AdminContext`: tipo opaco (*branded*) emitido solo por el módulo `server-only` de `requireAdmin()`; **defensa estructural/estática, no frontera de seguridad**: TypeScript no impide un *bypass* deliberado y la autoridad sigue siendo la comprobación runtime contra PostgreSQL. Los casos de uso exclusivamente administrativos lo reciben en su firma.
- `proxy.ts` no es fuente de autorización: solo cabeceras (CSP) o, a lo sumo, una redirección superficial. No hay RBAC, tabla de permisos ni columna de rol: «autorizado» equivale a «sesión válida».
- Conocer un UUID de orden no otorga acceso.
- Carrera: una solicitud iniciada después de la invalidación no obtiene autoridad solo por tener la cookie; una transacción ya autorizada puede terminar (TD §14.6). No se introduce OCC para sesiones.

### D10. Logout
Acción POST: `requireAdmin` opcional/tolerante → elimina la fila de sesión → borra la cookie → redirige a ADM-01. Idempotente: sin sesión válida termina en estado no autenticado seguro. Invariante: tras cerrar, ni Back/Forward ni el estado preservado de Next/React (Activity) muestran información administrativa; la técnica concreta (p. ej. respuestas no almacenables y reinicio del estado) se valida en AV-1 y se prueba con E2E. No existe «cerrar todas las sesiones».

### D11. Renderizado, CSP y CSRF
`/admin/**` es **100 % dinámico** (con `connection()` o el mecanismo vigente; leer cookies en `Suspense` no basta), sin caché compartida ni `use cache` para datos de sesión o administrativos, y con `noindex`. CSP estricta con nonce por petición generada por `proxy.ts` (TD §21.3); CHG-08 **no relaja la CSP** para que funcione el acceso: si hay incompatibilidad se detiene y se registra una decisión. El login es una mutación aunque aún no haya sesión: se aplica la comprobación Origin/Host de Next, solo POST, `SameSite=Strict` como defensa en profundidad, sin CORS ni API pública, sin `allowedOrigins` mientras sea *same-origin* normal.

### D12. Rutas y frontera con CHG-09a
Rutas del TD: acceso `/admin/acceso`; entrada protegida `/admin` (ADM-02). Sin alias (`/login`, `/signin`, `/auth`). CHG-08 entrega solo la **frontera mínima**: `/admin/acceso`, una `/admin` protegida con el shell mínimo de autenticación (marca «Panel de taller», aviso demostrativo, estado autenticado y «Cerrar sesión»/«Salir») y un contenido de marcador sin datos. **No** incluye Dashboard (conteos, recientes), listado, búsqueda, filtros, detalle ni las entradas de navegación «Dashboard»/«Listado de órdenes», que no tienen destino hasta CHG-09a. Una sesión válida que visita `/admin/acceso` puede enviarse a `/admin` sin volver a mostrar el login (**detalle de UX de implementación**, no un requirement de `admin-access`, porque DESIGN no lo exige).

### D13. UI de ADM-01
Estados: idle, enviando (botón deshabilitado para evitar dobles envíos accidentales, sin sustituir al limitador ni usar idempotencia), `INVALID_CREDENTIALS` (alerta Error genérica), `RATE_LIMITED` y `SERVICE_UNAVAILABLE` (alertas Warning distintas, DESIGN Apéndice A.5), error inesperado. Sin «recordarme», sin inicio social, sin enlace funcional de recuperación; mostrar/ocultar contraseña solo si DESIGN lo define. Nunca se muestra el correo configurado ni ayudas que revelen la cuenta.

### D14. Aprovisionamiento y rotación (script operativo externo)
`admin:provision` (backlog CHG-08, TD §26): no es endpoint ni pantalla ni parte del runtime; Node 24 nativo (si no es viable se pide aprobación antes de `tsx`). Pide la contraseña interactivamente (nunca por argumento), aplica la política 15–128, usa **el mismo hasheador y la misma función de normalización del correo** que el login, mantiene el singleton (CHG-02), muestra host y base de destino sin secretos, indica el entorno (`PRODUCTION`) y exige confirmación; nunca imprime contraseña ni hash. Al **rotar invalida todas las sesiones**. Es también el mecanismo de recuperación (`RIE-10`).

**Credencial de ejecución.** Usa una **credencial operativa privilegiada, separada del rol runtime, con el mínimo privilegio que permita administrar `admin_users` y la invalidación de sesiones requerida** (el TD habla de «acceso de migrador»/rol operativo, no exige literalmente el propietario de la base). El rol exacto se valida con CHG-02/AV-2, CHG-07 y la operación del release. **El rol runtime nunca crea administradores, rota contraseñas, recupera ni gestiona cuentas**, y no existe endpoint público de aprovisionamiento. Development/test usan credenciales ficticias; las de la demo las guarda el administrador fuera del repositorio.

CHG-08 entrega las primitivas reutilizables (política de contraseña, hasheador, formato codificado, normalización del correo); la **ejecución real en Production** es operativa/de release y se coordina con CHG-07 y CHG-15 (no se implementa en CHG-08).

### D15. Logs
Logger de CHG-01; catálogo cerrado de TD §23: `auth.login.failed`, `auth.rate_limited`, `limiter.unavailable` (nombres finales en implementación). **No** se registran inicios o cierres de sesión correctos, ausencia de sesión en producción, contraseñas, hashes (ni el ficticio), sales, claves derivadas, tokens, cookies, IP en claro, `FormData` ni el correo completo salvo lista blanca expresa. Los registros operativos no son una auditoría de accesos.

## Handoff to CHG-09a
CHG-08 entrega: establecimiento de sesión, `requireAdmin()`, `AdminContext`, protección de rutas `/admin/**`, cierre de sesión y la frontera mínima de la entrada administrativa. CHG-09a añade: datos del Dashboard, listado, búsqueda, filtro de estado, paginación y órdenes recientes, y **no rediseña la autenticación**.

## Handoff to later administrative changes
CHG-09b, 10, 11, 12 y 13: ejecutan `requireAdmin()` en cada acción, consumen `AdminContext` y el patrón `SESSION_EXPIRED`, no confían en la UI ni duplican la implementación de sesiones, y aportan su propia prueba parametrizada de acción sin sesión. **CHG-08 establece el patrón y el *harness* de pruebas** —una *matriz de autorización de acciones administrativas* (ayudante, arreglo parametrizado o fábrica de casos), **exclusivamente infraestructura de pruebas**, sin registro de acciones en el producto (ni en `domain`, `application`, base de datos o metadatos de ejecución)— para la regresión «acción administrativa invocada directamente + sin sesión → `SESSION_EXPIRED` → sin cambio de estado»; los changes posteriores añaden a ella sus propias acciones (CHG-10: transición; CHG-11: `saveDiagnosis` y `saveEstimatedCost`; CHG-12: `createNote`, `editNote` y `deleteNote`; CHG-13: `saveBasicOrderData`, o sus nombres finales). CHG-14 solo reverifica la matriz completa.

## Risks / Trade-offs

- DoS por coste de scrypt: mitigado por limitador previo, tope de concurrencia acotado y máximo de 128 caracteres.
- El hash ficticio reduce pero no elimina diferencias de tiempo observables.
- Falla cerrada reduce la disponibilidad del acceso si el limitador o la BD fallan (riesgo residual 13 del TD).
- Un único administrador es punto único de falla (`RIE-15`, aceptado); recuperación por script externo.
- La CSP con nonce depende de AV-1; sin respaldo débil automático.

## Open Questions

| ID | Pregunta | Clasificación |
|---|---|---|
| OQ-1 | Línea base de scrypt, política `Max-Age` de la cookie, código `SESSION_EXPIRED` y comportamiento de `/admin/acceso` con sesión válida | **RESUELTAS** (candidato `N=2^17, r=8, p=1` no congelado; cookie de sesión sin `Max-Age`/`Expires`; `SESSION_EXPIRED`; redirección a `/admin` como detalle de UX) |
| OQ-2 | Tupla final de scrypt, `maxmem`, *benchmark* en Node 24 / Vercel, concurrencia acotada y límite exacto de capacidad | PRE-IMPLEMENTATION SECURITY VALIDATION (el backlog la exige como entrada) |
| OQ-3 | `cookies()` y borrado en Server Actions, renderizado dinámico y caché de `/admin/**`, redirect y control de flujo, Origin/Host, CSP/nonce, logout con Back/Forward | PRE-IMPLEMENTATION AV-1 (crítico) |
| OQ-4 | Singleton, privilegios del rol runtime sobre sesiones y limitador; credencial/rol exacto del aprovisionamiento | PRE-IMPLEMENTATION AV-2 / OPERATIONS |
| OQ-5 | Cadencia de `last_seen_at`; limpieza de sesiones vencidas; nombre de cookie en `localhost`; mecánica exacta de la redirección; varias sesiones simultáneas (el TD no las limita) | IMPLEMENTATION DETAIL |
| OQ-6 | Normalización de IPv6 / prefijo del sujeto del limitador | SECURITY IMPLEMENTATION DETAIL (diferida por TD §22) |
| OQ-7 | Aprovisionamiento y recuperación del administrador en Production | OPERATIONAL / RELEASE (CHG-07, CHG-15) |

La canonicalización del correo está **fijada por TD §15** (`trim` + minúsculas); su implementación debe ser simétrica entre aprovisionamiento y login. Ninguna pregunta es BLOCKING.

## Pruebas planificadas

**Unitarias:** codificación y parser del hash versionado; verificación de contraseña (correcta, incorrecta, hash mal formado); camino del hash ficticio; cálculo de expiración (inactividad frente a absoluta); mapeo de resultados de autenticación; opciones de cookie si son un helper puro; fronteras puras del limitador. Sin simular la criptografía hasta volverla inútil.

**Integración (PostgreSQL real, sin mocks de Prisma):** login válido; contraseña incorrecta y correo inexistente con la misma clasificación pública y recorriendo la verificación; solo el hash SHA-256 persiste y el token crudo no; expiración por inactividad y absoluta; sesión eliminada; logout elimina la fila; limitador (5 fallos / 15 min, bloqueo de 15 min, falla cerrada); saturación del tope → `SERVICE_UNAVAILABLE`; privilegios; supuestos del singleton de CHG-02; prueba parametrizada de que el guard de acción devuelve `SESSION_EXPIRED` sin ejecutar. No hay una prueba de igualdad exacta de tiempos.

**Playwright (`chromium-desktop`/`chromium-mobile`):** `/admin/acceso` carga; credenciales inválidas y cuenta desconocida indistinguibles; `RATE_LIMITED`; login correcto y entrada protegida; URL administrativa directa sin sesión rechazada; cierre de sesión; Back/Forward tras cerrar no recupera contenido; teclado y accesibilidad básica; sin dashboard funcional.

**`SC-12` (evidencia negativa, owner principal):** acceso directo sin cookie; cookie inventada; token inexistente; token expirado; fila de sesión eliminada: ninguno accede. **Cookie:** `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/` y sin `Domain` se comprueban por la cabecera `Set-Cookie`, no leyéndola desde JS. **Acción sin sesión:** CHG-08 prueba el guard en integración sin crear una mutación de depuración; la prueba específica de cada acción real la aporta el change que la cree.

**Trazabilidad:** `SC-12` (núcleo), `E10`, `SC-03` (parcial); `TRACEABILITY.md` se actualiza al implementar.
