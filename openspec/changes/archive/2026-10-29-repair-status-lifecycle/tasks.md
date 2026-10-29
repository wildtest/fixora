# Tasks

> Planificación únicamente. Nada de esto se ejecuta hasta que el change esté revisado, aprobado y el usuario autorice `/opsx:apply` en la Fase 7, **con CHG-06, CHG-09a y CHG-09b implementados, verificados y archivados**, y AV-1 y AV-2 aprobados. No se agregan dependencias (sin XState). No hay edición de diagnóstico o costo, notas ni corrección de datos, ni motivo de cancelación.
>
> **Dependencia de Spec-base:** CHG-10 pudo materializarse con CHG-06, CHG-09a y CHG-09b activos (patrón validado de *Modified Capability + ADDED Requirements*). **Deben archivarse antes que CHG-10.** Sin `/opsx:sync` anticipado.

## 1. Preflight y dependencias

- [x] 1.1 Confirmar el DoR (CHG-06 y CHG-09b archivados, de modo que existen las main specs `public-order-tracking` y `admin-order-management`; AV-1 y AV-2 aprobados); se verifica con una nota de aprobación y `openspec list --specs`.
- [x] 1.2 Auditar el baseline de CHG-02 contra esta Spec (el `CHECK` de `order_status_history` valida cada fila como evento inicial o uno de los 10 pares y no garantiza encadenamiento ni coincidencia con `repair_orders.status`; historial *append-only*, `version`, privilegios del rol runtime); se verifica con la nota de auditoría, reportando cualquier discrepancia sin modificar CHG-02.

## 2. Dominio

- [x] 2.1 Implementar la tabla declarativa única y las funciones puras (`allowedTransitions`, `isTerminal`, `requiresConfirmation`, verificación de par, cancelación permitida y mapa de etiquetas); se verifica con el barrido exhaustivo de los 64 pares (10 permitidos y 54 rechazados), `requiresConfirmation` exhaustivo y las pruebas de estados finales.
- [x] 2.2 Confirmar que las primitivas de dominio futuras (`canEdit*`, `canManageNotes`, `isDiagnosisAndCostPublic`) no se implementan como features y que no existe una segunda copia de las reglas en UI, acción o repositorio; se verifica con la revisión del diff.

## 3. Aplicación y persistencia

- [x] 3.1 Implementar el caso de uso de transición con la precedencia (sesión → entrada → orden existente → `STALE_ORDER` si `current.version != expectedVersion` → reglas de dominio sobre esa instantánea → `UPDATE` condicional → historial) y los resultados tipados `SESSION_EXPIRED`, `STALE_ORDER`, `TRANSITION_NOT_ALLOWED`, `DIAGNOSIS_AND_COST_REQUIRED` y `CONFIRMATION_REQUIRED`; se verifica con pruebas de integración de cada resultado sin escrituras y de la precedencia (vista desactualizada con destino ya inválido, misma versión con destino no permitido, E11 desactualizada).
- [x] 3.2 Implementar el repositorio específico de transición (actualización condicional por `id` y `version`, incremento único, inserción del evento con el mismo `now`, en una transacción `READ COMMITTED`), sin tipos Prisma hacia arriba; se verifica con pruebas de integración de transición válida (estado, `version + 1`, una fila de historial) y de atomicidad con fallo inyectado.
- [x] 3.3 Implementar la costura de solo lectura del prerrequisito (presencia de diagnóstico y costo, seguro por defecto); se verifica con fixtures (falta uno, faltan ambos, existen ambos) y con la comprobación de que, si no puede evaluarse, se rechaza.
- [x] 3.4 Verificar las dos barreras de concurrencia: dos operaciones con la misma `expectedVersion` (una gana, una recibe `STALE_ORDER`, un solo evento nuevo, sin reintento) y una carrera posterior a la carga que el `UPDATE` condicional detecta con 0 filas; y que las notas no incrementan `repair_orders.version`; se verifica con pruebas de integración.

## 4. Acción de servidor

- [x] 4.1 Implementar la Server Action de transición con `requireAdmin()` y `AdminContext`, parseo explícito de `orderId`, `targetStatus`, `expectedVersion` y `confirmed` (sin aceptar `fromStatus` ni booleanos de capacidad); se verifica con pruebas de integración parametrizadas de sesión inválida (`SC-12`/`E10`) y de entrada inválida.

## 5. Proyección y lectura

- [x] 5.1 Extender el DTO administrativo con `version` y la colección `allowedTransitions` (destino, confirmación y razón de bloqueo solo cuando la UI la necesita; el avance a *Esperando aprobación* bloqueado sin diagnóstico/costo, la cancelación disponible, `[]` en estados finales) como indicaciones de presentación; se verifica con pruebas de que no contiene capacidades futuras ni valores de diagnóstico/costo y de que `version` nunca llega al DTO público.
- [x] 5.2 Verificar el reflejo público de una transición (estado, evento y Journey coherente, sin datos administrativos ni caché compartida) y el administrativo (estado, `version`, historial y acciones vigentes); se verifica con pruebas de integración.

## 6. ADM-04: acciones y diálogos

- [x] 6.1 Implementar las acciones fuera del Journey («Avanzar a …» y «Cancelar orden» según el estado), sin selector libre ni etapas clicables y sin acciones en estados finales; se verifica con Playwright y la revisión de que no hay lógica de transición en React.
- [x] 6.2 Implementar los diálogos `E11` #2, #3 (núcleo: destructivo, irreversible y cerrada, sin la frase sobre notas) y #4 con el copy y el comportamiento de DESIGN §12 (foco, Escape, hoja inferior en móvil), y el #1 como transición bloqueada sin diálogo vacío mientras falten diagnóstico y costo (su resumen lo completa CHG-11), sin textarea de motivo ni notas falsas; se verifica con Playwright en móvil y escritorio.
- [x] 6.3 Implementar el estado pendiente (control deshabilitado, sin mutación optimista), el refresco tras el éxito y las alertas de `STALE_ORDER`, `TRANSITION_NOT_ALLOWED`, `CONFIRMATION_REQUIRED`, `DIAGNOSIS_AND_COST_REQUIRED` y sesión expirada según DESIGN §13 y Apéndice A.5; se verifica con Playwright y las pruebas de integración correspondientes.

## 7. Pruebas y trazabilidad

- [x] 7.1 Completar las pruebas Playwright del ciclo de vida (avances, los diálogos #2, #3 y #4, el estado bloqueado del #1 y el mecanismo de servidor de las cuatro confirmaciones con fixture de prueba permitido, cancelación y terminalidad, vista desactualizada si no es frágil, móvil y escritorio); se verifica con las ejecuciones en verde y la revisión de que no existe una puerta trasera en Production.
- [x] 7.2 Actualizar `TRACEABILITY.md` con `SC-05`, `SC-06`, `SC-09`, `E9`, `E11`, `E13`, `E14` (escalonado con CHG-12), el soporte de `SC-04` y `SC-10` y la contribución a `E2E-01`, sin declarar cerrados `SC-07`, `SC-08`, `SC-17` ni `E2E-01`; se verifica con `npm run test:trace`.

## 8. Verificación final

- [x] 8.1 Ejecutar `npm run lint`, `typecheck`, `test:unit`, `test:integration`, `test:e2e` y `build`; se verifica con las ejecuciones en verde.
- [x] 8.2 Revisar el alcance del diff: sin edición de diagnóstico o costo, notas, corrección de datos, motivo de cancelación, XState, triggers de negocio ni cambios de persistencia; se verifica con `git diff` y `openspec validate repair-status-lifecycle --strict`.

## Workflow follow-up

- Revisar y aprobar el change; el usuario autoriza `/opsx:apply` en la Fase 7 con el DoR cumplido.
- Archivar **después de CHG-06, CHG-09a y CHG-09b**: crea la main spec `repair-lifecycle` y añade requisitos a `public-order-tracking` y `admin-order-management`.
- CHG-11, CHG-12 y CHG-13 consumen `isTerminal`, `expectedVersion` y el patrón de acción; ninguno rediseña el ciclo de vida.

## Notas de implementación (2026-10-29)

**Estado: 18/18 tareas completas.** Rama `chg-10-repair-status-lifecycle`. Sin dependencias nuevas (sin XState), sin migraciones y sin tocar Production.

- **1.1 DoR.** CHG-06, CHG-09a y CHG-09b archivados; existen las main specs `public-order-tracking` y `admin-order-management`; AV-1 y AV-2 aprobados.
- **1.2 Auditoría del baseline de CHG-02 (sin discrepancias).** Confirmado contra la base real: el `CHECK` de `order_status_history` valida cada fila como evento inicial o uno de los 10 pares (23514 para un par fuera de la matriz) y **no** garantiza secuencia (un par permitido fuera de secuencia entra: prueba `auditoría del baseline`); el historial es *append-only* para `fixora_app` (UPDATE/DELETE → 42501); `repair_orders` solo permite UPDATE por columnas (`tracking_code` no); existen `version ≥ 1` y el `CHECK` de SC-07 como segunda barrera. Por eso la máquina vive en dominio/aplicación y la integridad conjunta orden+historial depende de la transacción y de la versión.
- **2.x Dominio.** `src/domain/repair/lifecycle.ts`: UNA tabla declarativa y funciones puras (`allowedTransitions`, `isTerminal`, `canCancel`, `requiresConfirmation`, `requiresDiagnosisAndCost`, `evaluateTransition`, `presentTransitions`). Barrido exhaustivo de los 64 pares (10 permitidos y 54 rechazados). Las primitivas futuras (`canEdit*`, `canManageNotes`, `isDiagnosisAndCostPublic`) **no** se implementan; no hay copias de las reglas en UI, acción ni repositorio (la interfaz solo consume `allowedTransitions`).
- **3.x Aplicación y persistencia.** `transition-order.ts` (precedencia: entrada → orden → `STALE_ORDER` por versión → reglas del dominio sobre esa instantánea → `UPDATE` condicional → historial) y `order-transition-store.ts` (una transacción `READ COMMITTED`: carga sin bloqueo, `UPDATE ... WHERE id AND version` con `version + 1` y evento con el mismo `now`). Costura de solo lectura del prerrequisito: presencia de diagnóstico (no vacío) y costo calculada en SQL, sin cargar los valores; si no es comprobable, se rechaza. Barreras de concurrencia probadas: comparación temprana, carrera posterior a la carga (0 filas) y dos envíos simultáneos con la misma `expectedVersion` (uno gana). Atomicidad probada con un fallo forzado del INSERT del historial y con un fallo posterior a escribir. Las notas no incrementan `repair_orders.version`.
- **4.x Acción.** `transitionOrderStatus` (Server Action de cuerpo explícito): parseo de `orderId`, `targetStatus`, `expectedVersion` y `confirmed` (solo `true` cuenta); ignora campos desconocidos y nunca acepta `fromStatus` ni capacidades. `SESSION_EXPIRED` antes de cualquier lectura o escritura. Se registra en la matriz de autorización (`tests/integration/support/admin-action-matrix.ts`). Códigos: los cinco del diseño más `VALIDATION_FAILED` para entrada malformada u orden inexistente (código del catálogo del TD §16).
- **5.x Proyección.** `AdminOrderDetailDTO` añade `version` (no se muestra) y `allowedTransitions`; el avance a Esperando aprobación sin diagnóstico/costo sigue en la lista con `blockedReason` y la cancelación permanece disponible; `[]` en estados finales. La lectura pública no cambia: los nuevos eventos aparecen al consultar de nuevo (verificado, sin `version` ni datos administrativos).
- **6.x UI.** `OrderLifecycle` (acciones fuera del Journey: «Avanzar a …» y «Cancelar orden», sin selector libre ni etapas clicables; avance bloqueado con su motivo visible) y `ConfirmDialog` sobre `<dialog>` modal (chip de transición, foco inicial explícito, Escape = Volver, hoja inferior en móvil con la acción arriba). Diálogos #2, #3 (núcleo: sin motivo ni frase sobre notas) y #4 completos; el #1 con el copy de DESIGN y sin resumen de diagnóstico/costo (CHG-11), alcanzable solo con un fixture. Estado pendiente (botones deshabilitados, sin mutación optimista), refresco del servidor tras el éxito y alertas de `STALE_ORDER`, `TRANSITION_NOT_ALLOWED`, `CONFIRMATION_REQUIRED`, `DIAGNOSIS_AND_COST_REQUIRED` y sesión expirada con el copy de DESIGN §13 y A.5.
- **7.x Pruebas.** Unitarias (dominio con 64 pares, caso de uso, presentación), 41 de integración sobre PostgreSQL real y 24 E2E (escritorio y móvil). `TRACEABILITY.md`: `SC-05`, `SC-06`, `E13` verificados; `E9`, `E11` implementados; `SC-09`, `E14`, `SC-04`, `SC-10` parciales; sin declarar cerrados `SC-07`, `SC-08`, `SC-17` ni `E2E-01`.
- **Ajustes a pruebas previas.** Los E2E de CHG-09b que afirmaban «sin controles» ahora distinguen datos/recorrido (sin controles) de las acciones de ciclo de vida; las pruebas de integración de CHG-09b reflejan el DTO ampliado.
- **Observaciones.** (1) Hasta CHG-11 el avance a Esperando aprobación permanece bloqueado en el producto real (no hay forma funcional de poblar diagnóstico y costo): es el comportamiento seguro por defecto del diseño. (2) El `expectedVersion` del cambio es la versión que el administrador revisó; la comprobación temprana añade a TD §14.4 una precedencia que el diagrama no dibuja (a registrar en la Fase 6.5, ya anotado en el diseño).
