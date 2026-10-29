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
