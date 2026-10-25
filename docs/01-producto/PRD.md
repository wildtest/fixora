# FIXORA — PRD (Product Requirements Document)

> Fase 01 · Producto · Estado: **APROBADO**
>
> Fecha de redacción: 2026-10-25.
>
> Fecha de aprobación: 2026-10-25.
>
> Fuente: `docs/00-definicion/PROJECT-BRIEF.md` y una entrevista conversacional de ocho secciones, validadas una a una. Este documento no introduce decisiones fuera de lo aprobado en esa entrevista.
>
> Consumido por: 02 Diseño y 03 Arquitectura (Technical Design + ADRs).

## Cómo leer este documento

- Las secciones 1 a 8 siguen el orden de la entrevista: Problema, Usuario objetivo, Objetivo, Alcance, No alcance, Criterios de éxito, Casos borde, Supuestos y riesgos.
- **El PRD define qué hace FIXORA V1 y por qué, no cómo se construye.** Las decisiones técnicas están delegadas a fases posteriores; el Apéndice A las reúne.
- Identificadores estables, que las fases siguientes deben conservar:

| Prefijo | Significado |
|---|---|
| `SC-nn` | Criterio de éxito de V1 (sección 6). |
| `En` | Regla obligatoria de comportamiento y caso borde (sección 7). |
| `SUP-nn` | Supuesto (sección 8). |
| `VAL-nn` | Validación pendiente de producto (sección 8). |
| `RIE-nn` | Riesgo o limitación conocida (sección 8). |

- Los requisitos funcionales de la sección 4 no tienen identificador propio; se numerarán en el Backlog.
- Los nombres de estado se escriben en cursiva y con su nombre exacto: *Solicitud recibida*, *Equipo recibido*, *En diagnóstico*, *Esperando aprobación*, *En reparación*, *Listo para recojo*, *Entregado*, *Cancelado*.

---

## 1. Problema

En los pequeños servicios técnicos de reparación de equipos tecnológicos, la gestión de las reparaciones se reparte entre combinaciones de WhatsApp, llamadas, papel, hojas de cálculo o la memoria del técnico. Esto dificulta centralizar las órdenes, conocer su estado e identificar qué ocurrió durante una reparación.

Por otro lado, el cliente normalmente no tiene visibilidad directa del proceso y necesita llamar o escribir al taller para saber si su equipo fue recibido, diagnosticado, está siendo reparado o ya está listo.

FIXORA debe atacar ambos problemas:

1. **Organización y trazabilidad para el taller.**
2. **Transparencia y autoservicio de consulta para el cliente.**

El problema incluye tanto la falta de visibilidad del estado como la falta de control del proceso: los cambios de estado deben seguir reglas y dejar rastro.

**No forma parte del problema** que FIXORA resuelve: inventario, facturación, gestión completa del taller ni CRM.

La existencia y relevancia del problema en talleres reales no está respaldada por evidencia propia (ver `SUP-11` y `VAL-01`).

---

## 2. Usuario objetivo

### 2.1 Cliente

- Persona natural con un equipo tecnológico personal: celular, tablet, laptop, PC, consola u otro equipo compatible con el servicio del taller.
- No tiene cuenta y no inicia sesión.
- Registra una solicitud, recibe un código de seguimiento y lo utiliza después para consultar su reparación.
- **Cada solicitud corresponde a un único equipo** y tiene su propio código. Una misma persona puede registrar distintas reparaciones a lo largo del tiempo, cada una con su solicitud y su código.
- Se asume que usa principalmente un teléfono móvil y que no tiene conocimientos técnicos (`SUP-03`). La aplicación es responsive y también funciona en escritorio.
- Quedan fuera de V1 los clientes empresariales, la gestión de flotas y las solicitudes que agrupen varios equipos.

### 2.2 Administrador

- En V1 existe **un único administrador, una sola persona**, que opera una zona administrativa protegida.
- Puede: consultar órdenes, buscar y filtrar por estado, revisar el detalle, registrar diagnóstico y costo estimado, agregar notas públicas e internas, corregir los datos básicos de una orden, actualizar estados válidos y consultar el historial.
- No hay múltiples cuentas administrativas, técnicos individuales, recepcionistas, roles ni permisos diferenciados.
- El historial no identifica quién realizó cada cambio. Identificar al autor de las acciones queda como funcionalidad futura si FIXORA evoluciona hacia múltiples usuarios.

### 2.3 Contexto del taller (supuesto)

> FIXORA V1 está diseñado para un único taller con un único local y centraliza la gestión y seguimiento de sus órdenes de reparación, pudiendo coexistir con otros canales o herramientas externas utilizadas por el negocio.

Consecuencia: la aprobación o rechazo del presupuesto por parte del cliente ocurre fuera de FIXORA (teléfono, WhatsApp o comunicación presencial) y el administrador refleja el resultado cambiando el estado (`SUP-02`, `SUP-04`).

---

## 3. Objetivo / resultado esperado

### 3.1 Objetivo general

Que un pequeño taller pueda centralizar en FIXORA la gestión y seguimiento de sus órdenes de reparación, y que sus clientes puedan consultar por sí mismos el progreso de sus equipos mediante un código de seguimiento, sin necesidad de crear una cuenta.

### 3.2 Resultados esperados para el taller

- Cada reparación queda registrada como una orden individual correspondiente a un único equipo.
- El administrador puede consultar y mantener la información necesaria para gestionar su progreso.
- La reparación mantiene un estado dentro del flujo definido.
- Los cambios de estado respetan reglas de transición y dejan trazabilidad.
- El administrador puede registrar diagnóstico y costo estimado cuando esa información exista.
- Se mantiene una separación estricta entre la información pública que puede consultar el cliente y la información interna del taller.
- El taller dispone de un lugar central para conocer el estado de sus órdenes, sin pretender convertir FIXORA en un sistema integral de gestión empresarial.

### 3.3 Resultados esperados para el cliente

- Puede registrar una solicitud de reparación sin crear una cuenta ni iniciar sesión.
- Recibe un código de seguimiento asociado exclusivamente a esa solicitud.
- Puede utilizar posteriormente ese código para consultar el progreso de su reparación.
- Puede comprender fácilmente en qué etapa del Repair Journey se encuentra su equipo.
- Puede consultar la información pública disponible. Diagnóstico y costo estimado pueden consultarse cuando hayan sido puestos a su disposición como parte del proceso de aprobación (ver 4.5).
- No necesita llamar o escribir al taller únicamente para conocer el estado que ya se encuentra registrado en FIXORA.

### 3.4 Qué cuenta como buen resultado de V1

El ciclo principal funciona de extremo a extremo:

1. El cliente registra una solicitud.
2. FIXORA crea la orden y entrega un código de seguimiento.
3. El administrador encuentra y gestiona la orden.
4. El administrador registra información y realiza transiciones válidas.
5. Los cambios quedan reflejados en el historial.
6. El cliente consulta de nuevo mediante su código.
7. El cliente visualiza correctamente el estado y la información pública actualizados.
8. La reparación puede continuar hasta un estado final válido.

### 3.5 Lo que este objetivo no incluye

- **Métricas comerciales.** No se fijan porcentajes, reducción de llamadas ni ahorro de tiempo, porque no existe una línea base que los justifique. Por ello el resultado "el cliente no necesita llamar" no es un criterio medible de V1.
- **Adopción real por un taller.** No es un criterio de éxito de V1 porque no es verificable dentro del proyecto; se registra como validación pendiente (`VAL-02`).
- Este PRD describe exclusivamente el producto FIXORA.

---

## 4. Alcance

El alcance de V1 se divide en funcionalidad para el cliente, funcionalidad para el administrador y requisitos de calidad y entrega. Los requisitos de calidad y entrega pertenecen al alcance del proyecto pero no son pantallas ni capacidades de usuario.

### 4.1 Alcance funcional: cliente

- **Landing** que presenta FIXORA y da acceso a registrar una solicitud y a consultar una reparación.
- **Registro de solicitud**, un equipo por solicitud, con los datos descritos en 4.3 y los avisos descritos en 4.10.
- **Generación y entrega de un código de seguimiento** único por solicitud, mostrado digitalmente al finalizar el registro. La orden nace siempre en *Solicitud recibida*.
- **Consulta pública por código**, con la información definida en 4.6: estado actual, Repair Journey, timeline de estados con fechas, notas públicas, y diagnóstico y costo estimado desde que se publican.

### 4.2 Alcance funcional: administrador

- **Login administrativo** a una zona protegida, con un único administrador. No hay gestión de acceso dentro de la aplicación.
- **Dashboard** mínimo: una vista general de las órdenes, una referencia rápida de cuántas órdenes están en los principales estados (por ejemplo *Solicitud recibida*, *En diagnóstico*, *Esperando aprobación*, *En reparación*, *Listo para recojo*) y acceso al listado. No incluye gráficos, tendencias ni reportes.
- **Listado y búsqueda** de órdenes, descritos en 4.9.
- **Detalle de orden.**
- **Registro y modificación de diagnóstico y costo estimado** según 4.5 y 4.8.
- **Cambio de estado** según la máquina de estados de 4.4.
- **Notas públicas y notas internas** según 4.7.
- **Corrección de los datos básicos** de la orden (cliente y equipo) según 4.8.
- **Historial administrativo** según 4.7.

El administrador **no crea órdenes** desde el panel: toda orden nace por el flujo público de registro.

### 4.3 Datos de la solicitud

| Dato | Obligatoriedad |
|---|---|
| Nombre del cliente | Obligatorio |
| Teléfono | Obligatorio |
| Email | Opcional |
| Tipo de equipo | Obligatorio |
| Marca | Obligatoria |
| Modelo | Opcional |
| Descripción del problema | Obligatoria |

- El email no es obligatorio porque FIXORA V1 no envía correos ni crea cuentas.
- Los tipos de equipo de FIXORA V1 son: Celular, Tablet, Laptop, PC, Consola y Otro. Diseño define únicamente cómo se presenta y selecciona esta lista en la interfaz; no puede agregar ni eliminar tipos sin una nueva decisión de producto.
- La descripción del problema la redacta el cliente con sus propias palabras.
- No se solicita: IMEI, número de serie, contraseña o PIN del dispositivo, accesorios entregados, fotografías, archivos adjuntos ni información de facturación.
- Cada formulario corresponde a un único equipo y a una única solicitud.

### 4.4 Estados y máquina de estados

**Estados:** *Solicitud recibida*, *Equipo recibido*, *En diagnóstico*, *Esperando aprobación*, *En reparación*, *Listo para recojo*, *Entregado* y *Cancelado*.

**Flujo normal:**

*Solicitud recibida* → *Equipo recibido* → *En diagnóstico* → *Esperando aprobación* → *En reparación* → *Listo para recojo* → *Entregado*

**Transiciones permitidas (matriz final):**

| Desde | Hacia |
|---|---|
| *Solicitud recibida* | *Equipo recibido*, *Cancelado* |
| *Equipo recibido* | *En diagnóstico*, *Cancelado* |
| *En diagnóstico* | *Esperando aprobación* (solo si existen diagnóstico y costo estimado), *Cancelado* |
| *Esperando aprobación* | *En reparación*, *Cancelado* |
| *En reparación* | *Listo para recojo* |
| *Listo para recojo* | *Entregado* |
| *Entregado* | (ninguna: estado final) |
| *Cancelado* | (ninguna: estado final) |

**Reglas:**

- **FIXORA debe rechazar cualquier transición de estado que no esté explícitamente permitida por las reglas de producto, independientemente del punto desde el que se intente realizar.**
- Solo hay avance. No hay retrocesos, no se saltan etapas y no se reabren órdenes finales.
- Ejemplos de transiciones inválidas: *Solicitud recibida* → *En diagnóstico*, *Solicitud recibida* → *En reparación*, *Equipo recibido* → *Esperando aprobación*, *En diagnóstico* → *En reparación*, *En reparación* → *Entregado*, *Esperando aprobación* → *En diagnóstico*, *En reparación* → *Esperando aprobación*, *Listo para recojo* → *En reparación*.
- **Condición de transición:** *En diagnóstico* → *Esperando aprobación* exige que diagnóstico y costo estimado estén registrados. Ninguna otra transición exige datos adicionales ni una nota obligatoria.
- **Esperando aprobación → En reparación** representa que el cliente aprobó el presupuesto fuera de FIXORA.
- **Esperando aprobación → Cancelado** puede representar el rechazo del presupuesto.
- *Cancelado* representa una reparación que termina antes de comenzar formalmente la etapa de reparación. Una vez en *En reparación*, la orden ya no puede cancelarse en V1 y debe continuar hacia *Listo para recojo* y *Entregado*.
- No se registra en FIXORA el canal, la persona que recibió la aprobación, comentarios obligatorios, firma ni consentimiento digital. El momento de la decisión queda trazado indirectamente por el cambio de estado.
- *Entregado* y *Cancelado* son estados finales (ver 4.8). Si el cliente vuelve con el mismo equipo por un nuevo problema, se crea una **nueva solicitud con un nuevo código**.
- Los estados solo los cambia el administrador. El cliente no puede cambiar el estado.
- Antes de cuatro de estas transiciones se exige confirmación explícita (ver `E11`).

### 4.5 Diagnóstico y costo estimado

**Diagnóstico.** Es un texto redactado para ser comunicado al cliente, por ejemplo: "Se detectó deterioro en el conector de carga. Se recomienda reemplazar el módulo". No es un espacio para comentarios internos del técnico: los detalles técnicos u observaciones reservadas se registran en las notas internas. Hay un único campo de diagnóstico, de naturaleza pública; no existen "diagnóstico público" y "diagnóstico interno".

**Costo estimado.** Es un único monto total de referencia que el taller comunica al cliente antes de iniciar la reparación (formato en 7.1). No hay rangos, desglose, impuestos, descuentos, versiones, cuotas ni múltiples presupuestos.

**Ciclo de vida y visibilidad:**

| Estado de la orden | ¿Lo ve el cliente? | ¿Se puede modificar? |
|---|---|---|
| *Solicitud recibida*, *Equipo recibido*, *En diagnóstico* | **No.** Son información de trabajo provisional, visible solo para el administrador. | Sí |
| *Esperando aprobación* | **Sí.** Se publican al entrar en este estado. | **No.** Quedan congelados. |
| *En reparación*, *Listo para recojo* | Sí | No |
| *Entregado* | Sí | No |
| *Cancelado* | Solo si la orden llegó antes a *Esperando aprobación*; si se canceló antes, nunca se publican. | No |

Al realizarse *En diagnóstico* → *Esperando aprobación*: diagnóstico y costo quedan congelados, pasan a estar disponibles en la consulta pública, el cliente los usa para decidir y la decisión ocurre fuera de FIXORA. La visibilidad depende exclusivamente del estado alcanzado por la orden; no existe un campo "publicado".

Si durante la reparación aparece un problema adicional que requeriría nuevo diagnóstico, costo o aprobación, V1 no dispone de ese flujo (`RIE-07`).

### 4.6 Información pública y administrativa

**Información pública** (consulta por código):

- Código de seguimiento.
- Tipo de equipo, marca y modelo (cuando exista).
- Descripción del problema registrada actualmente en la orden.
- Estado actual y Repair Journey.
- Timeline de estados con la fecha de cada transición.
- Diagnóstico y costo estimado **actuales**, desde que se publican (4.5).
- Notas públicas.

**Información exclusivamente administrativa:**

- Nombre, teléfono y email del cliente.
- Notas internas.
- Historial de cambios de diagnóstico y de costo estimado.

La consulta pública no expone directamente los campos personales definidos como exclusivamente administrativos (nombre, teléfono y email), aunque el código sea correcto. Esto no elimina el riesgo `RIE-13`: el cliente podría escribir, voluntaria o accidentalmente, información personal o sensible dentro de un campo que sí es público, como la descripción del problema. La descripción no debe contener credenciales ni datos sensibles; FIXORA no los solicita y advierte al cliente (4.10).

### 4.7 Notas e historial

**Notas.**

- **Nota pública:** visible para el cliente y el administrador.
- **Nota interna:** visible solo para el administrador.
- Mientras la orden no sea final, ambas se pueden agregar, editar y eliminar, sin historial (`E12`, `RIE-04`). En estados finales son solo lectura.
- Escribir una nota nunca es requisito para realizar una transición.

**Historial público.** Transiciones de estado con sus fechas (el timeline). El cliente no ve versiones anteriores de diagnóstico ni de costo.

**Historial administrativo.** Registra como mínimo:

- cada transición de estado y cuándo ocurrió;
- el primer registro del diagnóstico y sus modificaciones posteriores;
- el primer registro del costo estimado y sus modificaciones posteriores.

No forman parte del historial de V1: modificaciones de notas públicas o internas, correcciones de datos del cliente o del equipo, búsquedas, accesos, acciones administrativas generales ni la identificación de quien realizó el cambio. El PRD define solo el comportamiento esperado; cómo se almacenan las versiones anteriores es del Technical Design.

### 4.8 Reglas de edición y estados finales

| Elemento | *Solicitud recibida* | *Equipo recibido* | *En diagnóstico* | *Esperando aprobación* | *En reparación* | *Listo para recojo* | *Entregado* / *Cancelado* |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Datos del cliente, del equipo y descripción | Sí | Sí | Sí | Sí | Sí | Sí | No |
| Diagnóstico y costo estimado | Sí | Sí | Sí | No | No | No | No |
| Notas públicas e internas (agregar, editar, eliminar) | Sí | Sí | Sí | Sí | Sí | Sí | No |

- El administrador puede **corregir los datos básicos** registrados en la orden (nombre, teléfono, email, tipo de equipo, marca, modelo y descripción del problema) mientras la orden no sea final. Es para corregir errores, no para cambiar la identidad de la orden. Las correcciones se validan con las mismas reglas del registro (`E3`).
- El **código de seguimiento** no es corregible (`E17`).
- **Estados finales.** Cuando una orden llega a *Entregado* o *Cancelado* queda cerrada: no se puede cambiar su estado, reabrirla, ni modificar diagnóstico, costo, notas, datos del cliente o datos del equipo.

### 4.9 Listado y búsqueda de órdenes

- **Búsqueda por código de seguimiento** (coincidencia exacta tras la normalización de `E15`) y **por nombre del cliente** (coincidencia parcial, sin distinguir mayúsculas ni tildes).
- **Filtro por estado.** Se puede combinar con la búsqueda.
- No hay filtros por fecha, tipo de equipo, marca, costo ni búsqueda avanzada.
- Orden predeterminado y comportamiento con muchas órdenes: ver `E8`.
- Sin resultados, se muestra un estado vacío claro (`E7`).

### 4.10 Avisos informativos

Los avisos son solo textos informativos. No hay casilla de aceptación, ni almacenamiento de consentimiento, versión o fecha. La redacción exacta se define en Diseño.

- **Aviso sobre datos personales.** Un texto breve que explique que FIXORA solicita datos de contacto para gestionar la reparación y permitir al taller identificar y contactar al cliente cuando corresponda.
- **Aviso sobre la descripción del problema**, cerca de ese campo: indica que podrá mostrarse en la consulta pública asociada al código y que el cliente **no** debe incluir contraseñas, PIN, códigos de desbloqueo, credenciales, información financiera ni otros secretos o datos sensibles innecesarios.
- **Aviso de entorno demostrativo.** Mientras FIXORA V1 esté desplegada como demostración pública (4.11), Diseño debe contemplar un aviso breve y no intrusivo que deje claro que es un entorno demostrativo y que no se deben ingresar datos personales reales ni información sensible. Complementa, sin reemplazarlo, el aviso de la descripción (`RIE-20`).

### 4.11 Requisitos de calidad y entrega

Son parte del alcance de V1, no funcionalidades de usuario:

- **Persistencia de datos.**
- **Testing E2E** del flujo principal.
- **Security Pass** sobre el sistema construido.
- **CI/CD:** un pipeline automatizado que ejecute las verificaciones definidas para el proyecto.
- **Despliegue público de demostración en Vercel.** El despliegue público en Vercel es una **restricción de entrega fija** del proyecto. El Technical Design decide *cómo* desplegar en Vercel, no *si* se utiliza Vercel. Este despliegue es de demostración y no equivale a un entorno productivo validado para datos personales reales (`RIE-20`, `VAL-04`).

---

## 5. No alcance

FIXORA V1 gestiona y da seguimiento a **órdenes individuales de reparación** y ofrece al cliente una **consulta transparente de su progreso**. **No pretende ser** un ERP del taller, un CRM, un sistema de inventario, un sistema contable o de facturación, una pasarela de pagos, una plataforma de comunicaciones, una herramienta de gestión de técnicos, un sistema de reservas, un sistema completo de auditoría ni una plataforma multiempresa o multisucursal.

Quedan fuera de V1:

**A. Clientes y accesos**

- Cuentas de clientes, registro y login de clientes, y recuperación de contraseña de clientes.
- Clientes empresariales, flotas y solicitudes con varios equipos.
- Recuperación del código por autoservicio ("olvidé mi código"; por email, SMS o búsqueda pública por nombre o teléfono). Si el cliente lo pierde, contacta al taller.
- Gestión de acceso del administrador dentro de la aplicación: crear o gestionar cuentas, cambiar o recuperar contraseña, roles y permisos. Solo existe el login.

**B. Operación del taller**

- Múltiples roles administrativos y múltiples técnicos con permisos distintos.
- Asignación de reparaciones a técnicos, carga de trabajo e identificación del responsable.
- Identificación del autor de cada acción.
- Creación de órdenes desde el panel administrativo (toda orden nace por el flujo público).
- Eliminación de órdenes (se utiliza *Cancelado*).
- Multiempresa y múltiples sucursales.
- Reservas, citas, calendario y disponibilidad.
- Fechas prometidas, SLA y tiempos máximos. El Repair Journey representa estado, no una promesa temporal.

**C. Flujo de estados**

- Retrocesos de estado, saltos de etapa y reapertura de órdenes finales.
- Cancelación durante la reparación.
- Nuevo presupuesto, re-diagnóstico, segundo ciclo de aprobación y garantías.

**D. Dinero y presupuesto**

- Facturación, pagos online, impuestos, descuentos, cuotas y pagos parciales.
- Desglose de mano de obra y repuestos, rangos, versiones y múltiples presupuestos.
- Selección de moneda o múltiples monedas. Solo existe un costo estimado total en PEN (S/).
- Inventario de repuestos.

**E. Aprobación del cliente**

- Registro dentro de FIXORA del canal, de la persona que recibió la aprobación, de un comentario obligatorio, de firma digital o de consentimiento digital. La aprobación ocurre fuera de FIXORA y se refleja con el cambio de estado.

**F. Comunicaciones**

- WhatsApp automático, SMS, email automático y notificaciones push.
- Notificaciones de cualquier tipo, al cliente o al administrador, incluidas las internas del navegador o de la aplicación.
- Chat cliente-técnico.

**G. Datos de la solicitud**

- IMEI, número de serie, contraseña o PIN, accesorios, fotografías y archivos adjuntos, y datos de facturación.

**H. Información y trazabilidad**

- Historial de notas y de correcciones de datos.
- Auditoría completa (accesos, búsquedas, acciones generales).
- Visibilidad pública de los campos administrativos de nombre, teléfono y email del cliente, de versiones anteriores de diagnóstico y costo, y de notas internas.
- Reportes, analítica, gráficos, tendencias, métricas históricas y exportación (CSV, Excel, PDF).
- Filtros adicionales (fecha, tipo de equipo, marca, costo) y búsqueda avanzada.

**I. Documentos e interfaz**

- Impresión: comprobantes, etiquetas, códigos QR, tickets, PDF y formularios imprimibles. El código se muestra digitalmente.
- Interfaz multiidioma. V1 es solo en español. El español y el PEN son el contexto de V1 (`SUP-01`), no una afirmación de que el producto nunca pudiera internacionalizarse.

**J. Otros**

- Aplicación móvil.
- Diagnóstico con IA.

---

## 6. Criterios de éxito

**Reglas generales:**

- **SC-01 a SC-20 son obligatorios** para considerar FIXORA V1 completada.
- Distinguimos criterio obligatorio de método de verificación. Los métodos aceptables son: prueba automatizada (E2E u otro nivel), revisión manual estructurada, Security Pass, inspección del pipeline y comprobación del despliegue. Ningún criterio exige un método concreto, salvo cuando el propio criterio lo establece.
- En la fase de Testing debe quedar evidencia trazable de qué prueba o mecanismo verifica cada criterio relevante.
- No hay criterios cuantitativos de accesibilidad ni de rendimiento en V1 (`SUP-09`).
- Trazabilidad de la cadena: PRD → criterios de éxito → backlog → specs → implementación → testing y evidencia.
- La columna "Trazabilidad" remite a secciones de este PRD. `SC-13` y `SC-16` son **derivados**: se justifican a partir de requisitos aprobados.

### A. Ciclo principal

| ID | Criterio | Verificación | Trazabilidad |
|---|---|---|---|
| SC-01 | Un cliente sin cuenta registra una solicitud con los datos obligatorios y recibe un código de seguimiento único. La orden queda en *Solicitud recibida*. | Prueba automatizada | §2, §3, §4.1, §4.3 |
| SC-02 | Con ese código, el cliente accede a la consulta pública y ve la información pública de su orden. | Prueba automatizada | §3, §4.6 |
| SC-03 | El administrador inicia sesión, localiza una orden por código, por nombre o por filtro de estado, y abre su detalle. | Prueba automatizada | §2.2, §4.9 |
| SC-04 | El administrador lleva una orden de *Solicitud recibida* a *Entregado* mediante transiciones válidas. Tras cada cambio, el cliente ve el estado y el timeline actualizados. | Prueba automatizada | §3.4, §4.4 |
| SC-05 | Una orden puede pasar a *Cancelado* desde *Solicitud recibida*, *Equipo recibido*, *En diagnóstico* y *Esperando aprobación*, y desde ahí no admite ningún cambio. | Prueba automatizada | §4.4, §4.8 |

### B. Reglas de negocio

| ID | Criterio | Verificación | Trazabilidad |
|---|---|---|---|
| SC-06 | FIXORA rechaza cualquier transición de estado no permitida por la matriz (saltos, retrocesos y salidas de estados finales), independientemente del punto desde el que se intente. | Prueba automatizada | §1, §3.2, §4.4 |
| SC-07 | No es posible pasar a *Esperando aprobación* sin diagnóstico y costo estimado registrados. | Prueba automatizada | §4.4 |
| SC-08 | Diagnóstico y costo no son visibles al cliente antes de *Esperando aprobación*. Lo son desde ahí y no pueden modificarse desde ahí. Si la orden se cancela sin haber llegado a esa etapa, nunca se publican. | Prueba automatizada | §3.3, §4.5 |
| SC-09 | Una orden en *Entregado* o *Cancelado* no admite cambios de estado, datos del cliente o del equipo, diagnóstico, costo ni notas. | Prueba automatizada | §4.8 |
| SC-10 | El historial público muestra solo transiciones con sus fechas. El administrativo muestra transiciones y cambios de diagnóstico y costo, cada uno con su momento. | Prueba automatizada o revisión manual | §1, §3.2, §4.7 |

### C. Privacidad y acceso

| ID | Criterio | Verificación | Trazabilidad |
|---|---|---|---|
| SC-11 *(innegociable)* | La consulta pública nunca expone directamente los campos administrativos de nombre, teléfono o email del cliente, las notas internas, el historial administrativo ni ningún otro campo definido como exclusivamente administrativo. | Prueba automatizada y Security Pass | Brief (diferenciador 4), §1, §4.6 |
| SC-12 *(innegociable)* | Las capacidades administrativas no son accesibles sin una sesión de administrador válida. | Prueba automatizada y Security Pass | §2.2, §4.2 |
| SC-13 *(derivado)* | Un código inexistente produce un mensaje de que no se encontró la reparación y no expone datos de ninguna orden. | Prueba automatizada y Security Pass | §4.1, SC-11 |

**Alcance de `SC-11`.** Protege los campos administrativos estructurados. No elimina el riesgo `RIE-13`: una persona puede escribir, voluntaria o accidentalmente, información personal o sensible dentro de un campo que sí es público, como la descripción del problema. Ese riesgo se trata en `RIE-13`.

### D. Datos y experiencia

| ID | Criterio | Verificación | Trazabilidad |
|---|---|---|---|
| SC-14 | Los datos persisten: una orden y sus cambios siguen disponibles en consultas posteriores. | Prueba automatizada | Brief (persistencia), §3.4, §4.11 |
| SC-15 | Los flujos de registro y consulta del cliente, y los del administrador, pueden completarse correctamente en viewport móvil y de escritorio, con sus acciones principales visibles y utilizables, sin desplazamiento horizontal de la página. | Revisión manual estructurada (ver abajo) | §2, §4.1, §4.2 |
| SC-16 *(derivado)* | Los campos obligatorios vacíos o inválidos se rechazan indicando cuál es el problema, y no crean la orden. | Prueba automatizada | §4.3 |

La revisión manual estructurada de `SC-15` cubre, como mínimo:

- **Área pública:** registrar una reparación, obtener y conservar el código, consultar la reparación, e interpretar el estado y el Repair Journey.
- **Área administrativa:** iniciar sesión, localizar una orden, abrir el detalle, identificar la información pública e interna, realizar las operaciones permitidas y realizar una transición válida.

Esta revisión no demuestra científicamente que FIXORA sea "fácil de usar". La usabilidad real con usuarios externos queda como validación futura (`VAL-03`).

### E. Calidad y entrega

| ID | Criterio | Verificación | Trazabilidad |
|---|---|---|---|
| SC-17 | El flujo principal de FIXORA está cubierto por al menos una prueba E2E automatizada que pasa correctamente. | Prueba E2E | §3.4, §4.11 |
| SC-18 | Se completa un Security Pass con las siguientes condiciones (ver abajo). | Security Pass | §4.11 |
| SC-19 | Existe un pipeline de integración y entrega continua que ejecuta automáticamente las verificaciones definidas para el proyecto. El alcance exacto de la entrega continua lo define el Technical Design. | Inspección del pipeline | §4.11 |
| SC-20 | FIXORA V1 dispone de un **despliegue público de demostración en Vercel**, accesible y operativo, en el que puede comprobarse el flujo principal del producto. | Comprobación del despliegue | §4.11, §8 |

**Flujo principal (SC-17).** El cliente registra una solicitud y obtiene un código de seguimiento; el administrador inicia sesión y localiza la orden; gestiona la reparación y actualiza su estado; el cliente vuelve a consultar con el código y observa la información actualizada. Es el mínimo obligatorio. La cobertura de variantes (transición inválida, estado final, validaciones, privacidad, congelamiento) se resuelve en Testing con el nivel de prueba más apropiado, sin obligar a cubrir cada una con E2E.

**Condiciones de SC-18:**

1. Ningún hallazgo crítico o alto puede permanecer abierto.
2. Todo hallazgo tiene una disposición explícita: corregido, mitigado, aceptado como riesgo documentado (únicamente cuando su severidad lo permita) o descartado con justificación por no aplicable.
3. Los hallazgos críticos y altos no pueden aceptarse como riesgo para cerrar V1: deben corregirse o mitigarse hasta dejar de tener esa severidad.
4. Los hallazgos medios o bajos pueden permanecer abiertos solo con una justificación explícita y documentada.
5. **Todo hallazgo que viole `SC-11` o `SC-12` debe corregirse, cualquiera sea la severidad que se le asigne.**

La escala de severidad y el formato del Security Report se definen en la fase de Seguridad.

**Sobre SC-20.** La palabra "demostración" no elimina ningún requisito funcional: la aplicación es completamente funcional. Solo evita afirmar que el despliegue académico es un entorno productivo legalmente validado (`RIE-20`, `VAL-04`). La forma de comprobar el flujo principal sobre el despliegue se define en Testing y Deploy; no exige ejecutar la suite E2E completa en el despliegue público.

---

## 7. Casos borde

**Principio.** El PRD define el comportamiento esperado. Idempotencia, concurrencia, duración de sesión, rate limiting, almacenamiento de fechas, sanitización, paginación, estructura monetaria, y normalización y formato del código son decisiones del Technical Design.

**Obligatoriedad.** Las reglas `E1` a `E17` son requisitos de comportamiento obligatorios de FIXORA V1 y su evidencia se trazará durante la fase de Testing. No necesitan criterios de éxito adicionales ni, necesariamente, una prueba E2E independiente cada una.

### 7.1 Decisiones de valor

- **Costo estimado.** Mayor que S/ 0.00, sin valores negativos, en PEN, mostrado como S/ y con dos decimales. Ejemplos válidos: S/ 50.00, S/ 180.00, S/ 1250.50. No se permite S/ 0.00 en V1 (reparaciones gratuitas, cortesías o garantías requerirían diseñar ese caso de negocio). El PRD no fija un tope máximo. El riesgo de un error de digitación se mitiga con la confirmación de `E11`.
- **Fechas y horas.** Se muestran siempre en el contexto horario de Perú, con formato `DD/MM/AAAA HH:mm` de 24 horas (por ejemplo `25/10/2026 14:35`). Cliente y administrador ven el mismo momento para el mismo evento; no se convierte según la zona del dispositivo.
- **Vigencia de la consulta pública.** Una orden en *Entregado* o *Cancelado* sigue siendo consultable por su código mientras exista en FIXORA. No hay expiración, archivado, reducción de información ni eliminación automática (`RIE-02`).

### 7.2 Reglas

**Registro y código**

| ID | Regla |
|---|---|
| E1 | Un reenvío accidental del mismo formulario (doble clic, reintento accidental o comportamiento equivalente) no genera dos órdenes. Dos solicitudes deliberadas del mismo cliente son órdenes independientes. FIXORA no detecta duplicados comparando nombre, teléfono, equipo o descripción. |
| E2 | Tras registrar la solicitud, FIXORA indica claramente al cliente que debe conservar su código. No hay recuperación pública o de autoservicio. Si lo pierde, contacta al taller, el administrador busca la orden por nombre y le comunica el código por un canal externo. |
| E3 | Campos obligatorios ausentes, teléfono inválido o email informado pero inválido rechazan la solicitud. Los textos que exceden los límites se rechazan según los límites definidos posteriormente. Todo contenido proporcionado por el usuario se trata como texto, no como instrucciones ni contenido ejecutable. **Las mismas reglas de validez se aplican cuando el administrador corrige datos** de una orden no final: no puede dejar un campo obligatorio vacío ni datos que el formulario público habría rechazado. |

**Consulta pública**

| ID | Regla |
|---|---|
| E4 | Si el código no corresponde a una reparación existente, se informa claramente que no se encontró; no se expone información de otras órdenes ni se permite inferir datos administrativos. La protección frente a intentos masivos de adivinar códigos corresponde al Technical Design y al Security Pass. |
| E5 | La consulta pública de una orden cancelada muestra código, equipo, descripción del problema, estado *Cancelado*, Repair Journey y timeline, y notas públicas. Diagnóstico y costo solo aparecen si la orden alcanzó antes *Esperando aprobación*. |
| E6 | La ausencia de diagnóstico, costo o notas públicas no produce errores ni secciones rotas; la interfaz representa claramente que todavía no hay información adicional disponible. |

**Administrador**

| ID | Regla |
|---|---|
| E7 | Búsqueda por nombre: coincidencia parcial, sin distinguir mayúsculas/minúsculas ni tildes. Búsqueda por código: coincidencia exacta tras la normalización de `E15`. Puede combinarse con el filtro por estado. Si no hay resultados, se muestra un estado vacío claro. |
| E8 | El listado administrativo muestra por defecto las órdenes ordenadas por fecha de registro de la solicitud, de la más reciente a la más antigua. La estrategia necesaria para mantener el listado manejable cuando aumente el número de órdenes se definirá posteriormente en Diseño y Technical Design. No hay ordenamiento configurable por otras columnas en V1. |
| E9 | Si el administrador intenta una acción basándose en información que ya no representa el estado actual de la orden (por ejemplo, con varias pestañas abiertas), FIXORA valida la acción contra la situación vigente; si ya no es válida, la rechaza e informa al administrador para que vuelva a consultar. |
| E10 | Si la sesión administrativa deja de ser válida, no se ejecuta la acción, se solicita volver a autenticarse y la orden no queda en un estado parcial o inconsistente. |
| E11 | Se requiere confirmación explícita antes de las cuatro transiciones indicadas en 7.3. |
| E12 | Mientras la orden no sea final, el administrador puede agregar, editar y eliminar notas públicas e internas. Esas modificaciones no generan historial. En *Entregado* y *Cancelado* las notas son solo lectura. Eliminar una nota no equivale a eliminar una orden, que sigue fuera de alcance. |
| E13 | Una solicitud falsa o spam puede pasar a *Cancelado* mientras su estado lo permita. En V1 no existe eliminación administrativa de órdenes ni CAPTCHA, rate limiting, detección automática de spam o bloqueo por IP. Se acepta que estas solicitudes puedan afectar las cantidades históricas o del dashboard. |
| E14 | Registrar un motivo de cancelación no es obligatorio. Si el administrador desea dejar una explicación pública o interna, debe registrarla **antes** de ejecutar la transición a *Cancelado*, porque después la orden queda cerrada y sus notas no pueden modificarse. |

**Código de seguimiento**

| ID | Regla |
|---|---|
| E15 | Al introducir un código, FIXORA tolera diferencias entre mayúsculas y minúsculas y espacios accidentales al inicio o al final. No corrige caracteres internos incorrectos, caracteres visualmente parecidos (como O/0 o I/1), ni omisiones o adiciones de caracteres. La coincidencia sigue siendo exacta tras esa normalización. Se aplica en la consulta pública y en la búsqueda administrativa. |
| E16 | El código debe poder leerse, copiarse y comunicarse verbalmente de forma razonablemente clara, con baja probabilidad de errores de transcripción y dificultad suficiente para no ser fácilmente adivinable. El PRD no fija prefijo, longitud, cantidad de caracteres, alfabeto, algoritmo ni entropía. |
| E17 | El código de seguimiento no forma parte de los datos corregibles. Es único por solicitud e inmutable durante todo el ciclo de vida de la orden. El administrador puede consultarlo, buscar por él y volver a comunicarlo al cliente, pero no puede editarlo ni reemplazarlo. |

### 7.3 Confirmaciones antes de transiciones relevantes (E11)

| Transición | Qué debe advertir la confirmación |
|---|---|
| *En diagnóstico* → *Esperando aprobación* | Permite revisar el diagnóstico y el costo estimado, que quedarán congelados y disponibles para el cliente. |
| *Esperando aprobación* → *En reparación* | Representa que el cliente aprobó externamente. Advierte que, a partir de este momento, **la reparación ya no podrá cancelarse en FIXORA V1**. |
| Cualquiera de las transiciones permitidas hacia *Cancelado* | La orden quedará cerrada y no podrá reabrirse; datos y notas pasarán a solo lectura; cualquier explicación pública o interna que se quiera conservar debe registrarse antes de confirmar. El motivo sigue siendo opcional. |
| *Listo para recojo* → *Entregado* | La orden quedará cerrada y no podrá modificarse en V1. |

Las demás transiciones no piden confirmación, para evitar fricción repetitiva que reste valor a las importantes. La forma visual de las confirmaciones se define en Diseño.

---

## 8. Supuestos y riesgos abiertos

Esta sección registra lo que se da por cierto sin haberlo verificado y lo que puede salir mal. Los tratamientos son: **aceptado** (limitación conocida de V1), **mitigado** (cubierto por una regla), o **delegado** a Technical Design, Diseño o Security Pass.

### 8.1 Supuestos

| ID | Supuesto |
|---|---|
| SUP-01 | El contexto de V1 es Perú: interfaz en español, costo en PEN y hora de Perú. Es el contexto de V1, no un límite permanente. |
| SUP-02 | Hay un único taller, un único local y un único administrador. FIXORA puede coexistir con otros canales y herramientas externas del negocio. |
| SUP-03 | El cliente es una persona natural con un equipo personal, usa principalmente el móvil y no tiene conocimientos técnicos. Es un supuesto de UX, no una restricción de plataforma. |
| SUP-04 | La aprobación o rechazo del presupuesto ocurre fuera de FIXORA (teléfono, WhatsApp o en persona) y el administrador la refleja mediante el cambio de estado. |
| SUP-05 | El cliente dispone de un canal externo para contactar al taller (necesario para el código perdido y para la aprobación). |
| SUP-06 | Sin notificaciones, el administrador revisa FIXORA con regularidad y el cliente consulta por iniciativa propia. |
| SUP-07 | El volumen de órdenes es el propio de un pequeño taller. No se define una cifra. |
| SUP-08 | Las credenciales del administrador se provisionan y, si hace falta, se recuperan fuera del producto. |
| SUP-09 | La accesibilidad es un principio de diseño sin criterio cuantitativo (legibilidad, contraste, etiquetas comprensibles, estados de foco, navegación clara, formularios comprensibles). El rendimiento debe ser razonablemente fluido en los flujos principales, sin umbrales numéricos. |
| SUP-10 | Next.js, React y Tailwind forman parte del scaffold técnico actual. Las tecnologías adicionales todavía no aprobadas —persistencia, ORM, proveedor de base de datos, estrategia de autenticación y otras decisiones de arquitectura— serán confirmadas durante el Technical Design mediante ADRs. **El despliegue público en Vercel es una restricción ya establecida del proyecto.** |
| SUP-11 | Se asume que el problema descrito en la sección 1 existe y es relevante en talleres reales, pero no se dispone de evidencia propia ni casos reales que lo validen todavía (ver `VAL-01`). |

### 8.2 Validaciones pendientes de producto

No son criterios de V1.

| ID | Validación |
|---|---|
| VAL-01 | Que el problema exista y sea relevante en talleres reales. |
| VAL-02 | Que un taller real adopte FIXORA. |
| VAL-03 | Que clientes externos encuentren el uso fácil. |
| VAL-04 | Antes de utilizar FIXORA como sistema operativo real con clientes y datos personales reales, deben evaluarse los requisitos de privacidad y protección de datos aplicables, así como las necesidades de retención y eliminación. Esta validación no bloquea la finalización del proyecto académico V1 ni su despliegue público de demostración. Durante desarrollo, testing, presentación y demostraciones se utilizarán preferentemente datos ficticios y no sensibles. |

Este PRD no afirma cumplimiento legal ni constituye asesoría legal. Si FIXORA evolucionara hacia un producto usado por un taller real, la política de privacidad, la retención y eliminación, y las demás obligaciones aplicables deberían revisarse con una persona competente.

### 8.3 Riesgos y limitaciones conocidas

| ID | Riesgo | Tratamiento |
|---|---|---|
| RIE-01 | El código de seguimiento es el único mecanismo de acceso a la consulta pública. Quien lo obtenga o lo adivine ve la información pública de la orden. | **Delegado a Technical Design y Security Pass.** No se acepta sin más. Debe equilibrar legibilidad, comunicación verbal, unicidad y resistencia a ser adivinado o enumerado. `SC-11` y `SC-13` son obligatorios. |
| RIE-02 | La consulta pública no expira: la exposición aumenta con el tiempo. | Aceptado como limitación conocida. Una política de retención sería evolución futura. |
| RIE-03 | No hay política de retención ni de eliminación de datos personales ni eliminación administrativa de órdenes. | Limitación conocida de V1, **sujeta a `VAL-04`**. No impide completar el proyecto académico, pero el uso operativo real con datos personales reales queda condicionado a `VAL-04`. El PRD no afirma que sea apropiado para un producto comercial real. |
| RIE-04 | Las notas pueden editarse o eliminarse sin historial: una nota pública que el cliente vio puede cambiar o desaparecer sin trazabilidad de su versión anterior. | Aceptado conscientemente. |
| RIE-05 | Una nota pública puede contradecir el diagnóstico o el costo congelados. | Aceptado. Sin validaciones semánticas automáticas. En Diseño, diagnóstico, costo y notas públicas deben tener jerarquías y propósitos claramente diferenciados. |
| RIE-06 | Un error al congelar diagnóstico o costo no se puede corregir. | Mitigado por `E11`. Residual aceptado: si el error se detecta mientras la orden continúa en *Esperando aprobación*, puede cancelarse y generarse una nueva solicitud. Si se detecta después de entrar en *En reparación*, V1 no dispone de un mecanismo para corregir el diagnóstico o el costo congelados ni para cancelar la orden. Es una limitación conocida de V1; la matriz no se modifica. |
| RIE-07 | El costo no puede re-presupuestarse: si durante *En reparación* aparece un problema adicional, diagnóstico y costo originales permanecen congelados. | Aceptado como limitación. Evolución futura: re-diagnóstico, nuevo presupuesto y nuevo ciclo de aprobación. |
| RIE-08 | Existen órdenes que V1 no puede cerrar de una forma representativa del caso real. Un equipo nunca recogido puede permanecer indefinidamente en *Listo para recojo*. Una reparación que se vuelve inviable después de entrar en *En reparación* ya no puede cancelarse, y V1 únicamente permite continuar por el flujo *En reparación* → *Listo para recojo* → *Entregado*. | Aceptado como limitación de V1, sin reabrir la máquina de estados. No se añade un estado Abandonado ni Reparación fallida, cancelación desde *Listo para recojo* o después de *En reparación*, retrocesos, archivado, vencimiento, reglas temporales ni excepciones nuevas. |
| RIE-09 | *Cancelado* no distingue el motivo (rechazo del cliente u otra causa). | Aceptado. La nota previa es opcional. |
| RIE-10 | Pérdida del acceso administrativo: no hay recuperación dentro del producto. | Aceptado en el producto. No impide V1 siempre que el Technical Design documente una forma operativa de provisionar las credenciales iniciales y de recuperar el acceso fuera del producto. |
| RIE-11 | Solicitudes falsas o spam. | Aceptado. Controles a evaluar en Technical Design y Security Pass según el riesgo. |
| RIE-12 | Sin notificaciones, las solicitudes nuevas pueden quedar desatendidas y el cliente puede percibir lentitud. | Aceptado, ligado a `SUP-06`. |
| RIE-13 | La descripción pública del problema puede contener datos sensibles que el cliente escriba. | Mitigado: aviso visible (4.10), tratamiento de todo el contenido como texto y posibilidad de que el administrador corrija o retire información mientras la orden no sea final. Controles técnicos adicionales: Technical Design y Security Pass. `SC-11` protege los campos administrativos estructurados y no cubre este riesgo. **Residual aceptado:** si una orden llega a un estado final conteniendo accidentalmente información sensible en su descripción pública, V1 no permite editarla posteriormente. |
| RIE-14 | La aprobación del cliente no deja constancia en FIXORA (cuándo, cómo ni quién). | Aceptado. |
| RIE-15 | Un único administrador es punto único de falla y el historial no identifica al autor de los cambios. | Aceptado. |
| RIE-16 | Las decisiones técnicas todavía pendientes (persistencia, autenticación, arquitectura) podrían tener restricciones específicas para ejecutarse correctamente en Vercel. | **Delegado a Technical Design y ADRs, respetando Vercel como restricción fija de despliegue.** |
| RIE-17 | Toda entrada de usuario es no confiable. | Delegado a Technical Design y Security Pass (`E3`). |
| RIE-18 | La hora fija de Perú puede confundir a quien consulte desde otra zona horaria. | Aceptado. |
| RIE-19 | El crecimiento del volumen de órdenes puede degradar el listado y la búsqueda. | Delegado a Diseño y Technical Design (`E8`). |
| RIE-20 | **Ingreso de datos reales en el despliegue público de demostración.** Al estar FIXORA públicamente accesible para cumplir `SC-20`, una tercera persona podría usar el formulario e introducir datos personales reales aunque el despliegue tenga propósito académico y de demostración. | Mitigado parcialmente: identificación clara del entorno como demostrativo (4.10); aviso en el formulario de no usar datos personales reales; advertencia de no introducir contraseñas, PIN, credenciales ni información sensible; uso de datos ficticios en desarrollo, testing y presentación; Security Pass sobre la exposición técnica. **Residual:** un aviso no impide técnicamente que alguien introduzca información real. El despliegue público V1 no se considera autorización ni validación para uso operativo con clientes reales; antes de ello deben resolverse las validaciones asociadas a `VAL-04` (privacidad, tratamiento de datos, retención, eliminación, información al usuario y demás requisitos aplicables). |

### 8.4 Clasificación de los riesgos

- **Limitaciones conocidas que no impiden dar V1 por completada:** `RIE-02`, `RIE-03` (con la condición de `VAL-04` para uso real), `RIE-04`, `RIE-05`, `RIE-06`, `RIE-07`, `RIE-08`, `RIE-09`, `RIE-10` (condicionado a que el Technical Design documente la provisión y recuperación operativa), `RIE-11`, `RIE-12`, `RIE-13` (con su residual), `RIE-14`, `RIE-15`, `RIE-18`.
- **Delegados, que deben tratarse posteriormente con trazabilidad y según los criterios de éxito (especialmente `SC-11`, `SC-12`, `SC-13` y `SC-18`):** `RIE-01`, `RIE-16`, `RIE-17`, `RIE-19`, `RIE-20`, y los controles técnicos de `RIE-11` y `RIE-13`.
- `SC-11` y `SC-12` son innegociables: ningún riesgo puede aceptarse de forma que permita exponer públicamente información administrativa o ejecutar capacidades administrativas sin sesión válida.

---

## Apéndice A. Decisiones delegadas a fases posteriores

Este PRD no las decide.

**Technical Design y ADRs (`docs/03-arquitectura/`)**

- Persistencia, base de datos, ORM y proveedor de base de datos.
- Estrategia de autenticación y de sesiones, incluida su duración.
- Provisión inicial de las credenciales del administrador y recuperación operativa del acceso.
- Generación, formato, unicidad, normalización y resistencia a enumeración del código de seguimiento.
- Protección frente a intentos masivos y abuso (rate limiting, CAPTCHA, detección de spam, bloqueo por IP), si se consideran necesarios.
- Estrategia para evitar duplicados accidentales de envío y para manejar vistas desactualizadas (idempotencia, concurrencia).
- Almacenamiento de fechas y zona horaria; representación y límites de valores monetarios.
- Tratamiento y sanitización de entradas; límites concretos de longitud (con la Spec).
- Implementación de la máquina de estados, del historial y de las reglas de visibilidad, y estructura de rutas y API.
- Estrategia de búsqueda y de gestión del listado cuando crece.
- Cómo desplegar en Vercel, composición del pipeline de CI/CD, ambientes y gates; confirmación de OpenSpec, Playwright y GitHub Actions.

**Diseño (`docs/02-diseno/`)**

- Redacción y representación visual de los avisos y de las confirmaciones de `E11`.
- Aviso de entorno demostrativo.
- Dashboard (indicadores, distribución, representación), Repair Journey y timeline, estados vacíos.
- Estrategia visual de listado (paginación u otra).
- Presentación y selección de la lista de tipos de equipo en la interfaz (los tipos están fijados en 4.3 y Diseño no puede agregar ni eliminar ninguno).
- Jerarquías diferenciadas entre diagnóstico, costo y notas públicas.
- Aplicación de los principios de accesibilidad.

**Testing y Seguridad (`docs/07-testing/`, `docs/08-seguridad/`)**

- Estrategia de pruebas y evidencia trazable de `SC-01` a `SC-20` y de `E1` a `E17`.
- Escala de severidad y formato del Security Report.
- Procedimiento de verificación del flujo principal sobre el despliegue de demostración.

## Apéndice B. Acciones documentales pendientes tras la aprobación del PRD

Decididas en la entrevista y **realizadas el 2026-10-25, tras la aprobación del PRD**:

1. **`docs/00-definicion/PROJECT-BRIEF.md`**, sección de dirección tecnológica: dejar constancia explícita y trazable de que Vercel figuraba como provisional, de que durante la definición del PRD se estableció como destino obligatorio de despliegue de V1, y de que el Technical Design decidirá *cómo* desplegar en Vercel y no *si* se utiliza.
2. **`CLAUDE.md`**, sección Stack: retirar Vercel de las tecnologías provisionales, conservando la trazabilidad de que la decisión se tomó durante el PRD. Siguen provisionales las demás decisiones abiertas (persistencia, base de datos, ORM, proveedor, autenticación, sesiones, OpenSpec, Playwright y GitHub Actions) hasta que las fases correspondientes las confirmen.
3. **Estado del pipeline** en `CLAUDE.md` y `docs/README.md`: fase 01 PRD actualizada a COMPLETADO tras la aprobación del PRD.
