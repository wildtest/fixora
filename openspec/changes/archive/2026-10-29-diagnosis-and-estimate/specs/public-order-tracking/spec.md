# Spec Delta

## ADDED Requirements

### Requirement: Diagnosis and cost withheld before approval
FIXORA SHALL no mostrar ni entregar en la consulta pública el diagnóstico ni el costo estimado mientras la orden no haya alcanzado Esperando aprobación, aunque estén guardados, sin que su ausencia produzca errores ni secciones rotas.

#### Scenario: Valores guardados pero no publicados
- **WHEN** una orden en Solicitud recibida, Equipo recibido o En diagnóstico tiene diagnóstico y costo guardados y el cliente la consulta
- **THEN** la respuesta no contiene el diagnóstico ni el costo

#### Scenario: Ausencia sin errores
- **WHEN** aún no hay información publicable
- **THEN** la consulta muestra un mensaje claro de que todavía no hay información disponible, sin errores

### Requirement: Diagnosis and cost visible from approval
FIXORA SHALL mostrar en la consulta pública el diagnóstico y el costo estimado vigentes y congelados de las órdenes en Esperando aprobación, En reparación, Listo para recojo y Entregado, sin sus versiones anteriores.

#### Scenario: Orden en Esperando aprobación
- **WHEN** el cliente consulta una orden en Esperando aprobación
- **THEN** ve el diagnóstico y el costo con dos decimales y destacando el costo

#### Scenario: Estado posterior
- **WHEN** el cliente consulta una orden en En reparación, Listo para recojo o Entregado
- **THEN** sigue viendo los mismos diagnóstico y costo

### Requirement: Public rule for cancelled orders
FIXORA SHALL mostrar en la consulta pública de una orden cancelada el diagnóstico y el costo solo si la orden había alcanzado Esperando aprobación, decidiéndolo por el recorrido de la orden y no por la presencia de los valores.

#### Scenario: Cancelada antes de la aprobación
- **WHEN** el cliente consulta una orden cancelada que nunca alcanzó Esperando aprobación
- **THEN** no ve diagnóstico ni costo

#### Scenario: Cancelada después de la aprobación
- **WHEN** el cliente consulta una orden cancelada que había alcanzado Esperando aprobación
- **THEN** ve su diagnóstico y su costo

### Requirement: No change history in the public view
FIXORA SHALL no exponer en la consulta pública versiones anteriores ni historial de cambios del diagnóstico o del costo: cuando son públicos, muestra solo sus valores vigentes, y la línea de tiempo pública sigue compuesta únicamente por transiciones de estado con su fecha. Otros contenidos que un requisito de esta capacidad autorice expresamente pueden coexistir en la vista.

#### Scenario: Valores modificados antes de publicarse
- **WHEN** el diagnóstico o el costo fueron modificados varias veces antes de la aprobación
- **THEN** el cliente solo ve los valores vigentes al publicarse, sin versiones anteriores
