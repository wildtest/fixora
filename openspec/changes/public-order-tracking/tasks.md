# Tasks

> Planificación únicamente. Nada de esto se ejecuta hasta que el change esté revisado, aprobado y el usuario autorice `/opsx:apply` en la Fase 7, **con CHG-01, CHG-02, CHG-03, CHG-04 y CHG-05 aplicados**. No se agregan dependencias. No hay publicación de diagnóstico o costo, notas, transiciones ni administración.
>
> **Dependencia de Spec-base:** CHG-06 pudo materializarse con CHG-05 activo porque OpenSpec 1.15.0 se validó con *Modified Capability + ADDED Requirements* frente a un predecesor activo. **CHG-05 MUST be archived before CHG-06** (nunca se archiva CHG-06 antes).

## 1. Preflight y dependencia

- [ ] 1.1 Confirmar el DoR (CHG-05 implementado, verificado y **archivado**, de modo que `openspec/specs/public-order-tracking/` existe; CHG-01…04 aplicados; AV-1 y AV-2 aprobados); se verifica con una nota de aprobación en el change y `openspec list --specs`.
- [ ] 1.2 Releer la guía de Server Actions, Cache Components y almacenamiento en caché en `node_modules/next/dist/docs/`; se verifica con una nota de decisiones de implementación.

## 2. Normalización del código

- [ ] 2.1 Implementar la función pura de normalización y validación del código (espacio exterior, ASCII `a–z`→`A–Z`, longitud 12, alfabeto exacto, sin otras correcciones); se verifica con pruebas unitarias de válidos, minúsculas, espacios exteriores, interiores, guiones, O/0, longitud y caracteres Unicode.

## 3. Caso de uso y limitador

- [ ] 3.1 Implementar el caso de uso público de seguimiento con el orden seguro de D3 (sujeto → limitador → normalizar → buscar → registrar fallo), usando la primitiva de CHG-02 con la política 10 fallos / 10 min / bloqueo 15 min; se verifica con pruebas de integración de éxito, inexistente, mal formado, bloqueo y reanudación.
- [ ] 3.2 Implementar los resultados tipados `TRACKING_NOT_FOUND`, `RATE_LIMITED` y `SERVICE_UNAVAILABLE` con `ActionResult`; se verifica con pruebas de que mal formado e inexistente devuelven el mismo código y de que no hay `throw` en el flujo esperado.
- [ ] 3.3 Implementar la falla cerrada cuando el limitador no está disponible; se verifica con una prueba de integración que lo fuerza y comprueba que no se consulta ninguna orden.
- [ ] 3.4 Obtener el sujeto mediante la abstracción de infraestructura de IP, sin almacenar la IP en claro; se verifica con una prueba de que solo se persiste el HMAC.

## 4. Proyección pública

- [ ] 4.1 Implementar el repositorio público con selección de columnas permitidas y eventos de estado, y el mapeo a `PublicOrderView` propiedad por propiedad; se verifica con la prueba negativa de `SC-11` sobre una orden poblada (incluidos diagnóstico, costo, notas internas e ids) y con la regla de importaciones restringidas.
- [ ] 4.2 Confirmar que no se cargan `customer_*`, `version`, diagnóstico, costo ni notas, y que `repairDetails` y `publicNotes` no existen aún; se verifica con la revisión del diff y de la consulta emitida.

## 5. Acción y UI de consulta

- [ ] 5.1 Implementar la Server Action adaptadora con cuerpo explícito (sin `FormData` indiscriminado, sin REST), con la lectura de cabeceras fuera de `runAction`; se verifica con pruebas de integración y la ausencia de `/api/tracking`.
- [ ] 5.2 Implementar PUB-04 (campo, ayuda, «Consultar estado» deshabilitado durante la petición) y sus estados: idle, enviando, no encontrado, `RATE_LIMITED`, `SERVICE_UNAVAILABLE` y error inesperado; se verifica con Playwright y la revisión contra DESIGN §13.2 y Apéndice A.5.
- [ ] 5.3 Implementar PUB-05: estado actual, datos del equipo, descripción, Repair Journey como componente de presentación, timeline de los eventos públicos de estado persistidos (más reciente primero; hoy solo el evento inicial) y vacío informativo de `E6`; se verifica con pruebas unitarias del Journey y Playwright en móvil y escritorio.
- [ ] 5.4 Conectar «Consultar estado» de PUB-03 pasando el código en memoria; se verifica con Playwright que no aparece en la URL.

## 6. Secreto, caché y estado sensible

- [ ] 6.1 Reiniciar el estado sensible al ocultarse y salir de `/consultar` (consciente de Activity); se verifica con Playwright (navegar fuera, Back, recarga) y el resultado de AV-1.
- [ ] 6.2 Verificar que el código no está en URL, almacenamiento ni cookies, que la respuesta es dinámica y sin caché compartida (`Cache-Control` efectivo) y que los registros no contienen código, cuerpo ni IP; se verifica con Playwright, inspección de cabeceras y pruebas con valores canario.

## 7. Pruebas y trazabilidad

- [ ] 7.1 Completar las pruebas unitarias, de integración y Playwright descritas en `design.md`, incluido que no hay desbordamiento horizontal; se verifica con las ejecuciones en verde.
- [ ] 7.2 Actualizar `TRACEABILITY.md` con la evidencia de `SC-02`, `SC-11`, `SC-13`, `E4`, `E15` y parcial de `E6`; se verifica con `npm run test:trace`.

## 8. Verificación final

- [ ] 8.1 Ejecutar `npm run lint`, `typecheck`, `test:unit`, `test:integration`, `test:e2e` y `build`; se verifica con las ejecuciones en verde.
- [ ] 8.2 Revisar el alcance del diff contra la proposal y la spec: sin diagnóstico/costo públicos, notas, transiciones, administración ni recuperación de código; se verifica con `git diff` y `openspec validate public-order-tracking --strict`.

## Workflow follow-up

- Revisar y aprobar el change; el usuario autoriza `/opsx:apply` en la Fase 7.
- Archivar **después de CHG-05**: la delta añade sus requisitos a la main spec `public-order-tracking` ya creada por CHG-05.
