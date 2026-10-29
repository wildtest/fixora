# Spec Delta

## ADDED Requirements

### Requirement: Lifecycle actions by current state
FIXORA SHALL mostrar en el detalle de una orden la acción de avance al siguiente estado permitido y, solo cuando la cancelación esté permitida, la acción de cancelar, sin ofrecer un selector libre de estados.

#### Scenario: Avance disponible
- **WHEN** el administrador abre una orden que no está en un estado final
- **THEN** ve la acción para avanzar únicamente al siguiente estado permitido

#### Scenario: Cancelación permitida
- **WHEN** la orden está en Solicitud recibida, Equipo recibido, En diagnóstico o Esperando aprobación
- **THEN** el detalle ofrece cancelar la orden

#### Scenario: Cancelación junto a un avance bloqueado
- **WHEN** la orden está En diagnóstico y faltan el diagnóstico o el costo
- **THEN** el avance a Esperando aprobación aparece bloqueado y la cancelación sigue disponible

#### Scenario: Cancelación no ofrecida
- **WHEN** la orden está en En reparación, Listo para recojo, Entregado o Cancelado
- **THEN** el detalle no ofrece cancelar

### Requirement: Required confirmations in the detail
FIXORA SHALL pedir al administrador una confirmación explícita, que explique la consecuencia, antes de los cuatro cambios que la exigen: publicar diagnóstico y costo al pasar a Esperando aprobación, confirmar que el cliente aprobó fuera de FIXORA, cancelar la orden y marcarla como entregada.

#### Scenario: Cambio con confirmación
- **WHEN** el administrador inicia uno de esos cuatro cambios
- **THEN** el sistema muestra una confirmación con su consecuencia y solo aplica el cambio si la confirma

#### Scenario: Cambio sin confirmación
- **WHEN** el administrador inicia otro avance
- **THEN** el sistema lo aplica sin pedir confirmación

#### Scenario: Cancelación irreversible
- **WHEN** el administrador abre la confirmación de cancelar
- **THEN** el sistema advierte de que la acción es irreversible y deja la orden cerrada

### Requirement: Stale order handling
FIXORA SHALL informar, cuando un cambio se rechaza porque la orden cambió desde que el administrador la revisó, de que la acción no se ejecutó, y SHALL ofrecer actualizar la orden sin reintentar automáticamente.

#### Scenario: Orden desactualizada
- **WHEN** el administrador confirma un cambio sobre una pantalla desactualizada
- **THEN** el sistema informa de que la orden cambió, no aplica el cambio y ofrece actualizar la orden

#### Scenario: Cambio ya no disponible
- **WHEN** el cambio solicitado ya no es válido porque la orden cambió
- **THEN** el sistema informa de que el cambio de estado ya no está disponible y ofrece actualizar la orden

### Requirement: Blocked advance without diagnosis and cost
FIXORA SHALL indicar claramente por qué no puede avanzarse de En diagnóstico a Esperando aprobación cuando falta el diagnóstico o el costo estimado, sin presentarlo como un error inesperado.

#### Scenario: Avance bloqueado
- **WHEN** la orden está En diagnóstico y falta el diagnóstico o el costo
- **THEN** el avance no está disponible y el detalle explica que faltan datos de la reparación

### Requirement: Refreshed detail after a state change
FIXORA SHALL mantener al administrador en el detalle tras un cambio exitoso y mostrar el nuevo estado, el recorrido de etapas, el historial y las acciones vigentes obtenidos del servidor, sin presentar el nuevo estado antes de que el servidor lo confirme.

#### Scenario: Cambio exitoso
- **WHEN** el administrador completa un cambio de estado
- **THEN** el detalle muestra el nuevo estado, el recorrido, el nuevo evento de historial y las acciones que corresponden

#### Scenario: Envío repetido
- **WHEN** el administrador activa dos veces la misma acción mientras está en curso
- **THEN** la acción queda deshabilitada y solo se aplica una vez

### Requirement: Final orders without lifecycle actions
FIXORA SHALL no ofrecer ninguna acción de cambio de estado en las órdenes Entregadas o Canceladas.

#### Scenario: Orden final
- **WHEN** el administrador abre una orden Entregada o Cancelada
- **THEN** el detalle no muestra acciones de avance ni de cancelación

### Requirement: Authorized lifecycle actions
FIXORA SHALL verificar una sesión administrativa válida al ejecutar cada cambio de estado y, si no la hay, SHALL NOT ejecutarlo, informando de que la sesión expiró.

#### Scenario: Sesión expirada
- **WHEN** la sesión deja de ser válida antes de ejecutar un cambio de estado
- **THEN** el cambio no se ejecuta, la orden no queda en un estado parcial y se informa de que la sesión expiró
