## ADDED Requirements

### Requirement: Landing illustrative presentation
FIXORA SHALL enriquecer la página de inicio pública con una ilustración conceptual local de la actividad del taller (equipo, reparación y seguimiento) y con apoyos visuales ligeros en las secciones de seguimiento, proceso y privacidad, conservando la narrativa y los puntos de entrada existentes y sin recursos externos, y SHALL rotular esas representaciones como ilustrativas.

#### Scenario: El hero incluye una ilustración conceptual
- **WHEN** un visitante abre la página de inicio
- **THEN** el sistema muestra junto al lema una ilustración conceptual rotulada como tal, que no representa una orden, un código ni un progreso reales

#### Scenario: La ilustración no rompe la composición en ningún ancho
- **WHEN** el visitante abre la landing en pantalla de escritorio, tableta o móvil
- **THEN** la ilustración se adapta al ancho, se ubica entre el texto y las tarjetas de entrada en pantallas estrechas y la página no requiere desplazamiento horizontal

#### Scenario: Los puntos de entrada no cambian
- **WHEN** el visitante activa «Registrar reparación» o «Consultar estado»
- **THEN** la navegación es la misma que antes de la mejora visual

### Requirement: Landing services section
FIXORA SHALL mostrar en la landing una sección de servicios con cuatro tarjetas basadas exclusivamente en el flujo real de V1: registro de la reparación con código de seguimiento, diagnóstico y costo estimado registrados por el taller y mostrados al cliente cuando el flujo lo permite, seguimiento del avance sin cuenta, y seguimiento hasta el recojo y la entrega; y SHALL NOT anunciar servicios, garantías, plazos, cifras ni testimonios que el producto no respalde.

#### Scenario: La sección presenta los cuatro servicios del flujo V1
- **WHEN** un visitante recorre la landing
- **THEN** el sistema muestra, entre la explicación del proceso y la sección de privacidad, cuatro tarjetas: registro de reparación, diagnóstico y costo estimado, seguimiento del avance, y entrega y cierre

#### Scenario: Sin promesas no respaldadas
- **WHEN** la landing describe los servicios
- **THEN** no menciona cotización automática, envío o servicio a domicilio, garantías, plazos, estadísticas, calificaciones ni testimonios
