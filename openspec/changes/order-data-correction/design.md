# Design

## Context

CHG-13 entrega la corrección de datos básicos de ADM-04. Sigue `TECHNICAL-DESIGN.md` §7, §14, §17, §18 y §19, `DESIGN.md` ADM-04 y §6.17 y ADR-006 sin reabrirlos. Consume: `ActionResult`/logger (CHG-01); la columna física `customer_name_search` (CHG-02); los validadores puros y la primitiva `normalizeCustomerNameSearch` (CHG-05); la búsqueda que lee esa columna (CHG-09a); el detalle con sus bloques Público/Interno y su patrón de solo lectura por defecto (CHG-09b); `isTerminal`, el mecanismo de `expectedVersion` y la actualización condicional (CHG-10); `requireAdmin()`/`AdminContext` (CHG-08). Solo planificación.

**Dependencia de Spec-base.** CHG-13 may be materialized while CHG-10, CHG-11 and CHG-12 (and their predecessors) remain active, using the OpenSpec 1.15.0 pattern validated for Modified Capability + ADDED Requirements. En la Fase 7 deben estar implementados, verificados y archivados antes de aplicar o archivar CHG-13. Sin `/opsx:sync`.

## Goals / Non-Goals

**Goals:** corregir siete campos con un único guardado atómico; las mismas validaciones que el registro mediante las mismas primitivas; concurrencia por versión; no-op observable; búsqueda por nombre sincronizada; código inmutable; sin historial; estados finales de solo lectura.

**Non-Goals:** editar código, estado, diagnóstico, costo o notas; historial o auditoría de correcciones; entidad de cliente/CRM; crear o eliminar órdenes; idempotency key administrativa; REST; Security Pass (CHG-14) y release (CHG-15); AV adicional.

## Decisions

### D1. Lista de campos (allowlist)
Corregibles: `customerName`, `customerPhone`, `customerEmail` (opcional), `deviceType`, `brand`, `model` (opcional), `problemDescription`. Nada más. **No corregibles:** `trackingCode`, `id`, `status`, `diagnosis`, `estimatedCost`, notas, `createdAt`, historiales, `version` (solo técnico, nunca un campo de usuario) ni estado de publicación. El comando no incluye `trackingCode` ni ningún otro campo fuera de la lista.

### D2. Validadores compartidos
No se crean validadores administrativos. La corrección **importa los mismos validadores puros y la misma normalización de CHG-05** (módulo puro de `domain`, sin Prisma ni React): nombre obligatorio 1–100; teléfono con dígitos, espacios, `-`, `(`, `)` y un único `+` inicial, 7–15 dígitos, conservando la forma tras el `trim` exterior; correo opcional ≤254 con sintaxis razonable, vacío → `NULL`, sin pasar a minúsculas; `DeviceType` de seis valores; marca 1–60; modelo opcional ≤60, vacío → `NULL`; descripción 1–2000; `U+0000` rechazado; límites en **caracteres de texto**, no bytes, con el mecanismo de conteo común. Sin campos nuevos (IMEI, serie, PIN, accesorios, fotos, facturación). Un cambio en una regla común se hereda en ambos flujos; una prueba lo demuestra comparando el registro y la corrección contra el mismo módulo. Los mensajes exactos viven en DESIGN/implementación.

### D3. Comando y Server Action
Una sola operación (`saveBasicOrderData` o equivalente): `orderId`, `expectedVersion` y los siete campos. Server Action adaptadora con parseo explícito de `FormData` por allowlist (nunca `Object.fromEntries` con *spread* hacia persistencia; campos desconocidos como `trackingCode`, `status`, `diagnosis`, `estimatedCost`, `version` se ignoran y jamás se escriben). No se separa en operaciones por cliente/equipo/problema: la UX es una corrección conjunta. `requireAdmin()` antes de cualquier operación y después `AdminContext`; sin REST. Resultados tipados: `SESSION_EXPIRED`, `VALIDATION_FAILED` (con errores por campo), `STALE_ORDER`, `ORDER_CLOSED`, `INTERNAL_ERROR` (y éxito). Sin código nuevo.

### D4. Precedencia
```text
requireAdmin → parseo técnico → cargar la orden → ¿existe?
→ ¿current.version = expectedVersion?  NO → STALE_ORDER
→ ¿terminal (canEditBasicData falso)?  SÍ → ORDER_CLOSED
→ validar y normalizar los siete campos  (inválido → VALIDATION_FAILED)
→ ¿todos iguales a los vigentes?  SÍ → éxito sin cambio
→ derivar customer_name_search si cambió el nombre
→ UPDATE condicional (WHERE id AND version = expectedVersion; version = version + 1)
   0 filas → STALE_ORDER
→ refresh()
```
La comprobación temprana de versión protege la instantánea revisada (misma clarificación operacional de CHG-10 sobre TD §14.4). La terminalidad se evalúa con la orden vigente; una orden terminal nunca se muta. Con versión desactualizada y orden ya terminal, gana `STALE_ORDER` (la vista era obsoleta); con la versión vigente y orden terminal, `ORDER_CLOSED`. La validación va después de la terminalidad para no reportar errores de campo sobre una orden que no admite cambios. `ORDER_CLOSED` se reutiliza (no hay `BASIC_DATA_FROZEN`: estos datos no tienen estados intermedios congelados).

### D5. Concurrencia
Dos barreras, como en CHG-10: la comparación tras la carga y `UPDATE repair_orders SET …, version = version + 1 WHERE id = $id AND version = $expectedVersion`; 0 filas → `STALE_ORDER`, sin fusión, *last-write-wins* ni reintento. `READ COMMITTED`. La OCC protege múltiples pestañas, corrección contra transición, contra diagnóstico/costo y dos correcciones. Sin idempotency key administrativa: la primera barrera de UX es el control deshabilitado mientras se guarda; la integridad la da la versión. Las correcciones **no** usan el bloqueo de fila de CHG-12: no hay carrera de cierre que exija serialización más allá de la versión (la transición a final incrementa la versión y la corrección con la versión antigua se rechaza).

### D6. Cambio efectivo y no-op
Se comparan los valores **ya normalizados** con los persistidos, campo a campo (nunca el `FormData` crudo). Si todos coinciden: éxito sin `UPDATE`, sin `version + 1`, sin tocar `updated_at`, sin historial y sin recalcular. No existe no-op parcial: si cambia un campo se guarda la instantánea completa y `version + 1` una sola vez. Un cambio solo de mayúsculas del nombre (`José Muñoz` → `JOSE MUÑOZ`) es efectivo porque `customer_name` es un dato de negocio/visualización; `customer_name_search` **no decide** si hubo no-op (puede quedar con el mismo valor derivado). Un no-op no invalida `E11`. Un no-op no oculta una versión obsoleta: `STALE_ORDER` precede al no-op (misma filosofía conservadora que CHG-12).

### D7. `customer_name_search`
Propiedad escalonada, cerrada aquí: CHG-02 columna física · CHG-05 escritura inicial con la primitiva pura · CHG-09a búsqueda · **CHG-13 recálculo**. Si el nombre normalizado cambia, el `UPDATE` incluye `customer_name` y `customer_name_search` calculada con **la misma primitiva** `normalizeCustomerNameSearch` (trim, descomposición Unicode, minúsculas, sin diacríticos, colapso de espacios, `ñ → n`), en **la misma sentencia/mutación atómica**; jamás un `UPDATE` del nombre seguido de otro de la columna. Si el nombre no cambia no se reescribe la columna. La columna es un dato personal derivado interno: no entra en ningún DTO ni se muestra.

### D8. Persistencia
Una única actualización condicional de `repair_orders` con los campos cambiados (o la instantánea completa) más `customer_name_search` cuando corresponde y `version + 1`. Sin transacción adicional si una sola sentencia satisface la atomicidad (salvo que la validación de Prisma/AV obligue a otra forma). Sin fila en ninguna tabla de historial ni nota. `updated_at` puede cambiar técnicamente en una corrección efectiva; no se usa para recientes, línea de tiempo ni historial. `created_at` y `tracking_code` no se escriben jamás. El repositorio expone una operación de escritura con lista cerrada de columnas (no un objeto libre).

### D9. Interfaz de ADM-04
Modo normal: paneles de información de solo lectura (patrón de solo lectura por defecto de CHG-09b; esta Spec es la mutación autorizada). «Editar datos» (acción textual/secundaria) visible solo si `canEditBasicData` (indicación de UI; el servidor recalcula). Al activarla: edición **en el mismo ADM-04**, sin página, modal, *drawer* ni asistente. Bloque Público: tipo de equipo (Device Type Selector), marca, modelo y descripción; bloque Interno: nombre, teléfono y correo; cada bloque conserva su lugar y la separación no se mezcla. «Guardar cambios» (primaria) y «Cancelar edición» (secundaria), sin confirmación ni `E11`. «Cancelar edición» descarta el estado local, no llama a ninguna mutación, no cambia versión ni búsqueda. Pendiente: control deshabilitado y feedback. Errores: por campo y asociados al control, no solo por color, conservando lo escrito (`VALIDATION_FAILED`). `STALE_ORDER` (DESIGN §13.5, «la orden cambió desde que abriste esta pantalla», «Actualizar orden»): sin fusión de lo editado. `ORDER_CLOSED`: «Esta orden ya no admite cambios», «Actualizar orden». Responsive: móvil en una columna con acciones apiladas (principal arriba), escritorio dividido; objetivos de 44 px; etiquetas visibles; foco visible; sin *horizontal scroll*. En estados finales: paneles de solo lectura, sin «Editar datos», sin campos editables.

### D10. Reflejo público y administrativo
Tras la corrección, `refresh()` renderiza el detalle con los valores vigentes. Las lecturas administrativas (listado, panel) y la consulta pública leen los valores persistidos: no se modifica `public-order-tracking` (el comportamiento ya pertenece a su proyección). El orden de recientes sigue siendo por `created_at`. No se añade evento al historial administrativo ni a la línea de tiempo pública. `AdminOrderDetail` no se reutiliza en lo público; nombre, teléfono y correo siguen fuera de `PublicOrderView` (`SC-11`).

### D11. Seguridad y logs
`requireAdmin()` en cada guardado (`SC-12`); el servidor recalcula la versión, la terminalidad y toda la validación sin confiar en booleanos del cliente; consultas parametrizadas; texto siempre como texto. Logger de CHG-01 con lista positiva: nunca nombres, teléfonos, correos ni cuerpos de acciones.

## Traspasos

- **`customer_name_search`:** CHG-13 cierra el traspaso (recálculo) — **HANDOFF SATISFIED**, pendiente de la auditoría final de la Fase 6.5.
- **`SC-09`:** CHG-10 terminalidad · CHG-11 diagnóstico y costo · CHG-12 notas · CHG-13 datos básicos → completamente **especificado** (no ejecutado).
- **M4:** CHG-12 + CHG-13 completan el alcance funcional del PRD §4 **a nivel de especificación**; no significa implementado, verificado, probado ni desplegado. Se registra como completo solo cuando CHG-13 sea aprobado.
- **CHG-14/CHG-15:** el Security Pass y la evidencia de release quedan fuera de este change.

## Risks / Trade-offs

- **Invalidación conservadora de `E11`:** corregir cualquier dato (p. ej. un teléfono) invalida una confirmación abierta; decisión deliberada de TD §14 (`RIE-06`).
- **Sincronía de la búsqueda (riesgo Medio):** mitigada por una primitiva única y una sola mutación atómica, con prueba de búsqueda.
- **Sin historial de correcciones:** decisión de producto (PRD §4.7); no hay forma de recuperar el valor anterior.
- **Sin merge:** una corrección rechazada obliga a rehacer la edición sobre la versión nueva.

## Reconciliaciones registradas para la Fase 6.5

- **`customer_name_search`:** CHG-02 estructura física · CHG-05 escritura inicial · CHG-09a búsqueda · CHG-13 recálculo — **HANDOFF SATISFIED** (pending final 6.5 coverage audit).
- **Navegación al detalle por etapas:** CHG-09a filas · CHG-09b navegación.
- **TD §14.4:** el diagrama no dibuja la comprobación temprana de versión; CHG-10 (y CHG-13) la hacen explícita.
- **E11 #1:** CHG-10 → CHG-11 — handoff satisfecho.
- **E11 de cancelación / E14:** CHG-10 → CHG-12 — HANDOFF SATISFIED.
- **Extensibilidad de las specs base:** CHG-06 lista positiva extensible y CHG-09b solo lectura por defecto; CHG-13 es una mutación autorizada por requisito explícito — RECONCILED, pending final 6.5 coverage audit.
- **`SC-09` (terminalidad escalonada):** CHG-10 · CHG-11 · CHG-12 · CHG-13 — FUNCTIONAL COVERAGE SATISFIED a nivel de materialización.
- **M4:** CHG-12 + CHG-13 — FUNCTIONAL SPEC COVERAGE SATISFIED, pending 6.5 audit (especificada; no implementada ni verificada).
- **Invalidación de `E11` por correcciones:** CHG-10 regla general · CHG-13 corrección efectiva — satisfecho.

## Open Questions

| ID | Pregunta | Clasificación |
|---|---|---|
| OQ-1 | Ninguna bloqueante | — |
| OQ-2 | Manejo exacto del formulario *dirty*, restauración de foco y conservación de lo escrito tras `VALIDATION_FAILED` | IMPLEMENTATION DETAIL |
| OQ-3 | Forma exacta del `UPDATE` condicional (instantánea completa o solo columnas cambiadas) y del resultado «éxito sin cambio» | IMPLEMENTATION DETAIL |
| OQ-4 | Traspaso de `customer_name_search` (recálculo) | **RESUELTA POR CHG-13** |
| OQ-5 | Parte de datos básicos de `SC-09` y especificación funcional de M4 | **RESUELTA POR CHG-13** |
| OQ-6 | Consistencia entre `customer_name_search`, `E11`/`expectedVersion` y reglas comunes en Fase 6.5 | FASE 6.5 RECONCILIATION |

No se crea AV-4: se consumen los resultados de AV-1/AV-2 existentes.

## Pruebas planificadas

**Unitarias:** nombre (vacío, 100, 101), teléfono (formatos válidos, límites de 7 y 15 dígitos, caracteres inválidos, `+` fuera del inicio), correo (vacío → `NULL`, 254, sintaxis), marca 60, modelo 60, descripción 2000, `U+0000`, tipos de equipo, opcional → `NULL`, comparación de no-op sobre valores normalizados, `canEditBasicData` en los ocho estados, normalización de `customer_name_search` compartida y una prueba de que registro y corrección consumen los mismos módulos (sin repetir la suite completa de CHG-05).

**Integración (PostgreSQL real):**
- Corrección efectiva con varios campos: todos cambian, `version + 1` exactamente, sin filas nuevas de historial, `tracking_code` y `created_at` intactos.
- Un solo campo (`model`): `version + 1`, demás campos idénticos, sin historial.
- No-op: sin `UPDATE`, versión y `updated_at` iguales, sin historial.
- Stale: dos guardados con `expectedVersion = N`; uno `N → N+1`, el otro `STALE_ORDER` sin fusión; también carrera tras la carga (0 filas).
- Terminal: `ENTREGADO` y `CANCELADO` con la versión vigente → `ORDER_CLOSED`, sin cambios; `Esperando aprobación` permite corregir sin tocar diagnóstico ni costo.
- Invalidación de `E11`: confirmación con `expectedVersion = N`, corrección efectiva a `N+1`, confirmación antigua → `STALE_ORDER` sin transición; un no-op no la invalida.
- `customer_name_search`: corregir `José Muñoz` → `María Pérez`: se actualizan ambos atómicamente; `jose munoz` ya no encuentra por ese nombre, `maria perez` sí; cambio cosmético de mayúsculas es efectivo.
- Reflejo público: se ven tipo, marca, modelo y descripción corregidos y siguen ausentes nombre, teléfono y correo (`SC-11`).
- Código inmutable: carga útil manipulada con `trackingCode`/`status`/`diagnosis`/`estimatedCost`/`version` no escribe nada fuera de la lista.
- Sin historial: los conteos de `order_status_history`, `diagnosis_history`, `cost_history` y de notas no cambian.
- `SC-12`: sin sesión → `SESSION_EXPIRED` y ningún `UPDATE`.

**Playwright:** iniciar sesión → buscar → ADM-04 → «Editar datos» → modificar cliente, equipo y problema → «Guardar cambios» → solo lectura con los valores nuevos; «Cancelar edición» sin mutación; errores de obligatorio, teléfono y longitud sin salir de ADM-04; orden terminal sin «Editar datos»; consulta pública muestra el cambio de un campo público y no muestra el nombre; móvil y escritorio.

**Contribución:** soporte de `E3` (administrador); `E9`; `E17`; completa `SC-09` (datos básicos); regresión de `SC-11` y `SC-12`; con CHG-12, **M4** a nivel de especificación. `TRACEABILITY.md` se actualiza al implementar.
