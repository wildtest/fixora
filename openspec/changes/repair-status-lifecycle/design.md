# Design

## Context

CHG-10 define la máquina de estados V1 y su ejecución segura. Sigue `TECHNICAL-DESIGN.md` §7.2, §7.3, §14, §16–§18, `DESIGN.md` §7, §12, §13.5 y Apéndice A.5 y ADR-006 sin reabrir decisiones. Consume: `ActionResult`/`runAction`/logger (CHG-01); `repair_orders.version`, `order_status_history`, sus restricciones (incluido el `CHECK` de pares) y los privilegios del rol runtime (CHG-02); el evento inicial `NULL → SOLICITUD_RECIBIDA` (CHG-05); `RepairJourney` y la proyección pública con `statusTimeline` (CHG-06); `requireAdmin()`/`AdminContext` (CHG-08) y el detalle de solo lectura (CHG-09b). Es solo planificación.

**Dependencias de Spec-base.** CHG-10 may be materialized while CHG-06, CHG-09a and CHG-09b remain active because OpenSpec 1.15.0 was validated for Modified Capability + ADDED Requirements against active predecessors. **CHG-06, CHG-09a and CHG-09b MUST be implemented, verified and archived before CHG-10 is applied/archived** (política de ejecución de FIXORA). Sin `/opsx:sync`. No es un requisito funcional.

## Goals / Non-Goals

**Goals:** una tabla declarativa única y funciones puras de dominio; transición atómica con concurrencia optimista; confirmaciones `E11` verificadas por el servidor; reflejo en lo público y en ADM-04; terminalidad canónica.

**Non-Goals:** edición, publicación o historial de diagnóstico y costo (CHG-11); notas (CHG-12); corrección de datos (CHG-13); motivo de cancelación; idempotency keys administrativas; XState o cualquier dependencia; triggers de negocio; `SERIALIZABLE`; tiempo real.

## Decisions

### D1. Tabla declarativa y funciones puras (`domain/`)
Una **única** tabla tipada de transiciones por estado de origen (ocho estados, **10 transiciones**; 54 pares restantes rechazados) y funciones puras: `allowedTransitions`, `isTerminal`, `requiresConfirmation(from, to)` y la verificación de un par. Más un único mapa de etiquetas de los nombres exactos del PRD. Sin XState, sin patrón State, sin duplicar reglas en React, la Server Action, el repositorio ni ayudantes de UI. La UI consume capacidades derivadas; el servidor las recalcula sobre la orden vigente. Las funciones `canEditBasicData`, `canEditDiagnosisAndCost`, `canManageNotes` e `isDiagnosisAndCostPublic` de TD §7.3 son primitivas de dominio de las que CHG-11/12/13 dependerán; CHG-10 solo requiere `isTerminal`, `allowedTransitions` y `requiresConfirmation` y **no implementa** las funciones futuras como features.

`requiresConfirmation` devuelve verdadero solo para: `EN_DIAGNOSTICO → ESPERANDO_APROBACION`, `ESPERANDO_APROBACION → EN_REPARACION`, cualquier transición permitida hacia `CANCELADO` y `LISTO_PARA_RECOJO → ENTREGADO`. La cancelación solo se permite desde `SOLICITUD_RECIBIDA`, `EQUIPO_RECIBIDO`, `EN_DIAGNOSTICO` y `ESPERANDO_APROBACION`; `ENTREGADO` y `CANCELADO` no tienen salida. El evento inicial lo crea CHG-05; CHG-10 solo crea los eventos de las diez transiciones.

### D2. Comando y entrada
Server Action `transitionOrderStatus` (transporte; sin REST). Cuerpo parseado de forma explícita (sin `Object.fromEntries` indiscriminado; campos desconocidos ignorados): `orderId` (UUID), `targetStatus` (enum), `expectedVersion` (entero ≥ 1) y `confirmed` (booleano). Nunca se acepta `fromStatus`, `canTransition`, `canCancel`, `nextStatus` ni «avanzar»: el destino es siempre explícito y el servidor carga el estado vigente. `confirmed = true` significa solo que el administrador confirmó en la interfaz: no es firma, prueba ni consentimiento, y no se persiste ninguna fila ni marca de confirmación. En el paso a `EN_REPARACION` significa que el cliente aprobó fuera de FIXORA; no se guardan canal, persona, firma ni fecha aparte (el cambio de estado ya deja su fecha en el historial).

### D3. Orden de evaluación y códigos (precedencia)
`expectedVersion` es la **instantánea que el administrador revisó**: si ya no coincide, la intención se construyó sobre datos obsoletos y el resultado es `STALE_ORDER` **antes** de evaluar la transición contra la instantánea nueva (no se devuelve primero `TRANSITION_NOT_ALLOWED` solo porque el estado vigente cambió). Esto es esencial para `E11`: una confirmación sobre `version = 5` no se reinterpreta contra `version = 6` para producir otro error de dominio. Es una **clarificación operacional** de TD §14.1 y §14.3 (y de `E9`/`E11`); el diagrama de TD §14.4 simplifica la secuencia y no dibuja esta comprobación temprana, lo que se registra para la reconciliación de la Fase 6.5. No se edita el TD.

Flujo del caso de uso:
```text
requireAdmin  →  parseo/validación técnica de la entrada
  →  BEGIN  →  cargar la orden actual
  →  ¿existe?
  →  ¿current.version == expectedVersion?   NO → STALE_ORDER
  →  reglas del ciclo de vida sobre esa instantánea
  →  UPDATE condicional (WHERE id AND version = expectedVersion)
        0 filas → STALE_ORDER
  →  INSERT order_status_history  →  COMMIT
```
Precedencia conceptual: (1) sesión/autorización (`SESSION_EXPIRED`, antes de cualquier mutación); (2) validación técnica de la entrada; (3) orden existente; (4) versión vigente (`STALE_ORDER`); (5) con la misma versión: par no permitido, incluidas la autotransición y las salidas de un estado final → `TRANSITION_NOT_ALLOWED`; luego, transición válida pero sin diagnóstico y costo → `DIAGNOSIS_AND_COST_REQUIRED`; luego, falta de confirmación `E11` → `CONFIRMATION_REQUIRED` (el orden fino entre estos dos últimos lo fija el dominio sin crear una taxonomía nueva); (6) escritura condicional; (7) historial. `ORDER_CLOSED` (DESIGN A.5) se reserva para mutaciones de **otro tipo** sobre una orden terminal (notas, correcciones, diagnóstico y costo en sus changes); un cambio de estado desde `ENTREGADO` o `CANCELADO` es un par inválido de la máquina y devuelve `TRANSITION_NOT_ALLOWED`, sin excepción especial. Los fallos esperados son valores tipados (`ActionResult` de CHG-01), nunca `throw`; lo inesperado es `INTERNAL_ERROR`; ningún resultado de negocio muestra el nombre del código.

### D4. Concurrencia optimista (dos barreras)
`repair_orders.version` (entero ≥ 1, inicial 1) solo lo modifica persistencia; cada transición efectiva incrementa exactamente una vez.
- **Barrera 1 (tras la carga):** `loaded.version != expectedVersion` → `STALE_ORDER`. Detecta que la vista ya estaba desactualizada antes de evaluar la intención.
- **Barrera 2 (escritura):** `UPDATE repair_orders SET status = $target, version = version + 1, updated_at … WHERE id = $id AND version = $expectedVersion`; con 0 filas → `STALE_ORDER` (rollback), sin fusión ni reintento. Detecta la carrera ocurrida **después de la carga y antes del UPDATE**.
**La comparación inicial no sustituye a la OCC**: cargar la versión 5, compararla y hacer un `UPDATE` sin condición de versión está prohibido, y la segunda barrera no se elimina. Aislamiento `READ COMMITTED` (no `SERIALIZABLE`); la transacción por sí sola no sustituye a la versión. Dos transiciones con `expectedVersion = 5`: una hace `5 → 6` y la otra recibe `STALE_ORDER`. La confirmación `E11` queda ligada a la versión revisada; cualquier mutación efectiva de la orden (estado y, cuando existan, diagnóstico, costo o datos básicos) la invalida. Las **notas no incrementan** `repair_orders.version` (usan `order_notes.version`) y no invalidan por sí solas una confirmación. El mecanismo es reutilizable por CHG-11 y CHG-13. Sin idempotency key administrativa: la primera barrera de UX es el control deshabilitado mientras la acción está pendiente; la integridad la da la versión.

### D5. Transacción, historial y segunda barrera de base de datos
Una sola transacción: el `UPDATE` condicional más `INSERT INTO order_status_history (order_id, from_status, to_status, occurred_at)` con **el mismo `now`** inyectado. Cualquier fallo (incluido el del `INSERT`) revierte ambos: nunca estado sin evento, evento sin estado ni versión incrementada sin evento. El historial es *append-only* para el rol runtime (CHG-02), con un evento por transición efectiva y ninguno ante cualquier rechazo; sin autor, motivo, sesión ni IP; se lee del más reciente al más antiguo.

**Defensa en profundidad exacta de CHG-02 (auditada contra su `design.md` y TD §11).** El `CHECK` de transiciones está en **`order_status_history` y valida cada fila por separado**: que su par `from_status → to_status` sea el evento inicial `NULL → SOLICITUD_RECIBIDA` o uno de los 10 pares permitidos. **No** garantiza que `from_status` coincida con el último estado real, que las filas estén encadenadas o en secuencia, que `repair_orders.status` coincida con el último evento, que no se salten eventos con un `UPDATE` directo ni que orden e historial cambien juntos. Complementan: `UNIQUE(order_id, to_status)`, la FK `RESTRICT` y los privilegios *append-only*. Por eso **la máquina de estados vive en domain/application, no en la base de datos**, y la integridad conjunta de orden e historial depende de la transacción única y del repositorio. No hay triggers de negocio. Repositorio funcional específico (`transitionOrderStatus`) sin `GenericRepository` ni tipos Prisma hacia arriba. Esta descripción coincide con CHG-02; si la verificación de la Fase 7 mostrara otra cosa, se reporta sin modificar CHG-02.

### D6. Prerrequisito de diagnóstico y costo (costura de solo lectura)
La transición `EN_DIAGNOSTICO → ESPERANDO_APROBACION` exige diagnóstico y costo. CHG-10 evalúa **solo presencia** (`diagnosis` presente y `estimated_cost` presente) sobre los datos persistidos, leída de las columnas físicas de CHG-02 junto con la orden cargada, sin editar, normalizar, publicar, mostrar ni versionar esos valores y sin puertos/DI formales. La frase del backlog «mientras no exista el proveedor de su precondición» no exige una arquitectura de proveedor: la obligación es **nunca asumir que existen ni permitir el avance sin poder comprobarlo**. **Seguro por defecto:** si no se puede determinar de forma fiable, `DIAGNOSIS_AND_COST_REQUIRED` y ningún write (nunca «desconocido → permitir»). Hasta CHG-11 normalmente no hay forma funcional de poblar esos campos: el avance queda bloqueado, lo que es deliberado. Las pruebas preparan fixtures directamente en PostgreSQL (falta uno, faltan ambos, existen ambos) sin endpoint, Server Action ni UI de prueba y sin puerta trasera en Production. ADM-04 no muestra diagnóstico ni costo (CHG-11).

### D7. Lectura administrativa y proyección
- **DTO administrativo (CHG-09b + CHG-10):** se añade `version` (no se muestra; solo alimenta `expectedVersion`) y `allowedTransitions`, una **colección** mínima de la forma conceptual `[{ targetStatus, requiresConfirmation, blockedReason? }]` (los nombres exactos son detalle de implementación). `blockedReason` solo existe cuando la UI lo necesita; en CHG-10 el caso es `DIAGNOSIS_AND_COST_REQUIRED` para `ESPERANDO_APROBACION` desde `EN_DIAGNOSTICO`. Esa transición **sigue siendo válida en la matriz** y se representa como bloqueada por prerrequisito (no se elimina de la lista); **la cancelación permanece disponible** en `EN_DIAGNOSTICO` aunque falte diagnóstico y costo (el bloqueo del avance no es un bloqueo total). Un simple `nextStatus` no basta porque avance y cancelación coexisten. En `ENTREGADO` y `CANCELADO` es `[]`. No se añaden `canEdit*`, `canManageNotes` ni capacidades futuras al DTO visible aunque existan primitivas internas de dominio.
- **Solo una indicación de presentación, nunca autoridad:** la Server Action ignora cualquier afirmación del cliente sobre permitido, bloqueado o confirmación; recibe `targetStatus`, `expectedVersion` y `confirmed` y lo recalcula todo.
- **Proyección pública:** `status` y `statusTimeline` ya existen (CHG-06); CHG-10 no cambia el contrato: los nuevos eventos aparecen al consultar de nuevo (solo estado y fecha, más reciente primero; sin autor, confirmación, historiales ni metadatos). Sin caché compartida ni tiempo real. `version` nunca aparece en el DTO público.

### D8. UI de ADM-04 (acciones y diálogos)
- Acciones **fuera** del Repair Journey: como máximo el avance normal del estado actual («Avanzar a {siguiente estado}», primaria) y, donde corresponda, «Cancelar orden» (contorno destructivo); sin selector libre, etapas clicables ni lógica de transición en React. En estados finales no hay controles. `RepairJourney` solo presenta.
- **Diálogos `E11` por etapas.** Patrón de DESIGN §12 (chip de transición, «Volver» a la izquierda, acción a la derecha, foco inicial según variante, Escape = Volver, hoja inferior en móvil), sin inventar copy.
  - **#1 (`EN_DIAGNOSTICO → ESPERANDO_APROBACION`):** CHG-10 posee el tipo de confirmación, el patrón, la exigencia de `E11`, su comprobación en servidor, la ligadura a la versión y el estado bloqueado cuando falta diagnóstico y costo. Mientras falten, el control se presenta como **transición bloqueada** (DESIGN §6.1) y el diálogo **no es alcanzable en el flujo normal**: no se abre un diálogo vacío ni se muestran diagnóstico ficticio, `S/ 0.00` ni marcadores. CHG-11 completa el diálogo con el resumen de diagnóstico y costo y los avisos de congelación y publicación al cliente. La evidencia visual completa del resumen se cierra en CHG-11 (CHG-10 prueba `requiresConfirmation`, `CONFIRMATION_REQUIRED`, la ligadura a la versión, `STALE_ORDER` y la transición en servidor con fixture).
  - **#2 y #4:** completos en CHG-10.
  - **#3 (cancelación):** CHG-10 implementa el núcleo: título «¿Cancelar la orden {código}?», variante destructiva, irreversible, «La orden quedará cerrada y no podrá reabrirse» y la acción «Cancelar orden». La frase «Si quieres dejar una explicación pública o interna, regístrala antes de confirmar» **no se muestra** porque el sistema de notas aún no existe y no se instruye algo inejecutable; la añade CHG-12. No hay textarea de motivo, notas falsas ni «Agregar nota». Sin motivo obligatorio ni columna de motivo (`E14`).
  - No se modifica DESIGN; la composición final frente a DESIGN §12 se comprueba en la Fase 6.5.
- Control deshabilitado mientras la acción está pendiente; **sin mutación optimista**: el estado de negocio proviene del resultado y de `refresh()` del servidor; tras el éxito se permanece en el detalle y se refrescan estado, Journey, historial, `version` y acciones.
- Resultados con la presentación de DESIGN: `STALE_ORDER` (§13.5, «Actualizar orden», sin reintento automático), `TRANSITION_NOT_ALLOWED`, `CONFIRMATION_REQUIRED` (no ejecuta; vuelve a iniciarse con el control existente), `DIAGNOSIS_AND_COST_REQUIRED` y `SESSION_EXPIRED` (§13.4). Ninguno es un error inesperado ni expone detalles técnicos.

### D9. Autorización, privacidad y logs
Cada Server Action de transición empieza con `requireAdmin()` (CHG-08) y luego exige `AdminContext`; la página protegida, el layout o un botón deshabilitado no bastan. La sesión debe ser válida al **autorizar** (una transacción ya autorizada puede terminar; TD §14.6). Logs con la lista positiva del logger de CHG-01: no se registran el UUID salvo evento técnico aprobado, nombres, códigos ni cuerpos. Sin eventos de auditoría de negocio.

## Traspasos

- **CHG-11:** edición y publicación de diagnóstico y costo, congelación, sus historiales y el resumen en el diálogo #1; habilita el avance a `ESPERANDO_APROBACION`; cierra `E2E-01`.
- **CHG-12:** notas públicas e internas; usará `isTerminal` y resolverá la carrera nota-contra-cierre con bloqueo de fila (ADR-006); da soporte accionable al aviso de cancelación (`E14`).
- **CHG-13:** corrección de datos básicos con `expectedVersion` e `isTerminal`; recalcula `customer_name_search`.
- La terminalidad canónica (`SC-09`) se establece aquí; las pruebas de terminalidad de diagnóstico, notas y datos básicos llegan con CHG-11/12/13 (evidencia escalonada).

## Risks / Trade-offs

- Alto riesgo de integridad (estados, concurrencia, `E11`): mitigado por tabla única, `CHECK` como segunda barrera, versión, transacción atómica y la prueba exhaustiva de 64 pares.
- Antes de CHG-11 el avance a `ESPERANDO_APROBACION` permanece bloqueado en el producto real; es el comportamiento seguro por defecto.
- Una confirmación invalidada por cualquier cambio de datos básicos en otra pestaña es deliberadamente conservadora (`RIE-06`).
- Un cambio de estado sin motivo estructurado de cancelación (`RIE-09`) y sin autor: aceptado por el PRD.

## Open Questions

| ID | Pregunta | Clasificación |
|---|---|---|
| OQ-1 | Precedencia de `STALE_ORDER`; costura de solo lectura del prerrequisito; diálogos #1 y #3 por etapas; principio de forma de `allowedTransitions` | **RESUELTAS** |
| OQ-2 | Server Action con `refresh()`, diálogos, recuperación tras `STALE_ORDER`, varias pestañas, ruta dinámica y Cache Components | PRE-IMPLEMENTATION AV-1 |
| OQ-3 | `UPDATE` condicional con Prisma, mecánica de la transacción, comportamiento de `CHECK` y privilegios, lectura exacta de la presencia de diagnóstico/costo | PRE-IMPLEMENTATION AV-2 |
| OQ-4 | Forma TypeScript exacta de `allowedTransitions` y de la razón de bloqueo, composición de consultas, fuente del `now`, restauración del foco | IMPLEMENTATION DETAIL |
| OQ-5 | Reconciliación de la Fase 6.5 (ver abajo) | FASE 6.5 RECONCILIATION |
| OQ-6 | Diagnóstico y costo | DEFERRED a CHG-11 |
| OQ-7 | Notas | DEFERRED a CHG-12 |
| OQ-8 | Corrección de datos básicos | DEFERRED a CHG-13 |

**A registrar en la Fase 6.5:** (1) el diagrama de TD §14.4 no muestra la comprobación temprana de versión aunque la ligadura a la versión la exige; (2) el diálogo `E11` #1 obtiene su resumen completo en CHG-11; (3) el diálogo de cancelación obtiene la frase accionable sobre notas en CHG-12. Ninguna pregunta es BLOCKING.

## Pruebas planificadas

**Unitarias (dominio):** barrido **exhaustivo de los 64 pares** (10 permitidos y 54 rechazados, incluida la autotransición); `requiresConfirmation` exhaustivo (verdadero solo en los cuatro casos); `isTerminal` y ausencia de transiciones en `ENTREGADO` y `CANCELADO`; `allowedTransitions` (incluida la coexistencia avance + cancelación y el avance bloqueado); cancelación solo desde los cuatro estados; etiquetas.

**Integración (PostgreSQL real, sin mocks de Prisma):**
- Transición válida: estado nuevo, `version + 1`, exactamente una fila de historial con `from`/`to`/fecha, atomicidad.
- **Precedencia:** (A) *stale + destino ya inválido*: la vista vio la versión 5, otra acción llevó la orden a la versión 6 y a otro estado, y el comando viejo con `expectedVersion = 5` devuelve `STALE_ORDER` aunque el destino ya no sea válido; (B) *misma versión y destino no permitido* devuelve `TRANSITION_NOT_ALLOWED`; (C) *misma versión, transición válida sin diagnóstico/costo* devuelve `DIAGNOSIS_AND_COST_REQUIRED`; (D) *E11 desactualizada*: diálogo abierto en la versión N, otra mutación efectiva lleva a N+1 y la confirmación con `expectedVersion = N` devuelve `STALE_ORDER` (no `CONFIRMATION_REQUIRED` ni `TRANSITION_NOT_ALLOWED`).
- **Carrera tras la carga:** se carga la versión N, otra transacción la lleva a N+1 antes del `UPDATE` y la actualización condicional afecta 0 filas: `STALE_ORDER`; demuestra la necesidad de la segunda barrera (no basta probar la comparación temprana).
- Concurrencia con la misma `expectedVersion`: una gana, una recibe `STALE_ORDER`, un solo evento nuevo, sin reintento.
- `CONFIRMATION_REQUIRED` para cada uno de los cuatro tipos sin escrituras; precondición (falta uno, faltan ambos, existen ambos) por fixture; intentos desde `ENTREGADO` y `CANCELADO` sin escritura (`TRANSITION_NOT_ALLOWED`).
- **Atomicidad:** fallo inyectado en la inserción del historial y en la actualización sin dejar estado sin evento ni evento sin estado.
- Reflejo público (nuevo estado, evento y Journey coherentes, sin datos administrativos) y administrativo (estado, `version`, historial y `allowedTransitions` vigentes); `SESSION_EXPIRED` sin mutación (`SC-12`/`E10`).

**Playwright:** avances disponibles viendo estado, Journey e historial; los diálogos #2, #3 y #4 y, para el #1, el estado bloqueado y, con fixture de prueba permitido, el mecanismo de servidor (sin UI de diagnóstico/costo ni puerta trasera en Production); cancelación con diálogo, terminalidad, Journey y timeline; vista desactualizada con dos pestañas si no resulta frágil (la carrera ya la demuestra integración); móvil y escritorio.

**Contribución:** dueño de `SC-05`, `SC-06`, `SC-09`, `E9`, `E11`, `E13` y `E14` (`E11` #1 y `E14` se completan de forma escalonada con CHG-11 y CHG-12); soporte de `SC-04` y `SC-10`; aporta «registrar → iniciar sesión → localizar → abrir → transiciones» de `E2E-01` sin poder cerrarlo. `TRACEABILITY.md` se actualiza al implementar.
