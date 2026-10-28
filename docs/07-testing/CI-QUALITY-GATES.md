# CI y compuertas de calidad

> Registro operativo de CHG-03 `ci-quality-gates`. Las decisiones están en `openspec/changes/ci-quality-gates/design.md` (D-1…D-11). **Sin credenciales, URL de conexión ni identificadores de recurso.**

## Qué ejecuta cada comando

| Comando | Qué hace | Dónde corre |
|---|---|---|
| `npm run test:unit` | Proyecto `unit` de Vitest (rápido, paralelo, sin base de datos) | local |
| `npm run test:coverage` | Proyecto `unit` con cobertura V8 **selectiva** (90 % de líneas y ramas solo en `domain/` y módulos puros añadidos por PR) | `static` |
| `npm run test:integration` | Proyecto `integration`: PostgreSQL real en la rama Neon `test`, serial; guardia → esquema vacío → migraciones → pruebas (CHG-02) | `db-tests` |
| `npm run test:e2e` | `next build` + `next start` + Playwright (`chromium-desktop`, `chromium-mobile`); `workers: 1` y `retries: 0` en CI; trazas solo ante fallo | `db-tests` |
| `npm run test:e2e:install` | Instala el navegador con la herramienta del paquete | local |
| `npm run test:trace` | Verificación ligera de `TRACEABILITY.md` | `static` |
| `npm run ci:secrets` | Higiene de secretos propia sobre los archivos versionados | `static` |
| `npm run ci:audit` | Política de `npm audit` (críticos y altos bloquean) | `static` |
| `npm run ci:warm` | Calentamiento de Neon `test` | `db-tests` |

La **cobertura** y la **trazabilidad** son compuertas distintas: ninguna sustituye a la otra.

## Workflow `.github/workflows/ci.yml`

- Disparadores: `pull_request` hacia `main` y `push` a `main`. Nunca `pull_request_target`. Sin filtros por ruta. V1 no soporta forks.
- Permisos: `contents: read`.
- Acciones oficiales fijadas por SHA completo (verificado contra su repositorio oficial el 2026-10-28): `actions/checkout` v7.0.1, `actions/setup-node` v7.1.0, `actions/upload-artifact` v7.0.2.
- **`static`**: sin base de datos ni credenciales PostgreSQL, sin Environment, sin grupo de concurrencia. Pasos: checkout → Node 24 (`.nvmrc`) → `npm ci` → `db:generate` → lint → typecheck → cobertura → trazabilidad → secretos → audit → build.
- **`db-tests`**: independiente (sin `needs`), Environment `test`, credenciales exclusivas de test (`TEST_DATABASE_URL`, `TEST_DIRECT_URL`, `RATE_LIMIT_HMAC_SECRET`). Serializado con `concurrency: { group: fixora-db-tests, queue: max }` y **sin** `cancel-in-progress` (sintaxis confirmada por el changelog de GitHub del 2026-05-07: `queue: max` no se combina con `cancel-in-progress: true`).
- Los nombres de job `static` y `db-tests` son estables: son los checks requeridos.

## Política de `npm audit` (V1)

- **Bloquean CI** los hallazgos de severidad crítica y alta (y cualquier severidad desconocida). Los moderados, bajos e informativos se **reportan sin bloquear**.
- Nunca `npm audit fix --force` ni actualizaciones de major automáticas.
- **Excepciones.** El estado por defecto ante un hallazgo alto o crítico es CI en rojo. Solo cabe una excepción **temporal** si no existe una corrección razonable, el riesgo está evaluado, se documentan el advisory y el paquete, la exposición real de FIXORA, la mitigación y una fecha de revisión, y **el usuario la aprueba explícitamente**. Se registra en esta sección. Excepciones vigentes: **ninguna**.

## Decisiones de plataforma y cadena de suministro (preflight del 2026-10-28)

| Capacidad | Resultado | Decisión |
|---|---|---|
| Repositorio | Público, `main` por defecto, permiso de administración | — |
| Secret scanning y push protection | **Disponibles y activados** | Detección principal de secretos (tarea 9.2). `ci:secrets` es un complemento propio, no un escáner de terceros |
| Rulesets / protección de rama | Disponibles; `main` **sin proteger** hoy | Configuración pendiente de aprobación (tarea 10.2) |
| Environments | Disponibles; **ninguno** creado | `test` pendiente de aprobación y de los secretos (tarea 10.3) |
| Dependabot (alertas y actualizaciones de seguridad) | Disponible; **desactivado** | Opcional y no es una puerta de CI (tarea 9.3). No se activa sin aprobación |
| `npm ci --ignore-scripts` | **Compatible**: en una copia limpia sin archivos de entorno, `npm ci --ignore-scripts` + `db:generate` + lint + typecheck + cobertura + trazabilidad + secretos + audit + build pasaron | Se **evaluó y no se impone**: el workflow usa `npm ci` (la toolchain no lo exige) |
| Versiones | `@vitest/coverage-v8` 5.0.5 (igual que Vitest); `@playwright/test` 1.64.1; Playwright `latest` estable, sin prerelease | Fijadas con versión exacta |

## Evidencia planificada de `SC-19` (inspección del pipeline)

Estado: **parcialmente reunida; no cerrada.** Lo que existe: workflow versionado y revisado (disparadores, permisos, SHA, ausencia de credenciales de Production; verificado por `tests/tooling/ci-scripts.test.ts`), simulación local del job `static` en una copia limpia, informe de `test:trace` y ejecución local de integración y E2E. Lo que falta y solo puede hacerse en GitHub: ejecución verde de una PR real con `static` y `db-tests` arrancando a la vez, prueba de cola de `db-tests`, protección de `main` y el Environment `test` con sus secretos.
