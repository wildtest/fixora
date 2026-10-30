# Tasks

> Corrección post-release autorizada por el propietario (fidelidad visual de `PUB-01`). Sin lógica de negocio, datos, autenticación ni Production.

## 1. Preparación

- [ ] 1.1 Releer `DESIGN.md`, `UX-EXPLORATION.md`, la main spec `public-site-entry`, CHG-04 archivado, el layout actual, las capturas de Stitch y las pruebas de `PUB-01`; confirmar que no se tocan los puntos de entrada ni el shell de otras pantallas.

## 2. Implementación

- [ ] 2.1 Añadir los iconos locales necesarios (sin librería) y los componentes presentacionales de la landing (tarjetas, banda, pasos, privacidad, pie).
- [ ] 2.2 Reescribir `src/app/(public)/page.tsx` con la estructura D2: hero con insignia y lema en dos líneas, tarjetas de entrada enriquecidas (con enlaces reales mediante `EntryPoint`), banda de seguimiento ilustrativa, «¿Cómo funciona el proceso?», «Privacidad y control absoluto» y pie con aviso demostrativo.
- [ ] 2.3 Verificar que el código y el progreso ilustrativos están rotulados, sin `input`, sin códigos verosímiles y sin datos de órdenes.

## 3. Pruebas

- [ ] 3.1 Actualizar las pruebas unitarias/E2E de `PUB-01`: secciones aprobadas presentes, encabezados semánticos, CTA de registro y consulta con destino real, acceso al taller, aviso demostrativo, sin `input` en la landing, escritorio y móvil, sin desplazamiento horizontal.

## 4. Verificación

- [ ] 4.1 Comparación visual explícita contra la referencia aprobada (estructura, jerarquía, espaciado, color, tarjetas, secciones, densidad, responsive) en escritorio, tableta y móvil; registrar el resultado.
- [x] 4.2 Regresión: lint, typecheck, pruebas unitarias, cobertura, integración, E2E, build, `ci:secrets` y `ci:audit`.
- [ ] 4.3 Actualizar `DESIGN.md` §3.1 (PUB-01) y `docs/README.md`/`CLAUDE.md` si corresponde, de forma explícita y trazable.

## 5. Entrega

- [ ] 5.1 Rama `fix/landing-visual-fidelity`, commit con rutas explícitas, PR, `static` y `db-tests` en verde y fusión sin push directo a `main`.
- [ ] 5.2 Validar Production tras el despliegue (landing en escritorio y móvil, CTA de registro y consulta, acceso taller, aviso demostrativo) sin crear datos.
- [ ] 5.3 Archivar el change y verificar `openspec validate --all --strict`, `openspec list`, `openspec list --specs` y `openspec doctor` (0 changes activos).

## Registro de la comparación visual (4.1)

Capturas de la compilación de producción local comparadas con `consolidado-desktop/PUB-01.png` y `consolidado-mobile/PUB-01.png` (1280, 820 y 412 de ancho; sin desbordamiento horizontal en los tres). **Fidelidad visual alta**: misma estructura y orden (insignia, lema en dos líneas con énfasis azul, dos cards enriquecidas, banda de claridad con progreso, tres pasos, tres tarjetas de privacidad y pie), misma jerarquía, densidad y paleta Trusted Tech. Diferencias deliberadas: sin campo de consulta, sin códigos ni horas de ejemplo, sin fotografía ni gradientes, y los destinos reales de los accesos. No se pretende fidelidad píxel a píxel.
