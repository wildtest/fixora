# Tasks

> Planificación únicamente. Nada de esto se ejecuta hasta que el change esté revisado, aprobado y el usuario autorice `/opsx:apply` en la Fase 7, **con CHG-10 y CHG-11 implementados, verificados y archivados** y AV-2 (bloqueo de fila) aprobado. No se agregan dependencias. No hay historial de notas, autor, «editada», cambio de visibilidad, papelera, confirmación al eliminar, corrección de datos ni REST.
>
> **Dependencia de Spec-base:** CHG-12 pudo materializarse con CHG-10 y CHG-11 activos (patrón validado de *Modified Capability + ADDED Requirements*). **Deben archivarse antes que CHG-12.** Sin `/opsx:sync` anticipado.

## 1. Preflight y dependencias

- [ ] 1.1 Confirmar el DoR (CHG-10 y CHG-11 archivados, de modo que existen las main specs `repair-lifecycle`, `diagnosis-and-estimate`, `public-order-tracking` y `admin-order-management`; AV-2 aprobado con el bloqueo de fila; decisión `NOTE_IDENTICAL_EDIT` cerrada: no-op); se verifica con una nota de aprobación y `openspec list --specs`.
- [ ] 1.2 Auditar CHG-02 contra esta Spec (`order_notes` con `version`, `CHECK(version >= 1)`, `visibility`, FK `RESTRICT`, eliminación física, índice `(order_id, visibility, created_at DESC)` y privilegios `SELECT`/`INSERT`/`UPDATE`/`DELETE` del rol runtime); se verifica con la nota de auditoría, reportando cualquier discrepancia sin modificar CHG-02.

## 2. Dominio y validación

- [ ] 2.1 Implementar la validación pura del contenido (`trim`, vacío → `REQUIRED`, `U+0000`, máximo de 2000 caracteres de texto → `TOO_LONG`, texto sin interpretar), el enum de visibilidad y la regla de visibilidad inmutable; se verifica con pruebas unitarias (2000 válido, 2001 rechazado, vacío, Unicode con la primitiva común).
- [ ] 2.2 Confirmar `canManageNotes` en los ocho estados (verdadero en los seis no finales) sin aplicar el congelamiento de diagnóstico y costo; se verifica con pruebas unitarias.

## 3. Lecturas y DTO

- [ ] 3.1 Implementar la proyección pública `visibility = PUBLIC` con `{ content, createdAt }`, orden `created_at DESC, id DESC`, sin cargar notas internas ni exponer ids, versiones o visibilidad; se verifica con la prueba de integración con valor centinela en una nota interna y la comprobación de que no está en `PublicOrderView` ni en su serialización.
- [ ] 3.2 Extender `AdminOrderDetail` con `publicNotes[]`, `internalNotes[]` (`id`, `version`, `content`, `createdAt`) y `canManageNotes` como indicación; se verifica con pruebas de integración y de que no hay autor, `updatedAt` mostrado ni eventos de nota en el historial.

## 4. Operaciones de nota

- [ ] 4.1 Implementar `createNote` (Server Action con `requireAdmin()`, `AdminContext`, parseo explícito, transacción con bloqueo de la fila de la orden, comprobación de terminalidad, inserción con `version = 1`); se verifica con pruebas de integración (pública e interna, `repair_orders.version` sin cambio, `ORDER_CLOSED`).
- [ ] 4.2 Implementar `editNote` (`expectedNoteVersion`, nota buscada dentro de la orden, `NOTE_NOT_FOUND` incluido el `noteId` de otra orden, `STALE_NOTE`, `UPDATE` condicional con `version + 1`, sin cambiar visibilidad ni orden) con la precedencia `STALE_NOTE` antes de normalizar y el no-op de la edición idéntica (sin `UPDATE`, sin versión ni `updated_at`); se verifica con pruebas de integración (dos ediciones simultáneas, versión de la orden sin cambio, sin historial, reflejo público, editar el mismo texto, editar con espacios exteriores y versión obsoleta con texto coincidente → `STALE_NOTE`).
- [ ] 4.3 Implementar `deleteNote` (borrado físico con `expectedNoteVersion`, sin `E11`, sin historial); se verifica con pruebas de integración (repetición → `NOTE_NOT_FOUND`, versión antigua → `STALE_NOTE` sin borrar, la nota pública desaparece de la consulta).
- [ ] 4.4 Implementar el bloqueo de fila parametrizado en `infrastructure/` (sin `$queryRawUnsafe`, sin tocar `updated_at`), con orden de adquisición consistente (orden y luego nota); se verifica con pruebas de integración de las **carreras reales nota contra `CANCELADO` y nota contra `ENTREGADO`** (nota primero y cierre primero) y la revisión de que no hay nota escrita tras el cierre.

## 5. ADM-04 y PUB-05

- [ ] 5.1 Implementar los compositores público («Lo verá el cliente», «Publicar nota») e interno («Solo la verá el taller», «Guardar nota interna»), sin selector de visibilidad, y los Note items con texto e icono de visibilidad, fecha en `America/Lima`, Editar y Eliminar sin diálogo, estado pendiente y feedback de `STALE_NOTE`, `NOTE_NOT_FOUND`, `ORDER_CLOSED`, validación y sesión expirada; se verifica con Playwright en móvil y escritorio y la revisión contra DESIGN §10 y Apéndice A.5.
- [ ] 5.2 Implementar el modo de solo lectura en `ENTREGADO` y `CANCELADO` («Solo lectura», sin compositores, Editar ni Eliminar); se verifica con Playwright.
- [ ] 5.3 Implementar la sección de notas públicas en PUB-05 (más reciente primero, separada del diagnóstico y costo, con el vacío informativo); se verifica con Playwright.

## 6. Cancelación (`E14`)

- [ ] 6.1 Añadir al diálogo `E11` #3 la frase «Si quieres dejar una explicación pública o interna, regístrala antes de confirmar» (copy de DESIGN §12), manteniendo la nota opcional y la cancelación posible sin nota; se verifica con Playwright (la frase aparece, cancelar sin nota funciona, la nota creada antes queda visible y de solo lectura, una nota tras cancelar devuelve `ORDER_CLOSED`).

## 7. Pruebas y trazabilidad

- [ ] 7.1 Completar las pruebas de integración (privacidad pública, `SC-12` sin sesión, una nota no invalida una confirmación `E11` abierta) y Playwright (nota pública, nota interna, editar, eliminar, orden final, cancelación); se verifica con las ejecuciones en verde.
- [ ] 7.2 Actualizar `TRACEABILITY.md` con `E12`, `E14`, la evidencia de `SC-09` para notas (los datos básicos los completa CHG-13), `SC-11` y la regresión de `SC-12`; se verifica con `npm run test:trace`.

## 8. Verificación final

- [ ] 8.1 Ejecutar `npm run lint`, `typecheck`, `test:unit`, `test:integration`, `test:e2e` y `build`; se verifica con las ejecuciones en verde.
- [ ] 8.2 Revisar el alcance del diff: sin historial de notas, autor, «editada», cambio de visibilidad, papelera, confirmación al eliminar, `SERIALIZABLE`, `updated_at` como bloqueo ni cambios de persistencia; se verifica con `git diff` y `openspec validate order-notes --strict`.

## Workflow follow-up

- Revisar y aprobar el change; el usuario autoriza `/opsx:apply` en la Fase 7 con el DoR cumplido.
- Archivar **después de CHG-10 y CHG-11**: crea la main spec `order-notes` y añade requisitos a `public-order-tracking` y `admin-order-management`.
- CHG-13 completa `SC-09` para los datos básicos; ninguno rediseña las notas.
