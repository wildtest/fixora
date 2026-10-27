# Design

## Context

Motivación y alcance: ver `proposal.md`. Fuentes: Technical Design (TD) §21.8, §24, §25.1, §25.2, §25.3, §28; ADR-007, ADR-008, ADR-009; backlog `CHG-03`.

**Premisa de orden:** este change se aplica **después de CHG-01 y CHG-02** y los consume sin redefinirlos.

**Estado actual observado (solo lectura):** el repositorio no tiene `.github/`, ni Vitest, ni Playwright, ni cobertura, ni `docs/07-testing/`; solo existen los scripts `dev`, `build`, `start` y `lint`. Los changes anteriores *planifican* lo que CHG-03 consumirá.

## Inputs from previous changes

**De CHG-01** (no se vuelve a hacer): el ejecutor mínimo de Vitest y su `vitest.config.ts` con alias `@`, las pruebas unitarias de la fundación (y `tests/tooling/` de reglas de lint), los scripts `lint`, `typecheck`, `test:unit` y `build`, TypeScript estricto y Node 24 (`.nvmrc`, `engines`), `src/instrumentation.ts` y el logger.

**De CHG-02** (no se vuelve a hacer): el contrato de BD de test (`TEST_DATABASE_URL`, `TEST_DIRECT_URL`), el **marcador** de entorno de test, la **guardia anti-desastre**, el reinicio controlado, la aplicación de migraciones al esquema de test, el harness local de PostgreSQL real, el script `test:integration` y las pruebas propias de persistencia. El orquestador puede inyectar `DATABASE_URL = TEST_DATABASE_URL` solo en el proceso hijo de la aplicación; el marcador sigue siendo la autoridad de seguridad del entorno.

**Regla:** CHG-03 *orquesta e industrializa*; no redefine el marcador, la guardia, el reinicio ni las pruebas de persistencia.

## Goals / Non-Goals

**Goals:**
- Que toda PR ejecute las mismas verificaciones con credenciales mínimas y que no pueda fusionarse sin ellas.
- Dejar organizados los niveles de prueba (unitaria, integración, E2E) y su cobertura selectiva, sin una suite única.
- Dejar la trazabilidad de `SC-*`/`E*` verificable por un script ligero, separada de la cobertura.
- Reducir riesgos de cadena de suministro y de fuga de secretos desde CI.

**Non-Goals:**
- Lógica funcional, repositorios, migraciones nuevas, el *seed*, E2E-01 (CHG-11), el Security Pass (CHG-14), `migrate-production`, Production y despliegue (CHG-07).
- Elegir silenciosamente herramientas nuevas (escáner de secretos de terceros, servicios externos).
- No se ejecuta el Architecture Validation Gate; las dependencias de plataforma se tratan como validaciones previas, sin crear un AV-4.

## Decisions

### D-1. Taxonomía de pruebas y proyectos de Vitest
| Nivel | Qué prueba | Dónde | Ejecutor |
|---|---|---|---|
| Unitaria | `domain/`, funciones puras, validadores, normalizadores, pruebas de reglas de lint | junto al código (`*.test.ts`) y `tests/tooling/` | Vitest, proyecto `unit` |
| Integración | Casos de uso y persistencia contra PostgreSQL real: restricciones, transacciones, concurrencia, privilegios, limitador | `tests/integration/` | Vitest, proyecto `integration` |
| E2E | Framework, Server Actions, navegación, UI, seguridad observable, flujos entre capas | `tests/e2e/` | Playwright |

Sin mocks de Prisma como sustituto de la persistencia. **No se exige E2E para cada función**: cada regla se prueba en el nivel más barato que la demuestre.
La configuración raíz de Vitest se reorganiza en **proyectos** (la API exacta —`projects` u otra— se confirma contra la versión instalada): `unit` (entorno Node, rápido, paralelo) e `integration` (entorno Node, **serial** por la base compartida, con `globalSetup` que invoca la guardia y la preparación de migraciones **de CHG-02**, tiempos de espera mayores por el arranque en frío de Neon). Se conservan los nombres de script `test:unit` y `test:integration`; se añaden `test:coverage`, `test:e2e` y `test:trace`. No se reinstala Vitest.

### D-2. Cobertura
`@vitest/coverage-v8`, misma versión que Vitest. Umbral de **90 % de líneas y 90 % de ramas únicamente** en `domain/` y módulos puros seleccionados, con `coverage.include` **explícito** (incluye archivos aún no alcanzados por pruebas). Sin umbral global ni umbral en UI, páginas de Next, `infrastructure/`, Prisma, código generado ni configuración; sin umbrales de funciones o sentencias si el TD no los exige. Se ejecuta sobre el proyecto `unit` **sin duplicar** la ejecución de las unitarias (`test:coverage` sustituye a `test:unit` en CI). Cada módulo puro adicional entra por revisión de PR, añadiéndolo a la lista.

### D-3. Playwright baseline
- Se ejecuta **siempre contra `next build` y `next start`**, nunca contra `next dev`; el servidor lo levanta `webServer` con `DATABASE_URL = TEST_DATABASE_URL` solo para ese proceso hijo.
- **Proyectos del baseline:** `chromium-desktop` (suite funcional completa) y `chromium-mobile` (flujos públicos críticos y *responsive*). El requisito de V1 es escritorio y móvil, no cobertura multi-navegador. *Discrepancia a confirmar con el TD:* el TD §24 y el ADR-008 listan además `webkit-mobile`; se difiere como ampliación futura (no es necesario para el gate baseline) y su alineación documental queda registrada. Firefox sigue fuera del CI de V1.
- **CI: `workers: 1` y `retries: 0`.** Ninguna prueba fallida pasa a verde por reintento; no se mantiene la política de «un reintento solo para capturar el trace». Para conservar evidencia sin reintentar: `trace: retain-on-failure` (o la forma exacta soportada por la versión instalada de Playwright); si la prueba pasa no se retiene nada.
- **Artefactos solo ante fallo** (*trace*; captura o vídeo únicamente si aportan valor), con retención corta, solo datos ficticios y sin generar artefactos pesados de forma indiscriminada; sin servicio externo.
- **Verificación técnica estable, sin congelar contenido de producto:** una prueba mínima que comprueba que el servidor de prueba responde, que la página raíz carga sin error fatal y que la configuración detecta una aserción fallida. No toca textos, maquetación, colores ni contenido de la landing (CHG-04 los cambiará). El E2E-01 y demás pruebas funcionales las añaden los changes de cada slice.

### D-4. Job `static` (independiente, sin base de datos)
Job **independiente**: no depende de ningún otro job y comienza en cuanto se dispara el workflow. Pasos en orden: *checkout* → Node 24 (desde `.nvmrc`) → `npm ci` → generación del cliente de Prisma → `lint` → `typecheck` → `test:coverage` → `test:trace` → detección de secretos → `npm audit` → `build`.
- **No recibe credenciales PostgreSQL**: ningún secreto ni variable de conexión (`DATABASE_URL`, `DIRECT_URL`, `TEST_*`) en este job, ni Production ni test. No usa el entorno de GitHub `test`.
- **No pertenece al grupo de concurrencia de la base de datos** (D-6): varios `static` de PR distintas corren a la vez.
- **El *build* no se conecta a la base de datos y no migra.** Debe funcionar sin variables de BD: `prisma generate`, `typecheck` y `build` se ejecutan sin una base real (lo garantiza el diseño de CHG-02: la generación y la validación de Prisma no exigen conexión). **No se usa una `DATABASE_URL` ficticia por defecto.** Si AV-2 de CHG-02 demostrara que alguna herramienta exige sintácticamente una variable al cargar la configuración, **se resuelve allí** (excepción documentada y no funcional, nunca la URL de Production); no es una decisión nueva de CHG-03.
- Si el *framework* exige alguna variable no sensible para compilar, se documenta.

### D-5. Job `db-tests` (independiente, entorno de pruebas)
Job **independiente**, **sin `needs: static`**: ambos comienzan al dispararse el workflow, pueden ejecutarse en paralelo y fallan por separado. La razón: `static` no necesita base de datos, `db-tests` sí, y la serialización debe limitar únicamente a quien comparte el entorno PostgreSQL de pruebas. Pasos: *checkout* → Node 24 → `npm ci` → generación del cliente → calentamiento de Neon `test` → guardia anti-desastre y preparación de migraciones (**las de CHG-02**) → pruebas de integración → `build` de producción → `next start` → navegador de Playwright → E2E → subida de *traces* solo ante fallo. Integración y E2E van **en el mismo job** para que nada se intercale sobre la base compartida.
- **Autocontenido:** `db-tests` hace su propio `build` aunque `static` también lo haga. Se descarta pasar el *build* como artefacto entre jobs (acopla los jobs); que ambos compilen no se considera duplicación incorrecta, salvo que aparezca una razón objetiva de coste o tiempo.
- Usa **solo** las credenciales del entorno de pruebas: `TEST_DATABASE_URL`, `TEST_DIRECT_URL`, `RATE_LIMIT_HMAC_SECRET` exclusivo de test y, cuando CHG-08 las necesite, credenciales del administrador E2E **ficticias y exclusivas de test**. Nunca credenciales de Production; no se versionan; no se crean ahora.
- Incluye la verificación de que **una base vacía llega al esquema actual solo con migraciones** (prueba de CHG-02, ejecutada aquí), con el mecanismo más aislado disponible al implementar (BD temporal en el entorno de test o rama Neon desechable; las ramas efímeras no pasan a ser dependencia permanente).
- Calentamiento de Neon con un *script* propio (reutiliza la conexión del harness); no se usan acciones de terceros para ello.

### D-6. Serialización de la base compartida
La BD de pruebas es única, por lo que **solo `db-tests` se serializa**, con un grupo de concurrencia **con cola** y **sin cancelar** la ejecución en curso. Decisión aprobada:
```yaml
concurrency:
  group: fixora-db-tests
  queue: max
```
en el **nivel mínimo apropiado** (el job `db-tests`, o un workflow de BD dedicado si al implementar se demuestra mejor). **Nunca se combina con `cancel-in-progress: true`**: una ejecución nueva espera y no reemplaza a la anterior ni se pierden comprobaciones. La documentación de GitHub Actions admite `queue: max`; al ser una plataforma externa, se vuelve a comprobar la sintaxis exacta al implementar. *Nota documental:* el TD §25.2 usa el nombre conceptual `fixora-test-db`; el nombre aprobado para la implementación es `fixora-db-tests`.
**`static` no usa este grupo**, de modo que solo se serializa al consumidor del entorno PostgreSQL compartido.

### D-7. Disparadores, permisos y puerta de PR
- **Disparadores:** `pull_request` hacia `main` y `push` a `main`. **Nunca `pull_request_target`.** Sin filtros por ruta en los *checks* obligatorios (evitaría que uno requerido quede pendiente). V1 no soporta *forks*: los secretos no se exponen a código de un *fork*; si el proyecto aceptara contribuciones externas, esos jobs necesitarían una política explícita.
- **Permisos:** `contents: read` a nivel de workflow; sin `write-all`; cualquier permiso adicional se justifica.
- **Puerta de PR (la preventiva principal):** **`static` y `db-tests` son ambos obligatorios** antes de fusionar, sin *force-push* y sin *push* directo rutinario a `main`. Al ser independientes, pueden fallar por separado. El CI posterior al *push* a `main` es **detectivo**, no sustituto. Los nombres de los jobs (`static`, `db-tests`) son estables porque son los nombres de los *checks* requeridos.
- **Plantilla de PR** con la declaración de compatibilidad hacia atrás de las migraciones (TD §11), la actualización de `TRACEABILITY.md` y las pruebas añadidas.
- La configuración efectiva (rulesets o protección de ramas) y el Environment `test` dependen del plan de GitHub y se hacen con aprobación en la Fase 7.

### D-8. Cadena de suministro
- **Acciones de GitHub fijadas por SHA completo** del commit y verificadas contra el repositorio oficial de la acción, con el *tag* humano como comentario (`# vX.Y.Z` sobre `uses: owner/action@<sha>`); nunca se usa un *tag* flotante como autoridad. No se eligen SHA durante la Fase 6. Solo acciones oficiales de GitHub imprescindibles (por ejemplo `checkout`, `setup-node`, `upload-artifact`); sin acciones de terceros innecesarias. El navegador de Playwright se instala con la propia herramienta del paquete.
- **`npm audit` — política de V1.** **Bloquean CI** los hallazgos de severidad **crítica y alta**; los de severidad moderada y baja **se reportan sin bloquear** automáticamente. Nunca `npm audit fix --force` desde CI ni actualizaciones de *major* automáticas.
- **Excepciones de vulnerabilidades.** Ante un hallazgo alto o crítico, el estado por defecto es **CI en rojo**. Solo cabe una excepción **temporal** si: no existe una corrección razonable, el riesgo está evaluado, se documentan el *advisory* y el paquete, se documenta la exposición real de FIXORA, hay una mitigación, existe una fecha de revisión o caducidad y **el usuario la aprueba explícitamente**. No se diseña un sistema de excepciones complejo: basta documentación controlada. CHG-14 volverá a evaluar estos riesgos en el Security Pass.
- **Detección de secretos:** validación previa de la **plataforma GitHub**. Prioridad: (1) capacidad nativa de GitHub (*secret scanning* y *push protection*) si el plan la ofrece; (2) evaluar una alternativa solo si hace falta. **No se instala** Gitleaks, TruffleHog ni ningún otro escáner sin aprobación específica de herramienta, acción, permisos y flujo de datos. Objetivo invariable: los secretos versionados se detectan antes de fusionar.
- **Dependabot o equivalente:** capacidad de plataforma a evaluar y activar **si está disponible y es apropiada**; **no es un requisito obligatorio** de CHG-03 y ninguna puerta de CI depende de ella.
- **`npm ci`** con el *lockfile* como fuente de verdad. La posibilidad de `--ignore-scripts` se evalúa contra la toolchain (Prisma) y no se impone si la rompe.
- **Registros de CI:** nunca se imprime el entorno completo, URL con credenciales, contraseñas, *tokens*, el secreto HMAC, códigos de seguimiento ni datos personales; el enmascarado de GitHub es defensa adicional, no la única, y los *scripts* propios no registran secretos.

### D-9. Trazabilidad
- **Ubicación:** `docs/07-testing/TRACEABILITY.md`. Una tabla con `ID | change dueño | nivel | prueba o evidencia | estado` para `SC-01`…`SC-20` y `E1`…`E17`; **no copia el texto del criterio**: el PRD sigue siendo la fuente. Se inicializa con el dueño primario de `BACKLOG.md` §11 y estado pendiente; no tiene que estar completa en CHG-03 (CHG-15 la cierra).
- **Verificación ligera** (`test:trace`), un *script* propio sin dependencias nuevas, que comprueba al menos: identificadores desconocidos, ausencia de alguno de los 37, criterios sin dueño cuando ya deberían tenerlo, referencias a pruebas inexistentes cuando el estado indica «implementado» y, si las pruebas llevan etiquetas `[SC-xx]`/`[Ex]`, que apunten a IDs existentes.
- **Cobertura y trazabilidad son compuertas distintas:** un 100 % de cobertura de código no implica criterios `SC`/`E` demostrados.

### D-10. Evidencia planificada de `SC-19`
CHG-03 es el dueño primario de `SC-19` («existe un pipeline que ejecuta automáticamente las verificaciones definidas»; verificación: inspección del pipeline). La evidencia que lo cerrará en la Fase 7: ejecución verde de una PR real con `static` y `db-tests`; el workflow versionado revisado (disparadores, permisos, SHA, ausencia de credenciales de Production); el registro de la protección de `main` y de la serialización; y el informe de `test:trace`. **Este design no cierra el criterio.** `SC-17` (E2E-01) lo cierra CHG-11; CHG-03 solo aporta la infraestructura.

### D-11. Fronteras con otros changes
CHG-03 **no** implementa Production, `migrate-production`, el Environment `production`, Vercel ni el *smoke* de Production (CHG-07), ni el Security Pass formal ni la disposición global de hallazgos (CHG-14). Solo pone compuertas preventivas incrementales (auditoría, detección de secretos, puertas de pruebas) y deja los workflows listos para coexistir con los de CHG-07 sin compartir secretos.

## Contract for future changes

Cada change funcional posterior debe: añadir sus pruebas en el nivel adecuado; actualizar `TRACEABILITY.md`; respetar `static` y `db-tests`; no rebajar umbrales ni compuertas en silencio; y no eliminar una prueba para que CI pase sin justificarlo en la PR. CHG-03 provee el marco; los slices aportan la evidencia funcional.

## Refinamientos respecto del TD (pendientes de alineación documental)

Decisiones de esta fase que afinan la redacción del TD §24/§25.2 y de ADR-008/ADR-009, sin contradecir sus principios; deben reflejarse en esos documentos al alinear la documentación (no se editan aquí):
- `db-tests` es un job **independiente** (el TD describe `needs: static`).
- El grupo de concurrencia se llama `fixora-db-tests` (el TD usa `fixora-test-db`).
- En CI, `workers: 1`, `retries: 0` y `trace: retain-on-failure` (el TD admite como máximo un reintento y *trace* en el primer reintento).
- El baseline de Playwright son `chromium-desktop` y `chromium-mobile`; `webkit-mobile` (listado en el TD y en ADR-008) se difiere como ampliación futura.

## Risks / Trade-offs

- [GitHub no ofrece algún mecanismo en el plan (rulesets, Environment `test`, *secret scanning*)] → Se valida en la Fase 7 como validación de plataforma; si falta, se documenta el riesgo residual y una alternativa sin debilitar la arquitectura en silencio.
- [Arranque en frío de Neon e inestabilidad en CI] → Calentamiento previo y tiempos de espera generosos; sin reintentos que oculten fallos (`retries: 0`).
- [Un *check* requerido queda pendiente por filtros de rutas o nombres cambiantes] → Sin filtros por ruta y nombres estables.
- [Cola larga en `db-tests` con una sola base] → Aceptado; mitigación futura con ramas efímeras solo si el tiempo lo exige.
- [Artefactos pesados o con datos] → Artefactos solo ante fallo, con datos ficticios y retención corta.
- [`npm audit` produce ruido o un bloqueo sin corrección disponible] → CI en rojo por defecto; excepción temporal documentada y aprobada por el usuario.
- [Fuga de secretos desde CI] → `static` sin secretos, permisos mínimos, sin `pull_request_target`, registros sanitizados.
- [Compilar en ambos jobs duplica trabajo] → Aceptado para mantener los jobs autocontenidos; se revisaría solo por una razón objetiva de coste.

## Migration Plan

1. Preflight de versiones y de capacidades de GitHub.
2. Con aprobación: instalar `@vitest/coverage-v8` y `@playwright/test`.
3. Reorganizar Vitest en proyectos y añadir la cobertura selectiva.
4. Añadir la base de Playwright y su verificación técnica.
5. Crear `TRACEABILITY.md` y `test:trace`.
6. Crear los workflows `static` y `db-tests` y la plantilla de PR.
7. Con aprobación: configurar el Environment `test`, los secretos de pruebas y la protección de `main`.
8. Verificar con una PR real.

**Rollback:** los cambios son de código y configuración; se revierten con `git`. Los ajustes de GitHub (protección, Environment, secretos) se retiran manualmente.

## Open Questions

| # | Pregunta | Clasificación |
|---|---|---|
| OQ-1 | Nombre del grupo de concurrencia, `queue: max`, política de reintentos de Playwright, proyectos del baseline y umbral de `npm audit` | **RESUELTAS** (D-3, D-6, D-8); solo se re-comprueba la sintaxis exacta de GitHub al implementar |
| OQ-2 | Disponibilidad de rulesets o protección de ramas en el plan y el repositorio | PRE-IMPLEMENTATION GITHUB |
| OQ-3 | Disponibilidad de *secret scanning* nativo de GitHub | PRE-IMPLEMENTATION GITHUB |
| OQ-4 | Secretos de repositorio frente a Environment `test` (y ausencia de aprobación manual en ese Environment para no bloquear PR) | PRE-IMPLEMENTATION GITHUB |
| OQ-5 | Disponibilidad y uso opcional de Dependabot | PRE-IMPLEMENTATION GITHUB |
| OQ-6 | Versiones exactas de Vitest, `@vitest/coverage-v8`, Playwright y SHA de las acciones; compatibilidad con Node 24 | PRE-IMPLEMENTATION TOOLCHAIN |
| OQ-7 | API efectiva de proyectos de Vitest en la versión instalada | PRE-IMPLEMENTATION TOOLCHAIN |
| OQ-8 | Interacción de `npm ci --ignore-scripts` con Prisma | PRE-IMPLEMENTATION TOOLCHAIN |
| OQ-9 | Necesidad excepcional de una variable placeholder en build/generate | DEPENDE DE AV-2 / CHG-02 (no es una decisión de CHG-03) |
| OQ-10 | Tiempos de espera, retención de artefactos, vocabulario de estados de `TRACEABILITY.md` y módulos puros iniciales de la cobertura | IMPLEMENTATION DETAIL |
| OQ-11 | Pruebas, filas de trazabilidad y E2E de cada requisito futuro | DEFERRED a los changes funcionales |

Ninguna pregunta bloquea la aprobación documental de CHG-03.
