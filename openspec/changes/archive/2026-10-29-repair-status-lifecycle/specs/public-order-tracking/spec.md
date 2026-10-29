# Spec Delta

## ADDED Requirements

### Requirement: Public reflection of lifecycle changes
FIXORA SHALL reflejar en la consulta pública, tras cualquier cambio de estado persistido, el nuevo estado actual de la orden y su recorrido de etapas, sin información administrativa.

#### Scenario: Estado actualizado
- **WHEN** el administrador cambia el estado de una orden y el cliente la consulta de nuevo con su código
- **THEN** el cliente ve el nuevo estado actual y el recorrido coherente con él

#### Scenario: Orden cancelada
- **WHEN** una orden es cancelada y el cliente la consulta
- **THEN** ve que está cancelada y cerrada

### Requirement: Public status timeline growth
FIXORA SHALL añadir al historial público de estados, por cada cambio de estado persistido, un evento con el estado alcanzado y su fecha y hora, mostrando solo cambios de estado y sin autor, confirmaciones, datos del cliente ni historiales administrativos.

#### Scenario: Nuevo evento público
- **WHEN** se aplica un cambio de estado
- **THEN** la consulta pública muestra un evento adicional con el nuevo estado y su fecha y hora, el más reciente primero

#### Scenario: Solo cambios de estado
- **WHEN** el cliente revisa el historial público
- **THEN** no aparecen confirmaciones, datos personales ni información interna

### Requirement: Public view reflects only persisted state
FIXORA SHALL mostrar en la consulta pública únicamente el estado persistido, de modo que un cambio rechazado o no completado no altere lo que ve el cliente, y SHALL NOT reutilizar una versión anterior desde una caché compartida.

#### Scenario: Cambio rechazado
- **WHEN** un cambio de estado es rechazado
- **THEN** la consulta pública sigue mostrando el estado y el historial anteriores

#### Scenario: Consulta posterior
- **WHEN** el cliente vuelve a consultar tras un cambio
- **THEN** ve el estado actual persistido, sin actualizaciones en tiempo real
