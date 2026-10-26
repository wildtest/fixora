# FIXORA — DESIGN.md (UX/UI y sistema visual)

> Fase 02 · Diseño · Parte 2 (Sistema visual) · Estado: **APROBADO**
>
> Fecha: 2026-10-26.
>
> Consume: `docs/01-producto/PRD.md` → `docs/02-diseno/UX-EXPLORATION.md` (Dirección UX Consolidada, Google Stitch) → `docs/02-diseno/referencias/claude-design/FIXORA Sistema Visual.html` (Claude Design).
>
> Consumido por: 03 Arquitectura (Technical Design + ADRs), 04 Backlog, 05 Specs.
>
> Los identificadores `SC-*`, `E*`, `SUP-*`, `VAL-*`, `RIE-*` y las referencias `§` son los del PRD. `PUB-*` y `ADM-*` son los de `STITCH-BRIEF.md` §3. `SV §NN` remite a la sección NN del artefacto «FIXORA Sistema Visual». `DUX-*` son los de `STITCH-BRIEF.md` §14.

---

## 1. Estado y propósito del documento

**Estado: APROBADO.**

Este documento es la **fuente de verdad de UX/UI de FIXORA V1**: define la experiencia (pantallas, navegación, patrones de interacción y estados visuales) y el sistema visual (color, tipografía, espaciado, bordes, sombras, iconografía y componentes). Describe **decisiones de diseño**; no reproduce el HTML del artefacto de Claude Design.

**Qué no es**

- **No sustituye al PRD.** Las reglas funcionales (estados, transiciones, visibilidad de diagnóstico y costo, edición, confirmaciones, validaciones) pertenecen al PRD. Si este documento y el PRD discrepan, **prevalece el PRD** y este documento se corrige de forma explícita.
- **No define arquitectura ni implementación.** No decide persistencia, autenticación, API, ORM, despliegue, librerías de UI, mecanismo de iconos, breakpoints técnicos ni cómo se cargan las fuentes. Esas decisiones están en la sección 17 y pasan al Technical Design.
- **No añade funcionalidad.** No crea pantallas, campos, acciones, estados ni navegación fuera de los aprobados.

**Jerarquía de autoridad**

| Orden | Fuente | Autoridad |
|---|---|---|
| 1 | `docs/01-producto/PRD.md` | Funcional. Prevalece siempre. |
| 2 | `docs/02-diseno/UX-EXPLORATION.md` | Estructura UX, pantallas y navegación aprobadas. |
| 3 | Este documento (`DESIGN.md`) | Experiencia detallada y sistema visual. |
| 4 | Artefacto «FIXORA Sistema Visual» | Insumo visual de este documento (valores y patrones). Donde este documento lo corrige o completa, prevalece este documento (secciones 10 y 14). |
| 5 | Capturas de Google Stitch | Referencia visual de composición. No son requisitos ni contenido (`UX-EXPLORATION.md` §8, §19.5). |

**Artefactos utilizados como referencia**

| Artefacto | Ruta | Uso |
|---|---|---|
| Sistema visual (Claude Design) | `docs/02-diseno/referencias/claude-design/FIXORA Sistema Visual.html` | Tokens, componentes, patrones Repair Journey, timeline, público/interno, alertas, diálogo E11, navegación, responsive, accesibilidad. |
| Capturas consolidadas de Stitch | `docs/02-diseno/referencias/stitch/consolidado-desktop/` (16), `consolidado-mobile/` (9) | Composición de las nueve pantallas. Contienen restos fuera del PRD (no heredarlos). |
| Exploración A/B/C de Stitch | `docs/02-diseno/referencias/stitch/exploracion/` | Contexto histórico. `direccion-a/PUB-03.png` y `ADM-03.png` están corruptas. |
| Briefs | `docs/02-diseno/STITCH-BRIEF.md`, `docs/02-diseno/DESIGN-BRIEF.md` | Contexto previo controlado. |

> Nota documental: `UX-EXPLORATION.md`, `STITCH-BRIEF.md` y `DESIGN-BRIEF.md` aún citan la ruta `evidencias/stitch/`; las capturas están ahora en `referencias/stitch/`. Este documento usa la ruta vigente. La actualización de esas referencias queda como acción documental pendiente (sección 19.4).

---

## 2. Principios UX/UI

Principios aprobados (UX-EXPLORATION §14, SV introducción, SUP-03, SUP-09, SC-15). No introducen alcance nuevo.

1. **Claridad antes que decoración.** La jerarquía se construye con tipografía, espacio y bordes. Sin fotos, ilustraciones ni gradientes.
2. **Calma para el cliente, eficiencia para el taller.** Un solo sistema: densidad cómoda en lo público (pasos 24/32) y contenida en lo interno (pasos 16/24).
3. **Mobile-first en el área pública.** Se diseña primero a una columna; el desktop agrega columnas, no contenido (`SUP-03`).
4. **Misma identidad, mayor densidad en administración.** La administración usa los mismos tokens y componentes; solo cambian el paso de espaciado y el patrón de navegación. Debe ser usable en escritorio y en móvil (`SC-15`).
5. **Un azul, con propósito.** El azul marca acción y progreso. Success, Warning y Error solo comunican estado o riesgo.
6. **Nunca depender solo del color.** Todo estado lleva texto con su nombre exacto, un icono de apoyo y una forma; el color es el tercer canal.
7. **Acciones principales visibles y comprensibles.** Un único botón primario por vista o bloque; las acciones usan el nombre de la transición, no términos genéricos como «Aceptar».
8. **Sin scroll horizontal de página.** Solo se admite desplazamiento interno en componentes que lo declaran (Repair Journey horizontal como respaldo).
9. **Información importante comprensible sin conocimientos técnicos** (principio del DESIGN-BRIEF; coherente con `SUP-03`).

---

## 3. Mapa definitivo de pantallas

Nueve pantallas (UX-EXPLORATION §9). Las variantes (errores, vacíos, confirmaciones, orden cerrada) **no son pantallas adicionales**: son estados de estas nueve (UX-EXPLORATION §12). Los textos entre comillas son microcopy tomado del artefacto salvo indicación; la redacción exacta final es ajustable sin cambiar el comportamiento.

### 3.1 Pantallas públicas

#### PUB-01 — Landing
- **Propósito:** presentar FIXORA y ofrecer acceso claro a *registrar reparación* y *consultar reparación*.
- **Información:** lema «Tu reparación, siempre bajo control.» (Display); descripción breve; dos accesos de igual jerarquía visual (card pública con icono, título, texto y botón); aviso de entorno demostrativo.
- **Acciones:** «Registrar reparación» (primario), «Consultar estado» (acceso a PUB-04); «Acceso Taller» discreto en la navegación.
- **Entrada/salida:** entrada directa. Salidas: PUB-02, PUB-04, ADM-01 (acceso discreto).
- **Estados:** único.
- **Responsive:** una columna en móvil; en desktop las dos cards se disponen en paralelo; margen superior de entrada de 64 en desktop.
- **PRD:** §4.1 (landing), §4.10 y `RIE-20` (aviso demostrativo).

#### PUB-02 — Registrar reparación
- **Propósito:** formulario de registro, un equipo por solicitud (§4.1, §4.3).
- **Información/campos (solo los del PRD):** nombre del cliente *, teléfono *, email (opcional), tipo de equipo * (selector, sección 6.4), marca *, modelo (opcional), descripción del problema *. Leyenda «* Campo obligatorio» al inicio. Aviso de datos personales cerca de los datos de contacto; aviso de sensibilidad junto a la descripción (sección 13). Franja de entorno demostrativo.
- **Acciones:** «Registrar reparación» (primario). Mientras existan campos obligatorios incompletos o errores de validación ya conocidos, el botón permanece **deshabilitado** y el motivo se muestra junto a él (secciones 6.1 y 13.1). Si una validación adicional solo puede determinarse al intentar registrar y falla, no se crea la orden y se muestran el resumen de errores y los mensajes junto a los campos.
- **Entrada/salida:** desde PUB-01 o desde la navegación. Salida exitosa: PUB-03.
- **Estados:** vacío; con errores por campo y resumen superior (`E3`, `SC-16`); tipo de equipo sin seleccionar con error de grupo.
- **Responsive:** una columna en móvil; en desktop pares cortos (nombre/teléfono, marca/modelo) lado a lado; ancho de lectura máximo ~720.
- **PRD:** §4.3, §4.10, `E1` (el reenvío accidental no duplica; comportamiento, no visual), `E3`, `SC-01`, `SC-16`, `RIE-13`.

#### PUB-03 — Confirmación de registro
- **Propósito:** confirmar el registro y entregar el código (§4.1, `E2`).
- **Información:** confirmación de éxito; **código de seguimiento** destacado (sección 6.9); aviso explícito de que debe conservarse y de que no hay recuperación de autoservicio (`E2`); resumen del equipo sin datos personales (tipo, marca, modelo).
- **Acciones:** «Copiar código» (secundario) con feedback «Código copiado»; «Consultar estado» (primario, lleva a PUB-05 de esa orden) y «Volver al inicio» (UX-EXPLORATION Anexo DUX-05/06).
- **Entrada/salida:** desde PUB-02. Salidas: PUB-05, PUB-01.
- **Estados:** único; el feedback de copia es transitorio.
- **Responsive:** tarjeta del código a una columna; código en 28/36 en móvil, 32/40 en desktop; botones apilados a ancho completo en móvil.
- **PRD:** §4.1, `E2`, `E17`, `SC-01`. Contacto con el taller: mensaje genérico sin datos de contacto (DUX-04; no se inventan teléfonos ni direcciones).

#### PUB-04 — Consultar reparación
- **Propósito:** ingresar el código y consultar (§4.1).
- **Información:** campo «código de seguimiento», texto de ayuda. El código tolera mayúsculas/minúsculas y espacios accidentales (`E15`; comportamiento funcional, sin elemento visual propio).
- **Acciones:** «Consultar estado» (primario).
- **Entrada/salida:** desde PUB-01, navegación o PUB-03. Salida: PUB-05.
- **Estados:** vacío; **código inexistente** (alerta Error sobre el campo: «No encontramos una reparación con ese código.»; no expone datos de ninguna orden, `E4`, `SC-13`).
- **Responsive:** una columna; ancho de lectura limitado.
- **PRD:** §4.1, `E4`, `E15`, `SC-02`, `SC-13`.

#### PUB-05 — Seguimiento público
- **Propósito:** mostrar exclusivamente la información pública de la orden (§4.6).
- **Información (en este orden de lectura):** código; estado actual (badge); tipo, marca y modelo; descripción del problema; **Repair Journey** (sección 7); **timeline público «Historial de estados»** (sección 8.1); **diagnóstico y costo estimado solo cuando son públicos** (desde *Esperando aprobación*; sección 11), con jerarquías diferenciadas respecto de las notas (`RIE-05`); **notas públicas**.
- **Acciones:** ninguna que modifique datos. Navegación de regreso.
- **Entrada/salida:** desde PUB-03 o PUB-04.
- **Estados relevantes:** en curso sin diagnóstico/costo/notas todavía (mensaje claro, sin secciones rotas, `E6`); *Esperando aprobación* con diagnóstico y costo congelados; *Entregado* (cerrada, solo lectura); *Cancelado* (`E5`: sin diagnóstico ni costo si nunca se llegó a *Esperando aprobación*; jamás `S/ 0.00`).
- **Responsive:** una columna; Journey vertical en móvil, horizontal en desktop.
- **PRD:** §4.5, §4.6, §4.7, `E5`, `E6`, `SC-02`, `SC-08`, `SC-10`, `SC-11`.

### 3.2 Pantallas administrativas

#### ADM-01 — Acceso administrativo
- **Propósito:** proteger el acceso (`SC-12`).
- **Información:** formulario de ingreso con identificación y contraseña; badge/aviso de entorno demostrativo.
- **Acciones:** iniciar sesión (primario).
- **Entrada/salida:** desde el acceso discreto de lo público, desde «Cerrar sesión» o desde una sesión expirada (`E10`). Salida: ADM-02.
- **Estados:** vacío; **credenciales inválidas** (alerta Error con mensaje **genérico**, que no indica cuál dato falló).
- **Responsive:** una columna centrada.
- **Nota:** los campos «correo y contraseña» son una **representación UX**; el mecanismo real lo decide el Technical Design (DUX-14). No hay recuperación de contraseña ni registro (PRD §5.A).
- **PRD:** §4.2, `SC-12`.

#### ADM-02 — Dashboard
- **Propósito:** vista general mínima (§4.2).
- **Información:** *status cards* con el conteo de órdenes por estado (badge con nombre exacto, número tabular, enlace «Ver en el listado» que abre ADM-03 filtrado); card «Órdenes recientes» con «Ver todas»; acceso al listado. Sin gráficos, tendencias, reportes ni métricas.
- **Acciones:** abrir ADM-03 (filtrado o completo); abrir una orden reciente.
- **Entrada/salida:** desde ADM-01 o la navegación. Salidas: ADM-03, ADM-04.
- **Estados:** sin órdenes (estado vacío con el mismo patrón de la sección 6.15).
- **Responsive:** cards en grilla de dos columnas o más en desktop; una o dos en móvil.
- **Decisión de diseño:** el artefacto prevé una card por cada uno de los ocho estados con su nombre exacto. El PRD enumera cinco estados «por ejemplo» (§4.2); mostrar los ocho es coherente con ese «por ejemplo» y no agrega métricas.
- **PRD:** §4.2, `SC-03`.

#### ADM-03 — Listado de órdenes
- **Propósito:** localizar órdenes (§4.9).
- **Información:** campo de búsqueda (código o nombre; la ayuda indica que solo permite esas dos búsquedas); filtro por estado (chips en desktop; Select en móvil); lista ordenada por fecha de registro, la más reciente primero (`E8`); cada fila/tarjeta: código, fecha, cliente, equipo, estado; **paginación** al pie del listado (sección 6.16).
- **Acciones:** buscar, filtrar, abrir detalle (fila completa clicable; «Ver detalle»), navegar entre páginas.
- **Entrada/salida:** desde ADM-02 o navegación. Salida: ADM-04.
- **Estados:** resultados; **sin resultados** (estado vacío: «No se encontraron órdenes con esa búsqueda o filtro.», `E7`).
- **Responsive:** *order rows* en desktop → *order cards* en móvil con el mismo orden de lectura (sección 6.7).
- **Estrategia para listados grandes (cerrada):** ADM-03 utiliza **paginación convencional** cuando el número de órdenes supera la cantidad que pueda presentarse razonablemente en una vista. Sin scroll infinito, sin ordenamiento por columnas y sin filtros nuevos. Resuelve la decisión visual delegada por `E8` / `RIE-19`; la cantidad por página y el mecanismo técnico pasan al Technical Design (sección 17).
- **PRD:** §4.9, `E7`, `E8`, `E15`, `SC-03`.

#### ADM-04 — Detalle administrativo
- **Propósito:** gestionar una orden (§4.2): diagnóstico, costo, notas, datos básicos, estados e historial.
- **Estructura (de arriba abajo):** cabecera (código en Geist Mono, badge de estado, fecha de registro); **Repair Journey** (sección 7) con las acciones de transición **fuera** del Journey; bloques **Público** e **Interno** (sección 9).
- **Acciones:** «Avanzar a {siguiente estado}» (primario, solo si la transición está permitida); «Cancelar orden» (destructiva en contorno, solo desde los cuatro estados que lo permiten); guardar diagnóstico y costo (mientras sean editables); «Editar datos» para corregir los datos básicos (sección 6.17); crear/editar/eliminar notas (sección 10). Cuatro transiciones piden confirmación (sección 12).
- **Entrada/salida:** desde ADM-03 (o ADM-02). Salida: ADM-03.
- **Estados:** orden en curso (editable según §4.8); diagnóstico/costo congelados (sección 11); orden cerrada (*Entregado*/*Cancelado*) en solo lectura; transición bloqueada por falta de diagnóstico/costo (`SC-07`); vista desactualizada (`E9`); sesión expirada (`E10`).
- **Responsive:** Público e Interno lado a lado en desktop, apilados en móvil con Público primero.
- **PRD:** §4.4, §4.5, §4.7, §4.8, `E9`–`E12`, `E14`, `SC-04`–`SC-12`.

---

## 4. Navegación

Solo las entradas aprobadas (UX-EXPLORATION §11, SV §16). El ítem activo usa texto Primary 600 más un indicador (subrayado de 2px en barras; fondo Primary subtle en menús/sidebar); nunca un botón relleno dentro de la barra.

### 4.1 Navegación pública — desktop
- Barra superior de 64 de alto, fondo Surface, borde inferior 1px.
- Izquierda: logotipo FIXORA (icono + marca). Centro/izquierda: **Inicio · Registrar reparación · Consultar estado**.
- Derecha: **Acceso Taller** (ver 4.3).
- Franja de entorno demostrativo bajo la barra (sección 13.8).

### 4.2 Navegación pública — móvil
- Barra de 56 de alto con logotipo y botón **«Menú»** rotulado (texto + icono; no solo icono) de 44.
- Menú desplegado a ancho completo con filas de 48: Inicio · Registrar reparación · Consultar estado · separador · Acceso Taller.
- **Sin barra de navegación inferior.** La barra inferior «Taller / Órdenes / Repuestos / Estado» de las capturas móviles de Stitch es un resto descartado (UX-EXPLORATION §8).

### 4.3 Acceso discreto al taller
- Texto «Acceso Taller» con icono de candado, separado a la derecha, en tono neutro (Text secondary); no compite con las acciones del cliente. En móvil va al final del menú, tras un separador.
- Lleva a ADM-01. Con esto se fija la forma de `DUX-01` (en UX-EXPLORATION figuraba como observada, no cerrada).

### 4.4 Navegación administrativa — desktop
- **Sidebar de 240**: logotipo y «Panel de taller»; entradas **Dashboard** y **Listado de órdenes**; al pie, el badge «Entorno demostrativo» y **Cerrar sesión**.
- ADM-04 no es una entrada del menú: se alcanza desde el listado o el dashboard.

### 4.5 Navegación administrativa — móvil
- Barra superior de 56: «FIXORA · Panel de taller» y **«Salir»** (texto + icono).
- Debajo, **dos pestañas fijas** de 44: Dashboard · Listado de órdenes (la activa con subrayado Primary).
- Sin barra inferior.

### 4.6 Cierre de sesión
- Acción **«Cerrar sesión»** (desktop) / **«Salir»** (móvil) presente en toda la navegación administrativa; retorna a ADM-01.
- Se presenta en tono **neutro, no rojo**: es salida, no destrucción.
- Una sesión expirada devuelve al acceso (`E10`; sección 13.4).

---

## 5. Sistema visual

Valores definidos por el artefacto de Claude Design (SV §01–§06, §18). Los nombres de token son nombres de diseño; **no constituyen una decisión de implementación** (cómo se materializan en CSS/Tailwind lo decide la implementación; sección 17).

### 5.1 Color

**Marca (SV §01)**

| Token | Hex | Uso |
|---|---|---|
| Primary | `#0F5FA8` | Marca y acción principal: botón primario, enlaces, etapa actual del Journey, anillo de foco. |
| Primary hover | `#0C4F8C` | Hover de botón primario y de enlaces. |
| Primary active | `#093F70` | Estado presionado; texto de botón secundario; **código de seguimiento**; texto sobre azul suave. |
| Primary subtle | `#E8F0FA` | Fondo de selección e información: nav activo, botón secundario, encabezado Público, alertas Info. |

**Neutrales (SV §01)**

| Token | Hex | Uso |
|---|---|---|
| Background | `#F6F8FB` | Fondo de página (público e interno). |
| Surface | `#FFFFFF` | Cards, inputs, modales, header y sidebar. |
| Surface secondary | `#EEF2F7` | Paneles de datos, encabezado Interno, campos de solo lectura y deshabilitados. |
| Border | `#D6DDE6` | Borde de cards y contenedores, separadores, conectores pendientes. |
| Border strong | `#7D8999` | Solo bordes de inputs y controles; borde discontinuo de lo interno/no editable. |
| Text primary | `#121A26` | Títulos, valores, texto de lectura. |
| Text secondary | `#3F4B5B` | Descripciones, etiquetas de datos, texto de apoyo. |
| Text muted | `#677385` | Fechas, metadatos, ayudas, «Opcional». **Nunca para información crítica.** |

**Semánticos (SV §01)** — sólido · suave · borde. Los sólidos se usan para texto, iconos y bordes; **los fondos de estado siempre usan la variante suave**.

| Familia | Sólido | Suave | Borde | Usos permitidos |
|---|---|---|---|---|
| Success | `#1E7A4C` | `#E6F3EC` | `#B7DCC6` | *Listo para recojo*, *Entregado*, registro completado, nota guardada. |
| Warning | `#A15C00` | `#FDF2E1` | `#F0D3A6` | *Esperando aprobación*, confirmaciones irreversibles, sesión expirada, vista desactualizada, aviso de datos sensibles. |
| Error | `#B42318` | `#FDECEA` | `#F3C1BC` | *Cancelado*, errores de campo, código inexistente, credenciales inválidas, acción destructiva. |
| Info | `#0F5FA8` | `#E8F0FA` | `#C5D7EE` | Entorno demostrativo, ayudas, mensajes neutrales. Reutiliza el azul de marca; siempre con icono de información. |

**Tonos derivados que aparecen en los componentes del artefacto**

| Tono | Hex | Uso |
|---|---|---|
| Texto de badge Info / En trabajo | `#093F70` | Badges *En diagnóstico*, *En reparación*, demo. |
| Texto de badge Warning | `#7A4600` | Badge *Esperando aprobación*; título de alertas Warning. |
| Texto de badge Success | `#14583A` | Badge *Listo para recojo*; título de alertas Success. |
| Texto de badge Error | `#8F1B12` | Badge *Cancelado*; título de alertas Error. |
| Secondary hover | `#D6E4F5` | Hover del botón secundario. |
| Destructive hover / active | `#921C13` | Hover del botón destructivo. |
| Texto deshabilitado | `#8F99A8` | Sobre Surface secondary. Se admite contraste bajo por ser texto no operable (verificar, sección 15). |
| Scrim | `rgba(18,26,38,0.48)` | Fondo de modales, sin desenfoque. |

**Reglas de uso:** texto sobre color: `#FFFFFF` sobre Primary, Primary hover/active, Success y Error sólidos. **No se usa texto con opacidad.** Los colores semánticos sólidos no se usan como fondo de grandes superficies (la única excepción es el badge sólido de *Entregado*, que marca el final).

### 5.2 Tipografía

- **Geist** para toda la interfaz (pesos 400, 500, 600, 700).
- **Geist Mono exclusivamente para el código de seguimiento** (pesos 400/500/600). No se usa en etiquetas, fechas ni metadatos.
- Cifras con `tabular-nums` en fechas, costos y conteos.
- Referencia técnica: el scaffold actual ya referencia Geist y Geist Mono (`src/app/layout.js`). La forma de cargarlas se decide en implementación (sección 17).

| Rol | Tamaño/interlínea | Peso · tracking | Móvil | Uso |
|---|---|---|---|---|
| Display | 40/48 | 600 · −0.02em | 32/40 | Lema de PUB-01. |
| H1 | 32/40 | 600 · −0.015em | 28/36 | Título de pantalla. |
| H2 | 24/32 | 600 · −0.01em | 22/28 | Título de sección. |
| H3 | 18/26 | 600 | 18/26 | Título de bloque/card. |
| Body Large | 18/28 | 400 | 18/28 | Texto introductorio. |
| Body | 16/24 | 400 | 16/24 | Texto base; base de inputs. |
| Small | 14/20 | 400 | 14/20 | Ayudas y errores. |
| Label | 14/20 | 500 | 14/20 | Etiquetas de campos (botones: 15/600). |
| Caption | 12/16 | 500 · +0.01em | 12/16 | Metadatos; **tamaño mínimo** del sistema. |

Reglas: Display, H1 y H2 se reducen un paso en móvil; Body y Small no cambian. Valores usados dentro de componentes y fuera de la escala: 13/500 (badges y etiquetas de pares dato/valor), 15/600 (botones), 22/28 (título de card pública). **Código de seguimiento:** destacado 32/40 (28/36 en móvil), Geist Mono 500, espaciado +0.08em, color Primary active; en línea 15/20 con +0.04em (sección 6.9).

### 5.3 Espaciado

Base 4, ocho pasos sin valores intermedios.

| Paso | Uso principal |
|---|---|
| 4 | Icono ↔ texto en badges. |
| 8 | Label ↔ input; entre chips; entre objetivos táctiles adyacentes. |
| 12 | Padding interno de inputs; filas compactas. |
| 16 | Padding de card administrativa; entre campos. |
| 24 | Padding de card pública; entre grupos. |
| 32 | Entre bloques de una pantalla. |
| 48 | Entre secciones de página. |
| 64 | Márgenes de página y entrada de PUB-01 en desktop. |

Densidad: lo público usa 24/32 entre bloques; lo interno 16/24. Márgenes laterales de página: 16 móvil, 24 tablet, 32–64 desktop.

### 5.4 Bordes, radios y superficies

| Token | Valor | Uso |
|---|---|---|
| xs | 4 | Badges, tags, código en línea. |
| sm | 6 | Botones, inputs, select, selector de equipo. |
| md | 8 | Cards, paneles, contenedores, alertas. |
| lg | 12 | Modales, popovers, menú móvil. |
| pill | 999 | **Exclusivo** de los chips de filtro por estado (ADM-03). Los badges no son pills. |

Reglas de superficie:

- **Card:** Surface, borde 1px Border, radio 8, sin sombra.
- **Input:** Surface, borde 1px Border strong, radio 6, alto 44.
- **Modal:** Surface, sin borde, radio 12, sombra nivel 2.
- **Panel de datos:** Surface secondary, sin borde, radio 8.
- Grosores: 1px estructural; 2px para error de campo y selección; **borde discontinuo = no editable / solo taller** (campo read-only, badge «Congelado», bloque Interno, historial administrativo).

### 5.5 Sombras

El layout se sostiene con borde, espacio y jerarquía; la sombra solo indica que algo flota.

| Nivel | Valor | Uso |
|---|---|---|
| 0 · sin elevación | none | Por defecto: cards, filas, paneles. |
| 1 · baja | `0 1px 2px rgba(18,26,38,.06)` | Header fijo al hacer scroll; tarjeta del código en PUB-03. |
| 2 · modal/popover | `0 12px 32px rgba(18,26,38,.14), 0 2px 6px rgba(18,26,38,.08)` | Diálogo E11, avisos E9/E10 si flotan, Select abierto, menú móvil. Con scrim. |

Anillo de foco: `0 0 0 2px #FFFFFF, 0 0 0 4px #0F5FA8`. Foco de input: borde Primary + halo `0 0 0 3px #C5D7EE`.

### 5.6 Iconografía

- Set de **contorno con trazo uniforme**, peso 400. **Referencia visual actual: Material Symbols Outlined** (así está en el artefacto). Esto **no es una decisión de dependencia ni de implementación**: el mecanismo (fuente de iconos, SVG, librería) y su licencia se deciden en el Technical Design (sección 17).
- Tamaños: 16 (badges), 18 (alertas, ayudas), 20 (botones, filas), 24 (cabeceras, selector de equipo).
- El icono **refuerza, nunca reemplaza** el texto. Decorativo junto a texto; los botones solo-icono llevan nombre accesible.
- Un **icono fijo por estado**, idéntico en badge, Journey, filtros y dashboard.

| Estado | Icono de referencia |
|---|---|
| *Solicitud recibida* | `inbox` |
| *Equipo recibido* | `inventory_2` |
| *En diagnóstico* | `search` |
| *Esperando aprobación* | `hourglass_top` |
| *En reparación* | `build` |
| *Listo para recojo* | `check_circle` |
| *Entregado* | `done_all` |
| *Cancelado* | `cancel` |

Otros iconos de referencia: tipos de equipo `smartphone`, `tablet`, `laptop`, `desktop_windows`, `sports_esports`, `devices_other`; público/interno `visibility` / `lock`; demo `science`; alertas `error`, `warning`, `lock_clock`, `sync_problem`; acciones `content_copy`, `check`, `arrow_forward`, `refresh`, `logout`, `close`; navegación `dashboard`, `list_alt`, `build_circle` (marca); vacío `search_off`; historial `sync_alt`, `payments`, `description`.

---

## 6. Componentes

Anatomía, variantes y estados (SV §07–§16). No se crean componentes funcionales nuevos; los que no figuran en el artefacto se marcan.

### 6.1 Buttons
- **Anatomía:** alto 40 (desktop) / 44 (móvil), radio 6, padding 0 16, texto 15/600, icono opcional de 20, separación icono–texto 8. **Un solo botón primario por vista o bloque.**
- **Variantes:**
  - *Primary* — fondo Primary, texto blanco (acción principal).
  - *Secondary* — fondo Primary subtle, texto Primary active (alternativa junto al primario).
  - *Ghost* — sin fondo, texto Primary, padding 0 12 (navegación y acciones de fila; p. ej. «Ver detalle»).
  - *Destructive contorno* — Surface, borde `#F3C1BC`, texto Error: **disparador** («Cancelar orden» en ADM-04).
  - *Destructive sólido* — fondo Error, texto blanco: **solo dentro del diálogo** de confirmación.
- **Estados:** default · hover (Primary hover / `#D6E4F5` / Primary subtle / Error suave) · focus (anillo de 2px con separación blanca, solo con teclado) · disabled (sin opacidad: Surface secondary + texto `#8F99A8`; **el motivo se explica junto al botón**, p. ej. campos obligatorios incompletos o con error conocido en «Registrar reparación», o diagnóstico/costo faltante para `SC-07`). Si una validación solo puede determinarse al intentar la acción y falla, no se ejecuta y el error se muestra según 13.1.
- **Orden en pares:** acción principal a la derecha en desktop; arriba en móvil, donde ambos ocupan ancho completo.

### 6.2 Inputs
- **Anatomía:** etiqueta visible siempre arriba (Label 14/500); campo de 44 con texto 16 y padding 12; ayuda o error debajo (Small 14). El placeholder es un ejemplo, **nunca la etiqueta**. Obligatorio: asterisco Error tras la etiqueta; opcional: «Opcional» en Text muted a la derecha. Icono interno opcional (correo, teléfono).
- **Estados:** default (borde Border strong) · hover (borde Text secondary) · focus (borde Primary + halo) · filled · **error** (borde 2px Error + icono y mensaje debajo, p. ej. «El nombre del cliente es obligatorio.»; aplica a errores ya conocidos en el formulario y a los devueltos al intentar registrar, 13.1) · **disabled/read-only** (fondo Surface secondary, borde discontinuo Border, texto Text secondary, etiqueta con candado y rótulo «Congelado» o «Solo lectura»).
- **Tipos de uso:** texto, correo, teléfono (teclado numérico en móvil), búsqueda (ADM-03), código (PUB-04), contraseña (ADM-01), costo estimado (monto > S/ 0.00 con dos decimales, `S/`; regla funcional del PRD §7.1).

### 6.3 Textarea y 6.4 Select
- **Textarea** (descripción del problema, diagnóstico, notas): mínimo 4 líneas visibles (notas: 64 de alto mínimo en el compositor), crece con el contenido, redimensión vertical, mismos estados que Input.
- **Select** (filtrar por estado en móvil): campo de 44 con icono `expand_more`; menú abierto con sombra nivel 2. Es **alternativa compacta de los chips de filtro en móvil**. Es un componente, no un campo nuevo del formulario.

### 6.5 Device type selector (selector de tipo de equipo)
- **Anatomía:** grupo de opciones, **selección única**, icono 24 + texto (Celular, Tablet, Laptop, PC, Consola, Otro; **lista cerrada del PRD §4.3**), alto 72, radio 6, separación 8.
- **Estados:** default (borde Border strong) · hover (borde Text secondary + fondo Background) · **seleccionado** (fondo Primary subtle, borde 2px Primary, texto 600 Primary active **e icono de check** en la esquina: no depende solo del color) · error de grupo (borde 2px Error en cada opción + mensaje debajo: «Debes seleccionar un tipo de equipo.»).
- **Columnas (corrige el artefacto, ver sección 14):** desktop hasta 6; tablet 3–4 según ancho disponible; móvil 2–3 según ancho disponible; **sin scroll horizontal de página**.

### 6.6 Cards
Todas comparten Surface + borde 1px + radio 8; cambian padding, densidad y encabezado.
- *Card pública:* padding 24, texto Body 16; icono en cuadro de 40, título 22/28, texto, botón.
- *Card administrativa:* padding 16, encabezado con acción (borde inferior 1px, p. ej. «Órdenes recientes» + «Ver todas»); sin cards anidadas; divisores de 1px entre filas.
- *Status card (ADM-02):* badge del estado + conteo (32/40 tabular) + «órdenes» + «Ver en el listado». Una por cada uno de los ocho estados; sin tarjetas destacadas ni etiquetas adicionales.
- *Information panel:* Surface secondary, radio 8, pares etiqueta/valor (etiqueta 13/500 Text secondary en caja normal —no mayúsculas sostenidas—, valor Body 16/500).

### 6.7 Order row (desktop) / Order card (móvil) — ADM-03
- **Order row:** contenedor único con divisores (no cards sueltas); alto mínimo 72; **fila completa clicable**; columnas: código (Geist Mono 15/500 + fecha `DD/MM/AAAA HH:mm`), cliente, equipo (tipo · marca modelo, con elipsis), badge de estado, «Ver detalle». Hover: fondo Background.
- **Order card:** padding 16, código + badge en la primera línea, luego equipo, cliente y fecha, botón «Ver detalle» (secundario, ancho completo, 44). **Mismo orden de lectura:** código, estado, equipo, cliente, fecha, acción.

### 6.8 State badges (y otros badges)
- **Status badge:** alto 26, radio 4, padding 0 10, icono 16 + texto Label 13/500, texto en el tono oscuro de su familia. **Nombre exacto del PRD**, sin abreviar, sin mayúsculas sostenidas, sin truncar (si no cabe, baja de línea).

| Estado | Familia | Fondo / borde / texto |
|---|---|---|
| *Solicitud recibida* | Neutro · ingreso | `#EEF2F7` / `#D6DDE6` / `#3F4B5B` |
| *Equipo recibido* | Neutro · ingreso | `#EEF2F7` / `#D6DDE6` / `#3F4B5B` |
| *En diagnóstico* | Info · trabajo en taller | `#E8F0FA` / `#C5D7EE` / `#093F70` |
| *Esperando aprobación* | Warning · decisión externa | `#FDF2E1` / `#F0D3A6` / `#7A4600` |
| *En reparación* | Info · trabajo en taller | `#E8F0FA` / `#C5D7EE` / `#093F70` |
| *Listo para recojo* | Success · resultado | `#E6F3EC` / `#B7DCC6` / `#14583A` |
| *Entregado* | Success · final | **sólido** `#1E7A4C` / `#1E7A4C` / `#FFFFFF` (único badge sólido de éxito: marca el final) |
| *Cancelado* | Error · salida terminal | `#FDECEA` / `#F3C1BC` / `#8F1B12` (sin número: no es una etapa) |

Dentro de una familia el estado se distingue por su nombre exacto y su icono; el color indica el tipo de momento.

- **Otros badges:** *Optional* (solo texto Text muted, sin contenedor); *Required* (asterisco + badge «Requerido» de 22 con borde Border strong en el encabezado de grupo + leyenda «* Campo obligatorio»); *Frozen* (`lock` + «Congelado», fondo Surface secondary, borde discontinuo Border strong); *Demo environment* (`science` + «Entorno demostrativo», estilo Info).

### 6.9 Tracking code display
- **Destacado (PUB-03):** tarjeta Surface con sombra nivel 1; etiqueta «Código de seguimiento»; el código dentro de un contenedor Primary subtle con borde `#C5D7EE`, radio 8, centrado; Geist Mono 500, +0.08em, color Primary active, 32/40 (28/36 móvil); **seleccionable completo con un clic**; acciones «Copiar código» (secundario, icono `content_copy`) y feedback «Código copiado» (`check` Success).
- **En línea** (listados, cabeceras, textos, diálogos): Geist Mono 15/500, +0.04em, color Primary active, sobre Primary subtle con radio 4 y padding 2/6.
- **Reglas:** nunca se trunca ni se parte en dos líneas; formas diferenciadas de `0 O · 1 I l` (recomendación al Technical Design de evitar caracteres ambiguos); el monoespaciado no se usa para otra cosa. `EJ-0000` es solo un ejemplo ilustrativo (sección 16).

### 6.10 Filter chips (ADM-03)
- Forma pill (999), exclusivos para el filtro por estado; un chip por estado (nombre exacto) más «Todos los estados». En móvil se sustituyen por el Select (6.4).
- El artefacto fija la forma (pill) y su uso. Para alto, hover y seleccionado se heredan los tokens existentes: seleccionado = Primary subtle + borde 2px Primary + check (no solo color); objetivo táctil ≥ 44 en móvil. El ajuste fino de la anatomía puede refinarse en implementación sin cambiar comportamiento ni estructura UX.

### 6.11 Alertas
- **Anatomía:** fondo suave + borde 1px del semántico + icono 20 + título 15/600 + texto 14; radio 8, padding 12/16; **sin bordes laterales gruesos**. Se ubican junto a lo que afectan.
- **Variantes:** Info, Warning, Error, Success (usos y copys en la sección 13). Los errores y avisos permanecen hasta resolverse; las confirmaciones de éxito breves se muestran en línea y no requieren cierre.
- **Franja demostrativa (Info):** fila de ancho completo bajo el header, fondo Primary subtle, texto 14 (13 en la variante de navegación), centrada.

### 6.12 Modal / confirmation dialog
- Surface, radio 12, sombra nivel 2, ancho máximo 560, scrim `rgba(18,26,38,.48)`. Estructura: *chip de transición* (de → a) · título como pregunta (20/28) · texto · alerta de consecuencia · pie con «Volver» (secundario, izquierda) y la acción (derecha).
- **Jerarquía:** la acción usa el **nombre exacto de la transición** («Avanzar a …»), nunca «Aceptar»; el retorno siempre es «Volver» para no confundirlo con «Cancelar orden».
- **Foco inicial:** en «Volver» para irreversibles y destructivas; en la acción para la normal. **Escape equivale a Volver.**
- **Móvil:** hoja inferior a ancho completo, botones apilados de 44, acción arriba.
- Contenido y variantes: sección 12.

### 6.13 Navigation
Ver sección 4. Componentes: barra pública (64/56), menú móvil, sidebar administrativa (240), barra administrativa móvil con dos pestañas.

### 6.14 Estados vacíos, de error, deshabilitados y de solo lectura
- **Vacío (ADM-03 sin resultados):** card con padding 40/24, icono en cuadro de 48 (`search_off`), mensaje 18/26 «No se encontraron órdenes con esa búsqueda o filtro.», ayuda «Verifica los términos o elige otro estado.» y botón secundario «Limpiar búsqueda y filtros» (restablece búsqueda y filtro; no es una función nueva).
- **Vacío informativo (PUB-05, `E6`):** donde no hay diagnóstico, costo o notas públicas aún, el bloque se representa con un mensaje claro de que todavía no hay información disponible, sin sección rota.
- **Error:** campo (6.2), alertas (6.11), código inexistente (13.2).
- **Deshabilitado:** sin opacidad; Surface secondary + texto `#8F99A8`; motivo junto al control.
- **Solo lectura / congelado:** campo con borde discontinuo, fondo Surface secondary, candado y rótulo (sección 11).

### 6.15 Componentes adicionales del artefacto
- **Repair Journey** (sección 7), **Timeline** (sección 8), **Contenedores Público/Interno** (sección 9), **Note composer / Note item** (sección 10).

### 6.16 Paginación (ADM-03)
- **Ubicación:** al pie del listado, bajo las *order rows* / *order cards*.
- **Contenido:** controles «Anterior» y «Siguiente» (botones secundarios/ghost con texto e icono; se deshabilitan sin motivo adicional en la primera y última página) e indicador de la **página actual** (p. ej. «Página 2 de 5»); pueden mostrarse números de página cuando el ancho lo permite.
- **Reglas:** paginación convencional; **sin scroll infinito**, **sin ordenamiento por columnas**, **sin filtros nuevos**. La búsqueda y el filtro por estado siguen aplicándose a todo el conjunto; el orden sigue siendo fecha de registro, más reciente primero (`E8`).
- **Visibilidad:** solo aparece cuando el número de órdenes supera lo que puede presentarse razonablemente en una vista.
- **Móvil:** controles a ancho completo o apilados (≥ 44 de alto, 8 de separación), sin números de página si no caben; **sin scroll horizontal**.
- **Diferido al Technical Design:** cantidad exacta por página, mecanismo de consulta, implementación técnica y estrategia de base de datos.

### 6.17 Edición de datos básicos (ADM-04)
- Los datos básicos se muestran **normalmente en modo lectura** (*information panel*). Una acción textual/secundaria **«Editar datos»** activa la edición **dentro del mismo bloque**: datos del equipo y descripción en el bloque Público; nombre, teléfono y email en el bloque Interno. Cada bloque mantiene su lugar; no se altera la separación Público/Interno.
- En edición se usan los **Inputs, Textarea, Select y Device Type Selector** ya definidos (6.2–6.5), y aparecen **«Guardar cambios»** (primario) y **«Cancelar edición»** (secundario). No se crea pantalla ni modal, y no hay confirmación adicional.
- **Reglas:** disponible solo mientras la orden no sea final (PRD §4.8); en *Entregado* y *Cancelado* no aparece «Editar datos». El **código de seguimiento nunca es editable** (`E17`). Las validaciones son las mismas del registro público (`E3`): sin campos obligatorios vacíos ni datos que el formulario público rechazaría, con los mismos patrones de error (13.1). No hay historial de correcciones (fuera de V1).

---

## 7. Patrón Repair Journey

Un solo componente para PUB-05 y ADM-04 (SV §11; UX-EXPLORATION §10; PRD §4.4).

### 7.1 Estructura
Siete etapas numeradas, con el **nombre exacto del PRD**, sin abreviar ni truncar (en desktop pueden ocupar dos líneas):

1. Solicitud recibida · 2. Equipo recibido · 3. En diagnóstico · 4. Esperando aprobación · 5. En reparación · 6. Listo para recojo · 7. Entregado.

El encabezado del componente indica «Etapa N de 7 · {nombre}» (o «Cancelado desde «{etapa}»» en órdenes canceladas).

### 7.2 Estados de una etapa

| Estado | Marcador | Conector | Texto |
|---|---|---|---|
| **Completado** | Círculo Primary con check | Sólido Primary | Nombre 500 + fecha `DD/MM/AAAA HH:mm` + «Completado» |
| **Actual** | Anillo Primary 2px con halo Primary subtle e icono del estado | Hacia adelante: discontinuo | Nombre 600 + fecha + «Estado actual» |
| **Pendiente** | Número en anillo Border (gris) | Discontinuo Border | Nombre en Text muted + «—» + «Pendiente» |
| **Final** (*Entregado* alcanzado) | Círculo Success sólido con `done_all` y halo Success suave | — | Nombre 600 + fecha + «Estado final» |
| **Cancelado en esta etapa** | La etapa interrumpida conserva su marcador de «alcanzada» y de ella sale la rama de salida (7.3) | — | Nombre 600 + fecha + «Cancelado en esta etapa» |
| **No alcanzado** | Número en círculo Surface secondary, gris | — | Nombre en Text muted + «—» + «No alcanzado» |

El estado se lee por **tres vías**: forma del marcador (check, anillo, número), texto de estado y peso del nombre; el color es la cuarta señal.

### 7.3 Cancelado: salida terminal, nunca una octava etapa
- *Cancelado* **no lleva número** y **no se dibuja tras *Entregado***.
- En una orden cancelada, el Journey muestra las etapas anteriores como completadas, la etapa donde se interrumpió como «Cancelado en esta etapa» y **de ella parte una rama hacia abajo** con una línea Error y el badge *Cancelado* con su fecha. Las **etapas siguientes** pasan a «No alcanzado». Un aviso Error bajo el componente dice «Orden cancelada durante «{etapa}»» y «La orden está cerrada. Las etapas siguientes no se realizaron.»
- Solo puede originarse en las cuatro etapas permitidas por el PRD: *Solicitud recibida*, *Equipo recibido*, *En diagnóstico*, *Esperando aprobación* (`SC-05`). Desde *En reparación* en adelante no existe rama.
- **En órdenes no canceladas no se dibuja la rama Cancelado en la vista pública.**

### 7.4 Fecha y hora
`DD/MM/AAAA HH:mm`, 24 horas, **hora de Perú** (PRD §7.1), en las etapas alcanzadas. Las no alcanzadas y las pendientes muestran «—». Cifras tabulares.

### 7.5 Orientación
- **Desktop: horizontal**, siete columnas (mínimo 96 por columna; ancho mínimo del componente 720) con conectores horizontales de 2px. Si el contenedor es más estrecho, el componente puede desplazarse **internamente**; nunca provoca scroll horizontal de página.
- **Móvil: vertical**, riel a la izquierda con marcadores de 28, nombre y «{estado} · {fecha}» a la derecha; mismos nombres, fechas y estados.

### 7.6 Uso en PUB-05 y ADM-04
- **PUB-05:** muestra el estado actual y su historia; sin acciones.
- **ADM-04:** es el mismo componente; las acciones «Avanzar a …» y «Cancelar orden» se colocan **fuera del Journey**, junto a él.
- El Journey representa **estado, no una promesa temporal** (PRD §5.B: sin SLA ni fechas prometidas): no muestra estimaciones de entrega.

---

## 8. Timeline

Misma estructura base: riel vertical, marcador, fecha y contenido, **más reciente primero**. Se diferencian por contenido y por contexto (SV §12; PRD §4.7; `SC-10`).

### 8.1 Timeline público («Historial de estados», PUB-05)
- **Solo cambios de estado**, con la fecha y hora de cada uno (`DD/MM/AAAA HH:mm`, hora de Perú).
- Más reciente primero. Marcador **circular**: el más reciente destacado (anillo Primary), los anteriores como punto sólido.
- *Cancelado* usa marcador con aspa en Error y el nombre «Cancelado»; **sin motivo estructurado** (`RIE-09`).
- **No** muestra versiones anteriores de diagnóstico ni de costo, notas ni autor.

### 8.2 Historial administrativo (ADM-04, bloque Interno)
- Contenedor con **borde discontinuo** y rótulo «Solo taller» con candado.
- Marcador **cuadrado** con icono por tipo de cambio: **Estado** (`sync_alt`), **Diagnóstico** (`description`), **Costo estimado** (`payments`).
- Cada entrada: tipo de cambio en negrita + fecha y hora; contenido:
  - Estado: «{estado anterior} → **{estado nuevo}**».
  - Costo estimado: «{valor anterior} → **{valor nuevo}**» (p. ej. `S/ 150.00 → S/ 180.00`); en el primer registro, solo el valor registrado.
  - Diagnóstico: el texto registrado; cuando es una modificación, el valor anterior y el nuevo (el artefacto muestra únicamente el texto vigente de cada registro; el par anterior/nuevo del diagnóstico queda como regla de presentación de este documento, sin añadir información que el PRD no registre).
- **Sin autor** («el PRD no lo registra»; `RIE-15`). **Sin notas** y **sin correcciones de datos básicos** (PRD §4.7: no forman parte del historial).

---

## 9. Público vs Interno

En ADM-04 la diferencia se marca por **cinco vías a la vez** (SV §13; UX-EXPLORATION §15; `SC-11`): etiqueta textual, icono, encabezado, tipo de borde y posición (Público primero: izquierda en desktop, arriba en móvil). Cada compositor de notas repite a quién llega el texto.

| | **Público — Visible al cliente** | **Interno — Solo taller** |
|---|---|---|
| Encabezado | Fondo Primary subtle, borde inferior `#C5D7EE` | Fondo Surface secondary, borde inferior discontinuo |
| Borde del contenedor | Sólido 1px `#C5D7EE` | **Discontinuo** 1px Border strong |
| Icono | `visibility` | `lock` |
| Título / subtítulo | «Público — Visible al cliente» · «Lo que el cliente puede ver con su código» | «Interno — Solo taller» · «Nunca se muestra al cliente» |
| Compositor de notas | «Lo verá el cliente» + «Publicar nota» (primario) | «Solo la verá el taller» + «Guardar nota interna» (secundario) |

> **Precisión respecto del artefacto.** El artefacto describe el bloque Público como «todo lo de este bloque aparece en el seguimiento con el código». Eso es exacto solo desde *Esperando aprobación*; antes, diagnóstico y costo son información de trabajo **no visible al cliente** (PRD §4.5, `SC-08`). Por eso el subtítulo se redacta «Lo que el cliente puede ver con su código» y, mientras la orden no haya alcanzado *Esperando aprobación*, los campos de diagnóstico y costo llevan el rótulo textual **«Aún no visible para el cliente»** (con icono y texto). Ver sección 11.

**Contenido del bloque Público:** tipo de equipo, marca y modelo (*information panel*); descripción del problema; diagnóstico y costo estimado (con el rótulo anterior hasta *Esperando aprobación*, y «Congelado» desde entonces); **notas públicas** (compositor y *Note items*).
**Contenido del bloque Interno:** contacto del cliente (nombre, teléfono, email) en *information panel*; **notas internas** (compositor y *Note items*); **historial administrativo** (sección 8.2).

**Relación con las vistas públicas:** el cliente (PUB-05) ve únicamente lo del bloque Público que el PRD autoriza (§4.6). Nombre, teléfono, email, notas internas e historial administrativo **nunca** aparecen en PUB-05 (`SC-11`, innegociable). `SC-12` (capacidades administrativas solo con sesión válida) no se modifica.

> **La separación visual no sustituye los controles de seguridad que debe definir el Technical Design.**

---

## 10. Notas públicas e internas

Las notas (PRD §4.7, `E12`) se componen de dos piezas: el **compositor** para crear y el **Note item** para las existentes. El artefacto incluye el compositor; **este documento completa el Note item** sin cambiar funcionalidad (ya está definido en el PRD: agregar, editar y eliminar mientras la orden no sea final; solo lectura en final).

### 10.1 Note composer (crear)
- Textarea con etiqueta visible (p. ej. «Notas públicas» / «Notas internas»), mínimo 64 de alto.
- Pie con indicador de destino y botón: público «Lo verá el cliente» + **«Publicar nota»** (primario); interno «Solo la verá el taller» + **«Guardar nota interna»** (secundario).
- Escribir una nota **nunca** es requisito de una transición. Para *Cancelado*, la nota previa es opcional y debe escribirse antes de confirmar (`E14`, diálogo #3).

### 10.2 Note item (nota existente)
- **Anatomía:** panel con el contenido de la nota (Body 16, el texto se muestra como texto, nunca como contenido interpretable, `E3`), la **fecha** (Caption/13 tabular, `DD/MM/AAAA HH:mm`) y el tipo.
- **Orden no terminal (todas las órdenes hasta *Listo para recojo*):** mostrar contenido y fecha; **Editar** (acción de fila, ghost con icono y texto) y **Eliminar** (acción de fila, ghost con icono y texto; sin color de alerta salvo en hover/foco). Editar reutiliza el patrón del compositor sobre el propio ítem. Eliminar no pide confirmación adicional (10.4).
- **Orden terminal (*Entregado* o *Cancelado*):** la nota se muestra en **modo solo lectura**: contenido y fecha, **sin** acciones de edición ni eliminación, con el rótulo «Solo lectura» y candado (patrón de la sección 11).
- **Sin historial de notas** (`RIE-04`): no hay versiones, ni «editada», ni registro de eliminaciones.

### 10.3 Diferenciación pública / interna
| | Nota pública | Nota interna |
|---|---|---|
| Visibilidad | Visible al cliente en PUB-05 | Solo taller |
| Contenedor del ítem | Dentro del bloque Público (borde sólido, encabezado Info) | Dentro del bloque Interno (borde discontinuo) |
| Indicador en el ítem | `visibility` + «Visible al cliente» | `lock` + «Solo taller» |
| Fondo del ítem | Surface secondary (panel de datos) | Surface secondary (panel de datos) |

La diferencia nunca depende solo del color ni solo de la posición: lleva texto e icono en el propio ítem.

### 10.4 Eliminación y orden de las notas (decisiones cerradas)
- **Eliminar:** «Eliminar» ejecuta la acción sobre la nota **sin abrir un diálogo E11 adicional** (el PRD solo exige las cuatro confirmaciones de `E11`). La implementación debe proporcionar feedback posterior de éxito o error mediante los patrones de la sección 13. No hay *undo*, papelera, historial ni recuperación (`RIE-04`). Esto cierra `DUX-16`.
- **Orden:** las notas públicas e internas se muestran **de la más reciente a la más antigua** dentro de sus respectivos bloques. Es solo una regla de presentación: no modifica el historial ni introduce versiones de notas.

---

## 11. Estados congelados y terminales

Reglas funcionales: PRD §4.5 (ciclo de vida) y §4.8 (edición). Este apartado solo define cómo **se ven**; no determina la lógica que las hace cumplir.

### 11.1 Matriz visual (ADM-04)

| Elemento | Antes de *Esperando aprobación* (*Solicitud recibida*, *Equipo recibido*, *En diagnóstico*) | *Esperando aprobación*, *En reparación*, *Listo para recojo* | *Entregado* / *Cancelado* |
|---|---|---|---|
| Diagnóstico | Editable. Rótulo «Aún no visible para el cliente». | **Congelado**: campo read-only con candado y «Congelado». Visible al cliente. | Read-only completo. Visible al cliente solo si llegó a *Esperando aprobación*; si no, rótulo «Nunca se publicó al cliente». |
| Costo estimado | Editable (monto > S/ 0.00). Mismo rótulo. | **Congelado**, igual que el diagnóstico. | Read-only completo (misma regla de visibilidad). |
| Datos del cliente y del equipo, descripción | Editables | Editables | Read-only |
| Notas públicas e internas | Compositor + Note items con Editar/Eliminar | Compositor + Note items con Editar/Eliminar | Note items en solo lectura; sin compositor |
| Acciones de transición | Según la matriz del PRD | Según la matriz del PRD | **Ninguna** |

### 11.2 Patrón visual
- **Congelado** (diagnóstico y costo desde *Esperando aprobación*): campo con borde **discontinuo** Border, fondo Surface secondary, texto Text secondary, etiqueta con `lock` y rótulo «Congelado»; badge de apoyo «Congelado» (6.8).
- **Solo lectura** (estados finales): el mismo tratamiento de campo (borde discontinuo, Surface secondary, `lock`), con el rótulo **«Solo lectura»**. *Extensión del patrón existente*: el artefacto define «Congelado» para diagnóstico/costo; usar «Solo lectura» para el resto de elementos cerrados es una consolidación de este documento.
- En estados finales **no se muestran** los botones «Avanzar a …», «Cancelar orden», «Publicar nota», «Guardar nota interna» ni las acciones Editar/Eliminar; el estado queda comunicado por el badge, el Journey («Estado final» / rama Cancelado) y el rótulo de solo lectura.
- Sin `S/ 0.00` en ningún caso (el costo es siempre > 0 cuando existe).

### 11.3 Vista pública
PUB-05 muestra diagnóstico y costo congelados desde *Esperando aprobación* con el patrón de card pública, con jerarquía distinta de las notas públicas (`RIE-05`): el costo estimado se destaca (24/32, 600, color Primary active, `S/` + dos decimales); el diagnóstico es texto de lectura; las notas públicas van en su propia sección.

---

## 12. Diálogos E11

Un solo patrón para las **cuatro** confirmaciones obligatorias (PRD §7.3, `E11`; componente en 6.12). Las demás transiciones **no** piden confirmación (para evitar fricción repetitiva). El copy refleja lo que el PRD exige advertir; la redacción final puede ajustarse sin alterar esas consecuencias.

| # | Transición | Variante | Título | Consecuencia (alerta) | Acción |
|---|---|---|---|---|---|
| 1 | *En diagnóstico* → *Esperando aprobación* | Normal (foco inicial en la acción) | «¿Publicar diagnóstico y costo estimado?» | «Revisa los datos. Al confirmar quedarán congelados y disponibles para el cliente.» Resumen de diagnóstico y costo. Alerta Info: «Después no podrán modificarse.» | «Avanzar a Esperando aprobación» |
| 2 | *Esperando aprobación* → *En reparación* | Warning irreversible | «¿El cliente aprobó la reparación?» | «Confirma solo si el cliente aprobó fuera de FIXORA.» Alerta Warning: **«No se puede deshacer.** Desde este momento la reparación ya no podrá cancelarse.» | «Avanzar a En reparación» |
| 3 | Cualquier transición permitida → *Cancelado* (desde *Solicitud recibida*, *Equipo recibido*, *En diagnóstico* o *Esperando aprobación*) | Destructiva | «¿Cancelar la orden {código}?» | Alerta Error: **«Acción irreversible.** La orden quedará cerrada y no podrá reabrirse. Datos y notas pasarán a solo lectura.» Texto: «Si quieres dejar una explicación pública o interna, regístrala antes de confirmar.» (el motivo es opcional, `E14`) | «Cancelar orden» (destructivo sólido) |
| 4 | *Listo para recojo* → *Entregado* | Warning irreversible | «¿Marcar como entregado?» | Alerta Warning: «La orden quedará cerrada y no podrá modificarse.» | «Avanzar a Entregado» |

Reglas comunes: chip de transición (de → a) arriba; botón «Volver» a la izquierda y la acción a la derecha; foco inicial en «Volver» para #2, #3 y #4; Escape equivale a Volver; en móvil, hoja inferior con botones apilados de 44 y la acción arriba. El diálogo #3 usa el chip en tono Error. Para la #4 el artefacto define la variante y el aviso, no la redacción de su título; «¿Marcar como entregado?» es la redacción de Diseño para ese título.

---

## 13. Feedback y estados excepcionales

Componente base: Alertas (6.11). Ubicación junto a lo que afectan. Los errores y avisos permanecen hasta resolverse; las acciones no ejecutadas lo dicen explícitamente.

### 13.1 Errores de validación (`E3`, `SC-16`)
- **Por campo:** borde 2px Error, icono `error` y mensaje debajo que dice cuál es el problema (p. ej. «El nombre del cliente es obligatorio.»); error de grupo en el selector de equipo (6.5).
- **Resumen** arriba del formulario (Error): «Hay campos por corregir» · «Revisa los campos marcados antes de registrar la reparación.»
- **Regla unificada (PUB-02):** mientras existan campos obligatorios incompletos o errores de validación ya conocidos en el formulario, el botón «Registrar reparación» permanece **deshabilitado** y se muestra junto a él el motivo. Si una validación adicional solo puede determinarse al intentar registrar la solicitud y falla, **no se crea la orden** y se muestran el resumen de errores y los mensajes correspondientes junto a los campos.
- En ambos casos: errores por campo, resumen superior cuando corresponda y ninguna orden creada si hay errores. El mismo criterio de validación y los mismos patrones se aplican cuando el administrador corrige datos de una orden no final (`E3`; 6.17).

### 13.2 Código inexistente (`E4`, `SC-13`)
- Alerta Error **sobre el campo** en PUB-04: «No encontramos una reparación con ese código.» · «Verifica el código e inténtalo nuevamente.» No expone ni sugiere datos de ninguna orden.

### 13.3 Credenciales inválidas (ADM-01, `SC-12`)
- Alerta Error con **mensaje genérico** (no indica si falló la identificación o la contraseña). La redacción exacta es editorial y puede afinarse sin cambiar el comportamiento.

### 13.4 Sesión expirada (`E10`)
- Alerta Warning (`lock_clock`): «Tu sesión expiró» · «La acción no se ejecutó. Inicia sesión nuevamente para continuar.» con botón primario «Ir al inicio de sesión» (lleva a ADM-01). La orden no queda en un estado parcial.

### 13.5 Vista o estado desactualizado (`E9`)
- Alerta Warning (`sync_problem`): «La orden cambió desde que abriste esta pantalla» · «La acción no se ejecutó. Actualiza para ver la información vigente.» con botón «Actualizar orden» (recarga la información; no es una función nueva).

### 13.6 Éxito de acciones
- Alerta Success breve **en línea** (p. ej. «Nota pública publicada» · «Ya es visible en el seguimiento del cliente.»; «Código copiado» en PUB-03); no requiere cierre.

### 13.7 Advertencia de datos sensibles (PRD §4.10, `RIE-13`)
- Alerta **Warning** (`warning`) **junto al campo «Descripción del problema»** en PUB-02, con la redacción de Diseño:
  - **Título:** «La descripción podrá mostrarse en la consulta pública»
  - **Texto:** «No incluyas contraseñas, PIN, patrones o códigos de desbloqueo, credenciales, información financiera ni otros datos sensibles.»
  
  Conceptos que no pueden eliminarse: contraseñas, PIN, patrones o códigos de desbloqueo, credenciales, información financiera y otros datos sensibles (PRD §4.10). Solo se admite ajuste de puntuación.
- Aviso de datos personales (cerca de los datos de contacto): texto breve que explica que se solicitan para gestionar la reparación y permitir al taller identificar y contactar al cliente. Solo texto: sin casilla de aceptación ni almacenamiento de consentimiento.

### 13.8 Entorno demostrativo (PRD §4.10, `RIE-20`)
- **Público:** franja Info de ancho completo bajo el header: «Entorno de demostración. No ingreses datos personales reales ni información sensible.» Breve y no intrusiva.
- **Administrativo:** badge «Entorno demostrativo» al pie de la sidebar (y su equivalente en la barra móvil). Complementa, sin reemplazar, el aviso de la descripción.

### 13.9 No cubierto
- **Carga y error genérico (`DUX-13`)** no fueron explorados por los artefactos; no se inventa comportamiento aquí. No afecta la estructura aprobada de las nueve pantallas (sección 17.2).

---

## 14. Responsive

Reglas consolidadas (UX-EXPLORATION §14, SV §17). **No se fijan breakpoints** (sección 17).

- **Público mobile-first**; el desktop agrega columnas, no contenido.
- **Administración** usable en escritorio y móvil: sidebar en desktop; barra superior con dos pestañas en móvil.
- **Sin scroll horizontal de página.** Solo desplazamiento interno en componentes que lo declaran.
- **Formularios:** una columna en móvil; en desktop, pares cortos (nombre/teléfono, marca/modelo) pueden ir lado a lado. Ancho de lectura máximo ~720 en formularios públicos.
- **Order rows → order cards** con el mismo orden de lectura (código, estado, equipo, cliente, fecha, acción).
- **Paginación (ADM-03):** al pie del listado en ambos formatos; en móvil se adapta (controles a ancho completo o apilados, sin números si no caben) sin scroll horizontal (6.16).
- **Edición de datos básicos (ADM-04):** en móvil los campos en edición pasan a una columna; las acciones «Guardar cambios» y «Cancelar edición» se apilan a ancho completo (acción principal arriba).
- **ADM-04:** Público e Interno lado a lado en desktop; apilados en móvil, Público primero.
- **Repair Journey:** horizontal en desktop, vertical en móvil, mismos nombres, fechas y estados.
- **Diálogo E11:** hoja inferior a ancho completo en móvil.
- **Tipografía:** Display, H1 y H2 bajan un paso en móvil.
- **Márgenes:** 16 móvil, 24 tablet, 32–64 desktop.
- **Alturas:** barra pública 64 (desktop) / 56 (móvil); botones 40 / 44.

> **Corrección de precisión respecto del artefacto — selector de tipo de equipo.** El artefacto indica «6 columnas en desktop, 3 en móvil». **No se fija «3 columnas en móvil».** Se define:
> - **Desktop:** hasta 6 columnas.
> - **Tablet:** 3–4 según el ancho disponible.
> - **Móvil:** 2–3 según el ancho disponible.
> - **Jamás** provoca scroll horizontal de página.
>
> Esta corrección prevalece sobre el artefacto.

---

## 15. Accesibilidad

Principios de diseño (`SUP-09`). **Este documento no declara cumplimiento de WCAG ni de otra certificación.**

- **Contraste:** los pares texto/fondo de la paleta se eligieron con una relación aproximada de 4.5:1 o más como **guía**; los bordes de campo, alrededor de 3:1. **Pendiente de verificar durante la implementación.** El texto deshabilitado (`#8F99A8` sobre `#EEF2F7`) y el uso de Text muted merecen verificación específica.
- **Focus visible:** anillo Primary de 2px con separación blanca en todo elemento interactivo; nunca se elimina el foco sin reemplazo.
- **Labels persistentes:** siempre visibles sobre el campo; el placeholder solo ejemplifica; obligatorio con asterisco y leyenda.
- **Estados no dependientes solo del color:** nombre exacto + icono + forma; el color es un canal más.
- **Iconos accesibles:** decorativos junto a texto; los botones solo-icono llevan nombre accesible (en la práctica, los controles de navegación usan texto + icono).
- **Feedback junto al campo:** errores con icono y texto, más resumen arriba del formulario; las acciones no ejecutadas lo dicen explícitamente.
- **Controles táctiles mínimos:** 44 de alto mínimo en móvil y 8 entre objetivos adyacentes.
- **Movimiento reducido:** transiciones de 150–200 ms solo en color y opacidad; se respetan las preferencias de movimiento reducido.

---

## 16. Datos de ejemplo y demo

- **Todos los datos** usados en este documento, en el artefacto y en los mockups son **ficticios** (nombres, teléfonos, correos, equipos, importes, fechas).
- **`EJ-0000` es únicamente un ejemplo visual.** No define prefijo, longitud, alfabeto ni formato. El **formato real del código de seguimiento lo definirá el Technical Design**, respetando `E16` (legible, copiable, comunicable verbalmente, difícil de adivinar) y `E17` (único e inmutable).
- El **entorno público de demostración debe advertir** que no se ingresen datos personales reales ni información sensible (PRD §4.10, `RIE-20`; sección 13.8). Este aviso no impide técnicamente que alguien lo haga; `VAL-04` sigue pendiente para cualquier uso real.
- No usar en ejemplos: técnicos, mesas, garantía, SMS, IMEI/serial, DNI, datos de contacto del taller, desglose de costo ni `S/ 0.00`.

---

## 17. Decisiones diferidas

Este documento **deliberadamente no resuelve** lo siguiente. Ninguna recomendación visual de este documento debe leerse como decisión de arquitectura.

### 17.1 Pasan al Technical Design
| Tema | Nota |
|---|---|
| Formato, alfabeto, longitud y entropía del código de seguimiento | `E16`, `E17`, `RIE-01`. Se recomienda evitar caracteres ambiguos (`0 O 1 I l`). |
| Implementación de iconos | Material Symbols Outlined es solo referencia visual (fuente de iconos, SVG, librería, licencia). |
| Detalles técnicos de responsive y breakpoints | Valores, mecanismo y utilidades. |
| Mecanismo técnico de seguridad público/interno | Filtrado de respuestas públicas, autorización, servidor como fuente de verdad (`SC-11`, `SC-12`). |
| Persistencia | Almacenamiento de órdenes, notas e historial. |
| Autenticación y sesión | Qué campos usa realmente ADM-01, duración, expiración (`DUX-14`, `E10`). |
| Arquitectura, API y despliegue en Vercel | Rutas, contratos, hosting, ambientes. |
| Almacenamiento de fechas y zona horaria | La presentación en hora de Perú está fijada; el almacenamiento, no. |
| Implementación de accesibilidad | Verificación de contraste, foco, lectores de pantalla, movimiento reducido. |
| Carga de fuentes | Cómo se cargan Geist y Geist Mono. |
| Implementación de tokens | Cómo se materializan los tokens (CSS, Tailwind, otros). |
| Idempotencia, concurrencia, protección frente a abuso | `E1`, `E4`, `E9`, `E13`. |

Se suman a la tabla anterior, también para el Technical Design: **cantidad exacta de órdenes por página, mecanismo de consulta y estrategia de base de datos de la paginación de ADM-03** (la decisión visual está cerrada en 6.16).

### 17.2 Pendiente sin bloquear la aprobación del diseño
- **Carga y error genérico (`DUX-13`):** no explorado por los artefactos y sin efecto sobre la estructura de las nueve pantallas. No se inventa comportamiento; se resuelve cuando el Technical Design o una Spec lo requieran.
- **Refinamientos editoriales y de anatomía** (microcopys puntuales, ajuste fino de los filter chips, 6.10): pueden precisarse en implementación **solo si no cambian comportamiento ni estructura UX**.

### 17.3 Decisiones de Diseño cerradas en esta versión
| Tema | Decisión | Sección |
|---|---|---|
| Listado ADM-03 con muchas órdenes | Paginación convencional al pie; sin scroll infinito, ordenamiento por columnas ni filtros nuevos | 3.2, 6.16, 14 |
| Corrección de datos básicos | «Editar datos» activa edición dentro del mismo bloque, con «Guardar cambios» y «Cancelar edición» | 6.17 |
| Validación de PUB-02 | Botón deshabilitado ante errores conocidos; errores posteriores al intento se muestran con resumen y mensajes por campo | 3.1, 6.1, 13.1 |
| Aviso de datos sensibles | Redacción de Diseño fijada | 13.7 |
| Eliminación de notas | Sin diálogo E11 adicional; feedback posterior | 10.4 |
| Orden de notas | Más reciente primero dentro de cada bloque | 10.4 |
| Rótulo previo a *Esperando aprobación* en el bloque Público | Aplica la regla del PRD §4.5 | 9, 11 |
| Journey en *Cancelado* | Rama de salida desde la etapa interrumpida | 7.3 |

---

## 18. Trazabilidad

| Pantalla / patrón | PRD (SC / E) | Artefacto UX de origen | Sección del sistema visual (SV) | Sección de este documento |
|---|---|---|---|---|
| PUB-01 Landing | §4.1, §4.10, `RIE-20` | UX-EXPLORATION §9, §11 | §09 (card pública), §14 (franja), §16 | 3.1, 4.1–4.3, 13.8 |
| PUB-02 Registro | `SC-01`, `SC-16`, `E1`, `E3`, §4.3, §4.10, `RIE-13` | UX-EXPLORATION §9, §12 | §08 (inputs, selector), §14 | 3.1, 6.2–6.5, 13.1, 13.7 |
| PUB-03 Confirmación | `SC-01`, `E2`, `E16`, `E17` | UX-EXPLORATION §9; DUX-05/06 | §03 (código), §06 (sombra 1) | 3.1, 6.9 |
| PUB-04 Consulta | `SC-02`, `SC-13`, `E4`, `E15` | UX-EXPLORATION §9, §12 | §08, §14 | 3.1, 13.2 |
| PUB-05 Seguimiento | `SC-02`, `SC-08`, `SC-10`, `SC-11`, `E5`, `E6` | UX-EXPLORATION §9, §10, §12 | §11, §12, §10 | 3.1, 7, 8.1, 11.3 |
| ADM-01 Acceso | `SC-12`, `E10` | UX-EXPLORATION §9; DUX-14 | §14 | 3.2, 13.3, 13.4 |
| ADM-02 Dashboard | `SC-03`, §4.2 | UX-EXPLORATION §9; DUX-08 | §09 (status card) | 3.2, 6.6 |
| ADM-03 Listado | `SC-03`, `E7`, `E8`, `E15`, §4.9 | UX-EXPLORATION §9, §12; DUX-09 | §09 (row/card/vacío), §05 (pill) | 3.2, 6.7, 6.10, 6.14, 6.16 |
| ADM-04 Detalle | `SC-04`–`SC-12`, `E3`, `E9`–`E14`, `E17`, §4.5, §4.7, §4.8 | UX-EXPLORATION §9, §15; DUX-10/11/12 | §11, §12, §13 | 3.2, 6.17, 7, 9, 10, 11 |
| Repair Journey | §4.4, `SC-04`, `SC-05` | UX-EXPLORATION §10; DUX-07 | §11, §02 | 7 |
| Timeline público | `SC-10`, §4.7 | UX-EXPLORATION §9 | §12 | 8.1 |
| Historial administrativo | `SC-10`, §4.7, `RIE-15` | UX-EXPLORATION §9, §15 | §12 | 8.2 |
| Público vs Interno | `SC-11`, `SC-12`, §4.6 | UX-EXPLORATION §15; DUX-12 | §13 | 9 |
| Notas (composer / Note item) | §4.7, `E12`, `E14`, `RIE-04` | UX-EXPLORATION §9; DUX-16 | §13 (composer); Note item completado en este documento | 10 |
| Congelado / terminal | §4.5, §4.8, `SC-08`, `SC-09`, `RIE-06` | UX-EXPLORATION §9 | §08 (read-only), §10 (Frozen) | 11 |
| Diálogos E11 | `E11`, §7.3, `E14`, `RIE-06` | UX-EXPLORATION §13; captura `exploracion/direccion-c/ADM-03.png` (#2 en línea); captura `consolidado-desktop/ADM-07.png` (#1; es un nombre de archivo, no un identificador de pantalla: muestra ADM-04) | §15 | 6.12, 12 |
| Alertas y excepciones | `E3`, `E4`, `E9`, `E10`, `SC-12`, `RIE-13`, `RIE-20` | UX-EXPLORATION §12, §16 | §14 | 6.11, 13 |
| Navegación | `SC-12`, `SC-15`; PRD §4.1–4.2 | UX-EXPLORATION §11; DUX-01/02 | §16 | 4 |
| Responsive | `SC-15`, `SUP-03` | UX-EXPLORATION §14 | §17 | 14 |
| Accesibilidad | `SUP-09` | — | §18 | 15 |
| Selector de tipo de equipo | §4.3 (lista cerrada) | DESIGN-BRIEF | §08 | 6.5, 14 |

---

## 19. Revisión de coherencia

Realizada el 2026-10-26 contra `PRD.md`, `UX-EXPLORATION.md` y el artefacto de Claude Design.

### 19.1 Verificaciones
| Verificación | Resultado |
|---|---|
| Ocho estados con los nombres exactos del PRD (*Solicitud recibida*, *Equipo recibido*, *En diagnóstico*, *Esperando aprobación*, *En reparación*, *Listo para recojo*, *Entregado*, *Cancelado*) | Conforme (secciones 5.6, 6.8, 7). No se usan abreviaturas ni los nombres descartados de Stitch. |
| Sin pantallas, campos ni acciones nuevas | Conforme: nueve pantallas; campos de PUB-02 = los del PRD §4.3; acciones = las del PRD. «Limpiar búsqueda y filtros» y «Actualizar orden» son controles de interfaz sobre funciones existentes (búsqueda y vista), no funcionalidad nueva. |
| `SC-11` | Conforme: nombre, teléfono, email, notas internas e historial administrativo solo en el bloque Interno; nunca en PUB-05. Sección 9. |
| `SC-12` | Conforme: no se modifica; ADM-01 y sesión expirada documentados. |
| Cuatro confirmaciones E11 | Conforme: →*Esperando aprobación*, →*En reparación*, →*Cancelado* (desde los cuatro estados permitidos), →*Entregado*. Sección 12. |
| Diferencias público/interno | Conforme: cinco vías de diferenciación; refinamiento de rótulo previo a *Esperando aprobación* (ver 19.2). |
| Estado terminal read-only | Conforme: diagnóstico, costo, datos, notas y acciones, sección 11 y 10.2. |
| Responsive | Conforme, con la corrección del selector de equipo (sección 14). |
| Sin decisiones técnicas prematuras | Conforme: sección 17; iconos, fuentes, tokens y breakpoints quedan diferidos. |

### 19.2 Discrepancias entre el artefacto y el PRD/UX, y cómo se resolvieron
1. **Selector de tipo de equipo: «3 columnas en móvil».** Sustituido por la regla 2–3 (móvil) / 3–4 (tablet) / hasta 6 (desktop). Instrucción expresa.
2. **Bloque «Público» y diagnóstico/costo previos a *Esperando aprobación*.** El artefacto afirma que todo el bloque Público aparece en el seguimiento, lo que contradiría `SC-08` antes de *Esperando aprobación*. Se añadió el rótulo textual «Aún no visible para el cliente» y se reformuló el subtítulo. Cerrado: aplica directamente la regla del PRD §4.5 (diagnóstico y costo son de naturaleza pública pero no visibles para el cliente hasta alcanzar *Esperando aprobación*) y no cambia funcionalidad.
3. **Note item.** Ausente en el artefacto (solo compositor). Completado en la sección 10.
4. **Marcador del Journey para «Cancelado».** La leyenda del artefacto muestra un círculo con aspa (`close`) en Error; el componente interactivo marca la etapa interrumpida con el marcador de «alcanzada» más la rama Error. Este documento sigue el comportamiento del componente (7.2–7.3); el uso del marcador con aspa se reserva al timeline público (8.1). Tratamiento aceptado y cerrado.
5. **Diagnóstico en el historial administrativo.** El artefacto muestra solo el texto vigente de cada registro; el PRD pide «primer registro y modificaciones». Se documenta valor anterior/nuevo cuando corresponda (8.2).
6. **Rótulo «Solo lectura».** El artefacto define «Congelado»; «Solo lectura» extiende el patrón a los elementos cerrados (11.2).
7. **Referencia a archivos.** El artefacto dice «Fuente para docs/02-diseno/DESIGN.md» (consistente con este archivo) y «Cambia el estado desde Tweaks» (propio de la herramienta, sin efecto).
8. **Ambigüedad de validación en PUB-02** (botón deshabilitado vs. envío rechazado). Unificada en una sola regla (13.1) sin alterar `E3` ni `SC-16`.
9. **Aviso de datos sensibles incompleto** respecto de PRD §4.10 (faltaban credenciales e información financiera). Redacción de Diseño fijada en 13.7.
10. **Decisiones de Diseño que estaban abiertas** (paginación de ADM-03, edición de datos básicos, eliminación y orden de notas). Cerradas; ver 17.3.

### 19.3 No se encontraron contradicciones con
Estados y transiciones (§4.4), visibilidad de diagnóstico/costo (§4.5), edición y estados finales (§4.8), formato de fecha y costo (§7.1), confirmaciones (§7.3), ni con los elementos descartados de UX-EXPLORATION §8 (el artefacto no contiene técnicos, inventario, garantía, SMS, IMEI, barra inferior, `S/ 0.00` en cancelados ni autor en el historial).

### 19.4 Acciones documentales externas pendientes (no realizadas)
Realizado posteriormente: el estado de la fase 02 se actualizó a COMPLETADO en `CLAUDE.md` y `docs/README.md`.
Siguen pendientes:
- Actualizar las rutas `evidencias/stitch/` → `referencias/stitch/` en `UX-EXPLORATION.md`, `STITCH-BRIEF.md` y `DESIGN-BRIEF.md`.
- Decidir si `DESIGN-BRIEF.md` se conserva como histórico (ya cumplió su función de insumo).
- `DUX-13` sigue sin resolver (17.2) y `VAL-04` sigue pendiente (PRD §8.2).

### 19.5 Verificación final (2026-10-26)
| Verificación | Resultado |
|---|---|
| Nueve pantallas: PUB-01 a PUB-05 y ADM-01 a ADM-04 | Conforme; ninguna añadida (paginación y edición de datos son estados/componentes de ADM-03 y ADM-04). |
| Ocho estados con nombres exactos | Conforme. |
| Solo cuatro confirmaciones obligatorias (`E11`) | Conforme: «Editar datos», «Guardar cambios» y «Eliminar» nota no abren diálogo. |
| `SC-11` / `SC-12` | Conforme: sin cambios en qué es público o interno; «Editar datos» respeta la separación por bloques. |
| Diagnóstico y costo | Editables antes de *Esperando aprobación*; no públicos antes; congelados y públicos desde ahí; nunca publicados si se cancela antes. |
| *Entregado* y *Cancelado* | Terminales y read-only; sin «Editar datos» ni acciones de nota. |
| Funcionalidad fuera del PRD | Ninguna introducida. |
| Decisiones de Diseño abiertas (paginación, edición de datos, eliminación y orden de notas, microcopy del aviso sensible) | Ninguna. |
| Decisiones técnicas | Siguen diferidas al Technical Design (17.1). |
| Contradicciones reales con el PRD | Ninguna encontrada. |
