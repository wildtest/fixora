# Design

## Context

CHG-12 entrega las notas públicas e internas. Sigue `TECHNICAL-DESIGN.md` §9, §10, §14, §17 y §18, `DESIGN.md` §9, §10, §11 y §12 y ADR-006 sin reabrirlos. Consume: `ActionResult`/logger (CHG-01); `order_notes` (`id`, `order_id`, `visibility`, `content`, `version`, `created_at`, `updated_at`; FK `RESTRICT`; `CHECK(version >= 1)`; índice `(order_id, visibility, created_at DESC)`; eliminación física) y los privilegios del rol runtime (CHG-02); la proyección pública (CHG-06, CHG-10, CHG-11); `requireAdmin()`/`AdminContext` (CHG-08); el detalle con sus bloques Público/Interno (CHG-09b, CHG-11); y de CHG-10 `isTerminal`/`canManageNotes`, el diálogo de cancelación y el `UPDATE` sobre la misma fila de la orden. Solo planificación.

**Dependencia de Spec-base.** CHG-12 may be materialized while CHG-10 and CHG-11 (and their predecessors) remain active, using the OpenSpec 1.15.0 pattern validated for Modified Capability + ADDED Requirements. En la Fase 7, **CHG-10 y CHG-11 deben estar implementados, verificados y archivados antes de aplicar o archivar CHG-12**. Sin `/opsx:sync`.

## Goals / Non-Goals

**Goals:** notas `PUBLIC`/`INTERNAL` con visibilidad inmutable; crear, editar y eliminar mientras la orden no sea final; control de concurrencia propio de la nota; serialización con el cierre de la orden; proyección pública que nunca carga notas internas; solo lectura en estados finales; cierre del traspaso de `E14`.

**Non-Goals:** corrección de datos básicos (CHG-13); historial de notas, «editada», autor; cambiar la visibilidad; papelera, deshacer o confirmación al eliminar; motivo de cancelación; idempotency key administrativa; `SERIALIZABLE`; REST.

## Decisions

### D1. Dominio de notas
- Visibilidad: enum cerrado `PUBLIC | INTERNAL`; inmutable tras crear (no existe `changeNoteVisibility`; se corrige eliminando y creando otra). `canManageNotes(estado)` (primitiva de dominio de CHG-10): verdadero en los seis estados no finales, falso en `ENTREGADO` y `CANCELADO`; la UI lo usa como indicación y **el servidor lo recalcula** (las reglas de congelamiento de diagnóstico y costo **no** se aplican a las notas).
- Contenido (primitiva pura): `trim` exterior; vacío tras `trim` → `VALIDATION_FAILED` con error de campo `REQUIRED` (a diferencia del diagnóstico, **no** equivale a `NULL`; nunca se almacena una fila vacía); `U+0000` rechazado; **`NOTE_MAX_LENGTH = 2000` caracteres de texto** tras el `trim` para ambas visibilidades (decisión de Spec deliberada: las fuentes no fijan un número y el TD delega las longitudes a las Specs); 2001 → `TOO_LONG`; no se mide en bytes; sin mínimo mayor que 1; texto siempre como texto (React escapa; sin HTML ni Markdown interpretado). El mecanismo de conteo es el de la primitiva común V1 (detalle de implementación).

### D2. Versiones
`order_notes.version` (entero, inicial 1) es un control técnico: no es historial, no se muestra y no es una revisión editorial. Una edición efectiva suma exactamente 1; eliminar borra la fila. **Las operaciones de nota no modifican `repair_orders.version`** (ADR-006): una nota no invalida por sí sola una confirmación `E11` abierta. No se usa `STALE_ORDER` para notas ni `expectedVersion` de la orden; editar y eliminar usan `expectedNoteVersion`.

### D3. Operaciones (Server Actions)
`createNote`, `editNote`, `deleteNote`: cuerpo explícito (campos desconocidos ignorados; sin objeto libre desde `FormData`), `requireAdmin()` antes de abrir la transacción y luego `AdminContext`; sin REST.
- `createNote`: `orderId`, `visibility`, `content`. Sin versión de orden, idempotency key, autor ni confirmación.
- `editNote`: `orderId`, `noteId`, `expectedNoteVersion`, `content`; la visibilidad **no** es editable; no se acepta `expectedVersion` de la orden ni autor.
- `deleteNote`: `orderId`, `noteId`, `expectedNoteVersion`; sin `E11`.
Flujos:
```text
create:  requireAdmin → parseo técnico → BEGIN → bloquear fila de repair_orders
         → ¿existe? → ¿terminal? SÍ → ORDER_CLOSED → validar contenido
         → INSERT order_notes (version = 1) → COMMIT → refresh
edit:    requireAdmin → parseo técnico → BEGIN → bloquear fila de repair_orders
         → ¿terminal? SÍ → ORDER_CLOSED → buscar la nota de ESA orden
         → inexistente → NOTE_NOT_FOUND → versión distinta → STALE_NOTE
         → validar contenido → UPDATE condicional de la nota (version + 1) → COMMIT → refresh
delete:  igual hasta la versión → DELETE físico → COMMIT → refresh
```
La terminalidad se comprueba **siempre dentro de la transacción protegida por el bloqueo**. La validación del contenido puede ir antes o después del bloqueo mientras no cambie la semántica observable; la terminalidad no puede comprobarse fuera. Un `noteId` que no pertenece al `orderId` indicado se trata como `NOTE_NOT_FOUND` (nunca se opera sobre una nota de otra orden por un UUID suministrado). Resultados tipados del conjunto cerrado: `SESSION_EXPIRED`, `VALIDATION_FAILED`, `STALE_NOTE`, `NOTE_NOT_FOUND`, `ORDER_CLOSED` e `INTERNAL_ERROR` (no se usan `STALE_ORDER`, `TRANSITION_NOT_ALLOWED` ni `DIAGNOSIS_AND_COST_FROZEN`). Sin fusión, sobrescritura ni *last-write-wins*; edición y eliminación con versión antigua no borran ni pisan la versión nueva.

### D4. Edición idéntica (resuelto: no-op)
Si la nota existe, la orden sigue abierta, la versión esperada coincide y el contenido normalizado nuevo es igual al persistido, la operación es un **éxito sin cambio efectivo**: no ejecuta `UPDATE order_notes`, no incrementa `order_notes.version`, no modifica `updated_at`, no modifica `repair_orders.version` y no crea historial, evento de auditoría ni marca de «editada». Normalización antes de comparar: `trim` exterior → `U+0000` → longitud → contenido normalizado → comparación con el persistido (`"  Equipo recibido  "` frente a `"Equipo recibido"` es un no-op).

**Precedencia (el no-op no oculta una versión obsoleta):** bloqueo de la fila de la orden → ¿terminal? → buscar la nota de esa orden → ¿versión real = `expectedNoteVersion`? NO → `STALE_NOTE` → normalizar y validar el contenido → ¿mismo contenido? SÍ → no-op con éxito → `UPDATE` efectivo con `version + 1`. Con `expectedNoteVersion = 1` y versión real 2, aunque el texto enviado coincida con el de la versión 2, el resultado es `STALE_NOTE`: una instantánea vieja no se acepta en silencio (misma filosofía conservadora que `STALE_ORDER`). Esta decisión aplica solo a **editar la misma nota**: dos notas creadas con contenido idéntico son dos notas (sin deduplicación, contenido único ni fusión) y eliminar una nota ya eliminada devuelve `NOTE_NOT_FOUND` (sin éxito idempotente).

### D5. Serialización nota contra cierre
Invariante: ninguna nota se crea, edita ni elimina cuando la orden es final. Cada operación de nota, dentro de su transacción, **bloquea la fila de `repair_orders`** con SQL parametrizado controlado en `infrastructure/` (p. ej. `SELECT … FROM repair_orders WHERE id = $1 FOR UPDATE`, interfaz parametrizada o *tagged template*, nunca `$queryRawUnsafe`), verifica que no sea final, opera sobre la nota y confirma. Una transición a `ENTREGADO` o `CANCELADO` (CHG-10) ejecuta su `UPDATE` sobre esa misma fila, de modo que ambas se serializan: **nota primero** → la nota se confirma y el cierre procede después (válido); **cierre primero** → la nota obtiene el bloqueo, observa el estado final y devuelve `ORDER_CLOSED` sin mutación. Prohibido adquirir el bloqueo con una actualización artificial (`UPDATE … SET updated_at = updated_at`) o modificar `updated_at` solo para ello. Aislamiento `READ COMMITTED`; no `SERIALIZABLE`. Las tres operaciones (crear, editar, eliminar) se protegen; no solo editar y eliminar. **Orden de adquisición consistente:** primero la fila de la orden y luego la fila o la operación de la nota, sin jerarquía compleja de bloqueos ni orden inverso en otros caminos (evita *deadlocks*); el detalle exacto se valida en AV-2. Las pruebas cubren ambos cierres (`CANCELADO` y `ENTREGADO`).

### D6. Lecturas
- **Pública:** el repositorio público consulta **explícitamente `visibility = PUBLIC`** con proyección positiva de campos (`content`, `created_at`); nunca carga todas las notas para filtrar las internas después; las internas no entran en la memoria del caso de uso público. `publicNotes[] { content, createdAt }` sin id, versión, visibilidad, `updated_at` ni `order_id`. Orden `created_at DESC, id DESC` (el `id` solo desempata); una edición no reordena. Visibles inmediatamente tras crearse y también en órdenes finales. Una prueba usa una nota interna con un valor centinela único y demuestra que no aparece en `PublicOrderView` ni en su serialización.
- **Administrativa:** `publicNotes[]` e `internalNotes[]` con `{ id, version, content, createdAt }` (la colección expresa la visibilidad; sin autor, sin `updatedAt` mostrado) y `canManageNotes` como indicación. El DTO administrativo no se reutiliza en lo público; los ids de nota nunca llegan al HTML público.

### D7. Interfaz de ADM-04 y PUB-05
- **Público** (bloque Público): compositor con textarea, indicador «Lo verá el cliente» y «Publicar nota» (primaria), sin casilla de visibilidad. **Interno** (bloque Interno): «Solo la verá el taller» y «Guardar nota interna» (secundaria), sin selector genérico. Note items según DESIGN §10.2–§10.3 (contenido como texto, fecha `DD/MM/AAAA HH:mm` en `America/Lima` desde `createdAt`, tipo con texto e icono: `visibility` «Visible al cliente» / `lock` «Solo taller»); **Editar** reutiliza el patrón del compositor sobre el propio ítem, sin selector de visibilidad; **Eliminar** sin diálogo. Sin «editada», versiones ni `updatedAt` visible. Estado pendiente que deshabilita el control (primera barrera ante doble envío; la integridad la dan `expectedNoteVersion` y la transacción), sin mutación optimista y con `refresh()` del servidor. Feedback de DESIGN §13 y Apéndice A.5: `STALE_NOTE` («La nota cambió desde que abriste esta pantalla», «Actualizar notas»), `NOTE_NOT_FOUND`, `ORDER_CLOSED` («La orden ya fue cerrada», «Actualizar orden») y validación por campo conservando lo escrito.
- **Estados finales:** notas en solo lectura con «Solo lectura» y candado (DESIGN §11), sin compositores, Editar ni Eliminar.
- **PUB-05:** lista de notas públicas en su propia sección, distinta del bloque de diagnóstico y costo (`RIE-05`: sin validación semántica entre ambos); vacío informativo (`E6`) sin sección rota.
- Los bloques Público e Interno completan su composición escalonada de CHG-09b/CHG-11 con notas; sin contenedores vacíos si no hay notas más allá del compositor.

### D8. `E14` y diálogo de cancelación
CHG-10 implementó el núcleo del diálogo `E11` #3. CHG-12 añade la frase de DESIGN §12 «Si quieres dejar una explicación pública o interna, regístrala antes de confirmar» ahora que el sistema de notas existe. La nota sigue siendo **opcional**: no hay nota obligatoria, motivo ni explicación requerida, y cancelar sin nota sigue permitido. Cancelar después de crear una nota deja la nota visible y de solo lectura (pública solo si era `PUBLIC`); intentar una nota tras cancelar devuelve `ORDER_CLOSED`. **El traspaso de la Fase 6.5 «CHG-10 núcleo → CHG-12 frase sobre notas» queda satisfecho** (se conserva el registro del refinamiento para el gate 6.5).

### D9. Historial y autoría
Las notas no generan eventos en `AdminHistoryEvent` (sigue compuesto solo por estado, diagnóstico y costo), ni `note_history`, ni autor (`createdBy`/`updatedBy`), ni `updatedAt` mostrado. El `updated_at` técnico de persistencia no sirve para el orden.

### D10. Logs y privacidad
Logger de CHG-01 con lista positiva: nunca contenido de notas, nombres ni cuerpos de acciones. Las notas internas nunca se serializan fuera de las colecciones administrativas.

## Traspasos

- **CHG-13:** corrección de datos básicos con `expectedVersion` e `isTerminal`; las notas siguen sin afectar `repair_orders.version`.
- `SC-09` se completa para notas aquí; los datos básicos lo completan en CHG-13.

## Risks / Trade-offs

- Riesgo de privacidad (`SC-11`): mitigado por proyección positiva con `visibility = PUBLIC`, tipos y módulos separados y la prueba del valor centinela.
- Un bloqueo de fila exige disciplina de orden de adquisición para evitar *deadlocks*; la carrera nota/cierre se valida en AV-2.
- Eliminación física sin deshacer es una decisión de producto (`RIE-04`).

## Reconciliaciones registradas para la Fase 6.5

- **`customer_name_search`:** CHG-02 estructura física · CHG-05 escritura · CHG-09a búsqueda · CHG-13 recálculo.
- **Navegación al detalle por etapas:** CHG-09a filas · CHG-09b navegación.
- **TD §14.4:** el diagrama no dibuja la comprobación temprana de versión; CHG-10 la hace explícita.
- **E11 #1:** CHG-10 exigencia y ligadura a la versión · CHG-11 resumen real — **handoff satisfecho**.
- **E11 de cancelación / E14:** CHG-10 núcleo y semántica irreversible · CHG-12 frase sobre notas y la capacidad real de notas — **HANDOFF SATISFIED** (se conserva el registro del refinamiento).
- **Extensibilidad de las specs base:** CHG-06 *Public repair projection* reescrito como lista positiva extensible por requisitos públicos explícitos; CHG-09b *Read-only baseline detail* reescrito como solo lectura por defecto con mutaciones autorizadas por otros requisitos — **RECONCILED — pending final 6.5 coverage audit**.

## Open Questions

| ID | Pregunta | Clasificación |
|---|---|---|
| OQ-1 | `NOTE_IDENTICAL_EDIT` | **RESUELTA** (opción A: no-op sin cambio efectivo, precedida por `STALE_NOTE`) |
| OQ-2 | Mecanismo real de `SELECT … FOR UPDATE` con Prisma 7, parametrización, transacción interactiva, adquisición y orden de bloqueos, carrera nota/cierre, edición y eliminación condicionales, privilegios | PRE-IMPLEMENTATION AV-2 |
| OQ-3 | Componente de edición en línea, textos de éxito, refresco de la lista, desempate exacto | IMPLEMENTATION DETAIL |
| OQ-4 | Frase de `E11` #3 sobre notas | **RESUELTA POR CHG-12** |
| OQ-5 | Corrección de datos básicos | DEFERRED a CHG-13 |

No se crea AV-4.

## Pruebas planificadas

**Unitarias:** `trim`; vacío rechazado; `U+0000`; 2000 válido y 2001 `TOO_LONG`; enum de visibilidad; regla de visibilidad inmutable; `canManageNotes` en los ocho estados; y el no-op de edición idéntica (A: `v1` `"Hola"` → editar `"Hola"` deja `version = 1`; B: editar `"  Hola  "` es no-op; C: esperada `v1`, real `v2` y texto igual al de `v2` → `STALE_NOTE`).

**Integración (PostgreSQL real, sin mocks de Prisma):**
- *Crear:* nota pública e interna, versión inicial 1, `repair_orders.version` sin cambio, pertenencia a la orden.
- *Editar:* contenido nuevo, `note.version + 1`, `repair_orders.version` sin cambio, sin historial, reflejo público si es `PUBLIC`, el orden no cambia; edición idéntica sin `UPDATE`, sin versión nueva y sin cambio de `updated_at`; versión obsoleta con texto coincidente → `STALE_NOTE`.
- *Eliminar:* borrado físico, repetir → `NOTE_NOT_FOUND`, la nota pública desaparece de la consulta, sin historial.
- *Obsoleta:* dos ediciones con `expectedNoteVersion = 1` → una pasa a 2 y la otra `STALE_NOTE`; eliminar con versión antigua → `STALE_NOTE` sin borrar la nota nueva.
- *Otra orden:* un `noteId` de otra orden → `NOTE_NOT_FOUND`.
- *Orden final:* crear, editar o eliminar → `ORDER_CLOSED` sin cambios.
- *Privacidad:* varias notas públicas e internas, con un valor centinela en una interna: la consulta pública devuelve solo las públicas, sin cargar las internas ni serializar ids o versiones.
- **Carreras reales:** nota contra `CANCELADO` y nota contra `LISTO_PARA_RECOJO → ENTREGADO`, comprobando los dos resultados válidos (nota primero; cierre primero → `ORDER_CLOSED`) y nunca una nota escrita tras el cierre; no se asume que probar `CANCELADO` cubre `ENTREGADO`.
- *Confirmación `E11`:* una nota creada o editada no cambia la versión de la orden ni invalida una confirmación abierta.
- `SC-12`: sin sesión válida no se ejecuta crear, editar ni eliminar.

**Playwright:** nota pública (crear → consulta pública la muestra); nota interna (el administrador la ve y la consulta pública no); editar y eliminar con feedback y sin historial; orden final con notas de solo lectura («Solo lectura», sin compositor, Editar ni Eliminar); diálogo de cancelación con la frase y cancelación sin nota permitida; móvil y escritorio.

**Contribución:** dueño de `E12`; completa `E14` con CHG-10; evidencia escalonada de `SC-09` para notas; `SC-11` fuerte; regresión de `SC-12`. `TRACEABILITY.md` se actualiza al implementar.
