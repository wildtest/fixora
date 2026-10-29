# admin-order-management Specification

## Purpose
Permitir que el administrador autorizado supervise y localice órdenes de reparación mediante un resumen operativo y un directorio consultable, sin modificar todavía los datos de las órdenes.

## Requirements

### Requirement: Administrative dashboard summary
FIXORA SHALL mostrar al administrador, en su panel, cuántas órdenes existen en cada uno de los ocho estados (Solicitud recibida, Equipo recibido, En diagnóstico, Esperando aprobación, En reparación, Listo para recojo, Entregado y Cancelado), incluidos los estados con cero órdenes, reflejando los datos persistidos actuales y sin añadir otras métricas.

#### Scenario: Conteos por estado
- **WHEN** el administrador abre su panel
- **THEN** el sistema muestra el número de órdenes de cada uno de los ocho estados

#### Scenario: Estado sin órdenes
- **WHEN** ninguna orden está en un estado determinado
- **THEN** el panel muestra ese estado con el conteo cero

#### Scenario: Sin métricas adicionales
- **WHEN** el administrador observa el panel
- **THEN** no aparecen gráficos, tendencias, tiempos promedio, ingresos ni otros indicadores

### Requirement: Recent repair orders
FIXORA SHALL mostrar en el panel, como máximo, las cinco órdenes registradas más recientemente, de la más reciente a la más antigua, con su código, fecha de registro, cliente, equipo y estado, con independencia de la búsqueda y del filtro del directorio.

#### Scenario: Cinco órdenes recientes
- **WHEN** existen más de cinco órdenes
- **THEN** el panel muestra solo las cinco registradas más recientemente, la más reciente primero

#### Scenario: Menos de cinco órdenes
- **WHEN** existen menos de cinco órdenes
- **THEN** el panel muestra todas, y si no existe ninguna presenta un estado vacío comprensible

### Requirement: Administrative order directory
FIXORA SHALL ofrecer al administrador un directorio de órdenes en el que cada orden muestra su código de seguimiento, fecha de registro, cliente, equipo y estado, ordenado por fecha de registro de la más reciente a la más antigua y sin acciones que modifiquen datos ni creen o eliminen órdenes.

#### Scenario: Directorio por defecto
- **WHEN** el administrador abre el directorio sin criterios
- **THEN** ve todas las órdenes, la registrada más recientemente primero

#### Scenario: Sin acciones de modificación
- **WHEN** el administrador revisa el directorio
- **THEN** no hay acciones para crear, eliminar, editar ni cambiar el estado de una orden

### Requirement: Order search
FIXORA SHALL permitir buscar en un único campo por código de seguimiento o por nombre del cliente: un texto que, tras eliminar espacios exteriores y pasar a mayúsculas, tiene el formato de un código se busca de forma exacta; cualquier otro texto no vacío se busca como parte del nombre, sin distinguir mayúsculas ni tildes. Los caracteres `%`, `_` y `\` SHALL tratarse como texto literal.

#### Scenario: Búsqueda por código
- **WHEN** el administrador introduce un código completo, con o sin minúsculas y espacios exteriores
- **THEN** el directorio muestra solo la orden con ese código

#### Scenario: Código parcial
- **WHEN** el administrador introduce solo una parte de un código
- **THEN** el sistema no lo trata como coincidencia de código

#### Scenario: Búsqueda por nombre parcial
- **WHEN** el administrador introduce una parte del nombre, como "munoz"
- **THEN** el directorio muestra las órdenes de clientes cuyo nombre la contiene, incluido "Muñoz"

#### Scenario: Caracteres especiales literales
- **WHEN** el texto buscado contiene `%`, `_` o `\`
- **THEN** el sistema los busca como caracteres literales y no como comodines

#### Scenario: Sin otros campos de búsqueda
- **WHEN** el administrador busca un teléfono, correo, marca o descripción
- **THEN** el sistema no ofrece esa búsqueda

### Requirement: Status filtering
FIXORA SHALL permitir filtrar el directorio por uno de los ocho estados o mostrar todos, y SHALL permitir abrir el directorio ya filtrado por un estado desde el panel, sin ofrecer otros filtros.

#### Scenario: Filtrar por estado
- **WHEN** el administrador elige un estado
- **THEN** el directorio muestra solo las órdenes en ese estado

#### Scenario: Desde el panel
- **WHEN** el administrador activa el enlace de un estado en el panel
- **THEN** se abre el directorio filtrado por ese estado

#### Scenario: Mostrar todos
- **WHEN** el administrador elige mostrar todos los estados
- **THEN** el directorio deja de filtrar por estado

### Requirement: Combined search and filtering
FIXORA SHALL aplicar a la vez la búsqueda y el filtro de estado, mostrando solo las órdenes que cumplen ambos criterios.

#### Scenario: Búsqueda y filtro
- **WHEN** el administrador busca "Juan" y filtra por En diagnóstico
- **THEN** el directorio muestra solo las órdenes de ese estado cuyo nombre de cliente contiene "juan"

### Requirement: Paginated order results
FIXORA SHALL presentar el directorio de 20 en 20 órdenes e informar del total del conjunto filtrado, mostrar los controles de página solo cuando haya más de una, volver a la primera página cuando cambie la búsqueda o el filtro, y mostrar la última página válida si se solicita una inexistente.

#### Scenario: Más de una página
- **WHEN** el conjunto filtrado supera las 20 órdenes
- **THEN** el directorio muestra 20 por página, el total del conjunto filtrado y controles para cambiar de página

#### Scenario: Una sola página
- **WHEN** el conjunto filtrado tiene 20 órdenes o menos
- **THEN** no se muestran controles de paginación

#### Scenario: Cambio de criterio
- **WHEN** el administrador cambia la búsqueda o el filtro estando en una página posterior
- **THEN** el directorio vuelve a la primera página de los nuevos resultados

### Requirement: Deterministic recency ordering
FIXORA SHALL mantener un orden estable por fecha de registro descendente, de modo que dos órdenes con la misma fecha conserven siempre la misma posición relativa entre páginas y consultas.

#### Scenario: Órdenes con la misma fecha
- **WHEN** varias órdenes comparten el mismo instante de registro
- **THEN** su orden relativo es el mismo en cada consulta y no se repiten ni se omiten entre páginas

### Requirement: Clear empty and failure outcomes
FIXORA SHALL informar con un estado vacío comprensible, y no como error, cuando no haya órdenes o la búsqueda y el filtro no produzcan resultados, y SHALL mostrar un mensaje seguro con una vía de recuperación, sin detalles técnicos, ante un fallo inesperado al cargar el panel o el directorio.

#### Scenario: Sin resultados
- **WHEN** la búsqueda y el filtro no coinciden con ninguna orden
- **THEN** el sistema muestra un estado vacío que lo indica, sin error

#### Scenario: Fallo inesperado
- **WHEN** ocurre un error inesperado al cargar los datos
- **THEN** el sistema muestra un mensaje seguro con una forma de reintentar y sin detalles internos

### Requirement: Protected administrative order data
FIXORA SHALL exigir una sesión administrativa válida para cada carga y cada interacción que entregue datos de órdenes, SHALL NOT reutilizar esos datos desde una caché compartida, y SHALL NOT incluir el texto buscado ni el código buscado en la dirección de la página.

#### Scenario: Sin sesión válida
- **WHEN** se solicita el panel, el directorio o una búsqueda sin una sesión administrativa válida
- **THEN** el sistema no entrega ningún dato de órdenes

#### Scenario: Búsqueda sin exponer el texto
- **WHEN** el administrador busca por código o por nombre
- **THEN** la dirección de la página no contiene el texto buscado

#### Scenario: Datos vigentes
- **WHEN** el administrador recarga o interactúa con el panel o el directorio
- **THEN** ve el estado persistido actual

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
FIXORA SHALL presentar los datos y las regiones del detalle administrativo en solo lectura por defecto, y SHALL ofrecer un control que modifique la orden únicamente cuando otro requisito de esta capacidad lo autorice expresamente y las capacidades vigentes de la orden lo permitan, sin controles deshabilitados que anticipen funciones no autorizadas.

#### Scenario: Sin mutación autorizada
- **WHEN** un dato o una región del detalle no tiene un requisito de modificación aplicable
- **THEN** se presenta en solo lectura, sin control de edición ni controles deshabilitados que lo anticipen

#### Scenario: Mutación autorizada
- **WHEN** otro requisito autoriza una modificación y la orden la permite
- **THEN** el detalle puede ofrecer el control correspondiente

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
