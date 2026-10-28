# Documentación de FIXORA — Pipeline AI-First

FIXORA se construye con una metodología AI-First: primero se documenta y se decide, después se implementa. Los documentos forman una cadena en la que **cada artefacto consume el anterior** y debe ser coherente con él. Si un documento posterior contradice a uno anterior, se corrige el posterior o se actualiza el anterior de forma explícita y trazable; nunca se resuelve en silencio.

## Pipeline

```
00 Definición
→ 01 PRD
→ 02 Diseño
→ 03 Technical Design + ADRs
→ revisión adversarial
→ 04 Backlog
→ 05 Spec + Tasks / OpenSpec
→ código
→ code review
→ diagramas
→ testing
→ security pass
→ deploy + CI/CD
```

## Estado actual

| Fase | Carpeta | Estado |
|---|---|---|
| 00 Definición | `00-definicion/` | COMPLETADO |
| 01 PRD | `01-producto/` | COMPLETADO |
| 02 Diseño | `02-diseno/` | COMPLETADO — Exploración UX + sistema visual (`DESIGN.md` aprobado) |
| 03 Arquitectura | `03-arquitectura/` | Área de la **Fase 5 — Technical Design / Arquitectura**: CERRADA el 2026-10-26 (Technical Design aprobado y ADR-001…010 aceptados) |
| 04 Backlog / planificación | `04-planificacion/` | CERRADO (Fase 6.3): estrategia `OPENSPEC-STRATEGY.md` y backlog maestro `BACKLOG.md` aprobados. La carpeta `04-backlog/` se eliminó; no hay estructura paralela |
| 05 Specs | `openspec/specs/` | Fase 6 COMPLETADA: 16 changes materializados y aprobados (CHG-01 ya archivado: 15 activos); 1 main spec (`public-site-entry`; el resto nace al implementar, verificar y archivar). `openspec/specs/` es la ubicación canónica; no se mantiene copia paralela en `docs/05-specs/` |
| 06 Diagramas | `06-diagramas/` | PENDIENTE |
| 07 Testing | `07-testing/` | PENDIENTE |
| 08 Seguridad | `08-seguridad/` | PENDIENTE |
| 09 Deploy | `09-deploy/` | PENDIENTE |

Entregable aprobado de la fase 01: `01-producto/PRD.md` (aprobado el 2026-10-25). Es la fuente de verdad funcional de FIXORA V1.

Fase 02 Diseño completada (exploración UX con Google Stitch + sistema visual con Claude Design). Entregables en `02-diseno/`:

- `STITCH-BRIEF.md` — briefing UX derivado del PRD.
- `UX-EXPLORATION.md` — exploración A/B/C, Dirección UX Consolidada, pantallas, navegación y estados. Fuente de verdad de estructura UX/navegación.
- `DESIGN-BRIEF.md` — contexto controlado entregado a Claude Design (insumo histórico).
- `DESIGN.md` — **fuente de verdad visual y de detalle UX/UI** (aprobado 2026-10-26): sistema visual, componentes, patrones y decisiones de diseño. No sustituye al PRD en reglas funcionales.
- `referencias/` — capturas de Stitch (`stitch/`) y sistema visual de Claude Design (`claude-design/`); referencias, no fuente de requisitos.

Jerarquía: PRD > UX-EXPLORATION > DESIGN.md > referencias.

**Fase 5 — Technical Design / Arquitectura** (área documental: `03-arquitectura/`) — entregables:

- [`TECHNICAL-DESIGN.md`](03-arquitectura/TECHNICAL-DESIGN.md) — **fuente de verdad técnica y arquitectónica** (aprobado). La revisión adversarial y sus correcciones están completadas.
- [`adrs/`](03-arquitectura/adrs/) — ADR-001 … ADR-010 (todos Aceptados): razonamiento y alternativas de las decisiones del Technical Design. Índice en TD §33.

**Fase 5 cerrada el 2026-10-26**: Technical Design aprobado, 10 ADRs aceptados, revisión adversarial completada (0 Critical, 0 High) y A-5 completado. El Architecture Validation Gate (TD §29) es el primer gate de la Fase 7: AV-1 y AV-2 ✅ PASS (ver `03-arquitectura/validation/`); AV-3 diferido hasta CHG-07. **Fase 6 — OpenSpec, Specs y Backlog: en curso.** 6.1 bootstrap de OpenSpec 1.15.0 completado (solo Claude Code; `openspec/`); pendientes 6.2 partición de Specs, 6.3 backlog maestro, 6.4 creación y revisión de Specs y 6.5 gate de cobertura. Aún no existen Specs, backlog ni implementación (Fase 7).

**Fase 6 — OpenSpec, Specs y Backlog** (✅ COMPLETADA): **6.1 ✅** (bootstrap de OpenSpec 1.15.0) · **6.2 ✅** (estrategia de partición, cerrada el 2026-10-27) · **6.3 ✅** (backlog maestro priorizado, cerrada el 2026-10-27: [`04-planificacion/BACKLOG.md`](04-planificacion/BACKLOG.md)) · **6.4 ✅ COMPLETADA** (16/16 changes materializados, revisados, aprobados y validados con `--strict`; no aplicados ni archivados; 0 main specs; materialización y revisión de changes OpenSpec por olas: **Ola 1 ✅ MATERIALIZADA Y APROBADA**, **Ola 2 ✅ MATERIALIZADA Y APROBADA**, **Ola 3 ✅ MATERIALIZADA Y APROBADA** (**Ola 4 ✅ MATERIALIZADA Y APROBADA** (CHG-12, CHG-13, CHG-14 y CHG-15 ✅): CHG-12 `order-notes` **MATERIALIZADO Y APROBADO — pendiente de implementación en Fase 7** (DELTA SPECS: nueva capability `order-notes`; extiende `public-order-tracking` y `admin-order-management`; CHG-10 y CHG-11 deben archivarse antes); CHG-13 `order-data-correction` **MATERIALIZADO Y APROBADO — pendiente de implementación en Fase 7** (DELTA SPECS: extiende `admin-order-management`; CHG-10, CHG-11 y CHG-12 deben archivarse antes; sin capability nueva); **M4 — V1 funcional completa: COMPLETAMENTE ESPECIFICADA** (no implementada, ejecutada, probada ni desplegada); CHG-14 `security-hardening-pass` **MATERIALIZADO Y APROBADO — pendiente de ejecución/implementación en Fase 7** (SKIP_SPECS: sin capability ni delta specs; requiere M4 implementada, Production y resultados de AV-3 para ejecutarse en Fase 7); CHG-15 `release-readiness` **MATERIALIZADO Y APROBADO — pendiente de ejecución/implementación en Fase 7** (SKIP_SPECS: sin capability ni delta specs; requiere CHG-14 completado, Production, CHG-07 y resultados de AV-3 para ejecutarse en Fase 7); **16/16 changes materializados**; **M5 — V1 lista para evaluación y despliegue: completamente planificado, pendiente de ejecución en Fase 7 (NO alcanzado)**; `VAL-04` sigue abierto; a nivel de planificación OpenSpec, **M3 — `E2E-01` queda completamente especificado por CHG-10 + CHG-11**, sin que ninguna prueba se haya ejecutado) (CHG-08 `admin-access` **MATERIALIZADO Y APROBADO — pendiente de implementación en Fase 7**, DELTA SPECS: nueva capability `admin-access`; CHG-09a `admin-order-directory` **MATERIALIZADO Y APROBADO — pendiente de implementación en Fase 7** (DELTA SPECS: nueva capability `admin-order-management`); CHG-09b `admin-order-detail` **MATERIALIZADO Y APROBADO — pendiente de implementación en Fase 7** (DELTA SPECS: extiende `admin-order-management`; CHG-09a debe archivarse antes); CHG-10 `repair-status-lifecycle` **MATERIALIZADO Y APROBADO — pendiente de implementación en Fase 7** (DELTA SPECS: nueva capability `repair-lifecycle`; extiende `public-order-tracking` y `admin-order-management`; CHG-06, CHG-09a y CHG-09b deben archivarse antes); CHG-11 `diagnosis-and-estimate` **MATERIALIZADO Y APROBADO — pendiente de implementación en Fase 7** (DELTA SPECS: nueva capability `diagnosis-and-estimate`; extiende `admin-order-management` y `public-order-tracking`; CHG-10 debe archivarse antes)); CHG-05 `repair-request-registration` **MATERIALIZADO Y APROBADO — pendiente de implementación en Fase 7** (DELTA SPECS: `repair-request-registration` y `public-order-tracking`); CHG-06 `public-order-tracking` **MATERIALIZADO Y APROBADO — pendiente de implementación en Fase 7** (DELTA SPECS: extiende `public-order-tracking`; CHG-05 debe archivarse antes); CHG-07 `production-environment-baseline` **MATERIALIZADO Y APROBADO — pendiente de implementación en Fase 7** (SKIP_SPECS); CHG-01 `application-skeleton` **MATERIALIZADO Y APROBADO — pendiente de implementación en Fase 7**; CHG-02 `persistence-foundation` **MATERIALIZADO Y APROBADO — pendiente de implementación en Fase 7**; CHG-03 `ci-quality-gates` **MATERIALIZADO Y APROBADO — pendiente de implementación en Fase 7**; CHG-04 `ui-foundation-and-public-entry` **MATERIALIZADO Y APROBADO — pendiente de implementación en Fase 7** (primer change con DELTA SPECS: `public-site-entry`)) · **6.5 ✅ COMPLETADA Y APROBADA** (Coverage & Consistency Gate: primera pasada FAIL → corrective pass completado → segunda auditoría PASS WITH NON-BLOCKING CLEANUP, revisión formal APROBADA; Fase 7 INICIADA (Etapa 7.0: AV-2 Early ESM Precheck ✅ PASS, AV-1 ✅ PASS, AV-2 Full Persistence ✅ PASS (14/14; proyecto Neon temporal eliminado por el propietario), AV-3 DEFERRED UNTIL CHG-07; local Architecture Validation Gates ✅ COMPLETED; Fase 7 EN CURSO · M0 IN PROGRESS · CHG-01 `application-skeleton` ✅ IMPLEMENTED ✅ VERIFIED ✅ ARCHIVED (`openspec/changes/archive/2026-10-27-application-skeleton/`) · CHG-02 `persistence-foundation` ✅ IMPLEMENTED ✅ VERIFIED ✅ ARCHIVED (43/43; `openspec/changes/archive/2026-10-28-persistence-foundation/`). CHG-03 `ci-quality-gates` ✅ IMPLEMENTED ✅ VERIFIED ✅ ARCHIVED (34/34; PR #1 de verificación sin fusionar). CHG-04 `ui-foundation-and-public-entry` ✅ IMPLEMENTED ✅ VERIFIED ✅ ARCHIVED (24/24; M0 completado). Siguiente: CHG-05. CHG-04 `ui-foundation-and-public-entry`: PRESENTATION PREVIEW IMPLEMENTED (12/24 tareas; verificación formal pendiente de CHG-03/Playwright; no archivado). Presentation Preview 0: ✅ DEPLOYED en https://fixora-rho-one.vercel.app (commit `94ec074`; checkpoint PRESENTATION PREVIEW, no CHG-07 completo, ni línea base de Production, ni AV-3, ni `SC-20`; la rama local `presentation-preview` es solo un *snapshot*) · 12 changes activos, 1 main spec (`public-site-entry`); evidencia en [`03-arquitectura/validation/`](03-arquitectura/validation/); implementación NO INICIADA); informe en [`04-planificacion/PHASE-6.5-COVERAGE-GATE.md`](04-planificacion/PHASE-6.5-COVERAGE-GATE.md)). [`04-planificacion/OPENSPEC-STRATEGY.md`](04-planificacion/OPENSPEC-STRATEGY.md) es **planificación del proyecto, no una fuente canónica de Specs**; cuando existan Specs vigentes, `openspec/specs/` seguirá siendo la fuente canónica. `04-planificacion/` es la ubicación canónica de la planificación de la Fase 6.

## Mapa de documentos y su rol

| Nivel | Documento | Rol |
|---|---|---|
| Definición | `00-definicion/PROJECT-BRIEF.md` | Punto de partida: decisiones aprobadas de producto |
| Producto | `01-producto/PRD.md` | **Qué** debe hacer el producto (fuente de verdad funcional) |
| Diseño | `02-diseno/STITCH-BRIEF.md` | Insumo histórico de la exploración UX |
| Diseño | `02-diseno/UX-EXPLORATION.md` | Exploración UX y estructura/navegación aprobadas |
| Diseño | `02-diseno/DESIGN-BRIEF.md` | Insumo histórico entregado a Claude Design, consolidado por `DESIGN.md` |
| Diseño | `02-diseno/DESIGN.md` | **Experiencia** y sistema visual (fuente de verdad UX/UI) |
| Diseño | `02-diseno/referencias/` | Capturas de Stitch y sistema visual de Claude Design; solo referencia |
| Arquitectura | `03-arquitectura/TECHNICAL-DESIGN.md` | **Cómo** se construye (fuente de verdad técnica) |
| Arquitectura | `03-arquitectura/adrs/ADR-001…010` | **Por qué**: razonamiento y alternativas |
| Planificación | `04-planificacion/OPENSPEC-STRATEGY.md`, `04-planificacion/BACKLOG.md` | Estrategia de partición y backlog maestro (ambos cerrados). Planificación, no Specs |
| Specs / OpenSpec | `openspec/specs/` y `openspec/changes/` | Detalle implementable de cambios concretos (inicializado en la Fase 6.1; aún sin Specs). Ubicación canónica: no hay copia en `docs/05-specs/` |

## Qué consume cada fase

- **00 Definición** — `PROJECT-BRIEF.md`: decisiones aprobadas de producto. Punto de partida.
- **01 PRD** — consume la definición; fija requisitos de producto. Aprobado: es la fuente de verdad funcional de V1.
- **02 Diseño** — consume el PRD; define experiencia (exploración UX) y sistema visual (`DESIGN.md`). Completada.
- **03 Arquitectura** — consume PRD y diseño; contiene el Technical Design y los ADRs. Aquí se aprobaron las tecnologías antes provisionales. Fue seguido de una revisión adversarial (completada). Fase 5 cerrada.
- **04 Backlog** — consume PRD, diseño y arquitectura; descompone el trabajo.
- **05 Specs** — consume el backlog; especificación y tareas (con OpenSpec, ya inicializado). Todo cambio de comportamiento pasa por una spec antes del código.
- **06 Diagramas** — documentan lo implementado y revisado.
- **07 Testing** — estrategia y evidencia de pruebas, derivadas de las specs.
- **08 Seguridad** — Security Pass sobre el sistema construido.
- **09 Deploy** — despliegue y CI/CD.

## Reglas

- No se avanza a código funcional hasta que existan los documentos de los que depende.
- Las decisiones de arquitectura importantes se registran como ADR.
- Los supuestos no son decisiones aprobadas hasta que un documento los apruebe.
- Las carpetas vacías se conservan con `.gitkeep`; se puede retirar al añadir el primer documento.
