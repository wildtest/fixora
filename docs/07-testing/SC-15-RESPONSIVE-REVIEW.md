# Revisión estructurada de `SC-15` — responsive (público y administración)

> Evidencia de CHG-15 (D6). **Alcance honesto:** es una revisión manual **estructurada y guiada por automatización** (el agente recorrió los flujos en un navegador real, midió el desplazamiento horizontal y **inspeccionó visualmente** las capturas). **No** es un estudio de usabilidad, ni certificación WCAG, ni una prueba con usuarios (`VAL-03` sigue abierta). Playwright responsive apoya (`tests/e2e/*.spec.ts` ejecuta cada flujo en escritorio y móvil) pero no sustituye esta revisión. Datos ficticios; sin PII ni códigos reales en la evidencia. Fecha: 2026-10-29 · build de producción local (`next build` + `next start`) sobre la rama Neon `test`.

## Viewports

Los de la matriz de Playwright del repositorio (TD §24; `DESIGN.md` §14 no fija *breakpoints*):

| Proyecto | Viewport |
|---|---|
| `chromium-desktop` | 1280 × 720 |
| `chromium-mobile` (Pixel 7) | 412 × 839 |

## Criterios (PRD `SC-15`, `DESIGN.md` §14)

C1 el flujo se completa · C2 acciones principales visibles y utilizables · C3 etiquetas comprensibles · C4 **sin desplazamiento horizontal de la página** (medido: `scrollWidth ≤ clientWidth`) · C5 Público antes que Interno en móvil · C6 Repair Journey utilizable (horizontal en escritorio, vertical en móvil) · C7 diálogos/hojas inferiores utilizables · C8 formularios sin truncamiento funcional.

## Flujo público

| Pantalla / flujo | Escritorio | Móvil | Observación |
|---|---|---|---|
| Landing con aviso de demostración y accesos | PASS (sin desbordamiento) | PASS (sin desbordamiento) | El aviso es visible en ambos; el menú móvil se despliega (E2E `public-entry.spec.ts`) |
| Registrar: formulario (siete campos, selector de tipo de equipo de seis opciones, aviso de privacidad de la descripción) | PASS | PASS | En móvil los seis tipos se muestran en rejilla de dos columnas con objetivos grandes; el botón queda deshabilitado hasta completar los obligatorios y lo explica |
| Registrar: confirmación con el código y las advertencias de conservarlo | PASS | PASS | El código es legible y copiable (E2E `register.spec.ts`) |
| Consultar: formulario con ayuda para el código perdido | PASS | PASS | Sin recuperación pública, según el PRD |
| Consultar: resultado (estado, equipo, descripción, Repair Journey, historial, diagnóstico y costo, notas del taller) | PASS | PASS | Journey **horizontal** en escritorio y **vertical** en móvil; el historial va del más reciente al más antiguo; las secciones de diagnóstico/costo y de notas son tarjetas separadas |

## Flujo administrativo

| Pantalla / flujo | Escritorio | Móvil | Observación |
|---|---|---|---|
| Inicio de sesión (`/admin/acceso`) | PASS | PASS | Cubierto por `tests/e2e/admin-access.spec.ts` (sesión, cookie, expiración) |
| Panel (conteos por estado y recientes) | PASS | PASS | Navegación lateral en escritorio; pestañas «Dashboard / Listado de órdenes» en móvil |
| Directorio (búsqueda, filtro, paginación) | PASS | PASS | Tarjetas en móvil, filas en escritorio (`tests/e2e/admin-orders.spec.ts`) |
| Detalle: cabecera, Journey, acciones del ciclo de vida | PASS | PASS | Journey horizontal / vertical; «Avanzar» (primaria) y «Cancelar orden» (destructiva) apiladas en móvil |
| Detalle: Público antes que Interno | PASS (dos columnas, Público a la izquierda) | **PASS** (una columna: Público, luego Interno) | Cinco señales de diferenciación (etiqueta, icono, encabezado, borde continuo/discontinuo y posición) visibles |
| Detalle: diagnóstico, costo y notas | PASS | PASS | Congelado con candado desde Esperando aprobación; compositores de nota con «Lo verá el cliente» / «Solo la verá el taller» |
| Detalle: «Editar datos» (edición en línea) | PASS | PASS | Campos en su bloque, «Guardar cambios» y «Cancelar edición»; el código no es editable |
| Diálogo de confirmación (E11) y de cancelación | PASS | PASS | En móvil es una **hoja inferior** con acciones apiladas, foco inicial seguro y texto completo; sin truncamiento |
| Transición válida (ciclo de vida completo) | PASS | PASS | Ejecutada en `tests/e2e/repair-lifecycle.spec.ts` y `diagnosis-estimate.spec.ts` (E2E-01) en ambos proyectos |

## Resultado

**22 de 22 capturas/pantallas sin desplazamiento horizontal** (11 en escritorio y 11 en móvil). Sin fallos abiertos. Límites: no se probaron navegadores distintos de Chromium, ni lectores de pantalla, ni tamaños intermedios o de tableta; no se afirma conformidad WCAG.

Procedimiento reproducible: se sembró una orden ficticia en *Esperando aprobación* con diagnóstico, costo y notas pública e interna, se recorrió el flujo en ambos viewports con Playwright y se midió `scrollWidth`/`clientWidth` de cada pantalla; las capturas se inspeccionaron visualmente y se descartaron (no se versionan).
