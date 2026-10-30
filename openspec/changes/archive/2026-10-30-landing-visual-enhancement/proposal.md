## Why

La landing `PUB-01` ya replica la narrativa del diseño Stitch aprobado (change `landing-visual-fidelity`), pero es sobria: sin una ilustración propia de la actividad del taller y sin una sección que explique, con el flujo real de V1, qué acompaña FIXORA. El propietario autoriza una segunda y última mejora visual muy acotada para que la landing sea más ilustrativa y memorable sin perder la identidad Trusted Tech.

## What Changes

- Ilustración principal local (SVG, sin gradientes ni recursos externos) en el hero: equipo, reparación y seguimiento digital, rotulada como conceptual.
- Apoyos visuales ligeros: nodos de etapa en la banda de claridad técnica, miniaturas en los tres pasos de «¿Cómo funciona?» y tarjetas de privacidad con más jerarquía.
- Nueva sección «Servicios para acompañar tu reparación» con cuatro tarjetas basadas solo en el flujo V1: registro, diagnóstico y costo estimado, seguimiento del avance, entrega y cierre.
- Microinteracciones CSS discretas (elevación suave al pasar el cursor), desactivadas con `prefers-reduced-motion`.
- Sin cambios de lógica, datos, Prisma, autenticación, Server Actions, limitador, seguridad ni configuración de Production. Sin dependencias nuevas.

## Capabilities

### New Capabilities
Ninguna.

### Modified Capabilities
- `public-site-entry`: se añaden requisitos de presentación visual de la landing y de la sección de servicios (solo presentación; ningún requisito de negocio nuevo).

## Impact

- `src/app/_components/landing-sections.tsx`, nuevo `src/app/_components/landing-illustrations.tsx`, `src/app/(public)/page.tsx`, `src/app/globals.css`.
- Pruebas de componentes y E2E de `PUB-01`; `DESIGN.md` §3.1.
- Sin impacto en rutas, API, base de datos ni Production salvo el despliegue estático de la landing.
