# Tasks

> Planificación únicamente. Nada de esto se ejecuta hasta que el change esté revisado, aprobado y el usuario autorice `/opsx:apply` en la Fase 7, **con CHG-05, CHG-08 y CHG-09a aplicados y archivados** y AV-2 aprobado. No se agregan dependencias. No hay transiciones, diagnóstico, costo, notas, corrección ni controles deshabilitados.
>
> **Dependencia de Spec-base:** CHG-09b pudo materializarse con CHG-09a activo (patrón validado de *Modified Capability + ADDED Requirements*). **CHG-09a MUST be archived before CHG-09b.** Sin `/opsx:sync` anticipado.

## 1. Preflight y dependencias

- [ ] 1.1 Confirmar el DoR (CHG-09a implementado, verificado y **archivado**, de modo que `openspec/specs/admin-order-management/` existe; CHG-08 aplicado; AV-1 y AV-2 aprobados); se verifica con una nota de aprobación y `openspec list --specs`.
- [ ] 1.2 Confirmar que el componente `RepairJourney` de presentación de CHG-06 puede reutilizarse en ADM-04 (y, si hace falta, convertirlo en primitiva compartida mediante un refactor técnico sin segunda implementación); se verifica con la nota de decisión y la revisión del diff.

## 2. Modelo de lectura

- [ ] 2.1 Definir `AdminOrderDetailDTO` con lista positiva (identificación, contacto, equipo, problema, historial de estados), sin diagnóstico, costo, notas, `version` ni `capabilities`; se verifica con una prueba de que solo existen las claves permitidas.
- [ ] 2.2 Implementar la operación del repositorio administrativo (proyección base de la orden y eventos de estado con orden `occurred_at DESC, id DESC`), sin cargar datos de funciones futuras ni tipos Prisma hacia arriba; se verifica con pruebas de integración y la revisión de las consultas emitidas.
- [ ] 2.3 Implementar el caso de uso `getAdminOrderDetail` que exige `AdminContext`, con la validación del identificador UUID en la frontera; se verifica con pruebas unitarias del parseo y de integración de orden existente, inexistente e identificador mal formado.

## 3. Ruta y autorización

- [ ] 3.1 Implementar `/admin/ordenes/[id]` dinámica, ejecutando `requireAdmin()` antes de cualquier lectura, con el manejo de CHG-08 sin sesión (sin mostrar nunca «Orden no encontrada» antes de autorizar) y el no encontrado administrativo contextual (UUID mal formado o inexistente, mismo estado, shell conservado, «Volver al listado», sin UUID ni detalles técnicos, distinto del 404 global); se verifica con pruebas de integración y Playwright de acceso directo sin sesión y de sesión inválida (regresión de `SC-12`).
- [ ] 3.2 Confirmar que la ruta no usa `use cache`, ISR ni caché compartida y que el contenido está bajo `noindex`; se verifica con la inspección de cabeceras y el resultado de AV-1.

## 4. Interfaz de solo lectura

- [ ] 4.1 Implementar la cabecera (código, badge y texto de estado, fecha) y los bloques Público (equipo y descripción) e Interno (contacto e historial) con las cinco señales de separación de DESIGN §9 y sin contenedores vacíos para diagnóstico, costo ni notas, ausencias comprensibles de correo y modelo, y ajuste de texto largo; se verifica con Playwright en móvil y escritorio sin desbordamiento horizontal y con la revisión contra DESIGN ADM-04.
- [ ] 4.2 Integrar el recorrido de etapas compartido (solo presentación, sin acciones ni etapas clicables) y el historial de estados (DESIGN §7 y §8.2, más reciente primero, `America/Lima`, `DD/MM/AAAA HH:mm`); se verifica con pruebas unitarias del mapeo de fechas y estado y de integración del historial inicial y con varios eventos.
- [ ] 4.3 Confirmar que no se renderizan controles de modificación ni deshabilitados, ni marcadores vacíos de funciones futuras; se verifica con la revisión del diff y una prueba Playwright de ausencia.

## 5. Navegación

- [ ] 5.1 Habilitar la navegación desde las cinco recientes del panel y desde las filas del directorio (fila clicable y «Ver detalle», con enlaces reales accesibles por teclado), y el enlace «volver al listado» que conserva el filtro `estado`; se verifica con Playwright con ratón y teclado.
- [ ] 5.2 Confirmar que no se almacenan búsqueda ni página para restaurarlas y que el código no aparece en la URL; se verifica con Playwright.

## 6. Privacidad y errores

- [ ] 6.1 Verificar los estados de error (sesión inválida, orden inexistente, fallo inesperado) sin mensajes técnicos y que los registros no contienen nombre, teléfono, correo, código, descripción ni eventos; se verifica con pruebas con valores canario.
- [ ] 6.2 Añadir la regresión de `SC-11`: una orden con datos personales y administrativos sigue sin exponerlos en `PublicOrderView`; se verifica con la prueba de integración.

## 7. Pruebas y trazabilidad

- [ ] 7.1 Completar las pruebas Playwright del recorrido (inicio de sesión, abrir desde el panel y el directorio, volver, datos e historial, orden inexistente, URL directa sin sesión, móvil y escritorio); se verifica con las ejecuciones en verde.
- [ ] 7.2 Actualizar `TRACEABILITY.md` con `SC-03`, la presentación de `SC-10`, las regresiones de `SC-11`/`SC-12` y la contribución a `E2E-01`; se verifica con `npm run test:trace`.

## 8. Verificación final

- [ ] 8.1 Ejecutar `npm run lint`, `typecheck`, `test:unit`, `test:integration`, `test:e2e` y `build`; se verifica con las ejecuciones en verde.
- [ ] 8.2 Revisar el alcance del diff: sin transiciones, diagnóstico, costo, notas, correcciones, controles deshabilitados ni cambios de persistencia; se verifica con `git diff` y `openspec validate admin-order-detail --strict`.

## Workflow follow-up

- Revisar y aprobar el change; el usuario autoriza `/opsx:apply` en la Fase 7 con el DoR cumplido.
- Archivar **después de CHG-09a**: la delta añade sus requisitos a la main spec `admin-order-management` ya creada por CHG-09a.
- CHG-10, CHG-11, CHG-12 y CHG-13 extienden esta pantalla; ninguno rediseña el detalle.
