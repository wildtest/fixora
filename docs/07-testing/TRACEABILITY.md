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
| SC-01 | CHG-05 | E2E; integración | E2E de registro e integración del caso de uso | pendiente |
| SC-02 | CHG-06 | E2E | E2E de consulta | pendiente |
| SC-03 | CHG-09b | E2E | E2E: inicio de sesión → localizar → abrir detalle (soporte: CHG-08, 09a) | pendiente |
| SC-04 | CHG-11 | E2E | E2E del ciclo completo (soporte: CHG-10) | pendiente |
| SC-05 | CHG-10 | unitaria | Pruebas de cancelación y estados finales | pendiente |
| SC-06 | CHG-10 | unitaria | Matriz de 64 pares y rechazo desde servidor | pendiente |
| SC-07 | CHG-11 | E2E; integración | Integración y E2E-01 (CHG-10 rechaza por defecto) | pendiente |
| SC-08 | CHG-11 | unitaria | Las cuatro pruebas de valores no publicados | pendiente |
| SC-09 | CHG-10 | unitaria | Pruebas de terminalidad por tipo de dato (soporte: CHG-11, 12, 13) | pendiente |
| SC-10 | CHG-11 | unitaria | Historial público y administrativo (soporte: CHG-09b, 10) | pendiente |
| SC-11 | CHG-06 | seguridad | Prueba negativa con orden poblada y Security Pass (soporte: todo change que toque lo público; verificación: CHG-14) | pendiente |
| SC-12 | CHG-08 | seguridad | Prueba parametrizada de acciones sin sesión y Security Pass (soporte: todo change administrativo; verificación: CHG-14) | pendiente |
| SC-13 | CHG-06 | unitaria | Prueba de código inexistente | pendiente |
| SC-14 | CHG-02 | integración | `tests/integration/schema-and-constraints.test.ts`; `tests/integration/privileges.test.ts`; `tests/integration/transaction-and-lock.test.ts` — integración de persistencia contra PostgreSQL real (soporte: cada slice; cierre: CHG-15) | parcial |
| SC-15 | CHG-15 | revisión manual | Revisión manual estructurada (soporte: CHG-04 y cada pantalla) | pendiente |
| SC-16 | CHG-05 | unitaria | Validación por campo | pendiente |
| SC-17 | CHG-11 | E2E | E2E-01 | pendiente |
| SC-18 | CHG-14 | seguridad | Informe del Security Pass | pendiente |
| SC-19 | CHG-03 | inspección | Inspección del pipeline | pendiente |
| SC-20 | CHG-07 | smoke | Smoke de Production (cierre: CHG-15) | pendiente |

## Casos borde

| ID | change dueño | nivel | prueba o evidencia | estado |
|---|---|---|---|---|
| E1 | CHG-05 | E2E; integración | Integración de idempotencia y E2E de doble envío | pendiente |
| E2 | CHG-05 | E2E | E2E de confirmación | pendiente |
| E3 | CHG-05 | unitaria | Validadores (soporte: CHG-13 para el administrador) | pendiente |
| E4 | CHG-06 | unitaria | Prueba de código inexistente | pendiente |
| E5 | CHG-11 | unitaria | Pruebas de publicación en `CANCELADO` (soporte: CHG-10) | pendiente |
| E6 | CHG-06 | E2E | E2E de ausencia de datos (completan CHG-11 y CHG-12) | pendiente |
| E7 | CHG-09a | integración | Integración de búsqueda y vacío | pendiente |
| E8 | CHG-09a | unitaria | Orden y paginación | pendiente |
| E9 | CHG-10 | unitaria | Pruebas de versión (soporte: CHG-11, 12, 13) | hecho |
| E10 | CHG-08 | unitaria | Sesión inválida sin estado parcial (soporte: cada mutación) | pendiente |
| E11 | CHG-10 | E2E | E2E de los cuatro diálogos y comprobación en servidor | pendiente |
| E12 | CHG-12 | E2E; integración | Integración y E2E de notas | pendiente |
| E13 | CHG-10 | unitaria | Cancelación de una solicitud falsa; ausencia de anti-spam verificada en CHG-05 | pendiente |
| E14 | CHG-10 | unitaria | Advertencia del diálogo de cancelación (soporte: CHG-12) | pendiente |
| E15 | CHG-06 | unitaria | Normalización exacta (soporte: CHG-09a) | pendiente |
| E16 | CHG-05 | unitaria | Pruebas del alfabeto y del formato | pendiente |
| E17 | CHG-05 | unitaria | Inmutabilidad del código (soporte: CHG-13: no editable) | pendiente |
