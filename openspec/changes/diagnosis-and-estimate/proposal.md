# Proposal

## Why

CHG-10 dejó el ciclo de vida completo, pero el avance a *Esperando aprobación* permanece bloqueado porque no existe forma de registrar diagnóstico ni costo estimado. Este change completa la parte central del servicio: que el taller **registre y mantenga el diagnóstico y el costo estimado** mientras trabaja, y que, al pasar a la etapa de aprobación, ambos se **congelen y se publiquen** al cliente con una regla de privacidad estricta: antes de esa etapa el cliente nunca los recibe, aunque ya estén guardados. Con él se cierra el recorrido obligatorio de extremo a extremo (`E2E-01`).

## What Changes

- **Diagnóstico** (texto) y **costo estimado** (monto único, mayor que cero, hasta dos decimales, PEN implícito): se crean, modifican y limpian solo en *Solicitud recibida*, *Equipo recibido* y *En diagnóstico*; desde *Esperando aprobación* quedan **congelados** y en *Entregado*/*Cancelado* son de solo lectura.
- **Dinero exacto**: cadena decimal canónica de dos decimales, comparación con céntimos enteros (`BigInt`), sin punto flotante ni redondeo.
- **Sin cambios efectivos, sin efectos** (*no-op* simétrico): no hay versión nueva ni historial.
- **Historiales de diagnóstico y de costo** (anterior, nuevo, fecha), atómicos con el cambio, sin autor.
- **Concurrencia optimista** con la versión revisada (`STALE_ORDER`) reutilizando el mecanismo de CHG-10.
- **Publicación derivada del estado**: el cliente ve diagnóstico y costo desde *Esperando aprobación*; una orden cancelada los muestra solo si llegó a esa etapa. Sin indicador «publicado» ni valores no autorizados cargados por la consulta pública (`SC-11`).
- **ADM-04**: campos editables o congelados, rótulos de visibilidad, historial administrativo combinado y el resumen real del diálogo `E11` #1.
- **PUB-05**: bloque de diagnóstico y costo con su jerarquía propia, separado de las futuras notas.

## Capabilities

### New Capabilities
- `diagnosis-and-estimate`: registro y mantenimiento del diagnóstico y del costo estimado mientras son editables, historial de sus cambios y publicación irreversible al cliente al alcanzar la etapa de aprobación.

### Modified Capabilities
- `admin-order-management`: se **añaden** requisitos de edición, congelación, historial combinado y resumen de confirmación en el detalle. Los de CHG-09a, 09b y CHG-10 no cambian.
- `public-order-tracking`: se **añaden** requisitos de visibilidad de diagnóstico y costo. Los de CHG-05, CHG-06 y CHG-10 no cambian.

## Dependencias

- **Hard / Spec-base: CHG-10**, para ambas cadenas (administrativa y de seguimiento). CHG-11 puede materializarse mientras CHG-10 está activo porque OpenSpec 1.15.0 se validó con *Modified Capability + ADDED Requirements* frente a un predecesor activo. **CHG-10 debe implementarse, verificarse y archivarse antes que CHG-11**; sin `/opsx:sync` anticipado.
- Consume `requireAdmin()`/`AdminContext` (CHG-08), `canEditDiagnosisAndCost`, `isTerminal`, `expectedVersion` y el mecanismo de transición (CHG-10), las columnas, historiales y restricciones físicas (CHG-02), `RepairJourney` y la proyección pública (CHG-06) y el detalle (CHG-09b).

## Impact

- **Documentos que respaldan el cambio:** PRD §4.4–§4.8, `SC-07`, `SC-08`, `SC-10`, `SC-17`, `E5`, `E6`, `RIE-05`, `RIE-06`, `RIE-07`; `DESIGN.md` ADM-04, §11, §12, PUB-05; Technical Design §7.3, §8, §14, §17, §18; ADR-005, ADR-006; backlog `CHG-11`.
- **Criterios PRD:** completa `SC-07` junto con CHG-10; dueño principal de `SC-08`; completa el historial administrativo de `SC-10`; cierra `SC-17` (`E2E-01`) y es propietario primario de la evidencia del ciclo completo de `SC-04` (soporte CHG-10) con una prueba distinta; `E5` y `E6`; aporta a `SC-09` la terminalidad de diagnóstico y costo.
- **Código afectado (cuando se implemente):** primitivas de dominio de diagnóstico y dinero, operaciones de mutación y repositorio, proyección pública condicionada, DTO y UI de ADM-04 y PUB-05, y pruebas.
- **Dependencias:** ninguna nueva.
- **Fuera de alcance:** notas (CHG-12), corrección de datos básicos (CHG-13), descongelar, nuevo presupuesto, rediagnóstico, moneda seleccionable, desglose, máximo de negocio, indicador «publicado» y seguridad/lanzamiento (CHG-14, CHG-15). AV-2 (`NUMERIC`) es previo a `apply`.
