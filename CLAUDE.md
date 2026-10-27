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
05 Specs        Fase 6 COMPLETADA (6.1–6.5 ✅): 16 changes activos materializados y aprobados, 0 main specs (las main specs nacen al implementar, verificar y archivar, en la Fase 7)
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
- Las Specs/OpenSpec (`openspec/`) convierten esas fuentes de verdad en unidades implementables; **no las reemplazan** ni se copian dentro de `openspec/specs/`. El Architecture Validation Gate (AV-1/2/3, TD §29) **no se ha ejecutado**: es el primer gate de la Fase 7 (implementación).

### Fases del plan maestro

Fases 0–4 cerradas (hasta `DESIGN.md`, incluidas la exploración UX y el sistema visual). **Fase 5 — Technical Design / Arquitectura: ✅ CERRADA el 2026-10-26** (Technical Design aprobado, ADR-001…010 aceptados, revisión adversarial completada con 0 Critical y 0 High, A-5 completado). No es una fase de implementación: no hay código de la arquitectura aprobada.

**Fase 6 — OpenSpec, Specs y Backlog: ✅ COMPLETADA.** Subfases: 6.1 bootstrap de OpenSpec (**✅ completada**); 6.2 estrategia de partición de Specs y mapa de dependencias (**✅ completada**); 6.3 backlog maestro priorizado (**✅ completada**); 6.4 materialización y revisión de changes OpenSpec por olas (**✅ COMPLETADA**: 16/16 changes OpenSpec materializados, revisados, aprobados y validados con `--strict` (no aplicados, implementados, archivados ni sincronizados; 0 main specs); **Ola 1 ✅ MATERIALIZADA Y APROBADA**, **Ola 2 ✅ MATERIALIZADA Y APROBADA**, **Ola 3 ✅ MATERIALIZADA Y APROBADA** (**Ola 4 ✅ MATERIALIZADA Y APROBADA** (CHG-12, CHG-13, CHG-14 y CHG-15 ✅): CHG-12 `order-notes` **MATERIALIZADO Y APROBADO — pendiente de implementación en Fase 7** (DELTA SPECS: nueva capability `order-notes`; extiende `public-order-tracking` y `admin-order-management`; CHG-10 y CHG-11 deben archivarse antes); CHG-13 `order-data-correction` **MATERIALIZADO Y APROBADO — pendiente de implementación en Fase 7** (DELTA SPECS: extiende `admin-order-management`; CHG-10, CHG-11 y CHG-12 deben archivarse antes; sin capability nueva); **M4 — V1 funcional completa: COMPLETAMENTE ESPECIFICADA** (no implementada, ejecutada, probada ni desplegada); CHG-14 `security-hardening-pass` **MATERIALIZADO Y APROBADO — pendiente de ejecución/implementación en Fase 7** (SKIP_SPECS: sin capability ni delta specs; requiere M4 implementada, Production y resultados de AV-3 para ejecutarse en Fase 7); CHG-15 `release-readiness` **MATERIALIZADO Y APROBADO — pendiente de ejecución/implementación en Fase 7** (SKIP_SPECS: sin capability ni delta specs; requiere CHG-14 completado, Production, CHG-07 y resultados de AV-3 para ejecutarse en Fase 7); **16/16 changes materializados**; **M5 — V1 lista para evaluación y despliegue: completamente planificado, pendiente de ejecución en Fase 7 (NO alcanzado)**; `VAL-04` sigue abierto; a nivel de planificación OpenSpec, **M3 — `E2E-01` queda completamente especificado por CHG-10 + CHG-11**, sin que ninguna prueba se haya ejecutado) (CHG-08 `admin-access` **MATERIALIZADO Y APROBADO — pendiente de implementación en Fase 7**, DELTA SPECS: nueva capability `admin-access`; CHG-09a `admin-order-directory` **MATERIALIZADO Y APROBADO — pendiente de implementación en Fase 7** (DELTA SPECS: nueva capability `admin-order-management`); CHG-09b `admin-order-detail` **MATERIALIZADO Y APROBADO — pendiente de implementación en Fase 7** (DELTA SPECS: extiende `admin-order-management`; CHG-09a debe archivarse antes); CHG-10 `repair-status-lifecycle` **MATERIALIZADO Y APROBADO — pendiente de implementación en Fase 7** (DELTA SPECS: nueva capability `repair-lifecycle`; extiende `public-order-tracking` y `admin-order-management`; CHG-06, CHG-09a y CHG-09b deben archivarse antes); CHG-11 `diagnosis-and-estimate` **MATERIALIZADO Y APROBADO — pendiente de implementación en Fase 7** (DELTA SPECS: nueva capability `diagnosis-and-estimate`; extiende `admin-order-management` y `public-order-tracking`; CHG-10 debe archivarse antes)); CHG-05 `repair-request-registration` **MATERIALIZADO Y APROBADO — pendiente de implementación en Fase 7** (DELTA SPECS: `repair-request-registration` y `public-order-tracking`); CHG-06 `public-order-tracking` **MATERIALIZADO Y APROBADO — pendiente de implementación en Fase 7** (DELTA SPECS: extiende `public-order-tracking`; CHG-05 debe archivarse antes); CHG-07 `production-environment-baseline` **MATERIALIZADO Y APROBADO — pendiente de implementación en Fase 7** (SKIP_SPECS); CHG-01 `application-skeleton` **MATERIALIZADO Y APROBADO — pendiente de implementación en Fase 7**; CHG-02 `persistence-foundation` **MATERIALIZADO Y APROBADO — pendiente de implementación en Fase 7**; CHG-03 `ci-quality-gates` **MATERIALIZADO Y APROBADO — pendiente de implementación en Fase 7**; CHG-04 `ui-foundation-and-public-entry` **MATERIALIZADO Y APROBADO — pendiente de implementación en Fase 7** (primer change con DELTA SPECS: `public-site-entry`)); 6.5 gate de cobertura (PRD + DESIGN + Technical Design + ADRs → Specs/backlog) (**✅ COMPLETADA Y APROBADA**: primera pasada FAIL → corrective pass completado → segunda auditoría PASS WITH NON-BLOCKING CLEANUP, revisión formal APROBADA; 16/16 changes, 8/8 capabilities, 9/9 pantallas, SC 20/20 y E 17/17 especificados/planificados (no ejecutados), R1–R8 verificadas; informe en `docs/04-planificacion/PHASE-6.5-COVERAGE-GATE.md`). **Fase 7 — Implementación: NO INICIADA**; empieza con el Architecture Validation Gate, que **no se ha ejecutado**.

Mantén esta tabla actualizada (aquí y en `docs/README.md`) cuando una fase cambie de estado.

## Stack

**Presente hoy en el repositorio (scaffold):** Next.js 16.4.3 (App Router, `src/`), React 19.3 y Tailwind CSS 4, en JavaScript. Nada más está instalado.

**Aprobado arquitectónicamente (Technical Design + ADRs), aún NO instalado ni implementado:** TypeScript `strict`; Node 24.x como objetivo; PostgreSQL en Neon; Prisma ORM 7.x estable (nunca RC; no Prisma 8) con `@prisma/adapter-pg` + `pg`; Vitest y Playwright; GitHub Actions; despliegue en Vercel. Autenticación propia mínima con un único administrador. El detalle y las decisiones diferidas están en `docs/03-arquitectura/TECHNICAL-DESIGN.md`. Las dependencias se instalan solo con aprobación explícita en el momento, y no antes de ejecutar el Architecture Validation Gate.

**Restricción de entrega:** FIXORA V1 debe disponer de un despliegue público de demostración en Vercel (PRD §4.11, `SUP-10`).

**Proceso:** OpenSpec 1.15.0 (CLI global, herramienta de proceso: **no** es dependencia del proyecto ni va en `package.json`) está inicializado en `openspec/` con integración solo para Claude Code. Existen 16 changes activos (materializados y aprobados, ninguno aplicado) y 0 main specs.

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
- `npm run lint` — ESLint.

No existen aún scripts de test, typecheck ni base de datos. No inventes ni asumas otros comandos.

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
