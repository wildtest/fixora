# repair-lifecycle Specification

## Purpose
Controlar el ciclo de vida de cada reparación mediante una máquina de estados estricta, transiciones autorizadas, confirmaciones explícitas y control de concurrencia que preserve la integridad del historial.

## Requirements

### Requirement: Repair states
FIXORA SHALL manejar exactamente ocho estados de reparación: Solicitud recibida, Equipo recibido, En diagnóstico, Esperando aprobación, En reparación, Listo para recojo, Entregado y Cancelado, y toda orden SHALL encontrarse en uno de ellos.

#### Scenario: Estados disponibles
- **WHEN** se consultan los estados posibles de una orden
- **THEN** existen exactamente esos ocho, sin estados intermedios ni alias

### Requirement: Allowed state transitions
FIXORA SHALL permitir únicamente estas diez transiciones: de Solicitud recibida a Equipo recibido o a Cancelado; de Equipo recibido a En diagnóstico o a Cancelado; de En diagnóstico a Esperando aprobación o a Cancelado; de Esperando aprobación a En reparación o a Cancelado; de En reparación a Listo para recojo; y de Listo para recojo a Entregado.

#### Scenario: Transición válida
- **WHEN** el administrador solicita una de las diez transiciones permitidas y se cumplen sus demás condiciones
- **THEN** la orden pasa al estado solicitado

### Requirement: Invalid transition rejection
FIXORA SHALL rechazar cualquier otro cambio de estado, incluidos los saltos, los retrocesos, la reapertura, el cambio al mismo estado y las salidas de un estado final, sin modificar la orden ni su historial.

#### Scenario: Salto de estado
- **WHEN** se solicita pasar de Solicitud recibida a Entregado
- **THEN** el sistema rechaza el cambio y la orden y su historial no se modifican

#### Scenario: Mismo estado
- **WHEN** se solicita pasar a un estado igual al actual
- **THEN** el sistema lo rechaza y no lo trata como un cambio exitoso

#### Scenario: Retroceso
- **WHEN** se solicita volver a un estado anterior
- **THEN** el sistema rechaza el cambio

### Requirement: Cancellation rules
FIXORA SHALL permitir cancelar una orden solo desde Solicitud recibida, Equipo recibido, En diagnóstico o Esperando aprobación, sin exigir motivo, y la cancelación SHALL ser irreversible.

#### Scenario: Cancelación permitida
- **WHEN** el administrador cancela una orden en Esperando aprobación
- **THEN** la orden pasa a Cancelado sin pedir motivo

#### Scenario: Cancelación no permitida
- **WHEN** se solicita cancelar una orden en En reparación o Listo para recojo
- **THEN** el sistema rechaza la cancelación

#### Scenario: Solicitud falsa
- **WHEN** una solicitud falsa está en un estado desde el que se puede cancelar
- **THEN** puede pasarse a Cancelado como cualquier otra orden

### Requirement: Terminal states
FIXORA SHALL tratar Entregado y Cancelado como estados finales sin transiciones de salida: una orden final no se reabre ni se revierte, y un equipo que regresa requiere una nueva solicitud con un nuevo código.

#### Scenario: Orden entregada
- **WHEN** se solicita cualquier cambio de estado sobre una orden Entregada
- **THEN** el sistema lo rechaza y la orden no cambia

#### Scenario: Orden cancelada
- **WHEN** se solicita cualquier cambio de estado sobre una orden Cancelada
- **THEN** el sistema lo rechaza y la orden no cambia

### Requirement: Confirmation-required transitions
FIXORA SHALL exigir confirmación explícita, comprobada también por el servidor, solo en cuatro cambios: de En diagnóstico a Esperando aprobación, de Esperando aprobación a En reparación, cualquier cancelación permitida y de Listo para recojo a Entregado. Sin confirmación, el cambio SHALL NOT aplicarse.

#### Scenario: Falta de confirmación
- **WHEN** llega un cambio que exige confirmación sin ella
- **THEN** el sistema no lo aplica y no modifica la orden ni su historial

#### Scenario: Cambio sin confirmación requerida
- **WHEN** se solicita un cambio fuera de esos cuatro, como Solicitud recibida a Equipo recibido
- **THEN** el sistema lo aplica sin exigir confirmación

#### Scenario: Aprobación del cliente
- **WHEN** el administrador confirma el paso de Esperando aprobación a En reparación
- **THEN** el sistema lo interpreta como que el cliente aprobó fuera de FIXORA y no guarda canal, firma ni evidencia adicional

### Requirement: Version-bound state changes
FIXORA SHALL aplicar un cambio de estado solo si la orden no ha cambiado desde que el administrador la revisó; si cambió, SHALL rechazarlo sin fusionar ni reintentar, y la confirmación SHALL quedar ligada a la versión revisada.

#### Scenario: Orden modificada tras la revisión
- **WHEN** la orden cambia después de que el administrador abrió su confirmación y este la confirma
- **THEN** el sistema rechaza el cambio por desactualizado y no lo aplica

#### Scenario: Orden modificada y destino ya no válido
- **WHEN** la orden cambió de estado después de la revisión y el cambio solicitado ya no sería válido en el estado nuevo
- **THEN** el sistema lo rechaza por desactualizado y no por cambio no permitido

#### Scenario: Orden sin cambios
- **WHEN** la orden no cambió desde la revisión
- **THEN** el cambio se aplica una sola vez

### Requirement: Concurrent state change handling
FIXORA SHALL resolver dos cambios simultáneos sobre la misma versión de una orden de modo que uno se aplique y el otro se rechace por desactualizado, sin duplicar eventos de historial.

#### Scenario: Dos cambios simultáneos
- **WHEN** dos administradores o dos envíos solicitan a la vez cambios sobre la misma versión revisada
- **THEN** solo uno se aplica y el otro es rechazado por desactualizado, quedando un único evento nuevo

### Requirement: Diagnosis and cost transition prerequisite
FIXORA SHALL permitir pasar de En diagnóstico a Esperando aprobación solo si la orden tiene diagnóstico y costo estimado, y SHALL rechazar el cambio, sin modificar nada, si falta alguno o si su presencia no puede comprobarse de forma fiable.

#### Scenario: Falta el diagnóstico o el costo
- **WHEN** se solicita el avance y falta el diagnóstico, el costo o ambos
- **THEN** el sistema rechaza el cambio e indica que faltan datos de la reparación

#### Scenario: Diagnóstico y costo presentes
- **WHEN** la orden tiene ambos datos y se cumplen las demás condiciones
- **THEN** el sistema permite el cambio

### Requirement: Atomic status history
FIXORA SHALL registrar, por cada cambio de estado efectivo, exactamente un evento de historial con el estado anterior, el estado alcanzado y su fecha y hora, de forma atómica con el cambio de la orden, de modo que nunca exista un estado sin su evento ni un evento sin su estado.

#### Scenario: Cambio efectivo
- **WHEN** una transición se aplica
- **THEN** la orden queda en el nuevo estado y existe un evento nuevo con el estado anterior, el alcanzado y la fecha y hora

#### Scenario: Fallo durante el cambio
- **WHEN** el cambio falla antes de completarse
- **THEN** la orden y su historial permanecen como estaban

#### Scenario: Cambio rechazado
- **WHEN** un cambio es rechazado por cualquier regla
- **THEN** no se crea ningún evento de historial
