# Design

## Context

CHG-11 entrega el registro, la edición, el congelamiento y la publicación del diagnóstico y del costo estimado. Sigue `TECHNICAL-DESIGN.md` §7.3, §8, §14, §17, §18 y §20, `DESIGN.md` §11, §12 y PUB-05 y ADR-005/ADR-006 sin reabrirlos. Consume: `ActionResult`/logger (CHG-01); las columnas `diagnosis` y `estimated_cost`, los historiales `diagnosis_history` y `cost_history`, `version`, las restricciones y los privilegios (CHG-02); `RepairJourney` y la proyección pública (CHG-06); `requireAdmin()`/`AdminContext` (CHG-08); el detalle (CHG-09b); y de CHG-10 el mecanismo `expectedVersion`/`STALE_ORDER` (comprobación temprana y escritura condicional), `canEditDiagnosisAndCost`, `isTerminal`, la costura del prerrequisito y el diálogo `E11` #1 pendiente de contenido. Solo planificación.

**Dependencia de Spec-base.** CHG-11 may be materialized while CHG-10 remains active using the OpenSpec 1.15.0 pattern validated for Modified Capability + ADDED Requirements. **CHG-10 MUST be implemented, verified and archived before CHG-11 is applied/archived** (política de FIXORA). Sin `/opsx:sync`.

## Goals / Non-Goals

**Goals:** diagnóstico y costo editables hasta *En diagnóstico*; dinero exacto; historiales atómicos; concurrencia optimista; congelamiento y publicación derivados del estado; proyección pública que nunca carga valores no publicados (`SC-11`); resumen real del diálogo `E11` #1; cierre de `E2E-01`.

**Non-Goals:** notas (CHG-12); corrección de datos (CHG-13); descongelar, rediagnosticar o nuevo presupuesto (`RIE-06`, `RIE-07`); moneda seleccionable, desglose o máximo de negocio; indicador «publicado»; tabla polimórfica de historial; REST.

## Decisions

### D1. Diagnóstico (dominio)
Un único texto orientado al cliente (no hay diagnóstico público e interno; el detalle técnico interno va en notas internas). Normalización pura: `trim` exterior; vacío tras `trim` → ausente (`NULL`); `U+0000` rechazado; contenido como texto (React escapa; sin HTML). Si el valor normalizado es idéntico al vigente: **no-op** (sin `UPDATE`, sin `version++`, sin historial). **Longitud máxima: `DIAGNOSIS_MAX_LENGTH = 2000` caracteres de texto** tras el `trim` exterior (decisión de Spec deliberada: las fuentes no fijaban un número y el TD delega las longitudes máximas a las Specs). Sin mínimo artificial mayor que 1, sin expresión regular de caracteres permitidos, sin HTML y sin medir bytes UTF-8. Exactamente 2000 es válido; 2001 devuelve `VALIDATION_FAILED` con el error de campo `TOO_LONG` del contrato transversal. El mecanismo concreto de conteo (unidades UTF-16, *grapheme clusters*, biblioteca) **no se especifica aquí**: es un detalle de implementación coherente con las demás validaciones V1.

### D2. Dinero (dominio, primitiva pura)
El costo se representa en el dominio como **cadena decimal canónica con exactamente dos decimales** (`"50.00"`, `"1250.50"`); nunca como `number`. Parseo: dígitos con un punto decimal opcional y como máximo dos decimales (`50 → 50.00`, `50.5 → 50.50`); más de dos decimales se **rechaza** sin redondear. No se aceptan automáticamente coma decimal, separador de miles ni símbolos de moneda (la UI muestra `S/` como prefijo decorativo; el valor de negocio es el decimal; las fuentes no los definen). Validación: conversión directa de la cadena a `BigInt` de céntimos (`"180.00" → 18000n`), sin `parseFloat`/`Number`; debe ser estrictamente > 0 (0, `0.00`, negativos y `""` no son un costo válido; ausencia = `NULL`). Sin máximo de negocio (el PRD no lo define) y PEN implícito, sin almacenar moneda. Igualdad para el no-op: comparación de la forma canónica (`"50"` frente a `"50.00"` es el mismo valor). Presentación: `S/ ` + dos decimales, sin separador de miles ni `Intl.NumberFormat`. Persistencia: `NUMERIC` sin precisión artificial con `CHECK` de > 0 y ≤ 2 decimales (CHG-02); conversión exacta entre dominio, Prisma `Decimal` y `NUMERIC` sin pasar por `number` (se valida en AV-2).

### D3. Operaciones de mutación (independientes)
Dos operaciones atómicas independientes, `saveDiagnosis` y `saveEstimatedCost`, cada una Server Action con cuerpo explícito (`orderId`, valor, `expectedVersion`; campos desconocidos ignorados), `requireAdmin()` y luego `AdminContext`; sin REST. Cada guardado tiene su propio comando, `expectedVersion`, transacción, historial y `ActionResult`. **No existe** un `saveDiagnosisAndCost()` que ejecute dos mutaciones como una sola acción de usuario (podría dejar el diagnóstico actualizado y el costo fallido). Flujo de cada una:
```text
requireAdmin → parseo técnico
  → BEGIN → cargar la orden → ¿existe?
  → ¿current.version == expectedVersion?   NO → STALE_ORDER   (comprobación temprana de CHG-10)
  → ¿estado terminal?                        SÍ → ORDER_CLOSED
  → ¿canEditDiagnosisAndCost(estado)?        NO → DIAGNOSIS_AND_COST_FROZEN
  → validar y normalizar/canonicalizar el valor   (VALIDATION_FAILED)
  → ¿valor idéntico al vigente?               SÍ → no-op (sin escrituras)
  → UPDATE condicional (WHERE id AND version = expectedVersion; version = version + 1)
        0 filas → STALE_ORDER (segunda barrera)
  → INSERT diagnosis_history | cost_history  → COMMIT → refresh
```
La validación concreta puede ejecutarse antes o después de las reglas de estado mientras no cambie la semántica observable ni ejecute trabajo inseguro; la precedencia entre `STALE_ORDER`, `ORDER_CLOSED` y `DIAGNOSIS_AND_COST_FROZEN` es la del flujo anterior. Un cambio efectivo incrementa `repair_orders.version` exactamente una vez; sin fusión, reintento ni *last-write-wins*.

**Versión entre guardados.** Con la orden en la versión 5, guardar el diagnóstico la lleva a 6 y la vista se refresca; guardar después el costo usa `expectedVersion = 6` (nunca la 5). Si dos pestañas guardan campos distintos con la versión 5, una gana (`5 → 6`) y la otra recibe `STALE_ORDER` sin fusión automática, aunque editen campos diferentes (decisión conservadora de ADR-006). Un guardado que resulta *no-op* no incrementa la versión, no crea historial ni invalida otras pestañas innecesariamente.

**UI.** Un guardado por campo (p. ej. «Guardar diagnóstico» junto al diagnóstico y «Guardar costo» junto al costo, o la composición equivalente de DESIGN); la regla funcional es que cada campo se guarda de forma independiente.

### D4. Editabilidad y resultados
`canEditDiagnosisAndCost` (primitiva de dominio de CHG-10) es verdadero solo en `SOLICITUD_RECIBIDA`, `EQUIPO_RECIBIDO` y `EN_DIAGNOSTICO`; la UI lo usa como indicación y **el servidor lo recalcula** en cada mutación. Resultados tipados (cerrados): `SESSION_EXPIRED`, `STALE_ORDER`, `ORDER_CLOSED`, `DIAGNOSIS_AND_COST_FROZEN`, `VALIDATION_FAILED` (con errores por campo, p. ej. `TOO_LONG`) e `INTERNAL_ERROR`.
- `ORDER_CLOSED` se mantiene **exclusivamente** para `ENTREGADO` y `CANCELADO` (no se amplía su significado).
- `DIAGNOSIS_AND_COST_FROZEN` (código estable nuevo y justificado) cubre un único resultado de negocio para los tres estados no terminales ya congelados: `ESPERANDO_APROBACION`, `EN_REPARACION` y `LISTO_PARA_RECOJO`. No se reutilizan `VALIDATION_FAILED` (el valor puede ser válido; lo que no se permite es la operación en ese estado), `TRANSITION_NOT_ALLOWED` (no es una transición), `ORDER_CLOSED` (la orden aún no es final) ni `STALE_ORDER` (la versión coincide). No se crean códigos por estado.
- Es principalmente defensa del servidor: en la UI normal los campos ya están de solo lectura y no hay botón de guardado; un cliente manipulado con la versión vigente recibe `DIAGNOSIS_AND_COST_FROZEN`. Feedback seguro conceptual: «El diagnóstico y el costo ya están congelados y no pueden modificarse» (redacción editorial), sin datos técnicos.
- Efectos de **cualquier** rechazo (`DIAGNOSIS_AND_COST_FROZEN`, `ORDER_CLOSED`, `STALE_ORDER`, `VALIDATION_FAILED`): diagnóstico y costo sin cambio, `repair_orders.version` sin cambio y ningún evento nuevo en `diagnosis_history` ni `cost_history`.
- Como entrar en `ESPERANDO_APROBACION` incrementa la versión, una pantalla anterior al congelamiento recibe `STALE_ORDER` primero; `DIAGNOSIS_AND_COST_FROZEN` aparece solo con la versión vigente (cliente manipulado).

### D5. Historiales
`diagnosis_history` y `cost_history` (CHG-02: `id`, `order_id`, valor anterior y nuevo —ambos admiten `NULL`—, `occurred_at`; `RESTRICT`; *append-only* para el rol runtime; índice `(order_id, occurred_at DESC)`). Cada cambio efectivo inserta exactamente un evento en la misma transacción que el `UPDATE` condicional (`now` compartido); sin autor, sesión, IP ni motivo. Cubre `NULL → diagnóstico`, `A → B` y `diagnóstico → NULL`. El diagnóstico del historial puede contener texto libre y es **solo administrativo** (nunca reutilizado en PUB-05); el costo conserva exactitud decimal sin pasar por `number`. `AdminHistoryEvent` es la unión discriminada de TD §17 (`StatusChangedEvent | DiagnosisChangedEvent | CostChangedEvent`, cada una con `type` y `occurredAt`); no hay tabla polimórfica. **Orden y desempate:** más reciente primero por `occurredAt DESC`; para eventos con el mismo instante, un desempate determinista con las columnas existentes (rango fijo del tipo `STATUS` < `DIAGNOSIS` < `COST` y luego `id DESC`); las tres tablas tienen `id` (CHG-02), así que no se añaden columnas. El rango del tipo es **solo un desempate estable** cuando los instantes coinciden: no tiene significado cronológico ni se presenta como cronología de auditoría entre eventos con el mismo `now`. Históricamente cada historial es independiente: no existe un evento conjunto «diagnóstico y costo actualizados».

### D6. Publicación y privacidad (`SC-11` fuerte)
La visibilidad **se deriva del estado**: no existe `published`, `publishedAt` ni indicador equivalente. Se publican en `ESPERANDO_APROBACION`, `EN_REPARACION`, `LISTO_PARA_RECOJO` y `ENTREGADO`; en `CANCELADO` solo si existe un evento de `order_status_history` de esa orden con `to_status = ESPERANDO_APROBACION` (`isDiagnosisAndCostPublic`). **La presencia de valores no implica publicación** (prohibido `if diagnosis != null && cost != null`).

**Proyección pública positiva.** La lectura pública **no carga `diagnosis` ni `estimated_cost` en memoria mientras no estén autorizados**, y no construye una orden administrativa para anularlos después. Estrategia: una consulta o proyección condicionada que devuelve los valores solo en los estados públicos, en `CANCELADO` solo si `EXISTS` un evento hacia `ESPERANDO_APROBACION`, y `NULL` en cualquier otro caso (o una lectura previa de los mínimos hechos del ciclo de vida seguida de la carga solo si la regla autoriza); no se exige un número fijo de consultas. El DTO público usa `repairDetails: null | { diagnosis, estimatedCost }` (nunca valores junto a un indicador de visibilidad), con el costo como cadena canónica. Nunca incluye historiales, `version`, ids ni datos administrativos. Los valores vigentes son los congelados. Por `E6`, `repairDetails = null` no produce errores.

### D7. Interfaz de ADM-04
- **Bloque Público:** equipo, problema, **diagnóstico y costo** (DESIGN §9, §11). **Bloque Interno:** contacto, historial combinado (estado, diagnóstico, costo). Sin notas (CHG-12). Sin contenedores vacíos de notas.
- **Editables** (primeros tres estados): textarea de diagnóstico y entrada de monto con prefijo `S/`, rótulo «Aún no visible para el cliente», un guardado por campo, errores por campo conservando lo escrito, ausencias comprensibles (nunca `S/ 0.00` ni textos técnicos).
- **Congelados** (`ESPERANDO_APROBACION`, `EN_REPARACION`, `LISTO_PARA_RECOJO`): campo de solo lectura con borde discontinuo, `lock` y rótulo «Congelado», sin controles de guardado. **Finales:** solo lectura («Solo lectura»); en `CANCELADO` sin llegada a `ESPERANDO_APROBACION`, rótulo «Nunca se publicó al cliente»; si sí llegó, sin ese rótulo.
- **Diálogo `E11` #1 completo:** resumen del diagnóstico y del costo vigentes, aviso de que quedarán congelados y disponibles para el cliente, alerta «Después no podrán modificarse» y la acción «Avanzar a Esperando aprobación» (DESIGN §12). El resumen corresponde a `expectedVersion = N`: si el diagnóstico o el costo cambian antes de confirmar, la versión pasa a `N+1` y la confirmación vieja devuelve `STALE_ORDER` sin publicar nada. Esto satisface el traspaso de CHG-10 (tipo, ligadura a la versión y exigencia en servidor ya estaban; aquí se añade el contenido) y la reconciliación de la Fase 6.5 sobre el diálogo #1.
- Sin mutación optimista: pendiente visual sí, cambios de negocio solo tras el resultado y `refresh()` del servidor. `STALE_ORDER` con el patrón de §13.5 («Actualizar orden»).
- **DTO administrativo:** CHG-11 añade `diagnosis`, `estimatedCost` (cadena canónica o `null`), `canEditDiagnosisAndCost` (indicación), la información necesaria para el rótulo «Nunca se publicó» y los eventos de diagnóstico y costo del historial; sin capacidades de notas ni de datos básicos.

### D8. Interfaz de PUB-05
Tras la publicación, diagnóstico y costo en una tarjeta pública propia, con el costo destacado (24/32, 600, Primary active, `S/` + dos decimales) y el diagnóstico como texto de lectura, distintos de las futuras notas públicas (`RIE-05`: sin validación semántica entre diagnóstico y notas). Antes de publicar, el vacío informativo de `E6`. Para una orden cancelada (`E5`): tracking, equipo, problema, estado y timeline, y diagnóstico/costo solo si había alcanzado la aprobación.

### D9. Terminalidad y errores graves
Diagnóstico y costo en `ENTREGADO`/`CANCELADO` son de solo lectura (parte de `SC-09`; notas y datos básicos completan `SC-09` con CHG-12 y CHG-13). Sin descongelar ni rediagnosticar: ante un error grave en un valor congelado, el flujo de V1 es cancelar mientras sea posible y registrar una nueva solicitud (`RIE-06`, `RIE-07`).

### D10. Logs y privacidad
Logger de CHG-01 con lista positiva: nunca diagnóstico, costo, nombres ni cuerpos de acciones. El diagnóstico y el costo nunca van en URL. Sin eventos de auditoría de negocio.

## Decisiones resueltas

- **`DIAGNOSIS_MAX_LENGTH = 2000`** caracteres de texto tras el `trim` (decisión de Spec; el TD delegaba las longitudes a la Spec). No se modifican PRD, DESIGN, TD ni BACKLOG; la reconciliación final verificará la delegación.
- **`DIAGNOSIS_AND_COST_FROZEN`** para los estados congelados no terminales; `ORDER_CLOSED` solo para estados finales (ver D4).
- **Guardado por campo:** operaciones independientes con su propia versión e historial (ver D3).

## Traspasos

- **CHG-12:** notas públicas e internas junto a diagnóstico y costo; `isTerminal`; carrera nota-contra-cierre.
- **CHG-13:** corrección de datos básicos; recalcula `customer_name_search`; no afecta diagnóstico ni costo.
- La terminalidad de diagnóstico y costo queda establecida aquí; las de notas y datos básicos llegan con CHG-12 y CHG-13.

## Risks / Trade-offs

- Riesgo alto de privacidad (`SC-11`) y de dinero: mitigado por proyección condicionada, cuatro pruebas de publicación, `BigInt`, `NUMERIC` y la prohibición de `number`.
- La validación de `NUMERIC` sin precisión en Prisma 7 `Decimal` depende de AV-2.
- Los errores graves tras el congelamiento no son corregibles (aceptado, `RIE-06`).

## Open Questions

| ID | Pregunta | Clasificación |
|---|---|---|
| OQ-1 | Longitud máxima del diagnóstico, código para estados congelados y guardado por campo | **RESUELTAS** (2000; `DIAGNOSIS_AND_COST_FROZEN`; operaciones independientes) |
| OQ-2 | Prisma 7 `Decimal` con `NUMERIC` sin precisión, conversión exacta sin `number`, `CHECK` de > 0 y ≤ 2 decimales, nulabilidad, historiales, transacción y privilegios | PRE-IMPLEMENTATION AV-2 |
| OQ-3 | Composición del formulario, copy de ausencia, forma de la proyección pública condicionada, mecanismo de conteo de caracteres | IMPLEMENTATION DETAIL |
| OQ-4 | Diálogo `E11` #1, prerrequisito de diagnóstico y costo, publicación | **RESUELTAS POR CHG-11** (cierran el handoff de CHG-10) |
| OQ-5 | Notas | DEFERRED a CHG-12 |
| OQ-6 | Correcciones de datos básicos | DEFERRED a CHG-13 |

No se crea AV-4; CHG-11 consume el AV-1 ya aprobado y el backlog le asigna AV-2.

## Pruebas planificadas

**Unitarias:** diagnóstico (`trim` antes del límite, vacío → ausente, `U+0000` rechazado, no-op, cambio real, 2000 válido y 2001 `TOO_LONG`, Unicode según la primitiva común de conteo); **dinero** obligatorio (canonicalización, `BigInt` de céntimos, > 0, cero y negativo inválidos, uno y dos decimales, más de dos rechazado, sin redondeo, sin punto flotante) incluidos valores que fallarían con `number` (p. ej. `0.1 + 0.2`, `1.005`, montos grandes de más de 15 dígitos significativos), de modo que una implementación futura no reintroduzca conversiones imprecisas.

**Integración (PostgreSQL real, sin mocks de Prisma):** diagnóstico y costo (crear, modificar, limpiar, no-op, `version + 1` solo si es efectivo, historial, `STALE_ORDER`, estados congelados); **cuatro pruebas de publicación**: (1) en *En diagnóstico* con ambos valores guardados, `repairDetails = null` y verificación de que la proyección pública no cargó los valores; (2) cancelada antes de *Esperando aprobación*, `null`; (3) en *Esperando aprobación*, `repairDetails = { diagnosis, estimatedCost }`; (4) alcanzó *Esperando aprobación* y luego se canceló, siguen visibles. DTO público con una orden completamente poblada sin historiales, versión, datos administrativos ni identificadores internos. Historial administrativo combinado (estado, diagnóstico, costo) con orden determinista. `E11` desactualizada (diálogo en la versión N, cambio de diagnóstico o costo a N+1, confirmación vieja → `STALE_ORDER` sin publicar). Congelamiento con la versión vigente (`ESPERANDO_APROBACION`, `EN_REPARACION` y `LISTO_PARA_RECOJO` → `DIAGNOSIS_AND_COST_FROZEN`) y terminalidad (`ENTREGADO`, `CANCELADO` → `ORDER_CLOSED`), siempre sin escritura, versión ni historial; precedencia (orden congelada o terminal con `expectedVersion` distinta → `STALE_ORDER` primero); guardado independiente (guardar el diagnóstico → `version + 1` y solo `diagnosis_history`; guardar el costo → `version + 1` y solo `cost_history`; dos pestañas con la versión 5 → una gana y la otra `STALE_ORDER`; no-op sin versión ni historial). No basta un test de DOM: se verifica que los valores no publicados ni siquiera estén en `PublicOrderView`.

**Playwright:** inicio de sesión, abrir la orden, llegar a *En diagnóstico*, guardar diagnóstico y costo, diálogo `E11` #1 con el resumen real, confirmar, campos congelados, consulta pública (antes de confirmar no se ven; después sí), responsive y teclado/foco según DESIGN.

**`E2E-01` completo (`SC-17`, definición de BACKLOG §M3):** el cliente registra → recibe el código → el administrador inicia sesión → encuentra la orden → abre el detalle → avanza *Solicitud recibida → Equipo recibido → En diagnóstico* → registra diagnóstico y costo → `E11` #1 → *Esperando aprobación* → el cliente consulta y ve estado, Journey, diagnóstico y costo. No se extiende a *En reparación*, *Listo para recojo* ni *Entregado* (cubiertos en CHG-10). Es el primer `E2E-01` completo; `TRACEABILITY.md` se actualiza al implementar con `SC-07`, `SC-08`, `SC-10`, `SC-17`, `E5` y `E6`.
