# Spec Delta

## ADDED Requirements

### Requirement: Notes in the order detail
FIXORA SHALL mostrar al administrador en el detalle las notas públicas y las internas en listas separadas, cada una de la más reciente a la más antigua con su contenido y fecha, diferenciando su visibilidad con texto e icono además del contenedor, y ofrecer un compositor propio para cada tipo mientras la orden no sea final.

#### Scenario: Notas separadas por visibilidad
- **WHEN** el administrador abre una orden con notas de ambos tipos
- **THEN** ve las públicas indicadas como visibles al cliente y las internas indicadas como solo del taller

#### Scenario: Compositores
- **WHEN** la orden no está en un estado final
- **THEN** el detalle ofrece crear una nota pública y una interna, sin selector de visibilidad

### Requirement: Note edit and delete controls
FIXORA SHALL ofrecer en cada nota, mientras la orden no sea final, las acciones de editar y de eliminar, sin cambio de visibilidad, sin confirmación adicional al eliminar y con retroalimentación posterior de éxito o error.

#### Scenario: Editar una nota
- **WHEN** el administrador edita una nota y guarda
- **THEN** el detalle muestra el contenido nuevo sin marca de edición

#### Scenario: Eliminar una nota
- **WHEN** el administrador elimina una nota
- **THEN** la nota desaparece y el sistema confirma el resultado sin pedir confirmación previa

#### Scenario: Acción repetida
- **WHEN** el administrador activa dos veces la misma acción mientras está en curso
- **THEN** la acción queda deshabilitada y solo se aplica una vez

### Requirement: Note outcome feedback
FIXORA SHALL informar junto a las notas cuando una operación no se ejecuta porque la nota cambió, ya no existe o la orden se cerró, ofreciendo actualizar, y SHALL conservar lo escrito ante un error de validación.

#### Scenario: Nota desactualizada
- **WHEN** la edición o eliminación se rechaza porque la nota cambió
- **THEN** el sistema informa de que la nota cambió, no ejecuta la acción y ofrece actualizar las notas

#### Scenario: Nota inexistente
- **WHEN** la nota ya no existe
- **THEN** el sistema informa de que la nota ya no existe y ofrece actualizar las notas

#### Scenario: Orden cerrada
- **WHEN** la orden se cerró desde otra pantalla
- **THEN** el sistema informa de que la orden ya fue cerrada y ofrece actualizarla

#### Scenario: Nota inválida
- **WHEN** el contenido es vacío o demasiado largo
- **THEN** el sistema indica el problema junto al campo y conserva lo escrito

### Requirement: Read-only notes in final orders
FIXORA SHALL mostrar las notas de una orden Entregada o Cancelada en solo lectura, con el rótulo de solo lectura, sin compositores y sin acciones de editar ni eliminar.

#### Scenario: Orden final con notas
- **WHEN** el administrador abre una orden Entregada o Cancelada con notas
- **THEN** ve el contenido y la fecha de cada nota, el rótulo «Solo lectura» y ningún control de creación, edición o eliminación

### Requirement: Authorized note operations
FIXORA SHALL verificar una sesión administrativa válida en cada creación, edición y eliminación de nota y, si no la hay, no ejecutarla ni dejar estado parcial, informando de que la sesión expiró.

#### Scenario: Sesión expirada
- **WHEN** la sesión deja de ser válida al guardar o eliminar una nota
- **THEN** la operación no se ejecuta y se informa de que la sesión expiró

### Requirement: Cancellation dialog note guidance
FIXORA SHALL incluir en la confirmación de cancelar una orden la indicación de que, si se quiere dejar una explicación pública o interna, se registre antes de confirmar, sin hacer obligatoria ninguna nota ni motivo.

#### Scenario: Indicación en la cancelación
- **WHEN** el administrador abre la confirmación de cancelar una orden
- **THEN** ve la indicación de registrar una explicación antes de confirmar

#### Scenario: Cancelar sin nota
- **WHEN** el administrador cancela una orden sin haber creado ninguna nota
- **THEN** la cancelación se permite
