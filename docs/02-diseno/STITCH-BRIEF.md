# FIXORA — Briefing UX para exploración en Google Stitch

> Fase 02 · Diseño · Documento de trabajo: insumo para la exploración UX/UI. **No es `DESIGN.md`, ni un sistema de diseño, ni una decisión visual definitiva.**
>
> **Estado: insumo histórico.** La exploración que originó ya se realizó y está consolidada en `UX-EXPLORATION.md` y `DESIGN.md`; este briefing no es autoridad posterior a ellos.
>
> Fecha de redacción: 2026-10-25.
>
> Fuente de verdad funcional: `docs/01-producto/PRD.md` (aprobado). Este briefing se deriva exclusivamente de la documentación aprobada (`CLAUDE.md`, `docs/README.md`, `PROJECT-BRIEF.md` y `PRD.md`). No agrega funcionalidades ni cambia reglas de negocio. Si este briefing contradijera al PRD, prevalece el PRD.
>
> Las referencias `§` remiten a secciones del PRD; `SC-*`, `E*`, `SUP-*`, `RIE-*` son identificadores del PRD.

## Cómo usar este documento

- Es el contexto que se entrega a Stitch para explorar **varias direcciones UX** de las pantallas definidas en la sección 3.
- Distingue tres cosas:
  - **Fijo (PRD):** reglas de negocio, estados, qué es público o interno, qué se excluye. Stitch no lo puede alterar.
  - **Libre (exploración):** jerarquía, distribución, navegación, densidad, componentes, microcopy provisional (sección 12).
  - **`DECISIÓN UX PENDIENTE`:** capacidades del PRD cuya representación UX no está definida. Stitch puede explorarlas, pero **no se asumen resueltas** (sección 14).
- Los ejemplos usan **datos ficticios** (ver 10.5).

---

## 1. Objetivo UX

La experiencia debe conseguir:

1. **Transparencia para el cliente.** Que pueda saber en qué etapa está su reparación sin llamar ni escribir al taller solo para preguntarlo (§3.3).
2. **Simplicidad.** Registrar y consultar deben ser tareas cortas y obvias para una persona sin conocimientos técnicos que probablemente usa el móvil (`SUP-03`).
3. **Seguimiento sin cuenta.** Nada de registro, login ni contraseña para el cliente; el único hilo conductor es el código de seguimiento.
4. **Claridad del Repair Journey.** El cliente debe entender de un vistazo el estado actual, por dónde pasó la reparación y cuándo.
5. **Eficiencia para el administrador.** Un único administrador debe localizar una orden, entender su situación, registrar información y cambiar su estado con pocos pasos y sin errores irreversibles accidentales.
6. **Separación evidente entre información pública e interna.** Tanto el cliente como, sobre todo, el administrador deben ver sin ambigüedad qué se muestra al cliente y qué es solo del taller (diferenciador 4 del Brief; `SC-11`; `SC-15` incluye "identificar la información pública e interna").

**Lema del producto:** *"Tu reparación, siempre bajo control."*

---

## 2. Usuarios

Solo existen estos dos usuarios en V1.

### 2.1 Cliente (sin cuenta)

- **Quién es:** persona natural con un equipo tecnológico personal (celular, tablet, laptop, PC, consola u otro). Un equipo por solicitud.
- **Contexto de uso:** principalmente desde el móvil (supuesto de UX, no restricción de plataforma; `SUP-03`); debe funcionar también en escritorio. Consulta por iniciativa propia: no hay notificaciones (`SUP-06`).
- **Necesidades:**
  - Registrar su solicitud rápido, entendiendo qué se le pide y por qué.
  - Recibir y **conservar** su código de seguimiento (solo se muestra al registrar; si lo pierde debe contactar al taller; `E2`).
  - Consultar el estado sin crear cuenta.
  - Entender el Repair Journey y, cuando corresponda, el diagnóstico y el costo estimado para decidir (la decisión ocurre fuera de FIXORA; `SUP-04`).
  - Sentirse tranquilo respecto a qué datos ve cualquiera que tenga el código.
- **No necesita (fuera de V1):** cuenta, recuperación del código en la app, notificaciones, chat, pagos, fechas prometidas.

### 2.2 Administrador (único)

- **Quién es:** una sola persona que opera el taller desde una zona protegida. Sin roles, técnicos ni permisos diferenciados.
- **Contexto de uso:** revisa FIXORA con regularidad (`SUP-06`, `RIE-12`). Debe funcionar bien en móvil y escritorio.
- **Necesidades:**
  - Ver de un vistazo cuántas órdenes hay en cada etapa principal.
  - Encontrar una orden por código o por nombre y filtrar por estado.
  - Ver el detalle completo, incluidos datos de contacto del cliente y notas internas.
  - Registrar diagnóstico y costo estimado, agregar notas públicas e internas, corregir datos básicos y cambiar el estado.
  - Entender qué acciones son irreversibles y qué quedará visible para el cliente.
  - Consultar el historial administrativo de la orden.
- **No necesita (fuera de V1):** crear órdenes, eliminarlas, asignar técnicos, reportes, exportación, gestión de su acceso.

---

## 3. Arquitectura de información

Los identificadores son **provisionales**.

### 3.1 Pantallas

**Área pública**

| ID | Pantalla | Qué es |
|---|---|---|
| `PUB-01` | Landing | Presenta FIXORA y da acceso a registrar y a consultar. |
| `PUB-02` | Registrar reparación | Formulario de la solicitud (un equipo por solicitud). |
| `PUB-03` | Confirmación de registro / código de seguimiento | Confirma el envío y entrega el código. |
| `PUB-04` | Consultar reparación | Entrada del código de seguimiento. |
| `PUB-05` | Detalle / seguimiento público | Estado, Repair Journey, timeline y datos públicos de la orden. |

**Área administrativa**

| ID | Pantalla | Qué es |
|---|---|---|
| `ADM-01` | Login | Acceso del administrador único. |
| `ADM-02` | Dashboard | Vista general y cantidades por estados principales. |
| `ADM-03` | Listado de órdenes | Búsqueda, filtro por estado y acceso al detalle. |
| `ADM-04` | Detalle de orden | Toda la gestión de una orden. |

### 3.2 Elementos transversales (no son pantallas independientes)

| Elemento | Dónde aparece | Notas |
|---|---|---|
| Aviso de entorno demostrativo | Parte pública (alcance exacto: `DUX-03`) | Breve y no intrusivo (§4.10, `RIE-20`). |
| Avisos del formulario | `PUB-02` | Datos personales y advertencia de la descripción (§4.10). |
| Cuatro confirmaciones de `E11` | `ADM-04` | Pueden ser modales, paneles u otro patrón. |
| Mensajes de estado y error | Todas | Ver sección 7. |
| Navegación del área administrativa | `ADM-02` a `ADM-04` | Entre dashboard, listado y detalle. |

### 3.3 Mapa de navegación

```
ÁREA PÚBLICA
PUB-01 Landing ──► PUB-02 Registrar ──► PUB-03 Confirmación + código ──► PUB-04 Consultar ──► PUB-05 Seguimiento
        └────────────────────────────────────────────────────────────────►┘ (consulta directa)

ÁREA ADMINISTRATIVA
ADM-01 Login ──► ADM-02 Dashboard ──► ADM-03 Listado ──► ADM-04 Detalle
                        └──────────────────►┘
```

El acceso a `ADM-01` desde la parte pública no está definido (`DUX-01`).

---

## 4. Flujo público principal

### 4.1 Registro y seguimiento

```
PUB-01 Landing
  → PUB-02 Registrar reparación
  → PUB-03 Confirmación + código de seguimiento
  → PUB-04 Consultar reparación
  → PUB-05 Detalle / seguimiento
```

1. El cliente llega a la landing y elige registrar una reparación.
2. Completa el formulario (un equipo). Los campos obligatorios y las validaciones se explican en 6.
3. Al enviar, FIXORA crea la orden en *Solicitud recibida* y entrega un código único.
4. La pantalla de confirmación indica **con claridad que debe conservar el código** (`E2`); es el único momento en que se muestra desde la parte pública.
5. Cuando quiera, consulta con el código y llega al seguimiento.

El PRD no define si, desde `PUB-03`, hay un atajo directo al seguimiento sin pasar por `PUB-04` (`DUX-05`).

### 4.2 Consulta directa

```
PUB-01 Landing
  → PUB-04 Consultar reparación
  → PUB-05 Detalle / seguimiento
```

El cliente que ya tiene su código entra directamente a consultar.

### 4.3 Variantes

- **Código inexistente:** en `PUB-04` (o equivalente) se informa que no se encontró la reparación (`E4`, `SC-13`). Ver `DUX-15`.
- **Error de validación en el registro:** el cliente permanece en `PUB-02` y ve qué campo corregir (`SC-16`).
- **Consultas posteriores:** el cliente vuelve a `PUB-04` con el mismo código en cualquier momento, incluso con la orden en estado final (`§7.1`).

---

## 5. Flujo administrativo principal

```
ADM-01 Login
  → ADM-02 Dashboard
  → ADM-03 Listado
  → ADM-04 Detalle
  → modificación permitida / cambio de estado
  → confirmación (cuando corresponda)
  → detalle actualizado
```

1. El administrador inicia sesión.
2. En el dashboard ve las cantidades por estados principales y accede al listado.
3. En el listado busca (código o nombre) y/o filtra por estado, y abre una orden.
4. En el detalle puede, según el estado de la orden (4.8 del PRD): registrar o modificar diagnóstico y costo, agregar/editar/eliminar notas, corregir datos básicos y cambiar el estado.
5. Antes de cuatro transiciones concretas, FIXORA pide confirmación explícita (`E11`, ver 7.5).
6. Tras la acción, el detalle muestra la información actualizada y el historial reflejado.

### Variantes

- **Sesión no válida o expirada (`E10`):** la acción no se ejecuta y se solicita autenticarse de nuevo.
- **Orden cambiada desde otra pestaña (`E9`):** la acción se rechaza y se informa al administrador para que vuelva a consultar.
- **Búsqueda sin resultados (`E7`):** estado vacío claro en `ADM-03`.
- **Orden en estado final:** el detalle es solo lectura (§4.8).
- **Intento de pasar a *Esperando aprobación* sin diagnóstico y costo (`SC-07`):** la transición no procede; cómo se comunica es `DUX-11`.

---

## 6. Contenido obligatorio por pantalla

### `PUB-01` Landing

- **Objetivo:** presentar FIXORA con su propuesta de valor y dar acceso inmediato a registrar y a consultar una reparación.
- **Información necesaria:**
  - Nombre, eslogan y explicación sencilla de qué es.
  - Una explicación breve de cómo funciona (registrar → obtener un código → consultar con el código), derivada del flujo aprobado.
  - Aviso de entorno demostrativo.
- **Acciones principales:** *Registrar reparación* (→ `PUB-02`); *Consultar reparación* (→ `PUB-04`).
- **Acciones secundarias:** acceso al login administrativo (`DUX-01`).
- **Estados relevantes:** presencia del aviso de entorno demostrativo.
- **Restricciones:**
  - No ofrecer ni sugerir crear cuenta o iniciar sesión como cliente.
  - No prometer notificaciones, tiempos, fechas, garantías ni precios.
  - No mostrar datos reales de talleres ni clientes.

### `PUB-02` Registrar reparación

- **Objetivo:** que el cliente registre una solicitud de un único equipo.
- **Información necesaria:**

| Dato | Obligatoriedad |
|---|---|
| Nombre | Obligatorio |
| Teléfono | Obligatorio |
| Email | Opcional |
| Tipo de equipo | Obligatorio (Celular, Tablet, Laptop, PC, Consola, Otro) |
| Marca | Obligatoria |
| Modelo | Opcional |
| Descripción del problema | Obligatoria |

  - Aviso sobre datos personales: se piden datos de contacto para gestionar la reparación y permitir al taller identificar y contactar al cliente.
  - Aviso junto a la descripción: podrá mostrarse en la consulta pública asociada al código; **no** incluir contraseñas, PIN, códigos de desbloqueo, credenciales, información financiera ni otros secretos.
  - Aviso de entorno demostrativo: no ingresar datos personales reales ni información sensible.
- **Acciones principales:** *Enviar solicitud*.
- **Acciones secundarias:** volver a la landing; ir a consultar una reparación existente.
- **Estados relevantes:** formulario inicial; campos obligatorios vacíos; teléfono inválido; email informado pero inválido; texto que excede el límite; envío en curso (debe evitar que un reenvío accidental cree dos órdenes, `E1`); envío correcto (→ `PUB-03`).
- **Restricciones:**
  - Un formulario = un equipo = una solicitud.
  - **No** pedir IMEI, número de serie, contraseña/PIN, accesorios, fotografías, archivos adjuntos ni datos de facturación.
  - **No** incluir casilla de aceptación obligatoria ni registro de consentimiento (§4.10).
  - Los tipos de equipo están fijados; Diseño solo decide su presentación (§4.3).
  - Los límites de longitud de los textos aún no están definidos (se definirán después); el diseño no debe depender de un tamaño exacto.

### `PUB-03` Confirmación de registro / código de seguimiento

- **Objetivo:** confirmar que la solicitud quedó registrada y entregar el código, asegurando que el cliente lo conserve.
- **Información necesaria:**
  - Confirmación de que la solicitud fue registrada, con su estado inicial *Solicitud recibida*.
  - El **código de seguimiento**, de lectura clara y fácil de copiar y de dictar (`E16`).
  - Instrucción explícita de conservar el código y de para qué sirve (consultar el estado).
  - Cómo continuar (consultar con el código).
  - Aviso de que, si lo pierde, debe contactar al taller (`E2`); ver `DUX-04`.
- **Acciones principales:** continuar a la consulta de seguimiento (`DUX-05`).
- **Acciones secundarias:** facilitar la conservación del código en pantalla (p. ej. copiarlo; `DUX-06`); volver al inicio.
- **Estados relevantes:** registro correcto con código visible.
- **Restricciones:**
  - El código se muestra **digitalmente**; no hay envío por email/SMS, ni PDF, QR, impresión ni "recuperar código" (§5).
  - No se puede volver a ver el código desde la parte pública.
  - El layout no debe depender de una longitud o formato de código concretos (el formato lo decidirá el Technical Design; `E16`).
  - Qué resumen de lo ingresado se muestra, y si incluye datos personales, es `DUX-06`.

### `PUB-04` Consultar reparación

- **Objetivo:** que el cliente introduzca su código y acceda al seguimiento.
- **Información necesaria:** un campo para el código; indicación de dónde lo obtuvo; aviso de entorno demostrativo.
- **Acciones principales:** *Consultar*.
- **Acciones secundarias:** ir a registrar una reparación; qué hacer si perdió el código (contactar al taller; `DUX-04`).
- **Estados relevantes:** campo vacío; consultando; **código inexistente** (mensaje de que no se encontró la reparación, sin exponer ni insinuar información de ninguna orden; `E4`, `SC-13`).
- **Restricciones:**
  - La coincidencia tolera mayúsculas/minúsculas y espacios accidentales al inicio y al final, y nada más (`E15`).
  - **No** buscar por nombre ni por teléfono.
  - **No** ofrecer "olvidé mi código" ni recuperación automática.
  - Un código con formato incorrecto y uno inexistente reciben el mismo tratamiento ("no se encontró").

### `PUB-05` Detalle / seguimiento público

- **Objetivo:** mostrar al cliente, de forma clara y sin datos personales, dónde está su reparación.
- **Información necesaria (pública):**
  - Código de seguimiento.
  - Tipo de equipo, marca y modelo (si existe).
  - Descripción del problema registrada actualmente en la orden.
  - Estado actual y Repair Journey (sección 8).
  - Timeline de estados con la fecha de cada transición (formato `DD/MM/AAAA HH:mm`, hora de Perú; §7.1).
  - Diagnóstico y costo estimado **solo desde que la orden alcanza *Esperando aprobación*** (el costo se muestra como `S/ 180.00`).
  - Notas públicas.
  - Aviso de entorno demostrativo.
- **Acciones principales:** ninguna sobre la orden. El cliente solo lee.
- **Acciones secundarias:** consultar otra reparación; volver al inicio.
- **Estados relevantes:**
  - Cada uno de los ocho estados (sección 8).
  - Antes de *Esperando aprobación*: sin diagnóstico ni costo visibles.
  - *Esperando aprobación*, *En reparación*, *Listo para recojo* y *Entregado*: diagnóstico y costo visibles.
  - *Cancelado*: diagnóstico y costo solo si la orden llegó a *Esperando aprobación* (`E5`).
  - Sin diagnóstico, costo o notas públicas: representación clara de "aún no hay información adicional" (`E6`).
  - Orden en *Entregado* o *Cancelado*: sigue consultable (sin expiración).
- **Restricciones:**
  - **Nunca** mostrar nombre, teléfono, email, notas internas ni historial administrativo (`SC-11`).
  - No mostrar versiones anteriores de diagnóstico o costo.
  - **No hay botones de aprobar, rechazar, cancelar ni contactar** en la app: la aprobación ocurre fuera de FIXORA (`SUP-04`). La forma de indicarle al cliente cómo comunicar su decisión al taller es microcopy a explorar sin agregar acciones (`DUX-04`).
  - No hay fechas prometidas, tiempos estimados ni SLA: el Journey representa **estado**, no promesa temporal.
  - Sin notificaciones: el cliente debe poder volver a consultar fácilmente.

### `ADM-01` Login

- **Objetivo:** autenticar al administrador único.
- **Información necesaria:** campos de credenciales (su naturaleza depende de la estrategia de autenticación, aún no definida; `DUX-14`); marca del producto.
- **Acciones principales:** *Iniciar sesión*.
- **Acciones secundarias:** ninguna definida.
- **Estados relevantes:** formulario inicial; credenciales incorrectas; sesión no válida o expirada que redirige aquí (`E10`); autenticando.
- **Restricciones:**
  - **No** hay registro, "olvidé mi contraseña", cambio de contraseña, roles ni cuentas múltiples (§5.A).
  - Los mensajes de error no deben revelar información sensible.

### `ADM-02` Dashboard

- **Objetivo:** dar una visión general rápida del estado de las órdenes y llevar al listado.
- **Información necesaria:**
  - Cantidad de órdenes en los principales estados. El PRD da como ejemplo: *Solicitud recibida*, *En diagnóstico*, *Esperando aprobación*, *En reparación*, *Listo para recojo*. El conjunto exacto es `DUX-08`.
  - Acceso al listado de órdenes.
- **Acciones principales:** ir al listado de órdenes.
- **Acciones secundarias:** navegación del área administrativa; cerrar sesión (`DUX-02`).
- **Estados relevantes:** con órdenes; sin órdenes todavía (uso inicial).
- **Restricciones:**
  - **Sin** gráficos, tendencias, métricas históricas, reportes, exportación ni estadísticas comerciales.
  - Las cantidades no son notificaciones: no hay avisos ni alertas automáticas (§5.F).
  - Las solicitudes falsas pueden afectar las cantidades (`E13`).

### `ADM-03` Listado de órdenes

- **Objetivo:** localizar rápidamente una orden o un conjunto de órdenes y abrir su detalle.
- **Información necesaria:**
  - Búsqueda por **código** (exacto, tras la normalización de `E15`) y por **nombre** del cliente (parcial, sin distinguir mayúsculas ni tildes).
  - Filtro por **estado**, combinable con la búsqueda.
  - Las órdenes, ordenadas por **fecha de registro de la solicitud, de la más reciente a la más antigua** (`E8`).
  - Datos suficientes por orden para reconocerla y ver su estado (qué campos: `DUX-09`).
- **Acciones principales:** buscar; filtrar por estado; abrir una orden (→ `ADM-04`).
- **Acciones secundarias:** limpiar búsqueda/filtro; volver al dashboard.
- **Estados relevantes:** con resultados; **sin resultados** (estado vacío claro, `E7`); sin órdenes todavía; cargando; muchas órdenes (el listado debe seguir siendo manejable; estrategia visual: `DUX-09`).
- **Restricciones:**
  - **Sin** filtros por fecha, tipo de equipo, marca o costo; **sin** búsqueda avanzada; **sin** orden configurable por otras columnas.
  - **Sin** botón para crear órdenes, **sin** eliminar y **sin** acciones masivas.
  - **Sin** exportación.
  - Los datos de contacto del cliente son administrativos; su presencia en el listado es parte de `DUX-09`.

### `ADM-04` Detalle de orden

- **Objetivo:** concentrar toda la gestión de una orden en una vista donde sea evidente qué es público, qué es interno y qué se puede hacer según el estado.
- **Información necesaria:**
  - Código (no editable; `E17`), estado actual y fecha de registro.
  - **Datos del cliente** (administrativos): nombre, teléfono, email.
  - **Datos del equipo:** tipo, marca, modelo.
  - **Descripción del problema** (pública).
  - **Diagnóstico y costo estimado**, con su regla de visibilidad y congelamiento:
    - en *Solicitud recibida*, *Equipo recibido* y *En diagnóstico* son información de trabajo, **no visible** para el cliente y editable;
    - desde *Esperando aprobación* se publican y quedan congelados.
  - **Notas públicas** (visibles para el cliente) y **notas internas** (solo administrador).
  - **Historial administrativo:** transiciones de estado, y primer registro y modificaciones de diagnóstico y costo, cada uno con su momento. No incluye notas, correcciones de datos ni autor.
  - Las **transiciones disponibles** según la matriz del PRD (sección 8.3).
- **Acciones principales:** cambiar el estado; registrar o modificar diagnóstico y costo (mientras sea posible); agregar notas públicas e internas.
- **Acciones secundarias:** corregir datos básicos del cliente y del equipo; editar o eliminar notas; consultar el historial; volver al listado; cerrar sesión (`DUX-02`).
- **Estados relevantes:**
  - Edición permitida o bloqueada según el estado (tabla 6.1).
  - Orden en *Entregado* o *Cancelado*: **cerrada, solo lectura** total.
  - Validación del costo: mayor que `S/ 0.00`, dos decimales, sin negativos.
  - Validación de los datos corregidos con las mismas reglas del registro (`E3`).
  - Intento de pasar a *Esperando aprobación* sin diagnóstico y costo (`SC-07`).
  - Las cuatro confirmaciones (7.5).
  - Acción rechazada porque la orden cambió (`E9`) y sesión no válida (`E10`).
- **Restricciones:**
  - **Solo transiciones permitidas** (sección 8.3): sin retrocesos, sin saltos, sin reabrir.
  - *Cancelado* solo hasta *Esperando aprobación*; desde *En reparación* ya no.
  - Escribir una nota nunca es requisito para cambiar el estado, y el motivo de cancelación es opcional.
  - Si se quiere dejar una explicación de la cancelación, debe escribirse **antes** de cancelar (`E14`); la orden cancelada ya no admite notas.
  - El código no se puede editar; no hay asignación de técnicos, autor de cambios ni versiones de notas.
  - No hay funciones de pago, facturación, descuentos ni desglose de costo.

#### 6.1 Reglas de edición en `ADM-04` (§4.8)

| Elemento | *Solicitud recibida* | *Equipo recibido* | *En diagnóstico* | *Esperando aprobación* | *En reparación* | *Listo para recojo* | *Entregado* / *Cancelado* |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Datos del cliente, del equipo y descripción | Sí | Sí | Sí | Sí | Sí | Sí | No |
| Diagnóstico y costo estimado | Sí | Sí | Sí | No | No | No | No |
| Notas públicas e internas (agregar, editar, eliminar) | Sí | Sí | Sí | Sí | Sí | Sí | No |

---

## 7. Estados UX que Stitch debe contemplar

No todos necesitan ser páginas independientes; pueden ser estados de una pantalla, mensajes, paneles o modales.

### 7.1 Formularios y envío

| Estado | Dónde | Regla del PRD |
|---|---|---|
| Campos obligatorios vacíos y errores de validación (teléfono inválido, email inválido, texto demasiado largo) | `PUB-02`; correcciones en `ADM-04` | `E3`, `SC-16`: se indica cuál es el problema y no se crea la orden. En `ADM-04` rigen las mismas reglas. |
| Envío en curso | `PUB-02`, `ADM-01`, acciones de `ADM-04` | `E1`: un reenvío accidental no debe generar dos órdenes. |
| Envío correcto | `PUB-02` → `PUB-03` | Muestra el código (`E2`, `E16`). |

### 7.2 Consulta pública

| Estado | Dónde | Regla del PRD |
|---|---|---|
| Código inexistente | `PUB-04` (o equivalente) | `E4`, `SC-13`: mensaje de que no se encontró la reparación; sin exponer datos. |
| Ausencia de diagnóstico, costo o notas públicas | `PUB-05` | `E6`: sin errores; se indica que aún no hay información adicional. |
| Orden *Cancelado* | `PUB-05` | `E5`: muestra estado, Journey/timeline, descripción y notas públicas; diagnóstico y costo solo si llegó a *Esperando aprobación*. |
| Orden *Entregado* | `PUB-05` | Estado final; sigue consultable. |
| Aviso de entorno demostrativo | Público (y posiblemente más; `DUX-03`) | `RIE-20`, §4.10. |

### 7.3 Administración

| Estado | Dónde | Regla del PRD |
|---|---|---|
| Lista administrativa sin resultados | `ADM-03` | `E7`: estado vacío claro. |
| Sin órdenes todavía | `ADM-02`, `ADM-03` | Estado de uso inicial. |
| Sesión administrativa no válida o expirada | Cualquier pantalla administrativa → `ADM-01` | `E10`: la acción no se ejecuta, se solicita autenticarse, la orden no queda en estado parcial. |
| Acción rechazada porque la orden cambió | `ADM-04` | `E9`: se valida contra el estado vigente, se rechaza y se informa para que vuelva a consultar. |
| Transición no permitida / requisitos no cumplidos | `ADM-04` | `SC-06`, `SC-07`: ver `DUX-11`. |
| Orden cerrada (solo lectura) | `ADM-04` | `SC-09`. |

### 7.4 Estados no definidos por el PRD

Un fallo inesperado del sistema o de la conexión, y los estados de carga, no están definidos en el PRD. Stitch puede contemplarlos como patrones genéricos, pero no se tratan como requisitos resueltos (`DUX-13`).

### 7.5 Las cuatro confirmaciones de `E11`

Solo estas cuatro transiciones piden confirmación explícita. Las demás **no** deben pedirla.

| Transición | Qué debe comunicar la confirmación |
|---|---|
| *En diagnóstico* → *Esperando aprobación* | Permite revisar el diagnóstico y el costo estimado, que **quedarán congelados y disponibles para el cliente**. |
| *Esperando aprobación* → *En reparación* | Representa que el cliente aprobó fuera de FIXORA. Advierte que, a partir de este momento, **la reparación ya no podrá cancelarse en FIXORA V1**. |
| Cualquiera de las transiciones permitidas hacia *Cancelado* | La orden quedará **cerrada y no podrá reabrirse**; datos y notas pasarán a solo lectura; cualquier explicación pública o interna que se quiera conservar debe registrarse **antes** de confirmar. El motivo sigue siendo opcional. |
| *Listo para recojo* → *Entregado* | La orden quedará **cerrada y no podrá modificarse** en V1. |

La forma visual (modal, panel, página) se explora libremente. El PRD no define confirmación para eliminar una nota (`DUX-16`).

---

## 8. Repair Journey

### 8.1 Los ocho estados exactos

1. *Solicitud recibida*
2. *Equipo recibido*
3. *En diagnóstico*
4. *Esperando aprobación*
5. *En reparación*
6. *Listo para recojo*
7. *Entregado*
8. *Cancelado*

**No se pueden inventar estados** (ni "Abandonado", "Reparación fallida", "Pausado", etc.) ni renombrar los existentes.

### 8.2 Flujo y significado funcional

Flujo normal: 1 → 2 → 3 → 4 → 5 → 6 → 7. *Cancelado* es una salida alternativa que termina la orden.

| Estado | Significado funcional (derivado del PRD) |
|---|---|
| *Solicitud recibida* | La orden nace aquí al registrarse. |
| *Equipo recibido* | El taller ya recibió el equipo. |
| *En diagnóstico* | El taller está diagnosticando. Diagnóstico y costo son todavía información de trabajo, no visible para el cliente. |
| *Esperando aprobación* | Diagnóstico y costo ya están publicados y congelados. El cliente decide fuera de FIXORA. |
| *En reparación* | El cliente aprobó (fuera de FIXORA). Desde aquí la orden ya no puede cancelarse. |
| *Listo para recojo* | La reparación terminó y el equipo puede recogerse. |
| *Entregado* | Estado final: el equipo fue entregado. |
| *Cancelado* | Estado final: la reparación terminó antes de comenzar formalmente la etapa de reparación. |

### 8.3 Transiciones permitidas (para las acciones del administrador)

| Desde | Hacia |
|---|---|
| *Solicitud recibida* | *Equipo recibido*, *Cancelado* |
| *Equipo recibido* | *En diagnóstico*, *Cancelado* |
| *En diagnóstico* | *Esperando aprobación* (solo si hay diagnóstico y costo), *Cancelado* |
| *Esperando aprobación* | *En reparación*, *Cancelado* |
| *En reparación* | *Listo para recojo* |
| *Listo para recojo* | *Entregado* |
| *Entregado*, *Cancelado* | (ninguna) |

### 8.4 Qué decide Diseño y qué no

- **Diseño decide la representación visual** del Repair Journey (línea, pasos, tarjetas, barra, etc.), cómo se presenta el estado actual, los pasados y los pendientes, y cómo se relaciona con el timeline.
- **Diseño no decide su lógica:** los estados, el orden y las transiciones son del PRD.
- El Journey representa **estado, no promesa temporal**: no mostrar fechas estimadas, duraciones ni porcentajes de avance.
- El timeline público muestra los estados por los que pasó la orden con la fecha de cada transición. No muestra versiones anteriores de diagnóstico ni de costo.
- Cómo representar *Cancelado* dentro de un flujo lineal, y si Journey y timeline son uno o dos componentes: `DUX-07`.

---

## 9. Responsive

- Se debe explorar para **móvil** y **escritorio**.
- **Cliente (público): mobile-first.** Es el contexto de uso más probable (`SUP-03`), pero debe funcionar correctamente en escritorio.
- **Administrador:** también debe funcionar correctamente en ambos formatos, no solo en escritorio.
- Criterio del PRD (`SC-15`): los flujos del cliente y del administrador deben poder completarse en móvil y en escritorio, con sus acciones principales visibles y utilizables, **sin desplazamiento horizontal de la página**.
- Esto aplica a pantallas densas como el listado y el detalle de orden.
- No se definen breakpoints técnicos en este briefing.

---

## 10. Contenido y privacidad

### 10.1 Información pública (consulta por código)

- Código de seguimiento.
- Tipo de equipo, marca y modelo (si existe).
- Descripción del problema registrada actualmente en la orden.
- Estado actual y Repair Journey.
- Timeline de estados con fechas.
- Diagnóstico y costo estimado **actuales**, solo desde *Esperando aprobación*.
- Notas públicas.

### 10.2 Información exclusivamente administrativa

- Nombre, teléfono y email del cliente.
- Notas internas.
- Historial de cambios de diagnóstico y de costo estimado.
- Diagnóstico y costo mientras la orden está en *Solicitud recibida*, *Equipo recibido* o *En diagnóstico* (información de trabajo).

La consulta pública **no expone directamente** los campos personales administrativos, aunque el código sea correcto (`SC-11`, innegociable). Esto no impide que el propio cliente escriba información personal en un campo público como la descripción (`RIE-13`).

### 10.3 Notas

- **Nota pública:** visible para el cliente y el administrador. Es un canal de comunicación hacia el cliente, no un reemplazo del diagnóstico ni del costo congelados (`RIE-05`).
- **Nota interna:** visible solo para el administrador. Es donde van los detalles técnicos y observaciones reservadas.
- **Diagnóstico:** texto redactado para ser comunicado al cliente. No es un espacio para comentarios internos.
- En el detalle administrativo debe ser inequívoco cuál es cuál (`DUX-12`).
- Las notas se pueden agregar, editar y eliminar sin historial mientras la orden no sea final.

### 10.4 Avisos

| Aviso | Dónde | Contenido conceptual (microcopy provisional) |
|---|---|---|
| Datos personales | `PUB-02` | FIXORA pide datos de contacto para gestionar la reparación y permitir al taller identificarte y contactarte cuando corresponda. |
| Descripción del problema | `PUB-02`, junto al campo | La descripción puede mostrarse en la consulta pública asociada a tu código. No incluyas contraseñas, PIN, códigos de desbloqueo, credenciales, información financiera ni otros datos sensibles. |
| Entorno demostrativo | Público; alcance por decidir (`DUX-03`) | Entorno demostrativo. No ingreses datos personales reales ni información sensible. |

No hay casilla de aceptación ni almacenamiento de consentimiento. La redacción final se define en Diseño.

### 10.5 Datos ficticios para los ejemplos

Todo ejemplo debe usar datos claramente ficticios. Sugerencias:

- Cliente: "Cliente Ejemplo", teléfono "900 000 000", email "cliente@ejemplo.test".
- Equipo: Laptop, marca "MarcaEjemplo", modelo "Modelo X1".
- Descripción: "La laptop no enciende después de una caída."
- Diagnóstico: "Se detectó deterioro en el conector de carga. Se recomienda reemplazar el módulo."
- Costo: `S/ 180.00`.
- Fecha: `25/10/2026 14:35`.
- Nota pública: "El repuesto fue solicitado al proveedor."
- Nota interna: "El cliente prefiere que lo llamen por la tarde."
- Código: un valor **ficticio e ilustrativo** (por ejemplo `EJ-0000`). **No** representa el formato real, que decidirá el Technical Design; el diseño debe tolerar códigos de distinta longitud.

No usar nombres reales de personas, talleres, empresas, teléfonos ni correos. No usar ejemplos que sugieran notificaciones o plazos (por ejemplo, "te avisaremos" o "estará listo en 3 días").

### 10.6 Formatos

- Fecha y hora: `DD/MM/AAAA HH:mm`, 24 horas, hora de Perú, igual para cliente y administrador.
- Costo: PEN, mostrado como `S/` con dos decimales.
- Idioma de la interfaz: solo español.

---

## 11. Restricciones de exploración

Stitch **no puede introducir**:

- Cuentas de cliente, registro o login de clientes, ni recuperación de contraseña.
- Pagos, facturación, impuestos, descuentos, desglose de costo o múltiples monedas.
- Inventario de repuestos.
- Chat cliente-técnico.
- Notificaciones de cualquier tipo (email, SMS, WhatsApp, push, internas, alertas).
- Técnicos, asignación de responsables, carga de trabajo, roles o permisos.
- Sucursales o multiempresa.
- **Estados nuevos** ni renombrar los ocho existentes.
- **Acciones nuevas sobre las órdenes:** retroceder, saltar etapas, reabrir, eliminar, crear órdenes desde el panel, editar el código, nuevo presupuesto, re-diagnóstico, garantías, cancelar desde *En reparación* en adelante.
- **Acciones del cliente sobre la orden:** aprobar, rechazar, cancelar o editar desde la parte pública.
- Recuperación del código ("olvidé mi código") o búsqueda pública por nombre o teléfono.
- Datos adicionales de la solicitud: IMEI, serie, PIN, accesorios, fotografías, adjuntos.
- Reportes, gráficos, tendencias, exportación, impresión, PDF, QR.
- Filtros adicionales (fecha, tipo, marca, costo), búsqueda avanzada u orden configurable.
- Fechas prometidas, SLA, calendario, citas o reservas.
- Casilla de consentimiento o historial de consentimiento.
- Historial público de versiones previas de diagnóstico o costo.
- Interfaz multiidioma.
- Cualquier funcionalidad fuera del PRD.

Si una propuesta de Stitch requiere alguna de estas cosas, **no se acepta como diseño**: se descarta o se registra como `DECISIÓN UX PENDIENTE` para una decisión de producto explícita.

---

## 12. Qué puede explorar libremente Stitch

Puede proponer alternativas sobre:

- Jerarquía visual y distribución de cada pantalla.
- Navegación entre pantallas y dentro del área administrativa.
- Densidad de información.
- Composición y organización de contenidos.
- Tarjetas frente a tablas (por ejemplo, en el listado y el dashboard).
- Ubicación de las acciones.
- Representación del Repair Journey y su relación con el timeline.
- Comportamiento responsive en móvil y escritorio.
- Patrones de formulario (pasos, una sola página, agrupación, ayudas contextuales).
- Estados vacíos y de error.
- Formas de las confirmaciones (modal, panel, página).
- Microcopy provisional (textos, tono).
- Recursos visuales de apoyo, siempre que no creen funcionalidad.

**No puede alterar las reglas de negocio** (secciones 8, 10 y 11).

Los colores, la tipografía, el sistema visual y los componentes **no se cierran** en esta fase; Stitch puede sugerirlos como parte de cada dirección, pero no quedan decididos.

---

## 13. Objetivo de la exploración

Queremos **comparar varias direcciones UX** antes de seleccionar una.

**Se espera de Stitch:**

- Al menos dos o tres direcciones diferenciadas para el conjunto de pantallas (`PUB-01` a `PUB-05` y `ADM-01` a `ADM-04`), cada una pensada para móvil y escritorio.
- Representaciones de los estados de la sección 7, aunque no todos sean pantallas completas.
- Propuestas para las `DECISIÓN UX PENDIENTE` de la sección 14, marcadas como propuestas.

**Criterios para comparar las direcciones** (derivados del PRD):

1. ¿El cliente entiende el estado y el Repair Journey de un vistazo (`SC-02`, objetivo 3.3)?
2. ¿El registro y la conservación del código son claros (`E2`)?
3. ¿Se distingue sin ambigüedad lo público de lo interno, sobre todo en `ADM-04` (`SC-11`, `SC-15`)?
4. ¿El administrador llega a una orden y cambia su estado con pocos pasos?
5. ¿Las acciones irreversibles y las confirmaciones de `E11` son claras sin generar fricción repetitiva?
6. ¿Funciona en móvil y escritorio, sin desplazamiento horizontal, también para el administrador (`SC-15`)?
7. ¿Evita introducir cualquier cosa de la sección 11?

**Todavía NO se quiere:**

- `DESIGN.md` definitivo ni sistema de diseño final.
- Código frontend, HTML/CSS, implementación React ni componentes productivos.

---

## 14. Decisiones UX pendientes

Capacidades del PRD cuya representación UX no está definida. Ninguna es una pantalla nueva ni una funcionalidad nueva: son decisiones de representación que no se asumen resueltas. Stitch puede explorarlas; la selección corresponde a Diseño.

| ID | `DECISIÓN UX PENDIENTE` | Contexto |
|---|---|---|
| `DUX-01` | Cómo se llega a `ADM-01` desde la parte pública (¿enlace en la landing o acceso por dirección conocida?). | El PRD define el login, pero no cómo se descubre. |
| `DUX-02` | Cerrar sesión. | El PRD menciona el login y la sesión expirada, pero no cita la acción de cerrar sesión; hay que decidir si aparece y dónde, sin tratarla como funcionalidad nueva de gestión de acceso. |
| `DUX-03` | Alcance, forma y persistencia del aviso de entorno demostrativo (¿solo en la parte pública, también en el login y la zona administrativa? ¿banner, texto fijo?). | §4.10 pide contemplarlo; no dice dónde exactamente. |
| `DUX-04` | Cómo informar al cliente que debe contactar al taller (código perdido; decisión sobre el presupuesto en *Esperando aprobación*). | El PRD no define datos de contacto del taller ni canales dentro de la app; no se pueden agregar enlaces o botones de contacto. |
| `DUX-05` | Salida de `PUB-03`: ¿atajo directo al seguimiento de esa solicitud o paso por `PUB-04`? | El flujo pedido pasa por la consulta. |
| `DUX-06` | Contenido de `PUB-03`: qué resumen mostrar (¿incluye nombre y teléfono ingresados o solo lo que es público?) y si se ofrece "copiar código". | `E16` pide que el código pueda copiarse; no está definida la affordance. No hay PDF, QR ni email. |
| `DUX-07` | Representación de *Cancelado* dentro del Repair Journey, y si Journey y timeline son uno o dos componentes. | El PRD exige ambos contenidos, no su forma. |
| `DUX-08` | Qué estados aparecen en los indicadores del dashboard y si cada indicador lleva al listado ya filtrado. | El PRD da ejemplos ("por ejemplo"); si incluye *Entregado*/*Cancelado* no está definido. Enlazar al listado filtrado solo reutilizaría el filtro por estado existente. |
| `DUX-09` | Campos mostrados por orden en el listado y estrategia visual para mantenerlo manejable con muchas órdenes. | `E8` delega la paginación u otra estrategia a Diseño y Technical Design. |
| `DUX-10` | Organización de `ADM-04`: página única con secciones, pestañas, panel lateral u otro; presentación del historial; cómo se corrigen los datos básicos (en línea, modo de edición, etc.); cómo se evidencia el congelamiento. | El PRD define los contenidos y reglas, no su composición. |
| `DUX-11` | Cómo se presentan las transiciones: solo las permitidas frente a todas con rechazo; cómo se explica que *Esperando aprobación* exige diagnóstico y costo. | `SC-06` y `SC-07`. El sistema debe rechazar lo inválido sea cual sea la UI. |
| `DUX-12` | Mecanismo visual para distinguir información pública de interna en `ADM-04`. | `SC-15` lo exige. Una "vista previa como cliente" sería una funcionalidad nueva que no está en el PRD y no debe asumirse. |
| `DUX-13` | Estados de carga y de error genérico (fallo inesperado, sin conexión). | No definidos por el PRD. |
| `DUX-14` | Campos de `ADM-01`. | Dependen de la estrategia de autenticación, que decidirá el Technical Design; el diseño no debe presuponerla. |
| `DUX-15` | Dónde se muestra "código inexistente": en `PUB-04` o en una vista dedicada. | `E4` define el mensaje, no el lugar. |
| `DUX-16` | Si eliminar una nota requiere alguna confirmación ligera. | `E11` solo exige las cuatro confirmaciones; eliminar notas no tiene historial (`RIE-04`). Cualquier confirmación adicional sería una decisión nueva. |

---

## 15. Fuera de este documento

Este briefing **no** decide ni contiene: colores, tipografías, sistema visual definitivo, `DESIGN.md`, componentes productivos, código, arquitectura, tecnologías, rutas ni estructura de API. No modifica el PRD ni ningún documento aprobado.
