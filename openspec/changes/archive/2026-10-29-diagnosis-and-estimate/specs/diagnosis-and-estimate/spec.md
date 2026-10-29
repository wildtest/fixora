# Spec Delta

## Purpose

Permitir que el administrador registre y mantenga el diagnóstico y el costo estimado de una reparación mientras sean editables, conservar un historial de sus cambios y publicarlos de forma irreversible al cliente cuando la reparación alcance la etapa de aprobación.

## ADDED Requirements

### Requirement: Editable diagnosis and estimated cost
FIXORA SHALL permitir al administrador crear, modificar y limpiar el diagnóstico y el costo estimado de una orden únicamente mientras esté en Solicitud recibida, Equipo recibido o En diagnóstico, como datos independientes, con un único diagnóstico orientado al cliente y un único costo total.

#### Scenario: Registrar en un estado editable
- **WHEN** el administrador registra el diagnóstico o el costo de una orden en En diagnóstico
- **THEN** el sistema guarda el valor

#### Scenario: Limpiar un valor
- **WHEN** el administrador limpia el diagnóstico o el costo mientras la orden es editable
- **THEN** el valor queda ausente

### Requirement: Diagnosis normalization
FIXORA SHALL eliminar los espacios exteriores del diagnóstico, tratar un diagnóstico vacío como ausente, rechazar los caracteres nulos y los textos de más de 2000 caracteres de texto tras eliminar los espacios exteriores, y tratar el contenido siempre como texto.

#### Scenario: Diagnóstico solo con espacios
- **WHEN** el administrador guarda un diagnóstico formado solo por espacios
- **THEN** el diagnóstico queda ausente

#### Scenario: Límite exacto
- **WHEN** el diagnóstico tiene exactamente 2000 caracteres de texto
- **THEN** el sistema lo acepta

#### Scenario: Texto que excede el límite
- **WHEN** el diagnóstico supera los 2000 caracteres de texto
- **THEN** el sistema lo rechaza e indica que es demasiado largo en el campo

#### Scenario: Contenido con apariencia de código
- **WHEN** el diagnóstico contiene marcado o instrucciones
- **THEN** el sistema lo conserva y lo muestra como texto literal

### Requirement: Estimated cost validation
FIXORA SHALL aceptar como costo estimado un único monto en soles mayor que cero con como máximo dos decimales, sin tope de negocio, guardarlo con exactamente dos decimales y rechazar cero, negativos, más de dos decimales y valores no numéricos sin redondear nunca.

#### Scenario: Monto con menos decimales
- **WHEN** el administrador introduce 50 o 50.5
- **THEN** el sistema guarda 50.00 y 50.50

#### Scenario: Más de dos decimales
- **WHEN** el administrador introduce 50.123
- **THEN** el sistema lo rechaza y no lo redondea

#### Scenario: Cero o negativo
- **WHEN** el administrador introduce 0, 0.00 o un valor negativo
- **THEN** el sistema lo rechaza

#### Scenario: Costo ausente
- **WHEN** el administrador limpia el costo
- **THEN** el costo queda ausente y no se guarda como cero

### Requirement: Unchanged values have no effect
FIXORA SHALL tratar como un cambio sin efecto el guardado de un diagnóstico normalizado o de un costo canónico idénticos al vigente: no modifica la orden, no cambia su versión y no genera historial.

#### Scenario: Mismo diagnóstico
- **WHEN** el administrador guarda un diagnóstico igual al vigente tras eliminar espacios exteriores
- **THEN** no se registra ningún cambio ni historial

#### Scenario: Mismo costo con otra escritura
- **WHEN** el costo vigente es 50.00 y el administrador guarda 50
- **THEN** no se registra ningún cambio ni historial

### Requirement: History of diagnosis and cost changes
FIXORA SHALL registrar, por cada cambio efectivo del diagnóstico y por cada cambio efectivo del costo, un evento de historial propio con el valor anterior, el valor nuevo (cualquiera puede ser ausente) y su fecha y hora, de forma atómica con el cambio y sin autor.

#### Scenario: Primer registro
- **WHEN** se guarda un diagnóstico donde no había ninguno
- **THEN** existe un evento con valor anterior ausente y el diagnóstico nuevo

#### Scenario: Modificación y limpieza
- **WHEN** se modifica el diagnóstico y luego se limpia
- **THEN** cada cambio produce su propio evento, y el último tiene valor nuevo ausente

#### Scenario: Fallo al guardar
- **WHEN** el guardado falla antes de completarse
- **THEN** ni el valor ni el historial cambian

### Requirement: Version-bound edits
FIXORA SHALL aplicar una edición de diagnóstico o de costo solo si la orden no ha cambiado desde que el administrador la revisó; si cambió, SHALL rechazarla sin fusionar, sin reintentar y sin conservar la última escritura.

#### Scenario: Orden modificada en otra pantalla
- **WHEN** la orden cambia después de que el administrador la abrió y este guarda una edición
- **THEN** el sistema rechaza la edición por desactualizada y ofrece actualizar la orden

### Requirement: Freeze from the approval stage
FIXORA SHALL congelar el diagnóstico y el costo desde Esperando aprobación, sin posibilidad de descongelarlos, reabrirlos, rediagnosticar ni presentar un nuevo presupuesto, y SHALL tratarlos como solo lectura en Entregado y Cancelado.

#### Scenario: Edición en un estado congelado
- **WHEN** se intenta modificar el diagnóstico o el costo de una orden en Esperando aprobación, En reparación o Listo para recojo
- **THEN** el sistema rechaza el cambio e indica que están congelados, sin modificar la orden ni su historial

#### Scenario: Orden final
- **WHEN** se intenta modificar el diagnóstico o el costo de una orden Entregada o Cancelada
- **THEN** el sistema rechaza el cambio e indica que la orden está cerrada, sin modificar nada

### Requirement: Publication to the customer
FIXORA SHALL hacer visibles al cliente el diagnóstico y el costo vigentes desde que la orden alcanza Esperando aprobación, sin ofrecer publicación manual, y antes de esa etapa SHALL NOT mostrarlos ni entregarlos al cliente aunque ya estén guardados.

#### Scenario: Antes de la aprobación
- **WHEN** una orden en En diagnóstico tiene diagnóstico y costo guardados y el cliente la consulta
- **THEN** el cliente no recibe el diagnóstico ni el costo

#### Scenario: Al alcanzar la aprobación
- **WHEN** la orden pasa a Esperando aprobación y el cliente la consulta
- **THEN** el cliente ve el diagnóstico y el costo vigentes

### Requirement: Publication rule for cancelled orders
FIXORA SHALL mostrar el diagnóstico y el costo de una orden cancelada solo si la orden había alcanzado Esperando aprobación antes de cancelarse, sin inferir la publicación de que los valores existan.

#### Scenario: Cancelada antes de la aprobación
- **WHEN** una orden se cancela sin haber alcanzado Esperando aprobación
- **THEN** el cliente nunca ve su diagnóstico ni su costo aunque existieran internamente

#### Scenario: Cancelada después de la aprobación
- **WHEN** una orden alcanzó Esperando aprobación y luego se cancela
- **THEN** el cliente sigue viendo su diagnóstico y su costo
