# FIXORA — Estrategia de partición OpenSpec (capabilities, changes y dependencias)

> Fase 6.2 · Planificación del proyecto · Estado: **APROBADO — Fase 6.2 cerrada**.
>
> Fecha: 2026-10-27. **Siguiente paso: Fase 6.3 — Backlog maestro priorizado** (el backlog aún no existe).
>
> **Este documento es planificación del proyecto, no una Spec OpenSpec ni una fuente canónica de requisitos.** Las Specs vigentes vivirán en `openspec/specs/` (ubicación canónica) y las propuestas en `openspec/changes/`. Aquí solo se decide **cómo dividir** FIXORA antes de crear ningún artefacto OpenSpec. No hay Specs, changes ni backlog creados.
>
> Consume: `docs/01-producto/PRD.md` (qué), `docs/02-diseno/DESIGN.md` (experiencia), `docs/03-arquitectura/TECHNICAL-DESIGN.md` y ADR-001…010 (cómo), `openspec/config.yaml`. Consumido por: Fase 6.3 (backlog maestro) y 6.4 (creación y revisión de Specs).
>
> `SC-*`, `E*`, `RIE-*`, `VAL-*` son los del PRD; `PUB-*`/`ADM-*` son las nueve pantallas de DESIGN.md; `CHG-*` son identificadores **conceptuales de este documento**, no nombres OpenSpec.

---

## 1. Propósito

Responder, antes de escribir una sola Spec: qué **capabilities** (comportamientos durables) tiene FIXORA V1, en qué **changes** (unidades implementables y revisables) se entregan, qué debe existir antes de qué, cuándo se alcanza el E2E obligatorio y si se pierde algún requisito (`SC-*`, `E*`, pantalla). No es un backlog: no hay tareas, estimaciones horarias, puntos ni sprints (Fase 6.3 y 6.4).

---

## 2. Semántica OpenSpec 1.15.0 que se preserva

Verificada en las instrucciones instaladas (`.claude/skills/openspec-*`) y en el código del CLI.

| Concepto | Significado | Consecuencia para FIXORA |
|---|---|---|
| **Main specs** (`openspec/specs/<capability>/spec.md`) | Comportamiento **vigente**. | Permanece vacío hasta el primer archive. No se rellena con estado futuro. |
| **Change** (`openspec/changes/<change>/`) | Unidad propuesta: `proposal.md`, deltas, `design.md`, `tasks.md`. | Unidad de revisión, aprobación e implementación. |
| **Capability** | Un directorio `openspec/specs/<capability>/` con su `spec.md`. Es **nueva** (aún no existe) o **existente**. Una capability nueva lleva su `Purpose`. | Las operaciones `ADDED`/`MODIFIED` **no son operaciones sobre la capability**: pertenecen a sus *requirements*. |
| **`ADDED Requirements`** | Operación de *requirement* dentro de un delta spec: añade comportamiento completamente nuevo. Los primeros requisitos de una capability nueva van bajo `ADDED`; también puede añadirse a una capability existente. | Operación normal al crear una capability y al **extenderla** con comportamiento nuevo. |
| **`MODIFIED Requirements`** | Operación de *requirement*: cambia uno que **ya existe** en la main spec y debe contener su **versión completa actualizada**. Exige que la capability exista como main spec. | Se reserva para cambiar un requisito vigente; no es «cualquier cambio». |
| **`REMOVED` / `RENAMED`** | Operaciones de *requirement*: retira o renombra uno existente. | No se prevén en V1. |
| **Archive** | Tras implementar y verificar, fusiona los deltas en las main specs y archiva el change. | Ver política en §3. |
| **`/opsx:sync`** | Fusiona los deltas en las main specs **sin archivar**. | Disponible, pero no se usa de forma rutinaria (§3). |
| **`skip_specs`** | Marcador `skip_specs: true` en el `.openspec.yaml` del change. Declara que el change **no tiene deltas** y marca el artefacto `specs` como omitido. | Ver §4: es la declaración semántica de un change técnico. |
| **Planning boundary** | `propose` solo planifica y se detiene; `apply` es un paso aparte. | Refuerza la regla de FIXORA: una propuesta aprobada **no** autoriza `/opsx:apply`. |

---

## 3. Política FIXORA sobre main specs, sync y archive

> `openspec/specs/` debe representar **comportamiento implementado y verificado**, no comportamiento futuro todavía en desarrollo.

Es una **política del proyecto, no una limitación técnica de OpenSpec**: OpenSpec permitiría incorporar deltas con `/opsx:sync` antes de archivar. Por tanto, durante V1:

1. Ciclo normal: **propose → aprobación → apply (con autorización explícita) → verificación mediante pruebas y evidencia → archive**.
2. **No se usa `/opsx:sync` anticipadamente** solo para desbloquear otro change. Queda disponible para un caso excepcional **explícitamente aprobado**.
3. Cuando un change necesite añadir o modificar requisitos de una capability creada por otro, su dependencia es: **predecesor implementado + verificado + archivado** (dependencia «Spec-base», §12).
4. Para minimizar esas esperas, las Specs se redactan de modo que los changes posteriores **añadan** requisitos (`ADDED`) en vez de reescribir los previos (`MODIFIED`), siempre que el comportamiento lo permita.

---

## 4. `skip_specs` (Q-5 resuelta)

OpenSpec 1.15.0 soporta `skip_specs: true` en el `.openspec.yaml` del change, que exige además el campo `schema:` de ese mismo archivo. Reglas verificadas en el validador:

- Un change es válido si tiene **al menos un delta spec** o declara `skip_specs: true`.
- Con el marcador, **cualquier archivo bajo `specs/` es un conflicto** (error de validación): el change no debe tener deltas.
- **No confundir con** `openspec archive --skip-specs`: ese *flag* solo controla que el archive no actualice las main specs; **no sustituye** la declaración semántica del change.

Regla FIXORA: `skip_specs` solo para trabajo **sin comportamiento observable nuevo**; nunca por comodidad. Si durante un change `skip_specs` aparece un requisito observable, se retira el marcador y se redactan los deltas.

---

## 5. Principios de partición

1. **Capabilities = comportamiento durable**, nombradas por lo que FIXORA hace, no por pantalla, tecnología, fase ni ticket.
2. **Changes = valor demostrable.** Rebanadas verticales (UI + dominio + persistencia + pruebas) sobre una fundación mínima. No se divide por capas técnicas.
3. **Las Specs dicen QUÉ, no CÓMO.** El mecanismo va en *design*/Technical Design.
4. **Regla de elementos técnicos.** Prisma, PostgreSQL, CI, CSP, logging, concurrencia, idempotencia, Vercel y Neon **no justifican una capability por sí mismos**. Si producen comportamiento observable, ese comportamiento pertenece a la capability funcional relevante (p. ej. «un envío repetido no crea dos órdenes» → `repair-request-registration`; «acción sobre vista desactualizada se rechaza» → la capability que muta). Si son implementación o calidad pura, van en *design*/*tasks* o en un change `skip_specs`.
5. **Seguridad y calidad incrementales** (§11). Los changes globales finales verifican y endurecen; no es donde nacen los controles ni las pruebas.
6. **Una pantalla implementa capabilities; no es una capability.**
7. **No se reabre nada.** Cualquier tensión con el PRD, DESIGN, el Technical Design o los ADRs se lista como pregunta (§18).

---

## 6. Inventario de comportamientos de V1

Extraído de PRD §4–§7, DESIGN §3–§13 y el Technical Design.

| # | Grupo | Comportamientos (fuente) |
|---|---|---|
| I-1 | Registro público | Un equipo por solicitud; datos obligatorios/opcionales; avisos; validación por campo (`E3`, `SC-16`); estado inicial; código emitido; confirmación y «conserva tu código» (`E2`); reenvío accidental no duplica (`E1`); sin anti-spam (`E13`) |
| I-2 | Código de seguimiento | Legible/comunicable (`E16`); único e inmutable (`E17`); normalización tolerante (`E15`); inexistente = mismo resultado (`E4`, `SC-13`) |
| I-3 | Consulta pública | PUB-04; resultado efímero; vista pública (equipo, descripción, estado, Journey, timeline, notas públicas, diagnóstico/costo cuando corresponde); vigencia; ausencia de datos sin errores (`E6`); límite de intentos |
| I-4 | Journey y timeline | 7 etapas + rama Cancelado; más reciente primero; hora de Perú (`SC-10`) |
| I-5 | Privacidad público/interno | Nada administrativo en lo público (`SC-11`); diagnóstico/costo no publicados no se exponen (`SC-08`) |
| I-6 | Acceso administrativo | Login, credenciales inválidas uniformes, sesión y expiración, logout, sesión inválida sin estado parcial (`E10`), todo exige sesión (`SC-12`) |
| I-7 | Dashboard | Conteos por estado y recientes (ADM-02) |
| I-8 | Listado y búsqueda | Código exacto o nombre parcial sin tildes; filtro; orden; paginación; vacío (`SC-03`, `E7`, `E8`) |
| I-9 | Detalle de orden | Datos, bloques público/interno, historial administrativo (ADM-04) |
| I-10 | Corrección de datos | Mismas validaciones del registro (`E3`); código no editable (`E17`); no en estados finales |
| I-11 | Diagnóstico y costo | Contenido, costo > 0 con 2 decimales, edición solo hasta *En diagnóstico*, obligatoriedad (`SC-07`), historial, congelamiento y publicación (`SC-08`, `E5`) |
| I-12 | Máquina de estados | 8 estados, 10 transiciones, sin saltos/retrocesos/reapertura; cancelación solo antes de *En reparación*; solo el administrador cambia estado (`SC-04`–`SC-06`) |
| I-13 | Confirmaciones | Cuatro `E11` |
| I-14 | Estados finales | *Entregado*/*Cancelado* cerrados (`SC-09`) |
| I-15 | Notas | Públicas/internas; agregar, editar, eliminar mientras no sea final; sin historial; opcionales (`E12`, `E14`) |
| I-16 | Historiales | Público: transiciones con fecha. Administrativo: + diagnóstico y costo; sin autor ni notas (`SC-10`) |
| I-17 | Concurrencia/idempotencia (efecto observable) | Acción sobre vista desactualizada se rechaza (`E9`); envío repetido de registro (`E1`) |
| I-18 | Resultados visibles | Validación, no encontrado, credenciales, sesión expirada, vista desactualizada, límites, servicio no disponible, carga, 404, error inesperado (DESIGN §13, Apéndice A) |
| I-19 | Entrada pública común | Landing con accesos; acceso discreto al taller; aviso de entorno demostrativo; página 404 y de error inesperado públicas (PRD §4.10, `RIE-20`; DESIGN Apéndice A) |
| I-20 | Calidad y entrega | `SC-14`, `SC-15`, `SC-17`–`SC-20` |

---

## 7. Mapa final de capabilities (8)

| Nombre | Propósito (comportamiento que posee) | Incluye | Excluye | PRD | DESIGN | TD / ADR | Riesgo grande | Riesgo fragmentación |
|---|---|---|---|---|---|---|---|---|
| `public-site-entry` | La persona que llega al sitio entiende qué es FIXORA, accede a registrar o consultar y sabe que es una demostración | Landing; navegación pública y acceso discreto al taller; aviso de entorno demostrativo; páginas públicas de no encontrado y de error inesperado | Formularios y consulta | §4.1, §4.10, `RIE-20` | PUB-01, §4.1–§4.3, §13.8, Apéndice A.3–A.4 | TD §6 | Bajo | Medio |
| `repair-request-registration` | Un cliente sin cuenta registra una solicitud válida y recibe confirmación y su código | Captura de la solicitud y validación por campo (`E3`, `SC-16`), avisos de datos, creación de la orden en el estado inicial, envío único idempotente (`E1`), confirmación y «conserva tu código» (`E2`), **entrega al usuario del código resultante**, sin anti-spam (`E13`) | Definición de la identidad del código y su búsqueda (→ tracking) | `SC-01`, `SC-16`, `E1`–`E3`, `E13` | PUB-02, PUB-03 | TD §13; ADR-006 | Bajo | Bajo |
| `public-order-tracking` | La **identidad pública de seguimiento** y su uso: quien posee un código válido ve la información **pública** de una orden y nada más | **Identidad del código**: formato, alfabeto, longitud, legibilidad/comunicabilidad (`E16`), unicidad, inmutabilidad (`E17`), semántica de credencial de lectura; **normalización** y búsqueda (`E15`); no encontrado uniforme (`E4`, `SC-13`); límite de intentos; vista pública, Journey, timeline público; presentación de notas públicas y de diagnóstico/costo ya publicados (`E5`, `E6`); vigencia | Decidir cuándo se publican diagnóstico/costo (→ `diagnosis-and-estimate`); capturar solicitudes y entregar el código al usuario (→ registro) | `SC-02`, `SC-11`, `SC-13`, `E4`–`E6`, `E15`–`E17` | PUB-04, PUB-05, §7, §8.1, §9 | TD §12, §17; ADR-005, ADR-007 | Medio | Bajo |
| `admin-access` | El administrador accede a la zona protegida y toda capacidad administrativa exige sesión válida | Login, credenciales inválidas uniformes, sesión (inactividad y duración), logout, sesión inválida sin estado parcial (`E10`), límite de intentos del acceso | Gestión de cuentas/recuperación (fuera de V1) | `SC-12`, `E10` | ADM-01, §4.6, §13.3–§13.4 | TD §15, §16; ADR-004, ADR-007 | Bajo | Bajo |
| `admin-order-management` | El administrador encuentra, consulta y corrige órdenes | Dashboard, listado, búsqueda y filtro, paginación, detalle con separación público/interno, presentación del historial administrativo, corrección de datos básicos | Cambio de estado, diagnóstico/costo y notas (→ capabilities propias) | `SC-03`, `SC-10`, `E3`, `E7`, `E8`, `E15`, `E17` | ADM-02, ADM-03, ADM-04, §6.7, §6.16, §6.17 | TD §17, §19; ADR-003 | Medio-alto | Medio |
| `repair-lifecycle` | Una orden recorre su ciclo de vida solo por transiciones válidas | Estados, transiciones, rechazo de las no permitidas (`SC-06`), cancelación solo antes de *En reparación*, confirmaciones `E11` **y su ligadura a la versión revisada de la orden**, terminalidad (`SC-09`), capacidades derivadas del estado, eventos del historial de estados, vista desactualizada (`E9`), cancelación de solicitudes falsas (`E13`, `E14`) | Contenido, obligatoriedad, congelamiento y publicación de diagnóstico/costo | `SC-04`–`SC-06`, `SC-09`, `SC-10`, `E9`, `E11`, `E13`, `E14` | §7, §11, §12 | TD §7.2, §14; ADR-006 | Medio | Bajo |
| `diagnosis-and-estimate` | El taller registra un diagnóstico y un costo estimado que se congelan y publican al pedir aprobación | Contenido del diagnóstico, costo > 0 con 2 decimales, edición solo hasta *En diagnóstico*, limpiar, **obligatoriedad** para *Esperando aprobación* (`SC-07`), historial de cambios, **congelamiento** y **publicación** (`SC-08`, `E5`) | Estados y transiciones (→ lifecycle); cómo lo ve el cliente (→ tracking) | `SC-07`, `SC-08`, `E5`, §4.5, §7.1 | ADM-04 (bloque), §11 | TD §8; ADR-005, ADR-006 | Bajo | Medio |
| `order-notes` | El taller deja notas públicas o internas mientras la orden no esté cerrada | Dos visibilidades, agregar/editar/eliminar, sin historial, opcionales, solo lectura al cerrar, nota desactualizada (`E12`, `E14`) | Mostrar notas públicas al cliente (→ tracking) | `E12`, `E14`, §4.7 | §10 | TD §9; ADR-006 | Bajo | Medio |

**`public-site-entry` deja de ser provisional.** Posee requisitos propios, observables e independientes: (1) la landing ofrece acceso a registrar y a consultar; (2) la navegación pública es coherente en escritorio y móvil e incluye el acceso discreto al taller; (3) el aviso de entorno demostrativo es visible de forma no intrusiva; (4) una ruta pública inexistente muestra una página de «no encontrado» con salida; (5) un fallo inesperado muestra el patrón de error sin detalles técnicos. Los puntos (4) y (5) se confirman al redactar la Spec; si alguno no resulta un requisito observable propio, pasa a *tasks* de CHG-04 y la capability conserva (1)–(3).

**No son capabilities:** *concurrency*, *idempotency*, *persistence*, *security*, *responsive/accessibility*, *error-handling*, *auth-infrastructure*, *CI/CD*, *deployment*, *testing* (regla de §5.4).

---

## 8. Boundaries difíciles

### 8.1 Registro público vs tracking público
- **Dos capabilities:** cambian por razones distintas; el registro **crea** (sin anti-spam por `E13`) y el tracking **lee** (con límite de intentos y `SC-11`).
- **Propiedad del código** (coherente con el dominio; no se mueve para lograr «un change = una capability», y OpenSpec permite que un change afecte varias):
  - `repair-request-registration` posee la **captura** de la solicitud, su validación, la idempotencia, la creación de la orden, la confirmación y la **entrega al usuario del código resultante**.
  - `public-order-tracking` posee la **identidad pública de seguimiento**: formato, alfabeto, longitud, legibilidad y comunicabilidad (`E16`), normalización (`E15`), unicidad, inmutabilidad (`E17`), semántica de credencial de lectura y su uso posterior para consultar.
- **Consecuencia:** CHG-05 introduce **dos capabilities**: `repair-request-registration` completa y `public-order-tracking` solo con los requisitos necesarios para que el código exista como credencial pública correcta (generación, formato, entrega, propiedades de `E16`/`E17`); **no** implementa todavía la consulta. CHG-06 **extiende** la capability ya existente con requisitos nuevos (`ADDED Requirements`): introducción del código, búsqueda, resultado uniforme para mal formado o inexistente, vista pública, Journey y timeline, frontera `SC-11` y demás comportamiento propio de la consulta. CHG-06 no usa `MODIFIED` salvo que cambie el texto de un requisito ya existente.

### 8.2 Máquina de estados
`repair-lifecycle` posee estados, transiciones, `E11`, terminalidad y capacidades derivadas del estado. No es parte de *order management* (cambia por la escala del taller, no por las reglas de negocio) ni se llama «state machine» (técnica, no comportamiento). La semántica de las confirmaciones `E11` incluye su **ligadura a la versión vigente de la orden revisada**: si antes de ejecutar la transición ocurre cualquier mutación efectiva que incremente la versión (incluida una corrección de datos de CHG-13), el servidor rechaza la transición como vista desactualizada y no aplica cambios. CHG-10 redacta ese requisito general desde el inicio, de modo que CHG-13 no necesita modificarlo.

### 8.3 Diagnóstico/costo — separada de `repair-lifecycle`
Se mantienen separadas por **propiedad de requisitos**, no por promesas futuras: `repair-lifecycle` posee *estados, transiciones, E11, terminalidad y capacidades derivadas del estado*; `diagnosis-and-estimate` posee *contenido del diagnóstico, costo estimado, edición, obligatoriedad, congelamiento y publicación*. Existe acoplamiento (el congelamiento ocurre al entrar en *Esperando aprobación*), pero **cambian por razones distintas**. Se expresa una sola vez: el lifecycle admite una transición solo si se cumplen las precondiciones que declaran las capabilities propietarias; la precondición de *Esperando aprobación* (diagnóstico y costo presentes, `SC-07`) la define `diagnosis-and-estimate`. No se promete soporte de presupuestos múltiples ni re-diagnóstico.

### 8.4 Notas
Capability propia (`order-notes`): reglas distintas del resto (sin historial, eliminación física, versión por nota, visibilidad inmutable). Su relación con el cierre de la orden es una referencia a la terminalidad del lifecycle.

### 8.5 Autenticación y sesión
Una sola capability: login, sesión, logout y expiración cambian y se prueban juntos. La **autorización por operación** no es otra capability: es un requisito que cada capability administrativa declara («requiere sesión válida», `SC-12`).

### 8.6 Dashboard / listado / búsqueda
Son vistas de `admin-order-management`, no capability propia (resuelve Q-3). Se entregan en dos changes, CHG-09a (encontrar) y CHG-09b (inspeccionar), pero siguen siendo una sola capability.

### 8.7 Historial
Consecuencia de las capabilities que lo originan: `repair-lifecycle` registra los eventos de estado, `diagnosis-and-estimate` los de diagnóstico/costo; la presentación pública vive en `public-order-tracking` y la administrativa en `admin-order-management`. `SC-10` se traza a las cuatro y se comprueba en la Fase 6.5.

### 8.8 Concurrencia e idempotencia
Ni capabilities ni solo *design*: el **efecto observable** (`E9`, `E1`, `E10`) es requisito de la capability afectada; el **mecanismo** (versión, bloqueos, claves hash, transacciones) es Technical Design.

---

## 9. Mapa de changes (16)

`Tratamiento OpenSpec`: **DELTA SPECS** (el change produce deltas) o **SKIP_SPECS** (`skip_specs: true`). Ninguno queda «por resolver». `AV` = Architecture Validation Gate requerido **antes de aplicar** (el gate es de la Fase 7 y no se ejecuta aquí).

| ID | Slug propuesto | Objetivo | Tipo | Tratamiento OpenSpec | Dependencias duras | Aislado | AV previo | Compl. | Riesgo |
|---|---|---|---|---|---|---|---|---|---|
| CHG-01 | `application-skeleton` | TypeScript estricto, ESM, Node 24, capas con reglas de importación, logger cerrado, `ActionResult` y frontera de errores, validadores base, ejecutor mínimo de Vitest | foundation | **SKIP_SPECS** | — | Sí | Ninguno | L | Medio |
| CHG-02 | `persistence-foundation` | Prisma 7 + Neon, roles de aplicación y migrador, infraestructura de pruebas contra PostgreSQL real con guardia y marcador, y el **componente técnico del limitador de intentos** (almacén, clave HMAC, servicio) que consumirán CHG-06 y CHG-08 | foundation | **SKIP_SPECS** | CHG-01 | Sí | AV-2 | M | Alto |
| CHG-03 | `ci-quality-gates` | Calidad de pruebas y CI: cobertura, base de Playwright, script de trazabilidad, jobs `static` y `db-tests`, protección de `main` | foundation / delivery | **SKIP_SPECS** | CHG-02 | Sí | AV-2 (por `db-tests`) | M | Medio |
| CHG-04 | `ui-foundation-and-public-entry` | Tokens, layout, primitivas, landing, navegación, aviso demo, páginas públicas 404/error | foundation + functional | **DELTA SPECS** | CHG-01 | Sí | AV-1 (parcial: shell y cabeceras públicas) | M | Bajo |
| CHG-05 | `repair-request-registration` | PUB-02/PUB-03: capturar y validar la solicitud, crear la orden, idempotencia, confirmación y entrega del código; introduce además la identidad del código en `public-order-tracking` (sin consulta) | functional | **DELTA SPECS** (2 capabilities) | CHG-02, CHG-04 (soft: CHG-03) | Sí | AV-1 (Activity), AV-2 | L | Medio |
| CHG-06 | `public-order-tracking` | PUB-04/PUB-05: búsqueda por código, resultado uniforme para mal formado o inexistente, vista pública, Journey y timeline, frontera `SC-11`; usa el limitador de CHG-02 | functional | **DELTA SPECS** (extiende la capability) | CHG-05 | Sí | AV-1, AV-2 | L | Alto |
| CHG-07 | `production-environment-baseline` | Vercel + Neon `main`, `migrate-production`, *preflight* de privilegios, smoke no mutante | delivery | **SKIP_SPECS** | CHG-02, CHG-03 (delivery: CHG-06) | Sí | AV-3 | M | Alto |
| CHG-08 | `admin-access` | ADM-01: login, sesión, logout, autorización uniforme, área administrativa dinámica con CSP estricta, provisioning; usa el limitador de CHG-02. **No depende del tracking público** | functional | **DELTA SPECS** | CHG-02, CHG-04 (soft: CHG-03) | Sí | AV-1 (crítico), AV-2 | L | Alto |
| CHG-09a | `admin-order-directory` | ADM-02/ADM-03: dashboard, listado, búsqueda, filtro, paginación | functional | **DELTA SPECS** | CHG-05, CHG-08 | Sí | AV-2 (escape de comodines) | M | Medio |
| CHG-09b | `admin-order-detail` | ADM-04 (lectura): detalle con separación público/interno e historial administrativo | functional | **DELTA SPECS** | CHG-05, CHG-08 | Sí | AV-2 | M | Medio |
| CHG-10 | `repair-status-lifecycle` | Transiciones válidas, `E11` **ligada a la versión revisada de la orden**, cancelación, estados finales, historial de estados, vista desactualizada; refleja el estado en la consulta pública | functional | **DELTA SPECS** | CHG-06, CHG-09b | Sí | AV-1, AV-2 | L | Alto |
| CHG-11 | `diagnosis-and-estimate` | Registrar y editar diagnóstico y costo, obligatoriedad, historial, congelamiento y publicación | functional | **DELTA SPECS** | CHG-10 | Sí | AV-2 (`NUMERIC`) | M | Alto |
| CHG-12 | `order-notes` | Notas públicas e internas; el cliente ve las públicas | functional | **DELTA SPECS** | CHG-10 | Sí | AV-2 (bloqueo de fila) | M | Medio |
| CHG-13 | `order-data-correction` | «Editar datos» (ADM-04) con las validaciones del registro, no en estados finales | functional | **DELTA SPECS** | CHG-10 | Sí | Ninguno adicional | S | Medio |
| CHG-14 | `security-hardening-pass` | Security Pass formal y endurecimiento global de lo ya construido | quality | **SKIP_SPECS** | CHG-11, CHG-12, CHG-13 (delivery: CHG-07) | No | AV-3 | M | Medio |
| CHG-15 | `release-readiness` | Cierre de trazabilidad, revisión manual de `SC-15`, *seed* ficticio, runbooks, evidencia de `SC-20` | delivery + quality | **SKIP_SPECS** | CHG-14 (delivery: CHG-07) | No | AV-3 | M | Bajo |

**Validación de la clasificación.** Se confirma tal como se planteó (`SKIP_SPECS`: 01, 02, 03, 07, 14, 15; `DELTA SPECS`: el resto), con estas condiciones:
- **CHG-02:** sin comportamiento observable; los comportamientos persistidos pertenecen a las capabilities funcionales que los usan.
- **CHG-07:** `SC-19`/`SC-20` se demuestran con evidencia de entrega, no con una capability de infraestructura.
- **CHG-14 solo es `SKIP_SPECS` si no introduce comportamiento funcional nuevo.** Rate limiting visible, `SESSION_EXPIRED`, `TRACKING_NOT_FOUND`, `SC-11` y `SC-12` nacen en CHG-05/06/08 y siguientes, no aquí. Un defecto hallado por el Security Pass que cambie comportamiento se corrige con un change con deltas sobre la capability propietaria.
- **CHG-04** tiene comportamiento observable (§7), por lo que lleva delta; las primitivas de UI son *tasks*.

**CHG-03 frente a cada change funcional.** CHG-03 instala y configura la **infraestructura** de calidad: umbral de cobertura en `domain/`, base de Playwright (proyectos y reglas), script de trazabilidad, typecheck/lint en CI, jobs `static` y `db-tests`, y protección de `main`. **Cada change funcional añade sus propias pruebas** (§11); no se deja la suite para CHG-14/15. *Nota de ubicación:* el ejecutor mínimo de Vitest vive en CHG-01 porque ese change ya trae lógica pura que probar (logger, validadores); CHG-03 amplía la configuración (ver pregunta Q-11).

---

## 10. Mapa de creación y extensión de capabilities

Dos niveles distintos (§2): la **capability** es nueva o existente; el **requirement delta** (`ADDED`/`MODIFIED`) es la operación sobre sus requisitos. El detalle por requisito lo fija la Spec en la Fase 6.4.

| Change | Capability | Estado de la capability | Requirement delta esperado |
|---|---|---|---|
| CHG-04 | `public-site-entry` | Nueva (con `Purpose`) | `ADDED`: landing, navegación, aviso demo, páginas públicas 404/error |
| CHG-05 | `repair-request-registration` | Nueva | `ADDED`: captura, validación, idempotencia, creación de la orden, confirmación y entrega del código |
| CHG-05 | `public-order-tracking` | Nueva | `ADDED`: **solo** la identidad del código (generación, formato, propiedades `E16`/`E17`, entrega); sin consulta |
| CHG-06 | `public-order-tracking` | Existente | `ADDED`: introducción y normalización del código, búsqueda, resultado uniforme, vista pública, Journey, timeline, frontera `SC-11`, límite de intentos |
| CHG-08 | `admin-access` | Nueva | `ADDED`: login, sesión, logout, autorización uniforme, `E10` |
| CHG-09a | `admin-order-management` | Nueva | `ADDED`: dashboard, listado, búsqueda, filtro, paginación, acceso al detalle |
| CHG-09b | `admin-order-management` | Existente | `ADDED`: detalle administrativo y presentación del historial |
| CHG-10 | `repair-lifecycle` | Nueva | `ADDED`: estados, transiciones, `E11` y su ligadura a la versión, cancelación, terminalidad, `E9` |
| CHG-10 | `public-order-tracking` | Existente | `ADDED`: presentación de orden *Cancelado* y de estados avanzados |
| CHG-10 | `admin-order-management` | Existente | `ADDED`: acciones de transición en el detalle |
| CHG-11 | `diagnosis-and-estimate` | Nueva | `ADDED`: contenido, costo, edición, obligatoriedad, historial, congelamiento, publicación |
| CHG-11 | `admin-order-management` | Existente | `ADDED`: controles de edición e historial de diagnóstico/costo |
| CHG-11 | `public-order-tracking` | Existente | `ADDED`: presentación de diagnóstico y costo publicados, si CHG-06 no los cubre ya con un requisito general |
| CHG-12 | `order-notes` | Nueva | `ADDED`: notas públicas e internas |
| CHG-12 | `public-order-tracking` | Existente | `ADDED`: presentación de notas públicas, con la misma salvedad |
| CHG-12 | `admin-order-management` | Existente | `ADDED`: bloques de notas en el detalle |
| CHG-13 | `admin-order-management` | Existente | `ADDED`: corrección de datos básicos |

**`MODIFIED` esperadas: ninguna.** Solo aparecería si, al redactar una Spec, cambia el texto o la semántica de un requisito ya existente; no se prevé ninguna. Dos decisiones de redacción lo evitan: (1) CHG-06 escribe el requisito de la vista pública de forma general («muestra diagnóstico, costo y notas públicas si y solo si corresponde») y los changes posteriores lo **completan** sin reescribirlo; (2) CHG-10 redacta desde el inicio el requisito general de `E11` (§8.2), de modo que CHG-13 participa en él sin tocarlo.

**Creación:** cada capability nace en un change y solo uno la crea; CHG-05 es el único que crea dos.

**Cadenas de capability** (donde la política §3 obliga a serializar, porque varios changes tocan la misma main spec):

```text
admin-order-management : CHG-09a → CHG-09b → CHG-10 → CHG-11 → CHG-12 → CHG-13
public-order-tracking  : CHG-05 → CHG-06 → CHG-10 → CHG-11 → CHG-12
las demás capabilities : un solo change
```

---

## 11. Seguridad y calidad incrementales (por change funcional)

CHG-14/15 son *gates* globales; **no sustituyen** la calidad incremental. Cada change funcional incluye en su evidencia de salida las pruebas del nivel adecuado y los criterios `SC`/`E` que cubre.

| Change | `SC-11` | `SC-12` | Resultados visibles | Privacidad / autorización | Evidencia (unit / integración / E2E) | Criterios |
|---|---|---|---|---|---|---|
| CHG-04 | N/A | N/A | 404, error inesperado, carga | — | E2E de navegación y responsive | `SC-15` (parcial) |
| CHG-05 | **Aplica**: la confirmación solo lleva código y equipo; logs sin datos personales | N/A | `VALIDATION_FAILED`, `INTERNAL_ERROR` | Código aleatorio no derivable; sin eco de datos | U: validadores, generación del código · I: caso de uso, idempotencia, restricciones · E: registro | `SC-01`, `SC-16`, `E1`–`E3`, `E13`, `E16`, `E17` |
| CHG-06 | **Aplica (núcleo)**: proyección mínima y prueba negativa con orden poblada | N/A | `TRACKING_NOT_FOUND`, `RATE_LIMITED`, `SERVICE_UNAVAILABLE` | Código fuera de URL y logs; resultado efímero | U: normalización, Journey · I: proyección, limitador · E: consulta, no encontrado, navegar y volver | `SC-02`, `SC-11`, `SC-13`, `E4`, `E6`, `E15` |
| CHG-08 | N/A | **Aplica (núcleo)**: autorización uniforme y prueba de acción directa sin sesión | `INVALID_CREDENTIALS`, `SESSION_EXPIRED`, `RATE_LIMITED`, `SERVICE_UNAVAILABLE` | UUID no da acceso; cookie y sesión | U: formato de hash · I: sesiones, privilegios del rol · E: login, logout + Back/Forward | `SC-12`, `E10` |
| CHG-09a | **Aplica**: nada administrativo hacia lo público | **Aplica**: toda lectura exige sesión | Estado vacío, `SESSION_EXPIRED` | Escape de comodines | I: búsqueda, paginación · E: buscar y filtrar | `SC-03`, `E7`, `E8`, `E15` |
| CHG-09b | **Aplica**: DTO administrativo separado del público | **Aplica** | `SESSION_EXPIRED`, orden inexistente | XSS almacenado como texto | I: contrato del DTO · E: abrir detalle | `SC-03`, `SC-10` |
| CHG-10 | **Aplica**: el timeline público solo muestra transiciones | **Aplica**: cada acción | `TRANSITION_NOT_ALLOWED`, `STALE_ORDER`, `CONFIRMATION_REQUIRED`, `SESSION_EXPIRED` | Servidor como fuente de verdad | U: 64 pares · I: versión, historial atómico, estado↔historial · E: transiciones y `E11` | `SC-04`–`SC-06`, `SC-09`, `SC-10`, `E9`, `E11`, `E13`, `E14` |
| CHG-11 | **Aplica (fuerte)**: valores no publicados no se cargan (4 pruebas) | **Aplica** | `DIAGNOSIS_AND_COST_REQUIRED`, validación de costo, `STALE_ORDER`, `ORDER_CLOSED` | Congelamiento | U: dinero · I: publicación · E: **E2E-01** | `SC-07`, `SC-08`, `SC-10`, `SC-17`, `E5` |
| CHG-12 | **Aplica**: solo `visibility = PUBLIC` llega al cliente | **Aplica** | `STALE_NOTE`, `NOTE_NOT_FOUND`, `ORDER_CLOSED` | Notas internas nunca públicas | I: carrera nota contra cierre · E: notas | `E12`, `E14`, `SC-09` |
| CHG-13 | **Aplica**: el nombre de búsqueda no está en ningún DTO público | **Aplica** | `VALIDATION_FAILED`, `STALE_ORDER`, `ORDER_CLOSED` | Código no editable | I: validaciones, versión · E: corrección | `E3` (admin), `E17`, `SC-09` |

**CHG-14** verifica y endurece (Security Pass formal, logs reales, cabeceras efectivas, privilegios del despliegue); **CHG-15** cierra trazabilidad y entrega. Ninguno es la primera implementación de un control.

---

## 12. Dependencias

### 12.1 Tipos
- **Hard (implementación):** el código no puede funcionar sin el predecesor.
- **Spec-base (política FIXORA, §3):** el change añade o modifica requisitos de una capability ya creada por otro; espera a que el predecesor esté implementado, verificado y **archivado**. Se expresa como cadenas de capability (§10). Técnicamente solo `MODIFIED` exige que la main spec exista; aquí la espera es **política**, no imposibilidad técnica.
- **Delivery:** bloquea despliegue o release, no el desarrollo.
- **Soft:** orden recomendado, técnicamente paralelizable.

### 12.2 Aristas

| Arista | Tipo | Nota |
|---|---|---|
| CHG-01 → CHG-02, CHG-04 | Hard | Base de código tipada |
| CHG-02 → CHG-03 | Hard | `db-tests` necesita la infraestructura de PostgreSQL |
| CHG-02 → CHG-05, CHG-08 | Hard | Persistencia y limitador |
| CHG-04 → CHG-05, CHG-08 | Hard | Layout y primitivas de UI |
| CHG-03 → CHG-05, CHG-08 | Soft (proceso) | Ninguna rebanada se fusiona sin CI y base de pruebas (`SC-19`) |
| CHG-05 → CHG-06 | Hard + Spec-base | Hay órdenes y códigos que buscar; ambos tocan `public-order-tracking` |
| CHG-05, CHG-08 → CHG-09a | Hard | Órdenes y sesión |
| CHG-09a → CHG-09b | Spec-base + Soft | Misma capability; el detalle es la salida natural del listado. CHG-09b también necesita CHG-05 y CHG-08 (Hard) |
| CHG-06, CHG-09b → CHG-10 | Hard (+ Spec-base) | Superficie administrativa y vista pública que refleja el estado |
| CHG-10 → CHG-11, CHG-12, CHG-13 | Hard (+ Spec-base) | Estados finales y versión de la orden |
| CHG-11 → CHG-12 → CHG-13 | Spec-base | Sin dependencia de código entre ellos (§12.5) |
| CHG-02, CHG-03 → CHG-07 | Hard | Roles, migraciones y pruebas |
| CHG-06 → CHG-07 | Delivery | Contenido que el smoke consulta |
| CHG-07 → CHG-14, CHG-15 | Delivery | El Security Pass y `SC-20` se verifican sobre el despliegue real |
| CHG-11, CHG-12, CHG-13 → CHG-14 → CHG-15 | Hard | Se endurece lo construido |

**`admin-access` no depende del tracking público.** El limitador de intentos que ambos usan es infraestructura técnica y se construye en CHG-02, de modo que CHG-08 puede desarrollarse **en paralelo** con CHG-05/CHG-06 una vez cumplidas sus bases.

### 12.3 CHG-07 no bloquea el desarrollo funcional
`production-environment-baseline` **no** es dependencia de CHG-08, 09a, 09b, 10, 11, 12 ni 13: todos se desarrollan y prueban en local, en la rama Neon `test` y en CI. La Production pública solo bloquea **`SC-20`, el smoke de Production, CHG-15 y las partes del Security Pass que verifican cabeceras o ejecución desplegadas** (CHG-14). Su posición al final del Tier 1 es una recomendación blanda para obtener pronto un despliegue real (AV-3); el backlog puede moverla sin romper el DAG.

### 12.4 Diagrama (solo aristas Hard; las Soft se indican)

```text
CHG-01 ─┬─ CHG-02 ─┬─ CHG-03
        │          ├─ CHG-05 ─── CHG-06          (CHG-05 también necesita CHG-04; soft: CHG-03)
        │          ├─ CHG-08                      (también necesita CHG-04; soft: CHG-03; paralelo a 05/06)
        │          └─ CHG-07                      (también necesita CHG-03; delivery)
        └─ CHG-04

CHG-05 + CHG-08 ─── CHG-09a ─── CHG-09b
CHG-06 + CHG-09b ── CHG-10 ─┬─ CHG-11 ─┐
                            ├─ CHG-12 ─┼─ CHG-14 ─── CHG-15
                            └─ CHG-13 ─┘
Delivery: CHG-06 ⇢ CHG-07 ⇢ CHG-14, CHG-15
```

Sin ciclos. El acoplamiento potencial entre lifecycle y diagnóstico/costo se rompe con una **precondición segura por defecto**: en CHG-10 el lifecycle rechaza *Esperando aprobación* mientras no exista el proveedor de la precondición (la rechaza siempre, lo que ya satisface `SC-07`); CHG-11 aporta la capability que la define y el camino de éxito.

### 12.5 Paralelización y serialización
- **Posible en teoría:** CHG-02 ∥ CHG-04; **CHG-08 ∥ CHG-05/CHG-06**; CHG-09a ∥ CHG-09b (aunque la política los encadena); CHG-07 ∥ la línea administrativa.
- **Serializado como estrategia de implementación:** CHG-11 → CHG-12 → CHG-13. Responde principalmente a (1) la política de main specs de FIXORA (los tres amplían `admin-order-management` y algunos `public-order-tracking`), (2) la reducción de conflictos de fusión sobre la misma pantalla ADM-04 y (3) que el trabajo lo hace una sola persona. **No es una imposibilidad técnica absoluta** de desarrollarlos en paralelo.

---

## 13. Tiers y milestones

| Tier | Contenido | Pregunta que responde | Milestone |
|---|---|---|---|
| **0 — Fundación** | CHG-01, 02, 03, 04 | ¿Qué infraestructura mínima debe existir antes de cualquier slice? | **M0:** base verificable |
| **1 — Camino del cliente** | CHG-05, 06 (+ 07 recomendado) | ¿Puede un cliente registrar y consultar sin exponer nada interno? | **M1:** el cliente registra y consulta |
| **2 — Acceso administrativo** | CHG-08 (puede iniciarse en paralelo con el Tier 1, tras sus bases), 09a, 09b | ¿Entra el administrador y ve las órdenes sin romper `SC-11`/`SC-12`? | **M2:** el administrador encuentra e inspecciona una orden |
| **3 — Ciclo de vida y presupuesto** | CHG-10, 11 | ¿Se gestiona de verdad una reparación? | **M3 = E2E-01** |
| **4 — Cierre funcional** | CHG-12, 13 | ¿Está completo el alcance funcional? | **M4:** funcionalidad completa |
| **5 — Endurecimiento y entrega** | CHG-14, 15 | ¿Cumple V1 `SC-14`…`SC-20`? | **M5:** V1 lista para evaluar |

Estrategia: fundación mínima → rebanadas verticales que siguen el recorrido real del producto → endurecimiento. Se rechaza «base de datos → repositorios → servicios → UI» porque no demuestra valor hasta el final.

---

## 14. Milestone E2E-01 (`SC-17`)

Flujo: cliente registra → código → administrador inicia sesión → localiza la orden → `SOLICITUD_RECIBIDA → EQUIPO_RECIBIDO → EN_DIAGNOSTICO` → diagnóstico y costo → `ESPERANDO_APROBACION` (con `E11`) → el cliente consulta y ve estado, Journey, diagnóstico y costo.

| Paso | Change |
|---|---|
| Registro y código | CHG-05 |
| Consulta pública | CHG-06 |
| Login del administrador | CHG-08 |
| Localizar la orden por código | CHG-09a |
| Abrir el detalle | CHG-09b |
| Transiciones válidas y `E11` | CHG-10 |
| Registrar diagnóstico y costo; publicación | CHG-11 |
| Soporte (TypeScript, persistencia, CI/Playwright, UI) | CHG-01, 02, 03, 04 |

**Conjunto exacto: CHG-01, 02, 03, 04, 05, 06, 08, 09a, 09b, 10 y 11 = 11 de 16.** (Con CHG-09 sin dividir serían 10 de 15.) **CHG-07 no es necesaria**: el E2E-01 corre en CI sobre la rama `test`. Tampoco intervienen CHG-12, 13, 14 ni 15. El E2E-01 se completa en CHG-11 como evidencia de salida; no existe un único change «E2E».

---

## 15. Revisión de tamaño y de fusiones

### 15.1 Changes de complejidad L

| Change | ¿Sigue siendo una unidad razonable? |
|---|---|
| CHG-01 | Un único resultado: «el esqueleto tipado y por capas que todos los slices importan». Dividirlo (tipos / logger / errores) sería partir por capas técnicas sin valor demostrable aislado. Se acota: sin lógica de negocio. |
| CHG-05 | Un único resultado de usuario: «registrar y obtener el código». Formulario, validación, idempotencia, emisión del código y confirmación son inseparables para que el flujo sea útil. |
| CHG-06 | Un único resultado: «consultar con seguridad»: búsqueda, resultado uniforme, vista pública, Journey y timeline. El componente técnico del limitador vive en CHG-02, por lo que CHG-06 solo lo usa y especifica su comportamiento visible. Riesgo alto, por `SC-11`. |
| CHG-08 | Un único resultado: «entrar a la zona administrativa». Sesión, CSP, aprovisionamiento y límite de intentos son partes del mismo acceso. |
| CHG-10 | Un único resultado: «una orden progresa o se cancela solo por transiciones válidas». Las confirmaciones `E11` son cuatro variantes de un mismo diálogo y la cancelación comparte la tabla de transiciones; dividirlas obligaría a una secuencia `ADDED → ADDED` sobre la misma capability sin beneficio de revisión. **Se mantiene.** |

### 15.2 División propuesta: CHG-09 → CHG-09a + CHG-09b
CHG-09 combinaba dos resultados funcionalmente independientes: **encontrar** órdenes (ADM-02/ADM-03: listas, búsqueda, paginación) e **inspeccionar** una (ADM-04 en lectura). Difieren en pantallas, en DTO (`AdminOrderListItem` / `AdminOrderPage` frente a `AdminOrderDetail`) y en riesgo de `SC-11`, y SC-03 se verifica con ambos. La división **no es por capas técnicas** y sigue en la misma capability (`ADDED` → `ADDED`, sin `MODIFIED`). Está **aprobada** (Q-13).

### 15.3 Candidatos a fusión revisados
| Par | Resultado |
|---|---|
| CHG-05 + CHG-06 | **No fusionar**: aunque comparten `public-order-tracking` (CHG-05 crea la identidad del código y CHG-06 la extiende con `ADDED Requirements`), son resultados de usuario distintos —registrar frente a consultar— con riesgos de seguridad distintos (registro sin anti-spam frente a consulta con límite y `SC-11`) |
| CHG-10 + CHG-11 | **No fusionar**: capabilities distintas con propietarios de requisitos distintos (§8.3) |
| CHG-12 + CHG-13 | **No fusionar**: capabilities y resultados distintos |
| CHG-09a + CHG-09b | **Divididos a propósito** (§15.2) |
| Secuencias `ADDED → archive → MODIFIED` sin beneficio | **Ninguna.** Con los ajustes de §8.1 y §10 solo queda un `MODIFIED` candidato (CHG-13) |

---

## 16. Trazabilidad preliminar

### 16.1 Criterios de éxito

| Fuente | Capability candidata | Change candidato |
|---|---|---|
| SC-01 | `repair-request-registration` | CHG-05 |
| SC-02 | `public-order-tracking` | CHG-06 |
| SC-03 | `admin-access`, `admin-order-management` | CHG-08, 09a, 09b |
| SC-04 | `repair-lifecycle`, `public-order-tracking` | CHG-10 (completo con CHG-11) |
| SC-05 | `repair-lifecycle` | CHG-10 |
| SC-06 | `repair-lifecycle` | CHG-10 |
| SC-07 | `diagnosis-and-estimate` (obligatoriedad) | CHG-11 (CHG-10 rechaza por defecto) |
| SC-08 | `diagnosis-and-estimate`, `public-order-tracking` | CHG-11 |
| SC-09 | `repair-lifecycle`, `diagnosis-and-estimate`, `order-notes`, `admin-order-management` | CHG-10, 11, 12, 13 |
| SC-10 | `repair-lifecycle`, `diagnosis-and-estimate`, `public-order-tracking`, `admin-order-management` | CHG-09b, 10, 11 |
| SC-11 | `public-order-tracking` (+ separación en `admin-order-management`) | CHG-06 y cada change posterior; CHG-14 |
| SC-12 | `admin-access` (+ todas las administrativas) | CHG-08 y cada change administrativo; CHG-14 |
| SC-13 | `public-order-tracking` | CHG-06 |
| SC-14 | Transversal | CHG-02 + integración de cada slice; CHG-15 |
| SC-15 | Transversal (`public-site-entry` y cada pantalla) | CHG-04 + cada slice; revisión CHG-15 |
| SC-16 | `repair-request-registration` | CHG-05 |
| SC-17 | Transversal | CHG-11 (E2E-01), con CHG-03 |
| SC-18 | Transversal | CHG-14 |
| SC-19 | Transversal | CHG-03 |
| SC-20 | Transversal | CHG-07, CHG-15 |

### 16.2 Casos borde

| Fuente | Capability candidata | Change candidato |
|---|---|---|
| E1 | `repair-request-registration` | CHG-05 |
| E2 | `repair-request-registration` | CHG-05 |
| E3 | `repair-request-registration`; `admin-order-management` | CHG-05, CHG-13 |
| E4 | `public-order-tracking` | CHG-06 |
| E5 | `diagnosis-and-estimate`; `public-order-tracking` (presentación del *Cancelado*) | CHG-10, CHG-11 |
| E6 | `public-order-tracking` | CHG-06 (base), 11 y 12 (completan) |
| E7 | `admin-order-management` | CHG-09a |
| E8 | `admin-order-management` | CHG-09a |
| E9 | `repair-lifecycle`, `diagnosis-and-estimate`, `order-notes`, `admin-order-management` | CHG-10, 11, 12, 13 |
| E10 | `admin-access` (+ cada mutación administrativa) | CHG-08, 10–13 |
| E11 | `repair-lifecycle` | CHG-10 |
| E12 | `order-notes` | CHG-12 |
| E13 | `repair-request-registration` (sin anti-spam), `repair-lifecycle` (cancelar) | CHG-05, CHG-10 |
| E14 | `order-notes`, `repair-lifecycle` | CHG-10, CHG-12 |
| E15 | `public-order-tracking`; `admin-order-management` | CHG-06, CHG-09a |
| E16 | `public-order-tracking` (identidad del código); `repair-request-registration` (entrega al usuario) | CHG-05 |
| E17 | `public-order-tracking` (inmutabilidad del código); `admin-order-management` (no editable) | CHG-05, CHG-13 |

### 16.3 Pantallas

| Pantalla | Capability | Change |
|---|---|---|
| PUB-01 Landing | `public-site-entry` | CHG-04 |
| PUB-02 Registrar | `repair-request-registration` | CHG-05 |
| PUB-03 Confirmación | `repair-request-registration` | CHG-05 |
| PUB-04 Consultar | `public-order-tracking` | CHG-06 |
| PUB-05 Seguimiento | `public-order-tracking` | CHG-06 (extendida en 10, 11, 12) |
| ADM-01 Acceso | `admin-access` | CHG-08 |
| ADM-02 Dashboard | `admin-order-management` | CHG-09a |
| ADM-03 Listado | `admin-order-management` | CHG-09a |
| ADM-04 Detalle | `admin-order-management` (+ lifecycle, assessment, notes) | CHG-09b (lectura), 10, 11, 12, 13 (acciones) |

### 16.4 Decisiones del Technical Design que condicionan la partición

| Decisión | Efecto |
|---|---|
| Cache Components, `/admin/**` dinámico y CSP con nonce (ADR-002, ADR-007) | CHG-08 es el primer change administrativo y depende de AV-1 |
| Esquema por expand/contract (ADR-003) | La migración de cada entidad nace con su slice |
| Una sola tabla de transiciones y `version` por orden (ADR-006) | `repair-lifecycle` es dueño del control de versión; el resto lo consume (`E9`) |
| Limitador en PostgreSQL (ADR-007) | Se construye como componente técnico en CHG-02; su comportamiento visible (`RATE_LIMITED`) lo especifican CHG-06 y CHG-08, que no dependen entre sí por él |
| Modelo de despliegue R1 y migración manual (ADR-009) | CHG-07 es un change de entrega propio |
| OpenSpec como herramienta de proceso (TD §31) | `skip_specs` para changes sin comportamiento |

---

## 17. Gaps y riesgos

| Pregunta | Resultado |
|---|---|
| ¿`SC-*` sin capability? | Ninguno. `SC-14`, `SC-15`, `SC-17`–`SC-20` son transversales o de entrega por diseño |
| ¿`E*` sin capability? | Ninguno |
| ¿Pantalla sin change? | Ninguna (9/9) |
| ¿Change sin requisito o decisión que lo justifique? | CHG-01, 02, 03, 07, 14, 15 se justifican por el Technical Design y `SC-14`, `SC-17`–`SC-20` |
| ¿Capability sin comportamiento observable? | Ninguna (`public-site-entry`: §7) |
| ¿Dependencia circular? | No |
| ¿Change demasiado grande? | §15 |
| ¿Change demasiado técnico? | CHG-01, 02, 03 son técnicos por naturaleza y se mantienen mínimos |
| ¿Scope creep? | Ninguno. `seed:demo`, `admin:provision`, runbooks y *preflight* son operaciones del Technical Design |

Tensión heredada del Technical Design (`E11` se invalida si se editan los datos básicos, ADR-006): **resuelta en la estrategia** — la semántica de confirmación y ligadura a la versión pertenece a `repair-lifecycle` (Q-7, §8.2).

---

## 18. Preguntas abiertas (reclasificadas)

| # | Pregunta | Estado | Resolución o destino |
|---|---|---|---|
| Q-1 | ¿`public-site-entry` es capability? | **RESUELTA EN 6.2** | Sí: posee requisitos propios (§7). Solo se revisaría si la Spec no confirma al menos tres |
| Q-2 | ¿`diagnosis-and-estimate` separada de `repair-lifecycle`? | **RESUELTA EN 6.2** | Sí, por propiedad de requisitos (§8.3), sin promesas futuras |
| Q-3 | ¿`admin-order-management` se divide? | **RESUELTA EN 6.2** | Una capability; su entrega se divide en CHG-09a/09b (§15.2) |
| Q-4 | Convención documental de planificación y backlog | **RESUELTA EN 6.2** | `docs/04-planificacion/` es la ubicación canónica de la planificación de la Fase 6. Existe además `docs/04-backlog/`, vacía salvo su `.gitkeep`: **recomendación** de consolidar planificación y backlog bajo `docs/04-planificacion/`; la limpieza se ejecuta en la Fase 6.3 |
| Q-5 | Mecánica de `skip_specs` en 1.15.0 | **RESUELTA EN 6.2** | §4 |
| Q-6 | ¿Las columnas de diagnóstico y costo nacen en CHG-05 o en CHG-11? | **DEFERRED — Spec técnica de persistencia / implementación** | Su ubicación en el esquema es *cómo*, no *qué*: la capability y su comportamiento ya están definidos. Por defecto, en CHG-11 mediante expand/contract |
| Q-7 | `E11` frente a ediciones de datos | **RESUELTA EN 6.2** | La arquitectura ya decidió el comportamiento (ADR-006). `repair-lifecycle` posee la semántica de confirmación y ligadura a la versión; CHG-10 introduce desde el inicio un requisito general: *la confirmación `E11` está ligada a la versión vigente de la orden revisada; si antes de ejecutar la transición ocurre cualquier mutación efectiva que incremente la versión, el servidor rechaza la transición como vista desactualizada y no aplica cambios* (redacción final en la Fase 6.4). Una corrección de datos (CHG-13) incrementa la versión y participa automáticamente: no hace falta `MODIFIED` salvo contradicción objetiva al redactar |
| Q-8 | ¿Se reevalúa `/opsx:verify` (perfil `core`)? | **RESUELTA EN 6.2** | Sí, al entrar en la Fase 7 (decisión ya acordada) |
| Q-9 | ¿Serializar CHG-11 → CHG-12 → CHG-13? | **RESUELTA EN 6.2** | Sí, por la cadena de `admin-order-management` (§10). El orden entre CHG-12 y CHG-13 lo prioriza la Fase 6.3 |
| Q-10 | Posición de CHG-07 | **RESUELTA EN 6.2** | No bloquea el desarrollo funcional (§12.3); es dependencia de delivery. Su calendario es una decisión de priorización del backlog, no una pregunta abierta |
| Q-11 | Ejecutor mínimo de Vitest en CHG-01; CHG-03 completa la infraestructura de calidad | **RESUELTA EN 6.2** | CHG-01 incluye el ejecutor mínimo para probar cualquier función pura, validación, regla de dominio o helper técnico de la fundación, sin convertirse en el change de testing. CHG-03 completa: cobertura, `@vitest/coverage-v8`, integración con PostgreSQL de pruebas, base de Playwright, trazabilidad, CI `static` y `db-tests`, guardias de test y demás infraestructura aprobada. Cada change funcional incorpora sus pruebas |
| Q-12 | Propiedad del código de seguimiento | **RESUELTA EN 6.2** | `public-order-tracking` posee la identidad pública (formato, alfabeto, longitud, legibilidad, normalización, unicidad, inmutabilidad, credencial de lectura); `repair-request-registration` posee la captura, la creación y la entrega del código. CHG-05 introduce las dos capabilities; CHG-06 extiende la de tracking (§8.1) |
| Q-13 | División CHG-09a / CHG-09b | **RESUELTA EN 6.2** | Se mantiene: dos resultados funcionales (encontrar / inspeccionar) de la misma capability `admin-order-management`; no se crean capabilities `admin-order-directory` ni `admin-order-detail` (§15.2) |

---

## 19. Gates de cierre de la Fase 6.2 (2026-10-27)

| Gate | Resultado |
|---|---|
| Cobertura: `SC-01`…`SC-20` | 20/20 con capability o change (§16.1) |
| Cobertura: `E1`…`E17` | 17/17 (§16.2) |
| Cobertura: pantallas | 9/9 (§16.3); la división CHG-09a/09b conserva ADM-02, ADM-03 y ADM-04 |
| Cada capability la crea al menos un change | 8/8 (§10; CHG-05 crea dos) |
| Cada change `DELTA SPECS` tiene al menos una capability | 10/10 (§10) |
| Cada change `SKIP_SPECS` es técnico, de calidad o de entrega | 6/6: CHG-01, 02, 03 (fundación), 07 (entrega), 14 (verificación), 15 (entrega y evidencia) |
| Change sin justificación / capability huérfana | Ninguno |
| Requisitos perdidos por la división de CHG-09 | Ninguno (misma capability, `ADDED` → `ADDED`) |
| Ciclos en el DAG | 0 |
| `admin-access` depende del tracking público | No (§12.2) |
| La Production bloquea el desarrollo funcional | No; solo `SC-20`, smoke, CHG-14/15 (§12.3) |
| Dependencias Spec-base diferenciadas de las de implementación | Sí (§12.1, §10) |
| Dependencias de delivery presentadas como Hard | No (§12.2) |
| Dependencias Soft identificadas | Sí (CHG-03 para las rebanadas, paralelismos, posición de CHG-07) |

---

## 20. Qué NO decide este documento

Tareas, estimaciones, orden dentro de cada change, nombres definitivos de capabilities y changes (se confirman al crear cada artefacto OpenSpec), contenido de requisitos y escenarios, ni la ejecución del Architecture Validation Gate (primer paso de la Fase 7).
