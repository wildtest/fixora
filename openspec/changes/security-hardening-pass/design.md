# Design

## Context

CHG-14 es un change de **calidad** (`SKIP_SPECS`) que planifica el Security Pass formal (`SC-18`) y el endurecimiento técnico asociado. Sigue `TECHNICAL-DESIGN.md` §21–§25, §27 y §29, ADR-004, 005, 007, 008, 009 y 010, y `docs/04-planificacion/BACKLOG.md` (CHG-14) sin reabrirlos. **Verifica y endurece; no es dueño funcional de ningún control.** Los controles viven en sus changes dueños: logger y `runAction` (CHG-01), roles y privilegios (CHG-02), CI, auditoría y detección de secretos (CHG-03), proyección y limitador de consulta pública (CHG-06), entorno y migraciones de Production (CHG-07), sesiones, cookie y limitador de login (CHG-08), terminalidad y concurrencia (CHG-10), congelamiento y publicación (CHG-11), notas (CHG-12) y corrección de datos (CHG-13). Este documento es una **planificación**: ninguna verificación se ha ejecutado, no existe ningún hallazgo y no se afirma que ningún control funcione en Production.

## Goals / Non-Goals

**Goals:** un Security Pass reproducible y con evidencia sobre el sistema construido y el despliegue real; reverificación fuerte de `SC-11` y `SC-12`; clasificación, remediación y retest de hallazgos; un informe formal; revisión de la cobertura de regresión automatizada.

**Non-Goals:** nuevas funcionalidades o controles observables; pruebas de carga, estrés, DDoS o benchmark; escáneres sin análisis ni listas genéricas de «buenas prácticas»; rediseño anti-spam del registro (`E13`); rediseño de despliegue o de observabilidad; Auth0, Clerk, WAF obligatorio, Redis, Sentry, OTel, SIEM, CAPTCHA, MFA, OAuth ni nueva pila de observabilidad (fuera de V1); AV-4.

## Decisions

### D1. Frontera «sin cambio de comportamiento»
CHG-14 solo puede cambiar lo que **preserva el comportamiento observable**: cabeceras o configuración faltantes, ampliación de la lista de permitidos del logger, un `GRANT` excesivo, una CSP mal configurada, un secreto expuesto en el entorno equivocado, configuración de Preview, pruebas de regresión que faltan para un control ya aprobado. Si una corrección cambia lo que el usuario observa (comportamiento, contrato, capability, errores visibles, campos públicos, autenticación, limitación observable, flujo), **no se implementa en CHG-14** (ver D14).

### D2. Metodología
Reproducible y basada en los controles reales de FIXORA: cada comprobación referencia un control con dueño (D3), un procedimiento (prueba, consulta, captura de cabeceras, revisión de configuración o de logs) y un resultado esperado derivado de las fuentes. Sin hallazgos inventados, sin listas copiadas ajenas al producto y sin escáneres sin análisis. Se ejecuta **contra el despliegue real** para todo lo que dependa de Vercel/Neon/GitHub; `next start` local no basta para afirmar seguridad de Production. Datos de prueba ficticios; sin tráfico agresivo.

### D3. Inventario de controles (dueño → verificación)
| Control | Dueño | Qué comprueba CHG-14 |
|---|---|---|
| Logger cerrado, `runAction`, referencia opaca | CHG-01 | sin PII, códigos, SQL, `message`/`stack` en pruebas y en logs reales |
| Roles, privilegios, historiales *append-only* | CHG-02 | privilegios efectivos del rol runtime en el despliegue |
| CI, `npm audit`, detección de secretos, acciones fijadas por SHA | CHG-03 | resultados y su análisis |
| Proyección pública, limitador, anti-enumeración | CHG-06 (y 10/11/12/13 por extensión) | `SC-11` con orden poblada; respuesta uniforme; falla cerrada |
| Entorno, migración, aislamiento de Preview | CHG-07 | cadena de migración, secretos por entorno, Preview sin BD |
| Sesión, cookie, `requireAdmin`, limitador de login | CHG-08 | `SC-12`; cookie efectiva; login |
| Acciones administrativas | CHG-10/11/12/13 | cada acción sin sesión → sin escritura |

### D4. Revisión de `SC-11` (privacidad)
Evidencia de máxima prioridad: una **orden completamente poblada** (nombre, teléfono, correo, equipo, descripción, diagnóstico, costo, notas `PUBLIC` e `INTERNAL`, los tres historiales) demuestra que la proyección pública expone **solo** lo autorizado. No se acepta una orden vacía como única evidencia. `PublicOrderView` no contiene nombre, teléfono, correo, UUID interno, versión de la orden, ids ni versiones de nota, notas internas, historiales de diagnóstico o costo ni metadatos administrativos. Se verifica el **contrato/proyección y la serialización**, no solo el DOM. Publicación del diagnóstico: antes de la aprobación no se carga diagnóstico ni costo públicamente; cancelada antes de la aprobación no hay `repairDetails`; en espera de aprobación son visibles; cancelada después de la aprobación siguen visibles. Notas: la consulta pública obtiene `PUBLIC`, no carga ni serializa `INTERNAL` (valor canario).

### D5. Revisión de `SC-12` (autorización)
- **Páginas:** `/admin/**` sin sesión, un UUID administrativo conocido sin sesión, acceso directo a ADM-04, panel y directorio: ninguna lectura entrega datos.
- **Server Actions:** invocación directa **sin sesión** de transición, diagnóstico, costo, crear/editar/eliminar nota y corrección de datos básicos: `SESSION_EXPIRED` (o el mecanismo aprobado) y ninguna escritura. Idealmente una prueba parametrizada recorre **todas** las acciones administrativas (incluidas las de CHG-10, 11, 12 y 13).
- **Sesión:** expiración por inactividad (60 min) y absoluta (12 h), sesión revocada, cierre de sesión y Back/Forward tras cerrarla; no se confía en ocultar la UI.

### D6. Seguridad del navegador y la aplicación
- **XSS almacenado:** valores canario como texto (`<script>…</script>`, `<img onerror>`) en descripción, diagnóstico, nota pública, nota interna y campos del cliente: se muestran como texto y nunca se ejecutan. Sin biblioteca de saneamiento (el producto no interpreta HTML).
- **HTML crudo:** auditoría de `dangerouslySetInnerHTML`, `eval`, `new Function` y APIs inseguras; una aparición se investiga con su contexto antes de clasificarla.
- **CSRF/Origin:** POST entre orígenes contra acciones sensibles; comprobación `Origin`/`Host` de Next y `SameSite=Strict` como defensa en profundidad; sin token CSRF propio ni CORS.
- **SQL:** búsqueda por nombre (escape de `%`, `_`, `\`), código exacto, el SQL crudo acotado del bloqueo de fila y toda consulta privilegiada: parametrizado, localizado y justificado; sin concatenación.
- **CSP:** pública = base estática del TD (sin orígenes de terceros, `object-src 'none'`, `base-uri 'none'`, `form-action 'self'`, `frame-ancestors 'none'`; `unsafe-inline` solo si el *shell* estático lo requiere); `/admin/**` = nonce real por petición, árbol dinámico, sin `unsafe-eval` ni debilitamientos inesperados. Se registran la política enviada, scripts, estilos, restricciones de marcos y las directivas inseguras realmente presentes. No se endurece por encima del baseline si rompe Cache Components.
- **Cabeceras:** exactamente las del TD §21.7 (`X-Content-Type-Options`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`/`Cross-Origin-Resource-Policy`, sin `X-Powered-By`, HSTS efectivo de Vercel sin duplicar), en build y en Production.
- **Caché y fuga:** `/admin/**` sin caché compartida; datos sensibles de órdenes no estáticos; sin código de seguimiento, texto de búsqueda de cliente, token de sesión, correo ni otra PII en la URL (el filtro de estado sí puede estar en la URL); `robots` según TD; sin almacenamiento en `localStorage`/`sessionStorage` de códigos, PII ni secretos de sesión (salvo el mecanismo aprobado de idempotencia del registro, con sus límites, sin ampliarlo).

### D7. Autenticación, sesión y abuso
- **Cookie (en Production, inspeccionando la respuesta real):** `__Host-fixora_session`, `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`, sin `Domain`, sesión sin `Max-Age`; no se infiere desde el código.
- **Login:** correo desconocido y contraseña errónea con el mismo error externo; limitador consultado antes de `scrypt`; bloqueado ⇒ sin `scrypt`; fallo de capacidad ⇒ `SERVICE_UNAVAILABLE`; sin enumeración evidente; sin contraseña en logs.
- **Consulta pública:** formato inválido e inexistente con el mismo comportamiento externo; limitador efectivo (10 fallos/10 min → bloqueo de 15 min); **falla cerrada**; sin IP en claro almacenada (clave HMAC).
- **Limitadores:** solo se verifican los de consulta y login. **No** se añade limitador al registro (`E13`) ni se rediseña el antispam. Sin pruebas de carga.

### D8. Registros, secretos y errores
- **Logger:** `server-only`, estructurado, esquema cerrado; sin `console.log(formData)` ni `console.error(error)` en rutas de producción. Dos fuentes de evidencia: pruebas con *sink* canario (incluido un error con `message` multilínea y valores de apariencia sensible, que no se copian) y **revisión de los logs reales** del despliegue. No deben aparecer nombre, teléfono, correo, código de seguimiento, descripción, diagnóstico, contenido de nota, cuerpo de acción, cookies, tokens, SQL, `error.message` ni `stack`. Errores desconocidos se clasifican con un código seguro. La interfaz muestra solo una **referencia opaca** (nunca UUID de orden, código, correo ni id de sesión).
- **Secretos:** repositorio, salida del build cuando proceda, configuración de GitHub Actions y mapeo de variables de Vercel; no se exponen `DATABASE_URL`, `DIRECT_URL`, `RATE_LIMIT_HMAC_SECRET` ni credenciales de administrador/migración. Se consumen los resultados de la detección de secretos definida en CHG-03; no se introduce otra herramienta.

### D9. Base de datos
Con consultas seguras sobre el despliegue: el rol runtime **no** puede `DELETE` en `repair_orders`, `UPDATE`/`DELETE` en los historiales ni `UPDATE` en `admin_users`, y tiene solo lo necesario (TD §11); los historiales son *append-only* por privilegios, no por convención. `DELETE` en `order_notes` está permitido por el modelo V1: no es hallazgo por sí mismo, solo se audita que el permiso esté acotado al modelo aprobado. `DIRECT_URL` solo donde corresponde y no disponible en el runtime de Vercel; sin migración en *build*/*start*/Preview.

### D10. Despliegue, Preview y migración
Preview sin acceso a la base de Production ni secretos privilegiados (estrategia P1); flujo de migración de CHG-07 (solo `main`, aprobación/entorno, vinculación al SHA, integridad del árbol de migraciones, sin scripts arbitrarios, mínimo privilegio). Las verificaciones dependientes de Vercel se hacen en Vercel. **Los resultados de AV-3 son prerrequisito** (`x-vercel-forwarded-for`, variables inyectadas, capacidades de plataforma): CHG-14 no se cierra en la Fase 7 sin ellos. Este change no rediseña el despliegue.

### D11. Cadena de suministro
Revisión del `package-lock.json`, las dependencias de producción instaladas y `npm audit --audit-level=high` (u otro mecanismo aprobado). Un resultado del escáner **no** equivale a una vulnerabilidad explotable: cada hallazgo se evalúa, clasifica y dispone; ningún Critical/High aplicable queda abierto.

### D12. Regresión automatizada frente al Security Pass
Complementarios. La regresión de CI se ejecuta continuamente; el Security Pass es la actividad formal separada. Se **revisa la cobertura** automatizada de: autenticación/sesión, autorización directa de acciones, `SC-11`, XSS, inyección SQL, CSRF, limitación, privilegios, CSP/cabeceras, auditoría de dependencias y detección de secretos. Si falta una prueba para un control ya aprobado, puede añadirse como endurecimiento técnico sin comportamiento nuevo.

### D13. Modelo de hallazgos
- **ID estable:** `SEC-001`, `SEC-002`… (sin sistema externo de tickets).
- **Campos mínimos:** ID, área, descripción, severidad, evidencia, impacto, control esperado, disposición, ruta de remediación y responsable, estado, evidencia de retest y, cuando corresponda, la aceptación documentada.
- **Severidad:** `Critical`, `High`, `Medium`, `Low`; `Informational` solo como observación explícita que **no** es una vulnerabilidad abierta. Sin CVSS obligatorio. La rúbrica detallada es detalle de implementación.
- **Disposiciones finales (al cerrar el Pass, cada hallazgo real tiene exactamente una):** `Fixed` (corrección implementada y reevaluada en el retest); `Mitigated` (solo si las fuentes lo permiten: mitigación **realmente aplicada**, con evidencia y retest; «mitigación planificada» no es una disposición); `Accepted Risk` (solo `Medium`/`Low`, que no violen `SC-11` ni `SC-12`, con justificación explícita; no hace falta inventar un change correctivo para evitar una aceptación permitida); `Not Applicable` (con justificación y evidencia). `Informational` es una observación, no una vulnerabilidad abierta. Critical/High no pueden terminar `Accepted Risk` ni diferidos: deben quedar corregidos o mitigados de verdad, reevaluados y cerrados; si una mitigación deja el hallazgo todavía como Critical/High bajo la clasificación final aplicable, la puerta sigue fallando. Todo hallazgo de `SC-11`/`SC-12` sigue `FIX → RETEST → CLOSE`, cualquiera sea su severidad.
- **Estado transitorio (no es una disposición):** `Corrective change required` (nombres equivalentes) significa que el hallazgo **sigue abierto**: `OPEN → CORRECTIVE_CHANGE_REQUIRED → REMEDIATING → RETEST_REQUIRED → CLOSED`. **`Deferred to corrective change` no es una disposición final válida y no permite cerrar CHG-14.** Medium/Low que exijan un cambio observable también abren un change correctivo y terminan `Fixed` (o la disposición final permitida) tras el retest.
- **Ciclo general (o equivalente):** `OPEN → REMEDIATING → FIXED → RETESTED → CLOSED`. `change correctivo creado ≠ hallazgo corregido` y `change correctivo archivado ≠ hallazgo reevaluado`: se exige la evidencia del retest del Security Pass.
- **Registro del hallazgo:** conserva ID, severidad inicial, evidencia inicial, change correctivo (si existió), remediación, evidencia del retest, disposición final y estado final; el hallazgo original no se borra tras corregirlo.
- **Evidencia reproducible y saneada:** prueba, salida de comando, captura saneada, captura de cabeceras, comprobación de privilegios, evidencia de configuración o revisión de logs; con datos ficticios y sin secretos, tokens, códigos reales ni PII.

### D14. Enrutamiento de remediación
- **Técnica (dentro de CHG-14):** preserva el comportamiento observable y solo endurece una implementación existente, respetando la arquitectura.
- **Observable (change correctivo):** si cambia comportamiento, contrato, capability, errores visibles, campos públicos, autenticación, limitación observable o flujo, **no se implementa en silencio dentro de CHG-14** ni se convierte CHG-14 en DELTA SPECS ni se inventan requisitos dentro de él. Se abre después un **nuevo change correctivo funcional** (el hallazgo queda en el estado transitorio `Corrective change required`, abierto) con delta specs sobre la capability afectada, trazable al hallazgo (ID, capability, retest pendiente, resultado). Si el dueño original ya está archivado: no se desarchiva, no se edita el historial ni se modifica el change viejo.
- **CHG-14 queda bloqueado hasta el retest:** hallazgo detectado → change correctivo creado → implementado → corrección verificada → retest del Pass → hallazgo cerrado (`Fixed`). Aunque CHG-14 siga siendo `SKIP_SPECS`, espera esa resolución.

### D15. Informe
Se genera en la Fase 7 en `docs/08-seguridad/` (nombre sugerido `SECURITY-REPORT.md`; el nombre exacto es detalle de implementación y la fase de Seguridad fija la escala y el formato). **No se crea ahora ningún informe ni hallazgo.**

### D16. Puerta de salida
Para cerrar CHG-14: **Critical abiertos = 0; High abiertos = 0**, sin excepciones; **hallazgos de `SC-11` abiertos = 0 y de `SC-12` = 0**; todo hallazgo real con una disposición final explícita de D13 (ninguno `Deferred` ni en estado transitorio); correctivos implementados, verificados y reevaluados; resultados de AV-3 disponibles; evidencia saneada; M4 implementada y Production disponible.

## Traspasos

- **CHG-15:** consume el informe como evidencia del release; el smoke funcional, la semilla de demostración y los runbooks restantes no son de CHG-14.
- **Fase 6.5:** `SC-18` queda planificado aquí; CHG-14 no es dueño de ningún control.

## Risks / Trade-offs

- **Hallazgos tardíos** (riesgo Medio del backlog): un hallazgo observable obliga a un change correctivo y retrasa el cierre.
- **Cobertura de plataforma:** algunas verificaciones solo son posibles en Vercel/Neon/GitHub reales (AV-3).
- **Retención efímera de logs:** los Runtime Logs de Vercel dependen del plan; la revisión de logs debe hacerse con la retención disponible.
- **Falsa sensación de seguridad por escáneres:** mitigada exigiendo análisis y evidencia por hallazgo.

## Open Questions

| ID | Pregunta | Clasificación |
|---|---|---|
| OQ-1 | Ninguna bloqueante para materializar | — |
| OQ-2 | M4 implementada y verificada; Production disponible; CHG-07 operativo; resultados de AV-3 | PRE-EXECUTION |
| OQ-3 | Nombre exacto del informe, rúbrica de severidad detallada, formato de evidencia y comandos concretos del Pass | IMPLEMENTATION DETAIL |
| OQ-4 | Cualquier hallazgo que exija modificar comportamiento observable | CORRECTIVE-CHANGE TRIGGER |
| OQ-5 | Escala de severidad y formato del Security Report que el PRD delega a la fase de Seguridad | DEFERRED a la Fase 7 (documentos de `docs/08-seguridad/`) |
| OQ-6 | Ciclo y disposición de los hallazgos que requieren change correctivo | **RESUELTA** (estado transitorio abierto; `Deferred` no es disposición final) |

No se crea AV-4.

## Pruebas planificadas

No hay pruebas de comportamiento nuevas. Se planifican: la revisión de cobertura de la regresión automatizada (D12), pruebas de endurecimiento para controles ya aprobados que carezcan de ellas, y la **ejecución del Security Pass en la Fase 7** descrita en D4–D11 con su retest. **Contribución:** dueño de `SC-18`; reverificación de `SC-11` y `SC-12`; revisión de `RIE-01`. `TRACEABILITY.md` y `docs/08-seguridad/` se actualizan al ejecutar.
