# Tasks

> Planificación únicamente. Nada de esto se ejecuta hasta que el change esté revisado, aprobado y el usuario autorice `/opsx:apply` en la Fase 7, **con CHG-01 y CHG-02 aplicados**. Toda instalación de dependencias, creación de workflows, secretos o ajustes de GitHub y toda conexión a Neon requiere aprobación explícita en el momento. No hay tareas de lógica funcional.

## 1. Preflight de toolchain y de plataforma

- [x] 1.1 Confirmar el DoR de implementación (CHG-01 y CHG-02 aplicados y archivados, AV-2 aprobado, Node 24.x, aprobaciones de dependencias y de ajustes de GitHub); se verifica con una nota de aprobación en el change y `node --version` (major 24).
- [x] 1.2 Preflight de versiones: versión estable de `vitest` ya instalada y de `@vitest/coverage-v8` (misma versión), versión estable de `@playwright/test`, compatibilidad con Node 24 y API vigente de proyectos de Vitest; nunca prerelease; se verifica con la nota de decisión que registra versiones y evidencias.
- [x] 1.3 Preflight de plataforma: volver a comprobar en la documentación vigente de GitHub la sintaxis de `concurrency` con `queue: max`, la disponibilidad de rulesets o protección de ramas, del Environment `test`, de *secret scanning* y de Dependabot en el plan del repositorio; se verifica con una nota que registra cada capacidad como disponible, no disponible o con alternativa.
- [x] 1.4 Con aprobación, instalar `@vitest/coverage-v8` (versión igual a Vitest) y `@playwright/test`, fijando versiones; se verifica con `npm ls --depth=0`, que el lockfile solo cambia por estas dependencias y que no se instalaron escáneres de secretos ni otras herramientas.

## 2. Orquestación global de Vitest

- [x] 2.1 Reorganizar `vitest.config.ts` en proyectos `unit` (entorno Node, paralelo, `src/**/*.test.ts` y `tests/tooling/**`) e `integration` (entorno Node, serial, `tests/integration/**`, tiempos de espera acordes al arranque en frío de Neon), conservando los scripts `test:unit` y `test:integration`; se verifica con `npm run test:unit` y `npm run test:integration` ejecutando cada uno solo su proyecto.
- [x] 2.2 Conectar el `globalSetup` del proyecto `integration` a la guardia y a la preparación de migraciones **de CHG-02** (sin reimplementarlas); se verifica con una ejecución que aborta ante un marcador ausente y otra que procede sobre una rama `test` marcada.
- [x] 2.3 Añadir el script `test:coverage` (proyecto `unit` con cobertura, sin duplicar la ejecución de `test:unit`); se verifica con `npm run test:coverage` en verde.

## 3. Cobertura selectiva

- [x] 3.1 Configurar `@vitest/coverage-v8` con `coverage.include` explícito en `domain/` y módulos puros seleccionados, umbral de 90 % de líneas y de ramas solo para ese conjunto, sin umbral global ni en UI, Next, `infrastructure/`, Prisma, código generado ni configuración; se verifica con una ejecución que supera el umbral y otra, controlada y no versionada, que lo incumple y falla.
- [x] 3.2 Comprobar que los archivos del conjunto aún no alcanzados por ninguna prueba aparecen en el informe; se verifica con la lectura del informe de cobertura.

## 4. Orquestación del harness de integración

- [x] 4.1 Ejecutar el harness de CHG-02 mediante la orquestación global, con las variables `TEST_*` suministradas por el entorno y `DATABASE_URL = TEST_DATABASE_URL` solo para el proceso hijo de la aplicación; se verifica con una ejecución completa de `test:integration` sobre la rama `test`.
- [x] 4.2 Confirmar que CHG-03 no redefine el marcador, la guardia, el reinicio ni las pruebas de persistencia; se verifica con la revisión del diff.

## 5. Base de Playwright

- [x] 5.1 Crear la configuración de Playwright: `next build` + `next start` (nunca `next dev`), proyectos `chromium-desktop` y `chromium-mobile`, `workers: 1` y `retries: 0` en CI, `trace: retain-on-failure` (o la forma exacta soportada por la versión instalada) y artefactos únicamente ante fallo; se verifica con `npm run test:e2e` localmente y con que ninguna prueba fallida se reintenta.
- [x] 5.2 Añadir la verificación técnica estable: el servidor de prueba responde, la página raíz carga sin error fatal y la configuración detecta una aserción fallida; no verifica textos, maquetación ni contenido de la landing; se verifica con una ejecución en verde y una ejecución negativa controlada, no versionada, que falla como se espera.
- [x] 5.3 Añadir el script `test:e2e` y la instalación del navegador con la herramienta del paquete; se verifica con la ejecución de los dos proyectos.

## 6. Trazabilidad

- [x] 6.1 Crear `docs/07-testing/TRACEABILITY.md` con `ID | change dueño | nivel | prueba o evidencia | estado` para `SC-01`…`SC-20` y `E1`…`E17`, inicializado con los dueños primarios de `BACKLOG.md` §11 y estado pendiente, sin copiar el texto del PRD; se verifica con las 37 filas y la comparación con el backlog.
- [x] 6.2 Implementar el script `test:trace`, propio y sin dependencias nuevas: detecta identificadores desconocidos o ausentes, criterios sin dueño cuando ya deberían tenerlo, referencias a pruebas inexistentes cuando el estado indica «implementado» y etiquetas `[SC-xx]`/`[Ex]` con IDs inexistentes; se verifica con pruebas unitarias del script (casos válidos e inválidos).
- [x] 6.3 Confirmar que la trazabilidad y la cobertura son compuertas distintas y que ninguna sustituye a la otra; se verifica con la revisión del `design.md` y de la configuración.

## 7. Workflow `static`

- [ ] 7.1 Crear el job `static` con los pasos en orden: *checkout* → Node 24 desde `.nvmrc` → `npm ci` → generación del cliente de Prisma → `lint` → `typecheck` → `test:coverage` → `test:trace` → detección de secretos → `npm audit` → `build`; disparadores `pull_request` hacia `main` y `push` a `main`, sin `pull_request_target`, sin filtros por ruta en los *checks* obligatorios y permisos `contents: read`; se verifica con una ejecución verde en una PR de prueba.
- [x] 7.2 Comprobar que `static` no recibe ninguna credencial PostgreSQL (`DATABASE_URL`, `DIRECT_URL`, `TEST_*`) ni usa el Environment `test`, y que el *build* no se conecta a la base de datos ni migra; se verifica con la revisión del workflow y una ejecución sin esas variables.
- [x] 7.3 Fijar cada acción externa por SHA completo verificado contra su repositorio oficial, con el *tag* como comentario, usando solo acciones oficiales de GitHub imprescindibles; se verifica con una comprobación de que ninguna acción usa un *tag* flotante.

## 8. Workflow `db-tests`

- [ ] 8.1 Crear el job `db-tests`, **independiente de `static` (sin `needs`)** y autocontenido, con los pasos: *checkout* → Node 24 → `npm ci` → generación del cliente → calentamiento de Neon `test` con un *script* propio → guardia y preparación de migraciones → integración → su propio `build` → `next start` → navegador de Playwright → E2E → subida de *traces* solo ante fallo; se verifica con una ejecución verde en una PR de prueba y con que `static` y `db-tests` arrancan a la vez.
- [ ] 8.2 Serializar únicamente `db-tests` con `concurrency: { group: fixora-db-tests, queue: max }` en el nivel mínimo apropiado, sin `cancel-in-progress`, volviendo a comprobar la sintaxis contra la documentación vigente de GitHub; `static` no usa ese grupo; se verifica lanzando dos ejecuciones y comprobando que la segunda de `db-tests` espera, que la primera no se cancela y que los `static` de ambas corren en paralelo.
- [ ] 8.3 Incluir la comprobación de que una base vacía llega al esquema actual solo con migraciones (prueba de CHG-02), con el mecanismo aislado disponible; se verifica con su ejecución en el job.
- [ ] 8.4 Configurar el uso exclusivo de credenciales de prueba (`TEST_DATABASE_URL`, `TEST_DIRECT_URL`, `RATE_LIMIT_HMAC_SECRET` de test y, cuando CHG-08 las necesite, credenciales ficticias de administrador de test) desde el Environment `test` o el mecanismo que 1.3 apruebe, sin Production; se verifica con la revisión del workflow y con que ninguna credencial de Production existe en el repositorio de GitHub.

## 9. Seguridad y cadena de suministro

- [x] 9.1 Configurar `npm audit` con la política de V1: bloquean CI los hallazgos críticos y altos; los moderados y bajos se reportan sin bloquear; nunca `npm audit fix --force` ni actualizaciones de *major* automáticas; el estado por defecto ante un hallazgo alto o crítico es CI en rojo y solo cabe una excepción temporal documentada (advisory, paquete, exposición real, mitigación, fecha de revisión) y aprobada por el usuario; se verifica con una ejecución que bloquea un hallazgo simulado de severidad alta y la lectura de la política escrita.
- [x] 9.2 Habilitar la detección de secretos con la capacidad nativa de GitHub si 1.3 la confirma; si no está disponible, **detenerse y solicitar aprobación** de herramienta, acción, permisos y flujo de datos antes de añadir otra; se verifica con la nota de decisión y una prueba controlada con un valor ficticio.
- [x] 9.3 Evaluar Dependabot o equivalente (capacidad de plataforma opcional, no una puerta obligatoria) y `npm ci --ignore-scripts` frente a Prisma; se verifica con la nota de decisión y, si se adopta, una ejecución del *build*.
- [ ] 9.4 Verificar que los registros de CI no imprimen entorno completo, URL con credenciales, contraseñas, *tokens*, el secreto HMAC, códigos de seguimiento ni datos personales; se verifica con la revisión de los registros de una ejecución y pruebas con valores canario sobre los *scripts* propios.

## 10. Protección del repositorio y plataforma

- [ ] 10.1 Crear la plantilla de PR con la declaración de compatibilidad hacia atrás de las migraciones, la actualización de `TRACEABILITY.md` y las pruebas añadidas; se verifica con su aparición al abrir una PR.
- [ ] 10.2 Con aprobación, configurar la protección de `main` con el mecanismo que 1.3 confirme: PR obligatoria, `static` y `db-tests` ambos requeridos, sin *force-push* y sin *push* directo rutinario; se verifica con una PR de prueba que no puede fusionarse con cualquiera de los dos *checks* en rojo y con el registro de la configuración efectiva.
- [ ] 10.3 Con aprobación, crear el Environment `test` (si 1.3 lo confirma) sin aprobación manual y los secretos de prueba; se verifica con una ejecución de `db-tests` que los recibe y con que `static` no.

## 11. Verificación final del change

- [x] 11.1 Ejecutar `npm run lint`, `npm run typecheck`, `npm run test:coverage`, `npm run test:integration`, `npm run test:e2e`, `npm run test:trace` y `npm run build` localmente y registrar el resultado; se verifica con las siete ejecuciones en verde.
- [ ] 11.2 Recopilar la evidencia de `SC-19` (ejecución verde de una PR real con ambos jobs, workflow revisado, configuración de `main`, serialización de `db-tests`, independencia de ambos jobs, informe de `test:trace`); se verifica con la nota de evidencia registrada en `docs/07-testing/`.
- [x] 11.3 Revisar el alcance del diff: no hay Production, `migrate-production`, Vercel, Security Pass, E2E-01, lógica funcional, migraciones nuevas ni credenciales de Production; se verifica con el `git diff` y que `openspec validate ci-quality-gates --strict` sigue pasando.

## Notas de implementación (2026-10-28)

- **1.1 Aprobaciones.** CHG-01 y CHG-02 archivados; Node 24.22.1. El usuario autorizó por escrito la instalación de las dependencias previstas y la ejecución autónoma de CHG-03. **No** se han aprobado todavía las acciones sobre GitHub (push, Environment `test` y sus secretos, protección de `main`): son las tareas 10.2 y 10.3 y el cierre de 7.1/8.x.
- **1.2 Versiones** (`npm view`, 2026-10-28): `@vitest/coverage-v8` 5.0.5 (= Vitest 5.0.5, peer exacto); `@playwright/test` 1.64.1 (`latest` estable; `next` es alpha, descartado); API vigente de Vitest 5: `test.projects`. Node >= 20 en Playwright.
- **1.3 Plataforma:** ver `docs/07-testing/CI-QUALITY-GATES.md`. `queue: max` confirmado (changelog de GitHub, 2026-05-07; incompatible con `cancel-in-progress: true`). Secret scanning y push protection ya activados; rulesets y Environments disponibles (repositorio público, permiso de administración); `main` sin proteger; sin Environments ni secretos de Actions; Dependabot desactivado.
- **1.4.** Solo cambian `package.json` y el lockfile por `@vitest/coverage-v8` y `@playwright/test` (y transitivas). Sin escáneres de secretos ni otras herramientas.
- **2.1.** `vitest.config.ts` pasa a `test.projects` (`unit`, `integration`); se elimina `vitest.integration.config.ts` de CHG-02 (su contenido vive ahora en el proyecto `integration`, con el mismo `globalSetup`). `test:unit` y `test:integration` ejecutan solo su proyecto.
- **3.1.** Evidencia: con un archivo no cubierto en `src/domain/` (no versionado) `test:coverage` falla con `rc=1` por líneas y ramas; sin él pasa con 100 %. El archivo aparece en el informe con 0 % (3.2). Conjunto inicial: `src/domain/**`; los módulos puros de otras capas entran por revisión de PR.
- **5.2.** Evidencia negativa: un spec que falla (no versionado) hace fallar `playwright test` con `rc=1`, sin reintento y conservando traza y captura; `test.fail()` demuestra en el spec versionado que la configuración detecta aserciones fallidas.
- **6.x.** `TRACEABILITY.md` generado desde el §11 del backlog (20 + 17 filas); `test:trace` (`scripts/check-traceability.ts`) con 11 pruebas unitarias. `SC-14` queda `parcial` (evidencia de CHG-02). Los fixtures con etiquetas inválidas de `tests/trace/` se excluyen del escaneo de etiquetas.
- **7.2.** Simulación del job `static` en una copia limpia **sin archivos de entorno ni variables de base de datos** (`npm ci --ignore-scripts` → `db:generate` → lint → typecheck → cobertura → trazabilidad → secretos → audit → build): todo en verde. El build no se conecta ni migra.
- **7.3 / 9.1 / 9.2 / 9.3.** SHA verificados contra los repositorios oficiales (checkout v7.0.1, setup-node v7.1.0, upload-artifact v7.0.2); política de `npm audit` ejecutable (`ci:audit`) con un hallazgo alto simulado que bloquea; `ci:secrets` es complemento del secret scanning nativo (no un escáner de terceros); `--ignore-scripts` es compatible con Prisma y **no se impone**; Dependabot no se activa sin aprobación (opcional).
- **Defecto hallado y corregido:** en la simulación, `ci:secrets` marcó las propias pruebas con valores ficticios; se excluyen por nombre exacto (`tests/tooling/ci-scripts.test.ts`, `tests/trace/`).
- **Estabilidad.** Una ejecución de `test:unit` falló una vez por superar los 5 s por defecto en pruebas que lanzan procesos; el proyecto `unit` fija `testTimeout: 30 s` (4 ejecuciones posteriores en verde).

### Pendiente real: requiere acciones en GitHub que solo puede aprobar o realizar el usuario

- **7.1, 8.1, 8.2, 8.3, 8.4, 9.4, 10.1, 11.2:** exigen una ejecución real de los workflows (una PR de prueba y dos ejecuciones para comprobar la cola de `db-tests`), por tanto *push* de una rama, el Environment `test` con sus secretos y la lectura de los registros de CI.
- **10.2, 10.3:** protección de `main` (PR obligatoria, `static` y `db-tests` requeridos, sin *force-push*) y creación del Environment `test` (sin aprobación manual) con `TEST_DATABASE_URL`, `TEST_DIRECT_URL` y `RATE_LIMIT_HMAC_SECRET` de test.

## Workflow follow-up

- Revisar y aprobar el change; el usuario autoriza explícitamente `/opsx:apply` en la Fase 7, con el DoR de `docs/04-planificacion/BACKLOG.md` cumplido.
- Archivar el change tras implementarlo y verificarlo; al ser `skip_specs`, confirmar entonces el comportamiento del archive sin deltas.
- Cada change funcional posterior añade sus pruebas y actualiza `TRACEABILITY.md`.
