# Revisión independiente de código — final

> **Final Independent Code Review.** Fecha: 2026-10-31 · Código revisado: `main` `0f881f8`. Sin secretos, URL de conexión ni PII.

## 1. Alcance y modo del revisor

| Elemento | Detalle |
|---|---|
| **IMPLEMENTATION** | La sesión de Claude Code que construyó el proyecto con supervisión humana (OpenSpec: propuesta → aprobación → aplicación → verificación → archivo). |
| **REVIEW** | Un **contexto nuevo e independiente** (subagente de solo lectura) que no participó en la implementación, con la instrucción de revisar el código actual como un ingeniero senior escéptico, **sin justificar decisiones previas** y sin inventar hallazgos. Prohibido modificar archivos, ejecutar pruebas o leer `.env*`. |
| **Verificación** | La sesión de implementación comprobó cada hallazgo contra el código antes de aceptarlo. |
| **Limitación** | Mismo proveedor de modelo con distinto contexto e instrucciones; no equivale a una revisión humana externa. |

## 2. Método y muestra

Revisión de una muestra representativa de unos 60 archivos de `src/` (capas `app` → `application` → `domain` + `infrastructure`) y de pruebas:

- **Dominio:** máquina de estados, capacidades, dinero, validadores, código de seguimiento, normalización de nombres, sesión, credenciales.
- **Server Actions y transporte:** las 6 `actions.ts`, `run-action`, `proxy.ts`, guardianes de autenticación.
- **Aplicación:** registro, consulta, transición, diagnóstico/costo, datos básicos, notas, directorio, detalle, sesión e inicio de sesión.
- **Repositorios y Prisma/SQL:** los 7 almacenes administrativos, registro, consulta pública, transacción, bloqueo de fila, limitador, `subject-key`, `client-subject`, `password-hash`, `scrypt-gate`, `safe-error`, logger.
- **Esquema y migración inicial:** `CHECK`, `GRANT`, `bodySizeLimit`.
- **Pruebas:** `transition-order.test.ts`, listas de casos de integración y E2E.

Se buscó: duplicación, responsabilidades mezcladas, complejidad innecesaria, nombres, errores lógicos, código muerto, controles defensivos ausentes, desviaciones del PRD, testabilidad, mantenibilidad y problemas adyacentes a seguridad.

## 3. Resultado

**Critical 0 · High 0 · Medium 1 · Low 3 · Informational 3.** Áreas limpias: autorización por Server Action, máquina de estados, concurrencia, SQL parametrizado, proyección pública, sesión y login, sujeto del limitador, logging, validación de entradas, dinero y calidad de las pruebas (no tautológicas: cubren entrada hostil, precedencia, ausencia de escrituras ante rechazos y el SQL real).

## 4. Hallazgos

| ID | Severidad | Ubicación | Resumen | Decisión | Resultado |
|---|---|---|---|---|---|
| CR-001 | Medium | `infrastructure/limiter/limiter.ts`, servicios de consulta y login | `cleanupExpired` nunca se invocaba en producción; `rate_limit_buckets` crecía sin límite pese a TD §22 («limpieza oportunista») | **Refactor aplicado** | Corregido |
| CR-002 | Low | `domain/repair/repair-request.ts` | El teléfono no tiene longitud total máxima (solo se cuentan dígitos); el tope real es `bodySizeLimit` de 64 KB | **Diferido: requiere Spec** | Abierto (seguimiento) |
| CR-003 | Low | `app/admin/_lib/auth.ts`; `domain/repair/lifecycle.ts` | Export muerto `adminAction`; `canCancel` e `isDiagnosisAndCostPublic` sin uso en producción (la regla vive en SQL) | `adminAction` **eliminado**; las funciones de dominio se conservan como especificación ejecutable | Corregido / aceptado |
| CR-004 | Low | varios | Duplicación: validación de `expectedVersion` ×4, `canonicalCost` ×3, limitador «no disponible» ×2, `LimiterDecision` ×3 | **Diferido**: extracción mecánica sin riesgo funcional, pero con alcance sobre ~10 archivos; no justifica tocar código ya verificado en la entrega final | Aceptado |
| CR-005 | Informational | `domain/repair/customer-name-search.ts` | Rama muerta `.replace(/ñ/g, 'n')` (NFD ya separa la tilde y se elimina) | **Eliminada** (valor derivado idéntico) | Corregido |
| CR-006 | Informational | `infrastructure/security/password-hash.ts` | El primer `dummyHash()` de cada instancia se calcula perezosamente fuera del tope de concurrencia de `scrypt` | Aceptado: efecto puntual en arranque en frío | Aceptado |
| CR-007 | Informational | `money.ts`; lecturas sin snapshot | Riesgos residuales ya aceptados por diseño (costo sin tope técnico; detalle y directorio con varias consultas; carrera del limitador acotada) | Aceptado | Aceptado |

### Detalle de los hallazgos corregidos

**CR-001.** *Why it matters:* TD §22 especifica limpieza oportunista sin cron; el código solo la usaba en pruebas, así que la tabla acumulaba un HMAC por cada sujeto que alguna vez falló.

- **BEFORE:** los dos servicios de producción solo llamaban `isBlocked` y `recordFailure`.
- **CHANGE:** nuevo `recordFailureWithCleanup` en `limiter.ts` (mejor esfuerzo): registra el fallo y después elimina como máximo 20 cubos vencidos de la misma superficie; usado en `track-order-service.ts` y `admin-service.ts`. Solo borra filas con ventana y bloqueo vencidos (el siguiente fallo de esos sujetos ya reiniciaría el contador). Sin cambio de esquema (el rol ya tiene `DELETE` sobre la tabla).
- **AFTER:** la decisión del limitador no cambia; un fallo de la limpieza ni la altera ni se propaga.
- **VERIFY:** 3 pruebas unitarias nuevas (decisión intacta y parámetros, fallo o indisponibilidad de la limpieza, falla cerrada) y 1 prueba de integración nueva sobre PostgreSQL real (elimina el cubo vencido y conserva el bloqueo vigente y el cubo recién registrado).

**CR-003.** Eliminado `adminAction` (sin llamadores) y su import. **CR-005.** Eliminada la rama muerta; el valor derivado es el mismo, por lo que `customer_name_search` ya guardado sigue siendo válido (prueba unitaria y de integración de búsqueda por nombre sin cambios).

### Hallazgos no corregidos (por qué)

- **CR-002** introduce una **regla de negocio nueva** (longitud máxima de teléfono). TD §29 delega las longitudes en las Specs y la main spec `repair-request-registration` no la define: requiere un change de OpenSpec. Queda registrado como seguimiento; riesgo bajo (sin anti-spam aceptado en `E13`, tope de 64 KB por petición).
- **CR-004, CR-006, CR-007:** mejoras de mantenibilidad o riesgos aceptados que no justifican modificar código ya verificado.

## 5. Verificación del ciclo

| Verificación | Resultado |
|---|---|
| `lint`, `typecheck` | OK |
| Pruebas unitarias | **621** (+3 nuevas) |
| Cobertura de `domain/` | 100 % líneas · 97,43 % ramas |
| Integración (PostgreSQL real) | **263/263** (+1 nueva) |
| `build`, `ci:secrets`, `ci:audit`, `test:trace` | OK |
| E2E completa | en GitHub CI (`db-tests`) |

Notas de honestidad: (1) en una primera ejecución aislada de `limiter.test.ts` fallaron 2 pruebas (rama Neon `test` en frío, 54 s) y pasaron 11/11 al repetir; (2) en la primera ejecución completa de integración fallaron 2 pruebas de `admin-access.test.ts` (que usan su propio limitador y **no** ejecutan el código modificado) y pasaron 24/24 aisladas y **263/263 en la repetición completa**. Se clasifican como fallas transitorias no identificadas del entorno local (rama Neon remota y equipo con poca memoria), no reproducidas.

## 6. Evidencia histórica de revisión y corrección (anterior a esta revisión)

Distinta de la revisión nueva de arriba; son revisiones y correcciones reales ya registradas en el repositorio:

| Evidencia | Qué muestra |
|---|---|
| **Gate de cobertura 6.5** (`docs/04-planificacion/PHASE-6.5-COVERAGE-GATE.md`) | Auditoría de solo lectura: primera pasada **FAIL** (1 MAJOR, 4 MINOR, 3 CLEANUP) → *corrective pass* (GATE-001…007) → segunda pasada **PASS WITH NON-BLOCKING CLEANUP**. |
| **Security Pass, SEC-001** (`SECURITY-REPORT.md`) | Hallazgo Medium (sujeto del limitador sin canonicalizar IPv6) → corrección en CHG-14 → *retest* verde. |
| **Corrección de la landing** (`landing-visual-fidelity`) | Tras el despliegue se detectó que el `h1` perdía el espacio entre sus dos líneas («reparación,siempre»); se corrigió y se validó de nuevo en Production. |
| **Falla unitaria aislada** | Una ejecución dio 615/616 sin reproducirse en tres repeticiones; se reportó sin ocultarla. |
| **Architecture Validation Gates** (`docs/03-arquitectura/validation/`) | AV-1 y AV-2 con pruebas reales antes de implementar. |
| **Verificación por change** | Cada uno de los 18 changes archivados cierra con tareas de verificación y regresión completa en CI. |
