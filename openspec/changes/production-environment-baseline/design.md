# Design

## Context

CHG-07 deja lista la línea base operativa de Production sin cambiar la arquitectura aprobada (Technical Design §25–§27, ADR-009/010): hospedaje en Vercel, PostgreSQL en Neon vía Marketplace, GitHub Actions, Node 24.x. Consume CHG-01 (logger, `engines`), CHG-02 (esquema, roles, `prisma.config.ts`, resultado de AV-2) y CHG-03 (`static`, `db-tests`, política de fijación de acciones, protección de `main`). **Todo es planificación**: no se configura Vercel, Neon ni GitHub durante la Fase 6, no se ejecuta AV-3 y no se instalan herramientas.

## Goals / Non-Goals

**Goals:** ruta reproducible `main` → Production; secretos aislados por capacidad; migraciones privilegiadas controladas; Preview sin BD; verificación del rol runtime; smoke no mutante; rollback de aplicación y recuperación de BD separados; runbooks mínimos.

**Non-Goals:** funcionalidad, Security Pass (CHG-14), preparación final de release, *seed* y ejecución final, evidencia y cierre de `SC-20` (CHG-15), monitoreo externo (Sentry, Datadog, OpenTelemetry, log drains, analítica), copias de seguridad propias, dominio propio obligatorio, SLA/alta disponibilidad/RPO/RTO, reevaluar la plataforma.

## Decisions

### D1. Topología de entornos
| Entorno | Aplicación | Base de datos | Credenciales |
|---|---|---|---|
| Local | desarrollo | rama Neon `development` | rol de aplicación y propietario de **development**; nunca Production |
| CI `test` | pruebas (CHG-03) | rama Neon `test` | `TEST_DATABASE_URL`, `TEST_DIRECT_URL`, secreto del limitador de test; entorno GitHub `test` |
| Vercel Preview | previsualización | **ninguna (V1)** | sin credenciales de BD ni de Production |
| Vercel Production | demo pública | rama Neon `main` | solo runtime: rol de aplicación *pooled* |
| Workflow de migración | sin runtime de la aplicación | Neon `main`, conexión directa | solo migración: rol migrador; entorno GitHub `production` |

### D2. Vercel
- Production Branch: `main`. Flujo normal: rama → PR → `static` y `db-tests` verdes → migración autorizada si aplica → fusión a `main` → despliegue de Production por la integración Git. **Una sola autoridad de despliegue**: no se crea un segundo workflow que despliegue y no se guarda `VERCEL_TOKEN` en GitHub.
- Node 24.x: la autoridad es `engines.node` de `package.json` (CHG-01); al implementar se verifica que el ajuste de Vercel coincida, sin duplicar configuración innecesaria. Install Command explícito `npm ci`.
- Preview: se genera por PR/rama, compila y renderiza el *shell* y la UI que no necesita BD; las superficies que requieren BD fallan de forma controlada sin capacidad configurada. **No se usa una `DATABASE_URL` ficticia para simular conectividad.** Preview no es entorno de aceptación funcional. La base obligatoria de Preview es: despliegue de Preview, sin BD en V1, sin secretos de Production, sin migraciones y sin clones de Production. **Vercel Authentication en Preview es un endurecimiento opcional de la plataforma** (decisión de implementación a evaluar en AV-3): CHG-07 no falla si no está activa y no debe proteger por accidente la demo pública. **Production permanece pública**: sin cuenta de Vercel, contraseña, VPN ni SSO, con el aviso de CHG-04 visible.
- `next build` no necesita `DATABASE_URL` real, ni `DIRECT_URL`, ni conexión, ni ejecuta consultas ni migraciones; `prisma generate` según lo validado por CHG-02/AV-2.
- Sin push directo rutinario a `main` ni despliegues manuales desde una estación sin trazabilidad.
- Robots, cabeceras y CSP los poseen CHG-04/CHG-14; CHG-07 solo verifica que Production las preserve. El aviso demostrativo es de CHG-04; CHG-07 verifica que esté visible. Dominio propio: no requerido; basta una URL estable de Vercel.

### D3. Neon
- Proveedor aprobado vía Vercel Marketplace; no se reevalúan otras plataformas. Si una limitación actual contradice la arquitectura, se reporta y no se adapta en silencio.
- El recurso queda restringido a **Production** cuando la plataforma lo permita (no accesible desde Preview ni Development); se confirma la capacidad al implementar.
- **No** se habilitan «database branch per Preview», migraciones en Preview ni clones de Production hacia Preview. Si la integración lo activa por defecto, se configura solo Production o se elige un modo compatible.
- `DATABASE_URL` de Production: *pooled*, rol de aplicación de mínimo privilegio, solo Production, sensible, del lado del servidor; nunca `NEXT_PUBLIC_*`; nunca el rol migrador. La región de Vercel y de Neon se elige por proximidad y se documenta (detalle de plataforma).
- La integración se **audita**: modo, titularidad y facturación, entornos permitidos, nombres de variables inyectadas. No se acopla la aplicación a nombres propietarios del Marketplace: el módulo de configuración sigue exponiendo las capacidades internas aprobadas. Importa el resultado efectivo, no los nombres por defecto.
- Orden de arranque (TD §25.1): rama → rol de aplicación (paso operativo interactivo, nunca en una migración) → `migrate deploy` → administrador (CHG-08) → variables.

### D4. Matriz de secretos
| Secreto / capacidad | Local | CI test | Preview | Vercel Production | Workflow de migración |
|---|---|---|---|---|---|
| `DATABASE_URL` Production (runtime *pooled*) | no | no | **no** | **sí** | no |
| `DIRECT_URL` Production (migrador) | no | no | **no** | **no** (en Vercel está disponible en runtime) | **sí**, solo en el entorno `production` |
| `RATE_LIMIT_HMAC_SECRET` Production | no | no | no | **sí** | no |
| `TEST_DATABASE_URL`, `TEST_DIRECT_URL`, secreto del limitador de test | no | **sí** (entorno `test`) | no | no | no |
| Credenciales de desarrollo | **sí** | no | no | no | no |

Production runtime → Vercel Production; migración → GitHub `production`; test → `test` de CHG-03. `DATABASE_URL` y `DIRECT_URL` de Production nunca coinciden en el mismo ámbito. No se listan secretos que aún no existen (p. ej. los de administración, que define CHG-08). Ninguna credencial de Production sirve en development o test. Nada se versiona, imprime en logs, artefactos, capturas ni salida de migración. Ocultar un valor en la interfaz no sustituye al mínimo privilegio.

### D5. Flujo `migrate-production`
- **Disparo:** `workflow_dispatch`, manual; nunca por `push`. Nombre equivalente permitido.
- **Definición confiable.** La definición del workflow que recibe `DIRECT_URL` procede siempre de `refs/heads/main` (el flujo lo verifica; GitHub permite lanzar un `workflow_dispatch` sobre otra ref) y **no** de una versión modificada dentro de la PR que se migra: el SHA de entrada define el contenido a migrar, pero no sustituye la autoridad del workflow, de modo que una PR no puede cambiar su propio workflow privilegiado.
- **Dos identidades distintas.**
  - **SHA fuente de la migración (*migration source SHA*):** el commit completo exacto que el workflow descarga y usa (no `main`, ni nombre de rama, ni `HEAD`). Se valida que sea completo y que corresponda a la PR aprobada (mecanismo con la API de GitHub, a decidir en la Fase 7).
  - **Identidad del contenido de migraciones (*migration content identity*):** una identidad determinista del contenido aprobado de `prisma/migrations/` para ese SHA. La forma (resumen criptográfico del contenido o identidad Git del subárbol, si se demuestra apropiada) es detalle de implementación y se elige en la Fase 7.
  La seguridad depende de ambas.
- **Squash.** Un *merge* o *squash* puede producir un SHA distinto: `SHA migrado != SHA fusionado` puede ser correcto. Lo que **no** es correcto es `contenido migrado != contenido fusionado`. La invariante es el contenido, no el SHA.
- **Invalidez por cambios posteriores.** Tras aplicar la migración de una PR, cualquier cambio posterior que afecte `prisma/migrations/**` antes de fusionar **invalida la autorización previa**: no se reutiliza («ya migramos una versión anterior de la PR» no es válido), se revisa de nuevo y se repite el gate cuando corresponda. Lo mismo si cambia la cabeza de la PR, cambia la base de forma que pueda afectar a las migraciones, aparecen conflictos o entra otra migración a `main`: se vuelve a verificar la invariante antes de fusionar y la primera aprobación no se asume vigente indefinidamente. El mecanismo (rama actualizada, cola de fusión, comparación, comprobación manual o automática) se valida en GitHub en la Fase 7.
- **Evidencia de migración.** Se registra: SHA fuente, PR relacionada cuando corresponda, identidad/resumen del árbol de migraciones, fecha y resultado de `migrate deploy`. Nunca `DIRECT_URL`, credenciales ni salida sensible.
- **Auditoría posterior a la fusión.** La evidencia permite comprobar que el contenido de migraciones incorporado a `main` corresponde al autorizado y aplicado. Una discrepancia no se considera un lanzamiento exitoso: se detienen cambios adicionales, se investiga y se usa el *runbook*; no se compensa con un rollback automático de migraciones. Solo puede haber **un tren de migración de Production en curso**.
- **Entorno y aprobación (requisito de diseño):** entorno GitHub `production` separado, secretos de migración aislados, restricción a la rama/ref autorizada (`main`), aprobación humana, sin autoaprobación cuando la plataforma lo permita, y registro de auditoría. La disponibilidad efectiva se valida en AV-3.
- **Si GitHub no ofrece la protección requerida** (en AV-3): **se detiene esta parte de CHG-07 y se pide una decisión**. No se sustituye en silencio por un `workflow_dispatch` sin aprobación, un secreto global del repositorio, un comentario manual informal, `DIRECT_URL` en Vercel ni una aprobación implícita; se evaluará entonces una alternativa explícita (p. ej. el procedimiento manual desde un *checkout* limpio del SHA aprobado con la credencial obtenida fuera del repositorio).
- **Alcance de `DIRECT_URL`.** No se define como secreto de todo el repositorio accesible a otros workflows, ni como variable de entorno general del job si no hace falta, ni en Vercel. Se entrega solo al **paso mínimo** que necesita la conexión de migración, si GitHub Actions y Prisma lo permiten; los pasos de *checkout*, verificaciones, resumen del árbol y preparación que no usan BD no lo reciben. Se valida en AV-3.
- **Código ejecutado con el secreto.** Se minimiza el código del repositorio que corre mientras `DIRECT_URL` está disponible (scripts de ciclo de vida, `prisma.config.ts`, scripts npm, ejecutables auxiliares); que el SHA esté revisado no justifica permitir código arbitrario. `npm ci --ignore-scripts` es una **hipótesis a validar**, no una decisión cerrada; la secuencia mínima necesaria para Prisma 7 se valida en la Fase 7.
- **Permisos:** `contents: read` y solo lo demostrado como necesario; nunca `write-all`; no escribe en el repositorio. Acciones externas fijadas a SHA completo comprobado contra el repositorio oficial, con el *tag* como comentario (política de CHG-03; los SHA se fijan al implementar).
- **Frontera de comandos (superficie altamente privilegiada):** *checkout* del SHA → Node 24 → instalación segura → generación estrictamente necesaria → `prisma migrate deploy` → verificación mínima → fin. **No** ejecuta la aplicación, `next build`, pruebas, *seed*, aprovisionamiento del administrador ni scripts arbitrarios de la revisión. `migrate deploy` no crea ni usa *shadow database*.
- **Rama de recuperación:** antes de una migración relevante, cuando el plan lo permita, una rama Neon `pre-release-…` creada como **prepaso manual** (sensible: sin conexión a Preview ni desarrollo, acceso restringido, se elimina al cerrar la ventana). El flujo pide confirmación de que existe. Automatizarla requeriría aprobar un token de Neon, que no está en el catálogo.
- **Prohibido migrar:** en `next build`, `next start`, Vercel, Preview, el runtime ni por solicitud.

### D6. Secuencia con cambio de esquema
PR terminada → `static` y `db-tests` verdes → SQL revisado → operador dispara `migrate-production` con el SHA exacto → aprobación del entorno → `migrate deploy` → verificación → **solo entonces** fusión a `main` → Vercel despliega → smoke. **Si la migración falla, no se fusiona.**

### D7. Compatibilidad expand/contract y rollback
La migración previa al despliegue es compatible con la versión actualmente desplegada y con la nueva. Así `migración N → app N` puede volver temporalmente a `migración N → app N-1`, y el Instant Rollback sigue siendo viable para el código. Las evoluciones incompatibles se hacen por etapas (expandir → desplegar compatible → migrar uso/datos → verificar → contraer en un change posterior). No existe rollback SQL ordinario: se hace *roll-forward* con una migración correctiva y no se editan migraciones aplicadas.

### D8. Verificación del rol runtime
Durante el aprovisionamiento y el *preflight* se comprueba por introspección de catálogo (sin operaciones destructivas ni endpoint) que el rol runtime de Production puede lo permitido y **no** tiene DDL, `DELETE` sobre `repair_orders`, `UPDATE`/`DELETE` sobre los historiales ni `UPDATE` sobre `admin_users` fuera de lo aprobado, ni puede migrar. Consume CHG-02.

### D9. Smoke de Production (línea base de infraestructura)
CHG-07 es dueño del **smoke de infraestructura**: público, seguro y **no mutante**, tras el despliegue (proyecto de Playwright dedicado contra la URL real). Comprueba como mínimo: Production responde; `/` carga sin error fatal; el aviso demostrativo está presente; `/registrar` carga; `/consultar` carga; y la configuración/cabeceras esperadas de Production. No registra reparaciones, no muta datos, no consulta códigos inexistentes (no alimenta el limitador), no depende de una orden demo y no crea un endpoint nuevo para probar la BD (si hace falta validar conectividad, se usa un mecanismo operativo no público). Sin *seed* automático en cada despliegue ni códigos o claves de idempotencia predecibles.

**Propiedad (reconciliada, R8).** CHG-07 es dueño del *baseline* de Production y del **mecanismo del smoke** (`test:smoke`). CHG-15 es dueño de la **ejecución final, la recopilación de evidencia y el cierre de `SC-20`** para el release: reutiliza el mecanismo de CHG-07 y solo puede añadirle aserciones (consulta por la UI real de una orden demo ficticia con `SMOKE_TRACKING_CODE`, cuando exista el dato controlado del *seed*) cuando la evidencia final ya aprobada lo requiera; no recrea la infraestructura del smoke ni es dueño funcional de él. TD §25.6 describe el smoke completo en un solo lugar: la separación es de propiedad de implementación frente a evidencia de release, no una contradicción técnica; no se modifica el Technical Design.

**`/admin/**` fuera de CHG-07.** La comprobación de que `/admin/**` sin sesión no devuelve contenido administrativo no es evidencia obligatoria de este change: la protección administrativa es de CHG-08 (`admin-access`), `SC-12`, CHG-14 y CHG-15, y CHG-07 no depende de una función aún inexistente. El smoke futuro la incorporará cuando `/admin/**` exista.

### D10. Identidad del despliegue y evidencia
Cada despliegue deja identificables: SHA de Git, despliegue de Vercel, migración ejecutada, fecha y resultado, en logs de plataforma y en el *runbook* (sin crear una base de metadatos de release).

### D11. Rollback de aplicación vs. recuperación de BD
- **Aplicación:** Instant Rollback de Vercel hacia el despliegue conocido bueno anterior; no revierte la BD ni las variables actuales; su elegibilidad depende del plan; tras el rollback se verifica la asignación automática de Production. Skew Protection no es requisito.
- **Base de datos:** recuperación excepcional, manual y *break-glass* con capacidades del proveedor según plan y momento (restauración de rama, *point-in-time restore*, equivalente); no se congelan días de retención ni funciones por plan sin verificarlas. **No es el mecanismo habitual para revertir una migración.**
- **Riesgo residual aceptado:** FIXORA V1 no mantiene un respaldo independiente fuera de Neon; PITR, ramas o *snapshots* son capacidades del proveedor y no «nuestro respaldo» (riesgo 15 del TD).

### D12. Observabilidad
Logger propio de CHG-01 (JSON cerrado, lista positiva, sin errores crudos, PII, códigos ni secretos); no se confía en la redacción de Vercel. Los logs de plataforma sirven para diagnóstico operativo sin crear telemetría contractual. Sin Sentry, Datadog, OpenTelemetry, *log drains*, analítica ni monitor externo.

### D13. Runbooks mínimos (en `docs/09-deploy/`, al implementar)
- **Migración de esquema:** PR → verdes → migración revisada → `migrate-production` SHA exacto → aprobación → `migrate deploy` → verificar → fusionar → despliegue → smoke.
- **Recuperación:** incidente → clasificar aplicación o BD → conservar evidencia → rollback de aplicación **o** recuperación del proveedor → verificar → documentar.
- ***Break-glass*:** identificar, congelar cambios, conservar evidencia, elegir rollback o recuperación, confirmar el objetivo, ejecutar con rol autorizado (nunca el runtime), verificar y documentar; sin automatizar recuperación destructiva. Los demás RB-1…RB-9 del TD los completa CHG-15.

## Fronteras

- **CHG-03:** `static`, `db-tests`, secretos de test y protección de `main`; CHG-07 consume que estén verdes y no los reimplementa.
- **CHG-14:** Security Pass global; CHG-07 solo establece entornos seguros, alcances de secretos, control de migraciones y recuperación.
- **CHG-15:** preparación de release, *seed*, ejecución final del smoke de Production, evidencia y cierre de `SC-20` (reutilizando el mecanismo de CHG-07) y revisión de que el riesgo de ausencia de respaldo independiente siga aceptado; CHG-07 aporta el smoke de infraestructura y no declara el release.
- **CHG-08:** secretos y aprovisionamiento del administrador.

## Risks / Trade-offs

- Un SHA no fusionado ejecuta SQL de una PR con credenciales de Production: se mitiga con el SHA aprobado explícito, la definición desde `main`, el comando mínimo y la aprobación del entorno.
- Sin restricción de Environment, la arquitectura exige el procedimiento manual alternativo (no un secreto expuesto).
- Fallo cerrado del limitador y arranque en frío de Neon reducen disponibilidad de la demo (riesgos 7 y 13 del TD).
- Integración de Marketplace puede inyectar credenciales de propietario (riesgo 8): auditoría obligatoria.
- Instant Rollback limitado por plan (riesgo 10); sin respaldo independiente (riesgo 15).
- Demo pública: puede recibir datos reales; **no** se afirma que Production contenga solo datos ficticios; el aviso y las protecciones de PII siguen siendo obligatorios.

## Open Questions

| ID | Pregunta | Clasificación |
|---|---|---|
| OQ-1 | Reparto del smoke entre CHG-07 (mecanismo y *baseline*) y CHG-15 (ejecución final, evidencia y cierre de `SC-20`) | **RESUELTA** |
| OQ-2 | Identidad SHA fuente / contenido de migraciones, *squash* e invalidez por cambios | **RESUELTA** |
| OQ-3 | Conducta si GitHub no ofrece la protección requerida | **RESUELTA** (detener y pedir decisión) |
| OQ-4 | Capacidades de plataforma (Vercel, Neon, GitHub), protecciones de GitHub, configuración de Vercel/Neon y mecánica del workflow de migración | PRE-IMPLEMENTATION AV-3 |
| OQ-5 | Mecanismo del resumen del árbol de migraciones, región, mecanismo de comparación posterior a la fusión, autenticación opcional de Preview | IMPLEMENTATION DETAIL |
| OQ-6 | Sin respaldo independiente fuera de Neon | RESIDUAL RISK (aceptado; CHG-15 verifica que siga explícito) |
| OQ-7 | Consulta de la orden demo, *seed* y runbooks restantes | DEFERRED a CHG-15 |

Ninguna pregunta es BLOCKING para la aprobación documental.

### Lista de validaciones AV-3 (se ejecuta en la Fase 7, no ahora; no se crea AV-4)
- **Vercel:** Node 24; Production Branch; Preview sin BD; acceso Production-only del recurso Marketplace (si la integración ofrece `Allowed Environments → Production only`, se configura así; si se comporta distinto, se detiene y revisa antes de exponer credenciales); Production pública; protección opcional de Preview; región; Instant Rollback efectivo; `x-vercel-forwarded-for` como fuente de IP.
- **Neon:** integración real de Marketplace; endpoint *pooled* de runtime; endpoint directo de migración; roles; aislamiento del recurso Production; mecanismos de recuperación; retención y plan; variables efectivamente inyectadas.
- **GitHub:** entorno `production`; restricción de rama/ref; aprobación requerida; prevención de autorevisión si está disponible; aislamiento del secreto y alcance por paso; workflow tomado de `main`; entrada de SHA completo; invariante del contenido de migraciones.
- **Toolchain:** `prisma migrate deploy` con Prisma 7; carga de configuración; código mínimo ejecutado con el secreto; `npm ci --ignore-scripts`; sin *shadow database* en Production.

## Pruebas planificadas

Smoke público no mutante; verificación de privilegios por catálogo; verificación de que `DIRECT_URL` no existe en Vercel ni en Preview; comprobación de que Preview no recibe variables de BD; ejecución del flujo de migración sobre el SHA aprobado. Evidencia de `SC-19` (parcial) y línea base de `SC-20`: registro del despliegue y del smoke.
