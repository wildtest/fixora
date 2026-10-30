## ADDED Requirements

### Requirement: Landing narrative presentation
FIXORA SHALL presentar en la página de inicio pública, además de los puntos de entrada principales, una narrativa del servicio con una introducción con el lema, una explicación del proceso en tres pasos, una banda que ilustra el seguimiento del avance, una sección de privacidad y control y un pie con el lema y el aviso de entorno demostrativo.

#### Scenario: Visitante recorre la narrativa de la landing
- **WHEN** un visitante abre la página de inicio
- **THEN** el sistema muestra la introducción con el lema, los dos puntos de entrada del cliente, la banda de seguimiento, la explicación en tres pasos, la sección de privacidad y control y el pie con el aviso demostrativo

#### Scenario: Los puntos de entrada siguen siendo reales
- **WHEN** el visitante activa «Registrar reparación» o «Consultar estado» en la landing
- **THEN** la navegación se dirige a los puntos de entrada públicos aprobados, sin duplicar el formulario de consulta en la landing

#### Scenario: Narrativa utilizable en móvil y escritorio
- **WHEN** un visitante abre la landing en una pantalla móvil, de tableta o de escritorio
- **THEN** todas las secciones son legibles y utilizables y la página no requiere desplazamiento horizontal

### Requirement: Illustrative and truthful landing content
FIXORA SHALL rotular como ilustrativa cualquier representación de un código de seguimiento, de un estado o de un progreso en la landing, sin usar una orden ni un código reales, y SHALL limitar las afirmaciones de privacidad al comportamiento real del producto.

#### Scenario: Las representaciones visuales son ilustrativas
- **WHEN** la landing muestra una representación del código de seguimiento o del avance de una reparación
- **THEN** el sistema la rotula como ilustrativa, no usa un código ni una orden reales y no ofrece un campo funcional de consulta

#### Scenario: Las afirmaciones de privacidad corresponden al producto
- **WHEN** la landing describe la privacidad y el control
- **THEN** el sistema afirma únicamente que no se requieren cuentas, que el estado es trazable y que los datos personales no se muestran en la consulta pública
