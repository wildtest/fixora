# Spec Delta

## ADDED Requirements

### Requirement: Administrative order detail access
FIXORA SHALL permitir al administrador abrir el detalle de una orden existente y SHALL responder con un mensaje comprensible y seguro, sin detalles técnicos, cuando la orden solicitada no exista.

#### Scenario: Abrir una orden existente
- **WHEN** el administrador con sesión válida abre el detalle de una orden existente
- **THEN** el sistema muestra el detalle de esa orden

#### Scenario: Orden inexistente
- **WHEN** el administrador con sesión válida solicita una orden que no existe o un identificador mal formado
- **THEN** el sistema informa de que la orden no existe o ya no está disponible y le permite volver al listado, sin errores técnicos, sin mostrar el identificador y sin datos de otras órdenes

### Requirement: Order identification in the detail
FIXORA SHALL mostrar en el detalle el código de seguimiento, la fecha de registro y el estado actual de la orden, y SHALL NOT permitir editar el código.

#### Scenario: Datos de identificación
- **WHEN** se muestra el detalle de una orden
- **THEN** aparecen su código de seguimiento, su fecha y hora de registro y su estado actual

#### Scenario: Código no editable
- **WHEN** el administrador revisa el detalle
- **THEN** el código de seguimiento no ofrece ninguna forma de edición

### Requirement: Customer contact information in the detail
FIXORA SHALL mostrar al administrador el nombre y el teléfono del cliente y, solo si fue informado, su correo, dentro del área administrativa protegida.

#### Scenario: Datos de contacto
- **WHEN** se muestra el detalle de una orden con correo
- **THEN** aparecen el nombre, el teléfono y el correo del cliente

#### Scenario: Correo no informado
- **WHEN** la orden no tiene correo
- **THEN** el detalle indica que no se informó, sin mostrar valores vacíos ni textos técnicos

### Requirement: Device and reported problem in the detail
FIXORA SHALL mostrar el tipo, la marca y, solo si existe, el modelo del equipo, y la descripción del problema registrada, ajustando el texto largo sin desbordar la página.

#### Scenario: Datos del equipo y del problema
- **WHEN** se muestra el detalle de una orden
- **THEN** aparecen el tipo, la marca, el modelo si existe y la descripción del problema

#### Scenario: Modelo no informado
- **WHEN** la orden no tiene modelo
- **THEN** el detalle no muestra un modelo ficticio ni un valor vacío engañoso

#### Scenario: Texto largo
- **WHEN** el nombre, el correo o la descripción son largos
- **THEN** el detalle los muestra completos sin desplazamiento horizontal de la página

### Requirement: Current repair status in the detail
FIXORA SHALL presentar el estado actual de la orden de forma comprensible y representar visualmente el recorrido de la reparación hasta ese estado, sin ofrecer acciones que modifiquen la orden.

#### Scenario: Estado actual visible
- **WHEN** se muestra el detalle de una orden
- **THEN** el sistema presenta su estado actual y su recorrido de etapas

### Requirement: Administrative status history
FIXORA SHALL mostrar en el detalle todos los cambios de estado actualmente registrados para la orden, cada uno con el estado anterior cuando exista, el estado alcanzado y su fecha y hora, del más reciente al más antiguo, sin autor ni otros datos no registrados.

#### Scenario: Orden recién registrada
- **WHEN** la orden solo tiene su registro inicial
- **THEN** el historial muestra «Solicitud recibida» con su fecha y hora, sin estado anterior ni eventos inventados

#### Scenario: Varios cambios registrados
- **WHEN** la orden tiene varios cambios de estado registrados
- **THEN** el historial los muestra del más reciente al más antiguo con un orden estable

### Requirement: Navigation to the order detail
FIXORA SHALL permitir abrir el detalle de una orden desde cada una de las cinco órdenes recientes del panel y desde cada fila del directorio, y volver al directorio desde el detalle sin depender del botón de retroceso del navegador.

#### Scenario: Desde el panel
- **WHEN** el administrador activa una orden reciente del panel
- **THEN** se abre el detalle de esa orden

#### Scenario: Desde el directorio
- **WHEN** el administrador activa una fila del directorio, con ratón o teclado
- **THEN** se abre el detalle de esa orden

#### Scenario: Volver al directorio
- **WHEN** el administrador está en el detalle y elige volver
- **THEN** regresa al directorio

### Requirement: Protected administrative detail data
FIXORA SHALL exigir una sesión administrativa válida para entregar cualquier dato del detalle de una orden, incluso mediante la dirección directa, y SHALL NOT reutilizar esos datos desde una caché compartida ni mostrarlos en la consulta pública.

#### Scenario: Dirección directa sin sesión
- **WHEN** se abre la dirección de un detalle sin sesión administrativa válida
- **THEN** el sistema no entrega ningún dato de la orden

#### Scenario: Datos solo en el área administrativa
- **WHEN** un visitante consulta la misma orden por su código de seguimiento
- **THEN** no ve el teléfono, el correo, el nombre ni el historial administrativo

### Requirement: Read-only baseline detail
FIXORA SHALL presentar en esta etapa el detalle sin controles que modifiquen la orden: sin edición de datos, cambio de estado, cancelación, diagnóstico, costo ni notas.

#### Scenario: Sin controles de modificación
- **WHEN** el administrador revisa el detalle
- **THEN** no hay controles para editar, cambiar el estado, cancelar ni agregar diagnóstico, costo o notas, ni controles deshabilitados que los anticipen
