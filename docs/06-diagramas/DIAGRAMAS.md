# Diagramas de FIXORA

> Índice de los diagramas del proyecto. **Los diagramas de arquitectura, estados y datos no se duplican aquí**: su fuente lógica es el Technical Design (Mermaid, se renderiza en GitHub). Este documento enlaza esos diagramas y aloja los dos que no pertenecen al Technical Design: el flujo de CI/CD y el pipeline AI-First.

## Diagramas del Technical Design (fuente lógica)

| Diagrama | Dónde |
|---|---|
| Arquitectura general y separación público/administrador | [TECHNICAL-DESIGN.md §2](../03-arquitectura/TECHNICAL-DESIGN.md) |
| Capas y dependencias permitidas | [TECHNICAL-DESIGN.md §5](../03-arquitectura/TECHNICAL-DESIGN.md) |
| Repair Lifecycle (máquina de estados) | [TECHNICAL-DESIGN.md §7.2](../03-arquitectura/TECHNICAL-DESIGN.md) |
| Modelo de datos | [TECHNICAL-DESIGN.md §10](../03-arquitectura/TECHNICAL-DESIGN.md) |
| Flujos de registro y consulta pública (secuencia) | [TECHNICAL-DESIGN.md §12](../03-arquitectura/TECHNICAL-DESIGN.md) y siguientes |
| Navegación y flujos de pantallas | [UX-EXPLORATION.md](../02-diseno/UX-EXPLORATION.md) |

El README principal reproduce el diagrama de arquitectura y el de estados; si el Technical Design cambia, prevalece el Technical Design.

## Flujo de CI/CD y entrega

Fuente: `.github/workflows/ci.yml`, `.github/workflows/migrate-production.yml` y [CI-QUALITY-GATES.md](../07-testing/CI-QUALITY-GATES.md).

```mermaid
flowchart LR
  B["Rama feature/fix"] --> PR["Pull Request a main"]
  PR --> S["static\nlint · typecheck · cobertura\ntrazabilidad · secretos · audit · build"]
  PR --> D["db-tests\nintegración + E2E completa\nNeon test (serializado)"]
  S --> M{"checks obligatorios en verde"}
  D --> M
  M -->|merge| MAIN["main protegida"]
  MAIN --> V["Vercel Production\n(integración Git)"]
  MAIN -.->|migraciones nuevas| MP["workflow migrate-production\nEnvironment production\naprobación humana"]
  MP -.-> NEON[("Neon main")]
  V --> NEON
```

La aplicación nunca migra la base: las migraciones de Production solo las aplica `migrate-production`, ligado al SHA y a la identidad del contenido de `prisma/migrations/`.

## Pipeline AI-First

Fuente: [docs/README.md](../README.md) y [OPENSPEC-STRATEGY.md](../04-planificacion/OPENSPEC-STRATEGY.md).

```mermaid
flowchart TD
  I["Idea"] --> PRD["PRD (aprobado por la persona)"]
  PRD --> UX["UX con Stitch"]
  UX --> DS["Diseño con Claude Design"]
  DS --> TD["Technical Design + ADR"]
  TD --> AR["Revisión adversarial"]
  AR --> BL["Backlog"]
  BL --> OS["OpenSpec: propose → revisión humana → apply → verificación → archive"]
  OS --> CC["Claude Code: implementación y pruebas"]
  CC --> SEC["Security Pass"]
  SEC --> CI["CI/CD"]
  CI --> RR["Release Readiness"]
  H["Persona: decide, aprueba, gestiona secretos\ny acciones sobre Production"] -.-> PRD
  H -.-> TD
  H -.-> OS
  H -.-> RR
```
