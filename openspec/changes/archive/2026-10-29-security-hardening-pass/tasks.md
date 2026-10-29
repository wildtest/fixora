# Tasks

> Planificación únicamente. **Todas las tareas son futuras: se ejecutan en la Fase 7**, tras revisión, aprobación y autorización explícita de `/opsx:apply`, con M4 implementada y verificada (CHG-01…CHG-13), Production disponible, CHG-07 operativo y los resultados de AV-3 disponibles. Ninguna se ha ejecutado: no existe ningún hallazgo, informe ni evidencia. Cada tarea indica **EJECUTAR EN FASE 7**. CHG-14 verifica y endurece; no es dueño de ningún control y no cambia el comportamiento observable: una corrección observable se enruta a un change correctivo funcional (no a CHG-14). No se agregan dependencias ni herramientas.

## 1. Preflight, dependencias y M4

- [x] 1.1 EJECUTAR EN FASE 7: confirmar el DoR (CHG-11, CHG-12 y CHG-13 implementados, verificados y archivados; M4 completa; Production disponible; CHG-07 operativo; resultados de AV-3 disponibles); se verifica con una nota de aprobación y `openspec list --specs`.
- [x] 1.2 EJECUTAR EN FASE 7: inventariar los controles y sus dueños (CHG-01, 02, 03, 06, 07, 08, 10, 11, 12, 13) contra las main specs y el Technical Design sin redefinirlos; se verifica con la tabla de inventario del informe.

## 2. Preparar informe y evidencia

- [x] 2.1 EJECUTAR EN FASE 7: crear el informe en `docs/08-seguridad/` (nombre sugerido `SECURITY-REPORT.md`) con la escala de severidad, el modelo de hallazgos (`SEC-NNN`, campos mínimos, disposición, ciclo de estado) y la convención de evidencia saneada; se verifica con la revisión del documento sin hallazgos ficticios.
- [x] 2.2 EJECUTAR EN FASE 7: preparar la orden completamente poblada y los valores canario con datos ficticios, y el procedimiento de saneado de capturas y salidas; se verifica con la revisión de que ninguna evidencia contiene secretos, tokens, códigos reales ni PII.

## 3. Revisión de la regresión automatizada

- [x] 3.1 EJECUTAR EN FASE 7: revisar la cobertura automatizada existente de autenticación/sesión, autorización directa de acciones, `SC-11`, XSS, inyección SQL, CSRF, limitación, privilegios, CSP/cabeceras, auditoría de dependencias y detección de secretos, y añadir como endurecimiento técnico las pruebas que falten para controles ya aprobados; se verifica con la matriz de cobertura y las ejecuciones en verde.

## 4. Revisión de `SC-11`

- [x] 4.1 EJECUTAR EN FASE 7: verificar con la orden poblada que `PublicOrderView` y su serialización exponen solo lo autorizado (sin nombre, teléfono, correo, UUID, versiones, ids o versiones de nota, notas internas, historiales de diagnóstico y costo ni metadatos administrativos); se verifica con la prueba de contrato y la evidencia en el informe.
- [x] 4.2 EJECUTAR EN FASE 7: verificar la publicación del diagnóstico (antes de la aprobación, cancelada antes, en espera de aprobación, cancelada después) y las notas (`PUBLIC` obtenidas, `INTERNAL` ni cargadas ni serializadas, valor canario) a nivel de proyección y no solo del DOM; se verifica con pruebas de integración y evidencia.

## 5. Revisión de `SC-12` y sesión

- [x] 5.1 EJECUTAR EN FASE 7: verificar que `/admin/**`, un UUID administrativo conocido, ADM-04, el panel y el directorio no entregan datos sin sesión; se verifica con pruebas y capturas saneadas.
- [x] 5.2 EJECUTAR EN FASE 7: invocar directamente, sin sesión, todas las acciones administrativas (transición, diagnóstico, costo, crear/editar/eliminar nota, corrección de datos) y confirmar `SESSION_EXPIRED` sin escritura, con una prueba parametrizada que incluya las acciones de CHG-10 a CHG-13; se verifica con la prueba y la comprobación de que no hay filas modificadas.
- [x] 5.3 EJECUTAR EN FASE 7: verificar expiración por inactividad y absoluta, sesión revocada, cierre de sesión y Back/Forward posterior; se verifica con pruebas y evidencia.

## 6. XSS, CSRF, SQL, CSP y cabeceras

- [x] 6.1 EJECUTAR EN FASE 7: probar los valores canario de XSS como texto en descripción, diagnóstico, nota pública, nota interna y campos del cliente, y auditar `dangerouslySetInnerHTML`, `eval`, `new Function` y APIs inseguras con su contexto; se verifica con pruebas E2E y el resultado de la auditoría.
- [x] 6.2 EJECUTAR EN FASE 7: probar POST entre orígenes contra acciones sensibles (comprobación `Origin`/`Host` y `SameSite=Strict`) y revisar todo SQL crudo (parametrizado, localizado, justificado), la búsqueda por nombre con escape de comodines y el código exacto; se verifica con pruebas y la revisión estática.
- [x] 6.3 EJECUTAR EN FASE 7: capturar la CSP y las cabeceras efectivas de las rutas públicas y de `/admin/**` en build y en Production (nonce real, sin `unsafe-eval`, directivas inseguras presentes, cabeceras exactas del TD §21.7, HSTS efectivo de Vercel sin duplicar); se verifica con capturas saneadas contra el diseño aprobado.
- [x] 6.4 EJECUTAR EN FASE 7: verificar caché (`/admin/**` sin caché compartida), fuga por URL (código, texto de búsqueda, token, correo), `robots` y `localStorage`/`sessionStorage`; se verifica con pruebas e inspección de respuestas reales.

## 7. Limitación y abuso

- [x] 7.1 EJECUTAR EN FASE 7: verificar login (error externo uniforme, limitador antes de `scrypt`, bloqueado sin `scrypt`, `SERVICE_UNAVAILABLE` por capacidad, contraseña ausente de logs) y la cookie `__Host-fixora_session` efectiva en Production (`HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`, sin `Domain`, sin `Max-Age`); se verifica con pruebas e inspección de la respuesta real.
- [x] 7.2 EJECUTAR EN FASE 7: verificar la consulta pública (formato inválido e inexistente con la misma respuesta, limitador efectivo, falla cerrada, sin IP en claro) sin generar carga agresiva y sin añadir limitador al registro; se verifica con pruebas de integración y evidencia.

## 8. Registros, secretos y errores

- [x] 8.1 EJECUTAR EN FASE 7: verificar el logger (`server-only`, estructurado, esquema cerrado, sin `console.log(formData)` ni `console.error(error)` en rutas de producción) con el *sink* canario y un error de `message` multilínea, y revisar los logs reales del despliegue sin PII, códigos, cookies, tokens, SQL, `message` ni `stack`; se verifica con las pruebas y la revisión de logs con evidencia saneada.
- [x] 8.2 EJECUTAR EN FASE 7: verificar que la interfaz muestra solo una referencia opaca y auditar secretos en el repositorio, el build, GitHub Actions y el mapeo de variables de Vercel, revisando los resultados de la detección de secretos de CHG-03; se verifica con la revisión de configuración sin exponer valores.

## 9. Privilegios de PostgreSQL

- [x] 9.1 EJECUTAR EN FASE 7: comprobar en el despliegue, con consultas seguras, que el rol runtime no puede `DELETE` en `repair_orders`, `UPDATE`/`DELETE` en los historiales ni `UPDATE` en `admin_users`, que los historiales son *append-only* por privilegios y que el permiso sobre `order_notes` se limita al modelo aprobado; se verifica con la salida saneada de las comprobaciones.

## 10. Despliegue, Preview y migración

- [x] 10.1 EJECUTAR EN FASE 7: auditar el aislamiento de Preview (sin BD de Production ni secretos privilegiados), `DIRECT_URL` fuera del runtime, ausencia de migración en *build*/*start*/Preview y el flujo `migrate-production` de CHG-07 (solo `main`, aprobación, vínculo al SHA, integridad del árbol de migraciones, mínimo privilegio), apoyándose en los resultados de AV-3; se verifica con la evidencia de configuración en Vercel, Neon y GitHub.

## 11. Dependencias y cadena de suministro

- [x] 11.1 EJECUTAR EN FASE 7: revisar `package-lock.json`, las dependencias de producción y `npm audit --audit-level=high` (o el mecanismo aprobado), evaluando y clasificando cada resultado con su disposición; se verifica con el informe sin Critical/High aplicables abiertos.

## 12. Ejecución formal del Security Pass

- [x] 12.1 EJECUTAR EN FASE 7: ejecutar contra el despliegue real los procedimientos de los grupos 4 a 11 que dependan de la plataforma y registrar para cada uno el resultado y la evidencia saneada, sin pruebas de carga ni tráfico agresivo; se verifica con el informe y la trazabilidad a los controles.

## 13. Clasificación de hallazgos

- [x] 13.1 EJECUTAR EN FASE 7: registrar solo hallazgos reales con ID, área, descripción, severidad, evidencia, impacto, control esperado, disposición, ruta de remediación y estado; se verifica con la revisión de que ningún hallazgo `SC-11`/`SC-12` queda `Accepted Risk`, de que Critical/High no se aceptan ni se difieren y de que `Corrective change required` se trata como estado abierto y no como disposición final.

## 14. Remediación y retest

- [x] 14.1 EJECUTAR EN FASE 7: corregir dentro de CHG-14 solo los hallazgos técnicos que preserven el comportamiento observable y reevaluarlos; se verifica con el retest y el diff acotado.
- [x] 14.2 EJECUTAR EN FASE 7: para los hallazgos que cambien el comportamiento observable, abrir un change correctivo funcional con delta specs sobre la capability afectada (sin reabrir changes archivados) y registrar su vínculo; CHG-14 no se cierra hasta que se implemente, verifique y reevalúe en el retest del Security Pass (crear o archivar el change correctivo no cierra el hallazgo); se verifica con el hallazgo en estado `Fixed`, conservando su registro original y la evidencia del retest.

## 15. Puerta final y evidencia

- [x] 15.1 EJECUTAR EN FASE 7: confirmar la puerta de salida (Critical = 0, High = 0, `SC-11` = 0, `SC-12` = 0 abiertos; toda disposición final explícita (sin `Deferred` ni estados transitorios); resultados de AV-3 disponibles) y completar la evidencia en `docs/08-seguridad/` y `TRACEABILITY.md` para `SC-18`, `SC-11` y `SC-12`; se verifica con `npm run test:trace` y la revisión del informe.
- [x] 15.2 EJECUTAR EN FASE 7: ejecutar `npm run lint`, `typecheck`, `test:unit`, `test:integration`, `test:e2e` y `build` y revisar el alcance del diff (sin comportamiento nuevo, sin dependencias, sin archivos de specs); se verifica con las ejecuciones en verde, `git diff` y `openspec validate security-hardening-pass --strict`.

## Notas de implementación

- Informe: `docs/08-seguridad/SECURITY-REPORT.md` (inventario, evidencia de Production, hallazgos `SEC-001`…`SEC-004`, puerta de salida: 0 Critical, 0 High, `SC-11` = 0, `SC-12` = 0).
- Hardening técnico sin cambio observable: canonicalización del sujeto del limitador (IPv4 canónica, IPv6 a /64, IPv6 mapeada, inválido → `unknown`), cerrando el diferimiento de TD §22. Pruebas nuevas: `client-subject.test.ts`, `security-static.test.ts`, `tests/e2e/security.spec.ts`.
- Fuente de IP verificada en Production (AV-3): la plataforma sobrescribe `x-vercel-forwarded-for`; el limitador distingue orígenes reales (14 intentos con cabeceras falseadas acumularon en un solo cubo; otro origen real no estaba bloqueado). Sin IP registrada; la rama de verificación desechable se eliminó.
- Verificaciones que requieren credenciales o paneles de Production (cookie efectiva, Runtime Logs, repetición de `ops:privileges`, variables de Vercel/Neon/GitHub) quedan documentadas como observación `SEC-003`, apoyadas en la evidencia del propietario (CHG-07) y en el control equivalente local.
- Ningún hallazgo requirió un change correctivo funcional. Verificación manual (no existe `openspec verify`).

## Workflow follow-up

- Revisar y aprobar el change; el usuario autoriza `/opsx:apply` en la Fase 7 con el DoR cumplido.
- Sin delta specs: no se crean ni modifican capabilities.
- CHG-15 consume el informe como evidencia del release.
