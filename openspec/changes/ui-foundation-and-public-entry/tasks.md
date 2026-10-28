# Tasks

> Planificación únicamente. Nada de esto se ejecuta hasta que el change esté revisado, aprobado y el usuario autorice `/opsx:apply` en la Fase 7, **con CHG-01 aplicado** (y la base de Playwright de CHG-03 para las pruebas E2E). No se instalan dependencias en este change. No hay tareas de registro, consulta, administración, base de datos ni máquina de estados.

## 1. Preflight y DoR

- [x] 1.1 Confirmar el DoR de implementación (CHG-01 aplicado y archivado ✅ `fbde0c8`, AV-1 ✅ PASS para las cabeceras y el *shell*, y base de Playwright de CHG-03 disponible **o** pruebas E2E diferidas explícitamente: para el Presentation Preview 0 quedan diferidas, ver la sección final); se verifica con una nota de aprobación en el change.
- [x] 1.2 Releer `DESIGN.md` (PUB-01, §4.1–§4.3, §5, §6, §13.8, §14, §15, Apéndice A.2–A.4) y la guía de Tailwind 4 y de `next/font` instalada para confirmar la forma de los tokens y de las fuentes; se verifica con una nota que registra las decisiones de implementación (forma de los tokens, ubicación de los componentes).

## 2. Tokens y fundamentos visuales

- [x] 2.1 Declarar en `globals.css` los tokens de `DESIGN.md` §5 (color, espaciado, radios y escala tipográfica) como variables del tema de Tailwind 4, solo tema claro, retirando el modo oscuro automático y la fuente Arial; se verifica con `npm run build` y la inspección de que las variables existen y de que no queda `prefers-color-scheme: dark` ni Arial.
- [x] 2.2 Ajustar el layout raíz: `lang="es"`, Geist (400/500/600/700) y Geist Mono (reservada para el código de seguimiento) mediante `next/font`, metadatos estáticos y *robots* con *noindex* por defecto; se verifica con `npm run build` y la inspección del HTML emitido (`lang`, fuentes servidas desde el despliegue, sin recursos de terceros).
- [x] 2.3 Comprobar el contraste de los pares de la paleta usados (texto principal, secundario y atenuado sobre fondo y superficie; texto sobre Primary; borde de campo) y registrar el resultado; se verifica con la tabla de verificación manual adjunta al change, sin declarar cumplimiento de WCAG.

## 3. Iconos y primitivas

- [x] 3.1 Crear los iconos SVG locales necesarios (logotipo, aviso demostrativo, candado, flecha, búsqueda sin resultados, error, los de las dos tarjetas y el del menú) con `currentColor`, trazo uniforme y `aria-hidden` cuando son decorativos; se verifica con `npm run typecheck`, la revisión visual y que no se añadió ninguna librería de iconos.
- [x] 3.2 Crear las primitivas estrictamente necesarias: botón y enlace-botón (primario, secundario, *ghost*; 40/44 de alto, radio 6), tarjeta pública, alerta/banner (Info y Error), estado vacío y contenedores de layout, con foco visible de 2 px y objetivos táctiles de 44; se verifica con `npm run lint`/`typecheck` y la revisión manual de estados (reposo, *hover*, foco, deshabilitado) contra `DESIGN.md` §6.
- [x] 3.3 Confirmar que no se crearon campos, insignias de estado, diálogos, tablas ni el Journey; se verifica con la revisión del diff.

## 4. Shell público, navegación y aviso demostrativo

- [x] 4.1 Crear el layout del grupo público: cabecera (64/56), franja demostrativa y contenido principal, sin pie de página, con `header`, `nav` con nombre accesible y `main`; se verifica con `npm run build` y la inspección de la estructura semántica.
- [x] 4.2 Implementar la navegación de escritorio («Inicio · Registrar reparación · Consultar estado» y «Acceso Taller» separado y secundario con icono de candado) con destinos `/`, `/registrar`, `/consultar` y `/admin/acceso`; se verifica con una prueba Playwright en `chromium-desktop` que comprueba que los puntos de entrada existen, que su destino es la ruta aprobada, que son operables con teclado y que el acceso al taller no tiene el estilo de acción principal; **no** exige que la página destino funcional exista.
- [x] 4.3 Implementar el menú móvil como componente de cliente mínimo (botón «Menú» rotulado de 44, filas de 48, «Acceso Taller» tras un separador, `aria-expanded`, `aria-controls`, cierre al navegar y con *Escape*), sin barra inferior; se verifica con una prueba Playwright en `chromium-mobile` que lo abre, lo opera con teclado y lo cierra.
- [x] 4.4 Implementar la franja demostrativa (variante Info, icono, texto literal de `DESIGN.md` §13.8) sin casilla, modal ni cierre obligatorio; se verifica con una prueba Playwright (por *test id*) de que está presente en las superficies públicas y de que no impide navegar.

## 5. Landing

- [x] 5.1 Implementar la landing (PUB-01) como componente de servidor estático: lema en Display, descripción breve y dos tarjetas con los puntos de entrada a `/registrar` y `/consultar` (presentación de igual jerarquía visual según `DESIGN.md`), una columna en móvil y margen superior de 64 en escritorio, sin secciones nuevas; se verifica con una prueba Playwright (por rol) en móvil y escritorio de que ambos puntos de entrada existen, son operables con teclado y tienen los destinos aprobados, y con la revisión manual contra PUB-01; sin páginas de relleno ni formularios simulados.
- [x] 5.2 Configurar la landing como la única ruta indexable; se verifica con la inspección de los metadatos de `/` y de una ruta pública distinta.

## 6. No encontrado y error público

- [x] 6.1 Implementar el `not-found` raíz que renderiza el shell público con el patrón de estado vacío (icono `search_off`, título, texto y acción primaria «Volver al inicio» hacia `/`, sin «Reintentar»); se verifica con una prueba Playwright de que una ruta pública inexistente muestra el estado y que la acción lleva a `/`, y de que no aparecen trazas ni rutas internas.
- [x] 6.2 Implementar `error` del grupo público (alerta de Error con título, texto y «Reintentar» que usa el `reset`, ancho completo del botón en móvil, sin mensaje, nombre de excepción, pila ni `digest` de Next) y `global-error` autocontenido; la línea «Referencia» se muestra solo si existe una referencia segura propia de FIXORA disponible y la interfaz funciona igual sin ella; se verifica con una prueba con un mecanismo que induzca el error sin dejar ninguna ruta de depuración accesible en Production ni versionada, y confirmando que el contenido no muestra detalles técnicos.
- [x] 6.3 Definir el marcador de posición de carga genérica (superficie secundaria, texto accesible «Cargando…», sin spinner) como primitiva para los slices; se verifica con la revisión visual y el texto accesible, sin usarlo donde no hay datos que esperar.

## 7. Cabeceras y CSP públicas

- [x] 7.1 Configurar en `next.config.mjs` las cabeceras de toda la aplicación (`nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP/CORP) y `poweredByHeader: false`; se verifica con una prueba Playwright (respuesta de `/`) que comprueba su presencia y la ausencia de `X-Powered-By`.
- [x] 7.2 Configurar la CSP pública estática sin nonce con el patrón de ruta que **excluye `/admin/**`**, partiendo de la política más estricta y añadiendo `unsafe-inline` solo donde el resultado de AV-1 lo demuestre; se verifica con la navegación de la landing sin violaciones de CSP y sin orígenes de terceros, y con la comprobación de que la CSP pública no se envía en `/admin/**`.

## 8. Responsive y accesibilidad

- [x] 8.1 Añadir las pruebas Playwright de no desbordamiento horizontal (`scrollWidth ≤ clientWidth`) de la landing, el 404 y la navegación en `chromium-mobile` y `chromium-desktop`; se verifica con las ejecuciones en verde.
- [x] 8.2 Realizar la revisión manual de foco visible, navegación completa por teclado (incluido el menú), movimiento reducido, objetivos táctiles de 44 y el significado sin depender del color; se verifica con la lista de comprobación registrada en el change.

## 9. Trazabilidad y verificación final

- [x] 9.1 Actualizar `TRACEABILITY.md` con la evidencia **parcial** de `SC-15` y la distribución de la navegación en dos etapas (CHG-04: puntos de entrada y destinos aprobados; CHG-05, CHG-06 y CHG-08: funcionamiento real); se verifica con `npm run test:trace` en verde.
- [x] 9.2 Ejecutar `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run test:e2e` y `npm run build` y registrar el resultado; se verifica con las ejecuciones en verde.
- [x] 9.3 Revisar el alcance del diff contra `proposal.md` y la Spec: no hay registro, consulta, administración, base de datos, shell administrativo, CSP con nonce, logger, librerías nuevas ni contenido de marketing fuera de `DESIGN.md`; se verifica con el `git diff` y que `openspec validate ui-foundation-and-public-entry --strict` sigue pasando.

## Presentation Preview 0 — ejecución temporal (propuesta; no añade tareas)

Prioridad temporal de entrega (ver `design.md`, «Presentation Preview 0»). Las 24 tareas siguen siendo las mismas; **no se marca como completa ninguna tarea cuyo criterio de verificación no se haya cumplido**.

- **Pueden completarse con los controles disponibles ahora** (`lint`, `typecheck`, `test:unit`, `build`, `next start` + `curl` y revisión manual): 1.1 (con la diferida E2E explícita), 1.2, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 4.1, 5.2, 6.3, 8.2 y 9.3.
- **Se implementan, pero permanecen pendientes de CHG-03 (su verificación exige Playwright; PENDING CHG-03):** 4.2, 4.3, 4.4, 5.1, 6.1, 6.2, 7.1, 7.2, 8.1, 9.1 (`test:trace`) y la parte `test:e2e` de 9.2. Para el Preview se sustituyen por la comprobación manual/`curl` descrita en `design.md`, sin marcar esas tareas.
- Por tanto el Preview puede alcanzar **PRESENTATION PREVIEW READY** sin que CHG-04 esté formalmente cerrado ni archivado; el cierre formal queda tras CHG-03.
- Decisiones P-1 a P-4 resueltas (OQ-10 de `design.md`).

## Workflow follow-up

- Revisar y aprobar el change; el usuario autoriza explícitamente `/opsx:apply` en la Fase 7, con el DoR de `docs/04-planificacion/BACKLOG.md` cumplido.
- Archivar el change tras implementarlo y verificarlo: sincroniza `public-site-entry` en `openspec/specs/` (primera main spec de FIXORA).
- La verificación de la navegación es en dos etapas: CHG-04 demuestra los puntos de entrada y sus destinos aprobados; CHG-05 (registro), CHG-06 (consulta) y CHG-08 (login administrativo) extienden la evidencia E2E con el clic, el destino y el funcionamiento real. No se crean páginas de relleno.

## Evidencia del Presentation Preview 0 (2026-10-27)

**Estado histórico del Presentation Preview 0 (2026-10-27): 12/24 tareas completas; 12 pendientes — superado por «Cierre formal de CHG-04» más abajo.** Se implementaron todas las superficies de CHG-04; las tareas sin marcar quedan así por la verificación (no por la implementación): 4.2, 4.3, 4.4, 5.1, 6.1, 6.2, 7.1, 7.2, 8.1, 9.1 y 9.2 exigen el harness de Playwright de CHG-03 (**PENDING CHG-03**), y 6.3 espera a su primer uso real (el marcador de carga existe, pero ningún bloque de este change espera datos y no pudo revisarse visualmente). El change **no está cerrado ni archivado**.

**Decisiones de implementación (1.2).** Tokens como variables del tema de Tailwind 4 en `globals.css` (`@theme`, solo tema claro; espaciado = escala base 4 de Tailwind; radios 4/6/8/12; sombras nivel 1 y 2; escala tipográfica con peso, interlínea y *tracking*). Fuentes variables Geist y Geist Mono con `next/font/google` en `src/app/fonts.ts` (compartido por el layout y `global-error`). Componentes bajo `src/app/_components/` (carpeta privada). Estructura: layout raíz mínimo; grupo `(public)` con el shell; `not-found` raíz que renderiza el shell por sí mismo; `error.tsx` en el grupo público; `global-error.tsx` autocontenido. `error`/`global-error` usan `retry` (estable desde Next 16.3; la guía instalada lo recomienda frente a `reset`). Sin pie de página: `DESIGN.md` no lo define (D-6).

**Puntos de entrada (P-1/P-2, aprobados).** `src/app/_components/entry-points.ts` define `available` por acceso; los tres están en `false`. Disponible → `next/link` a la ruta canónica; no disponible → `<button disabled>` (sin `href`, sin `onClick`, no enfocable, cursor por defecto) con «Disponible próximamente» visible junto al control y enlazado con `aria-describedby`. CHG-05 activa `register`, CHG-06 `consult` y CHG-08 `workshop`, cambiando solo su propia constante. No hay lógica específica de ninguna rama. P-3 (sección adicional) rechazada y P-4 resuelta sin `noindex` en el código: la landing conserva la regla indexable de D-11 (tarea 5.2); la protección frente a la indexación del preview se verificará en Vercel (`X-Robots-Tag: noindex` en el *Preview Deployment*, no en el código). Sin pie de página, por decisión explícita: `DESIGN.md` no lo define.

**Contraste (2.3; sin declarar WCAG).** Texto principal `#121A26` sobre fondo/superficie 16.4/17.5; secundario `#3F4B5B` 8.3/8.9 (7.9 sobre Surface secondary); atenuado `#677385` 4.5/4.8 (**4.3 sobre Surface secondary**, por eso el motivo «Disponible próximamente» usa texto secundario y no atenuado); blanco sobre Primary 6.5, sobre Primary hover 8.4 y active 10.7; Primary active sobre Primary subtle 9.3 y sobre `#D6E4F5` 8.3; Primary sobre Surface 6.5; error `#8F1B12` sobre su fondo suave 7.9; borde fuerte `#7D8999` sobre Surface 3.6; borde `#D6DDE6` 1.4 (separador no informativo). **Texto deshabilitado `#8F99A8` sobre `#EEF2F7`: 2.6**: contraste bajo admitido por `DESIGN.md` §5.1 para texto no operable; el motivo visible va en texto secundario.

**Revisión manual asistida (sustituye temporalmente a Playwright; no lo reemplaza para cerrar CHG-04).** Edge headless 156 controlado por CDP desde un script temporal fuera del repositorio (nada instalado, script y capturas eliminados al terminar), contra `next build` + `next start` bajo Node 24.22.1:
- Viewports: móvil 360×740 y 390×844, tablet 768×1024, escritorio 1024×768 y 1280×800, ancho 1440×900; `/` y una ruta inexistente. **Sin desplazamiento horizontal en ninguno** (`scrollWidth ≤ clientWidth`), también con el menú móvil abierto.
- Cabecera 56/64 (+1 de borde), filas del menú móvil de 48, botones de 44 en móvil/tablet y 40 en escritorio, sin pie de página, landmarks `header`/`nav`/`main`.
- `/` → 200 (`robots: index, follow`); ruta inexistente → 404 con el shell, «Volver al inicio» y sin detalles técnicos (`noindex`); `/admin/acceso` y `/registrar` → 404 (no existen aún) y `/admin/**` **sin** CSP pública.
- Foco visible (anillo blanco + Primary de 2 px), orden de tabulación (los controles deshabilitados no reciben foco), menú móvil (`aria-expanded`, cierre con Escape y foco de vuelta al botón «Menú»), `prefers-reduced-motion` anula las transiciones, y `prefers-color-scheme: dark` no cambia el fondo. Hover del botón primario `#0F5FA8` → `#0C4F8C`.
- Sin violaciones de CSP observadas en la consola (solo el 404 esperado de las rutas inexistentes y ruido de extensiones del navegador).
- **Error público** (ruta temporal que lanza, no versionada y eliminada): alerta con título, texto y «Reintentar» (44/40), cabecera y aviso intactos, sin `message`, pila ni `digest` en el DOM, sin desbordamiento y `retry` operativo. **`global-error`** (ruta temporal fuera del grupo público, eliminada): se renderiza autocontenido y con estilos mediante clases, sin estilos en línea. Observaciones: (1) **framework observation — formal verification pending:** el HTML de respaldo que Next sirve antes de hidratar `global-error` contiene estilos en línea propios del framework (`_global-error.html`), que la CSP `style-src 'self'` bloquea sin degradación visual observada; se mantiene la CSP aprobada (no se añade `unsafe-inline` a los estilos) y se revisa de forma formal durante CHG-04/CHG-14; (2) el error #441 de React («error en el render de Server Components», redactado) en la consola es una **observación esperada de la prueba**, provocada por la ruta temporal ya eliminada; no es un hallazgo del producto.
- Registro de errores: el logger de CHG-01 emitió una línea `infrastructure.failure` (`routeType: render`, `digest`, sin `message`); Next imprime además su propio error por stderr (hallazgo ya diferido a CHG-14).

## Cierre formal de CHG-04 (2026-10-28)

CHG-03 está archivado: la dependencia blanda de Playwright queda satisfecha y las 12 tareas pendientes se completan con la base de CHG-03 (`chromium-desktop`, `chromium-mobile`). La implementación del Presentation Preview (`94ec074`, ya en `main`) no se rehízo; solo se añadió un `data-testid` al aviso demostrativo y las pruebas.

- **4.2 / 5.1 (navegación y landing).** `tests/e2e/public-entry.spec.ts` comprueba que los puntos de entrada existen (por rol), el orden y la separación de «Acceso Taller», que este no tiene el estilo de acción principal, que los controles no disponibles están deshabilitados, no navegan, no reciben foco y muestran «Disponible próximamente», y la igual jerarquía de las dos tarjetas. **Los destinos aprobados** (`/registrar`, `/consultar`, `/admin/acceso`) y el modo «disponible → enlace» se prueban en `src/app/_components/public-entry.test.tsx`: con `available = false` (P-1/P-2, aprobadas) el DOM no tiene `href`, así que el destino no es observable en el navegador hasta que CHG-05, CHG-06 y CHG-08 activen cada acceso. Esa es la verificación en dos etapas de OQ-1.
- **4.3.** Menú móvil: rotulado, `aria-expanded`/`aria-controls`, apertura por teclado, cierre con Escape con el foco de vuelta al botón y cierre al navegar (`chromium-mobile`).
- **4.4.** Aviso demostrativo por `data-testid`, en `/` y en el 404: sin casilla, modal ni botón de cierre, y la navegación sigue funcionando.
- **6.1.** 404 con estado, texto y «Volver al inicio» (lleva a `/`); sin «Reintentar» ni trazas, rutas internas ni `digest`.
- **6.2.** Pruebas versionadas del contenido de `error` y `global-error` (`src/app/public-error.test.tsx`: texto, rol de alerta, sin mensaje/pila/`digest`/SQL aun con un error hostil, sin estilos en línea, `retry` invocado). Además, **verificación en navegador con un mecanismo de inducción NO versionado**: dos rutas de sonda temporales (grupo público y fuera de él) que lanzan tras `connection()`, ejecutadas con Playwright contra `next build` + `next start` en ambos proyectos (4/4 verdes: alerta y «Reintentar» de 40 px en escritorio y 44 en móvil, cabecera y aviso intactos, sin texto técnico visible, sin desbordamiento, `retry` operativo, `global-error` sin atributos `style`); las sondas se eliminaron y se reconstruyó `.next`. Ninguna ruta de depuración queda en el repositorio ni en Production. Observaciones que se mantienen: el HTML de respaldo de `global-error` de Next lleva estilos en línea propios del framework (CSP `style-src 'self'` los bloquea sin degradación visible) y Next imprime su propio error por stderr; ambas se revisan en CHG-14.
- **6.3.** `LoadingPlaceholder` verificado en `public-entry.test.tsx` (rol `status`, «Cargando…» solo para tecnologías de apoyo, Surface secondary, sin spinner ni SVG); sigue sin usarse (no hay bloques que esperen datos).
- **7.1 / 7.2.** Cabeceras de seguridad y `X-Powered-By` ausente en `/`; CSP pública con `script-src 'self' 'unsafe-inline'`, `style-src 'self'`, sin orígenes de terceros; **sin CSP pública en `/admin`, `/admin/acceso` ni `/admin/**`**; la navegación de la landing (con el menú abierto en móvil) no produce violaciones de CSP ni peticiones a otro origen.
- **8.1.** `scrollWidth ≤ clientWidth` en landing y 404, con el menú abierto en móvil, en ambos proyectos; objetivos táctiles de 44 px en móvil.
- **9.1.** `SC-15` pasa a `parcial` en `TRACEABILITY.md` (evidencia de CHG-04; cierre en CHG-15); `test:trace` en verde.
- **9.2.** `lint`, `typecheck`, `test:unit` (185), `test:e2e` (34 + 4 omitidas por proyecto), `test:integration` (67), `test:coverage`, `test:trace` y `build` en verde.
- **Alcance.** Sin dependencias nuevas, sin registro/consulta/administración, sin cambios en el comportamiento temporal de los accesos y sin nuevo despliegue.
