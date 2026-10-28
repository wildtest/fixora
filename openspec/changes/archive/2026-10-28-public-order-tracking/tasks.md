# Tasks

> Planificación únicamente. Nada de esto se ejecuta hasta que el change esté revisado, aprobado y el usuario autorice `/opsx:apply` en la Fase 7, **con CHG-01, CHG-02, CHG-03, CHG-04 y CHG-05 aplicados**. No se agregan dependencias. No hay publicación de diagnóstico o costo, notas, transiciones ni administración.
>
> **Dependencia de Spec-base:** CHG-06 pudo materializarse con CHG-05 activo porque OpenSpec 1.15.0 se validó con *Modified Capability + ADDED Requirements* frente a un predecesor activo. **CHG-05 MUST be archived before CHG-06** (nunca se archiva CHG-06 antes).

## 1. Preflight y dependencia

- [x] 1.1 Confirmar el DoR (CHG-05 implementado, verificado y **archivado**, de modo que `openspec/specs/public-order-tracking/` existe; CHG-01…04 aplicados; AV-1 y AV-2 aprobados); se verifica con una nota de aprobación en el change y `openspec list --specs`.
- [x] 1.2 Releer la guía de Server Actions, Cache Components y almacenamiento en caché en `node_modules/next/dist/docs/`; se verifica con una nota de decisiones de implementación.

## 2. Normalización del código

- [x] 2.1 Implementar la función pura de normalización y validación del código (espacio exterior, ASCII `a–z`→`A–Z`, longitud 12, alfabeto exacto, sin otras correcciones); se verifica con pruebas unitarias de válidos, minúsculas, espacios exteriores, interiores, guiones, O/0, longitud y caracteres Unicode.

## 3. Caso de uso y limitador

- [x] 3.1 Implementar el caso de uso público de seguimiento con el orden seguro de D3 (sujeto → limitador → normalizar → buscar → registrar fallo), usando la primitiva de CHG-02 con la política 10 fallos / 10 min / bloqueo 15 min; se verifica con pruebas de integración de éxito, inexistente, mal formado, bloqueo y reanudación.
- [x] 3.2 Implementar los resultados tipados `TRACKING_NOT_FOUND`, `RATE_LIMITED` y `SERVICE_UNAVAILABLE` con `ActionResult`; se verifica con pruebas de que mal formado e inexistente devuelven el mismo código y de que no hay `throw` en el flujo esperado.
- [x] 3.3 Implementar la falla cerrada cuando el limitador no está disponible; se verifica con una prueba de integración que lo fuerza y comprueba que no se consulta ninguna orden.
- [x] 3.4 Obtener el sujeto mediante la abstracción de infraestructura de IP, sin almacenar la IP en claro; se verifica con una prueba de que solo se persiste el HMAC.

## 4. Proyección pública

- [x] 4.1 Implementar el repositorio público con selección de columnas permitidas y eventos de estado, y el mapeo a `PublicOrderView` propiedad por propiedad; se verifica con la prueba negativa de `SC-11` sobre una orden poblada (incluidos diagnóstico, costo, notas internas e ids) y con la regla de importaciones restringidas.
- [x] 4.2 Confirmar que no se cargan `customer_*`, `version`, diagnóstico, costo ni notas, y que `repairDetails` y `publicNotes` no existen aún; se verifica con la revisión del diff y de la consulta emitida.

## 5. Acción y UI de consulta

- [x] 5.1 Implementar la Server Action adaptadora con cuerpo explícito (sin `FormData` indiscriminado, sin REST), con la lectura de cabeceras fuera de `runAction`; se verifica con pruebas de integración y la ausencia de `/api/tracking`.
- [x] 5.2 Implementar PUB-04 (campo, ayuda, «Consultar estado» deshabilitado durante la petición) y sus estados: idle, enviando, no encontrado, `RATE_LIMITED`, `SERVICE_UNAVAILABLE` y error inesperado; se verifica con Playwright y la revisión contra DESIGN §13.2 y Apéndice A.5.
- [x] 5.3 Implementar PUB-05: estado actual, datos del equipo, descripción, Repair Journey como componente de presentación, timeline de los eventos públicos de estado persistidos (más reciente primero; hoy solo el evento inicial) y vacío informativo de `E6`; se verifica con pruebas unitarias del Journey y Playwright en móvil y escritorio.
- [x] 5.4 Conectar «Consultar estado» de PUB-03 pasando el código en memoria; se verifica con Playwright que no aparece en la URL.

## 6. Secreto, caché y estado sensible

- [x] 6.1 Reiniciar el estado sensible al ocultarse y salir de `/consultar` (consciente de Activity); se verifica con Playwright (navegar fuera, Back, recarga) y el resultado de AV-1.
- [x] 6.2 Verificar que el código no está en URL, almacenamiento ni cookies, que la respuesta es dinámica y sin caché compartida (`Cache-Control` efectivo) y que los registros no contienen código, cuerpo ni IP; se verifica con Playwright, inspección de cabeceras y pruebas con valores canario.

## 7. Pruebas y trazabilidad

- [x] 7.1 Completar las pruebas unitarias, de integración y Playwright descritas en `design.md`, incluido que no hay desbordamiento horizontal; se verifica con las ejecuciones en verde.
- [x] 7.2 Actualizar `TRACEABILITY.md` con la evidencia de `SC-02`, `SC-11`, `SC-13`, `E4`, `E15` y parcial de `E6`; se verifica con `npm run test:trace`.

## 8. Verificación final

- [x] 8.1 Ejecutar `npm run lint`, `typecheck`, `test:unit`, `test:integration`, `test:e2e` y `build`; se verifica con las ejecuciones en verde.
- [x] 8.2 Revisar el alcance del diff contra la proposal y la spec: sin diagnóstico/costo públicos, notas, transiciones, administración ni recuperación de código; se verifica con `git diff` y `openspec validate public-order-tracking --strict`.

## Notas de implementación (2026-10-28)

- **1.1 DoR.** CHG-05 implementado, verificado y archivado (`openspec/specs/public-order-tracking/` existe con los cuatro requisitos de identidad del código); CHG-01…04 archivados; `main` d10ef81. El usuario autorizó la ejecución autónoma de CHG-06.
- **1.2 Next.** Leídas las guías de Server Actions/formularios y de caché (`node_modules/next/dist/docs/01-app/`). La acción recibe un único argumento de texto (nunca `FormData` indiscriminado) y lee `headers()` en el adaptador, fuera de `runAction`. Las Server Actions responden con `Cache-Control` de no almacenamiento: se comprueba en E2E sobre la respuesta real. No se usa `use cache`; el shell de `/consultar` es estático y el resultado vive solo en el estado del cliente.
- **Alcance real de la proyección.** `PublicOrderView` = código, estado, equipo (tipo, marca, modelo o `null`), descripción y eventos públicos de estado (solo `status` y `occurredAt`, más reciente primero, desempate determinista). El repositorio hace UNA consulta que selecciona solo esas columnas; nunca carga `customer_*`, `id`, `version`, `diagnosis`, `estimated_cost`, notas ni historiales administrativos. **Diagnóstico y costo NO se publican en este change aunque existan en la orden y aunque esté en `ESPERANDO_APROBACION` o posterior: la publicación (y la regla de visibilidad por estado y cancelación) es de CHG-11** (design.md D6 y «Fuera de alcance»). Hoy ningún estado los expone y la prueba lo verifica con una orden poblada en seis estados.
- **Estructura.** Dominio puro en `src/domain/repair/`: normalización exacta, estados y etiquetas, fecha en hora de Perú, `PublicOrderView` y `buildJourney` (presentación; no valida transiciones). Caso de uso `trackOrder` y composición de producción en `src/application/`; repositorio `src/infrastructure/tracking/public-order-store.ts`; sujeto del limitador en `src/infrastructure/security/client-subject.ts` (`x-vercel-forwarded-for`; sin cabecera, un sujeto compartido; IPv6 por prefijo sigue diferido a la Spec de seguridad). UI en `src/app/(public)/consultar/` y componentes de presentación `RepairJourney`, `TrackingResult` y `LookupAlert`.
- **Limitador.** Reutiliza la primitiva de CHG-02 (`PUBLIC_TRACKING`, 10 fallos / 10 min / bloqueo 15 min). Mal formado e inexistente cuentan como fallo y devuelven el mismo `TRACKING_NOT_FOUND`; el acierto no cuenta; bloqueado → `RATE_LIMITED` sin tocar la tabla de órdenes; limitador no disponible (o sin configuración) → `SERVICE_UNAVAILABLE` sin consultar ninguna orden. Eventos operativos `lookup.rate_limited` y `limiter.unavailable` del catálogo de CHG-01, sin código ni origen.
- **Accesos.** `ENTRY_POINTS.consult.available = true` (solo la constante de CHG-06); el taller (CHG-08) sigue deshabilitado. Se actualizaron las pruebas de CHG-04/05 que asumían la consulta deshabilitada. «Consultar estado» de PUB-03 llama a la misma acción con el código en memoria y muestra PUB-05 dentro de `/registrar` (la URL no cambia; el estado se reinicia al salir).
- **Playwright.** Un solo worker siempre (los proyectos comparten base y limitador) y secreto del limitador efímero en local; cada prueba usa un origen propio mediante `x-vercel-forwarded-for`. El estado `SERVICE_UNAVAILABLE` se provoca renombrando temporalmente la tabla del limitador con la conexión del propietario de pruebas (siempre se restaura).
- **Pruebas.** 39 unitarias nuevas (normalización, Journey de los ocho estados, hora de Perú, orden seguro, fallos inesperados, render de PUB-05 con un objeto hostil), 21 de integración en PostgreSQL real (proyección sobre orden poblada en seis estados, respuesta uniforme, bloqueo a los 10 fallos y expiración a los 15 min, aciertos que no cuentan, HMAC sin IP en claro, falla cerrada, privilegios mínimos) y 16 pruebas E2E por proyecto (32 ejecuciones). Sin dependencias nuevas ni migraciones.

## Workflow follow-up

- Revisar y aprobar el change; el usuario autoriza `/opsx:apply` en la Fase 7.
- Archivar **después de CHG-05**: la delta añade sus requisitos a la main spec `public-order-tracking` ya creada por CHG-05.
