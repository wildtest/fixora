# CLAUDE.md — FIXORA

Lee también `AGENTS.md`: esta versión de Next.js tiene cambios incompatibles con lo que podrías conocer. Antes de escribir código de Next.js, consulta la guía correspondiente en `node_modules/next/dist/docs/`.

## Contexto

**FIXORA** — "Tu reparación, siempre bajo control."

Aplicación web responsive para pequeños servicios técnicos de reparación de equipos tecnológicos. Proyecto final de la especialización "Desarrollo de Software AI-First con Claude".

## Problema que resuelve

Muchos pequeños servicios técnicos gestionan las reparaciones por WhatsApp, llamadas, papel o Excel. Eso desorganiza el taller y obliga al cliente a preguntar repetidamente por el estado de su equipo.

## Usuarios V1

- **Cliente** (sin cuenta): registra una solicitud de reparación, recibe un código de seguimiento y consulta después el estado con ese código.
- **Administrador** (zona protegida): consulta órdenes, registra diagnóstico y costo estimado, actualiza estados, agrega información pública, mantiene notas internas y consulta el historial.

## Estados (flujo conceptual)

Solicitud recibida → Equipo recibido → En diagnóstico → Esperando aprobación → En reparación → Listo para recojo → Entregado. Además existe **Cancelado** cuando las reglas de negocio lo permitan.

No todas las transiciones son válidas (p. ej. una solicitud nueva no puede pasar directamente a Entregado). La matriz exacta de transiciones y sus reglas están aprobadas en el PRD (`docs/01-producto/PRD.md`, §4.4); el Technical Design decide cómo se implementan.

## Diferenciadores aprobados

1. Repair Journey visual.
2. Seguimiento por código sin cuenta de cliente.
3. Máquina de estados real con transiciones controladas.
4. Separación estricta entre información pública y notas internas.

## Alcance V1

Landing · registro de solicitud · código de seguimiento · consulta pública · timeline de estados · login administrativo · dashboard · listado y búsqueda de órdenes · detalle de orden · diagnóstico · costo estimado · cambio controlado de estados · historial de cambios · notas públicas · notas internas · persistencia de datos · testing E2E · Security Pass · CI/CD · deploy en Vercel.

## Fuera de alcance V1

Cuentas, registro/login y recuperación de contraseña de clientes · múltiples roles administrativos · múltiples técnicos con permisos distintos · multiempresa · múltiples sucursales · inventario de repuestos · facturación · pagos online · WhatsApp automático · SMS · email automático · fotos de dispositivos · firma digital · app móvil · diagnóstico con IA · chat cliente-técnico.

## Mapa documental

Fuente de verdad en `docs/` (ver `docs/README.md`). Cada documento consume el anterior.

| Fase | Ruta |
|---|---|
| 00 Definición | `docs/00-definicion/PROJECT-BRIEF.md` |
| 01 PRD | `docs/01-producto/PRD.md` |
| 02 Diseño | `docs/02-diseno/` |
| 03 Arquitectura (Technical Design + ADRs) | `docs/03-arquitectura/` |
| 04 Backlog / planificación | `docs/04-planificacion/` (estrategia `OPENSPEC-STRATEGY.md` y backlog maestro `BACKLOG.md`) |
| 05 Specs / OpenSpec | `openspec/specs/` (Specs canónicas) y `openspec/changes/` (propuestas); no hay copia paralela en `docs/05-specs/` |
| 06 Diagramas | `docs/06-diagramas/` |
| 07 Testing | `docs/07-testing/` |
| 08 Seguridad | `docs/08-seguridad/` |
| 09 Deploy | `docs/09-deploy/` |

## Fuente de verdad funcional

`docs/00-definicion/PROJECT-BRIEF.md` es el punto de partida. **`docs/01-producto/PRD.md` es la fuente de verdad funcional aprobada de FIXORA V1**; el detalle vigente del alcance, el no alcance, los criterios de éxito (`SC-*`), los casos borde (`E*`) y los supuestos y riesgos (`SUP-*`, `VAL-*`, `RIE-*`) está allí. Las fases siguientes derivan de esos documentos.

Lee el PRD antes de:

- proponer funcionalidad;
- diseñar pantallas;
- tomar decisiones de arquitectura que dependan del producto;
- crear backlog;
- crear specs;
- implementar comportamiento funcional.

No modifiques silenciosamente decisiones del PRD. Si una fase posterior exige cambiar una decisión de producto aprobada, señala primero la contradicción y actualiza la documentación de forma explícita y trazable.

## Estado actual del pipeline

```
00 Definición   COMPLETADO
01 PRD          COMPLETADO
02 Diseño       COMPLETADO (Exploración UX + sistema visual; DESIGN.md aprobado)
03 Arquitectura CERRADA (área de la Fase 5 — Technical Design / Arquitectura; Technical Design y ADR-001…010 aprobados; cerrada el 2026-10-26)
04 Backlog      CERRADO (Fase 6.3 ✅; docs/04-planificacion/BACKLOG.md aprobado)
05 Specs        Fase 6 COMPLETADA (6.1–6.5 ✅): 16 changes materializados y aprobados; Fase 7 en curso: CHG-01 y CHG-02 archivados, 14 changes activos, 0 main specs (las main specs nacen al implementar, verificar y archivar; CHG-01 es `skip_specs` y no genera ninguna)
06 Diagramas    PENDIENTE
07 Testing      PENDIENTE
08 Seguridad    PENDIENTE
09 Deploy       PENDIENTE
```

Fase 01 aprobada: el PRD (`docs/01-producto/PRD.md`) fue aprobado el 2026-10-25. La exploración UX con Google Stitch (parte de 02 Diseño) está completada: existe una **Dirección UX Consolidada aprobada** documentada en `docs/02-diseno/UX-EXPLORATION.md` (con `STITCH-BRIEF.md` y las capturas de referencia en `docs/02-diseno/referencias/stitch/`). La Fase 4 (Claude Design + sistema visual) está completada: `docs/02-diseno/DESIGN.md` (aprobado el 2026-10-26) consolida PRD → Dirección UX Consolidada → Sistema Visual de Claude Design (`docs/02-diseno/referencias/claude-design/`). La Fase 5 (Technical Design / Arquitectura; área documental `03-arquitectura/`) está cerrada: ver abajo.

- `PRD.md` continúa siendo la **fuente de verdad funcional**.
- `UX-EXPLORATION.md` es la **fuente de verdad de estructura UX y navegación aprobada** (nueve pantallas, flujos, estados).
- `DESIGN.md` es la **fuente de verdad visual y de detalle UX/UI** (tokens, componentes, patrones, copys de diseño). No sustituye al PRD en reglas funcionales; si discrepan, prevalece el PRD.
- Jerarquía: PRD > UX-EXPLORATION > DESIGN.md > artefactos y capturas (solo referencia).
- Cualquier trabajo de UI debe partir de **PRD + UX-EXPLORATION + DESIGN.md**.
- No introduzcas silenciosamente nuevas pantallas, flujos ni funcionalidades. Las capturas de Stitch son evidencia, no requisitos: contienen contenido fuera del PRD (ver `UX-EXPLORATION.md` §8 y §19.5). Las decisiones técnicas que `DESIGN.md` difiere (§17: formato del código, iconos, fuentes, tokens, breakpoints, paginación técnica, etc.) pertenecen al Technical Design.
- `docs/03-arquitectura/TECHNICAL-DESIGN.md` es la **fuente de verdad técnica y arquitectónica** (estado: aprobado; Fase 5 cerrada). `docs/03-arquitectura/adrs/ADR-001…ADR-010` (todos Aceptados) registran el razonamiento y las alternativas; no sustituyen al Technical Design y deben permanecer coherentes con él.
- Las Specs/OpenSpec (`openspec/`) convierten esas fuentes de verdad en unidades implementables; **no las reemplazan** ni se copian dentro de `openspec/specs/`. El Architecture Validation Gate (AV-1/2/3, TD §29) es el primer gate de la Fase 7 (implementación): AV-1 y AV-2 ✅ PASS; AV-3 ✅ PASS con residuo (CHG-07).

### Fases del plan maestro

Fases 0–4 cerradas (hasta `DESIGN.md`, incluidas la exploración UX y el sistema visual). **Fase 5 — Technical Design / Arquitectura: ✅ CERRADA el 2026-10-26** (Technical Design aprobado, ADR-001…010 aceptados, revisión adversarial completada con 0 Critical y 0 High, A-5 completado). No es una fase de implementación: no hay código de la arquitectura aprobada.

**Fase 6 — OpenSpec, Specs y Backlog: ✅ COMPLETADA.** Subfases: 6.1 bootstrap de OpenSpec (**✅ completada**); 6.2 estrategia de partición de Specs y mapa de dependencias (**✅ completada**); 6.3 backlog maestro priorizado (**✅ completada**); 6.4 materialización y revisión de changes OpenSpec por olas (**✅ COMPLETADA**: 16/16 changes OpenSpec materializados, revisados, aprobados y validados con `--strict` (no aplicados, implementados, archivados ni sincronizados; 0 main specs); **Ola 1 ✅ MATERIALIZADA Y APROBADA**, **Ola 2 ✅ MATERIALIZADA Y APROBADA**, **Ola 3 ✅ MATERIALIZADA Y APROBADA** (**Ola 4 ✅ MATERIALIZADA Y APROBADA** (CHG-12, CHG-13, CHG-14 y CHG-15 ✅): CHG-12 `order-notes` **MATERIALIZADO Y APROBADO — pendiente de implementación en Fase 7** (DELTA SPECS: nueva capability `order-notes`; extiende `public-order-tracking` y `admin-order-management`; CHG-10 y CHG-11 deben archivarse antes); CHG-13 `order-data-correction` **MATERIALIZADO Y APROBADO — pendiente de implementación en Fase 7** (DELTA SPECS: extiende `admin-order-management`; CHG-10, CHG-11 y CHG-12 deben archivarse antes; sin capability nueva); **M4 — V1 funcional completa: COMPLETAMENTE ESPECIFICADA** (no implementada, ejecutada, probada ni desplegada); CHG-14 `security-hardening-pass` **MATERIALIZADO Y APROBADO — pendiente de ejecución/implementación en Fase 7** (SKIP_SPECS: sin capability ni delta specs; requiere M4 implementada, Production y resultados de AV-3 para ejecutarse en Fase 7); CHG-15 `release-readiness` **MATERIALIZADO Y APROBADO — pendiente de ejecución/implementación en Fase 7** (SKIP_SPECS: sin capability ni delta specs; requiere CHG-14 completado, Production, CHG-07 y resultados de AV-3 para ejecutarse en Fase 7); **16/16 changes materializados**; **M5 — V1 lista para evaluación y despliegue: completamente planificado, pendiente de ejecución en Fase 7 (NO alcanzado)**; `VAL-04` sigue abierto; a nivel de planificación OpenSpec, **M3 — `E2E-01` queda completamente especificado por CHG-10 + CHG-11**, sin que ninguna prueba se haya ejecutado) (CHG-08 `admin-access` **MATERIALIZADO Y APROBADO — pendiente de implementación en Fase 7**, DELTA SPECS: nueva capability `admin-access`; CHG-09a `admin-order-directory` **MATERIALIZADO Y APROBADO — pendiente de implementación en Fase 7** (DELTA SPECS: nueva capability `admin-order-management`, `repair-lifecycle`, `diagnosis-and-estimate`); CHG-09b `admin-order-detail` **MATERIALIZADO Y APROBADO — pendiente de implementación en Fase 7** (DELTA SPECS: extiende `admin-order-management`; CHG-09a debe archivarse antes); CHG-10 `repair-status-lifecycle` **MATERIALIZADO Y APROBADO — pendiente de implementación en Fase 7** (DELTA SPECS: nueva capability `repair-lifecycle`; extiende `public-order-tracking` y `admin-order-management`; CHG-06, CHG-09a y CHG-09b deben archivarse antes); CHG-11 `diagnosis-and-estimate` **MATERIALIZADO Y APROBADO — pendiente de implementación en Fase 7** (DELTA SPECS: nueva capability `diagnosis-and-estimate`; extiende `admin-order-management` y `public-order-tracking`; CHG-10 debe archivarse antes)); CHG-05 `repair-request-registration` **MATERIALIZADO Y APROBADO — pendiente de implementación en Fase 7** (DELTA SPECS: `repair-request-registration` y `public-order-tracking`, `admin-access`, `admin-order-management`, `repair-lifecycle`, `diagnosis-and-estimate`); CHG-06 `public-order-tracking` **MATERIALIZADO Y APROBADO — pendiente de implementación en Fase 7** (DELTA SPECS: extiende `public-order-tracking`; CHG-05 debe archivarse antes); CHG-07 `production-environment-baseline` **MATERIALIZADO Y APROBADO — pendiente de implementación en Fase 7** (SKIP_SPECS); CHG-01 `application-skeleton` **MATERIALIZADO Y APROBADO — pendiente de implementación en Fase 7**; CHG-02 `persistence-foundation` **MATERIALIZADO Y APROBADO — pendiente de implementación en Fase 7**; CHG-03 `ci-quality-gates` **MATERIALIZADO Y APROBADO — pendiente de implementación en Fase 7**; CHG-04 `ui-foundation-and-public-entry` **MATERIALIZADO Y APROBADO — pendiente de implementación en Fase 7** (primer change con DELTA SPECS: `public-site-entry`)); 6.5 gate de cobertura (PRD + DESIGN + Technical Design + ADRs → Specs/backlog) (**✅ COMPLETADA Y APROBADA**: primera pasada FAIL → corrective pass completado → segunda auditoría PASS WITH NON-BLOCKING CLEANUP, revisión formal APROBADA; 16/16 changes, 8/8 capabilities, 9/9 pantallas, SC 20/20 y E 17/17 especificados/planificados (no ejecutados), R1–R8 verificadas; informe en `docs/04-planificacion/PHASE-6.5-COVERAGE-GATE.md`). **Fase 7 — Implementación: INICIADA — Etapa 7.0, Architecture Validation Gate** (AV-2 Early ESM Precheck ✅ PASS; AV-1 Framework / Security ✅ PASS; AV-2 Full Persistence ✅ PASS (14/14; proyecto Neon temporal eliminado por el propietario); AV-3 Deployment Integration — DEFERRED UNTIL CHG-07; **local Architecture Validation Gates ✅ COMPLETED**; evidencia en `docs/03-arquitectura/validation/`; implementación NO INICIADA, ningún change aplicado; CHG-01 técnicamente listo para prepararse, prerequisito AV de CHG-02 satisfecho; sin autorización de `/opsx:apply` para otros changes; **Fase 7 — EN CURSO; M0 — ✅ COMPLETADO** (CHG-01…04 archivados; AV-3 sigue diferido a CHG-07): **CHG-01 `application-skeleton` ✅ IMPLEMENTED ✅ VERIFIED ✅ ARCHIVED** (28/28 tareas, 92/92 pruebas, lint/typecheck/build en verde bajo Node 24; archivado en `openspec/changes/archive/2026-10-27-application-skeleton/`, sin main specs); **CHG-02 `persistence-foundation` — ✅ IMPLEMENTED ✅ VERIFIED ✅ ARCHIVED (43/43 tareas, 2026-10-28; archivado en `openspec/changes/archive/2026-10-28-persistence-foundation/`, sin main specs)** (dependencias aprobadas e instaladas con versión exacta, Prisma 7.10.1; OQ-14 = proyecto Neon propio con ramas `main`/`development`/`test`; esquema, migración inicial, privilegios, transacción, bloqueo de fila, limitador y harness de integración implementados y verificados: lint, typecheck, 139 pruebas unitarias, 67 de integración sobre la rama `test` y build en verde; `main` de Neon intacta). 5.2 y 10.1 cerradas con las credenciales reales del usuario. **CHG-03 `ci-quality-gates` — ✅ IMPLEMENTED ✅ VERIFIED ✅ ARCHIVED (34/34, 2026-10-28; `openspec/changes/archive/2026-10-28-ci-quality-gates/`).** CI real verificado en la PR #1 (`chg-03-ci-verification`, sin fusionar): `static` y `db-tests` en verde, cola de `db-tests`, Environment `test` con secretos de test, `main` protegida. **CHG-05 `repair-request-registration`: ✅ IMPLEMENTED ✅ VERIFIED ✅ ARCHIVED (16/16, 2026-10-28; registro público PUB-02/PUB-03; specs `repair-request-registration` y `public-order-tracking` sincronizadas; PR #3). CHG-06 `public-order-tracking`: ✅ IMPLEMENTED ✅ VERIFIED ✅ ARCHIVED (19/19, 2026-10-28; consulta pública PUB-04/PUB-05; la main spec `public-order-tracking` pasa de 4 a 14 requisitos; PR #4). CHG-13 `order-data-correction`: ✅ IMPLEMENTED ✅ VERIFIED ✅ ARCHIVED (17/17; «Editar datos» en ADM-04: corrección conjunta y atómica de siete campos con las mismas validaciones del registro, versión de la orden (`STALE_ORDER`, invalida E11 solo si es efectiva), no-op observable, `customer_name_search` recalculado en la misma sentencia, código inmutable, sin historial; extiende la main spec `admin-order-management` y completa SC-09 y M4: V1 funcional completa e implementada). CHG-12 `order-notes`: ✅ IMPLEMENTED ✅ VERIFIED ✅ ARCHIVED (18/18; notas públicas e internas en ADM-04 con compositor por bloque, edición y eliminación físicas sin diálogo ni historial, versión propia de la nota (`STALE_NOTE`), bloqueo de la fila de la orden con `SELECT … FOR UPDATE` que serializa con el cierre (`ORDER_CLOSED`), notas públicas en PUB-05 con proyección explícita `visibility = PUBLIC`, frase E14 en el diálogo de cancelación; nace la main spec `order-notes` y se extienden `public-order-tracking` y `admin-order-management`). CHG-11 `diagnosis-and-estimate`: ✅ IMPLEMENTED ✅ VERIFIED ✅ ARCHIVED (21/21; diagnóstico y costo estimado editables hasta En diagnóstico con guardados independientes, dinero exacto con BigInt/NUMERIC, historiales atómicos, congelamiento desde Esperando aprobación, publicación derivada del estado con proyección pública condicionada en SQL, resumen real del diálogo E11 #1; cierra E2E-01 y el ciclo de SC-04; nace la main spec `diagnosis-and-estimate`). CHG-10 `repair-status-lifecycle`: ✅ IMPLEMENTED ✅ VERIFIED ✅ ARCHIVED (18/18; máquina de estados V1: 10 transiciones válidas y 54 rechazadas, cancelación y estados finales, cuatro confirmaciones E11 comprobadas por el servidor, concurrencia optimista por versión, cambio atómico orden+historial, acciones y diálogos en ADM-04; nace la main spec `repair-lifecycle` y se extienden `public-order-tracking` y `admin-order-management`; el avance a Esperando aprobación sigue bloqueado hasta CHG-11). CHG-09b `admin-order-detail`: ✅ IMPLEMENTED ✅ VERIFIED ✅ ARCHIVED (18/18; detalle administrativo ADM-04 en solo lectura: ruta `/admin/ordenes/[id]`, Repair Journey compartido, bloques Público/Interno, historial de estados, navegación desde panel y directorio; extiende la main spec `admin-order-management`; sin mutaciones). CHG-09a `admin-order-directory`: ✅ IMPLEMENTED ✅ VERIFIED ✅ ARCHIVED (18/18; dashboard ADM-02 y directorio ADM-03: conteos por estado, cinco recientes, búsqueda por código exacto o nombre parcial, filtro, paginación de 20; lecturas protegidas; nace la main spec `admin-order-management`; sin detalle de orden). CHG-08 `admin-access`: ✅ IMPLEMENTED ✅ VERIFIED ✅ ARCHIVED (24/24, 2026-10-29; acceso administrativo ADM-01: sesión opaca en PostgreSQL, `requireAdmin()`/`AdminContext`, cookie `__Host-`, CSP con nonce, limitador 5/15/15 con falla cerrada, logout y script `admin:provision`; main spec `admin-access`; sin Dashboard ni órdenes). CHG-07 `production-environment-baseline`: ✅ IMPLEMENTED ✅ VERIFIED ✅ ARCHIVED (28/28, 2026-10-28; Production sobre Neon `main` con `fixora_app`, migración inicial aplicada por `migrate-production`, smoke 12/12, rollback probado; AV-3 ✅ PASS con residuo de fuente de IP para CHG-14; ver `docs/09-deploy/PRODUCTION-ENVIRONMENT.md`). **La prioridad temporal del Presentation Preview 0 (CHG-04 visual, estático y sin persistencia) terminó con su despliegue; el desarrollo normal se retoma en CHG-02.** **CHG-04 `ui-foundation-and-public-entry`: ✅ IMPLEMENTED ✅ VERIFIED ✅ ARCHIVED** (24/24 tareas, 2026-10-28; verificado con Playwright sobre la base de CHG-03; spec `public-site-entry` sincronizada: primera main spec; accesos «Registrar», «Consultar» y «Acceso Taller» visibles pero `available = false` hasta CHG-05/06/08; P-3 rechazada y P-4 no aprobada). **Presentation Preview 0: ✅ DEPLOYED** — URL `https://fixora-rho-one.vercel.app` (dominio Production permanente del proyecto de Vercel, que se conservará durante todo el desarrollo y para FIXORA V1), commit desplegado `94ec074` (`feat: build presentation preview`), por la integración GitHub → Vercel desde `main`. **Este despliegue es un checkpoint PRESENTATION PREVIEW: NO es CHG-07 completo, ni la línea base de Production, ni AV-3, ni `SC-20`, ni un release.** La rama local `presentation-preview` se conserva solo como *snapshot* y no se publica. El despliegue futuro se clasificará como PRESENTATION PREVIEW, no como CHG-07, AV-3 ni `SC-20`; no hay Production (histórico del Preview).; 2 changes activos, 8 main specs: `public-site-entry`, `repair-request-registration`, `public-order-tracking`, `admin-access`, `admin-order-management`, `repair-lifecycle`, `diagnosis-and-estimate`, `order-notes`); empieza con el Architecture Validation Gate.

Mantén esta tabla actualizada (aquí y en `docs/README.md`) cuando una fase cambie de estado.

## Stack

**Presente hoy en el repositorio (CHG-01 implementado, verificado y archivado):** Next.js 16.4.3 (App Router, `src/`), React 19.3 y Tailwind CSS 4 en **TypeScript `strict` + ESM** (`"type": "module"`, Node 24.x vía `.nvmrc` y `engines`), con la estructura por capas `src/domain`, `src/application`, `src/infrastructure`, reglas de lint de capas y seguridad, logger cerrado, `instrumentation.ts`, `ActionResult`/`runAction` y Vitest (con `vite`, su peer obligatorio). CHG-02 (archivado) añade Prisma 7.10.1 + `@prisma/adapter-pg` + `pg` sobre Neon, el esquema V1, el limitador y el harness de integración; aún no hay CI ni Playwright.

**Aprobado arquitectónicamente (Technical Design + ADRs), aún NO instalado ni implementado:** TypeScript `strict`; Node 24.x como objetivo; PostgreSQL en Neon; Prisma ORM 7.x estable (nunca RC; no Prisma 8) con `@prisma/adapter-pg` + `pg`; Vitest y Playwright; GitHub Actions; despliegue en Vercel. Autenticación propia mínima con un único administrador. El detalle y las decisiones diferidas están en `docs/03-arquitectura/TECHNICAL-DESIGN.md`. Las dependencias se instalan solo con aprobación explícita en el momento, y no antes de ejecutar el Architecture Validation Gate.

**Restricción de entrega:** FIXORA V1 debe disponer de un despliegue público de demostración en Vercel (PRD §4.11, `SUP-10`).

**Proceso:** OpenSpec 1.15.0 (CLI global, herramienta de proceso: **no** es dependencia del proyecto ni va en `package.json`) está inicializado en `openspec/` con integración solo para Claude Code. Quedan 2 changes activos (materializados y aprobados, ninguno aplicado) y 8 main specs (`public-site-entry`, `repair-request-registration`, `public-order-tracking`, `admin-access`, `admin-order-management`, `repair-lifecycle`, `diagnosis-and-estimate`, `order-notes`); CHG-01…08, CHG-09a, CHG-09b, CHG-10, CHG-11, CHG-12 y CHG-13 están archivados.

## Workflow OpenSpec

Comandos de Claude Code generados por OpenSpec 1.15.0 (perfil `core`, esquema `spec-driven`): `/opsx:explore`, `/opsx:propose`, `/opsx:update`, `/opsx:apply`, `/opsx:sync`, `/opsx:archive`. Ciclo: **explore** (pensar, sin crear artefactos) → **propose** (crea el change con `proposal.md`, `specs/<capacidad>/spec.md` como delta, `design.md` y `tasks.md`; solo planificación) → **revisión y aprobación del usuario** (con `/opsx:update` para revisar los artefactos) → **apply** (implementa las tareas) → verificar (pruebas y revisión; el comando `verify` no está en el perfil actual) → **sync/archive** (fusiona los deltas en `openspec/specs/` y archiva).

- **Una propuesta OpenSpec no autoriza implementación automáticamente**, ni siquiera una propuesta aprobada implica permiso para ejecutar `/opsx:apply`: el usuario debe autorizar la implementación. Nunca saltes de una idea a `apply`: explorar si hace falta, proponer, revisar, obtener aprobación y solo entonces, con autorización explícita, aplicar. Las secciones `operations` de `openspec/config.yaml` son guardarraíles de comportamiento para el agente, no un mecanismo de cumplimiento técnico del CLI.
- OpenSpec es obligatorio para los cambios de implementación planificados desde la Fase 6. PRD, DESIGN, Technical Design y ADRs siguen siendo las fuentes de verdad; no se reabren decisiones cerradas en silencio.
- `openspec/config.yaml` es configuración del proyecto (editable). `.claude/skills/openspec-*` y `.claude/commands/opsx/` los gestiona OpenSpec (`openspec update`): no se editan a mano.
- No uses `--force`, no cambies la configuración global de OpenSpec ni añadas otras herramientas sin autorización.

## Comandos disponibles hoy

- `npm run dev` — servidor de desarrollo.
- `npm run build` — build de producción.
- `npm run start` — servidor de producción (requiere build).
- `npm run lint` — ESLint (incluye las reglas de capas y de seguridad).
- `npm run typecheck` — `tsc --noEmit`.
- `npm run test:unit` — Vitest, proyecto `unit` (pruebas unitarias, de reglas de lint y de scripts de CI).
- `npm run test:coverage` — proyecto `unit` con cobertura V8 selectiva (90 % líneas y ramas en `domain/`).
- `npm run test:e2e` — `next build` + `next start` + Playwright (`chromium-desktop`, `chromium-mobile`); `npm run test:e2e:install` instala el navegador.
- `npm run test:trace` — verifica `docs/07-testing/TRACEABILITY.md`.
- `npm run ci:secrets` / `ci:audit` / `ci:warm` — higiene de secretos, política de `npm audit` y calentamiento de Neon `test` (los usa `.github/workflows/ci.yml`).
- `npm run test:integration` — proyecto `integration` de Vitest contra PostgreSQL real en la rama Neon `test` (serial; la guardia anti-desastre aborta si falta `TEST_*` o el marcador).
- `npm run db:generate` — genera el cliente de Prisma (sin conexión; lo encadena `build`).
- `npm run db:migrate:dev` / `npm run db:migrate:deploy` — migraciones contra la rama que cargue `.env.local` (`development`); nunca contra `main`.

No inventes ni asumas otros comandos. Ejecuta todo bajo Node 24 (fnm: `fnm use 24`; el Node global del equipo puede seguir siendo 26).

## Reglas duras para Claude Code

1. **Consulta antes de implementar.** Antes de planificar código, lee los documentos relevantes de `docs/`, incluido el PRD aprobado (`docs/01-producto/PRD.md`).
2. **No inventes funcionalidades.** Implementa solo lo documentado y aprobado.
3. **Fuera de alcance = no se implementa silenciosamente.** Si algo parece necesario pero está fuera de alcance, detente y consúltalo.
4. **No modifiques decisiones aprobadas de producto en silencio.** Cualquier cambio se propone explícitamente y se refleja en el documento correspondiente.
5. **No conviertas supuestos en decisiones aprobadas.** Márcalos como supuestos.
6. **No corrijas riesgos aceptados en silencio.** Si encuentras uno, repórtalo; no lo "arregles" por tu cuenta.
7. **Verifica antes de dar por terminada una tarea de código:** ejecuta las verificaciones disponibles (`npm run lint`, `npm run build` y las que existan en el futuro) y reporta los resultados con honestidad, incluidos los fallos.
8. **No hagas commits ni push** salvo que se te pida.
9. **No agregues dependencias** sin necesidad justificada y aprobada.

## Reglas sobre decisiones arquitectónicas

- El **Technical Design está aprobado**: no inventes arquitectura que contradiga `docs/03-arquitectura/TECHNICAL-DESIGN.md` ni sus ADRs. Si una Spec o la implementación necesitan contradecir una decisión, detente y solicita revisión arquitectónica; no la adaptes en silencio.
- No implementes todavía la arquitectura aprobada (base de datos, ORM, autenticación, API, CI/CD, etc.): la Fase 5 ya está cerrada y OpenSpec está inicializado; faltan Backlog y Specs aprobadas, y después se ejecuta el Architecture Validation Gate (TD §29) al inicio de la Fase 7. No instales dependencias ni crees workflows sin aprobación explícita.
- Toda decisión arquitectónica importante futura debe quedar registrada mediante un **ADR** en `docs/03-arquitectura/adrs/`.
- Los cambios de comportamiento pasan por una **Spec** de OpenSpec, revisada y aprobada, antes de implementarse.
- Cuando la arquitectura quede definida, el **servidor será la fuente de verdad** de las reglas de negocio sensibles (transiciones de estado, separación público/interno, autorización); el cliente nunca es la única barrera.

## Reglas de seguridad

- **Nunca leas ni expongas archivos `.env` reales** (`.env`, `.env.local`, `.env.e2e`, `admin-credentials.local`, etc.). `.claude/settings.json` los bloquea; no intentes rodearlo.
- **Nunca guardes secretos en el repositorio**: ni en código, ni en docs, ni en ejemplos, ni en commits.
- `.env.example` solo documenta nombres de variables, sin valores reales.
- La información interna del taller (notas internas) nunca debe llegar a vistas ni respuestas públicas.
- Trata toda entrada de usuario como no confiable.
