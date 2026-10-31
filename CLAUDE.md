# CLAUDE.md — FIXORA

Lee también `AGENTS.md`: esta versión de Next.js tiene cambios incompatibles con lo que podrías conocer. Antes de escribir código de Next.js, consulta la guía correspondiente en `node_modules/next/dist/docs/`.

## Contexto

**FIXORA** — "Tu reparación, siempre bajo control."

Aplicación web responsive para pequeños servicios técnicos de reparación de equipos tecnológicos. Proyecto final de la especialización "Desarrollo de Software AI-First con Claude".

## Problema que resuelve

Muchos pequeños servicios técnicos gestionan las reparaciones por WhatsApp, llamadas, papel o Excel. Eso desorganiza el taller y obliga al cliente a preguntar repetidamente por el estado de su equipo.

## Usuarios V1

- **Cliente** (sin cuenta): registra una solicitud de reparación, recibe un código de seguimiento y consulta después el estado con ese código.
- **Administrador** (zona protegida): consulta órdenes, registra diagnóstico y costo estimado, actualiza estados, agrega información pública, mantiene notas internas y consulta el historial.

## Estados (flujo conceptual)

Solicitud recibida → Equipo recibido → En diagnóstico → Esperando aprobación → En reparación → Listo para recojo → Entregado. Además existe **Cancelado** cuando las reglas de negocio lo permitan.

No todas las transiciones son válidas (p. ej. una solicitud nueva no puede pasar directamente a Entregado). La matriz exacta de transiciones y sus reglas están aprobadas en el PRD (`docs/01-producto/PRD.md`, §4.4); el Technical Design decide cómo se implementan.

## Diferenciadores aprobados

1. Repair Journey visual.
2. Seguimiento por código sin cuenta de cliente.
3. Máquina de estados real con transiciones controladas.
4. Separación estricta entre información pública y notas internas.

## Alcance V1

Landing · registro de solicitud · código de seguimiento · consulta pública · timeline de estados · login administrativo · dashboard · listado y búsqueda de órdenes · detalle de orden · diagnóstico · costo estimado · cambio controlado de estados · historial de cambios · notas públicas · notas internas · persistencia de datos · testing E2E · Security Pass · CI/CD · deploy en Vercel.

## Fuera de alcance V1

Cuentas, registro/login y recuperación de contraseña de clientes · múltiples roles administrativos · múltiples técnicos con permisos distintos · multiempresa · múltiples sucursales · inventario de repuestos · facturación · pagos online · WhatsApp automático · SMS · email automático · fotos de dispositivos · firma digital · app móvil · diagnóstico con IA · chat cliente-técnico.

## Mapa documental

Fuente de verdad en `docs/` (ver `docs/README.md`). Cada documento consume el anterior.

| Fase | Ruta |
|---|---|
| 00 Definición | `docs/00-definicion/PROJECT-BRIEF.md` |
| 01 PRD | `docs/01-producto/PRD.md` |
| 02 Diseño | `docs/02-diseno/` |
| 03 Arquitectura (Technical Design + ADRs) | `docs/03-arquitectura/` |
| 04 Backlog / planificación | `docs/04-planificacion/` (estrategia `OPENSPEC-STRATEGY.md` y backlog maestro `BACKLOG.md`) |
| 05 Specs / OpenSpec | `openspec/specs/` (Specs canónicas) y `openspec/changes/` (propuestas); no hay copia paralela en `docs/05-specs/` |
| 06 Diagramas | `docs/06-diagramas/` |
| 07 Testing | `docs/07-testing/` |
| 08 Seguridad | `docs/08-seguridad/` |
| 09 Deploy | `docs/09-deploy/` |

## Fuente de verdad funcional

`docs/00-definicion/PROJECT-BRIEF.md` es el punto de partida. **`docs/01-producto/PRD.md` es la fuente de verdad funcional aprobada de FIXORA V1**; el detalle vigente del alcance, el no alcance, los criterios de éxito (`SC-*`), los casos borde (`E*`) y los supuestos y riesgos (`SUP-*`, `VAL-*`, `RIE-*`) está allí. Las fases siguientes derivan de esos documentos.

Lee el PRD antes de:

- proponer funcionalidad;
- diseñar pantallas;
- tomar decisiones de arquitectura que dependan del producto;
- crear backlog;
- crear specs;
- implementar comportamiento funcional.

No modifiques silenciosamente decisiones del PRD. Si una fase posterior exige cambiar una decisión de producto aprobada, señala primero la contradicción y actualiza la documentación de forma explícita y trazable.

## Estado actual del proyecto

**Snapshot final (2026-10-30, `main` `030aaf7`):**

```text
FIXORA V1: COMPLETE
Production: READY FOR ACADEMIC DEMO  (https://fixora-rho-one.vercel.app)
OpenSpec: 0 active changes · 8 main specs
Calidad: 618 unit · 262 integration · E2E completa en GitHub CI · coverage domain 100 % líneas / 97,43 % ramas · trazabilidad 37/37
Seguridad: Security Pass con 0 Critical y 0 High
```

- **No** está aprobada para operación real: `VAL-04` sigue abierta. La demo puede recibir datos reales pese al aviso.
- **Fase 15 (README, portfolio y auditoría final): en cierre.** Dependen de la persona propietaria: capturas finales, decisión de licencia, topics de GitHub y la auditoría académica final.
- Las 8 main specs son `public-site-entry`, `repair-request-registration`, `public-order-tracking`, `admin-access`, `admin-order-management`, `repair-lifecycle`, `diagnosis-and-estimate` y `order-notes`. CHG-01…CHG-15 y las mejoras posteriores `landing-visual-fidelity` y `landing-visual-enhancement` están archivados en `openspec/changes/archive/`.

| Fase | Ruta | Estado |
|---|---|---|
| 00 Definición | `docs/00-definicion/` | Completada |
| 01 PRD | `docs/01-producto/` | Completada (aprobado 2026-10-25) |
| 02 Diseño | `docs/02-diseno/` | Completada (`DESIGN.md` aprobado 2026-10-26) |
| 03 Arquitectura | `docs/03-arquitectura/` | Completada (Technical Design + ADR-001…010; AV-1/2/3 en PASS) |
| 04 Backlog | `docs/04-planificacion/` | Completada |
| 05 Specs / OpenSpec | `openspec/` | Completada: 16 changes implementados y archivados |
| Implementación | `src/`, `prisma/`, `tests/` | Completada (V1, hitos M0…M5) |
| 06 Diagramas | `docs/06-diagramas/` | Completada (índice, CI/CD y pipeline AI-First; el resto en el Technical Design) |
| 07 Testing | `docs/07-testing/` | Implementado |
| 08 Seguridad | `docs/08-seguridad/` | Implementado |
| 09 Deploy | `docs/09-deploy/` | Implementado (Production, CI/CD, runbooks, release readiness) |

Historia: las menciones a «pendiente» o «aún no implementado» en documentos de fases anteriores (p. ej. el Technical Design) describen el momento en que se redactaron.

### Fuentes de verdad

- `PRD.md` es la **fuente de verdad funcional**. `UX-EXPLORATION.md` fija la estructura UX y la navegación aprobadas (nueve pantallas). `DESIGN.md` es la fuente visual y de detalle UX/UI; no sustituye al PRD en reglas funcionales. Jerarquía: PRD > UX-EXPLORATION > DESIGN.md > artefactos y capturas (solo referencia).
- Cualquier trabajo de UI parte de **PRD + UX-EXPLORATION + DESIGN.md**. No introduzcas silenciosamente nuevas pantallas, flujos ni funcionalidades; las capturas de Stitch son evidencia, no requisitos (`UX-EXPLORATION.md` §8 y §19.5).
- `docs/03-arquitectura/TECHNICAL-DESIGN.md` es la **fuente de verdad técnica** y los ADR-001…010 (todos Aceptados) registran el razonamiento; deben permanecer coherentes entre sí.
- Las Specs de OpenSpec (`openspec/specs/` canónicas, `openspec/changes/` propuestas) convierten esas fuentes en unidades implementables; no las reemplazan.

## Stack (implementado)

Next.js 16.4.3 (App Router, `src/`), React 19.3 y Tailwind CSS 4 en **TypeScript 6 `strict` + ESM** (Node 24.x vía `.nvmrc`), con la estructura por capas `src/domain`, `src/application`, `src/infrastructure`, reglas de lint de capas y seguridad, logger cerrado y `ActionResult`/`runAction`. Persistencia: PostgreSQL en Neon (ramas `main` = Production, `development`, `test`) con Prisma 7.10.1 + `@prisma/adapter-pg`. Pruebas: Vitest 5 y Playwright. CI/CD: GitHub Actions (`static` y `db-tests`, requeridos) y despliegue en Vercel. Autenticación propia mínima con un único administrador.

**Restricción de entrega:** FIXORA V1 mantiene un despliegue público de demostración en Vercel (PRD §4.11, `SUP-10`).

**Proceso:** OpenSpec 1.15.0 (CLI global, herramienta de proceso: **no** es dependencia del proyecto) inicializado en `openspec/` con integración solo para Claude Code. Hoy hay 0 changes activos.

## Workflow OpenSpec

Comandos de Claude Code generados por OpenSpec 1.15.0 (perfil `core`, esquema `spec-driven`): `/opsx:explore`, `/opsx:propose`, `/opsx:update`, `/opsx:apply`, `/opsx:sync`, `/opsx:archive`. Ciclo: **explore** (pensar, sin crear artefactos) → **propose** (crea el change con `proposal.md`, `specs/<capacidad>/spec.md` como delta, `design.md` y `tasks.md`; solo planificación) → **revisión y aprobación del usuario** (con `/opsx:update` para revisar los artefactos) → **apply** (implementa las tareas) → verificar (pruebas y revisión; el comando `verify` no está en el perfil actual) → **sync/archive** (fusiona los deltas en `openspec/specs/` y archiva).

- **Una propuesta OpenSpec no autoriza implementación automáticamente**, ni siquiera una propuesta aprobada implica permiso para ejecutar `/opsx:apply`: el usuario debe autorizar la implementación. Nunca saltes de una idea a `apply`: explorar si hace falta, proponer, revisar, obtener aprobación y solo entonces, con autorización explícita, aplicar. Las secciones `operations` de `openspec/config.yaml` son guardarraíles de comportamiento para el agente, no un mecanismo de cumplimiento técnico del CLI.
- OpenSpec es obligatorio para los cambios de implementación planificados desde la Fase 6. PRD, DESIGN, Technical Design y ADRs siguen siendo las fuentes de verdad; no se reabren decisiones cerradas en silencio.
- `openspec/config.yaml` es configuración del proyecto (editable). `.claude/skills/openspec-*` y `.claude/commands/opsx/` los gestiona OpenSpec (`openspec update`): no se editan a mano.
- No uses `--force`, no cambies la configuración global de OpenSpec ni añadas otras herramientas sin autorización.

## Comandos disponibles hoy

- `npm run dev` — servidor de desarrollo.
- `npm run build` — build de producción.
- `npm run start` — servidor de producción (requiere build).
- `npm run lint` — ESLint (incluye las reglas de capas y de seguridad).
- `npm run typecheck` — `tsc --noEmit`.
- `npm run test:unit` — Vitest, proyecto `unit` (pruebas unitarias, de reglas de lint y de scripts de CI).
- `npm run test:coverage` — proyecto `unit` con cobertura V8 selectiva (90 % líneas y ramas en `domain/`).
- `npm run test:e2e` — `next build` + `next start` + Playwright (`chromium-desktop`, `chromium-mobile`); `npm run test:e2e:install` instala el navegador. Consume bastante memoria: la regresión completa de referencia es la de `db-tests` en GitHub CI.
- `npm run test:trace` — verifica `docs/07-testing/TRACEABILITY.md`.
- `npm run ci:secrets` / `ci:audit` / `ci:warm` — higiene de secretos, política de `npm audit` y calentamiento de Neon `test` (los usa `.github/workflows/ci.yml`).
- `npm run test:integration` — proyecto `integration` de Vitest contra PostgreSQL real en la rama Neon `test` (serial; la guardia anti-desastre aborta si falta `TEST_*` o el marcador).
- `npm run db:generate` — genera el cliente de Prisma (sin conexión; lo encadena `build`).
- `npm run db:migrate:dev` / `npm run db:migrate:deploy` — migraciones contra la rama que cargue `.env.local` (`development`); nunca contra `main`.
- `npm run admin:provision -- --environment=<etiqueta> --email=<correo>` — aprovisiona o rota el administrador (script operativo; **`--environment` es solo una etiqueta, el destino lo decide `DIRECT_URL`**; ver `docs/09-deploy/RUNBOOKS.md` §4).
- `SEED_DEMO_CONFIRM=DEVELOPMENT npm run seed:demo` — órdenes de demostración ficticias (solo `development`).
- `SMOKE_BASE_URL=<url> npm run test:smoke` — smoke público y no mutante de un despliegue.

No inventes ni asumas otros comandos. Ejecuta todo bajo Node 24 (fnm: `fnm use 24`; el Node global del equipo puede seguir siendo 26).

## Reglas duras para Claude Code

1. **Consulta antes de implementar.** Antes de planificar código, lee los documentos relevantes de `docs/`, incluido el PRD aprobado (`docs/01-producto/PRD.md`).
2. **No inventes funcionalidades.** Implementa solo lo documentado y aprobado.
3. **Fuera de alcance = no se implementa silenciosamente.** Si algo parece necesario pero está fuera de alcance, detente y consúltalo.
4. **No modifiques decisiones aprobadas de producto en silencio.** Cualquier cambio se propone explícitamente y se refleja en el documento correspondiente.
5. **No conviertas supuestos en decisiones aprobadas.** Márcalos como supuestos.
6. **No corrijas riesgos aceptados en silencio.** Si encuentras uno, repórtalo; no lo "arregles" por tu cuenta.
7. **Verifica antes de dar por terminada una tarea de código:** ejecuta las verificaciones disponibles (`npm run lint`, `npm run build` y las que existan en el futuro) y reporta los resultados con honestidad, incluidos los fallos.
8. **Git:** commits y push solo cuando se pidan. Trabaja en ramas y fusiona por Pull Request con los checks `static` y `db-tests` en verde: `main` está protegida (sin push directo ni `--force`); staging por rutas explícitas (nunca `git add .` ni `-A`).
9. **No agregues dependencias** sin necesidad justificada y aprobada.

## Reglas sobre decisiones arquitectónicas

- El **Technical Design está aprobado**: no inventes arquitectura que contradiga `docs/03-arquitectura/TECHNICAL-DESIGN.md` ni sus ADRs. Si una Spec o la implementación necesitan contradecir una decisión, detente y solicita revisión arquitectónica; no la adaptes en silencio.
- La arquitectura aprobada **ya está implementada** (base de datos, ORM, autenticación, CI/CD, despliegue). Cualquier cambio que la afecte pasa por OpenSpec; no instales dependencias ni crees workflows sin aprobación explícita.
- Toda decisión arquitectónica importante futura debe quedar registrada mediante un **ADR** en `docs/03-arquitectura/adrs/`.
- Los cambios de comportamiento pasan por una **Spec** de OpenSpec, revisada y aprobada, antes de implementarse.
- El **servidor es la fuente de verdad** de las reglas de negocio sensibles (transiciones de estado, separación público/interno, autorización); el cliente nunca es la única barrera.

## Reglas de seguridad

- **Nunca leas ni expongas archivos `.env` reales** (`.env`, `.env.local`, `.env.e2e`, `admin-credentials.local`, etc.). `.claude/settings.json` los bloquea; no intentes rodearlo.
- **Nunca guardes secretos en el repositorio**: ni en código, ni en docs, ni en ejemplos, ni en commits.
- `.env.example` solo documenta nombres de variables, sin valores reales.
- La información interna del taller (notas internas) nunca debe llegar a vistas ni respuestas públicas.
- Trata toda entrada de usuario como no confiable.
