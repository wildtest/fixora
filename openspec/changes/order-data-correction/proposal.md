# Proposal

## Why

Los datos con que el cliente registró su equipo pueden traer errores (un teléfono mal tecleado, una marca equivocada, una descripción incompleta). Hoy ADM-04 muestra esos datos en solo lectura y el taller no puede corregirlos sin dejar la orden inconsistente. Este change entrega **«Editar datos»**: la corrección conjunta de los datos básicos de una orden abierta, con las mismas reglas del registro, sin tocar la identidad de la orden (el código de seguimiento nunca cambia) y con control de concurrencia, de modo que ninguna corrección pise un cambio hecho desde otra pantalla. Es el último comportamiento funcional del PRD §4 (cierra `SC-09` y, junto con CHG-12, el alcance funcional de V1 a nivel de especificación).

## What Changes

- **Acción «Editar datos»** en ADM-04, solo mientras la orden no sea final: activa la edición **dentro del mismo bloque** (equipo y descripción en el bloque Público; nombre, teléfono y correo en el bloque Interno), con «Guardar cambios» y «Cancelar edición». Sin pantalla, modal ni confirmación adicional.
- **Campos corregibles, y solo estos siete:** nombre, teléfono, correo (opcional), tipo de equipo, marca, modelo (opcional) y descripción del problema.
- **Mismas validaciones que el registro** (`E3`): mismas reglas, límites en caracteres de texto y normalización; no hay excepciones administrativas.
- **Corrección conjunta y atómica**: un solo guardado actualiza todos los campos o ninguno. Una corrección efectiva incrementa la versión de la orden exactamente una vez.
- **Concurrencia (`E9`)**: el guardado lleva la versión revisada; si la orden cambió, `STALE_ORDER`, sin fusión. Una corrección efectiva **invalida una confirmación `E11` abierta**; un guardado sin cambios no.
- **Guardado sin cambios**: éxito sin efecto (sin escritura, sin versión nueva).
- **Búsqueda por nombre coherente**: si cambia el nombre, el valor derivado de búsqueda se recalcula en la misma operación atómica, con la misma regla compartida con el registro.
- **Código de seguimiento inmutable** (`E17`), estados finales de solo lectura (`ORDER_CLOSED` ante una mutación manipulada) y **sin historial de correcciones**.

## Capabilities

### New Capabilities
Ninguna.

### Modified Capabilities
- `admin-order-management`: se **añaden** requisitos de corrección de datos básicos en el detalle administrativo. Los de CHG-09a/09b, CHG-10, CHG-11 y CHG-12 no cambian. No se modifica `public-order-tracking`: la consulta pública ya lee los valores vigentes.

## Dependencias

- **Hard: CHG-10. Spec-base: CHG-12** (cadena de `admin-order-management`: CHG-11 → CHG-12 → CHG-13, con CHG-11 ya archivado por transitividad). CHG-13 puede materializarse con esos changes activos porque OpenSpec 1.15.0 se validó con *Modified Capability + ADDED Requirements*. En la Fase 7, CHG-10, CHG-11 y CHG-12 deben estar implementados, verificados y archivados antes de aplicar o archivar CHG-13; sin `/opsx:sync` anticipado.
- Consume: `requireAdmin()`/`AdminContext` (CHG-08); los validadores y la primitiva de búsqueda por nombre del registro (CHG-05); la columna física derivada (CHG-02); la búsqueda que la lee (CHG-09a); el detalle con sus bloques (CHG-09b); `isTerminal`/`canEditBasicData` y el mecanismo de `expectedVersion` (CHG-10).

## Impact

- **Documentos que respaldan el cambio:** PRD §4.8, `E3`, `E9`, `E17`, `SC-09`, `SC-11`, `SC-12`; `DESIGN.md` ADM-04 y §6.17; Technical Design §7, §14, §17, §18, §19; ADR-006; backlog `CHG-13`.
- **Criterios PRD:** soporte de `E3` para el administrador; `E17` (código no editable); completa `SC-09` (datos básicos); regresión de `SC-11` y `SC-12`; con CHG-12 completa **M4** a nivel de especificación (no implementada ni verificada).
- **Código afectado (cuando se implemente):** operación de corrección (Server Action, caso de uso, repositorio con actualización condicional), reutilización de validadores y de la primitiva de búsqueda, edición en línea de ADM-04 y pruebas.
- **Dependencias:** ninguna nueva. Sin AV adicional.
- **Fuera de alcance:** edición del código, del estado, del diagnóstico, del costo o de las notas por este formulario; historial de correcciones; entidad de cliente/CRM; crear o eliminar órdenes; Security Pass (CHG-14) y release (CHG-15).
