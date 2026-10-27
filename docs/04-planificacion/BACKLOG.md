# FIXORA — Backlog maestro

> Fase 6.3 · Planificación del proyecto · Estado: **APROBADO — Fase 6.3 cerrada**.
>
> Fecha: 2026-10-27.
>
> **Planificación, no Specs ni tareas.** Este documento ordena los **16 changes conceptuales** aprobados en [`OPENSPEC-STRATEGY.md`](OPENSPEC-STRATEGY.md) y fija las condiciones de entrada y de salida de cada uno. No existe ningún change real de OpenSpec, ni `proposal.md`, delta specs, `design.md` ni `tasks.md`; `openspec/specs/` y `openspec/changes/` siguen vacíos. Las Specs canónicas vivirán en `openspec/specs/`.
>
> `OPENSPEC-STRATEGY.md` explica **por qué** FIXORA se divide así; este documento explica **en qué orden y bajo qué condiciones** se ejecutan esos changes. No repite sus tablas largas (capabilities, operaciones por requirement, aristas): las referencia.
>
> Consume: la estrategia, `docs/01-producto/PRD.md`, `docs/02-diseno/DESIGN.md`, `docs/03-arquitectura/TECHNICAL-DESIGN.md` («TD»), los ADRs y `openspec/config.yaml`. Consumido por: Fase 6.4 (creación y revisión de changes OpenSpec).
>
> `SC-*`, `E*`, `RIE-*`, `VAL-*` son del PRD; `PUB-*`/`ADM-*` son las pantallas de DESIGN.md; `CHG-*` son identificadores conceptuales (no nombres OpenSpec); los slugs son los aprobados.

---

## 1. Propósito

Responder: **¿en qué orden implementaremos FIXORA y qué debe estar demostrado para considerar terminado cada change?** No incluye tareas, listas de archivos, estimaciones horarias, puntos de historia ni planificación de sprints.

---

## 2. Principios

1. **Los 16 changes, su numeración, su tratamiento (`DELTA SPECS`/`SKIP_SPECS`) y sus dependencias son los aprobados.** El backlog no los reabre. Si una contradicción objetiva lo exigiera, se reporta antes de cambiar la estrategia.
2. **Prioridad no es orden.** La prioridad mide cuánto bloquea o cuánto aporta; el orden lo fija el DAG (§8) y la secuencia recomendada (§14).
3. **Rebanadas verticales sobre una fundación mínima.** Cada change funcional entrega valor comprobable.
4. **Calidad y seguridad incrementales.** Cada change aporta sus propias pruebas y sus controles de `SC-11`/`SC-12`; CHG-14 y CHG-15 verifican y cierran, no son donde nacen los controles.
5. **Política de main specs de FIXORA.** `openspec/specs/` refleja comportamiento implementado y verificado: un change se archiva solo tras implementar y verificar; no se usa `/opsx:sync` de forma anticipada.
6. **Una propuesta aprobada no autoriza `/opsx:apply`.** La implementación requiere autorización explícita del usuario.
7. **Dependencias nuevas, configuración externa y despliegues** (Neon, Vercel, GitHub) requieren aprobación explícita en el momento, aunque estén aprobadas arquitectónicamente.
8. **El Architecture Validation Gate (AV) pertenece a la Fase 7.** Aquí solo se marca qué change no puede empezar sin él (§9).

---

## 3. Definition of Ready (DoR) de un change

Un change puede **crearse en OpenSpec** (Fase 6.4) o **empezar su implementación** (Fase 7) cuando se cumple lo que aplique. Se distinguen ambos momentos.

**Para materializarlo (Fase 6.4):**
- Fuentes PRD/DESIGN/TD/ADR relevantes identificadas y leídas.
- Alcance delimitado: qué entra y qué queda fuera (ficha de §7).
- Tratamiento `DELTA SPECS`/`SKIP_SPECS` confirmado.
- Ninguna decisión arquitectónica crítica abierta; si aparece una contradicción con una decisión aceptada, se detiene y se reporta.
- Es posible escribir proposal, specs, design y tasks **sin inventar requisitos**.

**Para empezar a implementarlo (`/opsx:apply`, Fase 7):**
- Dependencias **Hard** completadas.
- Si hay dependencia **Spec-base**: el change predecesor está implementado, verificado y **archivado**.
- El **AV** correspondiente (§9) está pasado, si aplica.
- La propuesta y sus artefactos están **revisados y aprobados**, y el usuario ha **autorizado explícitamente** la implementación.
- Si pasó tiempo desde su redacción, se actualiza (`/opsx:update`) frente al estado real del código antes de aplicar.
- Aprobaciones externas obtenidas cuando el change las requiera (dependencias, Neon, Vercel, GitHub).

El DoR **no** exige tener resueltos todos los detalles técnicos: las decisiones diferidas de TD §28 se cierran en el `design.md` del change.

---

## 4. Definition of Done (DoD)

### 4.1 DoD global
Un change se considera terminado cuando, según aplique:
1. Todas las tareas de `tasks.md` están completadas.
2. Los requisitos y escenarios de sus delta specs están satisfechos (en `SKIP_SPECS`, se sustituye por: el objetivo y la evidencia de salida del change se cumplen y no apareció comportamiento observable nuevo).
3. Pruebas del nivel adecuado, en verde: **unitarias** (dominio y funciones puras), **de integración** contra PostgreSQL real (casos de uso, repositorios, restricciones, concurrencia) y **Playwright** donde aporta valor. No se exige E2E completo en todos los changes.
4. `lint`, `typecheck` y `build` en verde; CI en verde.
5. Seguridad relevante comprobada: no regresión de `SC-11`/`SC-12`, logs sin datos sensibles, resultados visibles conformes a DESIGN.
6. Documentación afectada actualizada (incluido `TRACEABILITY.md` cuando exista).
7. Evidencia registrada (informe de pruebas o referencia en el change).
8. El change está **verificado** y **aprobado para archive** por el usuario; luego se archiva (sincroniza las main specs en los `DELTA SPECS`). *«Verificado» en este backlog significa verificación mediante pruebas, evidencia y revisión contra proposal/spec/design/tasks; no implica el workflow opcional `/opsx:verify`, que no está habilitado en el perfil `core`.*

### 4.2 DoD específica
Cada ficha (§7) añade criterios propios. Un change **no termina porque «exista la pantalla»**: termina cuando se demuestra el comportamiento acordado. Ejemplo: CHG-05 no termina con el formulario; termina cuando el registro válido funciona, el reenvío no duplica, la orden y su evento inicial son atómicos, el código se genera y se confirma, los errores definidos se muestran y las pruebas pasan.

---

## 5. Prioridades y tamaño

| Prioridad | Significado |
|---|---|
| **P0** | Habilitador crítico: sin él no avanza de forma segura una parte importante del proyecto |
| **P1** | Necesario para V1 y para el flujo principal (E2E-01) |
| **P2** | Necesario para completar V1; no bloquea los primeros slices |
| **P3** | Cierre, hardening o entrega |

Tamaño relativo: **S / M / L** (alcance y complejidad comparados; no son horas, días ni puntos).

| Change | Prioridad | Tier | Tamaño | Riesgo | Tratamiento |
|---|---|---|---|---|---|
| CHG-01 `application-skeleton` | P0 | 0 | L | Medio | SKIP_SPECS |
| CHG-02 `persistence-foundation` | P0 | 0 | M | Alto | SKIP_SPECS |
| CHG-03 `ci-quality-gates` | P0 | 0 | M | Medio | SKIP_SPECS |
| CHG-04 `ui-foundation-and-public-entry` | P0 | 0 | M | Bajo | DELTA SPECS |
| CHG-05 `repair-request-registration` | P1 | 1 | L | Medio | DELTA SPECS |
| CHG-06 `public-order-tracking` | P1 | 1 | L | Alto | DELTA SPECS |
| CHG-07 `production-environment-baseline` | P2 | 1 (recomendado) | M | Alto | SKIP_SPECS |
| CHG-08 `admin-access` | P1 | 2 | L | Alto | DELTA SPECS |
| CHG-09a `admin-order-directory` | P1 | 2 | M | Medio | DELTA SPECS |
| CHG-09b `admin-order-detail` | P1 | 2 | M | Medio | DELTA SPECS |
| CHG-10 `repair-status-lifecycle` | P1 | 3 | L | Alto | DELTA SPECS |
| CHG-11 `diagnosis-and-estimate` | P1 | 3 | M | Alto | DELTA SPECS |
| CHG-12 `order-notes` | P2 | 4 | M | Medio | DELTA SPECS |
| CHG-13 `order-data-correction` | P2 | 4 | S | Medio | DELTA SPECS |
| CHG-14 `security-hardening-pass` | P3 | 5 | M | Medio | SKIP_SPECS |
| CHG-15 `release-readiness` | P3 | 5 | M | Bajo | SKIP_SPECS |

*CHG-07 es P2 (necesario para completar V1, no bloquea slices) aunque se recomiende ejecutarlo temprano; la prioridad no es el orden.*

---

## 6. Milestones

| Milestone | Changes necesarios | Evidencia | Todavía NO incluye |
|---|---|---|---|
| **M0 — Foundation lista** | CHG-01, 02, 03, 04 | Esqueleto TypeScript con capas y reglas de lint; migraciones desde cero con el rol de aplicación de mínimo privilegio; pipeline `static` + `db-tests` en verde en una PR real; UI base y landing responsive; guardia de pruebas verificada | Cualquier flujo de negocio |
| **M1 — Primer flujo público** | + CHG-05, 06 (+ CHG-07 recomendado) | El cliente registra una reparación, recibe y conserva su código y la consulta; `SC-11` verificado con prueba negativa; límite de intentos visible | Acceso administrativo; cambios de estado; diagnóstico y costo; notas |
| **M2 — Administración navegable** | + CHG-08, 09a, 09b | El administrador inicia sesión, lista, busca, filtra y abre una orden; `SC-12` verificado con acceso directo sin sesión; logout con Back/Forward | Cambios de estado y edición |
| **M3 — E2E-01** | + CHG-10, 11 | Flujo obligatorio del PRD (`SC-17`): cliente registra → código → admin inicia sesión → encuentra la orden → transiciones válidas → diagnóstico y costo → `ESPERANDO_APROBACION` con `E11` → el cliente consulta y ve estado, Journey, diagnóstico y costo | Notas; corrección de datos; hardening; producción final |
| **M4 — V1 funcional completa** | + CHG-12, 13 | Notas públicas e internas y corrección de datos; toda la funcionalidad de PRD §4 | Security Pass formal; evidencia de release |
| **M5 — V1 lista para evaluación y despliegue** | + CHG-07, 14, 15 (CHG-07 ya hecho si se hizo temprano) | Security Pass sin Critical/High; `SC-15` revisado; smoke de Production (`SC-20`); trazabilidad completa; runbooks y *seed* | — |

---

## 7. Backlog maestro (fichas)

Convenciones: **Hard / Spec-base / Delivery / Soft** son los tipos de dependencia de la estrategia (§12.1). «Entrada» y «Salida» son criterios de este backlog; la lista de tareas se escribirá en `tasks.md` (Fase 6.4). Los niveles de prueba siguen *dominio → unitaria*, *aplicación y persistencia → integración*, *framework y UI → Playwright donde aporte valor*.

### CHG-01 — `application-skeleton`

| Campo | Contenido |
|---|---|
| Título | Esqueleto de aplicación tipado y por capas |
| Tipo / Tratamiento | foundation / **SKIP_SPECS** |
| Prioridad / Tier / Tamaño / Riesgo | P0 / 0 / L / Medio (migra el scaffold JavaScript a TypeScript y ESM) |
| Objetivo | TypeScript estricto y ESM, Node 24 alineado, capas `app → application → domain` e `infrastructure` con reglas de importación, reglas de lint de seguridad, logger cerrado, `ActionResult` y frontera de errores, validadores base y ejecutor mínimo de Vitest |
| Capabilities | Ninguna |
| Hard / Spec-base / Delivery / Soft | — / — / — / — |
| Requiere AV | Ninguno. *Nota:* antes de aplicar CHG-01 en la Fase 7 se recomienda ejecutar la comprobación acotada de ESM/Prisma prevista dentro de AV-2 para reducir el riesgo de retrabajo; esto no convierte a AV-2 en dependencia formal de CHG-01 |
| PRD · DESIGN · TD/ADR | — · — · TD §3, §5, §6, §18, §21.2, §23; ADR-001, ADR-008, ADR-010 |
| Pruebas | Unitarias |
| Seguridad | Logging sin datos sensibles (valores canario); `no-console`, sin `dangerouslySetInnerHTML`, `server-only`; `SC-11`/`SC-12`: N/A |
| Entrada | Node local alineado con 24.x (hoy 26.x); aprobación de las dependencias de la fundación |
| Salida / DoD | `lint`, `typecheck`, `build` y pruebas unitarias en verde; prueba canario del logger; reglas de importación probadas; ninguna lógica de negocio |
| Evidencia | Informe de pruebas y de reglas de lint |

### CHG-02 — `persistence-foundation`

| Campo | Contenido |
|---|---|
| Título | Persistencia, roles y base del limitador |
| Tipo / Tratamiento | foundation / **SKIP_SPECS** |
| Prioridad / Tier / Tamaño / Riesgo | P0 / 0 / M / Alto (primera base de datos, roles, migraciones) |
| Objetivo | Prisma 7 estable + `@prisma/adapter-pg`, Neon (ramas y roles), `prisma.config.ts`, migraciones *forward-only*, infraestructura de pruebas contra PostgreSQL real con guardia y marcador, y el **componente técnico del limitador** (almacén, clave HMAC, servicio) que consumirán CHG-06 y CHG-08 |
| Capabilities | Ninguna (`RATE_LIMITED`/`SERVICE_UNAVAILABLE` los especifican CHG-06 y CHG-08; no existe una capability `rate-limiting`) |
| Hard / Spec-base / Delivery / Soft | CHG-01 / — / — / — |
| Requiere AV | **AV-2** |
| PRD · DESIGN · TD/ADR | `SC-14` · — · TD §10, §11, §22, §24, §25.1; ADR-003, ADR-007, ADR-008 |
| Pruebas | Integración (privilegios del rol, restricciones, migración desde cero, limitador), unitarias del primitivo |
| Seguridad | Mínimo privilegio (sin DDL, sin `DELETE` en órdenes); guardia anti-desastre; clave del limitador con HMAC, sin IP en claro; el limitador falla cerrado |
| Entrada | AV-2 pasado; CHG-01 completo; aprobación de las dependencias (Prisma, `pg`) y de la configuración de Neon |
| Salida / DoD | Una base vacía llega al esquema solo con migraciones; el rol runtime no tiene DDL ni privilegios prohibidos; la guardia aborta ante un marcador ausente; el limitador pasa sus pruebas de ventana, bloqueo y fallo cerrado |
| Evidencia | Pruebas de integración y de privilegios |

### CHG-03 — `ci-quality-gates`

| Campo | Contenido |
|---|---|
| Título | Infraestructura de calidad y CI |
| Tipo / Tratamiento | foundation (delivery) / **SKIP_SPECS** |
| Prioridad / Tier / Tamaño / Riesgo | P0 / 0 / M / Medio (secretos de CI, capacidades del plan de GitHub) |
| Objetivo | Cobertura (`@vitest/coverage-v8`, umbral en `domain/`), orquestación global de Vitest y ejecución en CI del harness de persistencia de CHG-02 (el contrato de BD de test, el marcador, la guardia y el reinicio son de CHG-02), base de Playwright (proyectos de escritorio y móvil), `TRACEABILITY.md` y su verificación, jobs `static` y `db-tests` con cola, protección de `main`, escaneo de secretos y `npm audit` |
| Capabilities | Ninguna |
| Hard / Spec-base / Delivery / Soft | CHG-02 (y CHG-01) / — / — / — |
| Requiere AV | AV-2 (por `db-tests`) |
| PRD · DESIGN · TD/ADR | `SC-19` (primario), `SC-17` (infraestructura) · — · TD §24, §25.2; ADR-008, ADR-009 |
| Pruebas | Las del propio pipeline |
| Seguridad | `pull_request_target` prohibido, permisos mínimos, acciones fijadas por SHA, sin secretos de producción en CI |
| Entrada | CHG-02 completo; aprobación de los secretos del entorno `test` y de la configuración de GitHub |
| Salida / DoD | Pipeline `static` y `db-tests` en verde en una PR real; verificación de base vacía; protección de `main` activa; cada change posterior aporta sus propias pruebas |
| Evidencia | Ejecución del pipeline |

### CHG-04 — `ui-foundation-and-public-entry`

| Campo | Contenido |
|---|---|
| Título | Base de UI y entrada pública |
| Tipo / Tratamiento | foundation + functional / **DELTA SPECS** |
| Prioridad / Tier / Tamaño / Riesgo | P0 / 0 / M / Bajo |
| Objetivo | Tokens, tipografía, layout, primitivas de UI, iconos SVG locales, landing (PUB-01), navegación pública y acceso discreto al taller, aviso de entorno demostrativo, páginas públicas de no encontrado y de error, cabeceras públicas base |
| Capabilities | `public-site-entry` (nueva) |
| Hard / Spec-base / Delivery / Soft | CHG-01 / — / — / CHG-03 |
| Requiere AV | **AV-1 (parcial)**: no impide iniciar la UI; condiciona sus cabeceras y su *shell* |
| PRD · DESIGN · TD/ADR | §4.1, §4.10, `RIE-20`, `SC-15` (parcial) · PUB-01, §4, §5, §6, §13.8, Apéndice A.2–A.4 · TD §6, §21.3, §21.7, §30; ADR-002, ADR-007 |
| Pruebas | Playwright (navegación y responsive), manual/UX |
| Seguridad | Sin recursos de terceros; cabeceras base; `SC-11`/`SC-12`: N/A |
| Entrada | CHG-01 completo |
| Salida / DoD | Landing y navegación funcionan en móvil y escritorio sin desplazamiento horizontal; aviso demo visible; 404 y error inesperado conformes al Apéndice A; las primitivas complejas no se crean aquí |
| Evidencia | Pruebas Playwright y revisión responsive |

### CHG-05 — `repair-request-registration`

| Campo | Contenido |
|---|---|
| Título | Registro público de una reparación |
| Tipo / Tratamiento | functional / **DELTA SPECS** (2 capabilities) |
| Prioridad / Tier / Tamaño / Riesgo | P1 / 1 / L / Medio |
| Objetivo | PUB-02/PUB-03: capturar y validar la solicitud, crear la orden con su evento inicial, idempotencia del envío, confirmación y entrega del código; introduce la identidad del código en `public-order-tracking` (sin consulta) |
| Capabilities | `repair-request-registration` (nueva), `public-order-tracking` (nueva, solo identidad del código) |
| Hard / Spec-base / Delivery / Soft | CHG-02, CHG-04 / — / — / CHG-03 |
| Requiere AV | **AV-1** (Activity, Server Action, Origin/Host), **AV-2** |
| PRD · DESIGN · TD/ADR | `SC-01`, `SC-16`, `E1`, `E2`, `E3`, `E13`, `E16`, `E17` · PUB-02, PUB-03, §6.5, §6.9, §13.1, §13.7 · TD §12, §13, §18; ADR-005, ADR-006 |
| Pruebas | Unit (validadores, generación y formato del código) · Integración (caso de uso, idempotencia, atomicidad, restricciones) · E2E (registro, doble envío, Back) |
| Seguridad | `SC-11`: la confirmación solo lleva código y equipo; sin datos personales en logs; código CSPRNG fuera de URL; sin anti-spam (`E13`) |
| Entrada | CHG-02 y CHG-04 completos; AV-1 y AV-2 pasados |
| Salida / DoD | Registro válido; validación por campo (`SC-16`); reenvío no duplica; orden y evento inicial atómicos; código generado con colisión acotada; confirmación con «conserva tu código» (`E2`); el estado del flujo no reaparece al navegar fuera y volver |
| Evidencia | Pruebas unitarias, de integración y E2E de registro |

### CHG-06 — `public-order-tracking`

| Campo | Contenido |
|---|---|
| Título | Consulta pública por código |
| Tipo / Tratamiento | functional / **DELTA SPECS** (extiende la capability) |
| Prioridad / Tier / Tamaño / Riesgo | P1 / 1 / L / Alto (`SC-11`, credencial de lectura) |
| Objetivo | PUB-04/PUB-05: normalización y búsqueda del código, resultado uniforme para mal formado o inexistente, vista pública con Journey y timeline, frontera `SC-11`, límite de intentos (usa el limitador de CHG-02) |
| Capabilities | `public-order-tracking` (extiende; `ADDED Requirements`) |
| Hard / Spec-base / Delivery / Soft | CHG-05 / CHG-05 / — / — |
| Requiere AV | **AV-1**, **AV-2** |
| PRD · DESIGN · TD/ADR | `SC-02`, `SC-11`, `SC-13`, `E4`, `E6`, `E15` · PUB-04, PUB-05, §7, §8.1, §9, §13.2 · TD §12, §17, §22; ADR-005, ADR-007 |
| Pruebas | Unit (normalización, Journey) · Integración (proyección mínima, prueba negativa de `SC-11` con orden poblada, limitador) · E2E (consulta, no encontrado, navegar y volver) |
| Seguridad | `SC-11` núcleo; lista positiva; código fuera de URL, logs y caché; `RATE_LIMITED`/`SERVICE_UNAVAILABLE` visibles; falla cerrada |
| Entrada | CHG-05 completo **y archivado**; AV-1 y AV-2 pasados |
| Salida / DoD | Consulta de una orden existente; mal formado e inexistente indistinguibles; `PublicOrderView` solo con las claves permitidas; resultado efímero (recarga vuelve al formulario); límite de intentos con sus dos resultados; el requisito de la vista pública está redactado de forma general para que los changes posteriores lo completen |
| Evidencia | Prueba negativa de `SC-11`, pruebas de limitación y E2E |

### CHG-07 — `production-environment-baseline`

| Campo | Contenido |
|---|---|
| Título | Línea base del entorno de producción |
| Tipo / Tratamiento | delivery / **SKIP_SPECS** |
| Prioridad / Tier / Tamaño / Riesgo | P2 / 1 (recomendado) / M / Alto (secretos y flujo de migración privilegiado) |
| Objetivo | Vercel desde `main`, rama Neon `main` con rol de aplicación, auditoría de variables inyectadas por Marketplace, flujo `migrate-production`, *preflight* de privilegios del rol de producción, Preview sin base de datos, smoke público no mutante |
| Capabilities | Ninguna |
| Hard / Spec-base / Delivery / Soft | CHG-02, CHG-03 / — / CHG-06 (contenido que el smoke consulta) / posición temprana |
| Requiere AV | **AV-3** (se ejecuta con el primer despliegue real) |
| PRD · DESIGN · TD/ADR | `SC-19` (parcial), `SC-20` (línea base) · — · TD §25.1, §25.4–§25.6, §26; ADR-009, ADR-010 |
| Pruebas | Smoke público; verificación de privilegios por catálogo |
| Seguridad | `DIRECT_URL` fuera de Vercel; workflow desde `main` y Environment restringido a `main`; SHA de migraciones como entrada separada; Preview sin credenciales |
| Entrada | CHG-02 y CHG-03 completos; aprobaciones de Vercel, Neon y GitHub Environments |
| Salida / DoD | Despliegue de `main`; primera migración aplicada por el flujo definido; smoke en verde; resultado de AV-3 registrado; no bloquea ningún change funcional |
| Evidencia | Registro del despliegue y del smoke |

### CHG-08 — `admin-access`

| Campo | Contenido |
|---|---|
| Título | Acceso administrativo |
| Tipo / Tratamiento | functional / **DELTA SPECS** |
| Prioridad / Tier / Tamaño / Riesgo | P1 / 2 / L / Alto (autenticación propia, CSP estricta, `SC-12`) |
| Objetivo | ADM-01: login, sesión, logout, autorización uniforme, área administrativa dinámica con CSP estricta, aprovisionamiento del administrador; usa el limitador de CHG-02. **No depende del tracking público** |
| Capabilities | `admin-access` (nueva) |
| Hard / Spec-base / Delivery / Soft | CHG-02, CHG-04 / — / — / CHG-03 |
| Requiere AV | **AV-1 (crítico)**, **AV-2** |
| PRD · DESIGN · TD/ADR | `SC-12`, `E10` (`SC-03` parcial) · ADM-01, §4.6, §13.3, §13.4 · TD §15, §16, §21.3, §22; ADR-004, ADR-007 |
| Pruebas | Unit (formato del hash) · Integración (sesiones, privilegios, limitador) · E2E (login, logout + Back/Forward, acción directa sin sesión) · Seguridad |
| Seguridad | `SC-12` núcleo: `requireAdmin()` y `AdminContext`; `INVALID_CREDENTIALS` uniforme; `scrypt` y hash ficticio; tope de concurrencia con `SERVICE_UNAVAILABLE`, nunca `INVALID_CREDENTIALS`; cookie `__Host-`; CSP con nonce |
| Entrada | CHG-02 y CHG-04 completos; AV-1 y AV-2 pasados; parámetros de `scrypt` medidos |
| Salida / DoD | Login válido e inválido conforme; expiración por inactividad y absoluta; logout efectivo; toda acción administrativa sin sesión devuelve `SESSION_EXPIRED` (prueba parametrizada); CSP estricta efectiva en `/admin/**`; `RATE_LIMITED` y `SERVICE_UNAVAILABLE` visibles |
| Evidencia | Pruebas de seguridad de acceso y de sesión |

### CHG-09a — `admin-order-directory`

| Campo | Contenido |
|---|---|
| Título | Dashboard, listado y búsqueda |
| Tipo / Tratamiento | functional / **DELTA SPECS** |
| Prioridad / Tier / Tamaño / Riesgo | P1 / 2 / M / Medio |
| Objetivo | ADM-02/ADM-03: conteos por estado y recientes, listado, búsqueda por código exacto o nombre parcial, filtro de estado, paginación, acceso al detalle |
| Capabilities | `admin-order-management` (nueva) |
| Hard / Spec-base / Delivery / Soft | CHG-05, CHG-08 / — / — / — |
| Requiere AV | **AV-2** (escape de comodines, columna de búsqueda) |
| PRD · DESIGN · TD/ADR | `SC-03` (parcial), `E7`, `E8`, `E15` · ADM-02, ADM-03, §6.7, §6.10, §6.16 · TD §19; ADR-003 |
| Pruebas | Unit (normalización de nombre, parseo de consulta) · Integración (búsqueda, comodines literales, paginación) · E2E (buscar y filtrar) |
| Seguridad | `SC-12`: toda lectura exige sesión; conocer un UUID no da acceso; el DTO administrativo no se reutiliza en lo público; texto del cliente como texto |
| Entrada | CHG-05 y CHG-08 completos; AV-2 pasado |
| Salida / DoD | Búsqueda combinada con filtro; `Muñoz`/`munoz`; vacío conforme (`E7`); orden estable y paginación (`E8`); `%`, `_`, `\` literales |
| Evidencia | Pruebas de integración y E2E |

### CHG-09b — `admin-order-detail`

| Campo | Contenido |
|---|---|
| Título | Detalle administrativo de una orden (lectura) |
| Tipo / Tratamiento | functional / **DELTA SPECS** |
| Prioridad / Tier / Tamaño / Riesgo | P1 / 2 / M / Medio |
| Objetivo | ADM-04 en lectura: datos del cliente y del equipo, problema, estado, separación visual público/interno, presentación del historial administrativo; base sobre la que actuarán lifecycle, diagnóstico, notas y correcciones |
| Capabilities | `admin-order-management` (extiende) |
| Hard / Spec-base / Delivery / Soft | CHG-05, CHG-08 / CHG-09a / — / CHG-09a |
| Requiere AV | **AV-2** |
| PRD · DESIGN · TD/ADR | `SC-03`, `SC-10` (presentación), `SC-11` (separación) · ADM-04, §7.6, §8.2, §9 · TD §17; ADR-005 |
| Pruebas | Integración (contrato del DTO administrativo) · E2E (abrir detalle) |
| Seguridad | `SC-12`; DTO administrativo separado del público; contenido del cliente como texto (XSS almacenado) |
| Entrada | CHG-09a completo y archivado |
| Salida / DoD | Detalle completo en lectura; orden inexistente conforme; estructura preparada para las acciones posteriores sin implementarlas |
| Evidencia | Pruebas de contrato y E2E |

### CHG-10 — `repair-status-lifecycle`

| Campo | Contenido |
|---|---|
| Título | Ciclo de vida de la orden |
| Tipo / Tratamiento | functional / **DELTA SPECS** |
| Prioridad / Tier / Tamaño / Riesgo | P1 / 3 / L / Alto (integridad de estados, concurrencia, `E11`) |
| Objetivo | Transiciones válidas, `E11` ligada a la versión revisada, cancelación, estados finales, historial de estados, vista desactualizada; refleja el estado en la consulta pública |
| Capabilities | `repair-lifecycle` (nueva); extiende `public-order-tracking` y `admin-order-management` |
| Hard / Spec-base / Delivery / Soft | CHG-06, CHG-09b / CHG-06, CHG-09b / — / — |
| Requiere AV | **AV-1**, **AV-2** |
| PRD · DESIGN · TD/ADR | `SC-04`–`SC-06`, `SC-09`, `SC-10`, `E9`, `E11`, `E13`, `E14` · §7, §11, §12, ADM-04, PUB-05 · TD §7.2, §14; ADR-006 |
| Pruebas | Unit (los 64 pares) · Integración (versión, historial atómico, estado ↔ historial) · E2E (transiciones y diálogos `E11`) |
| Seguridad | `SC-12` en cada acción; el servidor es la fuente de verdad (`CONFIRMATION_REQUIRED`, `TRANSITION_NOT_ALLOWED`); `SC-11`: el timeline público solo muestra transiciones |
| Entrada | CHG-06 y CHG-09b completos y archivados; AV-1 y AV-2 pasados |
| Salida / DoD | Las 10 transiciones y el evento inicial; las demás se rechazan; los cuatro diálogos `E11` y su comprobación en servidor; cualquier mutación efectiva entre la revisión y la ejecución invalida la confirmación; orden y evento de estado atómicos; estados finales cerrados; la transición a *Esperando aprobación* se rechaza mientras no exista el proveedor de su precondición (seguro por defecto) |
| Evidencia | Matriz de 64 pares, pruebas de concurrencia y E2E de transiciones |

### CHG-11 — `diagnosis-and-estimate`

| Campo | Contenido |
|---|---|
| Título | Diagnóstico y costo estimado |
| Tipo / Tratamiento | functional / **DELTA SPECS** |
| Prioridad / Tier / Tamaño / Riesgo | P1 / 3 / M / Alto (`SC-11` sobre valores no publicados, dinero) |
| Objetivo | Registrar y editar diagnóstico y costo, obligatoriedad, historial, congelamiento y publicación; cierra el E2E-01 |
| Capabilities | `diagnosis-and-estimate` (nueva); extiende `admin-order-management` y `public-order-tracking` |
| Hard / Spec-base / Delivery / Soft | CHG-10 / CHG-10 (cadenas de tracking y admin) / — / — |
| Requiere AV | **AV-2** (`NUMERIC`) |
| PRD · DESIGN · TD/ADR | `SC-07`, `SC-08`, `SC-10`, `SC-17`, `E5`, `E6` · ADM-04 (bloque), §11, PUB-05 · TD §8; ADR-005, ADR-006 |
| Pruebas | Unit (dinero con `BigInt`, normalización) · Integración (las cuatro pruebas de valores no publicados) · E2E (**E2E-01 completo**) |
| Seguridad | `SC-11` fuerte: la consulta pública no carga diagnóstico ni costo no publicados; `SC-12`; congelamiento |
| Entrada | CHG-10 completo y archivado; AV-2 pasado |
| Salida / DoD | Diagnóstico y costo editables solo hasta *En diagnóstico*; costo mayor que cero con dos decimales; `SC-07`; congelamiento y publicación al entrar en *Esperando aprobación*; antes de la aprobación nunca se devuelven sus valores públicos; `CANCELADO` publica solo si llegó a *Esperando aprobación*; historial de cambios; E2E-01 en verde |
| Evidencia | E2E-01 y pruebas de integración de publicación |

### CHG-12 — `order-notes`

| Campo | Contenido |
|---|---|
| Título | Notas públicas e internas |
| Tipo / Tratamiento | functional / **DELTA SPECS** |
| Prioridad / Tier / Tamaño / Riesgo | P2 / 4 / M / Medio |
| Objetivo | Agregar, editar y eliminar notas con visibilidad inmutable mientras la orden no esté cerrada; el cliente ve las públicas |
| Capabilities | `order-notes` (nueva); extiende `public-order-tracking` y `admin-order-management` |
| Hard / Spec-base / Delivery / Soft | CHG-10 / **CHG-11** (cadenas de `public-order-tracking` y `admin-order-management`, por la política de main specs) / — / — |
| Requiere AV | **AV-2** (bloqueo de fila) |
| PRD · DESIGN · TD/ADR | `E12`, `E14`, `E9`, `SC-09` · §10, ADM-04, PUB-05 · TD §9; ADR-006 |
| Pruebas | Integración (carrera nota contra cierre, versión de nota) · E2E (notas) |
| Seguridad | `SC-11`: las notas internas nunca llegan a lo público; `SC-12`; contenido como texto |
| Entrada | Para **aplicar**: CHG-10 completo y archivado; CHG-11 implementado, verificado y **archivado**; AV-2 pasado. (Puede **materializarse** en la Fase 6.4 sin esperar a CHG-11) |
| Salida / DoD | Notas operativas; `STALE_NOTE`, `NOTE_NOT_FOUND`, `ORDER_CLOSED`; solo lectura en estados finales; la carrera nota/cierre se resuelve sin pérdida silenciosa |
| Evidencia | Pruebas de carrera y E2E |

### CHG-13 — `order-data-correction`

| Campo | Contenido |
|---|---|
| Título | Corrección de datos básicos |
| Tipo / Tratamiento | functional / **DELTA SPECS** |
| Prioridad / Tier / Tamaño / Riesgo | P2 / 4 / S / Medio (sincronía de la columna de búsqueda; invalidación de `E11`) |
| Objetivo | «Editar datos» (ADM-04) con las mismas validaciones del registro, no en estados finales; el código no se edita |
| Capabilities | `admin-order-management` (extiende) |
| Hard / Spec-base / Delivery / Soft | CHG-10 / **CHG-12** (cadena de `admin-order-management`: CHG-11 → CHG-12 → CHG-13; CHG-11 ya archivado por transitividad) / — / reducción de conflictos sobre ADM-04 (razón adicional, no sustituye a la Spec-base) |
| Requiere AV | Ninguno adicional |
| PRD · DESIGN · TD/ADR | `E3` (admin), `E17`, `SC-09`, `E9` · §6.17, ADM-04 · TD §10, §14; ADR-006 |
| Pruebas | Unit (validaciones compartidas) · Integración (versión, columna de búsqueda) · E2E (corregir) |
| Seguridad | `SC-12`; el dato corregido sigue siendo exclusivamente administrativo (`SC-11`) |
| Entrada | Para **aplicar**: CHG-10 completo y archivado; CHG-12 implementado, verificado y **archivado** (y, por transitividad, CHG-11). (Puede **materializarse** en la Fase 6.4 antes) |
| Salida / DoD | Corrección con las mismas reglas que el registro; bloqueada en estados finales; el código no es editable; una corrección efectiva invalida una confirmación `E11` pendiente (regla general de CHG-10) |
| Evidencia | Pruebas de integración y E2E |

### CHG-14 — `security-hardening-pass`

| Campo | Contenido |
|---|---|
| Título | Security Pass y endurecimiento global |
| Tipo / Tratamiento | quality / **SKIP_SPECS** (solo mientras no aparezca comportamiento observable nuevo) |
| Prioridad / Tier / Tamaño / Riesgo | P3 / 5 / M / Medio (hallazgos tardíos) |
| Objetivo | Security Pass formal sobre el sistema y el despliegue; endurecimiento de cabeceras, CSP efectiva, logs reales y privilegios; reverificación de `SC-11` y `SC-12` |
| Capabilities | Transversal (sin capability propia) |
| Hard / Spec-base / Delivery / Soft | CHG-11, CHG-12, CHG-13 / — / CHG-07 / — |
| Requiere AV | **AV-3** (resultados) |
| PRD · DESIGN · TD/ADR | `SC-18`, `SC-11`, `SC-12` · — · TD §21, §24, §27; ADR-007, ADR-010 |
| Pruebas | Regresión de seguridad automatizada + actividad formal separada |
| Seguridad | Este change **verifica**; no es dueño de ningún control |
| Entrada | **V1 funcional completa (M4)** y despliegue de Production disponible |
| Salida / DoD | Informe del Security Pass con hallazgos, severidad, evidencia y disposición; **ningún Critical ni High abierto**; todo hallazgo que viole `SC-11` o `SC-12` corregido; si la corrección de un hallazgo cambia comportamiento observable, se crea un **nuevo change correctivo de OpenSpec** (fuera de los 16 baseline) con delta specs sobre la capability afectada, salvo que excepcionalmente exista un change relevante todavía activo; ese change correctivo se crea solo si aparece el hallazgo, se implementa y verifica antes de cerrar CHG-14 y no convierte a CHG-14 en propietario del comportamiento. Si el hallazgo es puramente técnico, se corrige dentro de CHG-14 |
| Evidencia | Informe en `docs/08-seguridad/` |

### CHG-15 — `release-readiness`

| Campo | Contenido |
|---|---|
| Título | Verificación final y entrega |
| Tipo / Tratamiento | delivery + quality / **SKIP_SPECS** |
| Prioridad / Tier / Tamaño / Riesgo | P3 / 5 / M / Bajo |
| Objetivo | Cierre de trazabilidad, revisión manual de `SC-15`, *seed* ficticio, runbooks, smoke de Production, estado de release |
| Capabilities | Transversal |
| Hard / Spec-base / Delivery / Soft | CHG-14 / — / CHG-07 / — |
| Requiere AV | **AV-3** |
| PRD · DESIGN · TD/ADR | `SC-14`, `SC-15`, `SC-17`, `SC-19`, `SC-20` · §14, §15 · TD §24, §25.6, §26; ADR-009, ADR-010 |
| Pruebas | Smoke de Production, revisión manual estructurada |
| Seguridad | Sin funcionalidad nueva; `VAL-04` sigue abierto para cualquier uso real |
| Entrada | CHG-14 completo; Production operativa |
| Salida / DoD | `TRACEABILITY.md` completo (20/20 y 17/17); `SC-15` revisado; `SC-20` demostrado; *seed* y runbooks en `docs/09-deploy/`; plan de retiro de la demo |
| Evidencia | `docs/07-testing/` y `docs/09-deploy/` |

---

## 8. DAG y ruta estructural de dependencias

Aristas completas y sus tipos: [`OPENSPEC-STRATEGY.md` §12](OPENSPEC-STRATEGY.md). Resumen de las aristas **Hard** (el código no puede funcionar sin el predecesor):

```text
CHG-01 ─┬─ CHG-02 ─┬─ CHG-03
        │          ├─ CHG-05 ─── CHG-06
        │          ├─ CHG-08
        │          └─ CHG-07
        └─ CHG-04   (necesario para CHG-05 y CHG-08)

CHG-05 + CHG-08 ─── CHG-09a ─── CHG-09b
CHG-06 + CHG-09b ── CHG-10 ─┬─ CHG-11 ─┐
                            ├─ CHG-12 ─┼─ CHG-14 ─── CHG-15
                            └─ CHG-13 ─┘
Delivery (solo bloquea release): CHG-06 → CHG-07 → CHG-14, CHG-15     Soft: CHG-03 antes de las rebanadas
```

### Dependencias Spec-base
La flecha `⇢` significa: **el predecesor debe estar implementado, verificado y archivado antes de aplicar el siguiente change, por la política de main specs de FIXORA**. No es una dependencia Hard (no implica que el código del siguiente no pueda escribirse) y no impide *materializar* el change en la Fase 6.4.

```text
public-order-tracking   : CHG-05 ⇢ CHG-06 ⇢ CHG-10 ⇢ CHG-11 ⇢ CHG-12
admin-order-management  : CHG-09a ⇢ CHG-09b ⇢ CHG-10 ⇢ CHG-11 ⇢ CHG-12 ⇢ CHG-13
repair-lifecycle        : CHG-10  (un solo change)
```

Por tanto CHG-10 requiere CHG-06 **y** CHG-09b archivados; CHG-11 requiere CHG-10; CHG-12 requiere CHG-11; CHG-13 requiere CHG-12 (y, por transitividad, CHG-11). La serialización 11 → 12 → 13 es **Spec-base** (se amplían capabilities compartidas); además hay una razón blanda de reducción de conflictos sobre ADM-04, que no sustituye a la Spec-base.

### Ruta estructural de dependencias hasta E2E-01 (M3)
Mostramos qué debe existir antes de qué, **no** cuál rama será la crítica en el tiempo:

```text
CHG-01
   ↓
{ CHG-02 ∥ CHG-04 }     (CHG-03 en paralelo, soft)
   ↓
{ rama pública: CHG-05 → CHG-06  ∥  rama administrativa: CHG-08 → CHG-09a → CHG-09b }
   ↓
CHG-10
   ↓
CHG-11
```

- CHG-08 puede avanzar en paralelo con CHG-05/CHG-06 (`admin-access` no depende del tracking público). Dentro de la rama administrativa, CHG-09a también necesita CHG-05.
- **CHG-06 y la rama administrativa son prerrequisitos paralelos que convergen antes de CHG-10.** Sin estimaciones de duración no se determina cuál de las ramas será temporalmente crítica.
- Conjunto del E2E-01: **CHG-01, 02, 03, 04, 05, 06, 08, 09a, 09b, 10 y 11 = 11 de 16**. No requiere CHG-07, 12, 13, 14 ni 15 (el E2E corre sobre la rama `test` en CI).

### Paralelización
Se distingue *paralelizable según dependencias* de *ejecución efectiva por una sola persona* (que siempre es secuencial). No se derivan de esto tiempos ni holguras.

| Paralelizable según dependencias | Por qué |
|---|---|
| CHG-02 ∥ CHG-04 | Solo dependen de CHG-01 |
| CHG-08 ∥ CHG-05/06 | `admin-access` no necesita el tracking público; el limitador es de CHG-02 |
| CHG-07 ∥ la línea administrativa | Dependencia de entrega, no de desarrollo |

| No paralelizable | Por qué |
|---|---|
| CHG-05 → CHG-06 | Hard (órdenes y códigos) y Spec-base (`public-order-tracking`) |
| CHG-09a → CHG-09b | Spec-base (`admin-order-management`) |
| CHG-10 → CHG-11 → CHG-12 → CHG-13 | Spec-base de capabilities compartidas, con razón blanda de conflictos sobre ADM-04 |

---

## 9. Architecture Validation Gates (Fase 7; ninguno ejecutado)

| AV | Qué valida (TD §29) | Primer CHG bloqueado |
|---|---|---|
| **AV-1** Framework / Seguridad | `/admin/**` totalmente dinámico; CSP con nonce bajo Cache Components; `redirect()` desde una Server Action sin que la frontera de errores lo capture; logout + Back/Forward y estado preservado; estado público sensible bajo Cache Components/Activity; Origin/Host bajo `Referrer-Policy: no-referrer` | **CHG-05** (bloqueo efectivo: Server Action, Activity y Origin/Host). **CHG-04** solo parcialmente: puede iniciar su UI, pero sus cabeceras y *shell* se verifican con el resultado. El bloqueo **crítico** es el de CHG-08 (CSP estricta) |
| **AV-2** Persistencia | Prisma 7 estable + adaptador `pg`; Neon *pooled*; transacciones interactivas; SQL parametrizado para `SELECT … FOR UPDATE`; `NUMERIC`; `timestamptz(3)`; escape de `LIKE`; restricciones SQL que Prisma no exprese; ESM, `prisma.config.ts` y *shadow database*; evaluación de `GRANT UPDATE` por columnas (TD §11) | **CHG-02**. Aguas abajo: CHG-09a (escape de `LIKE`), CHG-11 (`NUMERIC`), CHG-12 (bloqueo de fila) |
| **AV-3** Integración de despliegue | `x-vercel-forwarded-for` como fuente de IP; variables efectivamente inyectadas por Neon/Vercel (TD §29, §28) | **CHG-07** (necesita un despliegue real: se ejecuta con él). Aguas abajo: CHG-14 y CHG-15 |

Notas: no se añade ningún AV nuevo. CHG-01 incorpora la conversión a ESM antes de que AV-2 confirme la configuración con Prisma 7; se recomienda ejecutar primero la **comprobación acotada de ESM/Prisma de AV-2** para evitar retrabajo (recomendación de secuencia, no dependencia formal; ver §14). Los changes no listados no requieren AV.

---

## 10. Pantallas

| Pantalla | Change que la introduce | Changes que la amplían |
|---|---|---|
| PUB-01 Landing | CHG-04 | — |
| PUB-02 Registrar | CHG-05 | — |
| PUB-03 Confirmación | CHG-05 | — |
| PUB-04 Consultar | CHG-06 | — |
| PUB-05 Seguimiento | CHG-06 | CHG-10 (estado y *Cancelado*), CHG-11 (diagnóstico y costo), CHG-12 (notas públicas) |
| ADM-01 Acceso | CHG-08 | — |
| ADM-02 Dashboard | CHG-09a | CHG-10 (conteos reflejan estados) |
| ADM-03 Listado | CHG-09a | — |
| ADM-04 Detalle | CHG-09b | CHG-10 (transiciones), CHG-11 (diagnóstico y costo), CHG-12 (notas), CHG-13 (datos) |

Cobertura: **9/9**. No existe un backlog por pantalla.

---

## 11. Trazabilidad de criterios (propietario primario de la evidencia)

El **owner primario** es el change cuya evidencia final cierra el criterio; los demás changes aportan soporte. Servirá de base de `TRACEABILITY.md` (CHG-03 lo crea; CHG-15 lo completa).

### 11.1 Criterios de éxito

| Criterio | Change primario | Evidencia final |
|---|---|---|
| SC-01 | CHG-05 | E2E de registro e integración del caso de uso |
| SC-02 | CHG-06 | E2E de consulta |
| SC-03 | CHG-09b | E2E: inicio de sesión → localizar → abrir detalle (soporte: CHG-08, 09a) |
| SC-04 | CHG-11 | E2E del ciclo completo (soporte: CHG-10) |
| SC-05 | CHG-10 | Pruebas de cancelación y estados finales |
| SC-06 | CHG-10 | Matriz de 64 pares y rechazo desde servidor |
| SC-07 | CHG-11 | Integración y E2E-01 (CHG-10 rechaza por defecto) |
| SC-08 | CHG-11 | Las cuatro pruebas de valores no publicados |
| SC-09 | CHG-10 | Pruebas de terminalidad por tipo de dato (soporte: CHG-11, 12, 13) |
| SC-10 | CHG-11 | Historial público y administrativo (soporte: CHG-09b, 10) |
| SC-11 | CHG-06 | Prueba negativa con orden poblada y Security Pass (soporte: todo change que toque lo público; verificación: CHG-14) |
| SC-12 | CHG-08 | Prueba parametrizada de acciones sin sesión y Security Pass (soporte: todo change administrativo; verificación: CHG-14) |
| SC-13 | CHG-06 | Prueba de código inexistente |
| SC-14 | CHG-02 | Integración de persistencia (soporte: cada slice; cierre: CHG-15) |
| SC-15 | CHG-15 | Revisión manual estructurada (soporte: CHG-04 y cada pantalla) |
| SC-16 | CHG-05 | Validación por campo |
| SC-17 | CHG-11 | E2E-01 |
| SC-18 | CHG-14 | Informe del Security Pass |
| SC-19 | CHG-03 | Inspección del pipeline |
| SC-20 | CHG-07 | Smoke de Production (cierre: CHG-15) |

Cobertura: **20/20**.

### 11.2 Casos borde

| Criterio | Change primario | Evidencia final |
|---|---|---|
| E1 | CHG-05 | Integración de idempotencia y E2E de doble envío |
| E2 | CHG-05 | E2E de confirmación |
| E3 | CHG-05 | Validadores (soporte: CHG-13 para el administrador) |
| E4 | CHG-06 | Prueba de código inexistente |
| E5 | CHG-11 | Pruebas de publicación en `CANCELADO` (soporte: CHG-10) |
| E6 | CHG-06 | E2E de ausencia de datos (completan CHG-11 y CHG-12) |
| E7 | CHG-09a | Integración de búsqueda y vacío |
| E8 | CHG-09a | Orden y paginación |
| E9 | CHG-10 | Pruebas de versión (soporte: CHG-11, 12, 13) |
| E10 | CHG-08 | Sesión inválida sin estado parcial (soporte: cada mutación) |
| E11 | CHG-10 | E2E de los cuatro diálogos y comprobación en servidor |
| E12 | CHG-12 | Integración y E2E de notas |
| E13 | CHG-10 | Cancelación de una solicitud falsa; ausencia de anti-spam verificada en CHG-05 |
| E14 | CHG-10 | Advertencia del diálogo de cancelación (soporte: CHG-12) |
| E15 | CHG-06 | Normalización exacta (soporte: CHG-09a) |
| E16 | CHG-05 | Pruebas del alfabeto y del formato |
| E17 | CHG-05 | Inmutabilidad del código (soporte: CHG-13: no editable) |

Cobertura: **17/17**.

---

## 12. Seguridad y calidad incrementales (resumen)

| Change | SC-11 | SC-12 | Autenticación | Privacidad | Abuso | Logging | Pruebas esperadas |
|---|---|---|---|---|---|---|---|
| CHG-01 | N/A | N/A | — | — | — | Logger cerrado, canario | U |
| CHG-02 | — | — | — | Mínimo privilegio | Limitador (primitivo) | — | I |
| CHG-03 | — | — | — | — | — | — | Pipeline |
| CHG-04 | N/A | N/A | — | Sin terceros | — | — | E2E, manual |
| CHG-05 | **Aplica** | N/A | — | Confirmación mínima | Sin anti-spam (`E13`) | Sin PII | U, I, E2E |
| CHG-06 | **Núcleo** | N/A | — | Código bearer | Límite de intentos | Sin código | U, I, E2E |
| CHG-07 | — | — | — | Secretos de producción | — | — | Smoke |
| CHG-08 | N/A | **Núcleo** | Propia | Cookie, hash | Límite y `scrypt` acotado | Sin credenciales | U, I, E2E, Seguridad |
| CHG-09a | **Aplica** | **Aplica** | Sesión | DTO administrativo | — | Sin criterios de búsqueda | I, E2E |
| CHG-09b | **Aplica** | **Aplica** | Sesión | DTO administrativo | — | — | I, E2E |
| CHG-10 | **Aplica** | **Aplica** | Sesión | Timeline público | — | Sin datos del cliente | U, I, E2E |
| CHG-11 | **Fuerte** | **Aplica** | Sesión | Valores no publicados | — | Sin diagnóstico | U, I, E2E |
| CHG-12 | **Aplica** | **Aplica** | Sesión | Notas internas | — | Sin contenido de notas | I, E2E |
| CHG-13 | **Aplica** | **Aplica** | Sesión | Dato administrativo | — | Sin datos del cliente | U, I, E2E |
| CHG-14 | Verifica | Verifica | Verifica | Verifica | Verifica | Logs reales | Seguridad |
| CHG-15 | — | — | — | — | — | — | Smoke, manual |

U = unitaria, I = integración, E2E = Playwright. Ningún control nace en CHG-14.

---

## 13. Riesgos del backlog

| # | Riesgo | Changes | Nivel | Razón y mitigación |
|---|---|---|---|---|
| R-1 | La CSP estricta con nonce no funciona con Cache Components | CHG-08 (AV-1) | Alto | Si falla, se detiene y se registra una decisión antes de debilitarla (TD §29). Se mitiga con AV-1 aprobado antes de CHG-05 y CHG-08 |
| R-2 | Fuga de datos internos o de valores no publicados a lo público (`SC-11`) | CHG-06, CHG-11 | Alto | Lista positiva, proyección condicionada y pruebas negativas desde el primer change que toca lo público |
| R-3 | Prisma 7, Neon, roles, migraciones y limitador en el primer change con base de datos | CHG-02 (AV-2) | Alto | AV-2 previo; migración desde cero verificada; revisión de privilegios |
| R-4 | Integridad de estados, concurrencia y `E11` | CHG-10 | Alto | Única tabla de transiciones, versión optimista, pruebas de 64 pares y de carreras |
| R-5 | Secretos y flujo de migración privilegiado de producción | CHG-07 | Alto | Workflow desde `main`, Environment restringido, `DIRECT_URL` fuera de Vercel; si GitHub no ofrece la restricción, procedimiento manual |
| R-6 | Hallazgos tardíos del Security Pass | CHG-14 | Medio | Controles incrementales en cada change; CHG-14 solo verifica |
| R-7 | Disponibilidad de Neon/Vercel/GitHub según plan | CHG-03, CHG-07 | Medio | Validaciones externas de TD §28; sin basar el diseño en capacidades de pago |

El resto de los changes tienen riesgo bajo o medio (§5).

---

## 14. Orden recomendado de ejecución

Una sola persona, secuencial; respeta el DAG y las dependencias Spec-base. Entre paréntesis, el milestone que se alcanza.

1. CHG-01 `application-skeleton`
2. CHG-02 `persistence-foundation`
3. CHG-03 `ci-quality-gates`
4. CHG-04 `ui-foundation-and-public-entry` — **M0**
5. CHG-05 `repair-request-registration`
6. CHG-06 `public-order-tracking` — **M1**
7. CHG-07 `production-environment-baseline` *(recomendado aquí por reducir el riesgo de despliegue y ejecutar AV-3; no bloquea los siguientes)*
8. CHG-08 `admin-access`
9. CHG-09a `admin-order-directory`
10. CHG-09b `admin-order-detail` — **M2**
11. CHG-10 `repair-status-lifecycle`
12. CHG-11 `diagnosis-and-estimate` — **M3 (E2E-01)**
13. CHG-12 `order-notes`
14. CHG-13 `order-data-correction` — **M4**
15. CHG-14 `security-hardening-pass`
16. CHG-15 `release-readiness` — **M5**

*Alternativa (Fase 7):* adelantar CHG-08 antes de CHG-05/06 si AV-1 revela riesgo en la CSP estricta (R-1); la estrategia lo permite porque `admin-access` no depende del tracking.

### Secuencia del Architecture Validation Gate en la Fase 7 (orientativa)
Este documento no cierra los detalles operativos de la Fase 7; fija solo el orden de bloqueo:

| Momento | Gate |
|---|---|
| Al inicio de la Fase 7 | Comienza el Architecture Validation Gate; comprobación temprana y acotada de ESM/Prisma de AV-2 (recomendación, antes de aplicar CHG-01) |
| Antes de CHG-02 | AV-2 suficientemente completado y aprobado |
| Antes de CHG-05 y CHG-08 | AV-1 aprobado (CHG-04 puede iniciar su UI antes; sus cabeceras y *shell* se verifican con el resultado) |
| Con CHG-07 | AV-3 |

*(Ningún AV se ejecuta en la Fase 6.)*

---

## 15. Condiciones para entrar a la Fase 6.4

Se cumplen: backlog aprobado; estrategia de materialización resuelta (B-1); ninguna contradicción objetiva abierta con la estrategia.

### 15.1 Estrategia de materialización (B-1, resuelta)
Durante la Fase 6.4 se materializarán los **16 changes planificados**, pero **no todos de una vez**: se crean y revisan por **olas controladas**. La Fase 6.5 empieza únicamente cuando los 16 estén materializados y revisados. Las olas son de **materialización y revisión de Specs, no de implementación**; no significan que sus changes puedan aplicarse a la vez (las dependencias de este backlog gobiernan la Fase 7).

| Ola | Changes |
|---|---|
| **1 — Foundation** | CHG-01 `application-skeleton`, CHG-02 `persistence-foundation`, CHG-03 `ci-quality-gates`, CHG-04 `ui-foundation-and-public-entry` |
| **2 — Primer flujo público y línea base de entrega** | CHG-05 `repair-request-registration`, CHG-06 `public-order-tracking`, CHG-07 `production-environment-baseline` |
| **3 — Administración y ciclo de vida principal** | CHG-08 `admin-access`, CHG-09a `admin-order-directory`, CHG-09b `admin-order-detail`, CHG-10 `repair-status-lifecycle`, CHG-11 `diagnosis-and-estimate` |
| **4 — Completar V1 y hardening/release** | CHG-12 `order-notes`, CHG-13 `order-data-correction`, CHG-14 `security-hardening-pass`, CHG-15 `release-readiness` |

**Política de revisión por ola:** (1) materializar la ola; (2) revisar sus `proposal`/`specs`/`design`/`tasks`; (3) corregir inconsistencias; (4) gate documental de la ola; (5) commit de checkpoint; (6) solo entonces pasar a la siguiente. No se ejecuta `/opsx:apply`, `/opsx:archive` ni un `/opsx:sync` anticipado. Al terminar la Ola 4 existen los 16 changes revisados, ninguno implementado y ninguno archivado.

### 15.2 Validación especial de capabilities compartidas
Los changes posteriores redactan `ADDED Requirements` sobre capabilities que otros changes introducen. La **primera vez** que aparezca un caso real (probablemente CHG-06, que extiende `public-order-tracking` creada por CHG-05) en que: la capability no existe todavía en `openspec/specs/`, existe solo como delta de otro change activo y otro change activo quiere añadirle requisitos, hay que **validar que OpenSpec 1.15.0 acepta esa situación**. No se usa `/opsx:sync` para hacerla pasar. Si OpenSpec la rechaza: **se detiene y se reporta**, sin alterar la política de main specs ni inventar una solución.

### 15.3 Primer change a materializar
**`application-skeleton` (CHG-01)**, primero de la Ola 1. Validación contra los criterios:
- **DAG:** sin dependencias Hard, Spec-base ni Delivery.
- **AV:** no requiere ninguno.
- **DoR:** alcance delimitado y fuentes claras (TD §3, §5, §6, §18, §21.2, §23); se puede redactar sin inventar requisitos.
- **Aprendizaje:** al ser `SKIP_SPECS`, ejercita el marcador `skip_specs` y la validación del change antes de enfrentar deltas; el primer change con deltas y archive hacia main specs será CHG-04.
- **Condición para *aplicarlo*, no para materializarlo:** alinear el Node local con 24.x y aprobar las dependencias (Fase 7).

No se crea todavía.

**Siguiente fase: Fase 6.4 — Materialización y revisión de changes OpenSpec por olas.**

---

## 16. Preguntas abiertas

Ninguna bloquea la Fase 6.4.

| # | Pregunta | Estado | Resolución o destino |
|---|---|---|---|
| B-1 | Estrategia de materialización de los changes | **RESUELTA EN 6.3** | Olas controladas con revisión y checkpoint por ola (§15.1); la Fase 6.5 empieza con los 16 materializados y revisados |
| B-2 | ¿Se ejecuta la comprobación acotada de ESM/Prisma de AV-2 antes de aplicar CHG-01? | **DEFERRED — Fase 7** | Secuencia del Architecture Validation Gate; recomendado sí (§14) |
| B-3 | ¿Se adelanta CHG-08 por el riesgo de la CSP estricta (R-1)? | **DEFERRED — Fase 7** | La estrategia base mantiene el camino del cliente primero; puede modificarse si AV-1 descubre un riesgo que lo justifique |
| B-4 | Alineación del Node local (26.x) con el objetivo 24.x | **DEFERRED — Fase 7 / DoR de CHG-01** | El objetivo del proyecto es Node 24.x; mientras solo se trabaje en documentación y OpenSpec puede seguir en Node 26 si OpenSpec funciona |

---

## 17. Qué NO hace este documento

No escribe `tasks.md`, no estima horas ni puntos, no crea changes ni Specs, no ejecuta el Architecture Validation Gate, no configura Neon, Vercel ni CI y no autoriza ninguna implementación.
