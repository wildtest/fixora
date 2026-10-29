# Tasks

> Planificación únicamente. Nada de esto se ejecuta hasta que el change esté revisado, aprobado y el usuario autorice `/opsx:apply` en la Fase 7, **con CHG-02 y CHG-03 aplicados** (y CHG-06 recomendado para que el smoke tenga contenido que consultar). Toda configuración de Vercel, Neon o GitHub, creación de secretos, instalación de herramientas y conexión a Production requiere aprobación explícita en el momento. No hay tareas de lógica funcional. AV-3 se ejecuta con el primer despliegue real.

## 1. Preflight de plataforma y toolchain

- [x] 1.1 Confirmar el DoR (CHG-02 y CHG-03 archivados, AV-2 aprobado, cuentas y aprobaciones de Vercel, Neon y GitHub); se verifica con una nota de aprobación en el change.
- [x] 1.2 Preflight de Vercel: Node 24, Production Branch, acceso del recurso solo a Production, comportamiento de Preview, elegibilidad de Instant Rollback y región; se verifica con una nota que registra cada capacidad como disponible, no disponible o con alternativa.
- [x] 1.3 Preflight de Neon: modo de integración de Marketplace, conexiones *pooled* y directa, creación de roles, plan, retención y capacidades de recuperación; se verifica con una nota equivalente.
- [x] 1.4 Preflight de GitHub: entorno `production`, restricción a `main`, aprobación requerida según el plan, permisos del workflow y mecanismo para validar el SHA exacto; se verifica con una nota equivalente. Si la restricción, la aprobación humana o la prevención de autorevisión no están disponibles, **detener esta parte y solicitar decisión**; no se sustituye por un secreto global, `DIRECT_URL` en Vercel ni una aprobación informal.
- [x] 1.5 Preflight de toolchain: `prisma migrate deploy` con Prisma 7, `npm ci --ignore-scripts` y carga de configuración (consume la solución de CHG-02/AV-2); se verifica con una nota de decisión.

## 2. Proyecto de Vercel

- [x] 2.1 Con aprobación (Production pública, sin cuenta ni contraseña para acceder), conectar el proyecto de Vercel a `main` como Production Branch, con Node 24.x alineado con `engines.node` e Install Command `npm ci`; se verifica con la configuración efectiva y un despliegue sin variables de BD.
- [x] 2.2 Configurar Preview sin credenciales de BD, sin migraciones, sin clones de Production y sin ramas de BD por Preview (la autenticación de Preview es un endurecimiento opcional a evaluar en AV-3 y no condiciona el change; Production permanece pública); se verifica con un Preview de PR que compila, renderiza el *shell* y falla de forma controlada donde se requiere BD.
- [x] 2.3 Confirmar que no existe `VERCEL_TOKEN` en GitHub ni otro workflow de despliegue; se verifica con la revisión de secretos y workflows.

## 3. Neon Production

- [x] 3.1 Con aprobación, provisionar el recurso Neon vía Marketplace, restringido a Production cuando se pueda, con la rama `main`; se verifica con la lista de entornos permitidos y la ausencia de acceso desde Preview y Development.
- [x] 3.2 Auditar las variables inyectadas por la integración y sustituirlas por el rol de aplicación *pooled*; confirmar que no hay propietario ni conexión directa en el runtime; se verifica con el inventario de variables efectivas por entorno.
- [x] 3.3 Crear el rol de aplicación como paso operativo interactivo (contraseña fuera de migraciones) y aplicar las migraciones iniciales por el flujo definido; se verifica con el estado de migraciones y los privilegios.
- [x] 3.4 Verificar por catálogo los privilegios del rol runtime (sin DDL, sin `DELETE` de órdenes, sin `UPDATE`/`DELETE` de historiales, sin migrar); se verifica con el resultado de la introspección registrado.

## 4. Aislamiento de secretos

- [x] 4.1 Cargar `DATABASE_URL` (pooled) y `RATE_LIMIT_HMAC_SECRET` solo en Vercel Production; se verifica con la matriz de D4 y que Preview y Development no los tienen.
- [x] 4.2 Guardar `DIRECT_URL` del migrador solo en el entorno GitHub `production`, restringido a `main` (o aplicar la alternativa manual aprobada); se verifica con la revisión del entorno y que no existe en Vercel.
- [x] 4.3 Confirmar que no se versionó ni imprimió ningún secreto; se verifica con detección de secretos y la revisión de registros con valores canario.

## 5. Flujo `migrate-production`

- [x] 5.1 Crear el workflow manual (`workflow_dispatch`) desde `refs/heads/main`, con entrada de SHA completo, entorno `production`, permisos `contents: read`, acciones fijadas a SHA y Node 24; se verifica con una ejecución de prueba sin cambios de esquema y la revisión del YAML.
- [x] 5.2 Limitar los pasos a *checkout* exacto, instalación segura, generación necesaria, `prisma migrate deploy` y verificación mínima, sin aplicación, build, pruebas, *seed* ni scripts de la revisión, entregando `DIRECT_URL` solo al paso que lo necesita y con la definición del workflow tomada de `main`; se verifica con la revisión del workflow y el resultado de AV-3.
- [x] 5.3 Validar el SHA fuente (completo y asociado a la PR aprobada), calcular la identidad del contenido de `prisma/migrations`, registrar la evidencia (SHA, PR, identidad, fecha, resultado) y comprobar que un cambio posterior de migraciones, de cabeza o de base invalida la autorización; se verifica con ejecuciones válida e inválida controladas.
- [x] 5.4 Incluir la confirmación de la rama de recuperación como prepaso manual; se verifica con una ejecución que se detiene sin confirmación.
- [x] 5.5 Comprobar que ninguna migración corre en build, arranque, Preview ni runtime; se verifica con la revisión de scripts y configuración.

## 6. Despliegue y smoke

- [x] 6.1 Desplegar `main` por la integración Git y registrar SHA, despliegue de Vercel, migración, fecha y resultado; se verifica con el registro de evidencia.
- [x] 6.2 Crear el smoke de infraestructura público y no mutante (Production responde, `/`, aviso demostrativo, `/registrar`, `/consultar`, cabeceras/configuración de Production, sin fallo fatal) y ejecutarlo contra la URL real; se verifica con la ejecución en verde y que no crea órdenes, no consulta códigos inexistentes ni depende de una orden demo. La comprobación de `/admin/**` y la consulta de la orden demo se incorporan después al mismo mecanismo (CHG-08; ejecución y evidencia final en CHG-15).
- [x] 6.3 Ejecutar AV-3 con el despliegue real (fuente de IP, variables inyectadas) y registrar el resultado; se verifica con la nota de AV-3.

## 7. Rollback y recuperación

- [x] 7.1 Redactar en `docs/09-deploy/` los runbooks de migración, de recuperación y *break-glass* (aplicación frente a BD separados); se verifica con la revisión de que no confunden rollback con recuperación.
- [x] 7.2 Probar el rollback de aplicación en un entorno seguro y verificar el estado de la asignación automática de Production; se verifica con el registro de la prueba.
- [x] 7.3 Registrar las capacidades reales de recuperación de Neon y el riesgo residual de ausencia de respaldo independiente; se verifica con la nota en `docs/09-deploy/`.

## 8. Verificación final

- [x] 8.1 Revisar el alcance: sin funcionalidad, tokens de Vercel, monitoreo externo, respaldo propio ni cambios en `src/`, `prisma/` o `package.json`; se verifica con `git diff`.
- [x] 8.2 Realizar la auditoría posterior a la fusión (el contenido de migraciones en `main` coincide con el autorizado) y registrar la evidencia de `SC-19` (parcial) y de la línea base de `SC-20`; se verifica con la nota en `docs/09-deploy/` y `openspec validate production-environment-baseline --strict`.

## Notas de implementación (2026-10-28)

**Estado: 28/28 tareas completas (2026-10-28). Evidencia de Production en `docs/09-deploy/PRODUCTION-ENVIRONMENT.md`.**

**Hecho en el repositorio y verificado**
- **1.1 DoR.** CHG-01…06 archivados (`main` 665bd64). El usuario autorizó la ejecución autónoma de CHG-07.
- **1.5 Toolchain.** `npm ci --ignore-scripts` + `prisma migrate status` (y por tanto `migrate deploy`) funcionan contra una rama Neon real en una copia limpia: el motor de migraciones no depende de scripts de ciclo de vida; `prisma.config.ts` y su guardia de `DIRECT_URL` se cargan sin `dotenv`. Sin base de sombra.
- **2.3.** Sin `VERCEL_TOKEN` en GitHub (no hay secretos de repositorio) y ningún workflow despliega: lo comprueba `tests/tooling/production-ops.test.ts`.
- **4.3.** Sin secretos versionados ni impresos (`ci:secrets`; las pruebas de los scripts usan valores canario).
- **5.1 (artefacto).** `.github/workflows/migrate-production.yml`: `workflow_dispatch`, definición solo desde `refs/heads/main`, entradas `source_sha` (40 hexadecimales), `migrations_identity` (SHA-256 del contenido de `prisma/migrations`) y confirmación de la rama de recuperación; job `verify` sin secretos (commit asociado a una PR de este repositorio, no a un fork, e identidad coincidente) y job `migrate` con Environment `production`; `DIRECT_URL` solo en los pasos `migrate deploy` y `migrate status`; acciones fijadas por SHA; un solo tren sin cancelar. La **ejecución** sigue pendiente (5.1, 5.3, 5.4).
- **5.5.** Ninguna migración corre en `build`, `start`, Preview ni runtime: `build` = `db:generate && next build`; sin `vercel.json`; el CI nunca migra Production.
- **6.2 Smoke.** `npm run test:smoke` (`playwright.smoke.config.ts`, `tests/smoke/`): público, de solo lectura, exige `SMOKE_BASE_URL` https; no registra, no consulta códigos, no envía formularios. Ejecutado contra la URL pública real (`fixora-rho-one.vercel.app`): 12/12 (escritorio y móvil): responde por HTTPS, landing, aviso demostrativo, `/registrar` y `/consultar` cargan, 404 público sin detalles, cabeceras (HSTS de la plataforma, CSP pública, `nosniff`, `DENY`, sin `X-Powered-By`), solo la landing indexable y Production pública.
- **7.1 Runbooks.** `docs/09-deploy/RUNBOOKS.md` (migración, recuperación, *break-glass*; rollback de aplicación y recuperación de BD separados).
- **8.1 Alcance.** Sin cambios en `src/` ni en `prisma/`, sin dependencias nuevas. `package.json` solo gana tres scripts (`test:smoke`, `ops:privileges`, `ops:migration-identity`); `test:smoke` es el mecanismo que nombra D9.
- **Utilidades de apoyo (con pruebas):** `scripts/migration-identity.ts` (identidad determinista, insensible al orden, al sistema operativo y a los finales de línea) y `scripts/verify-runtime-privileges.ts` (74 comprobaciones por catálogo, sin endpoint; verificado contra `development` y contra `test`, y se comprueba que detecta un rol no conforme).
- **GitHub.** Environment `production` creado: aprobación humana requerida, restringido a la rama `main`, sin secretos.

**Pendiente (bloqueado por acciones del propietario)**
- **1.2, 1.3** Preflight de Vercel y Neon (no hay acceso por CLI/API; solo se pudo observar la URL pública). **1.4** GitHub: la prevención de autorrevisión no es aplicable en un repositorio con una sola persona mantenedora; según D5 se **detiene esta parte y se pide una decisión** (aceptar el riesgo residual o añadir un segundo revisor).
- **2.1, 2.2** Ajustes del proyecto de Vercel (Production Branch, Node 24.x, `npm ci`, Preview sin BD). **3.1–3.4** Neon Production (integración de Marketplace restringida a Production, rol `fixora_app` por SQL, migraciones iniciales, verificación de privilegios). **4.1, 4.2** Variables de Production en Vercel y secreto `DIRECT_URL` en el Environment `production`.
- **5.1, 5.3, 5.4** Ejecuciones del workflow (aprobación humana en el Environment; el workflow debe estar en `main` para poder lanzarse). **6.1, 6.3** Despliegue registrado y AV-3. **7.2, 7.3** Prueba de rollback y capacidades reales de recuperación de Neon. **8.2** Auditoría posterior a la fusión.

## Workflow follow-up

- Revisar y aprobar el change; el usuario autoriza `/opsx:apply` en la Fase 7.
- Al ser `skip_specs`, confirmar el comportamiento del archive sin deltas.
- CHG-15 reutiliza el mecanismo del smoke para la ejecución final, la evidencia y el cierre de `SC-20`, y completa el *seed* y los runbooks restantes.

**Evidencia de Production (2026-10-28)**
- **Migración.** `migrate-production` run 40757447307: `verify` sin secretos y `migrate` tras la aprobación del Environment `production`; aplicó `20261028062222_init`; `migrate status`: esquema al día. SHA fuente `7aa4bc1c…` (cabeza de la PR #5), identidad `2f3a34b7…83b8`.
- **Ejecuciones inválidas controladas (5.3, 5.4).** Identidad errónea (run 40787490524), SHA corto (40787500142) y rama de recuperación sin confirmar (40787649564): todas fallan en `verify` y `migrate` queda omitido, sin pedir aprobación ni tocar la base.
- **Privilegios (3.4).** `ops:privileges` contra el runtime de Production: OK (informado por el propietario, que lo ejecutó sin exponer la URL).
- **Smoke (6.1).** 12/12 contra la URL pública tras la migración y de nuevo tras el *rollback* y el *Promote*.
- **Rollback (7.2).** El propietario hizo *Instant Rollback* al despliegue anterior y *Promote* de vuelta al de `0c381c6`. No pude ejecutar el smoke durante el rollback; sí tras restaurar. Elegibilidad de *Instant Rollback*: disponible (se ejecutó).
- **Vercel (1.2, 2.1, 4.1).** Node 24.x, Production Branch `main`, sin autenticación de Vercel en Production, región `gru1` (cabecera `x-vercel-id`), variables solo `DATABASE_URL` y `RATE_LIMIT_HMAC_SECRET` en Production, ninguna variable de BD en Preview ni Development, sin `DIRECT_URL`.
- **GitHub (1.4, 4.2).** Environment `production` restringido a `main`, `DIRECT_URL` solo allí. Autorrevisión aceptada por el propietario como riesgo residual (repositorio de una sola persona).
- **AV-3 (6.3).** La aplicación desplegada conecta con Neon `main` como `fixora_app` (pooled): una consulta de un código inexistente devuelve «No encontramos una reparación con ese código», no el error genérico, lo que implica que el limitador escribió y la lectura de `repair_orders` funcionó. Variables inyectadas: las únicas de BD son las dos esperadas. La fuente de IP (`x-vercel-forwarded-for`) no se verificó con un valor real: requeriría leer buckets del limitador en Production; queda como residuo para CHG-14.
- **Auditoría posterior (8.2).** `npm run ops:migration-identity` sobre `main` (0c381c6) = `2f3a34b7…83b8`, igual a lo migrado.
- **Preview (2.2).** El Preview de la PR #6 compila, es público, renderiza `/consultar` y, al consultar un código, muestra «Servicio no disponible temporalmente» (fallo controlado sin base de datos).
- **Neon (1.3, 7.3).** Plan Free; ventana de restauración de 6 horas; rama `pre-release-2026-10-28` creada desde `main`, sin conexiones de Preview. Conexiones pooled (runtime) y directa (migrador) verificadas por uso real. Riesgo residual: 6 horas de historial y ningún respaldo independiente fuera de Neon (riesgo 15 del TD, aceptado); la recuperación de la BD es excepcional y manual (RUNBOOKS §2.3).
