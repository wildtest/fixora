# Tasks

> Planificación únicamente. Nada de esto se ejecuta hasta que el change esté revisado, aprobado y el usuario autorice `/opsx:apply` en la Fase 7, **con CHG-10 implementado, verificado y archivado** y AV-2 (`NUMERIC`) aprobado. No se agregan dependencias. No hay notas, corrección de datos básicos, descongelamiento, indicador «publicado» ni REST.
>
> **Dependencia de Spec-base:** CHG-11 pudo materializarse con CHG-10 activo (patrón validado de *Modified Capability + ADDED Requirements*). **CHG-10 MUST be archived before CHG-11.** Sin `/opsx:sync` anticipado.

## 1. Preflight y dependencias

- [x] 1.1 Confirmar el DoR (CHG-10 archivado, de modo que existen las main specs `repair-lifecycle`, `public-order-tracking` y `admin-order-management` con los cambios de CHG-10; AV-2 aprobado con `NUMERIC`; decisiones cerradas: longitud del diagnóstico 2000, código `DIAGNOSIS_AND_COST_FROZEN` y guardado por campo); se verifica con una nota de aprobación y `openspec list --specs`.
- [x] 1.2 Auditar CHG-02 contra esta Spec (columnas nulables, `NUMERIC` sin precisión, `CHECK` de > 0 y ≤ 2 decimales, historiales con ambos valores nulables, *append-only*, privilegios); se verifica con la nota de auditoría, reportando cualquier discrepancia sin modificar CHG-02.

## 2. Dominio: diagnóstico y dinero

- [x] 2.1 Implementar la normalización del diagnóstico (`trim`, vacío → ausente, `U+0000`, máximo de 2000 caracteres de texto tras el `trim` con error de campo `TOO_LONG`, no-op); se verifica con pruebas unitarias (2000 válido, 2001 rechazado, `trim` antes del límite, Unicode con la primitiva común).
- [x] 2.2 Implementar la primitiva de dinero (cadena canónica de dos decimales, parseo estricto de hasta dos decimales, `BigInt` de céntimos, > 0, sin redondeo, igualdad canónica, formato `S/ 0.00`); se verifica con pruebas unitarias exhaustivas, incluidos valores que fallarían con `number`.

## 3. Mutaciones y persistencia

- [x] 3.1 Implementar `saveDiagnosis` con `requireAdmin()`, `AdminContext`, parseo explícito, la precedencia `STALE_ORDER` → `ORDER_CLOSED` → `DIAGNOSIS_AND_COST_FROZEN` → validación, `canEditDiagnosisAndCost` recalculado, no-op, `UPDATE` condicional y `diagnosis_history` en una transacción; se verifica con pruebas de integración (crear, modificar, limpiar, no-op, `version + 1` efectivo, historial, `STALE_ORDER` por ambas barreras, estados congelados y finales, fallo inyectado sin parciales).
- [x] 3.2 Implementar `saveEstimatedCost` (operación independiente: su propio comando, `expectedVersion`, transacción e historial; sin una operación combinada) con las mismas garantías y `cost_history`, con conversión exacta entre cadena canónica, Prisma `Decimal` y `NUMERIC`; se verifica con las mismas pruebas más la conversión sin `number` y el rechazo de cero, negativos y más de dos decimales.
- [x] 3.3 Añadir `DIAGNOSIS_AND_COST_FROZEN` (estados congelados no terminales) al conjunto cerrado de resultados, manteniendo `ORDER_CLOSED` solo para estados finales y sin códigos por estado; se verifica con pruebas de integración de cada estado con la versión vigente y de la precedencia (versión distinta → `STALE_ORDER`) sin cambio de versión ni historial.
- [x] 3.4 Añadir `saveDiagnosis` y `saveEstimatedCost` a la matriz de autorización de acciones administrativas de CHG-08 (infraestructura solo de pruebas): sin sesión válida, cada una devuelve `SESSION_EXPIRED` sin escribir diagnóstico ni costo, sin fila de historial y sin cambio de `repair_orders.version`; se verifica con la prueba de integración parametrizada (`SC-12`/`E10`).

## 4. Lectura administrativa y combinada

- [x] 4.1 Extender `AdminOrderDetail` con `diagnosis`, `estimatedCost`, `canEditDiagnosisAndCost` (indicación), el dato para «Nunca se publicó al cliente» y los eventos de diagnóstico y costo; se verifica con pruebas de integración y de que no hay capacidades de notas ni de datos básicos.
- [x] 4.2 Implementar el historial administrativo combinado (unión discriminada, más reciente primero, desempate determinista con columnas existentes); se verifica con pruebas de integración del orden y de los montos exactos.

## 5. Proyección pública

- [x] 5.1 Implementar la regla `isDiagnosisAndCostPublic` (estados públicos y `CANCELADO` solo con evento hacia `ESPERANDO_APROBACION`) y la proyección pública condicionada que no carga valores no autorizados, con `repairDetails: null | { diagnosis, estimatedCost }`; se verifica con las **cuatro pruebas de publicación** de integración y la comprobación de que los valores no están en `PublicOrderView`.
- [x] 5.2 Verificar que el DTO público no contiene historiales, `version`, identificadores internos ni datos administrativos y que presencia no implica publicación; se verifica con la prueba negativa de `SC-11` sobre una orden completamente poblada.

## 6. Interfaz de ADM-04 y PUB-05

- [x] 6.1 Implementar los bloques Público (diagnóstico y costo) e Interno (historial combinado) con campos editables y un guardado por campo en los tres primeros estados, rótulo «Aún no visible para el cliente», errores por campo y ausencias comprensibles; se verifica con Playwright en móvil y escritorio y la revisión contra DESIGN §11.
- [x] 6.2 Implementar la presentación congelada («Congelado»), de solo lectura en estados finales y «Nunca se publicó al cliente»; se verifica con Playwright.
- [x] 6.3 Completar el diálogo `E11` #1 con el resumen real del diagnóstico y del costo, el aviso de congelamiento y publicación y la ligadura a la versión revisada; se verifica con Playwright y una prueba de integración de `STALE_ORDER` si el diagnóstico o el costo cambian antes de confirmar.
- [x] 6.4 Implementar el bloque público de diagnóstico y costo en PUB-05 (costo destacado, diagnóstico como texto, separado de las notas públicas de CHG-12) y el vacío informativo de `E6`; se verifica con Playwright en móvil y escritorio.

## 7. Pruebas y trazabilidad

- [x] 7.1 Implementar `E2E-01` completo (registro → código → inicio de sesión administrativo → búsqueda → detalle → *Solicitud recibida → Equipo recibido → En diagnóstico* → diagnóstico y costo → `E11` #1 → *Esperando aprobación* → consulta pública con estado, Journey, diagnóstico y costo), con la comprobación previa de que antes de confirmar no se ven; se verifica con la ejecución en verde.
- [x] 7.2 Implementar el Playwright independiente de `SC-04` (ciclo completo *Solicitud recibida → Equipo recibido → En diagnóstico → Esperando aprobación → En reparación → Listo para recojo → Entregado*, con diagnóstico y costo registrados antes de la primera confirmación y las confirmaciones `E11` #1, #2 y #4), comprobando en la consulta pública (interfaz real) el estado y la línea de tiempo **tras cada una de las seis transiciones** y la visibilidad del diagnóstico y el costo desde *Esperando aprobación*; depende de CHG-10 archivado y no sustituye ni amplía `E2E-01`; se verifica con la ejecución en verde.
- [x] 7.3 Actualizar `TRACEABILITY.md` con `SC-04` (evidencia primaria CHG-11; soporte CHG-10), `SC-07`, `SC-08`, `SC-10`, `SC-17` (`E2E-01`, prueba distinta de la de `SC-04`), `E5` y `E6`, la regresión de `SC-12` y la terminalidad de diagnóstico y costo como parte de `SC-09`; se verifica con `npm run test:trace`.

## 8. Verificación final

- [x] 8.1 Ejecutar `npm run lint`, `typecheck`, `test:unit`, `test:integration`, `test:e2e` y `build`; se verifica con las ejecuciones en verde.
- [x] 8.2 Revisar el alcance del diff: sin notas, correcciones de datos básicos, descongelamiento, indicador «publicado», `number` para dinero, REST ni cambios de persistencia; se verifica con `git diff` y `openspec validate diagnosis-and-estimate --strict`.

## Workflow follow-up

- Revisar y aprobar el change; el usuario autoriza `/opsx:apply` en la Fase 7 con el DoR cumplido.
- Archivar **después de CHG-10**: crea la main spec `diagnosis-and-estimate` y añade requisitos a `admin-order-management` y `public-order-tracking`.
- CHG-12 y CHG-13 completan la composición de ADM-04; ninguno rediseña diagnóstico ni costo.

## Notas de implementación (2026-10-29)

**Estado: 21/21 tareas completas.** Rama `chg-11-diagnosis-and-estimate`. Sin dependencias nuevas, sin migraciones y sin tocar Production.

- **1.1 DoR.** CHG-10 archivado (existen `repair-lifecycle`, `public-order-tracking` y `admin-order-management` con sus cambios); AV-2 aprobado. Decisiones cerradas: longitud del diagnóstico 2000, código `DIAGNOSIS_AND_COST_FROZEN` y guardado por campo.
- **1.2 Auditoría de CHG-02 (sin discrepancias).** Verificado contra la base real: `diagnosis` y `estimated_cost` nulables; `NUMERIC` sin precisión (un monto de 20 dígitos significativos hace el viaje de ida y vuelta exacto); `CHECK` de costo > 0 y ≤ 2 decimales; historiales con valores anterior y nuevo nulables, *append-only* para `fixora_app` y con `UPDATE` de columnas de `repair_orders` permitido solo para `diagnosis`, `estimated_cost`, `version` y `updated_at` entre otras.
- **2.x Dominio.** `src/domain/repair/diagnosis.ts` (`trim`, vacío → ausente, `U+0000` rechazado, máximo 2000 caracteres de texto medidos tras el recorte con error `TOO_LONG`) y `money.ts` (cadena canónica de dos decimales, `BigInt` de céntimos, > 0, sin redondeo, igualdad por valor, formato `S/ 0.00`; se usa `BigInt(...)` y no literales `123n` porque el objetivo de TypeScript del proyecto es ES2017). Pruebas con valores que fallarían con `number` (0.1 + 0.2, 1.005, 18 dígitos enteros, `> MAX_SAFE_INTEGER`). `canEditDiagnosisAndCost` e `isDiagnosisAndCostPublic` en `lifecycle.ts`.
- **3.x Mutaciones.** `saveDiagnosis` y `saveEstimatedCost` independientes (`edit-diagnosis-cost.ts` + `order-edit-store.ts`): precedencia sesión → entrada → orden → `STALE_ORDER` → `ORDER_CLOSED` → `DIAGNOSIS_AND_COST_FROZEN` → validación → no-op → `UPDATE` condicional por versión → historial propio, en una transacción `READ COMMITTED`. El `UPDATE` añade además la guarda de estado editable. Probados: crear/modificar/limpiar, no-op sin versión ni historial, versión +1 efectiva, carrera posterior a la carga, dos pestañas con la misma versión (una gana, sin fusión), atomicidad con fallo forzado del historial, congelamiento (3 estados) y terminalidad (2 estados) sin escritura. Ambas operaciones se registran en la matriz de autorización (`SESSION_EXPIRED` sin escribir).
- **4.x Lectura administrativa.** El DTO añade `diagnosis`, `estimatedCost` (cadena canónica), `canEditDiagnosisAndCost`, `neverPublished` (decidido por el recorrido: existe un evento hacia Esperando aprobación) y el historial combinado como unión discriminada (estado, diagnóstico, costo) con orden estable: más reciente primero y, con el mismo instante, rango estado < diagnóstico < costo y luego `id` descendente (columnas existentes, sin tablas nuevas).
- **5.x Proyección pública.** `PublicOrderView.repairDetails: null | { diagnosis, estimatedCost }`. La consulta pública condiciona los valores **en SQL**: solo salen de la base de datos en los estados públicos y en Cancelado únicamente si existe un evento hacia Esperando aprobación; en los demás casos devuelve `NULL` y los valores no se cargan en memoria (las pruebas espían lo que devuelve la base de datos). Cuatro pruebas de publicación y la prueba negativa de `SC-11` sobre una orden poblada (sin historiales, versión, ids ni versiones anteriores).
- **6.x Interfaz.** ADM-04: campos editables con un guardado por campo, rótulo «Aún no visible para el cliente», errores junto al campo conservando lo escrito, «Congelado» / «Solo lectura» / «Nunca se publicó al cliente», historial combinado con marcadores por tipo y el diálogo `E11` #1 con el resumen real. Los dos formularios comparten el refresco del servidor para que ningún envío viaje con la versión anterior. PUB-05: tarjeta propia con el costo destacado (24/32, 600) y el diagnóstico como texto; sin información publicada se conserva el vacío informativo de `E6`.
- **7.x Pruebas.** `E2E-01` y el ciclo de `SC-04` son pruebas Playwright distintas (el ciclo comprueba la consulta pública tras cada una de las seis transiciones). `TRACEABILITY.md`: `SC-04`, `SC-07`, `SC-08`, `SC-10`, `SC-17` y `E5` verificados; `SC-09` y `E6` parciales (notas y datos básicos llegan con CHG-12/13).
- **Ajustes a pruebas previas.** Las pruebas de CHG-09b/10 se adaptaron al DTO ampliado y a la vista pública con `repairDetails`; el diálogo `E11` #1 de CHG-10 se verifica ahora con su resumen real.
- **Observaciones.** (1) `DIAGNOSIS_MAX_LENGTH = 2000` es decisión de esta Spec (el TD delega las longitudes); no se modifican PRD/DESIGN/TD. (2) El guardado de un campo y el refresco posterior a la versión nueva: mientras la orden se recarga ambos botones quedan deshabilitados. (3) Nada de esto cambia `x-vercel-forwarded-for` (CHG-14).
