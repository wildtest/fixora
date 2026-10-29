# Trazabilidad de criterios (SC-01…SC-20, E1…E17)

> Creado por CHG-03 (`ci-quality-gates`) con los dueños primarios de `docs/04-planificacion/BACKLOG.md` §11; CHG-15 lo completa. **No copia el texto de los criterios**: la fuente es `docs/01-producto/PRD.md`. Cada change funcional añade aquí sus pruebas.

## Cómo se mantiene

- **Estados:** `pendiente` · `parcial` (hay evidencia de soporte, el cierre es de otro change) · `implementado` (la prueba existe y pasa) · `verificado` (cerrado por el dueño primario con su evidencia final).
- **Evidencia:** mientras el estado sea `pendiente`, la columna describe la evidencia final prevista. Con estado `parcial`, `implementado` o `verificado`, debe citar al menos una ruta de prueba o de documento **entre comillas invertidas** que exista.
- **Etiquetas en pruebas:** una prueba puede llevar `[SC-xx]` o `[Ex]` en su título; el script comprueba que el identificador exista.
- **Verificación ligera:** `npm run test:trace` (`scripts/check-traceability.ts`). Detecta identificadores desconocidos, duplicados o ausentes, filas sin dueño, estados fuera del vocabulario, rutas inexistentes cuando el estado exige evidencia y etiquetas con IDs inexistentes.
- **Cobertura y trazabilidad son compuertas distintas:** un 100 % de cobertura de código no demuestra ningún criterio `SC`/`E`, y una fila `verificado` no sustituye al umbral de cobertura.

## Criterios de éxito

| ID | change dueño | nivel | prueba o evidencia | estado |
|---|---|---|---|---|
| SC-01 | CHG-05 | E2E; integración | `tests/e2e/register.spec.ts`; `tests/integration/registration.test.ts`; `src/application/register-repair.test.ts` — registro, código y confirmación (primer tramo de E2E-01; lo cierra CHG-11) | verificado |
| SC-02 | CHG-06 | E2E | `tests/e2e/track.spec.ts`; `tests/integration/tracking.test.ts` — consulta con el código, sin cuenta; estado, equipo, descripción, recorrido e historial | verificado |
| SC-03 | CHG-09b | E2E | `tests/e2e/admin-access.spec.ts`; `tests/e2e/admin-orders.spec.ts`; `tests/e2e/admin-order-detail.spec.ts` — inicio de sesión → localizar (directorio y panel) → abrir el detalle (CHG-08, CHG-09a, CHG-09b) | verificado |
| SC-04 | CHG-11 | E2E | E2E del ciclo completo (soporte: CHG-10) | pendiente |
| SC-05 | CHG-10 | unitaria | Pruebas de cancelación y estados finales | pendiente |
| SC-06 | CHG-10 | unitaria | Matriz de 64 pares y rechazo desde servidor | pendiente |
| SC-07 | CHG-11 | E2E; integración | Integración y E2E-01 (CHG-10 rechaza por defecto) | pendiente |
| SC-08 | CHG-11 | unitaria | Las cuatro pruebas de valores no publicados | pendiente |
| SC-09 | CHG-10 | unitaria | Pruebas de terminalidad por tipo de dato (soporte: CHG-11, 12, 13) | pendiente |
| SC-10 | CHG-11 | unitaria | `tests/e2e/admin-order-detail.spec.ts`; `src/app/admin/ordenes/[id]/order-detail-view.test.tsx` — presentación del historial administrativo de estados (CHG-09b); el historial compuesto con diagnóstico y costo lo cierra CHG-11 | parcial |
| SC-11 | CHG-06 | seguridad | `tests/integration/tracking.test.ts`; `tests/integration/admin-order-detail.test.ts`; `tests/e2e/track.spec.ts`; `src/app/_components/tracking-result.test.tsx` — prueba negativa sobre una orden poblada (núcleo; la verificación final es del Security Pass, CHG-14) | implementado |
| SC-12 | CHG-08 | seguridad | `tests/integration/admin-access.test.ts`; `tests/e2e/admin-access.spec.ts`; `tests/e2e/admin-order-detail.spec.ts`; `tests/e2e/admin-orders.spec.ts`; `src/application/admin/admin.test.ts` — acceso directo, cookie inventada, token inexistente/expirado y sesión eliminada no acceden; la matriz de autorización de acciones (`tests/integration/support/admin-action-matrix.ts`) la amplía cada change administrativo (núcleo; la verificación final es del Security Pass, CHG-14) | implementado |
| SC-13 | CHG-06 | unitaria | `tests/e2e/track.spec.ts`; `tests/integration/tracking.test.ts`; `src/application/track-order.test.ts` — respuesta uniforme para código inexistente y mal formado | verificado |
| SC-14 | CHG-02 | integración | `tests/integration/schema-and-constraints.test.ts`; `tests/integration/privileges.test.ts`; `tests/integration/transaction-and-lock.test.ts` — integración de persistencia contra PostgreSQL real (soporte: cada slice; cierre: CHG-15) | parcial |
| SC-15 | CHG-15 | revisión manual | `tests/e2e/public-entry.spec.ts`; `src/app/_components/public-entry.test.tsx`; `src/app/public-error.test.tsx` — evidencia parcial de CHG-04 (entrada pública: landing, navegación en dos etapas, 404, error, responsive sin desbordamiento); Revisión manual estructurada (soporte: CHG-04 y cada pantalla) | parcial |
| SC-16 | CHG-05 | unitaria | `tests/e2e/register.spec.ts`; `src/domain/repair/repair.test.ts`; `src/application/register-repair.test.ts` — validación por campo con resumen, sin orden | verificado |
| SC-17 | CHG-11 | E2E | E2E-01 | pendiente |
| SC-18 | CHG-14 | seguridad | Informe del Security Pass | pendiente |
| SC-19 | CHG-03 | inspección | `.github/workflows/ci.yml`; `docs/07-testing/CI-QUALITY-GATES.md` — PR #1 con static y db-tests en verde, cola de db-tests, protección de main | verificado |
| SC-20 | CHG-07 | smoke | Smoke de Production (cierre: CHG-15) | pendiente |

## Casos borde

| ID | change dueño | nivel | prueba o evidencia | estado |
|---|---|---|---|---|
| E1 | CHG-05 | E2E; integración | `tests/integration/registration.test.ts`; `tests/e2e/register.spec.ts` — idempotencia: replay, envío simultáneo y doble envío en navegador | verificado |
| E2 | CHG-05 | E2E | `tests/e2e/register.spec.ts` — la confirmación muestra el código y el aviso de conservarlo; no se restaura al salir ni recargar | verificado |
| E3 | CHG-05 | unitaria | `src/domain/repair/repair.test.ts`; `tests/e2e/register.spec.ts` — validadores puros (soporte: CHG-13 para el administrador) | implementado |
| E4 | CHG-06 | unitaria | `tests/e2e/track.spec.ts`; `tests/integration/tracking.test.ts` — código inexistente: mismo aviso, sin datos de ninguna orden | verificado |
| E5 | CHG-11 | unitaria | Pruebas de publicación en `CANCELADO` (soporte: CHG-10) | pendiente |
| E6 | CHG-06 | E2E | `tests/e2e/track.spec.ts`; `src/app/_components/tracking-result.test.tsx` — vacío informativo sin secciones rotas (lo completan CHG-11 y CHG-12) | parcial |
| E7 | CHG-09a | integración | `tests/integration/admin-orders.test.ts`; `tests/e2e/admin-orders.spec.ts` — búsqueda sin resultados: estado vacío, no error | implementado |
| E8 | CHG-09a | unitaria | `src/domain/admin/order-directory.test.ts`; `tests/integration/admin-orders.test.ts` — orden estable por fecha de registro descendente y paginación de 20 | implementado |
| E9 | CHG-10 | unitaria | Pruebas de versión (soporte: CHG-11, 12, 13) | pendiente |
| E10 | CHG-08 | unitaria | `src/application/admin/admin.test.ts`; `tests/integration/admin-access.test.ts` — sesión inválida: SESSION_EXPIRED, la acción no se ejecuta y no deja estado parcial (soporte: cada mutación añade su acción a la matriz) | implementado |
| E11 | CHG-10 | E2E | E2E de los cuatro diálogos y comprobación en servidor | pendiente |
| E12 | CHG-12 | E2E; integración | Integración y E2E de notas | pendiente |
| E13 | CHG-10 | unitaria | Cancelación de una solicitud falsa; ausencia de anti-spam verificada en CHG-05 | pendiente |
| E14 | CHG-10 | unitaria | Advertencia del diálogo de cancelación (soporte: CHG-12) | pendiente |
| E15 | CHG-06 | unitaria | `src/domain/repair/tracking.test.ts`; `tests/integration/tracking.test.ts`; `tests/e2e/track.spec.ts`; `src/domain/admin/order-directory.test.ts` — normalización exacta: espacio exterior y mayúsculas/minúsculas ASCII (apoyo: la búsqueda administrativa por código) | verificado |
| E16 | CHG-05 | unitaria | `src/domain/repair/repair.test.ts` — alfabeto, formato y generación sin sesgo del código | verificado |
| E17 | CHG-05 | unitaria | `tests/integration/registration.test.ts` — unicidad, colisión y código no reemplazable por el rol de aplicación (soporte: CHG-13: no editable) | implementado |
