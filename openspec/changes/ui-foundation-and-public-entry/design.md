# Design

## Context

Motivación y alcance: ver `proposal.md`; requisitos observables: `specs/public-site-entry/spec.md`. Fuentes: `DESIGN.md` (PUB-01, §4.1–§4.3, §5, §6.1, §6.6, §6.11, §6.14, §13.8, §14, §15, Apéndice A.2–A.4); PRD §4.1, §4.10; Technical Design (TD) §6, §21.3, §21.7, §28, §30; ADR-002, ADR-007; backlog `CHG-04`.

**Premisa de orden:** se aplica **después de CHG-01** (✅ completado y archivado, commit `fbde0c8`: TypeScript, capas, lint, Vitest) y se apoya en la base de Playwright de CHG-03 para sus pruebas (dependencia blanda; CHG-03 **no** está aplicado). No depende de la base de datos. **Prioridad temporal de ejecución:** se adelanta su parte visual para un *Presentation Preview 0* (ver la sección homónima); el orden normal (CHG-02 → CHG-03 → cierre de CHG-04) se retoma después.

**Estado actual observado (revisión previa, solo lectura):** `src/app/layout.tsx` (TypeScript) con `lang="en"`, Geist y Geist Mono cargadas con `next/font/google`, y metadatos de FIXORA; `src/app/globals.css` (26 líneas) con modo oscuro automático y la fuente Arial como respaldo; `src/app/page.tsx` con un marcador «Proyecto en construcción»; Tailwind 4 por regla de Turbopack; `next.config.mjs` con `cacheComponents` y `partialPrefetching` y sin cabeceras ni `poweredByHeader`. No existen `not-found`, `error` ni `global-error`. Ya existen de CHG-01 (y no se tocan): `src/instrumentation.ts`, el logger, `ActionResult`/`runAction`, las reglas de lint por capa (`src/app/**` no importa `infrastructure`) y Vitest 5. **AV-1 ✅ PASS** (`docs/03-arquitectura/validation/AV-1-FRAMEWORK-SECURITY.md`).

## Goals / Non-Goals

**Goals:**
- Establecer la base visual aprobada (tokens, tipografía, espaciado, radios, iconos) y las primitivas **estrictamente necesarias** para esta entrada pública.
- Entregar el shell público, la landing, el aviso demostrativo, el 404 y el error público conforme a `DESIGN.md` y a la Spec.
- Dejar la configuración base de cabeceras y CSP públicas lista para que AV-1 la valide.

**Non-Goals:**
- Un sistema de diseño completo: no se crean campos de formulario, *selects*, insignias de estado, Repair Journey, tablas, diálogos `E11`, editor de notas ni el shell administrativo.
- Registro, consulta, administración, login, base de datos o máquina de estados; las rutas destino de los accesos las construyen CHG-05, CHG-06 y CHG-08.
- Logger, `instrumentation.ts` y `onRequestError` (CHG-01) y la CSP con nonce de `/admin/**` (CHG-08).
- No se ejecuta AV-1.

## Decisions

### D-1. Qué va en la Spec y qué en el design (auditoría)
| Elemento | Dónde | Razón |
|---|---|---|
| Los puntos de entrada de la landing para registrar y consultar son acciones principales del cliente | Spec | Comportamiento observable. La presentación equivalente de ambas (tarjetas de igual jerarquía visual) es **design** y `DESIGN.md`, no spec |
| Navegación pública coherente; punto de entrada al acceso administrativo que no es una acción principal del cliente | Spec | Comportamiento observable y testable. Que se vea secundario y discreto (texto atenuado, candado, separado) es **design** |
| El aviso demostrativo existe, es visible y no bloquea | Spec | Comportamiento observable y `RIE-20` |
| El 404 ofrece salida y no revela detalles; el error inesperado es seguro y ofrece recuperación | Spec | Comportamiento observable y seguridad |
| Uso en móvil y escritorio sin desplazamiento horizontal | Spec (un único requisito compacto) | `SC-15` es un criterio observable y durable de las superficies de entrada; **sin** catálogo de *breakpoints* |
| Accesibilidad (foco visible, 44 px, movimiento reducido, etiquetas, no depender solo del color, teclado) | **Design/tasks y revisión manual** | No se convierte en capability ni en requisitos de esta spec: son criterios globales de interfaz (`SUP-09`, DESIGN §15). Si una conducta específica exigiera un escenario, se añadiría entonces |
| Colores, Geist, radios, cabecera, `not-found.tsx`, SVG locales, CSP, cabeceras | Design | Cómo se implementa o cómo se ve |
| Textos literales (lema, aviso, 404, error) | Design | Fijados por `DESIGN.md`; la Spec describe la conducta, no el *copy* |

### D-2. Rutas (TD §6)
Landing `/`, registro `/registrar`, consulta `/consultar` y acceso administrativo `/admin/acceso`. La landing y la navegación enlazan esas rutas aprobadas; **ninguna alias**. En este change, `/registrar`, `/consultar` y `/admin/acceso` aún **no tienen contenido** (lo aportan CHG-05, CHG-06 y CHG-08); los accesos no simulan comportamiento. Ver Open Questions sobre cómo se verifican sus escenarios. **Verificación en dos etapas (aprobada):** CHG-04 demuestra que los puntos de entrada existen y que su destino es la ruta aprobada; el funcionamiento real lo demuestran después CHG-05 (registro), CHG-06 (consulta) y CHG-08 (login administrativo). No se crean páginas de relleno ni formularios simulados.

### D-3. Base visual (`DESIGN.md` §5; sin rediseñar)
Concepto *Trusted Tech*, **solo tema claro**. Los tokens se declaran como variables CSS en el tema de Tailwind 4 de `globals.css` (la forma exacta se confirma contra la guía instalada).
- **Primary:** `#0F5FA8`; hover `#0C4F8C`; active `#093F70`; subtle `#E8F0FA`.
- **Neutros:** fondo `#F6F8FB`; superficie `#FFFFFF`; superficie secundaria `#EEF2F7`; borde `#D6DDE6`; borde fuerte `#7D8999`; texto `#121A26`; texto secundario `#3F4B5B`; texto atenuado `#677385` (nunca para información crítica).
- **Semánticos:** éxito `#1E7A4C`; advertencia `#A15C00`; error `#B42318`, con sus variantes suaves, bordes y tonos derivados de `DESIGN.md` §5.1.
- **Espaciado:** 4, 8, 12, 16, 24, 32, 48, 64. **Radios:** 4, 6, 8, 12; 999 solo para los *chips* (que no entran en este change).
- **Sin** degradados, fotografías de stock ni ilustraciones decorativas. Márgenes laterales: 16 móvil, 24 tablet, 32–64 escritorio.
- **Correcciones del scaffold (TD §28):** `lang="es"`, retirar el modo oscuro automático y la fuente Arial de `globals.css`, y metadatos estáticos.

### D-4. Tipografía
**Geist** (400, 500, 600, 700) para toda la interfaz; **Geist Mono exclusivamente para el código de seguimiento** (no se usa en este change; la variable se conserva). Se cargan con `next/font` como en el scaffold: se empaquetan en el *build* y se sirven desde el propio despliegue, sin CDN de fuentes en *runtime* (TD §21.3). Escala de `DESIGN.md` §5.2: Display 40/48 (móvil 32/40), H1, H2, H3, Body Large, Body, Small, Label y Caption; Display, H1 y H2 bajan un paso en móvil. Cifras con `tabular-nums` donde corresponda.

### D-5. Iconos y primitivas (solo las necesarias)
- **Iconos:** componentes SVG locales con `currentColor` y trazo uniforme (TD §30; Material Symbols Outlined es solo referencia visual); decorativos con `aria-hidden`; sin librería de iconos ni fuente de iconos. Solo los que usa este change: logotipo de FIXORA, `science` (aviso demostrativo), `lock` (acceso al taller), `arrow_forward`, `search_off`, `error`, los dos iconos de las tarjetas de la landing y el del menú móvil.
- **Primitivas:** botón/enlace-botón (primario, secundario y *ghost*; alto 40 escritorio / 44 móvil, radio 6), tarjeta pública (padding 24, radio 8, sin sombra), alerta/banner (variantes Info y Error de `DESIGN.md` §6.11), estado vacío (para el 404) y los contenedores de layout. **No** se crean campos, insignias, diálogos, tablas ni el Journey.
- **Ubicación:** componentes de interfaz bajo `src/app/` (carpeta privada); los módulos puros de presentación del TD §5 solo se crearán si aparece una función pura que lo justifique. *Detalle de implementación.*

### D-6. Shell público
- `app/layout` raíz mínimo: `<html lang="es">`, fuentes, `globals.css` y el fondo; **no** contiene la navegación pública, para que el shell administrativo (CHG-08) sea independiente.
- Un grupo de rutas público con su propio layout: **cabecera** (barra de 64 en escritorio y 56 en móvil, fondo superficie, borde inferior de 1 px), **franja demostrativa** y **contenido principal**. Sin pie de página (`DESIGN.md` no lo contempla).
- **Navegación escritorio:** logotipo, «Inicio · Registrar reparación · Consultar estado» y, a la derecha y separado, «Acceso Taller» (icono de candado, color de texto secundario, sin competir con las acciones del cliente).
- **Navegación móvil:** logotipo y botón rotulado «Menú» de 44 (texto más icono); el menú se despliega a ancho completo con filas de 48 y, tras un separador, «Acceso Taller». **Sin barra de navegación inferior.** El control de menú es un componente de cliente mínimo con estado (`aria-expanded`, `aria-controls`, cierre al navegar y con *Escape*).
- Semántica: `header`, `nav` con nombre accesible y `main`.

### D-7. Landing (PUB-01)
Componente de servidor estático: lema «Tu reparación, siempre bajo control.» en Display, descripción breve, **dos tarjetas de igual jerarquía** (icono, título, texto y botón) en paralelo en escritorio y en una columna en móvil, con margen superior de 64 en escritorio. Acciones: «Registrar reparación» y «Consultar estado» (accesos a `/registrar` y `/consultar`). «Acceso Taller» va en la navegación. **Sin secciones de marketing nuevas**: solo el contenido de `DESIGN.md`. Los textos de apoyo editoriales se fijan al implementar sin cambiar la estructura.

### D-8. Aviso demostrativo
Franja de ancho completo bajo la cabecera, variante Info (fondo Primary subtle, borde Info, icono `science`, texto 14), centrada, en el **shell público** (`DESIGN.md` §13.8). Texto literal: «Entorno de demostración. No ingreses datos personales reales ni información sensible.» **Sin** casilla, consentimiento, modal ni cierre obligatorio. Es contenido estático. Es preventivo: no afirma que todos los datos sean ficticios ni promete tratamiento legal. El aviso administrativo (insignia en la barra lateral) es de CHG-08.

### D-9. No encontrado y error público (`DESIGN.md` Apéndice A)
- **404:** `not-found` raíz que **renderiza el shell público** (cabecera, navegación y franja) con el patrón de estado vacío: tarjeta centrada, icono `search_off` en un cuadro de 48, título «Página no encontrada», texto «La página que buscas no existe o ya no está disponible.» y acción primaria «Volver al inicio» (a `/`). **No** ofrece «Reintentar». Las rutas `/admin/**` inexistentes se tratan en CHG-08.
- **Error inesperado:** `error` del grupo público (el layout, con su cabecera, permanece) con alerta de Error: título «Ocurrió un problema inesperado.», texto «Inténtalo nuevamente.» y «Reintentar» (secundario) que invoca `retry` del límite (estable desde Next 16.3; `reset` solo si se quisiera limpiar el estado sin volver a pedir contenido) cuando tiene sentido; en móvil el botón ocupa el ancho completo (44).
- **Fallo global:** `global-error` (reemplaza al layout raíz, por lo que declara su propio `html`/`body` y estilos) con la misma alerta centrada sobre el fondo y «Reintentar», sin depender de la navegación. Corresponde porque `DESIGN.md` A.3 define explícitamente este caso.
- **Referencia — no se muestra el `digest` de Next.** El `digest` del *framework* **no** se usa como identificador visible de soporte: puede mantenerse solo donde el TD lo permite para registro y correlación interna, nunca como contrato de interfaz. Si `DESIGN.md` A.3 exige mostrar una «Referencia», esta debe provenir de la **infraestructura propia de FIXORA** (CHG-01: una referencia o `requestId` opaco y seguro, no sensible, no derivado del mensaje, la pila, la ruta, la *query*, un *token* o datos personales). Como CHG-01 no garantiza hoy que esa referencia llegue a `error.tsx`, **este change no inventa el mecanismo**: la línea «Referencia: {valor}» se muestra solo si existe una referencia segura disponible, la interfaz funciona igual sin ella y AV-1 valida el *wiring*. No es un requisito funcional de la capability. `error.tsx` recibe `error` y `reset`, pero la interfaz no muestra información interna solo porque esté disponible.
- **Registro:** los errores del servidor los registra CHG-01 (`instrumentation.ts`, `onRequestError`, logger); estos componentes **no** registran ni duplican esa lógica.
- Carga genérica (A.2): marcadores de posición con el color de superficie secundaria y el texto accesible «Cargando…», sin spinner nuevo; se aplican solo donde CHG-04 introduzca una parte que espere datos (ninguna hoy), por lo que la primitiva queda definida para los slices.

### D-10. Renderizado y caché (ADR-002)
Las rutas públicas de este change son contenido **estático**: el *shell* público es compatible con la estrategia aprobada de **Cache Components** (ADR-002, TD §6) cuando es seguro, sin depender de que una función concreta (como PPR) siga existiendo como mecanismo separado. No leen cookies ni cabeceras ni datos de órdenes, y no usan `use cache` porque no manejan datos que cachear. El área administrativa dinámica llega con CHG-08; no se anticipa el estado de resultado de `/consultar`. AV-1 valida en la Fase 7 el comportamiento efectivo con la versión real de Next (Cache Components, CSP y límites de error). `global-error` se mantiene porque `DESIGN.md` A.3 contempla el fallo global y puede ser necesario como respaldo raíz; su necesidad y forma exactas se confirman en AV-1.

### D-11. Cabeceras y CSP pública (TD §21.3, §21.7)
- Cabeceras de toda la aplicación: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy` restrictiva, `Cross-Origin-Opener-Policy` y `Cross-Origin-Resource-Policy: same-origin`, y `poweredByHeader: false`. HSTS lo publica Vercel (no se duplica); sin `X-XSS-Protection`.
- **CSP pública estática sin nonce** para las rutas públicas: `default-src 'self'`, sin orígenes de terceros, `object-src 'none'`, `base-uri 'none'`, `form-action 'self'`, `frame-ancestors 'none'`. `unsafe-inline` **solo** en las directivas donde el *shell* estático de Next lo exija técnicamente. **Insumo de AV-1 (PASS):** con `script-src 'self'` a secas la página estática **no se hidrata** (los scripts en línea del *shell* se bloquean); con `script-src 'self' 'unsafe-inline'` y `style-src 'self'` (sin `unsafe-inline` en estilos) la hidratación fue correcta con 0 violaciones. Por tanto la base es `script-src 'self' 'unsafe-inline'` y `style-src 'self'`; se confirma con el *shell* real y `next/font`. Consecuencia: **sin atributos `style={{…}}` ni etiquetas `<style>` en línea** en los componentes de este change (incluido `global-error`, que debe ser autocontenido con clases, no con estilos en línea). `unsafe-eval` solo en desarrollo. **`unsafe-inline` no se extiende a `/admin/**`**, que tendrá su CSP estricta con nonce en CHG-08.
- La CSP pública **no debe aplicarse a `/admin/**`** (CHG-08 genera allí una CSP con nonce por petición; dos CSP simultáneas se intersectan): el patrón de ruta de la cabecera la excluye. El patrón exacto se confirma en AV-1.
- **Robots:** solo la landing es indexable; el valor por defecto del layout raíz es *noindex*, y la landing lo sobrescribe (`/registrar`, `/consultar` y `/admin/**` lo mantienen).

### D-12. Responsive
Mobile-first (`DESIGN.md` §14): el escritorio agrega columnas, no contenido. Sin desplazamiento horizontal de la página. Se usan los *breakpoints* estándar de Tailwind (TD §28: preferir los estándar). Alturas de barra 56/64 y de botón 44/40. Contenedores con `min-width: 0` y sin anchos fijos mayores que el *viewport*.

### D-13. Accesibilidad (línea base, sin declarar WCAG)
Anillo de foco Primary de 2 px con separación blanca en todo elemento interactivo; HTML semántico y navegación por teclado completa (incluido el menú móvil); controles táctiles de 44 px mínimos con 8 de separación; el significado no depende solo del color (icono más texto); movimiento reducido respetado (transiciones de 150–200 ms solo de color y opacidad); alertas anunciadas a tecnologías de apoyo sin robar el foco. El contraste de los pares de la paleta, incluido el texto atenuado, se **verifica manualmente** durante la implementación (`DESIGN.md` §15).

### D-14. Pruebas
- **Unitarias:** ninguna prevista (no hay funciones puras justificadas).
- **Playwright** (sobre la base de CHG-03), en dos niveles. *CHG-04:* con consultas por rol y *test id*, sin fijar textos de marketing, la landing carga y expone los puntos de entrada con los destinos aprobados (sin exigir que la página destino funcional exista); *CHG-05/06/08* extienden la evidencia con el clic, el destino y el contenido real; la navegación pública (y el menú móvil en el proyecto móvil); el acceso al taller como enlace secundario hacia `/admin/acceso`; el aviso demostrativo presente y sin bloquear la navegación; una ruta inexistente muestra el 404 con salida a `/`; sin desplazamiento horizontal (`scrollWidth ≤ clientWidth`) en anchos móvil y de escritorio; las cabeceras de seguridad públicas presentes y ausencia de la CSP pública en `/admin/**` cuando exista.
- **Revisión manual/UX:** fidelidad a `DESIGN.md` (tokens, tipografía, espaciado), foco visible, movimiento reducido, contraste y el **error público**, que se induce con un mecanismo de prueba que **no deja ninguna ruta de depuración accesible en Production ni altera el contrato público** (el mecanismo exacto es detalle de implementación/AV-1; no se usa React Testing Library).
- Evidencia parcial de `SC-15`; `TRACEABILITY.md` se actualiza. `SC-15` lo cierra CHG-15.

### D-15. Dependencias
Ninguna nueva. Tailwind 4 y `next/font` ya existen; los iconos son SVG locales. Una librería de iconos, una fuente de iconos o un paquete de accesibilidad requerirían aprobación nueva.

## Pre-implementation validations — AV-1 (estado tras la ejecución del gate)
**AV-1 ✅ PASS.** Estado de lo que este change esperaba de él:
1. *Shell* público estático bajo Cache Components: ✅ demostrado con un *shell* representativo (la ruta pública permaneció estática); con los componentes reales (incluido el menú de cliente) se confirma al implementar.
2. CSP pública base: ✅ demostrado (`script-src 'self' 'unsafe-inline'`, `style-src 'self'`; ver D-11). Con `next/font` real se confirma al implementar.
3. Coexistencia con `/admin/**`: ✅ demostrada (la ruta pública no recibe nonce y `/admin/**` sí, con su CSP estricta); el patrón exacto de la cabecera pública que excluye `/admin/**` se confirma al implementar.
4. Comportamiento de `not-found` raíz con el *shell* público y de `error`/`global-error` bajo Cache Components: ⚠️ **no cubierto por AV-1** (AV-1 verificó solo que `redirect()` fuera de `try/catch` no activa `error.tsx`). Se verifica durante la implementación.
5. `reset` del límite de error tras un fallo de renderizado: ⚠️ **no cubierto por AV-1**; se verifica durante la implementación.

Si 4 o 5 contradijeran el diseño aprobado de forma que exija cambiar una decisión, se detiene la aplicación y se solicita revisión arquitectónica.

## Presentation Preview 0 — prioridad temporal de ejecución (propuesta, pendiente de aprobación del usuario)

**Contexto.** Se quiere una versión visual desplegable (Vercel) para compartir como avance, **sin base de datos, sin autenticación, sin registro ni consulta funcionales**. Es una reordenación temporal compatible con el DAG: CHG-04 solo tiene CHG-01 como dependencia dura (cumplida) y CHG-03 como blanda. No sustituye al backlog: tras el despliegue se retoma CHG-02 → CHG-03 → cierre formal de CHG-04. **Clasificación del despliegue futuro: PRESENTATION PREVIEW**, no línea base formal de Production (CHG-07), ni AV-3, ni `SC-20`.

**Alcance visual del Preview 0** (todo ya está en CHG-04): tokens, tipografía Geist, shell público responsive, iconos SVG locales, landing PUB-01, navegación, «Acceso Taller» discreto, aviso demostrativo (copy canónico de D-8), 404, error público y cabeceras/CSP públicas. Debe construirse con `npm run build` **sin ninguna variable de entorno** y sin dependencias nuevas (ni Prisma/`pg`/Neon).

**Decisiones propuestas (cada una requiere aprobación; ninguna modifica la Spec):**
- **P-1. Puntos de entrada aún sin destino (`/registrar`, `/consultar`).** D-2 y OQ-1 (aprobadas) dicen que los accesos apuntan a las rutas aprobadas sin crear páginas de relleno; en un despliegue público esas rutas mostrarían el 404, lo que parece roto. Propuesta: una constante de disponibilidad por punto de entrada (`available`) en un módulo de presentación bajo `src/app/`; con `available: true` es un enlace a la ruta aprobada (comportamiento de la Spec, rama `main`); con `available: false` se muestra el mismo componente **sin `href`**, con `aria-disabled="true"` y la etiqueta visible «Disponible próximamente», sin simular ninguna operación ni formulario. El *Preview* se despliega desde una rama que fija `available: false` (un único *commit* de vista previa); CHG-05, CHG-06 y CHG-08 activan sus puntos de entrada al implementarse. Alternativas descartadas: enlaces reales a rutas inexistentes (404 en la demo) y páginas «Próximamente» (contradice OQ-1).
- **P-2. «Acceso Taller».** Mismo mecanismo que P-1 (`/admin/acceso` aún no existe; CHG-08). Visible y discreto como en DESIGN §4.3, no navegable en el Preview y sin formulario de login.
- **P-3. Contenido adicional de la landing.** `DESIGN.md` PUB-01 define solo: lema, descripción breve, dos accesos de igual jerarquía y aviso demostrativo. El pedido de presentar «qué hace FIXORA», el beneficio para el cliente y el flujo/*Repair Journey* explicado visualmente **excede PUB-01** y D-7 («sin secciones de marketing nuevas»). Opciones: (a) solo PUB-01 (sobrio, 100 % aprobado); (b) añadir una sección estática «Cómo funciona» con las etapas del proceso tomadas del PRD/DESIGN (los siete estados del flujo y la existencia de «Cancelado»), sin estado actual resaltado, sin código de ejemplo, sin datos ficticios, solo texto e iconos del sistema, **como adición explícita y trazable a PUB-01** (no una pantalla nueva). Recomendación: (b) solo si el usuario la aprueba expresamente; no se añade sin esa aprobación. El Journey funcional real es de CHG-06.
- **P-4. Indexación — RESUELTA: sin `noindex` en el código del producto.** D-11 mantiene la landing indexable (comportamiento aprobado). El *Presentation Preview* se desplegará como *Vercel Preview Deployment* y la protección frente a la indexación se verificará en la infraestructura de Vercel (cabecera `X-Robots-Tag: noindex` en la respuesta real); si no apareciera, se detiene la revisión del despliegue y se decide una corrección específica del preview. No es un cambio funcional de FIXORA.

**Verificación del Preview 0 sin Playwright.** Las tareas cuyo criterio de verificación exige Playwright (ver la lista en `tasks.md`) quedan **pendientes de CHG-03**: se implementan, pero no se marcan completas sin esa evidencia. Para el Preview se exige `lint`, `typecheck`, `test:unit` y `build` en verde bajo Node 24, una comprobación de producción local (`next build` + `next start`: `/` y una ruta inexistente, cabeceras con `curl`) y una revisión visual y responsive manual (escritorio, tablet, móvil, sin desplazamiento horizontal). Una comprobación visual con capturas puede hacerse con un *spike* temporal fuera del repositorio, solo con aprobación y sin instalar nada en el proyecto.

## Risks / Trade-offs

- [Los accesos apuntan a rutas aún inexistentes] → Las pruebas verifican destinos; el flujo completo lo cierran CHG-05, CHG-06 y CHG-08 (ver Open Questions).
- [La CSP pública necesita `unsafe-inline` y debilita la protección] → Se parte de lo estricto y solo se relaja donde AV-1 lo demuestre.
- [La CSP pública afecta a `/admin/**`] → Patrón de ruta que la excluye, validado en AV-1.
- [Crear primitivas de más y derivar en un sistema de diseño] → Lista cerrada de D-5; lo demás nace con el slice que lo usa.
- [Pruebas frágiles por *copy* o maquetación] → Consultas por rol y *test id*, sin fijar textos de marketing ni estilos.
- [Descargar Geist en el *build* requiere red] → Aceptable en Vercel y en CI; si no, evaluar `next/font/local` con aprobación.
- [Contraste insuficiente en algún par de la paleta] → Verificación manual y ajuste dentro de la paleta aprobada o registro del hallazgo.

## Migration Plan

1. Aplicar tokens y correcciones del scaffold (`lang`, modo oscuro, Arial, metadatos).
2. Crear iconos y primitivas, y el shell público con su aviso.
3. Construir la landing y los estados 404 y de error.
4. Añadir cabeceras y CSP pública.
5. Añadir las pruebas de Playwright y la revisión manual.
6. Verificar `lint`, `typecheck`, `build`, `test:unit` y `test:e2e`.

**Rollback:** solo código y configuración; se revierte con `git`. No hay datos ni infraestructura.

## Open Questions

| # | Pregunta | Clasificación |
|---|---|---|
| OQ-1 | Verificación de la navegación en dos etapas: CHG-04 demuestra que existen los puntos de entrada correctos y sus destinos aprobados (`/registrar`, `/consultar`, `/admin/acceso`); no demuestra que esas rutas contengan su funcionalidad. CHG-05, CHG-06 y CHG-08 demuestran el funcionamiento real de registro, consulta y login. No se crean páginas de relleno ni formularios simulados | **RESUELTA** (aprobada) |
| OQ-2 | Valor exacto de `unsafe-inline` en la CSP pública y patrón de ruta que excluye `/admin/**` | **RESUELTA en lo esencial** — AV-1: `script-src 'self' 'unsafe-inline'`, `style-src 'self'`; el patrón de ruta se confirma al implementar |
| OQ-3 | Comportamiento de `not-found`, `error` y `global-error` bajo Cache Components; necesidad real de `global-error` | **ABIERTA** — AV-1 no lo cubrió; se verifica en la implementación (ver «Pre-implementation validations») |
| OQ-4 | Variante visual (primaria/secundaria/otra) de cada punto de entrada, iconos concretos de tarjetas y logotipo, y *copy* editorial de apoyo, confirmados contra `DESIGN.md` al implementar | IMPLEMENTATION DETAIL |
| OQ-5 | Ubicación de los componentes de interfaz, forma exacta de los tokens en Tailwind 4 y *breakpoints* estándar | IMPLEMENTATION DETAIL |
| OQ-6 | Verificación de contraste de la paleta | IMPLEMENTATION DETAIL (revisión manual) |
| OQ-7 | Wiring de una referencia opaca propia de FIXORA hacia `error.tsx` (el `digest` de Next no se muestra) | PRE-IMPLEMENTATION AV-1 / IMPLEMENTATION DETAIL |
| OQ-8 | 404 del área administrativa y shell administrativo | DEFERRED a CHG-08 |
| OQ-9 | Pruebas y superficies de registro, consulta y administración | DEFERRED a CHG-05, CHG-06 y CHG-08 |
| OQ-10 | Presentation Preview 0: comportamiento temporal de los puntos de entrada (P-1, P-2), contenido adicional de la landing (P-3) e indexación (P-4) | **RESUELTA** — P-1/P-2 aprobadas (`available = false`, sin lógica por rama); P-3 rechazada; P-4: sin `noindex` en el código (se verifica en Vercel); sin pie de página (DESIGN no lo define) |

Ninguna pregunta bloquea la aprobación documental de CHG-04; OQ-10 quedó resuelta.
