# public-order-tracking Specification

## Purpose
Definir el código de seguimiento como la credencial pública única, impredecible e inmutable de una orden, con la que el cliente podrá consultar después el estado de su reparación sin crear una cuenta.

## Requirements

### Requirement: Tracking code format
FIXORA SHALL identificar cada orden con un código de seguimiento de exactamente 12 caracteres ASCII tomados del alfabeto 2 3 4 5 6 7 8 9 B D F G H J K M N P R S T W X, sin guiones, espacios, prefijo ni dígito de control.

#### Scenario: Código con el formato aprobado
- **WHEN** el sistema genera el código de una orden
- **THEN** tiene 12 caracteres, todos del alfabeto aprobado, sin separadores

### Requirement: Tracking code uniqueness
FIXORA SHALL asignar a cada orden un código distinto: dos órdenes nunca comparten código, y una coincidencia al generarlo se resuelve internamente sin que ninguna orden quede con un código repetido.

#### Scenario: Órdenes distintas
- **WHEN** se registran varias órdenes
- **THEN** cada una tiene un código distinto

#### Scenario: Coincidencia al generar
- **WHEN** el código generado ya pertenece a otra orden
- **THEN** el sistema asigna otro código y no entrega a ninguna orden un código repetido

### Requirement: Tracking code unpredictability
FIXORA SHALL generar el código de forma impredecible, sin derivarlo de un identificador secuencial, del teléfono, del correo, del nombre, de la fecha ni de cualquier dato de la solicitud.

#### Scenario: Código independiente de los datos
- **WHEN** se registran dos solicitudes con datos idénticos
- **THEN** los códigos no guardan relación entre sí ni con los datos

### Requirement: Tracking code immutability
FIXORA SHALL mantener el mismo código durante toda la vida de la orden, sin permitir editarlo ni reemplazarlo.

#### Scenario: Código estable
- **WHEN** la orden cambia de estado o se corrigen sus datos
- **THEN** su código sigue siendo el mismo

### Requirement: Account-free tracking lookup
FIXORA SHALL permitir a cualquier visitante consultar una reparación indicando únicamente su código de seguimiento, sin cuenta, sin iniciar sesión y sin solicitar nombre, teléfono, correo ni otro dato adicional.

#### Scenario: Consulta con un código válido
- **WHEN** un visitante introduce el código de seguimiento de una orden existente
- **THEN** el sistema muestra la información pública de esa orden sin exigir cuenta ni otros datos

#### Scenario: Solo el código da acceso
- **WHEN** un visitante intenta consultar con el nombre, el teléfono o el correo del cliente
- **THEN** el sistema no ofrece ni acepta esa vía de consulta

### Requirement: Tracking code normalization
FIXORA SHALL tolerar al consultar los espacios accidentales al inicio o al final y las diferencias entre mayúsculas y minúsculas ASCII, y SHALL comparar el resultado de forma exacta con el código de la orden, sin corregir, completar ni aproximar caracteres.

#### Scenario: Espacios y minúsculas
- **WHEN** el visitante introduce un código válido en minúsculas o con espacios exteriores
- **THEN** el sistema lo trata como el mismo código y muestra la orden

#### Scenario: Sin correcciones
- **WHEN** el código contiene espacios o guiones internos, caracteres parecidos como O por 0, o le faltan o sobran caracteres
- **THEN** el sistema no lo corrige ni lo completa y lo trata como no encontrado

### Requirement: Uniform unsuccessful lookup
FIXORA SHALL responder igual, con un mensaje de que no se encontró la reparación, a un código mal formado y a uno bien formado que no existe, sin revelar datos de ninguna orden ni indicar si el formato era válido.

#### Scenario: Código inexistente
- **WHEN** el visitante introduce un código bien formado que no corresponde a ninguna orden
- **THEN** el sistema informa que no encontró la reparación y que verifique el código

#### Scenario: Código mal formado
- **WHEN** el visitante introduce un texto vacío, de longitud incorrecta o con caracteres no permitidos
- **THEN** el sistema muestra la misma respuesta que para un código inexistente

### Requirement: Lookup abuse protection
FIXORA SHALL limitar los intentos fallidos de consulta de un mismo origen: tras 10 intentos fallidos en 10 minutos, SHALL bloquear nuevas consultas de ese origen durante 15 minutos. Los códigos mal formados y los inexistentes cuentan como fallo; las consultas exitosas no cuentan.

#### Scenario: Bloqueo tras exceder el límite
- **WHEN** un mismo origen acumula 10 intentos fallidos en 10 minutos
- **THEN** el sistema bloquea sus consultas durante 15 minutos e informa de que hubo demasiados intentos y debe probar más tarde

#### Scenario: Bloqueo sin revelar información
- **WHEN** un origen bloqueado consulta, incluso con un código válido
- **THEN** el sistema no muestra ninguna orden ni indica si el código era correcto

#### Scenario: Los aciertos no cuentan
- **WHEN** un origen realiza consultas exitosas
- **THEN** esas consultas no se suman al límite de fallos

### Requirement: Safe failure when protection is unavailable
FIXORA SHALL, si la protección contra abuso no puede evaluarse de forma fiable, rechazar la consulta con un aviso de servicio no disponible temporalmente, sin consultar ni mostrar ninguna orden, de forma distinta a la respuesta de demasiados intentos y a la de no encontrado.

#### Scenario: Protección no disponible
- **WHEN** el sistema no puede evaluar el límite de intentos
- **THEN** informa de que el servicio no está disponible temporalmente, permite reintentar más tarde y no muestra ninguna orden

#### Scenario: Estados distinguibles
- **WHEN** la consulta es bloqueada por exceso de intentos o por indisponibilidad
- **THEN** el aviso de cada caso es distinto entre sí y del de código no encontrado, sin implicar que el usuario hizo demasiados intentos cuando se trata de indisponibilidad

### Requirement: Public repair projection
FIXORA SHALL construir la proyección pública mediante lista positiva: código, estado actual, tipo, marca y modelo, descripción del problema y eventos públicos de estado con su fecha, más lo que otro requisito de esta capacidad autorice expresamente, y SHALL NOT mostrar ningún otro dato, como datos del cliente, identificadores internos, versiones, notas internas ni datos administrativos o de seguridad.

#### Scenario: Información pública base
- **WHEN** se muestra una orden existente bajo los datos públicos base
- **THEN** aparecen el código, el estado, el equipo, la descripción y los eventos públicos de estado, y ningún dato administrativo o no autorizado

#### Scenario: Dato no autorizado
- **WHEN** la orden contiene nombre, teléfono, correo, notas internas o cualquier dato que ningún requisito público autoriza
- **THEN** ninguno de esos datos aparece en lo que recibe o ve el visitante

#### Scenario: Modelo ausente
- **WHEN** la orden no tiene modelo
- **THEN** el sistema muestra el resto de los datos sin secciones rotas

### Requirement: Current status presentation
FIXORA SHALL presentar el estado actual de la reparación de forma comprensible, con el recorrido de etapas que corresponde a ese estado y todos los eventos públicos de estado actualmente persistidos para la orden con su fecha y hora, más reciente primero, sin ofrecer acciones que modifiquen datos.

#### Scenario: Estado actual visible
- **WHEN** el visitante consulta una orden existente
- **THEN** el sistema muestra el estado actual, el recorrido de etapas y los eventos de estado persistidos con su fecha y hora

#### Scenario: Sin información adicional todavía
- **WHEN** la orden aún no tiene diagnóstico, costo ni notas públicas
- **THEN** el sistema no muestra errores ni secciones rotas

### Requirement: Tracking code treated as a secret
FIXORA SHALL tratar el código de seguimiento como una credencial de lectura: SHALL NOT incluirlo en la dirección de la página, SHALL NOT conservarlo ni a la orden consultada en almacenamiento persistente del navegador, SHALL NOT permitir que la respuesta de una consulta se reutilice desde una caché compartida y SHALL NOT registrarlo en los registros del sistema.

#### Scenario: Código fuera de la dirección
- **WHEN** el visitante realiza una consulta
- **THEN** la dirección de la página no contiene el código en la ruta, los parámetros ni el fragmento

#### Scenario: Sin persistencia local
- **WHEN** se completa una consulta
- **THEN** el código y el resultado no quedan guardados de forma persistente en el navegador

### Requirement: Consultation state is not restored
FIXORA SHALL NOT volver a mostrar el código introducido ni el resultado de una consulta anterior cuando el visitante abandona la consulta y regresa a ella o recarga la página.

#### Scenario: Navegar fuera y volver
- **WHEN** el visitante ve un resultado, navega a otra página y regresa con el botón atrás
- **THEN** la consulta se muestra vacía, sin el código ni el resultado anteriores

#### Scenario: Recarga
- **WHEN** el visitante recarga la página de consulta
- **THEN** vuelve al formulario vacío sin repetir la consulta

### Requirement: No public code recovery
FIXORA SHALL NOT ofrecer recuperación pública del código de seguimiento, por correo, teléfono, nombre, mensaje ni enlace, y SHALL orientar al cliente que lo perdió a contactar al taller por un canal externo.

#### Scenario: Código perdido
- **WHEN** el visitante no recuerda su código
- **THEN** el sistema no ofrece buscar la orden por sus datos personales y le indica contactar al taller

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
