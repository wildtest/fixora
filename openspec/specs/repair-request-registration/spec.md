# repair-request-registration Specification

## Purpose
Permitir que un cliente sin cuenta registre una única solicitud de reparación con los datos mínimos necesarios y reciba una confirmación segura con la credencial para consultar después el estado de su equipo, sin crear órdenes inválidas ni duplicadas.

## Requirements

### Requirement: Repair request data collection
FIXORA SHALL solicitar al registrar una reparación, y solo ellos, el nombre del cliente, su teléfono, el tipo de equipo, la marca y la descripción del problema como datos obligatorios, y el correo y el modelo como datos opcionales, correspondientes a un único equipo.

#### Scenario: Formulario con los datos aprobados
- **WHEN** un visitante abre el registro de una reparación
- **THEN** el sistema presenta los campos obligatorios y opcionales aprobados, indica cuáles son obligatorios y no presenta ningún campo adicional

#### Scenario: Solo correo y modelo son opcionales
- **WHEN** un visitante envía una solicitud válida sin correo ni modelo
- **THEN** el sistema acepta la solicitud

### Requirement: Closed device type list
FIXORA SHALL permitir elegir el tipo de equipo únicamente entre Celular, Tablet, Laptop, PC, Consola y Otro, y SHALL rechazar cualquier otro valor.

#### Scenario: Tipos disponibles
- **WHEN** el visitante elige el tipo de equipo
- **THEN** el sistema ofrece exactamente esos seis tipos

#### Scenario: Tipo no aprobado
- **WHEN** se envía una solicitud con un tipo de equipo fuera de la lista
- **THEN** el sistema rechaza la solicitud y no crea ninguna orden

### Requirement: No sensitive device data requested
FIXORA SHALL NOT solicitar IMEI, número de serie, contraseña o PIN del dispositivo, patrones o credenciales, accesorios entregados, fotografías, archivos adjuntos ni información de facturación, y SHALL advertir al cliente que no debe escribir contraseñas ni información sensible en la descripción.

#### Scenario: Ausencia de datos sensibles en el formulario
- **WHEN** un visitante revisa el formulario de registro
- **THEN** el sistema no ofrece campos para esos datos y muestra la advertencia junto a la descripción

### Requirement: Field validation
FIXORA SHALL validar la solicitud antes de crearla: tras eliminar los espacios exteriores, el nombre, la marca y la descripción no pueden quedar vacíos, y el correo y el modelo vacíos equivalen a no informados. Los límites se miden en caracteres de texto, no en bytes: nombre 100, marca 60, modelo 60 y descripción 2000. Todo texto SHALL tratarse como texto y no como instrucción o contenido ejecutable.

#### Scenario: Campo obligatorio vacío
- **WHEN** se envía una solicitud con un campo obligatorio vacío o solo con espacios
- **THEN** el sistema rechaza la solicitud, indica qué campo debe corregirse y no crea ninguna orden

#### Scenario: Texto corto válido
- **WHEN** se envía una descripción breve como "No enciende" o un nombre de un solo carácter
- **THEN** el sistema los acepta

#### Scenario: Texto que excede el límite
- **WHEN** un campo supera su longitud máxima en caracteres
- **THEN** el sistema rechaza la solicitud e indica el límite excedido

#### Scenario: Caracteres Unicode
- **WHEN** un campo contiene caracteres Unicode válidos como tildes o ñ dentro del límite
- **THEN** el sistema los acepta sin contarlos por sus bytes

#### Scenario: Opcional vacío
- **WHEN** el correo o el modelo se envían vacíos o solo con espacios
- **THEN** el sistema los trata como no informados

#### Scenario: Contenido con apariencia de código
- **WHEN** un campo contiene marcado o instrucciones
- **THEN** el sistema lo conserva y lo muestra como texto literal, sin ejecutarlo ni interpretarlo

### Requirement: Contact data validation
FIXORA SHALL aceptar como teléfono una entrada con dígitos, espacios, guiones, paréntesis y opcionalmente un único "+" inicial, que contenga entre 7 y 15 dígitos, y SHALL rechazar letras, extensiones, "#", "*" y otros símbolos. El correo, si se informa, SHALL tener una sintaxis razonable y hasta 254 caracteres, sin verificar su existencia.

#### Scenario: Teléfono válido
- **WHEN** se envía un teléfono como "+51 987 654 321" o "(01) 234-5678"
- **THEN** el sistema lo acepta

#### Scenario: Teléfono inválido
- **WHEN** se envía un teléfono con letras, menos de 7 o más de 15 dígitos, un "+" fuera del inicio u otros símbolos
- **THEN** el sistema rechaza la solicitud e indica el problema en ese campo

#### Scenario: Correo inválido
- **WHEN** se informa un correo con sintaxis inválida o de más de 254 caracteres
- **THEN** el sistema rechaza la solicitud e indica el problema en ese campo

### Requirement: Observable validation feedback
FIXORA SHALL informar al cliente, ante datos inválidos, de los campos a corregir con un mensaje por campo y un resumen, conservando lo que escribió, y SHALL indicar un motivo comprensible cuando no pueda registrarse la solicitud.

#### Scenario: Corrección guiada
- **WHEN** el registro es rechazado por varios campos
- **THEN** el sistema muestra un resumen de campos por corregir, un mensaje en cada campo afectado y conserva los valores escritos

### Requirement: Successful registration creates one order
FIXORA SHALL, ante una solicitud válida, crear exactamente una orden en estado Solicitud recibida con su registro inicial de historial y un código de seguimiento, de forma atómica: nunca queda una orden sin su historial inicial ni un historial sin orden.

#### Scenario: Registro exitoso
- **WHEN** se envía una solicitud válida
- **THEN** el sistema crea una única orden en estado Solicitud recibida con su historial inicial y un código de seguimiento y presenta la confirmación

#### Scenario: Fallo durante la creación
- **WHEN** la creación de la orden falla antes de completarse
- **THEN** el sistema no deja ninguna orden ni historial parcial y no presenta un código

### Requirement: Idempotent submission
FIXORA SHALL tratar el reenvío accidental del mismo intento de registro (doble clic, reintento) como el mismo intento: no crea una segunda orden y devuelve el mismo resultado, con el mismo código. Dos solicitudes deliberadas son órdenes independientes y FIXORA SHALL NOT detectar duplicados comparando datos personales o del equipo.

#### Scenario: Doble envío del mismo intento
- **WHEN** el mismo intento de registro se envía más de una vez, incluso de forma simultánea
- **THEN** existe una sola orden y todas las respuestas muestran el mismo código

#### Scenario: Solicitudes deliberadas
- **WHEN** el mismo cliente registra dos solicitudes deliberadas con datos iguales
- **THEN** el sistema crea dos órdenes independientes con códigos distintos

#### Scenario: Validación fallida no consume el intento
- **WHEN** un envío es rechazado por validación y el cliente lo corrige y reenvía
- **THEN** el sistema registra la solicitud corregida normalmente

### Requirement: Registration confirmation
FIXORA SHALL confirmar el registro mostrando el código de seguimiento de forma destacada, instruyendo al cliente a conservarlo porque no hay recuperación de autoservicio, permitiendo copiarlo e ir a consultar el estado, y SHALL limitar los datos mostrados al tipo, la marca y el modelo del equipo, sin nombre, teléfono, correo ni identificadores internos.

#### Scenario: Confirmación mostrada
- **WHEN** el registro se completa
- **THEN** el sistema muestra el código, el aviso de conservarlo, el resumen del equipo y las acciones de copiar el código, consultar el estado y volver al inicio

#### Scenario: Sin datos personales en la confirmación
- **WHEN** se muestra la confirmación
- **THEN** no aparecen el nombre, el teléfono, el correo ni identificadores internos

#### Scenario: Registro sin cuenta
- **WHEN** el cliente completa el registro
- **THEN** no se le exige crear cuenta ni iniciar sesión

### Requirement: Confirmation is not restored
FIXORA SHALL NOT volver a mostrar el código ni los datos de la confirmación, ni conservar lo escrito en el formulario, cuando el cliente sale de la pantalla de registro y vuelve a ella.

#### Scenario: Navegar fuera y volver
- **WHEN** el cliente abandona el registro tras ver la confirmación y vuelve a esa pantalla
- **THEN** se muestra un formulario vacío sin código ni datos anteriores

### Requirement: Safe failure of registration
FIXORA SHALL responder a un fallo inesperado del registro con un mensaje genérico y seguro que permita reintentar, sin exponer detalles técnicos ni datos de otras solicitudes, y SHALL NOT aplicar CAPTCHA ni limitación de frecuencia al registro en V1.

#### Scenario: Fallo inesperado
- **WHEN** ocurre un error inesperado al registrar
- **THEN** el sistema informa de un problema inesperado, permite reintentar y no revela trazas ni detalles internos

#### Scenario: Sin barreras anti-spam
- **WHEN** un visitante registra solicitudes válidas de forma repetida
- **THEN** el sistema no le exige CAPTCHA ni lo bloquea por frecuencia
