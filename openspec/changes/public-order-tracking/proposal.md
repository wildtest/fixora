# Proposal

## Why

Con CHG-05 el cliente ya obtiene un código de seguimiento, pero todavía no puede usarlo. Este change entrega el segundo tramo del recorrido del cliente: **consultar el estado de su reparación sin cuenta**, usando únicamente su código. Como el código es una credencial de lectura (secreto *bearer*), la consulta debe nacer con sus controles: respuesta uniforme ante códigos inválidos, límite de intentos, una proyección pública mínima (`SC-11`) y ausencia del código en URL, almacenamiento, caché y registros.

## What Changes

- **Consulta pública** (PUB-04 → PUB-05) con el código de seguimiento, sin cuenta ni datos adicionales.
- **Normalización exacta** del código ingresado (espacios exteriores y mayúsculas/minúsculas ASCII; coincidencia exacta).
- **Respuesta uniforme** para código mal formado e inexistente.
- **Protección contra abuso**: 10 intentos fallidos en 10 minutos bloquean 15 minutos (`RATE_LIMITED`); si la protección no puede evaluarse, la consulta falla cerrada (`SERVICE_UNAVAILABLE`).
- **Proyección pública** con lista positiva: código, estado actual, equipo, descripción y eventos públicos de estado ya persistidos; sin datos personales ni internos.
- **Presentación del estado actual** y del Repair Journey como componente de presentación.
- **Tratamiento del código como secreto**: fuera de URL, almacenamiento persistente, caché y registros; el resultado no se restaura al navegar fuera y volver.
- **Sin recuperación pública** del código.

## Capabilities

### New Capabilities
Ninguna.

### Modified Capabilities
- `public-order-tracking`: se le **añaden** requisitos de consulta, normalización, respuesta uniforme, protección contra abuso, proyección pública, presentación del estado y manejo del secreto. Los cuatro requisitos de identidad del código (formato, unicidad, impredecibilidad, inmutabilidad) introducidos por CHG-05 no cambian.

## Dependencias

- **Predecesor / Spec-base: CHG-05** (`repair-request-registration`). La capability `public-order-tracking` existe hoy solo como delta del change activo CHG-05. Este change puede materializarse mientras CHG-05 está activo porque OpenSpec 1.15.0 se validó experimentalmente con *Modified Capability + ADDED Requirements* frente a un predecesor activo. **CHG-05 debe implementarse, verificarse y archivarse antes que CHG-06** (política de ejecución de FIXORA); nunca se archiva CHG-06 antes.
- Consume el limitador de CHG-02, el `ActionResult`/logger de CHG-01 y el shell de CHG-04.

## Impact

- **Documentos que respaldan el cambio:** PRD §4.1, §4.6, `SC-02`, `SC-11`, `SC-13`, `E4`, `E6`, `E15`, `RIE-01`; `DESIGN.md` PUB-04, PUB-05, §7, §8.1, §13.2, Apéndice A.5; Technical Design §12, §17, §18, §22; backlog `CHG-06`.
- **Criterios PRD:** evidencia de `SC-02`, `SC-11` (núcleo), `SC-13`, `E4`, `E15` y parcial de `E6`; `E2E-01` avanza hasta la consulta.
- **Código afectado (cuando se implemente):** `src/app/consultar`, módulos de dominio (normalización), aplicación (caso de uso público), infraestructura (consulta de proyección pública), UI de consulta y resultado, y pruebas.
- **Dependencias:** ninguna nueva.
- **Fuera de alcance:** publicación de diagnóstico y costo (CHG-11), notas públicas (CHG-12), transiciones y cancelación (CHG-10), búsqueda administrativa por nombre o código (CHG-09a), recuperación de código, administración y login. No se ejecuta el Architecture Validation Gate: AV-1 y AV-2 son previos a `apply`.
