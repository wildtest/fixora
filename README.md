# FIXORA

*Tu reparación, siempre bajo control.*

Aplicación web responsive para pequeños servicios técnicos de reparación de equipos tecnológicos. Permite al taller organizar sus órdenes y al cliente consultar el estado de su reparación, con un código de seguimiento y sin cuenta, sin tener que preguntar.

## Estado del proyecto

**Documentación y diseño aprobados; la aplicación funcional aún no está implementada.** El pipeline documental está completo hasta el Technical Design: el producto (PRD), la experiencia (`DESIGN.md`) y la arquitectura (Technical Design + ADR-001…010) están aprobados. La **Fase 5 — Technical Design / Arquitectura está cerrada (2026-10-26)**. La **Fase 6 (OpenSpec, Specs y Backlog) está completada**: OpenSpec está inicializado (6.1), la estrategia de partición (6.2) y el backlog maestro (6.3) están aprobados, y los 16 changes de OpenSpec están materializados y aprobados (Fase 6.4 completada) y el gate de cobertura y consistencia (6.5) está aprobado; aún sin implementar ni archivar, sin Specs principales. El Architecture Validation Gate es el primer gate de la implementación (Fase 7) y aún no se ha ejecutado.

## Stack

**Presente hoy (scaffold):** Next.js 16.4.3 (App Router), React 19.3 y Tailwind CSS 4, en JavaScript.

**Aprobado para implementación (aún no instalado):** TypeScript `strict`, Node 24.x, PostgreSQL en Neon, Prisma ORM 7.x estable con `@prisma/adapter-pg` + `pg`, Vitest, Playwright, GitHub Actions y despliegue en Vercel.

## Arquitectura (alto nivel)

Monolito modular en Next.js con capas `app → application → domain` e `infrastructure`; Server Components por defecto y Server Actions como adaptadores, sin API REST de negocio. El servidor es la fuente de verdad de las reglas sensibles: máquina de estados con transiciones controladas, separación estricta entre información pública y notas internas, y autorización de la zona administrativa. El detalle está en el Technical Design.

## Ejecución local del scaffold

```bash
npm install
npm run dev
```

Abre http://localhost:3000. Solo existen hoy los comandos `dev`, `build`, `start` y `lint`.

## Documentación

El proyecto sigue un pipeline documental AI-First. Punto de entrada: [docs/README.md](docs/README.md).

- Producto: [PRD](docs/01-producto/PRD.md)
- Experiencia y sistema visual: [DESIGN.md](docs/02-diseno/DESIGN.md)
- Arquitectura: [Technical Design](docs/03-arquitectura/TECHNICAL-DESIGN.md) y [ADRs](docs/03-arquitectura/adrs/)

## Próxima etapa

Fase 6 completada (incluido el gate de cobertura y consistencia 6.5). Próximo paso: Fase 7 — Architecture Validation Gate e implementación incremental (no iniciada).
