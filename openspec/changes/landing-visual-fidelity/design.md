# Design

## Context

La landing actual (`src/app/(public)/page.tsx`) tiene lema, descripción y dos tarjetas. La referencia aprobada (Stitch consolidado, escritorio y móvil) es más rica. Se restaura la estructura y la jerarquía **sin** reproducir lo que el PRD no respalda ni introducir una identidad visual nueva.

## Decisions

- **D1 — Solo presentación.** Cambios en `page.tsx` y componentes presentacionales (Server Components, sin estado ni cliente). Sin acciones, sin datos, sin dependencias nuevas.
- **D2 — Estructura (orden):** (1) hero con insignia, lema en dos líneas (énfasis `text-primary` en «siempre bajo control.») y descripción; (2) dos tarjetas de entrada, mismas jerarquía y ancho; (3) banda «Claridad técnica en tiempo real sin fricción»; (4) «¿Cómo funciona el proceso?» con tres tarjetas; (5) «Privacidad y control absoluto» con tres tarjetas; (6) pie.
- **D3 — Encabezados.** Un único `h1` (el lema); `h2` por sección; `h3` por tarjeta de las secciones 3–5. Las dos tarjetas de entrada conservan `h2` y el `listitem` de su lista (`data-testid="entry-cards"`) para no mezclarlas con las demás tarjetas.
- **D4 — Elementos ilustrativos, rotulados.** Tarjeta de registro: pequeño panel «Generación instantánea» con una barra decorativa (sin la leyenda «TOKEN ACTIVO», que afirmaría un estado). Tarjeta de consulta: **no** hay `input`; se muestra una representación visual del código en Geist Mono como 12 marcadores `•` agrupados de a 4, rotulada «Ilustración: así se ve un código de seguimiento», con `aria-hidden` en la representación gráfica y el rótulo accesible en texto. No se usan `FX-2026`, `EJ-8921` ni otro código verosímil. La longitud de 12 corresponde al formato real (`tracking-code.ts`) sin generar un código.
- **D5 — Banda de seguimiento.** Panel rotulado «Ejemplo ilustrativo» con el Repair Journey **conceptual**: las siete etapas con sus nombres exactos del PRD (`JOURNEY_STAGES`/`statusLabel`), marcadas de forma estática (tres completadas, una actual), sin fechas, sin código de orden y sin hora. Sin datos reales y sin reutilizar `RepairJourney` (que exige un `Journey` con fechas); se reutilizan las mismas formas de marcador (completado/actual/pendiente) con clases locales. Horizontal en escritorio y vertical en móvil, con la misma regla de no desbordar.
- **D6 — Copy.** Se usa el copy de la referencia saneado: «SISTEMA DE SEGUIMIENTO ABIERTO», «NUEVO REGISTRO», «MONITOREO INMEDIATO», «¿Cómo funciona el proceso?», «Privacidad y control absoluto». Se descartan los textos que prometen algo no implementado («Actualización al instante», «Ejemplos demo», «60 segundos», «Sin registros engorrosos»). Privacidad: «Sin cuentas ni contraseñas» (consulta solo con el código), «Trazabilidad de estado» (historial de cambios de estado visible al cliente) y «Protección de datos personales» (la consulta pública no muestra teléfono, correo ni notas internas). Sin afirmaciones de cifrado, certificación o cumplimiento.
- **D7 — Pie.** Dentro del contenido de la landing (el shell compartido no tiene pie y no se modifica para otras pantallas): «FIXORA © 2026 · Tu reparación, siempre bajo control» y el aviso demostrativo. El texto del aviso del pie es el mismo mensaje de §13.8; las pruebas existentes que buscan la franja usan `data-testid="demo-notice"`, sin ambigüedad.
- **D8 — Sistema visual.** Tokens existentes (Primary `#0F5FA8`, superficies, líneas), Geist y Geist Mono (solo el código ilustrativo), iconos SVG locales nuevos en `icons.tsx`/`landing-icons`, sin gradientes, sin fotos, sin sombras fuera de las aprobadas. Etiquetas pequeñas en mayúsculas con `text-caption` y tracking (insignia y etiquetas de tarjeta).
- **D9 — Responsive y accesibilidad.** Móvil primero: una columna; tarjetas de entrada en dos columnas desde `md`, tarjetas de 3 columnas desde `md`/`lg` según densidad; banda en dos columnas desde `lg`. Iconos decorativos `aria-hidden`; foco visible heredado; contraste con los pares aprobados; sin movimiento. Objetivos táctiles ≥ 44 en móvil (los enlaces de las tarjetas reutilizan `EntryPoint`).
- **D10 — Documentación.** `DESIGN.md` §3.1 PUB-01 se actualiza para registrar la narrativa restaurada y los elementos ilustrativos (decisión del propietario).

## Risks / Trade-offs

- La fidelidad se evalúa visualmente contra las capturas (no píxel a píxel); se documenta en la tarea de verificación visual.
- Más contenido estático en la landing: es una ruta estática, sin impacto en datos ni en seguridad.
