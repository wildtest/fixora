# Tasks

> Planificación únicamente. Nada de esto se ejecuta hasta que el change esté revisado, aprobado y el usuario autorice `/opsx:apply` en la Fase 7, **con CHG-01 aplicado** (y la base de Playwright de CHG-03 para las pruebas E2E). No se instalan dependencias en este change. No hay tareas de registro, consulta, administración, base de datos ni máquina de estados.

## 1. Preflight y DoR

- [ ] 1.1 Confirmar el DoR de implementación (CHG-01 aplicado y archivado, base de Playwright de CHG-03 disponible o pruebas E2E diferidas explícitamente, AV-1 aprobado para las cabeceras y el *shell*); se verifica con una nota de aprobación en el change.
- [ ] 1.2 Releer `DESIGN.md` (PUB-01, §4.1–§4.3, §5, §6, §13.8, §14, §15, Apéndice A.2–A.4) y la guía de Tailwind 4 y de `next/font` instalada para confirmar la forma de los tokens y de las fuentes; se verifica con una nota que registra las decisiones de implementación (forma de los tokens, ubicación de los componentes).

## 2. Tokens y fundamentos visuales

- [ ] 2.1 Declarar en `globals.css` los tokens de `DESIGN.md` §5 (color, espaciado, radios y escala tipográfica) como variables del tema de Tailwind 4, solo tema claro, retirando el modo oscuro automático y la fuente Arial; se verifica con `npm run build` y la inspección de que las variables existen y de que no queda `prefers-color-scheme: dark` ni Arial.
- [ ] 2.2 Ajustar el layout raíz: `lang="es"`, Geist (400/500/600/700) y Geist Mono (reservada para el código de seguimiento) mediante `next/font`, metadatos estáticos y *robots* con *noindex* por defecto; se verifica con `npm run build` y la inspección del HTML emitido (`lang`, fuentes servidas desde el despliegue, sin recursos de terceros).
- [ ] 2.3 Comprobar el contraste de los pares de la paleta usados (texto principal, secundario y atenuado sobre fondo y superficie; texto sobre Primary; borde de campo) y registrar el resultado; se verifica con la tabla de verificación manual adjunta al change, sin declarar cumplimiento de WCAG.

## 3. Iconos y primitivas

- [ ] 3.1 Crear los iconos SVG locales necesarios (logotipo, aviso demostrativo, candado, flecha, búsqueda sin resultados, error, los de las dos tarjetas y el del menú) con `currentColor`, trazo uniforme y `aria-hidden` cuando son decorativos; se verifica con `npm run typecheck`, la revisión visual y que no se añadió ninguna librería de iconos.
- [ ] 3.2 Crear las primitivas estrictamente necesarias: botón y enlace-botón (primario, secundario, *ghost*; 40/44 de alto, radio 6), tarjeta pública, alerta/banner (Info y Error), estado vacío y contenedores de layout, con foco visible de 2 px y objetivos táctiles de 44; se verifica con `npm run lint`/`typecheck` y la revisión manual de estados (reposo, *hover*, foco, deshabilitado) contra `DESIGN.md` §6.
- [ ] 3.3 Confirmar que no se crearon campos, insignias de estado, diálogos, tablas ni el Journey; se verifica con la revisión del diff.

## 4. Shell público, navegación y aviso demostrativo

- [ ] 4.1 Crear el layout del grupo público: cabecera (64/56), franja demostrativa y contenido principal, sin pie de página, con `header`, `nav` con nombre accesible y `main`; se verifica con `npm run build` y la inspección de la estructura semántica.
- [ ] 4.2 Implementar la navegación de escritorio («Inicio · Registrar reparación · Consultar estado» y «Acceso Taller» separado y secundario con icono de candado) con destinos `/`, `/registrar`, `/consultar` y `/admin/acceso`; se verifica con una prueba Playwright en `chromium-desktop` que comprueba que los puntos de entrada existen, que su destino es la ruta aprobada, que son operables con teclado y que el acceso al taller no tiene el estilo de acción principal; **no** exige que la página destino funcional exista.
- [ ] 4.3 Implementar el menú móvil como componente de cliente mínimo (botón «Menú» rotulado de 44, filas de 48, «Acceso Taller» tras un separador, `aria-expanded`, `aria-controls`, cierre al navegar y con *Escape*), sin barra inferior; se verifica con una prueba Playwright en `chromium-mobile` que lo abre, lo opera con teclado y lo cierra.
- [ ] 4.4 Implementar la franja demostrativa (variante Info, icono, texto literal de `DESIGN.md` §13.8) sin casilla, modal ni cierre obligatorio; se verifica con una prueba Playwright (por *test id*) de que está presente en las superficies públicas y de que no impide navegar.

## 5. Landing

- [ ] 5.1 Implementar la landing (PUB-01) como componente de servidor estático: lema en Display, descripción breve y dos tarjetas con los puntos de entrada a `/registrar` y `/consultar` (presentación de igual jerarquía visual según `DESIGN.md`), una columna en móvil y margen superior de 64 en escritorio, sin secciones nuevas; se verifica con una prueba Playwright (por rol) en móvil y escritorio de que ambos puntos de entrada existen, son operables con teclado y tienen los destinos aprobados, y con la revisión manual contra PUB-01; sin páginas de relleno ni formularios simulados.
- [ ] 5.2 Configurar la landing como la única ruta indexable; se verifica con la inspección de los metadatos de `/` y de una ruta pública distinta.

## 6. No encontrado y error público

- [ ] 6.1 Implementar el `not-found` raíz que renderiza el shell público con el patrón de estado vacío (icono `search_off`, título, texto y acción primaria «Volver al inicio» hacia `/`, sin «Reintentar»); se verifica con una prueba Playwright de que una ruta pública inexistente muestra el estado y que la acción lleva a `/`, y de que no aparecen trazas ni rutas internas.
- [ ] 6.2 Implementar `error` del grupo público (alerta de Error con título, texto y «Reintentar» que usa el `reset`, ancho completo del botón en móvil, sin mensaje, nombre de excepción, pila ni `digest` de Next) y `global-error` autocontenido; la línea «Referencia» se muestra solo si existe una referencia segura propia de FIXORA disponible y la interfaz funciona igual sin ella; se verifica con una prueba con un mecanismo que induzca el error sin dejar ninguna ruta de depuración accesible en Production ni versionada, y confirmando que el contenido no muestra detalles técnicos.
- [ ] 6.3 Definir el marcador de posición de carga genérica (superficie secundaria, texto accesible «Cargando…», sin spinner) como primitiva para los slices; se verifica con la revisión visual y el texto accesible, sin usarlo donde no hay datos que esperar.

## 7. Cabeceras y CSP públicas

- [ ] 7.1 Configurar en `next.config.mjs` las cabeceras de toda la aplicación (`nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP/CORP) y `poweredByHeader: false`; se verifica con una prueba Playwright (respuesta de `/`) que comprueba su presencia y la ausencia de `X-Powered-By`.
- [ ] 7.2 Configurar la CSP pública estática sin nonce con el patrón de ruta que **excluye `/admin/**`**, partiendo de la política más estricta y añadiendo `unsafe-inline` solo donde el resultado de AV-1 lo demuestre; se verifica con la navegación de la landing sin violaciones de CSP y sin orígenes de terceros, y con la comprobación de que la CSP pública no se envía en `/admin/**`.

## 8. Responsive y accesibilidad

- [ ] 8.1 Añadir las pruebas Playwright de no desbordamiento horizontal (`scrollWidth ≤ clientWidth`) de la landing, el 404 y la navegación en `chromium-mobile` y `chromium-desktop`; se verifica con las ejecuciones en verde.
- [ ] 8.2 Realizar la revisión manual de foco visible, navegación completa por teclado (incluido el menú), movimiento reducido, objetivos táctiles de 44 y el significado sin depender del color; se verifica con la lista de comprobación registrada en el change.

## 9. Trazabilidad y verificación final

- [ ] 9.1 Actualizar `TRACEABILITY.md` con la evidencia **parcial** de `SC-15` y la distribución de la navegación en dos etapas (CHG-04: puntos de entrada y destinos aprobados; CHG-05, CHG-06 y CHG-08: funcionamiento real); se verifica con `npm run test:trace` en verde.
- [ ] 9.2 Ejecutar `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run test:e2e` y `npm run build` y registrar el resultado; se verifica con las ejecuciones en verde.
- [ ] 9.3 Revisar el alcance del diff contra `proposal.md` y la Spec: no hay registro, consulta, administración, base de datos, shell administrativo, CSP con nonce, logger, librerías nuevas ni contenido de marketing fuera de `DESIGN.md`; se verifica con el `git diff` y que `openspec validate ui-foundation-and-public-entry --strict` sigue pasando.

## Workflow follow-up

- Revisar y aprobar el change; el usuario autoriza explícitamente `/opsx:apply` en la Fase 7, con el DoR de `docs/04-planificacion/BACKLOG.md` cumplido.
- Archivar el change tras implementarlo y verificarlo: sincroniza `public-site-entry` en `openspec/specs/` (primera main spec de FIXORA).
- La verificación de la navegación es en dos etapas: CHG-04 demuestra los puntos de entrada y sus destinos aprobados; CHG-05 (registro), CHG-06 (consulta) y CHG-08 (login administrativo) extienden la evidencia E2E con el clic, el destino y el funcionamiento real. No se crean páginas de relleno.
