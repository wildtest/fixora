# Tasks

> Segunda y última mejora visual post-release autorizada por el propietario (solo presentación de `PUB-01`). Sin lógica de negocio, datos, autenticación ni Production.

## 1. Preparación

- [x] 1.1 Releer la main spec `public-site-entry`, `DESIGN.md` §3.1, `landing-visual-fidelity` archivado y las pruebas de `PUB-01`.

## 2. Implementación

- [x] 2.1 Crear `landing-illustrations.tsx` con la ilustración del hero y las miniaturas de los pasos (SVG local, tokens, sin gradientes, decorativas).
- [x] 2.2 Enriquecer hero, banda de claridad técnica, pasos y privacidad conservando la estructura aprobada.
- [x] 2.3 Añadir la sección «Servicios para acompañar tu reparación» (cuatro tarjetas) entre «¿Cómo funciona?» y «Privacidad y control».
- [x] 2.4 Microinteracción `.lift` con `prefers-reduced-motion`.

## 3. Pruebas

- [x] 3.1 Actualizar pruebas de componentes y E2E: ilustración, sección y cuatro servicios, CTA, aviso demo, pie, sin `input`, sin claims no respaldados, sin desbordamiento.

## 4. Verificación

- [x] 4.1 Capturas a 1440/1024/820/412/375: sin desbordamiento horizontal en ningún ancho; hero con ilustración a dos columnas en escritorio y apilado (copy → ilustración → tarjetas) en tableta/móvil; sección de servicios en 4/2/1 columnas. Más ilustrativa y completa que la versión anterior, conservando la estructura aprobada y la identidad Trusted Tech.
- [x] 4.2 Regresión local (HEAD del PR): lint OK, typecheck OK, unit 618/618, cobertura (domain 100 % líneas, 97,43 % ramas), integración 262/262, trace 37/37, `ci:secrets` OK, `ci:audit` OK, build OK, `openspec validate --all --strict` 9/9.
  - **Full local E2E: NOT COMPLETED — el runner local agotó la memoria** (un intento falló por un error transitorio de Turbopack al coincidir con otra suite; el siguiente fue detenido por el sistema por falta de memoria; limitación de infraestructura, no fallo de pruebas).
  - **Targeted PUB-01 E2E (`public-entry.spec.ts`, escritorio y móvil): PASS** — 34 pasan, 4 omitidas por diseño.
  - **Full E2E regression: delegada a GitHub CI**: `db-tests` ejecuta `npm run test:e2e` completo (build + Playwright `chromium-desktop` y `chromium-mobile`) tras la integración, en el runner aislado establecido.
- [x] 4.3 Actualizar `DESIGN.md` §3.1.

## 5. Entrega

- [ ] 5.1 Rama `fix/landing-visual-enhancement`, PR, `static` y `db-tests` en verde, fusión sin push directo a `main`.
- [ ] 5.2 Validar Production sin crear datos.
- [ ] 5.3 Archivar y verificar OpenSpec (0 changes activos).
