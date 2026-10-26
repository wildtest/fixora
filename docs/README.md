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
| 02 Diseño | `02-diseno/` | EN CURSO — Exploración UX COMPLETADA; sistema visual PENDIENTE |
| 03 Arquitectura | `03-arquitectura/` | PENDIENTE |
| 04 Backlog | `04-backlog/` | PENDIENTE |
| 05 Specs | `05-specs/` | PENDIENTE |
| 06 Diagramas | `06-diagramas/` | PENDIENTE |
| 07 Testing | `07-testing/` | PENDIENTE |
| 08 Seguridad | `08-seguridad/` | PENDIENTE |
| 09 Deploy | `09-deploy/` | PENDIENTE |

Entregable aprobado de la fase 01: `01-producto/PRD.md` (aprobado el 2026-10-25). Es la fuente de verdad funcional de FIXORA V1.

Fase 02 Diseño — Exploración UX (Google Stitch) completada. Entregables en `02-diseno/`:

- `STITCH-BRIEF.md` — briefing UX derivado del PRD.
- `UX-EXPLORATION.md` — exploración A/B/C, Dirección UX Consolidada, pantallas, navegación y estados. Es la fuente de verdad de estructura UX/navegación.
- `evidencias/stitch/` — capturas de la exploración (evidencia; no fuente de requisitos).

Siguiente paso: Claude Design + sistema visual (pendiente; también se archivará en `02-diseno/`).

## Qué consume cada fase

- **00 Definición** — `PROJECT-BRIEF.md`: decisiones aprobadas de producto. Punto de partida.
- **01 PRD** — consume la definición; fija requisitos de producto. Aprobado: es la fuente de verdad funcional de V1.
- **02 Diseño** — consume el PRD; define experiencia (exploración UX, completada) y sistema visual (pendiente).
- **03 Arquitectura** — consume PRD y diseño; contiene el Technical Design y los ADRs. Aquí se aprueban (o descartan) las tecnologías provisionales. Va seguido de una revisión adversarial.
- **04 Backlog** — consume PRD, diseño y arquitectura; descompone el trabajo.
- **05 Specs** — consume el backlog; especificación y tareas (OpenSpec cuando se incorpore). Todo cambio de comportamiento pasa por una spec antes del código.
- **06 Diagramas** — documentan lo implementado y revisado.
- **07 Testing** — estrategia y evidencia de pruebas, derivadas de las specs.
- **08 Seguridad** — Security Pass sobre el sistema construido.
- **09 Deploy** — despliegue y CI/CD.

## Reglas

- No se avanza a código funcional hasta que existan los documentos de los que depende.
- Las decisiones de arquitectura importantes se registran como ADR.
- Los supuestos no son decisiones aprobadas hasta que un documento los apruebe.
- Las carpetas vacías se conservan con `.gitkeep`; se puede retirar al añadir el primer documento.
