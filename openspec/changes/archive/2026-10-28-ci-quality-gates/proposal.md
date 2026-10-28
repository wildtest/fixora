# Proposal

## Why

CHG-01 deja un ejecutor mínimo de pruebas unitarias y CHG-02 un harness local de PostgreSQL real, pero ninguno de los dos garantiza que **cada cambio futuro** pase las mismas verificaciones antes de llegar a `main`. Sin una infraestructura común de calidad (organización de suites, cobertura selectiva, base de Playwright, trazabilidad, CI con puertas de PR y comprobaciones de cadena de suministro), cada vertical slice la improvisaría y `SC-19` quedaría sin evidencia. Hay que construirla **antes** de acumular slices.

## What Changes

- **Orquestación global de pruebas con Vitest:** proyectos separados de pruebas unitarias e de integración, con sus patrones, tiempos de espera y serialización; reorganiza sin reimplementar el ejecutor de CHG-01 ni el harness de CHG-02.
- **Cobertura V8 selectiva:** umbral de 90 % de líneas y de ramas únicamente en `domain/` y módulos puros seleccionados, sin cobertura global.
- **Base de Playwright:** configuración contra `next build` y `next start`, proyectos de escritorio y móvil, `workers: 1` en CI y artefactos solo en fallo, con una verificación técnica estable (sin congelar contenido de producto).
- **Trazabilidad:** `docs/07-testing/TRACEABILITY.md` (SC-01…SC-20, E1…E17) y una verificación ligera propia, separada de la cobertura.
- **CI en GitHub Actions:** job `static` (sin base de datos ni credenciales PostgreSQL) y job `db-tests` (entorno de pruebas, serializado con cola), permisos mínimos, acciones fijadas por SHA, sin `pull_request_target`.
- **Cadena de suministro:** `npm audit` con política explícita, detección de secretos antes de merge (capacidad de la plataforma primero) y reglas para dependencias.
- **Puerta de PR:** `static` y `db-tests` obligatorios, sin *push* directo rutinario ni *force-push* a `main` (la configuración efectiva se hace con aprobación en la Fase 7).

Es un cambio puramente técnico y de entrega: **no introduce ningún comportamiento observable del producto**.

## Capabilities

### New Capabilities
Ninguna. Este change no tiene delta specs; se declara `skip_specs: true` en su `.openspec.yaml`.

### Modified Capabilities
Ninguna.

## Impact

- **Documentos que respaldan el cambio:** Technical Design §24, §25.1, §25.2, §21.8; ADR-008 (testing y calidad), ADR-009 (entornos, CI/CD), ADR-007 (cadena de suministro); backlog `CHG-03`.
- **Criterios PRD:** `SC-19` (pipeline de integración y entrega continua) como criterio primario, con su evidencia planificada en `design.md`. Provee infraestructura para `SC-17` **sin cerrarlo** (su evidencia final es el E2E-01 de CHG-11).
- **Código afectado (cuando se implemente):** configuración raíz de Vitest y Playwright, `.github/workflows/`, `docs/07-testing/TRACEABILITY.md` y su script, plantilla de PR, `package.json`/lockfile.
- **Dependencias:** `@vitest/coverage-v8` (misma versión que Vitest) y `@playwright/test`. **No se instala nada en este change de planificación**; las versiones y los SHA de las acciones se verifican en la Fase 7.
- **Fuera de alcance:** lógica funcional, repositorios, migraciones nuevas, configuración de Production, `migrate-production`, despliegue (CHG-07), Security Pass formal (CHG-14), E2E-01 completo (CHG-11) y la implementación de requisitos futuros. No se ejecuta el Architecture Validation Gate.
