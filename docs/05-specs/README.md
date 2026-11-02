# Fase 05 — Specs (índice)

Este directorio es un **índice humano**, no una copia. Las especificaciones canónicas viven en [`openspec/specs/`](../../openspec/specs/) y el historial de cada change, en [`openspec/changes/archive/`](../../openspec/changes/archive/). Duplicarlas aquí crearía dos fuentes de verdad.

## Propósito

OpenSpec convierte el producto y la arquitectura aprobados en unidades implementables y verificables: cada **change** declara qué cambia (proposal), cómo (design), sus requisitos como *deltas* (specs) y las tareas, y al archivarse fusiona sus deltas en las **main specs**.

## Flujo de trazabilidad

```text
PROJECT BRIEF → PRD → UX / DESIGN → Technical Design / ADR → BACKLOG → OPENSPEC → IMPLEMENTATION → VERIFICATION → ARCHIVE
```

| Etapa | Artefacto |
|---|---|
| Definición | [`PROJECT-BRIEF.md`](../00-definicion/PROJECT-BRIEF.md) |
| Producto (fuente funcional) | [`PRD.md`](../01-producto/PRD.md) |
| UX / diseño | [`UX-EXPLORATION.md`](../02-diseno/UX-EXPLORATION.md) · [`DESIGN.md`](../02-diseno/DESIGN.md) |
| Arquitectura | [`TECHNICAL-DESIGN.md`](../03-arquitectura/TECHNICAL-DESIGN.md) · [ADR](../03-arquitectura/adrs/) |
| Backlog | [`BACKLOG.md`](../04-planificacion/BACKLOG.md) · [`OPENSPEC-STRATEGY.md`](../04-planificacion/OPENSPEC-STRATEGY.md) |
| Specs | [`openspec/specs/`](../../openspec/specs/) |
| Implementación y verificación | `src/`, `prisma/`, `tests/` · [`TRACEABILITY.md`](../07-testing/TRACEABILITY.md) |
| Archivo | [`openspec/changes/archive/`](../../openspec/changes/archive/) |

## Ciclo de cada change

`propose` → `design` → `tasks` → (revisión y aprobación humana) → `apply` → verificación (pruebas y revisión) → `archive` (fusiona los deltas en las main specs). Una propuesta no autoriza implementarla: `apply` siempre requiere autorización explícita.

## Estado final

| Elemento | Cantidad |
|---|---|
| Changes activos | **0** |
| Main specs | **8** |
| Changes archivados | **18** (CHG-01…CHG-15 y las mejoras `landing-visual-fidelity` y `landing-visual-enhancement`) |

`openspec validate --all --strict` valida las 8 specs.

## Main specs

| Capability | Propósito | Spec |
|---|---|---|
| `public-site-entry` | Entrada pública clara y segura: landing, accesos a registrar, consultar y administrar, avisos y errores sin detalles internos. | [spec.md](../../openspec/specs/public-site-entry/spec.md) |
| `repair-request-registration` | Que un cliente sin cuenta registre una única solicitud y reciba su código de seguimiento, sin órdenes inválidas ni duplicadas. | [spec.md](../../openspec/specs/repair-request-registration/spec.md) |
| `public-order-tracking` | El código de seguimiento como credencial pública única, impredecible e inmutable para consultar el estado sin cuenta. | [spec.md](../../openspec/specs/public-order-tracking/spec.md) |
| `admin-access` | Acceso seguro del administrador mediante credenciales y sesión controlada; visitantes no autenticados excluidos. | [spec.md](../../openspec/specs/admin-access/spec.md) |
| `admin-order-management` | Panel de resumen, directorio consultable y detalle de órdenes para que el administrador las supervise y localice. | [spec.md](../../openspec/specs/admin-order-management/spec.md) |
| `repair-lifecycle` | Máquina de estados estricta con transiciones autorizadas, confirmaciones explícitas y control de concurrencia. | [spec.md](../../openspec/specs/repair-lifecycle/spec.md) |
| `diagnosis-and-estimate` | Diagnóstico y costo estimado editables con historial, publicados de forma irreversible al llegar a la etapa de aprobación. | [spec.md](../../openspec/specs/diagnosis-and-estimate/spec.md) |
| `order-notes` | Notas públicas e internas mientras la orden esté abierta, con visibilidad y concurrencia controladas. | [spec.md](../../openspec/specs/order-notes/spec.md) |
