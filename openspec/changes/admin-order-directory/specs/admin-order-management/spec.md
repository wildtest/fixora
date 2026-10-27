# Spec Delta

## Purpose

Permitir que el administrador autorizado supervise y localice órdenes de reparación mediante un resumen operativo y un directorio consultable, sin modificar todavía los datos de las órdenes.

## ADDED Requirements

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
