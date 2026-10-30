# Tasks

> Planificación únicamente. **Todas las tareas son futuras: se ejecutan en la Fase 7**, tras revisión, aprobación y autorización explícita de `/opsx:apply`, con CHG-14 completado, Production operativa, CHG-07 operativo, resultados de AV-3 y un CI real. Ninguna se ha ejecutado: no existe evidencia, ningún criterio está en PASS, no hay estado de release y **M5 no se ha alcanzado**. Cada tarea indica **EJECUTAR EN FASE 7**. CHG-15 reúne, comprueba y documenta; no es dueño de ningún comportamiento ni cambia lo observable: un fallo que lo exija se enruta a un change correctivo funcional. Sin dependencias nuevas, sin funcionalidad nueva, sin Sentry/analíticas/OTel.

## 1. Preflight y dependencias

- [x] 1.1 EJECUTAR EN FASE 7: confirmar el DoR (CHG-14 cerrado con Critical = 0, High = 0 y violaciones de `SC-11`/`SC-12` = 0 abiertas; Production operativa; CHG-07 operativo; resultados de AV-3; CI real disponible); se verifica con una nota de aprobación y el informe de `docs/08-seguridad/`.

## 2. Estructura de trazabilidad

- [x] 2.1 EJECUTAR EN FASE 7: completar `docs/07-testing/TRACEABILITY.md` para `SC-01…SC-20` y `E1…E17` con dueño, nivel, evidencia, ubicación, estado y observaciones, sin copiar el texto del PRD ni inventar reglas; se verifica con `npm run test:trace` (completitud estructural) y la revisión manual de que cada estado se apoya en evidencia real y no en la presencia del ID.

## 3. Verificar `SC-14`

- [x] 3.1 EJECUTAR EN FASE 7: reunir y ejecutar la evidencia automatizada de persistencia (la orden creada y sus cambios de estado, diagnóstico, costo, notas y datos básicos persisten y se recuperan en consultas posteriores); se verifica con las pruebas de integración en verde registradas en `TRACEABILITY.md`.

## 4. Verificar `E2E-01` y `SC-17`

- [x] 4.1 EJECUTAR EN FASE 7: confirmar que `E2E-01` (propiedad de CHG-11) existe y pasa en la implementación real, sin rediseñar el flujo ni exigir `ENTREGADO`; se verifica con la ejecución en verde de Playwright y el enlace saneado en `TRACEABILITY.md`.

## 5. Inspeccionar `SC-19`

- [x] 5.1 EJECUTAR EN FASE 7: inspeccionar el pipeline de CHG-03/07 y reunir la evidencia de ejecuciones reales de GitHub Actions (`static`, `db-tests`, regresión de seguridad, build, workflows de despliegue y migración, protección de `main` y comprobaciones requeridas), respetando el alcance de entrega continua aprobado; se verifica con la nota de inspección y los enlaces saneados.

## 6. Revisión responsive de `SC-15`

- [x] 6.1 EJECUTAR EN FASE 7: preparar `docs/07-testing/SC-15-RESPONSIVE-REVIEW.md` con la lista de flujos públicos y administrativos, viewports (escritorio y móvil según la matriz de Playwright), acciones y criterios (flujo completable, acciones visibles y utilizables, sin desplazamiento horizontal, Público antes que Interno en móvil, Journey, diálogos, formularios); se verifica con la revisión del documento.
- [x] 6.2 EJECUTAR EN FASE 7: realizar la revisión manual estructurada en escritorio y móvil, registrar PASS/FAIL, observaciones y evidencia saneada, y corregir o enrutar los fallos; se verifica con el documento completo y sin fallos abiertos.

## 7. *Seed* ficticio

- [x] 7.1 EJECUTAR EN FASE 7: implementar `seed:demo` con datos exclusivamente ficticios, mediante los casos de uso reales, en un conjunto pequeño de estados útiles, ejecutable solo de forma explícita con confirmación del entorno, prohibido en `test`, sin claves de idempotencia predecibles, sin credenciales y sin código fijo en el repositorio; se verifica con una ejecución en `development` y la revisión de que no se ejecuta en migraciones, build, arranque ni despliegue.
- [x] 7.2 EJECUTAR EN FASE 7: definir y verificar el mecanismo contra una segunda carga y elegir el código de la orden demo como `SMOKE_TRACKING_CODE` (secreto de GitHub) sin imprimirlo ni escribirlo en el repositorio; se verifica con la revisión del repositorio, los logs y la configuración del secreto.

## 8. Smoke de Production (`SC-20`)

- [x] 8.1 EJECUTAR EN FASE 7: reutilizar el proyecto/mecanismo `test:smoke` establecido por CHG-07 y extender solo las aserciones necesarias para la evidencia final aprobada (consulta por la UI real de la orden demo y `/admin/**` sin sesión sin contenido administrativo, además de `/`, `/registrar`, `/consultar` y cabeceras públicas), sin recrear su infraestructura y manteniéndolo no mutante, sin inicio de sesión, sin contraseña de Production en CI y sin el código en URL, nombres de pruebas, salidas o *traces* públicos; se verifica con la revisión del proyecto y una ejecución contra un entorno no productivo.
- [x] 8.2 EJECUTAR EN FASE 7: ejecutar el smoke contra la URL pública de Production y registrar la evidencia saneada de `SC-20` (un estado «Ready» de Vercel no basta); se verifica con la ejecución en verde y el registro en `docs/09-deploy/`.

## 9. Flujo manual de cierre

- [x] 9.1 EJECUTAR EN FASE 7: ejecutar manualmente en Production, solo con datos ficticios, el flujo registro → administrador → cambio → consulta pública y registrar la evidencia saneada; se verifica con el documento en `docs/09-deploy/`, sin secretos, tokens, códigos reales ni PII.

## 10. Runbooks RB-1…RB-9

- [x] 10.1 EJECUTAR EN FASE 7: documentar en `docs/09-deploy/` los runbooks RB-1 (rollback de aplicación), RB-2 (migración fallida o parcial), RB-3 (recuperación/rotación del administrador) y RB-4 (limitador, `SERVICE_UNAVAILABLE`, Neon), con comandos concretos validados en el entorno correspondiente; se verifica con la revisión contra TD §26 y §27.
- [x] 10.2 EJECUTAR EN FASE 7: documentar RB-5 (tracking code comprometido, sin rotación), RB-6 (dato sensible publicado), RB-7 (incidente y rotación de credenciales), RB-8 (indisponibilidad o cuota de Neon/Vercel) y RB-9 (inundación de solicitudes, `E13` vigente), sin nuevas funciones de producto; se verifica con la revisión de que ninguno introduce UI, endpoints, rotación de códigos ni borrado normal.

## 11. Verificar el procedimiento *break-glass*

- [x] 11.1 EJECUTAR EN FASE 7: documentar el procedimiento de redacción/eliminación de privacidad fuera del producto (rol operativo separado, confirmación del entorno, postura de respaldo, orden de claves foráneas, revisión de todas las copias y ramas, *dry run*, verificación posterior) y ensayarlo de forma segura en `development`; se verifica con el ensayo registrado y la comprobación de que no se crea botón, endpoint ni Server Action.

## 12. Plan de retiro de la demo

- [x] 12.1 EJECUTAR EN FASE 7: documentar el plan de retiro con su disparador operativo y su checklist (acceso público, recursos de datos, secretos y variables, recursos innecesarios), sin fecha inventada y sin afirmar que Production contiene solo datos ficticios; se verifica con la revisión del documento.

## 13. Riesgos residuales y `VAL-04`

- [x] 13.1 EJECUTAR EN FASE 7: listar en el artefacto de release los riesgos residuales aceptados de TD §27 y del PRD y registrar `VAL-04` como abierto y prerrequisito de cualquier uso operacional real, sin afirmaciones legales ni de cumplimiento; se verifica con la revisión de que no se afirma riesgo cero ni aprobación para operación real.

## 14. Ensamblar la evidencia de release

- [x] 14.1 EJECUTAR EN FASE 7: ensamblar el checklist final (código y CI, migraciones, Production, Security Pass, `SC-14`, `SC-15`, `SC-17`, `SC-19`, `SC-20`, trazabilidad, runbooks, seed, aviso de demostración, plan de retiro, riesgos y `VAL-04`) enlazando la evidencia sin duplicar la trazabilidad, y revisar la observabilidad suficiente para la demo; se verifica con el documento y la revisión del saneado.

## 15. Decisión de release

- [x] 15.1 EJECUTAR EN FASE 7: decidir el estado de release («listo para evaluación académica / demo» solo si todas las puertas pasan; «no listo» si alguna falla, sin esconder fallos); se verifica con el registro de la decisión que distingue explícitamente la demo de «aprobado para operación real».

## 16. Verificación y cierre

- [x] 16.1 EJECUTAR EN FASE 7: ejecutar `npm run lint`, `typecheck`, `test:unit`, `test:integration`, `test:e2e`, `test:trace` y `build`, y revisar el alcance del diff (sin funcionalidad nueva, sin dependencias, sin archivos de specs); se verifica con las ejecuciones en verde, `git diff` y `openspec validate release-readiness --strict`.
- [x] 16.2 EJECUTAR EN FASE 7: confirmar la puerta de salida y que M5 solo se declara cuando se cumple el DoD; se verifica con el documento de release.

## Estado de la ejecución (2026-10-29)

- **21/21 completadas.** `8.2`, `9.1`, `14.1`, `15.1` y `16.2` se cerraron con la ejecución manual del propietario en Production (datos ficticios): smoke 16/16 con la orden demo, flujo de cierre, cookie y Runtime Logs; evidencia saneada en `docs/09-deploy/RELEASE-READINESS.md` §3. Decisión: **listo para evaluación académica / demo**, nunca «aprobado para operación real» (`VAL-04` abierta).
- `7.2`: `SMOKE_TRACKING_CODE` se pasó por variable de entorno local del propietario; no se define como secreto de GitHub (el agente no escribe secretos) y el código nunca se imprime.
- `7.1`: `seed:demo` se implementó como proyecto `seed` de Vitest (reutiliza los casos de uso reales); se ensayó en `development`.
- `6.2`: revisión estructurada guiada por automatización con inspección visual de capturas; no es un estudio de usabilidad (`VAL-03` abierta).

## Workflow follow-up

- Revisar y aprobar el change; el usuario autoriza `/opsx:apply` en la Fase 7 con el DoR cumplido.
- Sin delta specs: no se crean ni modifican capabilities.
- Un fallo que exija comportamiento observable nuevo abre un change correctivo funcional; el release permanece NO LISTO hasta su resolución.
