# Design

## Context

CHG-09b entrega el detalle administrativo (ADM-04) en modo lectura y habilita la navegación funcional que CHG-09a dejó diferida. Sigue `TECHNICAL-DESIGN.md` §6, §16, §17 y ADR-005 sin reabrirlos. Consume: `ActionResult`/logger (CHG-01), `repair_orders`, `order_status_history` y privilegios (CHG-02), órdenes y evento inicial (CHG-05), `requireAdmin()`/`AdminContext`/shell (CHG-08), `AdminOrderListItem` y filas (CHG-09a) y, de forma blanda, el componente de recorrido de etapas (CHG-06). Es solo planificación.

**Dependencia de Spec-base.** CHG-09b may be materialized while CHG-09a remains active because OpenSpec 1.15.0 was validated for Modified Capability + ADDED Requirements against an active predecessor. **CHG-09a MUST be implemented, verified and archived before CHG-09b is archived/applied** (política de ejecución de FIXORA). Sin `/opsx:sync`. Esto no es un requisito funcional.

## Goals / Non-Goals

**Goals:** detalle administrativo de solo lectura con lista positiva; navegación real desde panel y directorio; historial de estados persistido; acceso protegido, dinámico y sin caché compartida; estructura que los changes siguientes puedan extender sin reescribir.

**Non-Goals:** transiciones, cancelación y E11 (CHG-10); diagnóstico y costo (CHG-11); notas (CHG-12); corrección de datos (CHG-13); controles deshabilitados o marcadores de esas funciones; crear o eliminar órdenes; cambios de persistencia.

## Decisions

### D1. Ruta e identidad
Ruta de TD §6 y DESIGN: **`/admin/ordenes/[id]`**, dinámica, donde `id` es el **UUID interno** de la orden, nunca el código de seguimiento (secreto *bearer* público que no debe ir en URLs administrativas). El UUID es un identificador técnico: no se presenta como dato de negocio, no se registra salvo evento técnico aprobado y seguro, y conocerlo no otorga acceso. El parámetro se **valida en la frontera** (formato UUID) antes de tocar la BD; un valor mal formado no llega al repositorio y se resuelve como orden no encontrada.

### D2. Flujo
```text
panel (recientes) / fila del directorio
  → /admin/ordenes/[id]
  → requireAdmin()  →  AdminContext
  → getAdminOrderDetail (caso de uso)
  → repositorio administrativo
        ├─ proyección base de la orden
        └─ eventos de estado persistidos
  → AdminOrderDetailDTO
  → UI de detalle de solo lectura (Server Components)
```
Sin sesión: manejo de CHG-08 (redirección a `/admin/acceso`) sin cargar nada. Con sesión válida y orden inexistente: comportamiento de no encontrado administrativo. Nunca se revela un dato de orden antes de autorizar. No hay REST ni acción para esta lectura.

### D3. `AdminOrderDetailDTO` (lista positiva)
Construido propiedad por propiedad a partir de TD §17, **solo con lo que CHG-09b presenta**:
```text
AdminOrderDetailDTO {
  id, trackingCode, status, createdAt,
  customer { name, phone, email | null },
  device { type, brand, model | null },
  problemDescription,
  statusHistory [ { fromStatus | null, toStatus, occurredAt } ]
}
```
Fechas ISO 8601 UTC; estados como enum técnico (etiquetas en español en la UI). **Excluidos por defecto**, aunque CHG-02 los tenga físicamente: `diagnosis`, `estimated_cost`, notas públicas e internas, historiales de diagnóstico y de costo, `version`, `updatedAt` y `capabilities`. `version` y `capabilities` los añadirá CHG-10 cuando existan mutaciones; no se precargan «por si acaso». No se devuelve la `RepairOrder` completa ni tipos de Prisma. `AdminOrderDetailDTO` vive en el módulo administrativo, distinto y no asignable al `PublicOrderView`; el caso de uso público no importa mapeadores administrativos (regla ESLint de TD §17). Cualquier dato `INTERNAL` futuro pertenece solo a proyecciones administrativas; nunca se extiende el DTO público por reutilización.

### D4. Repositorio
Operación específica de lectura (`getAdminOrderDetailById` o equivalente) en `infrastructure`, sin `GenericRepository` ni tipos Prisma hacia arriba, que selecciona solo las columnas anteriores y consulta los eventos de estado de esa orden. Número de consultas acotado y legible (la principal más la de eventos) sin N+1; no se congela un número. Orden de eventos: `occurred_at DESC` con desempate determinista (`id DESC`) del lado del repositorio; existe `UNIQUE(order_id, to_status)` (CHG-02), así que no hay duplicados por estado. Índice `(order_id, occurred_at DESC)` de CHG-02. El caso de uso exige el `AdminContext` en su firma, que no sustituye a `requireAdmin()` (lo ejecuta primero el adaptador de página).

### D5. Historial de estados (solo lectura)
CHG-09b **lee y presenta** los eventos persistidos; CHG-10 **crea y evoluciona** nuevos eventos mediante la máquina de estados. Una orden de CHG-05 solo tiene `NULL → SOLICITUD_RECIBIDA` y su fecha: eso se muestra como «Solicitud recibida» con su fecha (el `NULL` es interno y no se presenta). Sin autor, razón, IP, sesión ni metadatos (V1 no los conserva). Presentación de DESIGN §8.2 para el tipo «Estado» (`{anterior} → {nuevo}`) con borde discontinuo y rótulo «Solo taller». El historial compuesto con diagnóstico y costo lo extenderá CHG-11 (`AdminHistoryEvent` como unión discriminada; CHG-09b solo emite la variante de estado). Fechas: UTC en BD; interfaz `America/Lima`, formato `DD/MM/AAAA HH:mm`, nunca la zona del navegador.

### D6. Interfaz de solo lectura y composición incremental
Estructura de DESIGN ADM-04 de arriba abajo, **solo lo que existe**: cabecera (código en Geist Mono, badge de estado con texto, fecha de registro) → **Repair Journey** → bloques **Público** e **Interno**.

**Repair Journey (propiedad).** DESIGN define un único componente de Repair Journey compartido por PUB-05 y ADM-04. *CHG-06* introduce la presentación de lectura del Journey; *CHG-09b* **reutiliza ese mismo componente/primitiva** en ADM-04 (no hay una segunda implementación administrativa); *CHG-10* es dueño de la máquina de estados, las transiciones, la cancelación, E11, la creación de nuevos eventos y la evolución efectiva del Journey. El componente (`RepairJourney`) recibe el estado actual y los eventos/fechas disponibles y **solo produce presentación**: no acepta ni rechaza transiciones, no calcula reglas del ciclo de vida, no conoce E11 y no muta la orden. Una orden con solo `SOLICITUD_RECIBIDA` + `occurredAt` se muestra correctamente sin inventar etapas ni fechas futuras: aparecen cuando CHG-10 crea los eventos. Si el componente de CHG-06 necesita un refactor técnico para ser primitiva compartida, es HOW y no cambia la propiedad funcional; no se añade una dependencia formal nueva al backlog (la Ola 2 se ejecuta antes que la Ola 3). Las acciones de transición, cuando existan, irán **fuera** del Journey (DESIGN §7.6): CHG-09b no agrega «Avanzar», «Cancelar», etapas clicables ni selectores de estado.

**Tres elementos distintos, no duplicados.** El *badge* da identificación inmediata del estado actual; el *Journey* muestra la posición visual en el ciclo; el *historial administrativo* es el registro cronológico de eventos persistidos. ADM-04 puede mostrar los tres.

**Bloques Público e Interno desde CHG-09b.** La separación visual se mantiene con las cinco señales de DESIGN §9 (etiqueta textual, icono, encabezado, tipo de borde y posición; no solo color): Público primero (izquierda en escritorio, arriba en móvil) e Interno después (derecha / abajo).
- *Público* (CHG-09b): tipo de equipo, marca, modelo si existe y descripción del problema.
- *Interno* (CHG-09b): nombre, teléfono, correo si existe e historial administrativo de estados persistido.
- **Sin contenedores vacíos ni marcadores:** no se renderizan subsecciones para diagnóstico, costo ni notas, ni textos como «próximamente», ni campos deshabilitados falsos. «Público» expresa clasificación funcional, no que algo esté publicado: CHG-09b no introduce publicación de diagnóstico, costo ni notas.
- Composición futura: CHG-11 añade a Público diagnóstico y costo y a Interno sus historiales; CHG-12 añade notas públicas (Público) e internas (Interno); CHG-10 añade controles de ciclo de vida y nuevos eventos; CHG-13 añade «Editar datos» y «Guardar/Cancelar edición». Cada change inserta su contenido cuando existe.

Reglas de presentación comunes: ausencias de correo o modelo con un texto comprensible (nunca `null`, `undefined` ni valor ficticio); texto largo con ajuste de línea sin desbordamiento horizontal y código sin partir (DESIGN §6.9); bloques apilados en móvil y lado a lado en escritorio, sin breakpoints nuevos; todo contenido del cliente como texto (escape de React).

### D7. Navegación
Habilitada aquí, según DESIGN §6.7: en el directorio **la fila completa clicable más «Ver detalle»** y en las cinco recientes del panel un enlace a la orden. Se implementa con enlaces reales (`<a>`/`Link`) con foco visible y operables por teclado, no con `div onClick`; el objetivo clicable de la fila no anida controles interactivos de forma inaccesible. Regreso: un enlace explícito «volver al listado» (DESIGN: salida de ADM-04 a ADM-03), sin depender del botón Back; puede conservar el filtro `estado` si estaba en la URL y el patrón implementado lo permite de forma segura, con la semántica ya aprobada en CHG-09a. La búsqueda y la página **no** se guardan en la URL ni en almacenamiento para restaurarlas (coherente con CHG-09a: al volver pueden perderse). Sin placeholders ni detalle en línea en el panel. Esto cierra la propiedad por etapas registrada en CHG-09a.

### D8. Renderizado, caché y errores
Dinámico, ligado a la sesión, sin `use cache`, ISR ni caché compartida, y con `noindex` bajo `/admin/**`. Server Components por defecto; Client Components solo si surge interacción (hoy no).

**Orden de comprobaciones:** `request → requireAdmin() → validar/consultar el id → detalle o «orden no encontrada»`. Sin sesión válida se aplica CHG-08 primero y **nunca** se muestra «Orden no encontrada» (sería una señal antes de autorizar).

**No encontrado administrativo contextual.** Con sesión válida: un UUID mal formado (puede cortocircuitar antes de PostgreSQL, sin consulta innecesaria) o un UUID válido que no corresponde a una orden (tras la búsqueda en el repositorio) producen **el mismo estado visual** dentro del shell administrativo, con el patrón de estado vacío de DESIGN (icono `search_off`, sin «Reintentar»). Copy conceptual (editorial, ajustable): título «Orden no encontrada», texto «La orden que intentas consultar no existe o ya no está disponible.», acción «Volver al listado» (a ADM-03). No se envía al administrador a la landing pública ni al «Volver al inicio» como experiencia principal, y no se muestra el UUID, la consulta, errores de Prisma/SQL ni el motivo interno; malformado e inexistente no se distinguen.

**404 global frente a no encontrado de ADM-04.** Una ruta técnica desconocida (`/ruta-que-no-existe`) sigue en el 404 global aprobado (DESIGN A.4, sin cambios). `/admin/ordenes/<id-inexistente>` es otro contexto de UX aunque ambos puedan usar semántica HTTP 404 técnica. Mecanismo (`notFound()`, un `not-found` de `/admin`, o un estado explícito del caso de uso o de la página) no se congela: debe cumplir el comportamiento y conservar el shell administrativo; se clasifica **PRE-IMPLEMENTATION AV-1 / IMPLEMENTATION DETAIL**.

**Fallo inesperado:** error con la base de CHG-01, sin `message`, SQL, Prisma ni pila. Se distinguen sesión inválida, orden inexistente y fallo inesperado sin revelar datos.

### D9. Privacidad y logs
Nombre, teléfono, correo, código, descripción y eventos permanecen dentro del área protegida: sin caché compartida, sin DTO público, sin logs (logger de CHG-01 con lista positiva; el UUID solo en un evento técnico aprobado). El nombre/teléfono/correo no aparecen en `PublicOrderView` (regresión de `SC-11`).

## Traspasos futuros

- **CHG-10:** controles de transición, cancelación, E11, validación de transiciones y nuevos eventos de estado; añade `version` y `capabilities` al DTO.
- **CHG-11:** diagnóstico, costo, reglas de edición, publicación, congelación y sus historiales.
- **CHG-12:** notas públicas e internas, visibilidad y CRUD.
- **CHG-13:** «Editar datos», modo de corrección, validación, recálculo de `customer_name_search` y solo lectura en estados finales.
CHG-09b deja los datos base de solo lectura y la estructura preparada, sin implementar ninguna.

## Risks / Trade-offs

- El componente de recorrido de etapas es de CHG-06 (dependencia blanda no listada en el backlog): si CHG-06 aún no está implementado, CHG-09b lo reutilizaría tras él o presentaría solo el estado; se reporta como decisión de revisión.
- DESIGN §9 coloca diagnóstico, costo y notas en los bloques; al no existir aún, el bloque Público muestra solo equipo y descripción.
- Un DTO administrativo más rico exige disciplina para no cruzar a lo público: tipos y módulos separados, regla ESLint y regresión de `SC-11`.

## Open Questions

| ID | Pregunta | Clasificación |
|---|---|---|
| OQ-1 | Repair Journey en ADM-04, no encontrado administrativo contextual y composición incremental Público/Interno | **RESUELTAS** (Journey compartido con CHG-06; `Orden no encontrada` dentro del shell con retorno al listado; bloques sin contenedores vacíos) |
| OQ-2 | Ruta dinámica, mecanismo concreto de no encontrado, conservación del shell administrativo, navegación y restauración del foco, Cache Components | PRE-IMPLEMENTATION AV-1 |
| OQ-3 | Solo una contradicción real de consulta o privilegios (UUID, estado, historial, grants) | PRE-IMPLEMENTATION AV-2 (cubierto por CHG-02) |
| OQ-4 | Copy final del no encontrado administrativo, texto de ausencia, apilado móvil, composición exacta de consultas | IMPLEMENTATION DETAIL |
| OQ-5 | Mutaciones → CHG-10; diagnóstico/costo → CHG-11; notas → CHG-12; correcciones → CHG-13 | DEFERRED |

Ninguna pregunta es BLOCKING.

## Pruebas planificadas

**Unitarias:** mapeo a DTO, mapeo de estado y fechas (UTC → `America/Lima`), validación del identificador de ruta, ayudas de presentación (ausencias) y mapeo del historial. Sin duplicar pruebas de la máquina de estados de CHG-10.

**Integración (PostgreSQL real, sin mocks de Prisma):** detalle de una orden existente; orden inexistente e identificador mal formado; todos los campos administrativos permitidos; correo y modelo nulos; estado actual; historial inicial y varios eventos con orden determinista; autorización requerida; **sin sobrecarga** de diagnóstico, costo, notas ni historiales (la consulta no los selecciona); separación del DTO público.

**Regresiones:** `SC-12` (acceso directo sin sesión y sesión inválida no entregan datos) y `SC-11` (una orden con datos personales visibles en administración sigue sin exponerlos en la consulta pública).

**Playwright (`chromium-desktop`/`chromium-mobile`):** inicio de sesión; abrir una orden reciente y volver; abrir una fila del directorio con ratón y teclado; datos y historial visibles; orden inexistente; URL directa sin sesión bloqueada; sin desbordamiento horizontal. No se ejecutan transiciones, diagnóstico, notas ni edición.

**Contribución a `E2E-01`:** «iniciar sesión → localizar → abrir el detalle»; no cierra E2E-01 (lo cierra CHG-11). Evidencia: `SC-03`, presentación de `SC-10` para estados y regresiones de `SC-11`/`SC-12`; `TRACEABILITY.md` se actualiza al implementar.
