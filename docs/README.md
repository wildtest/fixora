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
→ release readiness
```

## Estado actual

**FIXORA V1 completa y desplegada como demostración académica** (`https://fixora-rho-one.vercel.app`). Fases 0 a 14 completadas técnicamente; **Fase 15 (README, portfolio y auditoría final) en cierre**. OpenSpec: **0 changes activos y 8 specs canónicas** (`public-site-entry`, `repair-request-registration`, `public-order-tracking`, `admin-access`, `admin-order-management`, `repair-lifecycle`, `diagnosis-and-estimate`, `order-notes`). La V1 **no** está aprobada para operación real: `VAL-04` sigue abierta.

| Fase | Carpeta | Estado |
|---|---|---|
| 00 Definición | `00-definicion/` | ✅ Completada |
| 01 PRD | `01-producto/` | ✅ Completada — aprobado el 2026-10-25; fuente de verdad funcional |
| 02 Diseño | `02-diseno/` | ✅ Completada — exploración UX (Stitch) y sistema visual (Claude Design); `DESIGN.md` aprobado el 2026-10-26 |
| 03 Arquitectura | `03-arquitectura/` | ✅ Completada — Technical Design aprobado, ADR-001…010 aceptados, revisión adversarial sin Critical ni High; cerrada el 2026-10-26; Architecture Validation Gates AV-1, AV-2 y AV-3 en PASS |
| 04 Backlog / planificación | `04-planificacion/` | ✅ Completada — `OPENSPEC-STRATEGY.md`, `BACKLOG.md` y gate de cobertura de la Fase 6.5 |
| 05 Specs | `openspec/` | ✅ Completada — 16 changes (CHG-01…CHG-15) implementados, verificados y archivados, más 2 mejoras visuales posteriores de la landing; 8 specs canónicas en `openspec/specs/`. No hay copia paralela en `docs/05-specs/` |
| Implementación | `src/`, `prisma/`, `tests/` | ✅ Completada — V1 funcional (hitos M0…M5) |
| 06 Diagramas | `06-diagramas/` | ✅ Índice de diagramas, flujo CI/CD y pipeline AI-First; el resto vive en el Technical Design |
| 07 Testing | `07-testing/` | ✅ Implementado — [CI-QUALITY-GATES.md](07-testing/CI-QUALITY-GATES.md), [TRACEABILITY.md](07-testing/TRACEABILITY.md) (37/37 verificados), [SC-15-RESPONSIVE-REVIEW.md](07-testing/SC-15-RESPONSIVE-REVIEW.md) |
| 08 Seguridad | `08-seguridad/` | ✅ Implementado — [SECURITY-REPORT.md](08-seguridad/SECURITY-REPORT.md): 0 Critical y 0 High |
| 09 Deploy | `09-deploy/` | ✅ Implementado — Production en Vercel + Neon, CI/CD, `migrate-production`, runbooks y [RELEASE-READINESS.md](09-deploy/RELEASE-READINESS.md): listo para evaluación académica / demo |
| 15 README, portfolio y auditoría final | `README.md` | 🟡 En cierre — ver el detalle de la Fase 15 más abajo; **solo falta la auditoría académica final 5/5** |

**Fase 15 — estado de sus entregables:**

| Entregable | Estado |
|---|---|
| README final | ✅ COMPLETE |
| Diagramas | ✅ COMPLETE (`06-diagramas/DIAGRAMAS.md` y Mermaid del Technical Design) |
| Badges | ✅ COMPLETE |
| Capturas | ✅ COMPLETE — las seis capturas finales (`docs/assets/screenshots/`) se generaron, revisaron e incorporaron al README |
| URL de Production | ✅ COMPLETE (`https://fixora-rho-one.vercel.app`) |
| GitHub portfolio | ✅ COMPLETE (repositorio público con descripción, sitio web y topics) |
| Auditoría académica final 5/5 | ⏳ PENDING |
| LICENSE | Sin licencia seleccionada; decisión de la persona propietaria diferida. No se requiere para la entrega académica / demo |

La Fase 15 **no** se marca completa hasta cerrar la auditoría académica final.

Cifras vigentes de calidad (2026-10-31, tras la revisión final): 621 pruebas unitarias, 263 de integración, E2E completa en GitHub CI, cobertura de `domain/` 100 % de líneas y 97,43 % de ramas, trazabilidad 37/37. Los informes de cada fase conservan sus propias cifras como evidencia **fechada**; no son el estado actual.

## Mapa de documentos y su rol

| Nivel | Documento | Rol |
|---|---|---|
| Definición | `00-definicion/PROJECT-BRIEF.md` | Punto de partida: decisiones aprobadas de producto |
| Producto | `01-producto/PRD.md` | **Qué** debe hacer el producto (fuente de verdad funcional) |
| Diseño | `02-diseno/STITCH-BRIEF.md` | Insumo histórico de la exploración UX |
| Diseño | `02-diseno/UX-EXPLORATION.md` | Exploración UX y estructura/navegación aprobadas |
| Diseño | `02-diseno/DESIGN-BRIEF.md` | Insumo histórico entregado a Claude Design, consolidado por `DESIGN.md` |
| Diseño | `02-diseno/DESIGN.md` | **Experiencia** y sistema visual (fuente de verdad UX/UI) |
| Diseño | `02-diseno/referencias/` | Capturas de Stitch y sistema visual de Claude Design; solo referencia, **no** capturas del producto |
| Arquitectura | `03-arquitectura/TECHNICAL-DESIGN.md` | **Cómo** se construye (fuente de verdad técnica) |
| Arquitectura | `03-arquitectura/adrs/ADR-001…010` | **Por qué**: razonamiento y alternativas |
| Arquitectura | `03-arquitectura/validation/` | Evidencia de los Architecture Validation Gates |
| Arquitectura | `03-arquitectura/ARCHITECTURE-ADVERSARIAL-REVIEW.md` | Revalidación adversarial final de la arquitectura (la revisión original se cita como histórica, sin artefacto preservado) |
| Planificación | `04-planificacion/OPENSPEC-STRATEGY.md`, `BACKLOG.md`, `PHASE-6.5-COVERAGE-GATE.md` | Estrategia de partición, backlog maestro y gate de cobertura. Planificación, no Specs |
| Specs / OpenSpec | `openspec/specs/` y `openspec/changes/archive/` | Specs canónicas vigentes e historial de changes archivados |
| Diagramas | `06-diagramas/DIAGRAMAS.md` | Índice de diagramas, flujo CI/CD y pipeline AI-First |
| Testing | `07-testing/` | Compuertas de calidad, trazabilidad, revisión responsive y [CODE-REVIEW.md](07-testing/CODE-REVIEW.md) (revisión independiente de código) |
| Seguridad | `08-seguridad/SECURITY-REPORT.md` | Security Pass formal |
| Deploy | `09-deploy/` | Entornos, Production, runbooks y decisión de release |

Jerarquía: PRD > UX-EXPLORATION > DESIGN.md > referencias. El Technical Design y los ADR son la fuente técnica.

## Qué consume cada fase

- **00 Definición** — decisiones aprobadas de producto. Punto de partida.
- **01 PRD** — consume la definición; fija los requisitos de producto.
- **02 Diseño** — consume el PRD; define la experiencia y el sistema visual.
- **03 Arquitectura** — consume PRD y diseño; Technical Design y ADR, seguidos de una revisión adversarial.
- **04 Backlog** — consume PRD, diseño y arquitectura; descompone el trabajo en changes.
- **05 Specs** — consume el backlog; especificación y tareas con OpenSpec. Todo cambio de comportamiento pasa por una spec antes del código.
- **06 Diagramas** — documentan lo implementado y revisado.
- **07 Testing** — estrategia y evidencia de pruebas, derivadas de las specs.
- **08 Seguridad** — Security Pass sobre el sistema construido.
- **09 Deploy** — despliegue, CI/CD y decisión de release.

## Reglas

- No se avanza a código funcional hasta que existan los documentos de los que depende.
- Las decisiones de arquitectura importantes se registran como ADR.
- Los supuestos no son decisiones aprobadas hasta que un documento los apruebe.
- Los cambios de comportamiento posteriores pasan por OpenSpec (propuesta, revisión, aplicación, verificación y archivo).

## Historia del proceso (referencia)

El estado fase a fase de cada change durante la construcción (CHG-01 … CHG-15, incluidos el checkpoint «Presentation Preview 0», las olas de materialización y los gates) se conserva en `openspec/changes/archive/` y en los informes de `04-planificacion/`, `03-arquitectura/validation/` y `09-deploy/`. Las menciones a «aún sin implementar» o «pendiente» que aparezcan en documentos de fases anteriores describen el momento en que se redactaron.
