# Proposal

## Why

El taller necesita dejar constancia escrita en cada reparación: avisos que el cliente debe ver («llamamos para coordinar el recojo») y observaciones que solo el taller debe conocer («cliente pidió no abrir la batería»). Hoy ADM-04 no tiene dónde escribirlas, y el cliente solo ve datos estructurados. Este change entrega las **notas públicas e internas** con una separación fuerte entre lo que ve el cliente y lo que solo ve el taller (`SC-11`), controles de concurrencia propios y una resolución explícita de la carrera entre escribir una nota y cerrar la orden.

## What Changes

- **Notas con dos visibilidades inmutables**: `PUBLIC` (el cliente las ve en la consulta) e `INTERNAL` (solo administración). Para corregir la visibilidad se elimina la nota y se crea otra.
- **Crear, editar y eliminar** (físicamente) mientras la orden no sea final; en *Entregado* y *Cancelado* las notas existentes se muestran de solo lectura y las mutaciones devuelven `ORDER_CLOSED`.
- **Validación**: contenido recortado, no vacío, hasta **2000 caracteres de texto**, siempre como texto.
- **Concurrencia propia de la nota** (`STALE_NOTE`, `NOTE_NOT_FOUND`), independiente de la versión de la orden: las notas **no** incrementan `repair_orders.version` ni invalidan una confirmación `E11` abierta.
- **Serialización nota contra cierre**: cada operación de nota bloquea la fila de la orden dentro de su transacción y verifica que no sea final.
- **Sin historial de notas**, sin marca de «editada», sin autor, sin confirmación al eliminar.
- **ADM-04**: compositor y lista en los bloques Público e Interno, edición y eliminación por ítem, solo lectura en estados finales y la frase de la cancelación sobre registrar una explicación antes de confirmar (`E14`).
- **PUB-05**: lista de notas públicas (más reciente primero), leída con una proyección que nunca carga notas internas.

## Capabilities

### New Capabilities
- `order-notes`: registro, mantenimiento y eliminación de notas públicas e internas de una reparación mientras la orden está abierta, preservando su visibilidad, su concurrencia y la separación entre información del cliente y del taller.

### Modified Capabilities
- `public-order-tracking`: se **añaden** requisitos de notas públicas en la consulta.
- `admin-order-management`: se **añaden** requisitos de notas en el detalle y la frase de cancelación. Los de CHG-09a/09b, CHG-10 y CHG-11 no cambian.

## Dependencias

- **Hard: CHG-10. Spec-base: CHG-11** (cadenas de `public-order-tracking` y `admin-order-management`, que ya incluyen CHG-06, 09a, 09b, 10 y 11). CHG-12 puede materializarse con esos changes activos porque OpenSpec 1.15.0 se validó con *Modified Capability + ADDED Requirements*. En la Fase 7, CHG-10 y CHG-11 deben estar implementados, verificados y archivados antes de aplicar o archivar CHG-12; sin `/opsx:sync` anticipado.
- Consume `requireAdmin()`/`AdminContext` (CHG-08), `isTerminal`/`canManageNotes` y el diálogo de cancelación (CHG-10), `order_notes` y su restricción (CHG-02), la proyección pública (CHG-06) y los bloques Público/Interno (CHG-09b, CHG-11).

## Impact

- **Documentos que respaldan el cambio:** PRD §4.6–§4.8, `E12`, `E14`, `E9`, `SC-09`, `SC-11`, `SC-12`; `DESIGN.md` ADM-04, PUB-05, §9, §10, §11, §12; Technical Design §9, §10, §14, §17, §18; ADR-006; backlog `CHG-12`.
- **Criterios PRD:** dueño de `E12`; completa `E14` junto con CHG-10; evidencia de `SC-09` para notas (los datos básicos los completa CHG-13); `SC-11` fuerte; regresión de `SC-12`.
- **Código afectado (cuando se implemente):** primitivas de dominio de notas, operaciones de repositorio con bloqueo de fila, Server Actions, proyección pública de notas, DTO y UI de ADM-04 y PUB-05, y pruebas.
- **Dependencias:** ninguna nueva.
- **Fuera de alcance:** corrección de datos básicos (CHG-13), historial de notas, autor, «editada», cambio de visibilidad, papelera o deshacer, confirmación al eliminar, motivo de cancelación obligatorio, seguridad formal (CHG-14) y lanzamiento (CHG-15). AV-2 (bloqueo de fila) es previo a `apply`.
