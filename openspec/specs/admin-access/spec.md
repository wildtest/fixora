# admin-access Specification

## Purpose
Permitir que el administrador autorizado acceda de forma segura a las superficies administrativas de FIXORA mediante credenciales y una sesión controlada, mientras los visitantes no autenticados permanecen excluidos.

## Requirements

### Requirement: Administrative sign-in
FIXORA SHALL ofrecer un acceso administrativo donde el administrador inicia sesión con su correo y su contraseña, tratando la contraseña como una secuencia exacta (sin recortar espacios ni cambiar mayúsculas) de hasta 128 caracteres, y SHALL NOT ofrecer registro de administradores ni selección de rol.

#### Scenario: Inicio de sesión válido
- **WHEN** el administrador introduce su correo y su contraseña correctos
- **THEN** el sistema inicia su sesión y lo lleva a la entrada administrativa protegida

#### Scenario: Contraseña exacta
- **WHEN** la contraseña contiene espacios iniciales o finales, mayúsculas o caracteres Unicode
- **THEN** el sistema la compara exactamente como fue introducida

#### Scenario: Sin registro
- **WHEN** un visitante observa el acceso administrativo
- **THEN** no encuentra opción de crear cuenta, de elegir rol ni de recuperar la contraseña

### Requirement: Uniform invalid-credential response
FIXORA SHALL responder igual, con un mensaje genérico, a un correo inexistente y a una contraseña incorrecta de un correo existente, sin indicar cuál dato falló ni revelar si existe el administrador.

#### Scenario: Correo inexistente
- **WHEN** se introduce un correo que no pertenece al administrador
- **THEN** el sistema muestra el mensaje genérico de credenciales inválidas y no inicia sesión

#### Scenario: Contraseña incorrecta
- **WHEN** se introduce el correo del administrador con una contraseña incorrecta
- **THEN** el sistema muestra exactamente el mismo mensaje genérico y no inicia sesión

#### Scenario: Entrada inválida
- **WHEN** el correo o la contraseña están vacíos, mal formados o exceden el máximo
- **THEN** el sistema responde con el mismo mensaje genérico sin revelar nada sobre la cuenta

### Requirement: Login abuse protection
FIXORA SHALL limitar los intentos fallidos de inicio de sesión de un mismo origen: tras 5 intentos fallidos en 15 minutos, SHALL bloquear nuevos intentos de ese origen durante 15 minutos, e informar de que hubo demasiados intentos sin revelar si el correo existe ni cuántos intentos restan.

#### Scenario: Bloqueo tras exceder el límite
- **WHEN** un mismo origen acumula 5 intentos fallidos en 15 minutos
- **THEN** el sistema bloquea sus nuevos intentos durante 15 minutos e informa de que debe probar más tarde

#### Scenario: Bloqueado con credenciales correctas
- **WHEN** un origen bloqueado introduce credenciales correctas
- **THEN** el sistema no inicia sesión ni indica que eran correctas

#### Scenario: Sin bloqueo permanente
- **WHEN** termina el bloqueo de 15 minutos
- **THEN** el administrador puede intentar iniciar sesión de nuevo

### Requirement: Safe failure when sign-in protection is unavailable
FIXORA SHALL rechazar el inicio de sesión con un aviso de servicio no disponible temporalmente, distinto del de credenciales inválidas y del de demasiados intentos, cuando la protección contra abuso no pueda evaluarse de forma fiable o el sistema no pueda atender una nueva verificación de credenciales.

#### Scenario: Protección no disponible
- **WHEN** el sistema no puede evaluar el límite de intentos
- **THEN** informa de que el servicio no está disponible temporalmente y no inicia sesión

#### Scenario: Sistema saturado
- **WHEN** el sistema no puede admitir otra verificación de credenciales
- **THEN** informa de que el servicio no está disponible y nunca lo presenta como credenciales inválidas

### Requirement: Administrative session establishment
FIXORA SHALL crear, ante un inicio de sesión válido, una sesión nueva e independiente cuya credencial no sea legible por los scripts de la página, y SHALL NOT reutilizar una credencial de sesión suministrada antes de autenticarse ni exponer la contraseña.

#### Scenario: Sesión nueva en cada inicio de sesión
- **WHEN** el administrador inicia sesión varias veces
- **THEN** cada inicio crea una sesión distinta con su propia credencial

#### Scenario: Credencial no legible por scripts
- **WHEN** se establece la sesión
- **THEN** los scripts de la página no pueden leer la credencial de la sesión

### Requirement: Session expiration
FIXORA SHALL considerar válida una sesión administrativa solo mientras no hayan pasado 60 minutos sin actividad ni 12 horas desde su inicio, sin extender nunca el máximo absoluto por actividad, y la validez SHALL decidirla el servidor y no la mera presencia de una credencial en el navegador.

#### Scenario: Expiración por inactividad
- **WHEN** pasan 60 minutos sin actividad administrativa
- **THEN** la sesión deja de autorizar el acceso

#### Scenario: Expiración absoluta
- **WHEN** pasan 12 horas desde el inicio de sesión, aunque haya habido actividad
- **THEN** la sesión deja de autorizar el acceso

#### Scenario: Sesión eliminada
- **WHEN** la sesión fue eliminada en el servidor y el navegador conserva su credencial
- **THEN** el acceso no se autoriza

### Requirement: Protected administrative access
FIXORA SHALL exigir una sesión válida para todas las superficies administrativas, de modo que una dirección directa sin sesión válida no muestre contenido administrativo y dirija al acceso, y SHALL NOT permitir que el contenido administrativo se reutilice desde una caché compartida.

#### Scenario: Acceso directo sin sesión
- **WHEN** un visitante abre directamente una dirección administrativa sin sesión
- **THEN** el sistema no muestra contenido administrativo y lo dirige al acceso

#### Scenario: Credencial inventada o inexistente
- **WHEN** la solicitud incluye una credencial de sesión inventada, inexistente o expirada
- **THEN** el sistema trata la solicitud como no autenticada

#### Scenario: Sesión válida
- **WHEN** el administrador con sesión válida abre una superficie administrativa
- **THEN** el sistema le permite el acceso

### Requirement: Administrative action authorization
FIXORA SHALL verificar de nuevo la sesión válida en cada acción administrativa, con independencia de que la pantalla de origen estuviera protegida; ante una sesión no válida, SHALL NOT ejecutar la acción ni dejar estado parcial, e informar de que la sesión expiró y de que debe volver a iniciar sesión.

#### Scenario: Acción sin sesión válida
- **WHEN** se invoca una acción administrativa sin sesión válida
- **THEN** la acción no se ejecuta, no queda estado parcial y se informa de que la sesión expiró

#### Scenario: Acción invocada directamente
- **WHEN** se invoca una acción administrativa sin pasar por la pantalla que la presenta
- **THEN** el sistema exige igualmente una sesión válida

### Requirement: Logout and session invalidation
FIXORA SHALL permitir al administrador cerrar sesión, invalidando la sesión en el servidor y retirando su credencial del navegador, y SHALL NOT mostrar información administrativa al volver atrás o adelante en el historial del navegador después de cerrarla.

#### Scenario: Cierre de sesión
- **WHEN** el administrador cierra sesión
- **THEN** la sesión deja de ser válida en el servidor y el sistema lo lleva al acceso

#### Scenario: Volver atrás tras cerrar sesión
- **WHEN** tras cerrar sesión el navegador retrocede o avanza en el historial
- **THEN** no se muestra información administrativa

#### Scenario: Cierre sin sesión
- **WHEN** se solicita el cierre de sesión sin una sesión válida
- **THEN** el sistema termina en un estado no autenticado seguro sin error sensible

### Requirement: Single externally managed administrator
FIXORA SHALL operar con un único administrador aprovisionado fuera de la aplicación, con una contraseña de entre 15 y 128 caracteres que admite espacios y Unicode, SHALL NOT ofrecer dentro del producto registro, recuperación ni cambio de contraseña, e invalidar todas las sesiones cuando el operador rota la credencial.

#### Scenario: Sin gestión de cuentas en la aplicación
- **WHEN** un visitante o el administrador revisa la aplicación
- **THEN** no existen pantallas ni funciones de registro, recuperación o cambio de contraseña

#### Scenario: Rotación de credencial
- **WHEN** el operador rota la contraseña del administrador fuera de la aplicación
- **THEN** las sesiones existentes dejan de ser válidas
