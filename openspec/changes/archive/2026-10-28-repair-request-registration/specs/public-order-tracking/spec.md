# Spec Delta

## Purpose

Definir el código de seguimiento como la credencial pública única, impredecible e inmutable de una orden, con la que el cliente podrá consultar después el estado de su reparación sin crear una cuenta.

## ADDED Requirements

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
