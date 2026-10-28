# Proposal

## Why

El cliente de un pequeño servicio técnico no tiene cuenta y hoy pide el estado de su equipo por WhatsApp o llamada. FIXORA debe permitirle **registrar una solicitud de reparación sin cuenta** y recibir al instante una **credencial de seguimiento** (el código) con la que podrá consultar el estado después. Este change entrega el primer tramo del recorrido principal del cliente: registrar → obtener el código. Sin él no existe ninguna orden que consultar, gestionar ni hacer avanzar.

## What Changes

- Un **formulario público de registro** (PUB-02) con los datos mínimos aprobados: nombre, teléfono, tipo de equipo, marca y descripción obligatorios; correo y modelo opcionales; sin campos adicionales.
- **Validación** de la entrada en el servidor (con la misma lógica reutilizable en el cliente para la ayuda inmediata) y mensajes por campo; una entrada inválida no crea ninguna orden.
- **Creación atómica** de la orden en estado `Solicitud recibida` junto con su evento inicial de historial.
- **Código de seguimiento** único, impredecible e inmutable de 12 caracteres, generado en el servidor.
- **Idempotencia** del envío: repetir el mismo intento (doble clic, reintento de red) no crea una segunda orden y devuelve el mismo resultado.
- **Confirmación** (PUB-03) con el código destacado, la instrucción de conservarlo y un resumen del equipo sin datos personales, con acciones de copiar el código y de ir a consultar el estado.
- **Privacidad de la confirmación y de la navegación**: el código y la confirmación no se exponen en la URL ni en almacenamiento persistente, y no reaparecen al navegar fuera y volver.

## Capabilities

### New Capabilities
- `repair-request-registration`: registro público, sin cuenta, de una única solicitud de reparación con los datos mínimos aprobados, validación observable, creación atómica e idempotente de la orden en su estado inicial y confirmación segura con el código de seguimiento.
- `public-order-tracking`: en este change solo la **identidad del código de seguimiento** (formato, unicidad, impredecibilidad e inmutabilidad) como credencial pública de la orden. CHG-06 extenderá esta misma capability con la consulta pública.

### Modified Capabilities
Ninguna. No se modifica ningún requisito de `public-site-entry` (CHG-04); `/registrar` se consume como destino ya aprobado.

## Impact

- **Documentos que respaldan el cambio:** PRD (registro de solicitud, código de seguimiento, `SC-01`, `SC-16`, `E1`, `E2`, `E3`, `E16`, `E17`, apoyo a `E13`); `DESIGN.md` PUB-02, PUB-03, §6.2, §6.5, §6.9, §13.1, §13.7; Technical Design §6, §12, §13, §17, §18; ADR de persistencia, de identificadores y de seguridad; backlog `CHG-05`.
- **Criterios PRD:** primer tramo de `E2E-01`; CHG-11 lo cierra. Evidencia de `SC-01` y `SC-16` y de los casos borde indicados; `TRACEABILITY.md` se actualiza al implementar.
- **Código afectado (cuando se implemente):** `src/app/registrar`, módulos de dominio/aplicación/infraestructura de registro, validadores puros, generador del código, repositorio de registro y pruebas. Usa lo entregado por CHG-01 (`ActionResult`, logger), CHG-02 (transacciones, esquema, harness) y CHG-04 (shell y aviso demostrativo).
- **Dependencias:** ninguna nueva.
- **Fuera de alcance:** consulta pública y normalización del código ingresado (CHG-06), recuperación de código perdido, ciclo de vida y transiciones (CHG-10), administración y login (CHG-08), limitador de consultas y CAPTCHA/rate limiting en registro (E13: V1 no los incluye), persistencia como capability propia, notificaciones por correo o mensajería. No se ejecuta el Architecture Validation Gate: AV-1 valida en la Fase 7 el comportamiento de la Server Action, Activity/Back y Cache Components.
