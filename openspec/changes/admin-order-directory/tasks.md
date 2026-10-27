# Tasks

> Planificación únicamente. Nada de esto se ejecuta hasta que el change esté revisado, aprobado y el usuario autorice `/opsx:apply` en la Fase 7, **con CHG-02, CHG-05 y CHG-08 aplicados y AV-2 aprobado**. No se agregan dependencias. No hay detalle de orden, mutaciones, notas, reportes ni REST.
>
> **Dependencia de Spec-base futura:** CHG-09b puede materializarse mientras CHG-09a esté activo (patrón validado de *Modified Capability + ADDED Requirements*). **CHG-09a debe implementarse, verificarse y archivarse antes de archivar o aplicar CHG-09b.**

## 1. Preflight y dependencias

- [ ] 1.1 Confirmar el DoR (CHG-05 y CHG-08 implementados y archivados, AV-2 aprobado con el escape de comodines y la columna de búsqueda); se verifica con una nota de aprobación en el change.
- [ ] 1.2 Confirmar que la primitiva pura compartida de normalización del nombre (introducida por CHG-05) existe y es la única implementación usada también por la búsqueda; se verifica con la revisión del diff y sin crear una segunda versión.

## 2. Modelo de lectura

- [ ] 2.1 Definir `AdminOrderListItem`, `AdminOrderPage` y `AdminDashboardDTO` con lista positiva en un módulo administrativo distinto del público; se verifica con una prueba de que solo existen las claves permitidas.
- [ ] 2.2 Implementar el repositorio administrativo de lectura con proyección mínima (conteos agrupados por estado, cinco recientes y página filtrada), sin cargar descripción, diagnóstico, costo, notas, historiales, teléfono, correo ni `version`; se verifica con pruebas de integración y la revisión de la consulta emitida.

## 3. Panel

- [ ] 3.1 Implementar el caso de uso del panel (ocho estados completados con cero, cinco recientes) tras `requireAdmin()`; se verifica con pruebas de integración de conteos, estados en cero, máximo cinco y orden.
- [ ] 3.2 Implementar ADM-02 en `/admin` con una tarjeta por estado, enlace «Ver en el listado» con el filtro en la URL, «Ver todas» y estado vacío, sin métricas y sin control de detalle; se verifica con Playwright en móvil y escritorio.

## 4. Directorio, búsqueda, filtro y paginación

- [ ] 4.1 Implementar el parseo y la validación (búsqueda, estado del enum, página) y la clasificación código-frente-a-nombre; se verifica con pruebas unitarias de vacío, código con minúsculas y espacios, código parcial, nombre, estado inválido y páginas no enteras, cero, negativas o NaN.
- [ ] 4.2 Implementar la búsqueda exacta por código y parcial por nombre sobre `customer_name_search`, normalizando el texto con la primitiva compartida y con escape explícito de `%`, `_` y `\`; se verifica con pruebas de integración (`Muñoz`/`munoz`, comodines literales, el código parcial no coincide).
- [ ] 4.3 Implementar el filtro por estado combinado por `AND`, el total del conjunto filtrado, `pageSize = 20`, el orden `created_at DESC, id DESC` y la página fuera de rango; se verifica con pruebas de integración (búsqueda + filtro, segunda página, desempate con igual `created_at`, sin resultados).
- [ ] 4.4 Implementar el caso de uso único para la carga inicial y la Server Action de lectura, con `requireAdmin()` y `AdminContext` en cada acción; se verifica con una prueba parametrizada de que sin sesión válida no se entregan datos (regresión de `SC-12`).

## 5. UI del directorio

- [ ] 5.1 Implementar ADM-03 en `/admin/ordenes`: búsqueda con etiqueta y ayuda, filtro (chips en escritorio, *select* en móvil), order rows/cards con código, fecha, cliente, equipo y estado (badge y texto), paginación al pie, estado vacío y error seguro, sin fila clicable ni «Ver detalle» (CHG-09b); se verifica con Playwright y la revisión contra DESIGN §6.7, §6.14 y §6.16.
- [ ] 5.2 Mantener solo el filtro de estado en la URL y la búsqueda y la página en estado de interacción; se verifica con Playwright que el texto buscado nunca aparece en la URL.
- [ ] 5.3 Presentar las fechas en `America/Lima` con formato `DD/MM/AAAA HH:mm`; se verifica con una prueba unitaria del formateo.

## 6. Privacidad y caché

- [ ] 6.1 Verificar que no hay `use cache`, ISR ni caché compartida en el panel y el directorio, y que los registros no contienen el texto buscado, nombres, códigos ni datos devueltos; se verifica con la inspección de cabeceras y pruebas con valores canario.

## 7. Pruebas y trazabilidad

- [ ] 7.1 Completar las pruebas Playwright del recorrido (inicio de sesión, panel, directorio, buscar por código y por nombre, filtrar, combinar, paginar, vacío, móvil y escritorio sin desbordamiento); se verifica con las ejecuciones en verde.
- [ ] 7.2 Actualizar `TRACEABILITY.md` con `SC-03` (parcial), `E7`, `E8` y apoyo de `E15`, y la contribución a `E2E-01`; se verifica con `npm run test:trace`.

## 8. Verificación final

- [ ] 8.1 Ejecutar `npm run lint`, `typecheck`, `test:unit`, `test:integration`, `test:e2e` y `build`; se verifica con las ejecuciones en verde.
- [ ] 8.2 Revisar el alcance del diff: sin detalle de orden, mutaciones, notas, reportes, REST ni filtros u ordenamientos adicionales; se verifica con `git diff` y `openspec validate admin-order-directory --strict`.

## Workflow follow-up

- Revisar y aprobar el change; el usuario autoriza `/opsx:apply` en la Fase 7 con el DoR cumplido.
- Archivar tras implementar y verificar: crea la main spec `admin-order-management` **antes** de archivar CHG-09b.
