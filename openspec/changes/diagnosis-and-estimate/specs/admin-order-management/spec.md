# Spec Delta

## ADDED Requirements

### Requirement: Diagnosis and cost in the detail
FIXORA SHALL mostrar al administrador en el detalle el diagnóstico y el costo estimado, con campos editables y su acción de guardado solo mientras la orden esté en Solicitud recibida, Equipo recibido o En diagnóstico, y con el rótulo «Aún no visible para el cliente» hasta Esperando aprobación.

#### Scenario: Orden editable
- **WHEN** el administrador abre una orden en En diagnóstico
- **THEN** ve el diagnóstico y el costo editables, con la indicación de que aún no son visibles para el cliente

#### Scenario: Sin valores
- **WHEN** la orden aún no tiene diagnóstico o costo
- **THEN** el detalle muestra la ausencia de forma comprensible, sin "S/ 0.00" ni valores técnicos

#### Scenario: Guardado exitoso
- **WHEN** el administrador guarda el diagnóstico o el costo
- **THEN** el detalle muestra el valor vigente del servidor y el nuevo evento de historial

#### Scenario: Valor inválido
- **WHEN** el valor guardado es inválido
- **THEN** el sistema indica el problema junto al campo y conserva lo escrito

### Requirement: Frozen and read-only presentation
FIXORA SHALL presentar el diagnóstico y el costo como congelados y de solo lectura, con el rótulo «Congelado» y sin acciones de guardado, desde Esperando aprobación, y como solo lectura en Entregado y Cancelado; en una orden cancelada que nunca alcanzó Esperando aprobación SHALL indicar «Nunca se publicó al cliente».

#### Scenario: Congelado
- **WHEN** la orden está en Esperando aprobación, En reparación o Listo para recojo
- **THEN** el diagnóstico y el costo aparecen congelados, sin controles de guardado

#### Scenario: Cancelada antes de publicarse
- **WHEN** la orden fue cancelada sin alcanzar Esperando aprobación
- **THEN** los valores aparecen de solo lectura con la indicación «Nunca se publicó al cliente»

#### Scenario: Cancelada tras publicarse
- **WHEN** la orden fue cancelada después de alcanzar Esperando aprobación
- **THEN** los valores aparecen de solo lectura sin esa indicación

### Requirement: Combined administrative history
FIXORA SHALL mostrar al administrador un historial que combina los cambios de estado, los de diagnóstico y los de costo, del más reciente al más antiguo con un orden estable, indicando el tipo de cambio, el valor anterior y el nuevo y su fecha y hora, sin autor.

#### Scenario: Historial combinado
- **WHEN** la orden tiene cambios de estado, de diagnóstico y de costo
- **THEN** el historial los muestra juntos, cada uno con su tipo, valores y fecha

#### Scenario: Valores de costo exactos
- **WHEN** el historial muestra un cambio de costo
- **THEN** los montos se presentan con dos decimales exactos

### Requirement: Publication confirmation summary
FIXORA SHALL mostrar en la confirmación de pasar de En diagnóstico a Esperando aprobación el diagnóstico y el costo vigentes que se publicarán, con el aviso de que quedarán congelados y disponibles para el cliente, y SHALL aplicar la confirmación solo a la versión revisada.

#### Scenario: Resumen real
- **WHEN** el administrador inicia el avance a Esperando aprobación con diagnóstico y costo
- **THEN** la confirmación muestra ambos valores y advierte que se congelarán y serán visibles para el cliente

#### Scenario: Valores cambiados antes de confirmar
- **WHEN** el diagnóstico o el costo cambian después de abrir la confirmación y el administrador la confirma
- **THEN** el sistema rechaza la confirmación por desactualizada y no publica nada

### Requirement: Authorized and bounded edits
FIXORA SHALL verificar una sesión administrativa válida en cada edición de diagnóstico o costo y SHALL rechazarlas, sin dejar estado parcial, si la sesión expiró, si la orden cambió o si ya no es editable.

#### Scenario: Sesión expirada
- **WHEN** la sesión deja de ser válida al guardar
- **THEN** la edición no se ejecuta y se informa de que la sesión expiró

#### Scenario: Orden ya no editable
- **WHEN** el administrador guarda desde una pantalla anterior a que la orden se congelara
- **THEN** el sistema rechaza el cambio y ofrece actualizar la orden
