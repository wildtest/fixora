# FIXORA — Briefing visual para Claude Design

> Fase 02 · Diseño · Parte 2 (Sistema visual) · Documento de trabajo: contexto controlado para Claude Design. **No es `DESIGN.md`** ni define valores visuales definitivos.
>
> Fecha de redacción: 2026-10-26.
>
> Este briefing se deriva exclusivamente de la documentación aprobada. **No cambia funcionalidades, pantallas, estados ni navegación.** Si contradijera a un documento superior, prevalece el superior.

## Jerarquía de fuentes

| # | Fuente | Autoridad |
|---|---|---|
| 1 | `docs/01-producto/PRD.md` | Verdad **funcional** |
| 2 | `docs/02-diseno/UX-EXPLORATION.md` | Verdad de **estructura UX, pantallas y navegación** |
| 3 | `docs/02-diseno/evidencias/stitch/` (`consolidado-desktop/`, `consolidado-mobile/`) | **Referencia visual** de la dirección aprobada; no requisito |

`STITCH-BRIEF.md` y `PROJECT-BRIEF.md` son contexto. Las referencias `§`, `SC-*`, `E*`, `SUP-*` y `RIE-*` son del PRD; `DUX-*` son de `STITCH-BRIEF.md` §14.

**Advertencia sobre las capturas.** Contienen restos de contenido fuera del PRD (`UX-EXPLORATION.md` §8 y §19.5: técnicos, inventario, garantía, SMS, estados renombrados, barra inferior móvil "Repuestos", `S/ 0.00` en órdenes canceladas, etc.). Se toman **solo** como referencia de lenguaje visual y composición, **nunca** como contenido. Ante duda de contenido, manda el PRD.

---

## 1. Personalidad visual

FIXORA debe transmitir:

- **confianza**;
- **claridad**;
- **profesionalismo**;
- **tecnología accesible**;
- **orden**;
- **transparencia**;
- **tranquilidad** (el cliente espera noticias sobre un equipo suyo; la interfaz no debe generar ansiedad).

Debe **evitar**:

- estética infantil;
- cyberpunk;
- exceso de gradientes;
- estética de criptomonedas;
- exceso de sombras;
- interfaz industrial pesada;
- apariencia de ERP antiguo;
- saturación visual.

**Eslogan del producto:** *"Tu reparación, siempre bajo control."* La personalidad debe poder leerse como la traducción visual de "bajo control".

---

## 2. Principio de diseño

> **La información importante debe poder entenderse rápidamente, sin necesidad de conocimientos técnicos.**

El sistema debe servir a dos públicos con necesidades distintas:

- **Clientes no técnicos** (probablemente en móvil, sin cuenta, consultando por iniciativa propia): necesitan saber *en qué etapa está su reparación* de un vistazo y qué hacer con su código.
- **Administrador del taller** (uno solo, en escritorio y móvil): necesita localizar una orden, entender su situación y actuar con pocos pasos y sin errores irreversibles accidentales.

Consecuencia: jerarquía clara (lo importante primero), lenguaje cotidiano en el microcopy, y densidad **contenida** también en la administración.

---

## 3. Dirección UX existente: no se rediseña

La Fase 4 **aplica** un sistema visual sobre la estructura aprobada. **No rediseña pantallas ni flujos.** Las nueve pantallas (`UX-EXPLORATION.md` §9):

**Público**

- `PUB-01` Landing
- `PUB-02` Registrar reparación
- `PUB-03` Confirmación de registro
- `PUB-04` Consultar reparación
- `PUB-05` Seguimiento

**Administración**

- `ADM-01` Login
- `ADM-02` Dashboard
- `ADM-03` Listado
- `ADM-04` Detalle

Variantes y estados (formulario inválido, código inexistente, orden cancelada o entregada, listado vacío, `E9`, `E10`, las cuatro confirmaciones de `E11`) son **estados** de estas nueve pantallas, no pantallas nuevas. La navegación aprobada es la de `UX-EXPLORATION.md` §11 (flujo público, flujo administrativo, "Cerrar sesión" retorna a `ADM-01`).

---

## 4. Dirección visual de partida

La exploración con Stitch mostró preferencia por una interfaz:

- **clara**, con fondos muy claros;
- con **acentos azules**;
- con **tarjetas limpias** y **bordes suaves**;
- con **pocos elementos decorativos**;
- con **buena diferenciación semántica de estados**.

Es un **punto de partida**, no una decisión. Los **valores definitivos** (matiz exacto de azul, neutrales, tipografía, radios, sombras) **se definen en esta fase**. **No asumir** que los colores, las tipografías ni los componentes de Stitch son definitivos; tampoco las inconsistencias que aparecen en las capturas (por ejemplo, tipografía serif en el acceso administrativo o etiquetas en monoespaciada en exceso).

---

## 5. Elementos que Claude Design debe definir

### 5.1 Identidad

- Color primario.
- Color secundario, **si corresponde** (no es obligatorio).
- Neutrales.
- Fondos.
- Superficies.
- Bordes.
- Texto (primario, secundario, deshabilitado, sobre color).

### 5.2 Colores semánticos

- Información.
- Éxito.
- Advertencia.
- Error.
- **Estados de reparación** (ver 8): un tratamiento para cada uno de los ocho estados, coherente con los semánticos y distinguible sin depender solo del color.

### 5.3 Tipografía

- Familia (o familias; justificar cada una).
- Jerarquía.
- Headings.
- Body.
- Labels.
- Captions.
- **Código de seguimiento:** debe poder leerse, copiarse y comunicarse verbalmente sin ambigüedad (`E16`); considerar la distinción entre caracteres parecidos (`O/0`, `I/1`). El formato real del código lo decide el Technical Design; los ejemplos usan datos ficticios.

### 5.4 Espaciado

- Escala consistente.

### 5.5 Bordes

- Radius (escala y criterio de uso).

### 5.6 Sombras

- **Uso limitado.** Definir cuándo se usa elevación y cuándo basta un borde.

### 5.7 Iconografía

- Estilo consistente (un solo set, un solo trazo). Los iconos acompañan al texto; no lo reemplazan en estados ni acciones críticas.

### 5.8 Componentes genéricos

- Botones.
- Inputs.
- Textarea.
- Select.
- Cards.
- Badges.
- Alerts.
- Modals.
- Navigation.
- Sidebar.
- Table / card-row.
- Empty state.
- Form errors.

### 5.9 Componentes específicos de FIXORA

- **Repair Journey**.
- **Status Badge**.
- **Tracking Code**.
- **Public / Internal section**.
- **Timeline**.
- **Order Card / Order Row**.
- **Confirmation Dialog**.

> "Select" y similares son **componentes**, no campos nuevos. El formulario de registro y el resto de las pantallas conservan exactamente los campos que aprueba el PRD (§4.1); por ejemplo, el *tipo de equipo* puede representarse con el componente que Claude Design considere más claro.

---

## 6. Responsive

El sistema debe funcionar en **desktop** y **mobile**. **No se definen breakpoints técnicos** en esta fase. Se mantiene la dirección aprobada en `UX-EXPLORATION.md` §14:

- Área pública **mobile-first**.
- Administración usable en desktop y móvil.
- Sin scroll horizontal de página como requisito normal (`SC-15`).
- Formularios a una columna cuando corresponda.
- Card-rows que se adaptan a tarjetas o filas verticales.
- Detalle administrativo que pasa de columnas a bloques verticales.
- Repair Journey con representación móvil posiblemente distinta, **manteniendo semántica y estados**.

La barra de navegación inferior de las capturas móviles ("Taller / Órdenes / Repuestos / Estado") **no se hereda**: es contenido fuera del PRD. La navegación móvil se resuelve con la navegación aprobada.

---

## 7. Accesibilidad visual

Principios (PRD `SUP-09`: la accesibilidad es un principio de diseño, **sin criterio cuantitativo en V1**):

- **Contraste suficiente** en texto, controles y bordes de campos.
- **No depender únicamente del color** para comunicar estados.
- Estados acompañados por **texto o iconografía** cuando sea necesario.
- **Focus visible** en todo elemento interactivo.
- **Targets táctiles razonables**, sobre todo en móvil.
- **Formularios legibles**: etiquetas visibles, ayudas claras, no depender del *placeholder*.
- **Errores claramente diferenciados**: mensaje junto al campo, con texto e icono, no solo borde rojo.

**No se declara cumplimiento de WCAG** ni de otra certificación: el PRD no la exige. Claude Design puede usar referencias de buena práctica como guía, sin convertirlas en requisito formal.

---

## 8. Repair Journey

El diseño debe respetar **exactamente** este recorrido:

1. Solicitud recibida
2. Equipo recibido
3. En diagnóstico
4. Esperando aprobación
5. En reparación
6. Listo para recojo
7. Entregado

**Cancelado** es una **salida terminal alternativa**, alcanzable únicamente desde Solicitud recibida, Equipo recibido, En diagnóstico y Esperando aprobación. **No** se representa como una octava etapa posterior a *Entregado*.

Claude Design define cómo se ven visualmente:

- **completado**;
- **actual**;
- **pendiente**;
- **cancelado** (incluida la marca de dónde se interrumpió el recorrido).

**No puede** renombrar, agregar, quitar ni reordenar estados, ni abreviar sus nombres (las capturas muestran abreviaturas como "Registrado", "Ingresado" o "Listo": **no válidas**). Los nombres son los del PRD. Debe funcionar en horizontal y en una representación móvil, y comunicar fechas del PRD (`DD/MM/AAAA HH:mm`, hora de Perú).

---

## 9. Privacidad y separación público/interno

El sistema visual debe reforzar, **especialmente en `ADM-04`**, la distinción entre:

- **Público — Visible al cliente**
- **Interno — Solo taller**

Reglas (`UX-EXPLORATION.md` §15; `SC-11`, innegociable):

- La distinción debe ser **clara pero profesional**.
- **No depender únicamente del color**: debe haber etiqueta textual y, si ayuda, icono y diferencia estructural (encabezado, borde, fondo, posición).
- Lo **público**: equipo, descripción, estado, Journey, timeline, diagnóstico y costo (cuando corresponda) y notas públicas.
- Lo **interno**: nombre, teléfono, email, notas internas e historial administrativo.
- Los **datos del cliente y las notas internas nunca aparecen** en pantallas públicas; el diseño no debe sugerir lo contrario.
- La separación visual **no sustituye** los controles de seguridad que se diseñarán en el Technical Design.

El **aviso de entorno demostrativo** y las advertencias de no introducir datos sensibles (PRD §4.10) deben ser visibles pero no intrusivos; Claude Design define su tratamiento visual.

---

## 10. Restricciones

**No introducir:**

- nuevas pantallas;
- nuevas acciones;
- nuevos campos;
- nuevos estados;
- nuevas métricas;
- nueva navegación;
- funcionalidades fuera del PRD.

**No decidir:**

- arquitectura;
- base de datos;
- autenticación;
- despliegue;
- lógica técnica.

**Además, el sistema visual no debe:**

- usar fotografías, ilustraciones de "taller" ni imágenes de equipos (las fotos están fuera del PRD);
- usar textos de ejemplo con técnicos, mesas, garantías, facturación, SMS/WhatsApp, IMEI, serie ni datos de contacto del taller;
- fijar nombres de componentes de frontend, librerías ni framework de UI (la implementación es posterior al Technical Design);
- presentar el costo con desglose: es un **único importe** en PEN (`S/`) con dos decimales y mayor que cero;
- mostrar costo o diagnóstico públicos antes de *Esperando aprobación* ni `S/ 0.00` en órdenes canceladas.

Los **datos de ejemplo** son siempre **ficticios**; el código `EJ-0000` es ilustrativo y no define el formato real.

---

## 11. Resultado esperado de Claude Design

El resultado debe permitir crear `DESIGN.md` con:

- **principios visuales**;
- **paleta**;
- **tipografía**;
- **tokens** (color, tipografía, espaciado, radios, sombras);
- **componentes** (5.8 y 5.9);
- **estados** (vacío, error, cerrado, deshabilitado, foco, carga, cancelado);
- **responsive**;
- **accesibilidad**;
- **ejemplos de aplicación** sobre las nueve pantallas, sin cambiar su estructura.

`DESIGN.md` aún **no se crea**; se creará a partir del resultado de esta fase.

---

## Criterios de aceptación del sistema visual

- Cada una de las nueve pantallas y sus estados puede representarse con el sistema sin añadir elementos nuevos.
- Los ocho estados son distinguibles entre sí sin depender solo del color.
- Público e interno se distinguen en `ADM-04` con texto además de estilo.
- Las cuatro confirmaciones de `E11` tienen un tratamiento visual consistente, con jerarquía clara entre la acción principal y la acción de cancelar; la confirmación de cancelación transmite irreversibilidad.
- El sistema funciona en desktop y mobile sin scroll horizontal de página.
- No aparece contenido de la sección 10 "No introducir".
