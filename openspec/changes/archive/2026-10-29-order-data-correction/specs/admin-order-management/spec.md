# Spec Delta

## ADDED Requirements

### Requirement: Basic order data correction
FIXORA SHALL permitir al administrador corregir, con un único guardado, exactamente estos datos de una orden: nombre, teléfono, correo, tipo de equipo, marca, modelo y descripción del problema, sin modificar su código de seguimiento, su estado, su diagnóstico, su costo, sus notas ni su fecha de registro.

#### Scenario: Corrección conjunta
- **WHEN** el administrador cambia varios datos básicos y guarda
- **THEN** el detalle muestra todos los valores nuevos y la orden conserva su código, su estado, su diagnóstico, su costo, sus notas y su fecha de registro

#### Scenario: Un solo dato
- **WHEN** el administrador cambia solo el modelo y guarda
- **THEN** el modelo se actualiza y los demás datos permanecen idénticos

#### Scenario: Todo o nada
- **WHEN** el guardado es rechazado por cualquier motivo
- **THEN** ningún dato de la orden cambia, ni siquiera los que eran válidos

### Requirement: In-place editing of basic data
FIXORA SHALL ofrecer «Editar datos» en el detalle mientras la orden no sea final, y al activarla SHALL convertir en campos editables, dentro del mismo bloque, el equipo y la descripción en el bloque público y el nombre, el teléfono y el correo en el bloque interno, con «Guardar cambios» y «Cancelar edición», sin pantalla, modal ni confirmación adicional.

#### Scenario: Entrar en edición
- **WHEN** el administrador activa «Editar datos»
- **THEN** los campos se vuelven editables en su bloque, el bloque público y el interno siguen separados y aparecen «Guardar cambios» y «Cancelar edición»

#### Scenario: Cancelar la edición
- **WHEN** el administrador cambia valores y activa «Cancelar edición»
- **THEN** los cambios se descartan, el detalle vuelve a solo lectura con los valores guardados y no se registra ningún cambio

#### Scenario: Guardar sin confirmación adicional
- **WHEN** el administrador activa «Guardar cambios»
- **THEN** el sistema valida y guarda sin pedir una confirmación previa

### Requirement: Registration-equivalent validation
FIXORA SHALL aplicar a la corrección exactamente las mismas reglas de validación y normalización del registro de una reparación, sin excepciones administrativas, de modo que una corrección nunca deje en la orden un dato que el formulario público habría rechazado.

#### Scenario: Dato que el registro rechazaría
- **WHEN** el administrador guarda un nombre vacío, un teléfono con letras o con menos de 7 dígitos, un correo inválido, una marca o una descripción vacías o un texto que excede su límite
- **THEN** el sistema rechaza el guardado, indica el problema junto a cada campo afectado y no cambia ningún dato

#### Scenario: Opcionales vacíos
- **WHEN** el administrador vacía el correo o el modelo y guarda
- **THEN** el dato queda como no informado

#### Scenario: Tipo de equipo cerrado
- **WHEN** se intenta guardar un tipo de equipo fuera de Celular, Tablet, Laptop, PC, Consola y Otro
- **THEN** el sistema rechaza el guardado

#### Scenario: Valores válidos con espacios exteriores
- **WHEN** el administrador guarda un nombre válido con espacios al inicio y al final
- **THEN** el sistema lo acepta y lo guarda sin esos espacios exteriores

#### Scenario: Errores conservados
- **WHEN** el guardado es rechazado por validación
- **THEN** el detalle sigue en edición y conserva lo escrito para que el administrador lo corrija

### Requirement: Correction available only while the order is open
FIXORA SHALL permitir la corrección de datos básicos en los seis estados no finales, incluido Esperando aprobación, y SHALL mantener los datos de una orden Entregada o Cancelada en solo lectura, sin «Editar datos» y rechazando cualquier intento de guardado por orden cerrada.

#### Scenario: Estados no finales
- **WHEN** la orden está en cualquier estado distinto de Entregado y Cancelado
- **THEN** el detalle ofrece «Editar datos»

#### Scenario: Esperando aprobación
- **WHEN** la orden está en Esperando aprobación y el administrador corrige un dato
- **THEN** la corrección se permite sin alterar el diagnóstico ni el costo ya publicados

#### Scenario: Orden final
- **WHEN** el administrador abre una orden Entregada o Cancelada
- **THEN** los datos se muestran en solo lectura, sin «Editar datos», sin campos editables y sin «Guardar cambios»

#### Scenario: Guardado tras el cierre
- **WHEN** llega un guardado de datos básicos para una orden final
- **THEN** el sistema informa de que la orden está cerrada y no modifica ningún dato

### Requirement: Immutable tracking code
FIXORA SHALL NOT permitir editar ni reemplazar el código de seguimiento al corregir una orden, aunque lo mantenga visible y copiable, y la corrección de cualquier otro dato SHALL dejar el código intacto para que el cliente siga consultando con él.

#### Scenario: Código no editable
- **WHEN** el administrador activa «Editar datos»
- **THEN** el código de seguimiento sigue visible y sin campo editable

#### Scenario: Código ajeno a la corrección
- **WHEN** un guardado incluye un valor para el código de seguimiento u otro campo no corregible
- **THEN** ese valor se ignora y el código y los demás datos no corregibles permanecen intactos

### Requirement: Version-bound correction
FIXORA SHALL aceptar una corrección solo si la orden no cambió desde que el administrador la revisó y, si cambió desde otra pantalla, SHALL rechazarla por desactualizada sin fusionar ni sobrescribir, informando y ofreciendo actualizar la orden.

#### Scenario: Orden modificada en otra pantalla
- **WHEN** el administrador guarda una corrección sobre una orden que otra pantalla ya cambió
- **THEN** el sistema informa de que la orden cambió, no guarda nada y ofrece actualizarla

#### Scenario: Dos correcciones simultáneas
- **WHEN** dos correcciones parten de la misma revisión
- **THEN** una se aplica y la otra se rechaza por desactualizada, sin mezclar sus valores

#### Scenario: Corrección frente a otro cambio
- **WHEN** una transición, un diagnóstico o un costo se guardan entre la revisión y la corrección
- **THEN** la corrección se rechaza por desactualizada

### Requirement: Effective-change semantics
FIXORA SHALL tratar como cambio efectivo toda corrección en la que al menos un dato, ya normalizado, difiera del vigente y registrarla como un único cambio de la orden, y SHALL tratar un guardado en el que todos los datos normalizados coinciden con los vigentes como un éxito sin ningún cambio.

#### Scenario: Guardado sin cambios
- **WHEN** el administrador guarda datos que, tras normalizarlos, son idénticos a los vigentes
- **THEN** la operación termina con éxito sin cambiar la orden, su versión ni ningún registro

#### Scenario: Cambio en un solo campo
- **WHEN** siete datos son idénticos y uno difiere
- **THEN** se guarda la corrección completa como un único cambio efectivo

#### Scenario: Cambio solo de forma
- **WHEN** el administrador cambia las mayúsculas de un nombre y guarda
- **THEN** el nombre se actualiza como corrección efectiva

#### Scenario: Una corrección es un único cambio
- **WHEN** una corrección modifica varios datos
- **THEN** la versión de la orden avanza una sola vez

### Requirement: Open confirmation invalidation
FIXORA SHALL tratar toda corrección efectiva como un cambio de la orden que invalida cualquier confirmación de cambio de estado abierta sobre la versión anterior, y un guardado sin cambios no SHALL invalidarla.

#### Scenario: Confirmación abierta y corrección efectiva
- **WHEN** hay una confirmación abierta, otra pantalla corrige un dato y se confirma la acción antigua
- **THEN** el sistema rechaza la confirmación por desactualizada y no cambia el estado

#### Scenario: Confirmación abierta y guardado sin cambios
- **WHEN** otra pantalla guarda datos idénticos a los vigentes y se confirma la acción abierta
- **THEN** la confirmación sigue siendo válida

### Requirement: Customer-name search synchronization
FIXORA SHALL mantener la búsqueda por nombre coherente con el nombre vigente: tras corregir el nombre, el listado encuentra la orden por el nombre nuevo y deja de encontrarla por el anterior, sin que exista un estado intermedio con el nombre cambiado y la búsqueda desactualizada.

#### Scenario: Nombre corregido
- **WHEN** el administrador cambia «José Muñoz» por «María Pérez» y busca después
- **THEN** buscar «maria perez» encuentra la orden, buscar «jose munoz» ya no la encuentra por ese nombre y el detalle muestra «María Pérez»

#### Scenario: Misma regla que el registro
- **WHEN** se busca por un nombre sin tildes ni mayúsculas tras una corrección
- **THEN** la coincidencia sigue la misma regla de la búsqueda de un nombre registrado

### Requirement: No correction history
FIXORA SHALL NOT registrar historial, evento ni autor para las correcciones de datos básicos, de modo que el historial administrativo y la línea de tiempo pública sigan limitados a los cambios de estado, de diagnóstico y de costo.

#### Scenario: Corrección sin historial
- **WHEN** el administrador corrige datos básicos
- **THEN** no aparece ningún evento nuevo en el historial administrativo ni en la línea de tiempo pública

### Requirement: Corrected data reflection and privacy
FIXORA SHALL reflejar los datos corregidos en las siguientes lecturas administrativas y, para el equipo y la descripción, en la siguiente consulta pública, sin cambiar la antigüedad de la orden, y SHALL mantener privados el nombre, el teléfono y el correo corregidos.

#### Scenario: Lecturas administrativas
- **WHEN** el administrador corrige el nombre o el equipo y consulta el listado o el panel
- **THEN** ve los datos vigentes y el orden de las órdenes recientes no cambia por la corrección

#### Scenario: Consulta pública
- **WHEN** el administrador corrige el tipo, la marca, el modelo o la descripción y el cliente consulta de nuevo
- **THEN** el cliente ve los valores corregidos y sigue sin ver nombre, teléfono ni correo

### Requirement: Authorized correction
FIXORA SHALL verificar una sesión administrativa válida en cada guardado de datos básicos y, si no la hay, no ejecutarlo ni dejar estado parcial, informando de que la sesión expiró.

#### Scenario: Sesión expirada
- **WHEN** la sesión deja de ser válida al guardar
- **THEN** la corrección no se ejecuta y se informa de que la sesión expiró
