# Línea base de Production

> Registro operativo de CHG-07 `production-environment-baseline`. Las decisiones están en `openspec/changes/production-environment-baseline/design.md`. **Sin credenciales, URL de conexión ni identificadores de recurso.**

## Topología (D1)

| Entorno | Aplicación | Base de datos | Credenciales |
|---|---|---|---|
| Local | desarrollo | rama Neon `development` | rol de aplicación y propietario de **development**; nunca Production |
| CI `test` | pruebas (CHG-03) | rama Neon `test` | `TEST_DATABASE_URL`, `TEST_DIRECT_URL`, `RATE_LIMIT_HMAC_SECRET` de test; Environment GitHub `test` |
| Vercel Preview | previsualización | **ninguna (V1)** | sin credenciales de BD ni de Production |
| Vercel Production | demo pública | rama Neon `main` | solo runtime: rol `fixora_app`, conexión *pooled* |
| Workflow `migrate-production` | sin runtime de la aplicación | Neon `main`, conexión directa | solo migración: rol migrador; Environment GitHub `production` |

## Matriz de secretos (D4)

| Secreto | Local | CI test | Preview | Vercel Production | `migrate-production` |
|---|---|---|---|---|---|
| `DATABASE_URL` Production (*pooled*, `fixora_app`) | no | no | **no** | **sí** | no |
| `DIRECT_URL` Production (migrador, directa) | no | no | **no** | **no** | **sí**, solo Environment `production` |
| `RATE_LIMIT_HMAC_SECRET` Production | no | no | no | **sí** | no |
| `TEST_DATABASE_URL`, `TEST_DIRECT_URL`, secreto de test | no | **sí** | no | no | no |

`DATABASE_URL` y `DIRECT_URL` de Production nunca coinciden en el mismo ámbito. Ninguna credencial de Production sirve en development ni en test, y viceversa.

## Estado verificado (preflight del 2026-10-28)

| Plataforma | Hallazgo | Estado |
|---|---|---|
| GitHub | Repositorio público; Environments disponibles. Environment `production` **creado**: aprobación humana requerida (revisor: el propietario), restringido a la rama `main`, **sin secretos todavía**. `main` protegida (PR, `static` y `db-tests`). Secret scanning y push protection activados. Sin `VERCEL_TOKEN` ni workflow de despliegue | Hecho |
| GitHub — limitación | La prevención de autorrevisión no es aplicable: el repositorio tiene **una sola persona mantenedora**. La aprobación sigue siendo un clic humano deliberado en la interfaz, pero quien dispara el flujo y quien aprueba es la misma persona. **Decisión del propietario pendiente** (aceptar el riesgo residual o incorporar un segundo revisor) | Requiere decisión |
| Vercel | El proyecto existe y despliega `main` por la integración Git (región `gru1`). La URL pública responde 200 con las cabeceras esperadas (HSTS de la plataforma, CSP pública, `nosniff`, `X-Frame-Options: DENY`, sin `X-Powered-By`); `/admin/**` aún no existe. **No hay acceso por CLI/API en este entorno**: variables, Node y Production Branch deben confirmarse en el panel (lista abajo) | Parcial |
| Neon | La rama `main` está **reservada y vacía**: sin rol `fixora_app`, sin esquema y sin variables de Production en ningún sistema | Pendiente |
| Toolchain | `npm ci --ignore-scripts` es **compatible** con `prisma migrate deploy` y `migrate status` (verificado contra una rama de desarrollo en una copia limpia): el motor de migraciones no depende de scripts de ciclo de vida | Hecho |

## Procedimiento manual de aprovisionamiento (una sola vez; lo ejecuta el propietario)

1. **Neon Production.** En Vercel → proyecto → *Storage* → crear/conectar Neon (Marketplace), recurso restringido a **Production** (*Allowed Environments → Production only*), **sin** ramas de base de datos por Preview ni migraciones en Preview. Auditar las variables que inyecta la integración: no debe quedar el rol propietario en el runtime.
2. **Rol de aplicación por SQL** (no desde Console/CLI/API, que le asignan `neon_superuser`), en la rama `main` y con el propietario de esa rama:
   ```sql
   CREATE ROLE fixora_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
   -- ALTER ROLE fixora_app PASSWORD '<PRODUCTION_FIXORA_APP_PASSWORD>';  -- interactiva; distinta de development y test
   ```
3. **Variables en Vercel (solo Production, sensibles):**
   - `DATABASE_URL`: rol `fixora_app`, conexión **pooled** (host con `-pooler`), `?sslmode=verify-full`, sin `channel_binding`.
   - `RATE_LIMIT_HMAC_SECRET`: valor aleatorio de al menos 32 caracteres, exclusivo de Production.
   - **No** definir `DIRECT_URL` en Vercel ni ninguna variable de base de datos en Preview ni Development.
4. **Secreto de migración en GitHub** → Environment `production` → secret `DIRECT_URL`: rol propietario/migrador de la rama `main`, conexión **directa**, `?sslmode=verify-full`, sin `channel_binding`.
5. **Ajustes del proyecto de Vercel:** Production Branch `main`; Node.js 24.x (debe coincidir con `engines.node`); Install Command `npm ci`; sin `vercel.json`; Production pública (sin Vercel Authentication).
6. **Primera migración:** seguir `RUNBOOKS.md` §1 (rama de recuperación → `migrate-production` con el SHA y la identidad del contenido → aprobación → verificación).
7. **Privilegios** (tras la migración): `DATABASE_URL=<runtime de Production> npm run ops:privileges` (comprobaciones por catálogo; no escribe nada).
8. **Smoke:** `SMOKE_BASE_URL=https://<URL de Production> npm run test:smoke`.

## Identidad del despliegue y evidencia (D10)

Cada despliegue deja identificables, en los registros de plataforma y en la tabla siguiente: SHA de Git, despliegue de Vercel, migración ejecutada (SHA fuente, PR e identidad de `prisma/migrations`), fecha y resultado. No se crea una base de metadatos de release.

| Fecha (UTC) | SHA | Despliegue | Migración (PR, identidad) | Smoke | Resultado |
|---|---|---|---|---|---|
| 2026-10-28 | `665bd64` (línea base previa) | Production por integración Git (sin base de datos configurada) | — | 12/12 contra la URL pública, solo lectura | `/consultar` y `/registrar` cargan; las acciones fallan de forma segura sin base de datos |
| 2026-10-28 | `0c381c6` | Production por integración Git (verificada con rollback y Promote) | PR #5, identidad `2f3a34b7…83b8` | 12/12 | Migración aplicada; privilegios OK |

## Observabilidad y riesgos

- Logger propio de CHG-01 (JSON cerrado, lista positiva, sin PII ni códigos ni secretos). Sin Sentry, Datadog, OpenTelemetry, *log drains* ni monitor externo.
- La demo pública puede recibir datos reales: no se afirma que Production contenga solo datos ficticios; el aviso y las protecciones de PII siguen vigentes.
- Sin respaldo independiente fuera de Neon (riesgo 15 del TD, aceptado; CHG-15 verifica que siga explícito). Sin SLA, alta disponibilidad, RPO ni RTO.
- Fallo cerrado del limitador y arranque en frío de Neon pueden reducir la disponibilidad de la demo (riesgos 7 y 13).

## Evidencia de la línea base (2026-10-28)

| Comprobación | Resultado |
|---|---|
| Migración `20261028062222_init` | Aplicada por `migrate-production` (run 40757447307, aprobado en el Environment `production`); esquema al día. SHA fuente `7aa4bc1c4c52b203e72dfc5f5cea4d4ea982ea39`, identidad `2f3a34b7ea4fcf84f35de5eb1200c93c39ef1b205bec71d33fde018b7c3a83b8` |
| Auditoría posterior | `ops:migration-identity` sobre `main` (`0c381c6`) = identidad migrada |
| Entradas inválidas | Identidad errónea, SHA corto y rama de recuperación sin confirmar fallan en `verify`; `migrate` se omite |
| Privilegios del runtime | `ops:privileges` OK contra Production (ejecutado por el propietario) |
| Smoke | 12/12 tras la migración y tras el rollback + *Promote* |
| Rollback de aplicación | *Instant Rollback* y *Promote* realizados por el propietario; Production restaurada a `0c381c6` |
| Vercel | Node 24.x, rama `main`, sin autenticación de plataforma, región `gru1`; variables solo en Production |
| Neon | Rama `pre-release-2026-10-28` desde `main`, sin conexiones de Preview. Plan Free; ventana de restauración de 6 horas; sin respaldo independiente fuera de Neon (riesgo aceptado) |
| AV-3 | Variables inyectadas y conexión como `fixora_app` verificadas con una consulta real de solo lectura. Fuente de IP real verificada por CHG-14 (2026-10-29): la plataforma sobrescribe `x-vercel-forwarded-for` y entrega la IP real del cliente; ver `docs/08-seguridad/SECURITY-REPORT.md` §4.2 |

Estado de despliegue: Production es la demo pública; puede recibir datos reales. Sin seeds ni datos ficticios.
