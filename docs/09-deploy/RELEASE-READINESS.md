# Evidencia de release y decisión — FIXORA V1

> Registro de CHG-15 `release-readiness` (D3, D9–D11, D14, D17–D19). Reúne y enlaza la evidencia; **no** duplica la trazabilidad (`docs/07-testing/TRACEABILITY.md`) ni repite el Security Pass (`docs/08-seguridad/SECURITY-REPORT.md`). Sin secretos, tokens, códigos de seguimiento reales ni PII. Fecha de la evidencia: 2026-10-29 · `main` `24771af` (CHG-01…CHG-14 archivados) más la PR de CHG-15 (solo documentación, `seed:demo`, smoke y runbooks).

## 1. Decisión de release

| Estado | Condición |
|---|---|
| **LISTO PARA EVALUACIÓN ACADÉMICA / DEMO** | todas las puertas de §2 en PASS |
| **NO LISTO** | cualquier puerta en FAIL o pendiente |

**Estado actual (2026-10-29): LISTO PARA EVALUACIÓN ACADÉMICA / DEMO** — las 12 puertas de §2 están en PASS; el propietario cerró en Production el smoke con la orden demo y el flujo manual de cierre (§3). FIXORA V1 está funcionalmente completa (M0…M5) y desplegada como demostración pública. **Esta decisión nunca equivale a «aprobado para operación real»**: `VAL-04` sigue abierta y es prerrequisito de cualquier uso operacional real (§6).

## 2. Puertas de release (D3)

| # | Puerta | Resultado | Evidencia |
|---|---|---|---|
| 1 | Código y CI en verde | **PASS** | PR #12, #13 y #14: checks `static` y `db-tests` en verde; regresión local completa de CHG-15 (§4) |
| 2 | Migraciones: Production al esquema esperado | **PASS** | única migración `20261028062222_init`, aplicada por el workflow `migrate-production` con aprobación (run 40757447307); CHG-10…CHG-15 no añaden migraciones (`prisma/migrations` sin cambios desde entonces) |
| 3 | Seguridad: CHG-14 cerrado | **PASS** | 0 Critical, 0 High, `SC-11` y `SC-12` sin hallazgos abiertos (`SECURITY-REPORT.md`) |
| 4 | AV-3 disponible | **PASS** | variables inyectadas y conexión como `fixora_app` (CHG-07) y fuente de IP real (`SECURITY-REPORT.md` §4.2) |
| 5 | `SC-14`, `SC-15`, `SC-17`, `SC-19` | **PASS** | `TRACEABILITY.md` (verificado) y `SC-15-RESPONSIVE-REVIEW.md` |
| 5 | `SC-20` (despliegue público de demostración) | **PASS** | smoke de Production 16/16 en verde **con** la orden demo y flujo manual de cierre (§3) |
| 6 | `TRACEABILITY.md` completo | **PASS** | 37/37 identificadores con dueño, evidencia y estado: **37 verificados**, 0 pendientes |
| 7 | *Seed* ficticio y aviso de demostración | **PASS** | `npm run seed:demo` (§5) ensayado en `development`; aviso visible en Production (smoke) |
| 8 | Runbooks RB-1…RB-9 y *break-glass* | **PASS** | `RUNBOOKS.md`; *break-glass* ensayado en `development` con `ROLLBACK` |
| 9 | Plan de retiro de la demo | **PASS** | §7 |
| 10 | Riesgos residuales y `VAL-04` explícitos | **PASS** | §6 |
| 11 | Flujo manual de cierre ejecutado con datos ficticios | **PASS** | §3 (administrador de Production, orden demo ficticia) |

## 3. Cierre en Production (ejecutado por el propietario, datos ficticios)

El agente no registra datos persistentes en Production ni inicia sesión (no dispone de sus credenciales; esas acciones requieren al propietario, y el control de permisos de la herramienta las denegó al agente). El propietario ejecutó el 2026-10-29, con datos ficticios y sin modificar nada existente, y comunicó el resultado; esta sección registra la evidencia **saneada** (sin códigos de seguimiento, contraseñas, tokens, cookies, URL de conexión ni PII).

| Paso | Resultado |
|---|---|
| Administrador de Production (`admin:provision` contra la rama Neon `main` con la conexión del propietario como variable temporal de sesión) | **OK**: administrador creado en `main`; el singleton se mantiene |
| Inicio de sesión del administrador en `/admin/acceso` de Production | **OK** |
| Orden demo ficticia registrada por la interfaz pública de Production («DEMO FIXORA Production»); código guardado fuera del repositorio | **OK** |
| `SMOKE_BASE_URL=<Production> SMOKE_TRACKING_CODE=<código> npm run test:smoke` | **16/16 PASS** (la consulta de la orden demo deja de omitirse) |
| Flujo D11: transición *Solicitud recibida → Equipo recibido* con el administrador de Production | **OK** |
| Consulta pública del código en `/consultar` refleja *Equipo recibido* | **OK** |
| Cookie `__Host-fixora_session` inspeccionada en el navegador | `HttpOnly` sí · `Secure` sí · `SameSite=Strict` · `Path=/` · sin `Domain` explícito |
| Runtime Logs de Vercel del despliegue vigente revisados | sin contraseñas, sin tokens ni cookies de sesión, sin secretos de configuración, sin PII innecesaria, sin contenido sensible |

**Nota de operación (lección registrada).** El primer intento de aprovisionar el administrador escribió en `development`: `--environment` es solo una etiqueta y la conexión sale de `DIRECT_URL`, que `.env.local` fija a `development`; el destino impreso oculta el identificador del endpoint y no distingue ramas. Se corrigió ejecutando el provisioning con la `DIRECT_URL` de `main` como variable temporal de la sesión, verificando antes el host y limpiándola después (`RUNBOOKS.md` §4). El administrador de `development` es legítimo y puede permanecer. Mejora opcional futura: una comprobación explícita del endpoint esperado en el script.

La orden demo permanece en Production como dato ficticio; el plan de retiro (§7) la cubre. `SEC-003` queda cerrada con esta evidencia (`SECURITY-REPORT.md`).

## 4. Regresión final

La regresión completa se ejecutó sobre el HEAD enviado a la PR de CHG-15 (sin cambios de código ni de pruebas posteriores; solo documentación): `lint` y `typecheck` sin errores; **613** pruebas unitarias; cobertura de `domain/` **100 %** de líneas y **97,43 %** de ramas; **262** pruebas de integración sobre PostgreSQL real; **280** pruebas E2E (escritorio y móvil; 4 omitidas por diseño); `build` correcto; trazabilidad 37/37 (**36** verificados · **1** pendiente: `SC-20`); `ci:secrets` y `ci:audit` sin hallazgos. El cierre de §3 no modifica código ni pruebas (solo documentación, trazabilidad y estado), por lo que esta regresión sigue siendo la del HEAD final de código; la trazabilidad se revalidó con `npm run test:trace` (37/37 verificados) tras cerrar `SC-20`.

## 5. *Seed* ficticio (`seed:demo`)

`npm run seed:demo` crea cuatro órdenes **exclusivamente ficticias** («DEMO FIXORA 1…4», teléfonos `+51 900 000 00x`, marca «MarcaDemo») que muestran los estados Solicitud recibida, En diagnóstico, Esperando aprobación (con diagnóstico, costo y nota pública) y Listo para recojo, **mediante los casos de uso y reglas reales** (registro público, transiciones, diagnóstico, costo y notas) con el rol de aplicación.

- No es un *fixture* de pruebas (proyecto `seed` de Vitest, fuera de `unit` e `integration`; **no** corre en CI, build, arranque, migraciones ni despliegues) y está prohibido contra la rama `test`.
- Exige `SEED_DEMO_CONFIRM=DEVELOPMENT|PRODUCTION`; muestra el destino con el endpoint oculto; sin la confirmación **se omite**.
- Sin credenciales, sin contraseña de administrador y sin códigos fijos: los códigos son los normales y **no se imprimen**; con `SEED_DEMO_SMOKE_CODE_FILE=<ruta fuera del repositorio>` se escribe el código de la orden «Aprobación» para `SMOKE_TRACKING_CODE`.
- **Segunda carga:** se niega si ya existe alguna orden «DEMO FIXORA…» (no sobrescribe ni borra).
- Ensayo: en `development` creó 4 órdenes, omitió la ejecución sin confirmación y rechazó una segunda carga. En Production, la orden demo del §3 se registra por la interfaz pública (equivalente al registro real) porque el seed requiere la credencial del rol de aplicación de Production, que solo vive en Vercel.

## 6. Riesgos residuales aceptados (D17) y `VAL-04` (D18)

No se afirma riesgo cero. Se toman del TD §27 y del PRD:

1. Sin copias de seguridad propias: dependencia de la ventana de restauración de Neon (plan Free, 6 h); sin SLA, RPO ni RTO.
2. El código de seguimiento no se puede rotar (`E17`).
3. Logs efímeros y sin auditoría: los Runtime Logs de Vercel dependen del plan; los historiales de estado, diagnóstico y costo no son una auditoría de accesos.
4. La demo puede recibir **datos reales** pese al aviso (`RIE-20`); V1 no elimina órdenes (`RIE-03`): remediación por RB-6 / *break-glass* o retiro.
5. El registro no tiene anti-spam (`E13`, `RIE-11`).
6. Administrador único (`RIE-15`); la autoaprobación del Environment `production` (una sola persona mantenedora).
7. Arranque en frío de Neon y disponibilidad reducida cuando el limitador falla cerrado.
8. Credenciales de Marketplace/Neon; Preview no es un entorno de aceptación (no tiene base de datos).
9. Rollback de aplicación limitado por plan y esquema; paginación por *offset*; dependencia de JavaScript; riesgo operativo del *break-glass*.
10. Observaciones de seguridad: `SEC-002` (Access-Control-Allow-Origin de plataforma en páginas estáticas) aceptado; `SEC-003` (verificaciones de Production por el propietario) y `SEC-004` (Dependabot) informativas.

**`VAL-04` permanece ABIERTA y es prerrequisito de cualquier uso operacional real.** No bloquea la evaluación académica ni la demostración de V1. Esta evidencia **no** afirma «aprobado para operación real», «listo para clientes», «certificado seguro» ni cumplimiento legal o regulatorio (GDPR, legislación peruana).

## 7. Plan de retiro de la demo (D14)

**Disparador operativo:** fin de la evaluación del proyecto, o cuando la demo deje de ser necesaria (sin fecha inventada). **No** se afirma que Production contenga solo datos ficticios: pudo recibir datos reales (`RIE-20`); solo lo que el proyecto crea (seed, órdenes demo, evidencia) es ficticio.

Checklist, en este orden:

1. Retirar el acceso público: en Vercel, pausar o eliminar el despliegue de Production (o eliminar el proyecto) y retirar el dominio.
2. Datos: antes de eliminar, decidir si se conserva una copia; luego eliminar el proyecto/rama de Neon `main` y las ramas `pre-release-*`. Si hubo datos personales reales, tratarlos según RB-6 y la ventana de restauración del proveedor (las copias del proveedor expiran; no se afirma borrado inmediato).
3. Secretos y variables: eliminar de Vercel `DATABASE_URL` y `RATE_LIMIT_HMAC_SECRET`; del Environment `production` de GitHub, `DIRECT_URL`; el secreto `SMOKE_TRACKING_CODE` si se definió; revocar el rol `fixora_app`.
4. Recursos innecesarios: integración de Marketplace de Neon, Environment `production`, ramas temporales y reglas de la rama `main` que ya no apliquen.
5. Registrar el retiro (fecha, qué se eliminó y qué se conservó).

## 8. Operación mínima (D15) y recuperación

- **Observabilidad:** logger propio de esquema cerrado (sin PII), Runtime Logs de Vercel, señales nativas de Neon/Vercel/GitHub y smoke de Production; suficiente para la demo aprobada. Sin Sentry, analíticas, OTel ni monitor externo.
- **Recuperación documentada y vigente:** *Instant Rollback* de Vercel (probado en CHG-07: rollback + *Promote*); ventana de restauración de Neon de 6 h y rama de recuperación `pre-release-*` del procedimiento de migración; runbooks RB-1…RB-9 (`RUNBOOKS.md`). Este change **no** repitió un rollback real.
- **Despliegue de Production verificado:** `main` `24771af` desplegado por la integración Git de Vercel (estado «Deployment has completed», región `gru1` en la respuesta de Production). La configuración de Vercel (rama `main`, Node 24.x, `npm ci`, sin autenticación de plataforma, variables solo en Production) y la de Neon (proyecto `fixora-db`, rama `main`, rol `fixora_app`) se apoyan en la evidencia del propietario de CHG-07 (`PRODUCTION-ENVIRONMENT.md`); el agente no tiene acceso a esos paneles.

## 9. Resultado de la regresión final y del smoke

Smoke de Production del 2026-10-29 contra la URL pública (`main` `24771af`): **14 pruebas en verde y 2 omitidas** sin `SMOKE_TRACKING_CODE`; con la orden demo registrada por el propietario el mismo smoke dio **16/16 PASS** (§3). Cubre HTTPS y landing, aviso de demostración, `/registrar` y `/consultar`, 404 sin detalles técnicos, cabeceras de seguridad, indexación y ausencia de login de plataforma, y `/admin/**` sin sesión sin contenido administrativo (redirección, acceso `noindex` y CSP con *nonce*). Ensayo de las pruebas nuevas contra una instancia local: la consulta de la orden demo y `/admin/**` en verde; las cuatro comprobaciones exclusivas de HTTPS/HSTS fallan como se espera fuera de Production.
