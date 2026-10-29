# order-notes Specification

## Purpose
Permitir que el administrador registre, mantenga y elimine notas públicas e internas de una reparación mientras la orden esté abierta, preservando su visibilidad, concurrencia y separación entre información del cliente y del taller.

## Requirements

### Requirement: Note visibility
FIXORA SHALL manejar exactamente dos visibilidades de nota: pública, visible para el administrador y para el cliente en la consulta pública, e interna, visible únicamente en administración.

#### Scenario: Nota pública
- **WHEN** el administrador crea una nota pública
- **THEN** el cliente la ve en su consulta y el administrador también

#### Scenario: Nota interna
- **WHEN** el administrador crea una nota interna
- **THEN** solo el administrador la ve y nunca aparece en la consulta pública

### Requirement: Creating notes
FIXORA SHALL permitir al administrador crear notas públicas e internas en cualquier estado no final de la orden, sin exigirlas para ningún cambio de estado, y una nota pública SHALL ser visible al cliente inmediatamente después de crearse, sin depender del estado ni de la publicación del diagnóstico.

#### Scenario: Nota pública antes de la aprobación
- **WHEN** el administrador crea una nota pública en una orden en Equipo recibido y el cliente la consulta
- **THEN** el cliente ve la nota

#### Scenario: Nota no requerida
- **WHEN** el administrador cambia el estado de una orden sin crear ninguna nota
- **THEN** el cambio se permite

### Requirement: Immutable note visibility
FIXORA SHALL NOT permitir cambiar la visibilidad de una nota después de crearla; para corregirla, el administrador elimina la nota y crea otra mientras la orden lo permita.

#### Scenario: Sin cambio de visibilidad
- **WHEN** el administrador edita una nota
- **THEN** no ofrece cambiar su visibilidad

#### Scenario: Corrección por reemplazo
- **WHEN** el administrador creó una nota con la visibilidad equivocada en una orden abierta
- **THEN** puede eliminarla y crear otra con la visibilidad correcta

### Requirement: Editing notes
FIXORA SHALL permitir al administrador editar el contenido de una nota existente en cualquier estado no final, sin cambiar su visibilidad ni su fecha de creación ni su posición en la lista, y sin mostrar marca de edición ni conservar versiones anteriores.

#### Scenario: Edición de una nota
- **WHEN** el administrador edita el contenido de una nota
- **THEN** la nota muestra el contenido nuevo, conserva su fecha original y su posición, y no aparece como editada

#### Scenario: Edición idéntica
- **WHEN** el administrador guarda una edición cuyo contenido, tras eliminar los espacios exteriores, es idéntico al vigente y la nota no cambió desde la revisión
- **THEN** la operación termina con éxito sin ningún cambio efectivo: la nota, su versión y la versión de la orden no se modifican y no se registra historial

#### Scenario: Edición idéntica sobre una versión obsoleta
- **WHEN** la nota cambió desde la revisión y el texto enviado coincide con el contenido actual
- **THEN** el sistema rechaza la edición por desactualizada y no la trata como una edición sin cambios

#### Scenario: Edición de una nota pública
- **WHEN** el administrador edita una nota pública
- **THEN** la siguiente consulta del cliente muestra el contenido nuevo y no el anterior

### Requirement: Deleting notes
FIXORA SHALL permitir al administrador eliminar una nota de forma definitiva en cualquier estado no final, sin confirmación adicional, sin papelera ni deshacer y sin conservar registro de su eliminación.

#### Scenario: Eliminación definitiva
- **WHEN** el administrador elimina una nota
- **THEN** la nota desaparece de forma definitiva y no queda registro de ella

#### Scenario: Nota pública eliminada
- **WHEN** el administrador elimina una nota pública y el cliente consulta de nuevo
- **THEN** la nota ya no aparece, sin marcas de eliminación

### Requirement: Note content validation
FIXORA SHALL eliminar los espacios exteriores del contenido de una nota, rechazar una nota vacía, un contenido con caracteres nulos y uno de más de 2000 caracteres de texto, y tratar siempre el contenido como texto sin interpretar formato ni código.

#### Scenario: Nota vacía
- **WHEN** el administrador guarda una nota vacía o solo con espacios
- **THEN** el sistema la rechaza indicando que es obligatoria y no guarda nada

#### Scenario: Límite de longitud
- **WHEN** la nota tiene 2000 caracteres de texto o 2001
- **THEN** la de 2000 se acepta y la de 2001 se rechaza por demasiado larga

#### Scenario: Contenido con apariencia de código
- **WHEN** la nota contiene marcado o instrucciones
- **THEN** el sistema la conserva y la muestra como texto literal

### Requirement: Note concurrency
FIXORA SHALL rechazar la edición o eliminación de una nota que cambió desde que el administrador la revisó, sin fusionar ni sobrescribir, y SHALL informar de que la nota ya no existe cuando fue eliminada, sin afectar la versión de la orden ni invalidar una confirmación abierta de la orden.

#### Scenario: Nota modificada en otra pantalla
- **WHEN** el administrador edita o elimina una nota que otra pantalla ya modificó
- **THEN** el sistema rechaza la acción por desactualizada, no sobrescribe y ofrece actualizar las notas

#### Scenario: Dos ediciones simultáneas
- **WHEN** dos ediciones de la misma nota parten de la misma versión
- **THEN** una se aplica y la otra se rechaza por desactualizada

#### Scenario: Nota ya eliminada
- **WHEN** el administrador edita o elimina una nota que ya no existe
- **THEN** el sistema informa de que la nota ya no existe

#### Scenario: Notas distintas con el mismo texto
- **WHEN** el administrador crea dos notas con el mismo contenido
- **THEN** existen dos notas independientes, sin deduplicación

#### Scenario: Una confirmación abierta no se invalida
- **WHEN** se crea, edita o elimina una nota mientras hay una confirmación de cambio de estado abierta
- **THEN** la confirmación sigue siendo válida

### Requirement: Final order behavior
FIXORA SHALL mantener visibles las notas existentes de una orden Entregada o Cancelada según su visibilidad, en solo lectura, y SHALL rechazar crear, editar o eliminar notas en ella informando de que la orden está cerrada.

#### Scenario: Notas en una orden cerrada
- **WHEN** el administrador abre una orden Entregada o Cancelada con notas
- **THEN** las ve en solo lectura, sin crear, editar ni eliminar

#### Scenario: Mutación tras el cierre
- **WHEN** llega una creación, edición o eliminación de nota después de que la orden se cerró
- **THEN** el sistema informa de que la orden está cerrada y no modifica ninguna nota

#### Scenario: Notas públicas tras el cierre
- **WHEN** una orden con notas públicas pasa a Entregado o Cancelado
- **THEN** el cliente sigue viendo esas notas

### Requirement: Note and close serialization
FIXORA SHALL serializar las operaciones sobre notas con el cierre de la orden, de modo que ninguna nota se cree, edite ni elimine una vez cerrada: si la nota se registra primero, el cierre procede después; si el cierre ocurre primero, la operación de la nota se rechaza.

#### Scenario: La nota llega primero
- **WHEN** una nota y el cierre de la orden se solicitan a la vez y la nota se registra primero
- **THEN** la nota queda registrada y la orden se cierra después

#### Scenario: El cierre llega primero
- **WHEN** el cierre ocurre antes de registrarse la operación de la nota
- **THEN** la operación de la nota se rechaza como orden cerrada y no hay nota escrita tras el cierre

### Requirement: No note history
FIXORA SHALL no conservar historial de las notas ni registrar su autor, de modo que el historial administrativo siga limitado a los cambios de estado, de diagnóstico y de costo.

#### Scenario: Notas fuera del historial
- **WHEN** el administrador crea, edita o elimina notas
- **THEN** el historial administrativo no muestra eventos de nota
