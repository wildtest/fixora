# Tasks

> Planificación únicamente. Nada de esto se ejecuta hasta que el change esté revisado, aprobado y el usuario autorice `/opsx:apply` en la Fase 7, **con CHG-05, CHG-08 y CHG-09a aplicados y archivados** y AV-2 aprobado. No se agregan dependencias. No hay transiciones, diagnóstico, costo, notas, corrección ni controles deshabilitados.
>
> **Dependencia de Spec-base:** CHG-09b pudo materializarse con CHG-09a activo (patrón validado de *Modified Capability + ADDED Requirements*). **CHG-09a MUST be archived before CHG-09b.** Sin `/opsx:sync` anticipado.

## 1. Preflight y dependencias

- [x] 1.1 Confirmar el DoR (CHG-09a implementado, verificado y **archivado**, de modo que `openspec/specs/admin-order-management/` existe; CHG-08 aplicado; AV-1 y AV-2 aprobados); se verifica con una nota de aprobación y `openspec list --specs`.
- [x] 1.2 Confirmar que el componente `RepairJourney` de presentación de CHG-06 puede reutilizarse en ADM-04 (y, si hace falta, convertirlo en primitiva compartida mediante un refactor técnico sin segunda implementación); se verifica con la nota de decisión y la revisión del diff.

## 2. Modelo de lectura

- [x] 2.1 Definir `AdminOrderDetailDTO` con lista positiva (identificación, contacto, equipo, problema, historial de estados), sin diagnóstico, costo, notas, `version` ni `capabilities`; se verifica con una prueba de que solo existen las claves permitidas.
- [x] 2.2 Implementar la operación del repositorio administrativo (proyección base de la orden y eventos de estado con orden `occurred_at DESC, id DESC`), sin cargar datos de funciones futuras ni tipos Prisma hacia arriba; se verifica con pruebas de integración y la revisión de las consultas emitidas.
- [x] 2.3 Implementar el caso de uso `getAdminOrderDetail` que exige `AdminContext`, con la validación del identificador UUID en la frontera; se verifica con pruebas unitarias del parseo y de integración de orden existente, inexistente e identificador mal formado.

## 3. Ruta y autorización

- [x] 3.1 Implementar `/admin/ordenes/[id]` dinámica, ejecutando `requireAdmin()` antes de cualquier lectura, con el manejo de CHG-08 sin sesión (sin mostrar nunca «Orden no encontrada» antes de autorizar) y el no encontrado administrativo contextual (UUID mal formado o inexistente, mismo estado, shell conservado, «Volver al listado», sin UUID ni detalles técnicos, distinto del 404 global); se verifica con pruebas de integración y Playwright de acceso directo sin sesión y de sesión inválida (regresión de `SC-12`).
- [x] 3.2 Confirmar que la ruta no usa `use cache`, ISR ni caché compartida y que el contenido está bajo `noindex`; se verifica con la inspección de cabeceras y el resultado de AV-1.

## 4. Interfaz de solo lectura

- [x] 4.1 Implementar la cabecera (código, badge y texto de estado, fecha) y los bloques Público (equipo y descripción) e Interno (contacto e historial) con las cinco señales de separación de DESIGN §9 y sin contenedores vacíos para diagnóstico, costo ni notas, ausencias comprensibles de correo y modelo, y ajuste de texto largo; se verifica con Playwright en móvil y escritorio sin desbordamiento horizontal y con la revisión contra DESIGN ADM-04.
- [x] 4.2 Integrar el recorrido de etapas compartido (solo presentación, sin acciones ni etapas clicables) y el historial de estados (DESIGN §7 y §8.2, más reciente primero, `America/Lima`, `DD/MM/AAAA HH:mm`); se verifica con pruebas unitarias del mapeo de fechas y estado y de integración del historial inicial y con varios eventos.
- [x] 4.3 Confirmar que no se renderizan controles de modificación ni deshabilitados, ni marcadores vacíos de funciones futuras; se verifica con la revisión del diff y una prueba Playwright de ausencia.

## 5. Navegación

- [x] 5.1 Habilitar la navegación desde las cinco recientes del panel y desde las filas del directorio (fila clicable y «Ver detalle», con enlaces reales accesibles por teclado), y el enlace «volver al listado» que conserva el filtro `estado`; se verifica con Playwright con ratón y teclado.
- [x] 5.2 Confirmar que no se almacenan búsqueda ni página para restaurarlas y que el código no aparece en la URL; se verifica con Playwright.

## 6. Privacidad y errores

- [x] 6.1 Verificar los estados de error (sesión inválida, orden inexistente, fallo inesperado) sin mensajes técnicos y que los registros no contienen nombre, teléfono, correo, código, descripción ni eventos; se verifica con pruebas con valores canario.
- [x] 6.2 Añadir la regresión de `SC-11`: una orden con datos personales y administrativos sigue sin exponerlos en `PublicOrderView`; se verifica con la prueba de integración.

## 7. Pruebas y trazabilidad

- [x] 7.1 Completar las pruebas Playwright del recorrido (inicio de sesión, abrir desde el panel y el directorio, volver, datos e historial, orden inexistente, URL directa sin sesión, móvil y escritorio); se verifica con las ejecuciones en verde.
- [x] 7.2 Actualizar `TRACEABILITY.md` con `SC-03`, la presentación de `SC-10`, las regresiones de `SC-11`/`SC-12` y la contribución a `E2E-01`; se verifica con `npm run test:trace`.

## 8. Verificación final

- [x] 8.1 Ejecutar `npm run lint`, `typecheck`, `test:unit`, `test:integration`, `test:e2e` y `build`; se verifica con las ejecuciones en verde.
- [x] 8.2 Revisar el alcance del diff: sin transiciones, diagnóstico, costo, notas, correcciones, controles deshabilitados ni cambios de persistencia; se verifica con `git diff` y `openspec validate admin-order-detail --strict`.

## Workflow follow-up

- Revisar y aprobar el change; el usuario autoriza `/opsx:apply` en la Fase 7 con el DoR cumplido.
- Archivar **después de CHG-09a**: la delta añade sus requisitos a la main spec `admin-order-management` ya creada por CHG-09a.
- CHG-10, CHG-11, CHG-12 y CHG-13 extienden esta pantalla; ninguno rediseña el detalle.

## Notas de implementación (2026-10-29)

**Estado: 18/18 tareas completas.** Rama `chg-09b-admin-order-detail`. Sin dependencias nuevas, sin migraciones y sin tocar Production.

- **1.1 DoR.** CHG-09a archivado: existe `openspec/specs/admin-order-management/` (`openspec list --specs`); CHG-05 y CHG-08 archivados; AV-1 y AV-2 aprobados.
- **1.2 Repair Journey.** Se reutiliza el `RepairJourney` de CHG-06 (única implementación). Refactor técnico mínimo: un parámetro opcional `title` (por defecto «Recorrido de tu reparación»; ADM-04 usa «Recorrido de la reparación»). Sin acciones, sin etapas clicables; la lógica del recorrido sigue siendo la de `buildJourney`.
- **2.x Modelo y repositorio.** `src/domain/admin/order-detail.ts` (`AdminOrderDetailDTO` con lista positiva, validación UUID, `journeyTimeline`), `src/infrastructure/admin/admin-order-detail-store.ts` (dos consultas: la orden y sus eventos `occurred_at DESC, id DESC`; una prueba comprueba que no menciona diagnóstico, costo, `version`, `updated_at`, notas ni historiales de otras funciones) y `src/application/admin/order-detail.ts` (`getAdminOrderDetail(AdminContext, id)`: un id mal formado → `null` sin consultar la base).
- **3.x Ruta.** `/admin/ordenes/[id]` ejecuta `requireAdmin()` antes de leer el id; sin sesión, 307 al acceso (proxy) o redirección con aviso de sesión expirada si la cookie ya no vale; nunca «Orden no encontrada» antes de autorizar. UUID mal formado e inexistente comparten el mismo estado dentro del shell (EmptyState «Orden no encontrada», «Volver al listado», sin UUID ni detalles). Se verificó además que la carga directa lleva nonce en todos los scripts y no produce violaciones de CSP, aunque `next build` marque la ruta dinámica con ◐ (el layout `/admin` fuerza el renderizado por petición).
- **4.x UI.** Cabecera (código, badge, fecha en Lima), Journey, y bloques Público (equipo, descripción) e Interno (contacto e historial) con las cinco señales de DESIGN §9 (etiqueta, icono, encabezado, borde sólido/discontinuo y posición). Ausencias como «No informado»; historial «{anterior} → **{nuevo}**» con «Solo taller»; el registro inicial solo «Solicitud recibida». Sin botones, formularios, campos ni marcadores de diagnóstico, costo o notas.
- **5.x Navegación.** Las filas del directorio y las recientes del panel tienen ahora un único enlace real «Ver detalle» cuyo objetivo cubre toda la fila (sin `div onClick`); «← Volver al listado». La búsqueda y la página no se guardan ni en la URL ni en almacenamiento (probado). El destino usa el UUID, nunca el código de seguimiento.
- **6.x Privacidad.** Regresión de `SC-11`: una orden poblada visible en administración no expone nada en `PublicOrderView` (integración) ni en la consulta pública (E2E); el módulo público no importa nada administrativo (comprobado por una prueba).
- **7.x Pruebas.** Unitarias (dominio, caso de uso y presentación), 12 de integración (PostgreSQL real) y 28 E2E (escritorio y móvil). `TRACEABILITY.md`: `SC-03` verificado, `SC-10` parcial y evidencia añadida a `SC-11`/`SC-12`.
- **Correcciones de pruebas de CHG-09a.** Un fallo intermitente de un E2E de CHG-09a (buscar `{tag} munoz` no es subcadena contigua de «{tag} Carlos Muñoz» y la aserción pasaba por casualidad con el resultado anterior) se corrigió: el nombre es contiguo y cada interacción espera la respuesta de la Server Action y el fin del estado pendiente.
- **Observación operativa.** Las pruebas de integración locales y el CI comparten la rama Neon `test`: ejecutar una mientras corre la otra (p. ej. el CI de `main` tras fusionar) provoca fallos espurios. Esperar a que termine el CI antes de ejecutar `test:integration` en local.
