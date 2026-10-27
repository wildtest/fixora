# Proposal

## Why

FIXORA debe tener un despliegue público de demostración en Vercel (`SC-20`) y una ruta segura y reproducible desde `main` hasta Production. Hoy no existe ningún entorno remoto: sin una línea base que separe el runtime, las migraciones privilegiadas, Preview, las pruebas y la recuperación, el primer despliegue se improvisaría con riesgo de mezclar credenciales (`DIRECT_URL` junto al runtime, Preview con acceso a datos de Production) y sin forma de revertir.

## What Changes

- **Vercel Production** desde `main`, con Node 24.x, instalación con `npm ci` y variables solo de Production.
- **Neon Production** (rama `main`) vía Vercel Marketplace, con el rol de aplicación *pooled* para el runtime y auditoría de las variables que la integración inyecte.
- **Aislamiento de secretos** por capacidad: runtime (Vercel Production), migración (entorno GitHub `production`) y pruebas (entorno `test` de CHG-03).
- **Flujo `migrate-production`**: manual, desde `main`, con SHA explícito aprobado, forward-only y expand/contract, antes de fusionar un cambio de esquema.
- **Preview sin base de datos**, sin credenciales y sin ramas de BD por Preview.
- **Verificación de privilegios** del rol runtime por catálogo, sin endpoint.
- **Smoke de infraestructura público y no mutante** tras el despliegue (el smoke de release con orden demo es de CHG-15).
- **Rollback de aplicación y recuperación de BD** como procedimientos separados, y runbooks mínimos de migración, recuperación y *break-glass*.

## Capabilities

### New Capabilities
Ninguna. Es un change de entrega (`SKIP_SPECS`): no introduce comportamiento funcional observable por el cliente ni el administrador.

### Modified Capabilities
Ninguna.

## Impact

- **Documentos que respaldan el cambio:** Technical Design §25.1, §25.4–§25.6, §26, §27 (riesgos 8, 10, 14, 15), §28; ADR-003, ADR-007, ADR-009 y ADR-010; backlog `CHG-07`.
- **Criterios PRD:** evidencia parcial de `SC-19` y línea base de `SC-20`. El cierre de `SC-20` (flujo principal demostrable, *seed* ficticio, smoke completo) es de CHG-15.
- **Código y artefactos afectados (cuando se implemente):** un workflow de GitHub `migrate-production`, scripts operativos acotados, configuración de Vercel y Neon, y documentación operativa en `docs/09-deploy/`. No toca código funcional de la aplicación.
- **Dependencias:** ninguna nueva en el proyecto. Cualquier herramienta (CLI de Vercel, token, API de Neon) requeriría una aprobación explícita nueva.
- **Fuera de alcance:** funcionalidades, autenticación, consulta y seguimiento, Security Pass (CHG-14), preparación final de release y *seed* (CHG-15), monitoreo externo, copias de seguridad propias y dominio propio obligatorio. No se configura ninguna plataforma real durante la Fase 6.
- **Orden:** Hard CHG-02 y CHG-03; entrega frente a CHG-06 (el contenido que el smoke consulta); posición temprana recomendada; no bloquea ningún change funcional. AV-3 se ejecuta con el primer despliegue real, en la Fase 7.
