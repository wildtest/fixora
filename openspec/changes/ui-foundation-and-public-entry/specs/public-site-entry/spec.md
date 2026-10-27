# Spec Delta

## Purpose

Proporcionar a los visitantes una entrada pública clara y segura a FIXORA, desde la cual puedan comprender el servicio, llegar a los puntos de entrada públicos de registrar y consultar una reparación y al del acceso administrativo, con avisos y respuestas de error que no expongan detalles internos.

## ADDED Requirements

### Requirement: Public landing entry points
FIXORA SHALL presentar en su página de inicio pública una descripción breve del servicio y puntos de entrada para iniciar el registro de una reparación y para consultar una reparación, ambos como acciones principales destinadas al cliente.

#### Scenario: Visitante ve las acciones principales del cliente
- **WHEN** un visitante abre la página de inicio
- **THEN** el sistema muestra la descripción del servicio y un punto de entrada para registrar una reparación y otro para consultar una reparación

#### Scenario: Punto de entrada de registro
- **WHEN** el visitante activa el punto de entrada de registro
- **THEN** la navegación se dirige al punto de entrada público aprobado para registrar una reparación

#### Scenario: Punto de entrada de consulta
- **WHEN** el visitante activa el punto de entrada de consulta
- **THEN** la navegación se dirige al punto de entrada público aprobado para consultar una reparación

### Requirement: Public navigation
FIXORA SHALL ofrecer en todas las superficies públicas una navegación coherente con puntos de entrada al inicio, al registro y a la consulta de una reparación, utilizable con teclado tanto en pantallas de escritorio como móviles.

#### Scenario: Navegación disponible en una superficie pública
- **WHEN** un visitante está en cualquier superficie pública
- **THEN** el sistema le ofrece puntos de entrada al inicio, al registro y a la consulta

#### Scenario: Navegación en un dispositivo móvil
- **WHEN** un visitante usa un dispositivo de pantalla reducida
- **THEN** el sistema le permite abrir la navegación mediante un control rotulado y acceder a los mismos puntos de entrada

### Requirement: Workshop access entry point
FIXORA SHALL proporcionar en el área pública un punto de entrada al acceso administrativo del taller, sin presentarlo como una de las acciones principales destinadas al cliente.

#### Scenario: Punto de entrada al taller disponible
- **WHEN** un visitante observa la navegación pública
- **THEN** el sistema muestra un punto de entrada al acceso administrativo que no figura entre las acciones principales del cliente

#### Scenario: Punto de entrada al taller activado
- **WHEN** el visitante activa el punto de entrada al taller
- **THEN** la navegación se dirige al punto de entrada público aprobado del acceso administrativo

### Requirement: Demonstration environment notice
FIXORA SHALL informar de forma visible y no obstructiva, mientras opere como entorno de demostración, que se trata de un entorno demostrativo y que no deben introducirse datos personales reales ni información sensible.

#### Scenario: Visitante ve el aviso demostrativo
- **WHEN** un visitante accede a una superficie pública durante la demostración
- **THEN** el sistema muestra el aviso de entorno demostrativo sin ocultar el contenido principal

#### Scenario: El aviso no bloquea el uso
- **WHEN** el visitante navega o usa una acción pública
- **THEN** el sistema no exige aceptar, confirmar ni cerrar el aviso para continuar

### Requirement: Public not-found handling
FIXORA SHALL responder a una ruta pública inexistente con un mensaje comprensible de que la página no se encontró y con una acción para volver al inicio, sin revelar detalles técnicos.

#### Scenario: Visitante abre una ruta pública inexistente
- **WHEN** un visitante solicita una ruta pública que no existe
- **THEN** el sistema informa que la página no existe o ya no está disponible y ofrece volver al inicio

#### Scenario: No se exponen detalles internos
- **WHEN** el sistema presenta la respuesta de página no encontrada
- **THEN** el sistema no muestra trazas, rutas internas ni información técnica

### Requirement: Public unexpected error handling
FIXORA SHALL mostrar, ante un error inesperado en una superficie pública, un mensaje seguro y comprensible con una vía de recuperación apropiada, sin exponer detalles técnicos internos.

#### Scenario: Error inesperado en una superficie pública
- **WHEN** ocurre un error inesperado mientras un visitante usa una superficie pública
- **THEN** el sistema informa que ocurrió un problema inesperado y le indica cómo recuperarse

#### Scenario: El error no revela detalles internos
- **WHEN** el sistema presenta el mensaje de error inesperado
- **THEN** el sistema no muestra mensajes técnicos, trazas, nombres de excepciones ni datos de otros usuarios

### Requirement: Usable entry surfaces on mobile and desktop
FIXORA SHALL permitir usar las superficies de entrada pública, con sus acciones principales visibles y utilizables, tanto en pantallas móviles como de escritorio, sin desplazamiento horizontal de la página.

#### Scenario: Uso en pantalla móvil
- **WHEN** un visitante abre una superficie de entrada pública en una pantalla móvil
- **THEN** sus acciones principales son visibles y utilizables y la página no requiere desplazamiento horizontal

#### Scenario: Uso en pantalla de escritorio
- **WHEN** un visitante abre una superficie de entrada pública en una pantalla de escritorio
- **THEN** sus acciones principales son visibles y utilizables y la página no requiere desplazamiento horizontal
