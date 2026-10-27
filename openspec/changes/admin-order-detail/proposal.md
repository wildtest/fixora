# Proposal

## Why

CHG-09a permite al administrador ver y localizar órdenes, pero no abrir ninguna: el panel y el directorio se entregaron sin navegación al detalle para no inventar una pantalla inexistente. Este change completa ese tramo con el **detalle administrativo real de una orden en modo lectura**: los datos que el taller necesita para identificar y contactar al cliente, el equipo, el problema, el estado y el historial de estados ya registrado. Es además la superficie sobre la que actuarán después el ciclo de vida, el diagnóstico, las notas y las correcciones.

## What Changes

- **Detalle administrativo** (ADM-04) en `/admin/ordenes/[id]`, protegido por la sesión administrativa; **solo lectura por defecto en este change (línea base)**: los changes posteriores (ciclo de vida, diagnóstico y costo, notas y correcciones) añaden las mutaciones que autorizan expresamente sus propios requisitos.
- **Datos mostrados:** código de seguimiento, fecha de registro y estado actual; nombre, teléfono y correo (si existe) del cliente; tipo, marca y modelo (si existe) del equipo; descripción del problema.
- **Estado actual** con el recorrido de etapas y el **historial administrativo de estados** actualmente persistido, con su fecha, más reciente primero.
- **Navegación funcional** desde las cinco órdenes recientes del panel y desde las filas del directorio, y regreso al directorio.
- **Orden inexistente** tratada de forma segura, sin detalles técnicos.
- **Proyección administrativa** de lista positiva, separada de la pública.

## Capabilities

### New Capabilities
Ninguna.

### Modified Capabilities
- `admin-order-management`: se le **añaden** requisitos de detalle administrativo en lectura y de navegación a él. Los requisitos del panel y del directorio introducidos por CHG-09a no cambian.

## Dependencias

- **Hard:** CHG-05 y CHG-08. **Spec-base: CHG-09a.**
- CHG-09b puede materializarse mientras CHG-09a sigue activo porque OpenSpec 1.15.0 se validó con *Modified Capability + ADDED Requirements* frente a un predecesor activo. **CHG-09a debe implementarse, verificarse y archivarse antes que CHG-09b** (política de ejecución de FIXORA); sin `/opsx:sync` anticipado.
- **Blando:** el recorrido de etapas reutiliza el componente de presentación de estado de CHG-06 (un solo componente para PUB-05 y ADM-04, DESIGN §7); ver el `design.md`.

## Impact

- **Documentos que respaldan el cambio:** PRD §4.2, §4.6, §4.7, `SC-03`, `SC-10` (presentación), `SC-11` (separación); `DESIGN.md` ADM-04, §7.6, §8.2, §9; Technical Design §6, §16, §17; ADR-005; backlog `CHG-09b`.
- **Criterios PRD:** `SC-03` (completa «abrir su detalle»), presentación de `SC-10` para los cambios de estado, y la frontera de `SC-11` como regresión. Aporta el tramo «abrir el detalle» de `E2E-01`.
- **Código afectado (cuando se implemente):** `src/app/admin/ordenes/[id]`, caso de uso y repositorio de lectura administrativa, DTO de detalle, y los enlaces del panel y del directorio.
- **Dependencias:** ninguna nueva.
- **Fuera de alcance:** cambios de estado y cancelación (CHG-10), diagnóstico y costo (CHG-11), notas públicas e internas (CHG-12), corrección de datos (CHG-13), controles deshabilitados o marcadores de esas funciones, edición de cualquier tipo y creación o eliminación de órdenes. No se ejecuta el Architecture Validation Gate: AV-2 y AV-1 son previos a `apply`.
