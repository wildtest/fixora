# Spec Delta

## ADDED Requirements

### Requirement: Public notes in the tracking view
FIXORA SHALL mostrar en la consulta pública las notas públicas de la orden, cada una con su contenido y su fecha de registro, de la más reciente a la más antigua, con independencia del estado de la orden y sin mostrar identificadores, versiones ni fechas de edición.

#### Scenario: Notas públicas visibles
- **WHEN** el cliente consulta una orden con notas públicas
- **THEN** ve esas notas, la más reciente primero, con su contenido y fecha

#### Scenario: Sin notas todavía
- **WHEN** la orden aún no tiene notas públicas
- **THEN** la consulta muestra un mensaje claro de que todavía no hay información adicional, sin errores

#### Scenario: Orden cerrada
- **WHEN** el cliente consulta una orden Entregada o Cancelada con notas públicas
- **THEN** sigue viendo esas notas

### Requirement: Internal notes never public
FIXORA SHALL no mostrar ni entregar en la consulta pública ninguna nota interna, de modo que su contenido no aparezca en nada de lo que recibe el visitante.

#### Scenario: Orden con notas internas
- **WHEN** el cliente consulta una orden que tiene notas internas
- **THEN** ninguna nota interna ni su contenido está en la respuesta

### Requirement: Public notes reflect current state
FIXORA SHALL reflejar en la siguiente consulta pública las ediciones y eliminaciones de las notas públicas, mostrando solo el contenido vigente y sin marcas de edición ni de eliminación.

#### Scenario: Nota editada
- **WHEN** el administrador edita una nota pública y el cliente consulta de nuevo
- **THEN** ve el contenido nuevo, sin el anterior ni indicación de edición

#### Scenario: Nota eliminada
- **WHEN** el administrador elimina una nota pública y el cliente consulta de nuevo
- **THEN** la nota ya no aparece
