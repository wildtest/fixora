# Tasks

> Planificación únicamente. Nada de esto se ejecuta hasta que el change esté revisado, aprobado y el usuario autorice `/opsx:apply` en la Fase 7, **con CHG-10 implementado, verificado y archivado** y AV-2 (`NUMERIC`) aprobado. No se agregan dependencias. No hay notas, corrección de datos básicos, descongelamiento, indicador «publicado» ni REST.
>
> **Dependencia de Spec-base:** CHG-11 pudo materializarse con CHG-10 activo (patrón validado de *Modified Capability + ADDED Requirements*). **CHG-10 MUST be archived before CHG-11.** Sin `/opsx:sync` anticipado.

## 1. Preflight y dependencias

- [ ] 1.1 Confirmar el DoR (CHG-10 archivado, de modo que existen las main specs `repair-lifecycle`, `public-order-tracking` y `admin-order-management` con los cambios de CHG-10; AV-2 aprobado con `NUMERIC`; decisiones cerradas: longitud del diagnóstico 2000, código `DIAGNOSIS_AND_COST_FROZEN` y guardado por campo); se verifica con una nota de aprobación y `openspec list --specs`.
- [ ] 1.2 Auditar CHG-02 contra esta Spec (columnas nulables, `NUMERIC` sin precisión, `CHECK` de > 0 y ≤ 2 decimales, historiales con ambos valores nulables, *append-only*, privilegios); se verifica con la nota de auditoría, reportando cualquier discrepancia sin modificar CHG-02.

## 2. Dominio: diagnóstico y dinero

- [ ] 2.1 Implementar la normalización del diagnóstico (`trim`, vacío → ausente, `U+0000`, máximo de 2000 caracteres de texto tras el `trim` con error de campo `TOO_LONG`, no-op); se verifica con pruebas unitarias (2000 válido, 2001 rechazado, `trim` antes del límite, Unicode con la primitiva común).
- [ ] 2.2 Implementar la primitiva de dinero (cadena canónica de dos decimales, parseo estricto de hasta dos decimales, `BigInt` de céntimos, > 0, sin redondeo, igualdad canónica, formato `S/ 0.00`); se verifica con pruebas unitarias exhaustivas, incluidos valores que fallarían con `number`.

## 3. Mutaciones y persistencia

- [ ] 3.1 Implementar `saveDiagnosis` con `requireAdmin()`, `AdminContext`, parseo explícito, la precedencia `STALE_ORDER` → `ORDER_CLOSED` → `DIAGNOSIS_AND_COST_FROZEN` → validación, `canEditDiagnosisAndCost` recalculado, no-op, `UPDATE` condicional y `diagnosis_history` en una transacción; se verifica con pruebas de integración (crear, modificar, limpiar, no-op, `version + 1` efectivo, historial, `STALE_ORDER` por ambas barreras, estados congelados y finales, fallo inyectado sin parciales).
- [ ] 3.2 Implementar `saveEstimatedCost` (operación independiente: su propio comando, `expectedVersion`, transacción e historial; sin una operación combinada) con las mismas garantías y `cost_history`, con conversión exacta entre cadena canónica, Prisma `Decimal` y `NUMERIC`; se verifica con las mismas pruebas más la conversión sin `number` y el rechazo de cero, negativos y más de dos decimales.
- [ ] 3.3 Añadir `DIAGNOSIS_AND_COST_FROZEN` (estados congelados no terminales) al conjunto cerrado de resultados, manteniendo `ORDER_CLOSED` solo para estados finales y sin códigos por estado; se verifica con pruebas de integración de cada estado con la versión vigente y de la precedencia (versión distinta → `STALE_ORDER`) sin cambio de versión ni historial.

## 4. Lectura administrativa y combinada

- [ ] 4.1 Extender `AdminOrderDetail` con `diagnosis`, `estimatedCost`, `canEditDiagnosisAndCost` (indicación), el dato para «Nunca se publicó al cliente» y los eventos de diagnóstico y costo; se verifica con pruebas de integración y de que no hay capacidades de notas ni de datos básicos.
- [ ] 4.2 Implementar el historial administrativo combinado (unión discriminada, más reciente primero, desempate determinista con columnas existentes); se verifica con pruebas de integración del orden y de los montos exactos.

## 5. Proyección pública

- [ ] 5.1 Implementar la regla `isDiagnosisAndCostPublic` (estados públicos y `CANCELADO` solo con evento hacia `ESPERANDO_APROBACION`) y la proyección pública condicionada que no carga valores no autorizados, con `repairDetails: null | { diagnosis, estimatedCost }`; se verifica con las **cuatro pruebas de publicación** de integración y la comprobación de que los valores no están en `PublicOrderView`.
- [ ] 5.2 Verificar que el DTO público no contiene historiales, `version`, identificadores internos ni datos administrativos y que presencia no implica publicación; se verifica con la prueba negativa de `SC-11` sobre una orden completamente poblada.

## 6. Interfaz de ADM-04 y PUB-05

- [ ] 6.1 Implementar los bloques Público (diagnóstico y costo) e Interno (historial combinado) con campos editables y un guardado por campo en los tres primeros estados, rótulo «Aún no visible para el cliente», errores por campo y ausencias comprensibles; se verifica con Playwright en móvil y escritorio y la revisión contra DESIGN §11.
- [ ] 6.2 Implementar la presentación congelada («Congelado»), de solo lectura en estados finales y «Nunca se publicó al cliente»; se verifica con Playwright.
- [ ] 6.3 Completar el diálogo `E11` #1 con el resumen real del diagnóstico y del costo, el aviso de congelamiento y publicación y la ligadura a la versión revisada; se verifica con Playwright y una prueba de integración de `STALE_ORDER` si el diagnóstico o el costo cambian antes de confirmar.
- [ ] 6.4 Implementar el bloque público de diagnóstico y costo en PUB-05 (costo destacado, diagnóstico como texto, separado de futuras notas) y el vacío informativo de `E6`; se verifica con Playwright en móvil y escritorio.

## 7. Pruebas y trazabilidad

- [ ] 7.1 Implementar `E2E-01` completo (registro → código → inicio de sesión administrativo → búsqueda → detalle → *Solicitud recibida → Equipo recibido → En diagnóstico* → diagnóstico y costo → `E11` #1 → *Esperando aprobación* → consulta pública con estado, Journey, diagnóstico y costo), con la comprobación previa de que antes de confirmar no se ven; se verifica con la ejecución en verde.
- [ ] 7.2 Actualizar `TRACEABILITY.md` con `SC-07`, `SC-08`, `SC-10`, `SC-17`, `E5` y `E6`, y la terminalidad de diagnóstico y costo como parte de `SC-09`; se verifica con `npm run test:trace`.

## 8. Verificación final

- [ ] 8.1 Ejecutar `npm run lint`, `typecheck`, `test:unit`, `test:integration`, `test:e2e` y `build`; se verifica con las ejecuciones en verde.
- [ ] 8.2 Revisar el alcance del diff: sin notas, correcciones de datos básicos, descongelamiento, indicador «publicado», `number` para dinero, REST ni cambios de persistencia; se verifica con `git diff` y `openspec validate diagnosis-and-estimate --strict`.

## Workflow follow-up

- Revisar y aprobar el change; el usuario autoriza `/opsx:apply` en la Fase 7 con el DoR cumplido.
- Archivar **después de CHG-10**: crea la main spec `diagnosis-and-estimate` y añade requisitos a `admin-order-management` y `public-order-tracking`.
- CHG-12 y CHG-13 completan la composición de ADM-04; ninguno rediseña diagnóstico ni costo.
