# Proposal

## Why

La auditoría final de la Fase 15 detectó que la landing `PUB-01` desplegada cumple funcionalmente pero quedó demasiado simplificada respecto a la referencia visual aprobada (`docs/02-diseno/referencias/stitch/consolidado-desktop/PUB-01.png` y `consolidado-mobile/PUB-01.png`): solo conserva cabecera, aviso demostrativo, lema y dos tarjetas. La referencia aprobada incluye una narrativa completa (insignia, hero en dos líneas con énfasis, tarjetas enriquecidas, banda de claridad técnica, «¿Cómo funciona?», «Privacidad y control absoluto» y pie). El propietario autorizó **una única corrección post-release de fidelidad visual**, que no es una fase nueva del plan maestro ni amplía V1.

## What Changes

- **Hero**: insignia «SISTEMA DE SEGUIMIENTO ABIERTO», lema en dos líneas con énfasis Primary en «siempre bajo control.» y descripción más elaborada.
- **Tarjetas principales** (misma jerarquía, mismos destinos): «Registrar reparación» (etiqueta «NUEVO REGISTRO», descripción, elemento visual técnico ilustrativo, enlace real a `/registrar`) y «Consultar reparación» (etiqueta «MONITOREO INMEDIATO», descripción, representación visual **ilustrativa y no funcional** del código de seguimiento, enlace real a `/consultar`).
- **Banda «Claridad técnica en tiempo real sin fricción»** con una demostración visual estática del concepto Repair Journey, rotulada como ilustrativa y sin datos de ninguna orden.
- **«¿Cómo funciona el proceso?»**: tres tarjetas 01 Registra tu equipo · 02 Recibe tu código · 03 Consulta el avance.
- **«Privacidad y control absoluto»**: Sin cuentas ni contraseñas · Trazabilidad de estado · Protección de datos personales, con redacción respaldada por el producto real.
- **Pie** de la landing: «FIXORA © 2026 · Tu reparación, siempre bajo control» y el aviso demostrativo.
- Tokens, tipografía (Geist; Geist Mono solo para el código ilustrativo) e iconografía local sin cambios; sin gradientes ni imágenes de stock.

## Capabilities

### New Capabilities
Ninguna.

### Modified Capabilities
- `public-site-entry`: se **añade** un requisito de presentación narrativa de la landing (secciones y marcado ilustrativo). Los requisitos existentes no cambian.

## Dependencias

- Parte de `public-site-entry` (CHG-04 archivado) y de los puntos de entrada de CHG-05, CHG-06 y CHG-08, ya activos. Sin dependencias de otros changes activos (no hay ninguno).

## Impact

- **Documentos que respaldan el cambio:** `DESIGN.md` (§3.1 PUB-01, §5, §6.6, §13.8, §14, §15, §16), `UX-EXPLORATION.md` (§9, PUB-01), capturas aprobadas de Stitch (evidencia visual), main spec `public-site-entry`.
- **Contradicción documental señalada:** `DESIGN.md` §3.1 describe PUB-01 de forma mínima (lema, descripción, dos accesos, aviso), mientras que la referencia Stitch aprobada incluye la narrativa completa. La autorización expresa del propietario resuelve la discrepancia a favor de la referencia visual; este change actualiza `DESIGN.md` §3.1 de forma explícita y trazable. No se añaden pantallas ni funcionalidad.
- **Elementos de la captura que NO se reproducen** (no respaldados por el PRD): campo de entrada funcional en la tarjeta de consulta, códigos de ejemplo `FX-2026`/`EJ-8921`, hora y «Paso 2 de 3» de una orden, «TOKEN ACTIVO», fotografía, «Taller activo / 14 órdenes», navegación inferior y «24/7 Live».
- **Código afectado:** `src/app/(public)/page.tsx` y componentes presentacionales nuevos bajo `src/app/_components/`; iconos locales; pruebas unitarias y E2E de PUB-01.
- **Dependencias:** ninguna nueva.
- **Fuera de alcance:** lógica de negocio, Prisma, base de datos, migraciones, autenticación, sesiones, administración, seguimiento, registro, Server Actions, limitador, modelo de seguridad y configuración de Production.
