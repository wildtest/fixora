# Proposal

## Why

Hasta aquí una orden nace en *Solicitud recibida* y puede consultarse y abrirse, pero nada permite hacerla avanzar. FIXORA promete **«tu reparación, siempre bajo control»**: una máquina de estados real, con transiciones controladas, es uno de sus diferenciadores aprobados. Este change entrega el ciclo de vida de la reparación: qué estados existen, qué cambios son válidos, cuáles piden confirmación, cuándo termina la orden y cómo se protege el historial frente a pantallas desactualizadas y acciones concurrentes, y refleja cada cambio en la consulta pública.

## What Changes

- **Máquina de estados V1**: ocho estados, **10 transiciones válidas** y el rechazo de las otras 54 combinaciones de los 64 pares; sin saltos, retrocesos ni reapertura.
- **Cancelación** solo desde los cuatro primeros estados, sin motivo obligatorio e irreversible; **estados finales** (*Entregado*, *Cancelado*) sin transiciones.
- **Cuatro confirmaciones `E11`**, exigidas también por el servidor (`CONFIRMATION_REQUIRED`).
- **Concurrencia optimista**: cada cambio lleva la versión revisada; una orden modificada entretanto produce `STALE_ORDER`, sin fusión ni reintento; la confirmación queda ligada a la versión revisada.
- **Prerrequisito de diagnóstico y costo** para pasar a *Esperando aprobación* (`DIAGNOSIS_AND_COST_REQUIRED`), seguro por defecto.
- **Cambio atómico**: orden y evento de historial de estados en una sola operación.
- **ADM-04**: acciones de avance y de cancelación según el estado, diálogos de confirmación, vista desactualizada y estados finales sin acciones.
- **Consulta pública**: el estado actual, el Repair Journey y el timeline reflejan el cambio persistido.

## Capabilities

### New Capabilities
- `repair-lifecycle`: ciclo de vida de la reparación mediante una máquina de estados estricta, transiciones autorizadas, confirmaciones explícitas y control de concurrencia que preserva la integridad del historial.

### Modified Capabilities
- `public-order-tracking`: se **añaden** requisitos de reflejo público del ciclo de vida. Los de identidad (CHG-05) y consulta (CHG-06) no cambian.
- `admin-order-management`: se **añaden** requisitos de acciones de ciclo de vida en el detalle. Los del panel, el directorio y el detalle (CHG-09a/09b) no cambian.

## Dependencias

- **Hard / Spec-base:** CHG-06 (`public-order-tracking`) y CHG-09b (`admin-order-management`, y por él CHG-09a). CHG-10 puede materializarse mientras esos changes siguen activos porque OpenSpec 1.15.0 se validó con *Modified Capability + ADDED Requirements* frente a predecesores activos.
- **Orden de ejecución:** en la Fase 7, CHG-06, CHG-09a y CHG-09b deben implementarse, verificarse y archivarse antes de aplicar o archivar CHG-10 (política de FIXORA). Sin `/opsx:sync` anticipado.
- Consume: `requireAdmin()`/`AdminContext` (CHG-08), `repair_orders.version`, el historial de estados y sus restricciones (CHG-02), el evento inicial (CHG-05), `RepairJourney` (CHG-06) y el detalle administrativo (CHG-09b).

## Impact

- **Documentos que respaldan el cambio:** PRD §4.4, §4.8, §7.3, `SC-04`–`SC-06`, `SC-09`, `SC-10`, `E9`, `E11`, `E13`, `E14`; `DESIGN.md` ADM-04, PUB-05, §7, §11, §12, §13.5, Apéndice A.5; Technical Design §7.2, §7.3, §14; ADR-006; backlog `CHG-10`.
- **Criterios PRD:** dueño principal de `SC-05`, `SC-06`, `SC-09`, `E9`, `E11`, `E13` y `E14`; soporte de `SC-04` y `SC-10`. No cierra `SC-07`, `SC-08`, `SC-10` completo ni `SC-17` (dependen de CHG-11), ni `E2E-01`.
- **Código afectado (cuando se implemente):** módulo de dominio de la máquina de estados, caso de uso y repositorio de transición, Server Action, extensión del DTO y de la UI de ADM-04 y proyección pública del timeline.
- **Dependencias:** ninguna nueva (sin XState).
- **Fuera de alcance:** edición de diagnóstico y costo y su publicación (CHG-11), notas (CHG-12), corrección de datos (CHG-13), motivo de cancelación, borrado de órdenes, antispam, notificaciones y tiempo real. No se ejecuta el Architecture Validation Gate: AV-1 y AV-2 son previos a `apply`.
