# ADR-006 — Máquina de estados, concurrencia e idempotencia

> Estado: Aceptado
> Fecha: 2026-10-26
> Fase: 5 — Technical Design / Arquitectura
> Relacionado con: [TECHNICAL-DESIGN.md](../TECHNICAL-DESIGN.md) §7, §8, §9, §13, §14 · ADR-003, ADR-005, ADR-007

## Contexto

El PRD define ocho estados, una matriz cerrada de transiciones (solo avance, sin saltos ni retrocesos), cuatro confirmaciones obligatorias (`E11`), congelamiento de diagnóstico y costo desde `ESPERANDO_APROBACION` y estados finales de solo lectura (`SC-05` a `SC-10`). También exige que una vista desactualizada no provoque acciones inválidas (`E9`), que un reenvío accidental del registro no duplique órdenes (`E1`) y que una sesión inválida no deje estado parcial (`E10`). Hay un único administrador, pero puede tener varias pestañas abiertas.

## Problema / fuerzas que condicionan la decisión

- Las reglas deben ser **una sola definición** verificable, no lógica repartida.
- Un error al congelar diagnóstico o costo no se puede corregir (`RIE-06`): lo que se confirma debe ser exactamente lo que se revisó.
- La concurrencia entre pestañas, acciones repetidas y notas contra el cierre de la orden debe tener un comportamiento definido.
- `E1` prohíbe detectar duplicados comparando contenido.
- No se usan triggers de negocio (ADR-003).

## Alternativas consideradas

### Representación de la máquina de estados
- **Tabla declarativa tipada más funciones puras en `domain`** *(elegida)*: es literalmente la matriz del PRD.
- **Lógica dispersa en componentes, acciones y consultas:** imposible de probar de forma exhaustiva.
- **Patrón State (una clase por estado):** sobredimensionado para ocho estados.
- **XState u otra librería:** dependencia innecesaria.

### Control de concurrencia en la orden
- **Versión optimista (`repair_orders.version`)** *(elegida)*.
- **Bloqueo pesimista global:** serializa pero no detecta que la vista estaba desactualizada (`E9`) y exige SQL específico.
- **Token ad hoc por caso** (estado esperado más hash de lo revisado): soluciones distintas para cada situación.
- **«Última escritura gana»:** pierde cambios en silencio.

### Concurrencia en las notas
- **Versión propia por nota** (`order_notes.version`) *(elegida)*, porque no tener historial de notas (`RIE-04`) no implica aceptar pérdidas silenciosas.
- **«Última escritura gana» entre notas:** rechazada.

### Aislamiento transaccional
- **`READ COMMITTED` más actualización condicional** *(elegido)*.
- **`SERIALIZABLE`:** innecesario para operaciones sobre una sola fila y añade reintentos.

### Idempotencia del registro
- **Clave por intento generada en el cliente, con su hash persistido** *(elegida)*.
- **Solo deshabilitar el botón:** no cubre recarga, retorno, otra pestaña ni reintento de red.
- **Detección por contenido o ventana temporal:** prohibida por `E1`.
- **Sin idempotencia:** incumple `E1`.

## Decisión

- **Ocho estados y diez transiciones** en una tabla declarativa de `domain`, con funciones puras para capacidades (`allowedTransitions`, `canEditBasicData`, `canEditDiagnosisAndCost`, `canManageNotes`, `isTerminal`, `requiresConfirmation`, `isDiagnosisAndCostPublic`). Las capacidades enviadas a la UI son indicaciones; el servidor las recalcula sobre la orden vigente.
- **La aprobación del cliente ocurre fuera de FIXORA**; la confirmación `E11` significa que el administrador declara que ya ocurrió.
- **`E11` también forma parte del contrato del servidor:** `requiresConfirmation(from, to)` es la única función que decide; sin confirmación explícita, `CONFIRMATION_REQUIRED` y ningún cambio. Es integridad del flujo, no una prueba criptográfica.
- **Congelamiento:** diagnóstico y costo editables hasta `EN_DIAGNOSTICO`, requeridos para pasar a `ESPERANDO_APROBACION` y congelados desde ahí; un valor idéntico al vigente no genera `UPDATE`, versión ni historial.
- **`repair_orders.version`** (inicial 1): +1 por cada cambio efectivo de la fila (estado, diagnóstico, costo, datos básicos). Todo comando que la modifica lleva **`expectedVersion`**; los de transición llevan además `targetStatus` explícito y `confirmed` cuando corresponde. La actualización condicional por versión que afecta 0 filas devuelve **`STALE_ORDER`**, sin fusión ni reintento.
- **Las confirmaciones `E11` se ligan a la versión revisada:** la transición a `ESPERANDO_APROBACION` no puede congelar un diagnóstico o costo distinto del mostrado al abrir el diálogo.
- **`order_notes.version`** con `expectedNoteVersion`: `STALE_NOTE` si cambió, `NOTE_NOT_FOUND` si ya no existe.
- **Notas contra cierre:** cada operación de nota, dentro de su transacción, bloquea la fila de la orden (SQL parametrizado controlado, p. ej. `SELECT … FOR UPDATE`), verifica que no sea terminal y opera; una transición a un estado final toca la misma fila. Así nota y cierre se serializan, y la nota tardía recibe `ORDER_CLOSED`. No se modifica `updated_at` solo para bloquear.
- **Transacciones atómicas** por operación: transición = actualización condicional + `order_status_history`; diagnóstico y costo, igual con su historial; registro = orden + evento inicial + idempotencia. Aislamiento `READ COMMITTED`.
- **Una transacción sola no sustituye a la concurrencia optimista:** es la cláusula de versión la que detecta el desfase.
- **Idempotencia del registro:** clave aleatoria por intento de registro (nunca embebida en HTML estático), persistida solo como `SHA-256` en `registration_idempotency` (`UNIQUE`), de vida igual a la orden. Un replay devuelve la confirmación original, ignorando el contenido nuevo. Una validación fallida no consume la clave. La carrera entre dos peticiones con la misma clave se resuelve por la unicidad.
- **No hay claves de idempotencia para comandos administrativos:** primera barrera, botón deshabilitado; segunda, la versión.
- **Dinero:** cadena decimal canónica de dos decimales y `BigInt` de céntimos en el dominio, nunca `number`; sin redondeo silencioso.
- Solo se reintenta automáticamente la colisión del código de seguimiento; los demás errores transitorios no se reintentan en silencio.

## Justificación

Una sola definición declarativa hace la matriz auditable y probable de forma exhaustiva (64 pares). La versión optimista es el mecanismo que convierte «la vista estaba desactualizada» en un resultado explícito y, al ligarla a la confirmación, protege exactamente la operación irreversible que `RIE-06` destaca. Los bloqueos quedan acotados al único caso en que dos tablas deben coordinarse (nota frente a cierre). La idempotencia por clave resuelve `E1` sin comparar contenido.

## Consecuencias positivas

- Comportamiento definido y probable ante pestañas múltiples y acciones repetidas.
- Ninguna fusión ni reintento silencioso: el administrador actualiza la vista y decide.
- Mínimo coste de infraestructura: una columna por tabla y una tabla pequeña de idempotencia.

## Consecuencias / trade-offs

- Es **conservador**: un cambio de datos básicos en otra pestaña también invalida una confirmación en curso.
- El administrador debe actualizar la vista tras `STALE_ORDER`/`STALE_NOTE`.
- La fila de idempotencia vive tanto como la orden (sin limpieza).
- PostgreSQL no garantiza por sí solo la secuencia histórica; la preservan dominio, repositorio, transacción, versión y pruebas (ADR-003).

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Carrera nota contra cierre | Bloqueo de fila con orden determinista; pruebas con entrelazado determinista |
| Colisión del código al registrar | Reintento acotado; falla segura al agotarse |
| Discrepancia dominio ↔ `CHECK` | Prueba exhaustiva de los 64 pares estado→estado más pruebas unitarias directas |

## Qué queda deliberadamente fuera

Re-diagnóstico, nuevos presupuestos, cancelación después de `EN_REPARACION`, historial de notas, rollback de estados, ciclo de vida exacto de la clave en el navegador y SQL concreto de los bloqueos (Specs).

## Condiciones para revisar este ADR

- Aparecen **varios administradores concurrentes** o un volumen que haga costoso el modelo.
- El PRD cambia la matriz de transiciones o las confirmaciones.
- Una prueba de concurrencia demuestra que `READ COMMITTED` más versión no basta.
- Se exige historial o versionado de notas.

## Referencias

- PRD: `SC-05` a `SC-10`, `E1`, `E9`, `E10`, `E11`, `E12`, `RIE-04`, `RIE-06`.
- [TECHNICAL-DESIGN.md](../TECHNICAL-DESIGN.md) §7, §8, §9, §13, §14.
- Relacionado con: [ADR-003](ADR-003-postgresql-prisma-y-migraciones.md), [ADR-005](ADR-005-seguimiento-publico-y-privacidad.md), [ADR-007](ADR-007-seguridad-y-proteccion-frente-abuso.md).
