# Revisión adversarial de arquitectura — revalidación final

> **Final Architecture Adversarial Reassessment.** Fecha: 2026-10-31 · Estado revisado: `main` `0f881f8` (FIXORA V1 completa, 0 changes de OpenSpec activos, 8 specs canónicas). Sin secretos, URL de conexión ni PII.

## 1. Objetivo y alcance

Atacar la arquitectura **tal como quedó implementada**: buscar contradicciones entre el PRD y el diseño, huecos de seguridad, concurrencia y datos, y requisitos no cubiertos, verificando las afirmaciones contra el código y la migración cuando hacía falta. El objetivo no es justificar las decisiones previas, y un área sin problemas se declara `NO FINDING`.

Fuentes: `PRD.md`, `TECHNICAL-DESIGN.md`, ADR-001…010, `BACKLOG.md`, las 8 main specs de OpenSpec, `SECURITY-REPORT.md`, `RELEASE-READINESS.md`, `RUNBOOKS.md`, `PRODUCTION-ENVIRONMENT.md`, `NEON-ENVIRONMENTS.md`, `prisma/` y los workflows de `.github/`. Código (`src/**`) solo para verificar afirmaciones concretas.

## 2. Limitación histórica (declarada)

| Revisión | Estado de la evidencia |
|---|---|
| **Revisión adversarial original (Fase 5/6)** | La mencionan el `PROJECT-BRIEF.md`, la cabecera del Technical Design («completada, 0 Critical, 0 High») y `docs/README.md`. **No se conserva en el repositorio un artefacto independiente** (informe, lista de hallazgos o registro de decisiones corregidas), y el Technical Design y los 10 ADR entran en un único commit (`0ac649a`). Esa revisión se cita como histórica; no se reconstruye ni se inventan sus hallazgos. |
| **Revalidación final (este documento)** | Realizada el 2026-10-31 sobre el estado final, completamente documentada abajo. |

## 3. Metodología

- **Separación implementación / revisión.** La implementación la hizo la sesión de Claude Code que construyó el proyecto bajo supervisión humana. La revisión la ejecutó **un contexto nuevo e independiente** (subagente de solo lectura, sin acceso a conclusiones previas de esta revisión), con la instrucción de atacar y no de justificar, y con prohibición de modificar archivos, ejecutar pruebas o leer `.env*`.
- **Verificación de los hallazgos.** La sesión de implementación comprobó cada hallazgo comprobable contra el repositorio antes de aceptarlo (columna «Verificado»). Los que dependen de infraestructura externa (credenciales de Neon) no pudieron verificarse y se marcan como tales.
- **Limitación de independencia.** El revisor es el mismo proveedor de modelo con un contexto y unas instrucciones distintos; no equivale a una revisión humana externa.

## 4. Checklist por área

| # | Área | Resultado |
|---|---|---|
| 1 | Contradicciones PRD ↔ arquitectura | NO FINDING. E13 (registro sin anti-spam) y el limitador (TD §22) quedan acotados a superficies distintas; las matrices §4.4, §4.5 y §4.8 coinciden con TD §7.3 y §8. |
| 2 | Frontera público/admin | NO FINDING. Proyección pública por columnas en SQL (sin `customer_*`, `id` ni `version`); notas filtradas por `visibility = 'PUBLIC'` en la propia consulta. |
| 3 | Autenticación y autorización | NO FINDING (ver AR-004). Las 7 acciones administrativas y las páginas pasan por el guardián de sesión en cada petición. |
| 4 | Modelo de sesiones | NO FINDING. Token de 256 bits con solo su SHA-256 persistido; inactividad de 60 min y vida de 12 h evaluadas en servidor. |
| 5 | Máquina de estados | NO FINDING. Tabla declarativa de 10 pares, `CHECK` en PostgreSQL, `UNIQUE(order_id, to_status)` y `UPDATE` condicionado por estado y versión. |
| 6 | Concurrencia | NO FINDING. Versión optimista en transición, diagnóstico, costo y datos básicos; `FOR UPDATE` de la orden en notas. |
| 7 | Transacciones | NO FINDING. Orden e historial en la misma transacción `READ COMMITTED`. |
| 8 | Persistencia | AR-008 (Informational). |
| 9 | Diagnóstico y costo congelados | NO FINDING. El `WHERE` incluye los estados editables además de la versión. |
| 10 | Notas | NO FINDING. La visibilidad no es actualizable por privilegios; la serialización nota/cierre es por bloqueo de fila. |
| 11 | PII | AR-005 (Low). |
| 12 | Rate limiting | AR-004 (Low). |
| 13 | Fallos parciales | NO FINDING. Lo inesperado se convierte en `INTERNAL_ERROR` sin detalle. |
| 14 | Idempotencia | NO FINDING. Tres `INSERT` en una transacción, `ON CONFLICT DO NOTHING` y lectura del ganador. |
| 15 | Migraciones | AR-003 (Low), AR-007 (Informational). |
| 16 | Entornos Neon | AR-001 (escalado a High y **cerrado** con evidencia; ver §5). |
| 17 | CI/CD | AR-002 (Low), AR-006 (Informational). |
| 18 | Rollback | NO FINDING. *Instant Rollback* probado; *roll-forward* y *expand/contract*. |
| 19 | Observabilidad y logs | AR-009 (Informational). Logger cerrado verificado. |

## 5. Hallazgos

Totales iniciales: Critical 0 · High 0 · Medium 1 · Low 4 · Informational 4. **Estado final tras el cierre de AR-001: Critical 0 · High 0 abiertos · Medium 0 abiertos · Low 1 abierto (AR-005, seguimiento) · Low 1 aceptado (AR-004) · Informational 4 aceptados.**

| ID | Área | Severidad | Verificado | Decisión | Estado |
|---|---|---|---|---|---|
| AR-001 | Entornos Neon | Medium → **High** (escalado el 2026-11-02) | Sí: prueba real de autenticación cruzada | Corrección documental + **restablecimiento de contraseñas por la persona propietaria** + verificación | **CERRADO (2026-11-02)** |
| AR-002 | CI/CD | Low | Sí | Smoke ejecutado ahora sobre el despliegue vigente; automatización aceptada como diferida | Cerrado (ver §6) |
| AR-003 | Migraciones | Low | Sí | Corrección documental en RUNBOOKS §1 | Cerrado |
| AR-004 | Rate limiting / auth | Low | Sí | Riesgo residual aceptado | Aceptado |
| AR-005 | PII | Low | Sí | Seguimiento: ampliar el inventario y la plantilla de RB-6 en una revisión operativa ensayada | Abierto (seguimiento, sin impacto en V1) |
| AR-006 | CI/CD | Informational | Sí | `ci.yml` es la fuente vigente (CHG-03, D-4); el TD §25.2 describe `needs: static` y es histórico | Aceptado |
| AR-007 | Migraciones | Informational | Sí | Aceptado: el SHA aprobado ya cubre la ejecución | Aceptado |
| AR-008 | Persistencia | Informational | Sí | Aceptado (coste solo editable por el administrador; PRD sin tope) | Aceptado |
| AR-009 | Observabilidad | Informational | Sí | Aceptado: eventos reservados del catálogo | Aceptado |

### AR-001 — Separación de credenciales del propietario entre ramas de Neon (Medium → High → cerrado)

- **Hallazgo:** las ramas hijas de Neon heredan los roles del padre. El procedimiento documentado restablece la contraseña de `fixora_app` por rama, pero **no exige ni registra** restablecer la del propietario (`neondb_owner`) en cada rama. Si fuese la misma en `main`, `development` y `test`, la conexión directa de `development` (en el equipo local) bastaría, cambiando solo el host, para obtener privilegios de propietario sobre Production.
- **Evidencia:** `openspec/changes/archive/2026-10-28-persistence-foundation/design.md` (D-7: «las contraseñas del propietario y de la aplicación se restablecen por rama»); `docs/09-deploy/NEON-ENVIRONMENTS.md` (procedimiento solo para `fixora_app`); TD §25.1 («ninguna credencial de producción funciona en development o test»). `RELEASE-READINESS.md` §3 documenta que ya hubo una confusión entre ramas.
- **Impacto:** potencialmente High si las contraseñas se comparten; Medium mientras no se confirme.
- **Recomendación:** comprobar que la conexión del propietario de cada rama **no** autentica en otra y restablecer la contraseña del propietario por rama si hace falta; registrar la verificación.
- **Decisión inicial:** se añadió el paso al procedimiento (`NEON-ENVIRONMENTS.md`, regla 6); la comprobación real se dejó como acción de la persona propietaria.

**Verificación y escalado (2026-11-02).** Un verificador sin salida de secretos (solo `REJECTED`/`ACCEPTED`) probó la autenticación cruzada del propietario con los archivos de entorno locales. Resultado **antes** de la corrección: el propietario tenía la **misma contraseña** en `development` y `test`, y la credencial de cada una **autenticaba** en la otra → **FAIL**. El rol de aplicación `fixora_app` ya estaba aislado (rechazado en ambos sentidos). Conforme a la regla fijada para esta ronda, el hallazgo se **escaló a High** (precautorio respecto de `main`, que no era verificable por el agente) y se detuvo el cierre.

**Corrección (persona propietaria, sin exponer secretos).** Restablecimiento de la contraseña de `neondb_owner` en `development`, `test` y `main`, con valores distintos por rama; actualización de los consumidores: `.env.local`, `.env.test`, el secreto `TEST_DIRECT_URL` del Environment `test` y el secreto `DIRECT_URL` del Environment `production` de GitHub.

**Evidencia posterior (sin secretos).**

| Credencial | development | test | main | Fuente |
|---|---|---|---|---|
| Propietario de `development` | ACEPTADA | RECHAZADA | RECHAZADA | Persona propietaria (main); agente (test) |
| Propietario de `test` | RECHAZADA | ACEPTADA | RECHAZADA | Persona propietaria (main); agente (development) |
| Propietario de `main` | RECHAZADA | RECHAZADA | ACEPTADA | Persona propietaria (no verificable por el agente) |
| `fixora_app`, cruces entre entornos | RECHAZADA | RECHAZADA | RECHAZADA | Persona propietaria; agente (development ↔ test) |

El agente **reejecutó** el verificador tras la corrección: `development → test` y `test → development` para propietario y aplicación: `REJECTED` (PASS) en los cuatro cruces, con contraseñas distintas por archivo. Las comprobaciones que implican `main` las ejecutó y reportó la persona propietaria: el agente no tiene (ni debe tener) credenciales de Production.

**Estado: CERRADO** con evidencia real. Residual aceptado: la verificación de `main` es declarada por la persona propietaria, no reproducida por el agente. Esta verificación debe repetirse tras cualquier nueva ramificación o restablecimiento de contraseñas.

### AR-002 — Smoke y registro de despliegues (Low)

- **Hallazgo:** la evidencia de release (`RELEASE-READINESS.md`) se tomó sobre `main` `24771af`; después se desplegaron cambios de `src/` (corrección y mejora visual de la landing) y el smoke de Production es manual, sin workflow.
- **Decisión:** se ejecutó el smoke público y no mutante sobre el despliegue vigente (resultado en §6). La automatización del smoke queda diferida como aceptada (V1 es una demo; riesgo documentado). **Estado: cerrado.**

### AR-003 — Migraciones aplicadas antes de fusionar (Low)

- **Hallazgo:** el procedimiento aplica las migraciones a Production antes de fusionar la PR (con identidad de contenido), pero no cubre el caso «aplicada y la PR cambia o se abandona»; esto choca con *forward-only*.
- **Decisión:** regla explícita añadida en `RUNBOOKS.md` §1: tras aplicar en Production, toda corrección es una migración nueva. **Estado: cerrado.**

### AR-004 — Limitador: carrera comprobar→registrar y ausencia de límite global (Low)

- **Hallazgo:** la secuencia `isBlocked` → verificación `scrypt` → `recordFailure` no es atómica (una ráfaga concurrente puede superar el umbral antes de registrarse el bloqueo) y el límite es por sujeto (IP o /64), no global ni por cuenta.
- **Impacto:** acotado: el conteo es una sola sentencia atómica, hay tope de concurrencia de `scrypt` por instancia, falla cerrada y contraseña de ≥ 15 caracteres; contra el código de seguimiento (54 bits) el efecto es despreciable.
- **Decisión:** riesgo residual **aceptado** para una demo académica de un único administrador. Estado: aceptado.

### AR-005 — `brand` y `model` ausentes del inventario de texto libre (Low)

- **Hallazgo:** TD §10 y la plantilla de *break-glass* de RB-6 tratan `problem_description`, diagnóstico y notas como texto libre sensible, pero `brand` y `model` también los escribe el cliente anónimo y se muestran en la vista pública.
- **Decisión:** no se modifica una plantilla SQL operativa sin ensayarla (RB-6 se ensayó con `ROLLBACK`); queda como seguimiento para la próxima revisión de operación. Sin impacto funcional en la V1.

### AR-006…AR-009 (Informational)

- **AR-006:** el TD §25.2 muestra `db-tests` con `needs: static`; `ci.yml` declara los dos jobs independientes por decisión de CHG-03 (D-4, documentada en `CI-QUALITY-GATES.md`). Vigente: el YAML.
- **AR-007:** el job `migrate` ejecuta `scripts/migration-identity.ts` desde el SHA aprobado (defensa en profundidad); el TD dice que no ejecuta scripts de la revisión. El riesgo equivale al de `prisma.config.ts`, ya cubierto por el SHA aprobado.
- **AR-008:** el costo no tiene tope técnico de dígitos (solo lo introduce el administrador autenticado; el PRD no fija un máximo; `bodySizeLimit` de 64 KB lo acota).
- **AR-009:** `action.stale`, `registration.collision_retry` y `configuration.invalid` figuran en el catálogo del logger y no se emiten (verificado con grep); la lectura pública hace dos consultas no atómicas, sin riesgo de fuga.

## 6. Verificaciones ejecutadas durante la revisión

- **Smoke de Production (no mutante, 2026-10-31, `main` `0f881f8`):** `SMOKE_BASE_URL=<Production> npm run test:smoke` → **14 pasan y 2 se omiten** (la consulta de la orden demo se omite sin `SMOKE_TRACKING_CODE`; no se crearon datos). Cubre HTTPS, landing y aviso de demostración, `/registrar` y `/consultar`, 404 sin detalles técnicos, cabeceras, indexación y que `/admin/**` sin sesión redirige al acceso.
- Los hallazgos de código del mismo ciclo (revisión independiente de código) están en [`docs/07-testing/CODE-REVIEW.md`](../07-testing/CODE-REVIEW.md); no se duplican aquí.

## 7. Resultado final

- **Critical: 0 · High: 0** (no hubo que detener la revisión).
- **Medium: 0 abiertos.** AR-001 (credenciales del propietario compartidas entre ramas) se verificó como real, se escaló a High, se corrigió y se **cerró el 2026-11-02** con evidencia de autenticación cruzada (ver §5).
- Todo lo demás está cerrado, aceptado con justificación o registrado como seguimiento sin impacto en la V1.
- La arquitectura implementada es coherente con el PRD y con el Technical Design; las defensas por capas (dominio, versión optimista, transacción, `CHECK`, privilegios por rol) se verificaron en el código y en la migración.
