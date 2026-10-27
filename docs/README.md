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
| 04 Backlog | `04-backlog/` | PENDIENTE (Fase 6.3) |
| 05 Specs | `openspec/specs/` | OpenSpec inicializado (Fase 6.1); Specs PENDIENTES. `openspec/specs/` es la ubicación canónica; no se mantiene copia paralela en `docs/05-specs/` |
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

**Fase 5 cerrada el 2026-10-26**: Technical Design aprobado, 10 ADRs aceptados, revisión adversarial completada (0 Critical, 0 High) y A-5 completado. El Architecture Validation Gate (TD §29) **no se ha ejecutado**; es el primer gate de la futura implementación. **Fase 6 — OpenSpec, Specs y Backlog: en curso.** 6.1 bootstrap de OpenSpec 1.15.0 completado (solo Claude Code; `openspec/`); pendientes 6.2 partición de Specs, 6.3 backlog maestro, 6.4 creación y revisión de Specs y 6.5 gate de cobertura. Aún no existen Specs, backlog ni implementación (Fase 7).

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
