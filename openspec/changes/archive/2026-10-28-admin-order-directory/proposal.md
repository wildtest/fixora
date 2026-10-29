# Proposal

## Why

Con el registro público (CHG-05) y el acceso administrativo (CHG-08), el taller ya recibe órdenes y tiene una zona protegida, pero el administrador todavía no puede ver qué hay ni localizar una orden. Este change entrega el **lado de lectura** de la gestión de órdenes: un resumen operativo y un directorio consultable, para que el administrador supervise el taller y encuentre rápidamente una reparación por su código o por el nombre del cliente, sin modificar nada todavía.

## What Changes

- **Dashboard** (ADM-02) en `/admin`: conteo de órdenes por cada uno de los ocho estados y las cinco órdenes más recientes, sin métricas adicionales.
- **Directorio de órdenes** (ADM-03) en `/admin/ordenes`: lista ordenada por fecha de registro, la más reciente primero, con código, fecha, cliente, equipo y estado.
- **Búsqueda** en un único campo: código de seguimiento exacto o nombre del cliente por coincidencia parcial sin distinguir mayúsculas ni tildes; los comodines se tratan como texto literal.
- **Filtro por estado** combinable con la búsqueda.
- **Paginación** de 20 por página, con total del conjunto filtrado y orden estable.
- **Estados vacío y de error** seguros.
- **Lecturas protegidas**: cada carga y cada interacción exigen una sesión administrativa válida (consume CHG-08); los datos administrativos no se cachean.

## Capabilities

### New Capabilities
- `admin-order-management`: supervisión y localización administrativa de órdenes de reparación mediante un resumen operativo y un directorio consultable. CHG-09b y los changes posteriores la extenderán.

### Modified Capabilities
Ninguna. No se modifica `admin-access`.

## Dependencias

- **Hard:** CHG-05 (órdenes) y CHG-08 (acceso y `requireAdmin()`); el PRD y TD §19 son la fuente funcional y técnica.
- **Spec-base futura:** CHG-09a introduce `admin-order-management`. CHG-09b puede materializarse mientras CHG-09a siga activo, con el patrón validado en OpenSpec 1.15.0 de *Modified Capability + ADDED Requirements*. **CHG-09a debe implementarse, verificarse y archivarse antes de archivar o aplicar CHG-09b**, según la política de ejecución de FIXORA; no hay `/opsx:sync` anticipado.

## Impact

- **Documentos que respaldan el cambio:** PRD §4.2, §4.9, `SC-03` (parcial), `E7`, `E8`, `E15`; `DESIGN.md` ADM-02, ADM-03, §6.7, §6.10, §6.16; Technical Design §17, §19; ADR-003; backlog `CHG-09a`.
- **Criterios PRD:** `SC-03` (parcial: localizar por código, nombre o estado; abrir el detalle es de CHG-09b), `E7`, `E8` y apoyo de `E15`. Regresión de `SC-12`, cuyo dueño principal es CHG-08. Aporta el tramo «iniciar sesión y localizar la orden» de `E2E-01`.
- **Código afectado (cuando se implemente):** `src/app/admin` (dashboard y `ordenes`), casos de uso de aplicación, repositorio administrativo de lectura, DTO administrativos y pruebas.
- **Dependencias:** ninguna nueva.
- **Fuera de alcance:** detalle de una orden y la navegación funcional hacia él (CHG-09b), edición, cambios de estado, diagnóstico, costo, notas, correcciones, creación o eliminación de órdenes, exportaciones, reportes, gráficos, métricas, filtros adicionales, ordenamiento por columnas, tiempo real y API REST. No se ejecuta el Architecture Validation Gate: AV-2 (escape de comodines, columna de búsqueda) y AV-1 son previos a `apply`.
