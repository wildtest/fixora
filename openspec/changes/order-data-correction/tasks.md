# Tasks

> Planificación únicamente. Nada de esto se ejecuta hasta que el change esté revisado, aprobado y el usuario autorice `/opsx:apply` en la Fase 7, **con CHG-10, CHG-11 y CHG-12 implementados, verificados y archivados**. No se agregan dependencias. No hay edición del código de seguimiento, del estado, del diagnóstico, del costo ni de las notas por este formulario; no hay historial de correcciones, entidad de cliente, REST ni AV adicional.
>
> **Dependencia de Spec-base:** CHG-13 pudo materializarse con CHG-10, CHG-11 y CHG-12 activos (patrón validado de *Modified Capability + ADDED Requirements*). **Deben archivarse antes que CHG-13.** Sin `/opsx:sync` anticipado.

## 1. Preflight y dependencias

- [ ] 1.1 Confirmar el DoR (CHG-10, CHG-11 y CHG-12 archivados, de modo que existe la main spec `admin-order-management`; validadores y primitiva de búsqueda de CHG-05 disponibles; mecanismo `expectedVersion` de CHG-10 implementado); se verifica con una nota de aprobación y `openspec list --specs`.
- [ ] 1.2 Auditar CHG-02, CHG-05 y CHG-09a contra esta Spec (columna `customer_name_search`, primitiva pura compartida, búsqueda que la lee, privilegio `UPDATE` del rol runtime sobre las columnas corregibles y no sobre `tracking_code` ni `created_at`); se verifica con la nota de auditoría, reportando cualquier discrepancia sin modificar esos changes.

## 2. Validación compartida

- [ ] 2.1 Exponer los validadores y la normalización del registro como módulo puro único consumido por el registro y por la corrección, sin duplicar reglas administrativas; se verifica con pruebas unitarias del módulo (límites, teléfono, correo, `U+0000`, opcionales → `NULL`, tipos de equipo) y una prueba de que ambos flujos importan el mismo módulo.
- [ ] 2.2 Implementar `canEditBasicData` (verdadero en los seis estados no finales, incluido `ESPERANDO_APROBACION`; falso en `ENTREGADO` y `CANCELADO`) como primitiva de dominio; se verifica con pruebas unitarias en los ocho estados.

## 3. Comando y reglas

- [ ] 3.1 Implementar el comando de corrección con la lista cerrada de siete campos más `orderId` y `expectedVersion` y la Server Action con `requireAdmin()`, `AdminContext` y parseo explícito (sin `Object.fromEntries`/*spread*; campos desconocidos ignorados); se verifica con pruebas de integración (carga manipulada con `trackingCode`, `status`, `diagnosis`, `estimatedCost`, `version`; sin sesión → `SESSION_EXPIRED` sin escritura).
- [ ] 3.2 Implementar el caso de uso con la precedencia (existe → versión → terminal → validar → no-op → escribir) y los resultados tipados `VALIDATION_FAILED`, `STALE_ORDER`, `ORDER_CLOSED`; se verifica con pruebas unitarias e integración de cada rama, incluida la precedencia de `STALE_ORDER` sobre `ORDER_CLOSED` y sobre el no-op.

## 4. Versión, OCC y no-op

- [ ] 4.1 Implementar la comparación de valores normalizados (sin `FormData` crudo) y el éxito sin cambio efectivo (sin `UPDATE`, sin versión, sin `updated_at`, sin historial); se verifica con pruebas unitarias e integración (incluidos el cambio solo de mayúsculas del nombre, que es efectivo, y la ausencia de no-op parcial).
- [ ] 4.2 Implementar el `UPDATE` condicional (`WHERE id AND version = expectedVersion`, `version = version + 1` una sola vez) con segunda barrera `STALE_ORDER` sin reintento; se verifica con pruebas de integración (dos guardados con la misma versión, carrera tras la carga, corrección contra transición y contra diagnóstico/costo, invalidación de `E11` y no invalidación por no-op).

## 5. Sincronización de `customer_name_search`

- [ ] 5.1 Recalcular `customer_name_search` con la primitiva compartida y escribirla en la misma sentencia atómica que `customer_name` solo cuando el nombre cambia; se verifica con pruebas de integración (`José Muñoz` → `María Pérez`, búsqueda anterior sin resultado, búsqueda nueva con resultado, sin escritura cuando el nombre no cambia).

## 6. Persistencia

- [ ] 6.1 Implementar la operación del repositorio con lista cerrada de columnas (sin objeto libre; sin `tracking_code`, `id`, `status`, `created_at`, diagnóstico ni costo), sin filas de historial ni notas y con consultas parametrizadas; se verifica con pruebas de integración (conteos de `order_status_history`, `diagnosis_history`, `cost_history` y notas sin cambio; `tracking_code` y `created_at` intactos).

## 7. ADM-04

- [ ] 7.1 Implementar «Editar datos» y la edición en línea (bloque Público: tipo, marca, modelo, descripción; bloque Interno: nombre, teléfono, correo), con «Guardar cambios» y «Cancelar edición» (sin mutación), estado pendiente, errores por campo asociados al control, conservación de lo escrito y feedback de `STALE_ORDER`, `ORDER_CLOSED` y sesión expirada; se verifica con Playwright en móvil y escritorio y la revisión contra DESIGN §6.17, §13 y Apéndice A.5.
- [ ] 7.2 Implementar el modo de solo lectura en `ENTREGADO` y `CANCELADO` (sin «Editar datos» ni campos editables) y mantener el código de seguimiento visible y sin campo editable; se verifica con Playwright.

## 8. Reflejo público y administrativo

- [ ] 8.1 Verificar el reflejo en listado, panel, detalle y consulta pública (valores vigentes; orden de recientes por `created_at`; sin evento en historial ni en línea de tiempo; nombre, teléfono y correo ausentes de `PublicOrderView` y su serialización); se verifica con pruebas de integración y de regresión de `SC-11`, sin tocar `public-order-tracking`.

## 9. Pruebas y trazabilidad

- [ ] 9.1 Completar las pruebas de integración (corrección efectiva múltiple, de un solo campo, no-op, stale, terminal, `Esperando aprobación`, invalidación de `E11`, búsqueda, privacidad, `SC-12`) y Playwright (corregir y ver los valores, cancelar edición, validación, orden terminal, reflejo público); se verifica con las ejecuciones en verde.
- [ ] 9.2 Actualizar `TRACEABILITY.md` con `E3` (administrador), `E9`, `E17`, la evidencia de `SC-09` para datos básicos, `SC-11` y la regresión de `SC-12`; se verifica con `npm run test:trace`.

## 10. Verificación final

- [ ] 10.1 Ejecutar `npm run lint`, `typecheck`, `test:unit`, `test:integration`, `test:e2e` y `build`; se verifica con las ejecuciones en verde.
- [ ] 10.2 Revisar el alcance del diff: sin edición del código de seguimiento, historial de correcciones, entidad de cliente, validadores duplicados, `Object.fromEntries`/*spread* hacia persistencia ni cambios en `public-order-tracking`; se verifica con `git diff` y `openspec validate order-data-correction --strict`.

## Workflow follow-up

- Revisar y aprobar el change; el usuario autoriza `/opsx:apply` en la Fase 7 con el DoR cumplido.
- Archivar **después de CHG-10, CHG-11 y CHG-12**: añade requisitos a `admin-order-management`.
- CHG-14 (Security Pass) y CHG-15 (release) quedan fuera de este change.
