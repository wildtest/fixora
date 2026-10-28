# Proposal

## Why

FIXORA parte de un scaffold de Next.js en JavaScript, sin tipos, sin capas, sin logger ni contrato de errores y sin ejecutor de pruebas. El Technical Design aprobado (TD §3, §5, §6, §18, §21.2, §23; ADR-001, ADR-008, ADR-010) exige que el servidor sea la autoridad, que `domain/` sea independiente y que lo sensible no pueda filtrarse por logs o por imports equivocados. Esas garantías deben existir **antes** de escribir comportamiento: si no, cada change funcional posterior (registro, consulta, acceso, ciclo de vida) tendría que inventar su propia convención y la deuda se acumularía en las superficies donde viven `SC-11` y `SC-12`.

## What Changes

- Migrar el scaffold de JavaScript a **TypeScript con `strict`**, con **ESM** y el **Node 24.x** como runtime objetivo del proyecto (el entorno local actual es Node 26.x; su alineación es condición de entrada de la implementación, no parte de este change).
- Establecer la **estructura física inicial por capas** `src/app → application → domain` e `infrastructure`, con la dirección de dependencias aprobada y **reglas de lint** que impidan los imports prohibidos (`domain` no depende de nada; `infrastructure` no importa `application`; `src/app` no accede a infraestructura directamente; sin ciclos).
- Añadir reglas de **seguridad en lint**: `no-console` fuera del logger, sin `dangerouslySetInnerHTML`, `eval` ni `new Function`, y marcado `server-only` de los módulos que correspondan.
- Crear la **fundación de observabilidad del servidor**: el **logger propio, cerrado y `server-only`** (JSON estructurado con esquema tipado y lista blanca de campos, sin mensaje libre ni serialización de errores u objetos arbitrarios) y su integración técnica con Next mediante `instrumentation.ts`/`onRequestError`, que registra los errores inesperados del servidor solo con campos permitidos (nunca `error.message`, rutas con *query*, cabeceras ni cookies).
- Crear el **contrato estructural estable `ActionResult`** (la forma es global; los códigos concretos los define cada change posterior, no hay registro central) y la **frontera de errores inesperados** `runAction` (`INTERNAL_ERROR` con referencia opaca; no es un `catch` universal y no captura el control de flujo de Next como `redirect()` o `notFound()`).
- Crear los **validadores y helpers base** realmente transversales (resultado de validación por campo, rechazo de `U+0000`, `trim` de campos de negocio) sin reglas de negocio: no define reglas de nombre, teléfono, correo, equipo, tracking, diagnóstico ni dinero.
- Añadir el **ejecutor mínimo de Vitest** para probar la lógica pura de la fundación, sin cobertura ni infraestructura de integración.
- Convertir los archivos actuales del scaffold a TypeScript conservando su comportamiento visible.

Es un cambio puramente técnico: **no introduce ningún comportamiento observable del producto**.

## Capabilities

### New Capabilities
Ninguna. Este change no tiene delta specs; se declara `skip_specs: true` en su `.openspec.yaml`.

### Modified Capabilities
Ninguna.

## Impact

- **Documentos que respaldan el cambio:** Technical Design §3, §4.2, §5, §6, §18, §21.2, §21.6, §23; ADR-001 (capas), ADR-008 (calidad), ADR-010 (observabilidad); backlog `CHG-01` (`docs/04-planificacion/BACKLOG.md`).
- **Criterios PRD:** no cubre ningún `SC-*` ni `E*` de forma primaria. Habilita, sin satisfacerlos, `SC-11` y `SC-12` (fronteras de capas, `server-only` y logger sin datos sensibles) y las pruebas de todos los changes posteriores.
- **Código afectado:** todo el scaffold actual (`src/app/*`, `eslint.config.mjs`, `jsconfig.json`; nuevos `src/instrumentation.ts` y módulos de la fundación) y la configuración raíz (`package.json`, `tsconfig.json`, `.nvmrc`). `next.config.mjs` se mantiene.
- **Dependencias:** requerirá instalar explícitamente TypeScript (versión estable compatible, elegida en el preflight de la Fase 7), los tipos de Node/React y Vitest (con `vite`, su *peer* obligatorio). `server-only` no se instala por defecto (en Vitest se sustituye por un *stub* de prueba). Validación previa ya cumplida: AV-2 Early ESM Precheck y AV-2 Full Persistence ✅ PASS, sin ampliar el alcance de este change. **No se instala nada en este change de planificación**; cada dependencia se aprueba explícitamente en la Fase 7 (ver `design.md`).
- **Fuera de alcance:** modelo de dominio de reparaciones, Prisma y PostgreSQL (CHG-02), CI, cobertura y Playwright (CHG-03), tokens y UI de producto, y la **presentación de errores** (`error.tsx`, `global-error.tsx`, `not-found.tsx` y los patrones del Apéndice A) (CHG-04), registro, consulta pública, autenticación, sesiones, ciclo de vida, notas, despliegue y cualquier funcionalidad de producto.
