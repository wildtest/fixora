# Design

## Context

CHG-06 entrega la consulta pública (PUB-04 → PUB-05) y extiende la capability `public-order-tracking` creada por CHG-05. La spec define el **qué**; este documento fija el **cómo** conforme a `TECHNICAL-DESIGN.md` (§6, §12, §17, §18, §22, §23) sin reabrir decisiones cerradas. Consume sin duplicar: `ActionResult`/`runAction`/logger (CHG-01), esquema, transacciones, harness y primitiva del limitador (CHG-02), shell, alertas y patrones visuales (CHG-04) y órdenes con su código y evento inicial (CHG-05).

**Dependencia de Spec-base.** CHG-06 puede materializarse mientras CHG-05 está activo porque OpenSpec 1.15.0 se validó experimentalmente con *Modified Capability + ADDED Requirements* frente a un predecesor activo (sin `/opsx:sync`). **CHG-05 MUST be implemented, verified and archived before CHG-06 is archived/applied**, según la política de ejecución de FIXORA. No es un requisito funcional.

## Goals / Non-Goals

**Goals:** consulta sin cuenta; normalización exacta; resultado uniforme; límite de intentos con falla cerrada; proyección pública con lista positiva (`SC-11`); secreto *bearer* fuera de URL, almacenamiento, caché y registros; estado efímero.

**Non-Goals:** publicación de diagnóstico y costo (CHG-11), notas públicas (CHG-12), transiciones, cancelación y evolución del historial (CHG-10), búsqueda administrativa (CHG-09a), código perdido por autoservicio, límite de registro (E13), CSP/headers (CHG-04).

## Decisions

### D1. Flujo
```text
PUB-04 /consultar (contenedor de cliente)
  → Server Action adaptadora (cuerpo explícito: { trackingCode })
  → derivación del sujeto (abstracción de IP; HMAC en CHG-02)
  → limitador: ¿bloqueado / no disponible?
  → normalización (función pura de dominio)
  → caso de uso público de seguimiento
  → repositorio público (proyección mínima por tracking_code)
  → PublicOrderView (lista positiva)
  → estado local de UI → PUB-05 sin cambiar de URL
```
Server Action como transporte; no hay REST ni `/api/tracking`. No se pasa `FormData` indiscriminadamente: la acción recibe un único campo y lo valida como `string`.

### D2. Normalización (dominio, función pura)
Exactamente: (1) quitar solo el espacio exterior; (2) convertir `a–z` ASCII a `A–Z`; (3) validar longitud 12 y alfabeto `23456789BDFGHJKMNPRSTWX`; (4) comparar exacto. Sin quitar espacios o guiones internos, sin corregir caracteres parecidos, sin Unicode case folding, sin coincidencia parcial. Función propia de código de seguimiento; no se comparte con nombre, correo o teléfono. Reutilizable por CHG-09a.

### D3. Orden seguro del limitador
1. Obtener el sujeto (IP normalizada vía la abstracción de infraestructura; en Vercel `x-vercel-forwarded-for`; la acción es la que lee las cabeceras del framework, fuera de `runAction`).
2. Consultar el limitador (primitiva de CHG-02: `allowed | blocked | unavailable`, política recibida como parámetro: 10 fallos / 10 min / bloqueo 15 min).
3. `blocked` → `RATE_LIMITED` sin tocar la tabla de órdenes. `unavailable` → `SERVICE_UNAVAILABLE`, falla cerrada, sin consultar la orden, con evento operativo sin datos sensibles.
4. `allowed` → normalizar y buscar.
5. Mal formado o inexistente → registrar fallo y devolver `TRACKING_NOT_FOUND`. Un código mal formado puede cortocircuitar la búsqueda en BD pero **cuenta como fallo** y produce la misma respuesta pública.
6. Éxito → no cuenta. La interacción de un éxito con el reinicio del contador no se define: si la primitiva de CHG-02 ya la fija se consume; si no, es detalle de implementación y no un requisito.
Detalle transaccional exacto: lo define CHG-02; CHG-06 no rediseña persistencia.

### D4. Sujeto y IP
La IP nunca se almacena en claro; la clave es el HMAC con el secreto dedicado del limitador (CHG-02). La normalización IPv4/IPv6 y la canonicalización por prefijo siguen **diferidas** (TD §22): no se fija `/64`. Se clasifica como detalle de seguridad previo a implementar.

### D5. Resultados tipados
`ActionResult` de CHG-01 con códigos propios `TRACKING_NOT_FOUND`, `RATE_LIMITED` y `SERVICE_UNAVAILABLE` (más el transversal `INTERNAL_ERROR`). Los fallos esperados son valores, no `throw`. Mal formado e inexistente comparten `TRACKING_NOT_FOUND`: no hay códigos públicos distintos. `RATE_LIMITED` no depende de `retryAfterSeconds`: la UI solo comunica «demasiados intentos, inténtalo más tarde»; mostrar el tiempo restante, si es seguro y útil, se decide en la implementación. Copys: DESIGN §13.2 y Apéndice A.5 («Demasiados intentos», «Servicio no disponible temporalmente»), con alertas Warning distintas.

### D6. Proyección pública (lista positiva)
`PublicOrderView` según TD §17, construido propiedad por propiedad: `trackingCode`, `status`, `device { type, brand, model|null }`, `problemDescription`, `statusTimeline [ { status, occurredAt } ]`: todos los eventos públicos de estado actualmente persistidos, ordenados del más reciente al más antiguo con un desempate determinista, fechas ISO 8601 UTC. Cada evento es solo `status` y `occurredAt`: sin `from_status` (el evento inicial `NULL→SOLICITUD_RECIBIDA` se presenta como «Solicitud recibida» con su fecha), sin UUID de fila ni de orden, sin metadatos administrativos o técnicos y sin la fila de historial completa. La UI formatea `DD/MM/AAAA HH:mm` en `America/Lima`; la persistencia sigue en UTC. El repositorio público **selecciona solo esas columnas** (y los eventos de estado con su fecha) desde PostgreSQL; nunca carga una `RepairOrder` completa para recortarla. No lee `customer_*`, `version`, `id` hacia el DTO, `diagnosis`, `estimated_cost` ni notas ni historiales administrativos. Tipos y módulos separados del DTO administrativo; regla ESLint de importaciones. Los campos `repairDetails` y `publicNotes` del DTO final de TD §17 **no se incluyen** en CHG-06: CHG-11 y CHG-12 los añadirán; no hay marcadores ni consultas anticipadas.

### D7. Estado actual y Repair Journey
**Ownership.** CHG-06 owns the read-side public projection and presentation of persisted status events. CHG-10 owns lifecycle mutation and creation of subsequent status-history events. CHG-10 extends the public tracking capability rather than replacing the read model introduced by CHG-06.

El Journey es un componente de presentación puro que recibe `status` y `statusTimeline`, conoce solo el orden conceptual y las etiquetas de las etapas y cómo mostrarlas como actual, completada o pendiente, y **no acepta ni rechaza transiciones**: no es una segunda máquina de estados (la matriz, la cancelación y E11 son de CHG-10). Puede reordenar los eventos para asociar fechas a las etapas sin alterar el orden contractual del timeline. Representa cualquiera de los ocho estados válidos persistidos, incluido `CANCELADO`, sin decidir cuándo puede ocurrir. Renderiza las siete etapas según DESIGN §7 y puede recibir `CANCELADO` si llegara, sin reglas de cuándo se alcanza. Una orden registrada con CHG-05 solo tiene el evento `SOLICITUD_RECIBIDA` con su fecha, y eso ya se muestra: el recorrido presenta la etapa inicial como actual y el timeline, ese único evento. No se inventan eventos futuros. Los bloques sin diagnóstico, costo o notas usan el vacío informativo (`E6`) sin consultar nada.

### D8. Secreto *bearer*
- El código viaja en el cuerpo de la Server Action; nunca en ruta, query ni fragmento; no existe `/consultar/<código>`.
- Sin `localStorage`, `sessionStorage`, cookie, IndexedDB ni token secundario.
- Resultado dinámico, sin `use cache` ni caché compartida; se verifica el `Cache-Control` efectivo. El shell de CHG-04 sigue estático.
- Logs: se usa el logger de CHG-01 (lista positiva); nunca código, cuerpo, datos personales ni IP en claro.

### D9. Estado sensible, Activity y Back
`/consultar` es un contenedor de cliente con estados `idle → submitting → success | not-found | rate-limited | unavailable | error`. Con Cache Components, Activity puede conservar el estado oculto: el código escrito y el `PublicOrderView` no deben sobrevivir al abandono de la consulta ni depender solo del desmontaje; **el mecanismo propuesto** es reiniciar el estado cuando la ruta deja de estar activa, pero la implementación efectiva (y si basta o hace falta otro) la decide AV-1 con la versión instalada de Next. Una recarga vuelve al formulario sin repetir el POST; «Consultar otro código» reinicia. AV-1 valida el mecanismo en la versión instalada.

### D10. Desde PUB-03 y doble envío
«Consultar estado» de PUB-03 pasa el código en memoria al contenedor; no hay URL con código. Mientras hay una petición activa el botón queda deshabilitado; no es idempotencia funcional (el limitador es técnico).

### D11. Consulta y datos
Búsqueda exacta por `tracking_code` `UNIQUE` (CHG-02); sin `LIKE`, `contains`, difusa ni texto completo; sin búsqueda por nombre en lo público.

### D12. Accesibilidad y responsive
Etiqueta asociada, foco, teclado, mensajes que no dependen solo del color, objetivos de 44; una columna; Journey vertical en móvil y horizontal en escritorio con desplazamiento interno; sin scroll horizontal de página. Sin breakpoints nuevos.

## Seguridad y riesgos

- `RIE-01`: el código no elimina el riesgo por sí solo; se mitiga con entropía (~54 bits), respuesta uniforme, límite, no recuperación y código fuera de URL/logs. No se promete protección absoluta contra enumeración; un WAF sería defensa en profundidad y no reemplaza al limitador.
- Falla cerrada reduce la disponibilidad si el limitador o la BD fallan (riesgo residual aceptado del TD).
- `RIE-13`: la descripción es pública y puede contener PII escrita por el cliente; solo se advierte en el registro.
- `SC-12` pertenece al área administrativa; no lo cierra este change.

## Future extensions of `public-order-tracking`

- **CHG-10:** transiciones, cancelación, E11 y persistencia de nuevos eventos de estado; añadirá `ADDED Requirements` para que una transición persistida se refleje en la consulta pública.
- **CHG-11:** publicación de diagnóstico y costo estimado (`repairDetails`).
- **CHG-12:** notas públicas.
El diseño de CHG-06 es extensible (la proyección y la UI aceptan nuevos bloques) sin implementarlos.

## Open Questions

| ID | Pregunta | Clasificación |
|---|---|---|
| OQ-1 | Server Action de consulta, resultado dinámico/sin caché, Cache Components, Activity/Back, descarte del estado sensible, renderizado de errores y Origin/Host | PRE-IMPLEMENTATION AV-1 |
| OQ-2 | Uso real del tracking único, privilegios del rol y limitador contra PostgreSQL | PRE-IMPLEMENTATION AV-2 (cubierto por CHG-02; no se ejecuta aquí) |
| OQ-3 | Normalización de IPv6 y prefijo del sujeto del limitador | SECURITY IMPLEMENTATION DETAIL (diferido por TD §22; no fija `/64`) |
| OQ-4 | Efecto de un éxito sobre el contador si CHG-02 no lo fija; mecánica exacta de carga; `retryAfterSeconds` | IMPLEMENTATION DETAIL |
| OQ-5 | Alcance del timeline en CHG-06 frente a CHG-10 | **RESUELTA EN FASE 6.4 / CHG-06**: el timeline permanece en CHG-06 como presentación pública de lectura; CHG-10 es dueño de la mutación y evolución del historial de estados |
| OQ-6 | Transiciones/cancelación → CHG-10; diagnóstico/costo → CHG-11; notas → CHG-12; búsqueda admin → CHG-09a | DEFERRED |

## Pruebas planificadas

**Unitarias:** normalización (alfabeto, longitud exacta, mayúsculas/minúsculas ASCII, espacios exteriores sí e interiores/guiones no), mapeo puro de DTO, Journey para cada estado válido. Sin duplicar el generador de CHG-05.

**Integración (PostgreSQL real, sin mocks de Prisma):** consulta exitosa y exacta; mal formado e inexistente con la misma clasificación; proyección con lista positiva sobre una orden **deliberadamente poblada** (nombre, teléfono, correo, notas internas, diagnóstico, costo, historiales, ids, `version`) verificando que la respuesta serializada solo contiene claves permitidas; valores no publicables que no atraviesan la proyección; 10 fallos/10 min y bloqueo de 15 min; los aciertos no cuentan; limitador no disponible → falla cerrada sin consultar la orden; sin IP en claro persistida.

**Playwright (`chromium-desktop`/`chromium-mobile`):** `/consultar` carga; código con minúsculas y espacios exteriores; código incorrecto con estado uniforme; `RATE_LIMITED` y `SERVICE_UNAVAILABLE` visibles; resultado correcto sin PII; código ausente de la URL; Back no restaura el resultado; sin desbordamiento horizontal. El agotamiento masivo del limitador se cubre en integración.

**Trazabilidad:** evidencia de `SC-02`, `SC-11` (núcleo), `SC-13`, `E4`, `E15` y parcial de `E6`; `TRACEABILITY.md` se actualiza al implementar, sin cerrar requisitos de funciones futuras.
