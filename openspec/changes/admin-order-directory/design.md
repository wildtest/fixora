# Design

## Context

CHG-09a entrega el lado de lectura de `admin-order-management`: panel (ADM-02) y directorio (ADM-03). Sigue `TECHNICAL-DESIGN.md` §17 y §19 y ADR-003 sin reabrirlos. Consume: `ActionResult`/`runAction`/logger (CHG-01), `repair_orders`, índices y `customer_name_search` (CHG-02), orden e identidad del código (CHG-05) y `requireAdmin()`/`AdminContext`/shell (CHG-08). No modifica `admin-access`. Es solo planificación.

**Dependencia de Spec-base futura.** CHG-09a introduces `admin-order-management`. CHG-09b may be materialized while CHG-09a remains active using the OpenSpec 1.15.0 pattern already validated for Modified Capability + ADDED Requirements. **CHG-09a must be implemented, verified and archived before CHG-09b is archived/applied according to FIXORA execution policy.** Sin `/opsx:sync` anticipado.

## Goals / Non-Goals

**Goals:** conteos por estado y cinco recientes; directorio con búsqueda (código exacto o nombre parcial), filtro de estado, paginación de 20 y orden estable; lecturas protegidas, dinámicas y sin caché compartida; DTO administrativos con lista positiva.

**Non-Goals:** detalle de orden y su navegación funcional (CHG-09b); mutaciones, diagnóstico, costo, notas, correcciones; crear o eliminar órdenes; reportes, exportaciones, gráficos; filtros u ordenamientos adicionales; cursor, tiempo real o REST; rediseñar autenticación o persistencia.

## Decisions

### D1. Rutas y estado
Rutas de TD §6 y DESIGN: dashboard `/admin` (ADM-02) y directorio `/admin/ordenes` (ADM-03). CHG-08 dejó `/admin` como entrada mínima; CHG-09a la completa con el dashboard real, sin crear otra ruta. En la URL **solo** el filtro de estado (`?estado=EN_DIAGNOSTICO`, convención de TD §19, usada por el enlace «Ver en el listado» del panel). El texto de búsqueda (puede contener PII o el código, un secreto *bearer*) y la página **no** van en pathname, query ni fragmento: viajan por Server Action y viven en estado de interacción. Un `estado` inválido en la URL: comportamiento seguro sin error técnico visible (se ignora y se muestra todo), **detalle de UX de implementación**.

### D2. Flujo del panel
```text
/admin  →  requireAdmin  →  AdminContext  →  caso de uso del panel
        →  repositorio administrativo { conteos por estado, 5 recientes }
        →  AdminDashboardDTO  →  UI renderizada en servidor
```
`AdminDashboardDTO { countsByStatus (los ocho estados), recentOrders[0..5] }`. La consulta agrupada devuelve solo los estados existentes y `application/` completa con `0` los ocho. Recientes: `created_at DESC, id DESC` (registradas más recientemente, no «actualizadas»). Sin otras métricas, sin paginación, independiente del filtro. No expone agregados crudos de Prisma ni tipos Prisma fuera de `infrastructure`.

### D3. Flujo del directorio
```text
/admin/ordenes  →  requireAdmin  →  entrada (búsqueda, estado, página)
                →  parseo y validación  →  caso de uso del directorio
                →  repositorio administrativo  →  AdminOrderPage  →  UI
```
Un único caso de uso sirve la carga inicial (Server Component, lee `estado` de la URL) y la lectura interactiva (**Server Action**, que **vuelve a ejecutar `requireAdmin()`** y exige `AdminContext`; no se confía en la autorización del render inicial). Sin REST (`/api/admin/orders`). Los cuerpos de las acciones no se registran.

### D4. Búsqueda
- Un único campo «código o nombre». `trim`; si el texto, tras la normalización de `E15` (espacio exterior y `a–z`→`A–Z`), cumple **exactamente** el formato del código (12 caracteres del alfabeto) → búsqueda **exacta** por `tracking_code` con la función de normalización/validación de dominio del código; si no cumple y no está vacío → **subcadena** sobre `customer_name_search`; vacío → sin criterio textual. Sin parcial, prefijo, *contains* ni difuso sobre el código. Un texto que no cumple el formato se interpreta como nombre (aceptable en una búsqueda administrativa protegida). Sin teléfono, correo, marca, modelo, descripción ni diagnóstico.
- No se reutilizan indiscriminadamente la normalización del código y la del nombre: son semánticas distintas.
- **Nombre:** `customer_name_search` es una columna derivada de CHG-02 calculada con **una única función pura compartida por escritura y búsqueda** (`trim`, descomposición Unicode, minúsculas, sin marcas diacríticas, colapso de espacios interiores, `ñ → n`; `Muñoz → munoz`). La consulta normaliza el texto con **la misma función** y no se hace transformación ad hoc por consulta. Sin `unaccent` ni `pg_trgm` en V1. Titularidad en «Propiedad de `customer_name_search`».
- **Comodines:** `%`, `_` y `\` del usuario son literales; la capa de persistencia usa un escape o consulta que lo garantice explícitamente (no queda implícito al ORM) con una prueba de integración específica. Sin SQL dinámico inseguro ni `$queryRawUnsafe`.

**Propiedad de `customer_name_search`.**
- *Persistence ownership:* CHG-02 es dueño del campo físico `customer_name_search` en `repair_orders` (ya planificado en su design y su tarea 3.2; TD §19 no define un índice propio para esta columna, por lo que no se añade ninguno).
- *Write ownership:* CHG-05 lo puebla al registrar la orden con la primitiva pura compartida de normalización, en la misma transacción.
- *Read/search ownership:* CHG-09a usa **la misma primitiva** para normalizar el texto de búsqueda por nombre y es dueño del comportamiento observable de la búsqueda administrativa.
- *Future mutation ownership:* CHG-13 lo recalcula, con la misma primitiva y en la misma mutación, cuando corrija `customer_name`.
No existe una segunda implementación (`normalizeForRegistration`/`normalizeForAdminSearch`). `customer_name_search` nunca entra en un DTO ni en la UI: se muestra `customer_name`. Es un refinamiento de ownership entre waves (el backlog sigue atribuyendo la normalización de nombre del directorio a CHG-09a; la primitiva es una dependencia de implementación previa para CHG-05), que se registra para auditarlo en la Fase 6.5 sin reescribir el backlog.

**Contrato de normalización.** TD §19 fija: `trim`, descomposición Unicode, minúsculas, eliminación de marcas diacríticas, colapso de espacios interiores y `ñ → n`; coincidencia parcial como **subcadena** sobre la columna, sin tokenización, orden libre, fuzzy ni ranking. Lo que TD no fija (tratamiento de puntuación, guiones y apóstrofes, forma exacta de normalización Unicode) es **detalle de implementación**: solo se conservan las equivalencias aprobadas y no se inventan reglas.

**Clasificación código frente a nombre.** TD §19 fija la precedencia: si el texto normalizado cumple exactamente el formato del código, la búsqueda es **exacta por código**; si no cumple y no está vacío, es por nombre. No hay respaldo «código no encontrado → buscar nombre» (no está en la fuente). Un nombre real con el formato de 12 caracteres sin vocales del alfabeto del código es prácticamente imposible, y TD §19 acepta la ambigüedad residual.

### D5. Filtro y paginación
- Filtro: uno de los ocho estados (valor del enum de dominio, validado en servidor; nunca una cadena arbitraria) combinado con la búsqueda por `AND`; «Todos» = sin filtro.
- Paginación `offset/limit` con total: `pageSize = 20` fijo en el servidor (sin selector), `page` desde 1. Cualquier cambio de búsqueda o filtro vuelve a la página 1. Con resultados, `totalPages = ceil(totalItems / 20)` y una página mayor se sirve como la última válida (fijado por TD §19; PRD y DESIGN no lo regulan, por lo que no es un requirement de la spec y se trata como comportamiento técnico); sin resultados: `items = []`, `page = 1`, `totalItems = 0`, `totalPages = 0` y la UI muestra el estado vacío. El paginador se oculta si `totalPages <= 1`. Valores no enteros, cero, negativos o NaN se normalizan o rechazan al parsear y nunca llegan al repositorio. El **total corresponde al conjunto filtrado**, no al global.
- Orden estable `created_at DESC, id DESC` (`id` solo desempata); sin orden configurable ni *scroll* infinito ni cursor. Se acepta que una orden nueva desplace filas entre páginas.
- Índices de CHG-02: `UNIQUE(tracking_code)`, `(created_at DESC, id DESC)` y `(status, created_at DESC, id DESC)`. Si el diseño de una consulta aprobada necesitara otro, se reporta y no se modifica CHG-02.

### D6. DTO y repositorio (lista positiva)
`AdminOrderListItem { id, trackingCode, customerName, device { type, brand, model|null }, status, createdAt }` (forma fijada por TD §17); `AdminOrderPage { items, page, pageSize: 20, totalItems, totalPages }`; el panel reutiliza `AdminOrderListItem` para las recientes. `id` (UUID interno, administrativo) se incluye porque TD §17 lo fija y CHG-09b lo necesita para el detalle; CHG-09a no lo renderiza, no lo coloca en URL, logs ni atributos visibles innecesarios, y no decide la ruta del detalle (la fija CHG-09b conforme a DESIGN/TD; el código de seguimiento, secreto *bearer*, no es la identidad administrativa por defecto). Construcción propiedad por propiedad; la lectura selecciona **solo** esas columnas: no carga descripción completa, diagnóstico, costo, notas, historiales, teléfono, correo ni `version`. Repositorio funcional específico de lectura administrativa en `infrastructure`, sin tipos Prisma hacia arriba y sin `GenericRepository`. El DTO administrativo vive en un módulo distinto del público y no se reutiliza en lo público.

### D7. Autorización, renderizado y privacidad
- `requireAdmin()` antes de leer cualquier dato de órdenes (CHG-08); acciones con `AdminContext` y `SESSION_EXPIRED` (patrón de CHG-08). Conocer un UUID no da acceso.
- Server Components por defecto; Client Components solo para la interacción real (búsqueda, filtro, paginación). `/admin/**` es 100 % dinámico: **sin `use cache`, ISR ni caché compartida**; sin tiempo real, *polling* ni *websockets*; al cargar o interactuar se muestra el estado persistido vigente. Al volver desde ADM-04 se vuelve a consultar al reaparecer (TD §19); no se depende del estado preservado de la navegación.
- Logs (logger de CHG-01, lista positiva): nunca texto buscado, nombre, código, ni datos devueltos. La visibilidad administrativa no autoriza a registrar PII. El código buscado por el administrador sigue siendo un secreto *bearer*: fuera de URL y logs.
- Fechas: UTC en BD; interfaz en `America/Lima`, formato `DD/MM/AAAA HH:mm`. Cliente y texto del usuario se renderizan como texto (React escapa; sin HTML crudo).

### D8. UI
Order rows (escritorio) / order cards (móvil) según DESIGN §6.7 con el orden de lectura «código, estado, equipo, cliente, fecha»; estado con badge **y** etiqueta textual (nunca solo color); búsqueda con etiqueta asociada y ayuda que indica que solo permite código o nombre; filtro por estado (chips en escritorio, *select* en móvil) con nombre accesible; paginación «Anterior/Siguiente» con «Página N de M» (§6.16); estado vacío «No se encontraron órdenes con esa búsqueda o filtro.» (§6.14); error con la base de CHG-01/CHG-04; estados pendientes durante búsqueda, filtro y paginación sin spinners por requisito. Sin scroll horizontal de página en móvil; sin breakpoints nuevos.

### D9. Navegación al detalle (propiedad en dos etapas)
CHG-09a: panel + filas del directorio. CHG-09b: ruta real del detalle y navegación funcional desde las órdenes recientes del panel y desde las filas del directorio. Es el mismo patrón de propiedad en etapas de las entradas públicas de CHG-04. Sin modificar PRD, DESIGN ni TD: la cobertura conjunta se verifica en la Fase 6.5.

DESIGN ADM-02/ADM-03 y el objetivo del backlog mencionan abrir el detalle (fila clicable, «Ver detalle», orden reciente). ADM-04 es de CHG-09b y **no se crea una pantalla falsa, un marcador ni un modal vacío**. Resolución: CHG-09a entrega las filas **sin** el control «Ver detalle» ni fila clicable, y el enlace «Ver en el listado» del panel (que sí tiene destino); CHG-09b habilita la navegación funcional a `/admin/ordenes/[id]` (DTO con `id` ya disponible) y añade el control. Es un refinamiento de propiedad respecto de DESIGN/backlog; se registra para la revisión de la Fase 6.5.

### D10. Handoff a CHG-09b
CHG-09a entrega: dashboard, directorio, búsqueda, filtro, paginación, `AdminOrderListItem`/`AdminOrderPage` y el patrón de lecturas protegidas. CHG-09b extiende `admin-order-management` (*Modified Capability + ADDED Requirements*) con el detalle administrativo completo, el DTO de detalle, la separación visual público/interno y la navegación funcional; no rediseña el directorio.

## Riesgos / Trade-offs

- La coincidencia parcial por subcadena sin índice de apoyo (TD §19 no aprueba trigramas, GIN ni texto completo) recorre el conjunto filtrado; es aceptable para el volumen de una demo y se revisa si AV-2 demuestra lo contrario, sin cambiar la arquitectura en silencio.
- El texto que no cumple el formato de código se interpreta como nombre y podría coincidir con un cliente (aceptado por TD §19).
- La paginación por *offset* puede desplazar filas durante la navegación (aceptado).
- Datos personales visibles en el área protegida: se mitigan con sesión, ausencia de caché compartida y de logs.

## Open Questions

| ID | Pregunta | Clasificación |
|---|---|---|
| OQ-1 | Titularidad de `customer_name_search` y navegación al detalle | **RESUELTAS** (CHG-02 campo, CHG-05 escritura, CHG-09a búsqueda, CHG-13 recálculo; navegación en etapas con CHG-09b) |
| OQ-2 | Interacción exacta de Server Component y Server Action, estado de la URL (`estado`), estado local de búsqueda y página, Cache Components, Back y recarga | PRE-IMPLEMENTATION AV-1 |
| OQ-3 | Escape de comodines, uso efectivo de la columna de búsqueda y de los índices, y cualquier detalle de consulta que siga pendiente | PRE-IMPLEMENTATION AV-2 |
| OQ-4 | UX de un `estado` inválido en la URL, mecánica del reinicio de página, transformación responsive de las filas, indicador exacto de carga | IMPLEMENTATION DETAIL |
| OQ-5 | Detalle de orden, navegación funcional, DTO de detalle completo y página ADM-04 | DEFERRED a CHG-09b |

## Pruebas planificadas

**Unitarias:** clasificación de la entrada de búsqueda (código frente a nombre, vacío), validación del estado, cálculos de paginación (fuera de rango, sin resultados, valores inválidos), mapeo a DTO, ayudas de orden determinista y, solo si CHG-09a es dueño de ella, la normalización del nombre (`Muñoz → munoz`). Sin duplicar la identidad del código de CHG-05.

**Integración (PostgreSQL real, sin mocks de Prisma):** conteos por estado y estados en cero; como máximo cinco recientes y su orden; orden por defecto; búsqueda exacta por código; el código parcial no actúa como coincidencia; búsqueda parcial por nombre (`Muñoz`/`munoz`); `%`, `_`, `\` literales; filtro por estado; búsqueda + filtro; total filtrado; tamaño de página 20 y segunda página; desempate determinista con el mismo `created_at`; sin resultados (conjunto vacío, no error); estado inválido tratado de forma segura; autorización requerida. **Regresión de `SC-12`** (dueño: CHG-08): sin sesión válida no se entregan datos del panel ni del listado ni se ejecuta la búsqueda.

**Playwright (`chromium-desktop`/`chromium-mobile`):** inicio de sesión con CHG-08; panel con conteos y cinco recientes; abrir el directorio; buscar por código y por nombre; filtrar; buscar + filtrar; paginar; estado vacío; sin desbordamiento horizontal. No se prueba el detalle.

**Contribución a `E2E-01`:** el tramo «iniciar sesión → localizar la orden registrada»; no abre el detalle, no cambia estado ni publica. `E2E-01` lo cierra CHG-11. Evidencia: `SC-03` (parcial), `E7`, `E8` y apoyo de `E15`; `TRACEABILITY.md` se actualiza al implementar.
