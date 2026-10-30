# FIXORA

*Tu reparación, siempre bajo control.*

Aplicación web responsive para **pequeños servicios técnicos de reparación de equipos tecnológicos**. Reemplaza el seguimiento por WhatsApp, llamadas, papel o Excel: el cliente registra su equipo, recibe un **código de seguimiento** y consulta el estado sin crear una cuenta; el taller gestiona las órdenes desde una zona protegida. Proyecto final de la especialización «Desarrollo de Software AI-First con Claude».

## Funcionalidades de la V1

- **Cliente (sin cuenta):** registro de una solicitud de reparación → código de seguimiento → consulta del estado con ese código, con el **Repair Journey** visual (recorrido de siete etapas), historial de estados, diagnóstico y costo estimado (cuando el taller los publica) y notas públicas.
- **Administrador (un único usuario):** inicio de sesión, panel con conteos y órdenes recientes, listado con búsqueda (código exacto o nombre) y filtro por estado, detalle de la orden con la **separación estricta entre información pública e interna**, cambio de estado mediante una **máquina de estados real** (transiciones y confirmaciones comprobadas en el servidor), diagnóstico y costo estimado (se congelan al pedir la aprobación), notas públicas e internas, corrección de datos básicos e historial de cambios.
- **Fuera de alcance:** cuentas de clientes, varios roles o sucursales, inventario, facturación, pagos, notificaciones automáticas, fotos, firma digital, app móvil, IA y chat. Ver `CLAUDE.md`.

## Stack

Next.js 16 (App Router, Server Components y Server Actions) · React 19 · Tailwind CSS 4 · TypeScript `strict` (ESM) · Node.js 24 · PostgreSQL en Neon con Prisma 7 (`@prisma/adapter-pg`) · Vitest y Playwright · GitHub Actions · despliegue en Vercel. Autenticación propia mínima (sesión opaca en PostgreSQL, `scrypt`). Sin servicios de terceros de analítica, autenticación ni observabilidad.

## Arquitectura

Monolito modular con capas `src/app` (Next) → `src/application` (casos de uso) → `src/domain` (reglas puras) e `src/infrastructure` (PostgreSQL, seguridad, logging), con reglas de lint que protegen las fronteras. **El servidor es la fuente de verdad** de las reglas sensibles (transiciones de estado, autorización, separación público/interno); el cliente nunca es la única barrera. Concurrencia optimista por versión, historiales *append-only* por privilegios y un limitador persistente de intentos. Detalle en [docs/03-arquitectura/TECHNICAL-DESIGN.md](docs/03-arquitectura/TECHNICAL-DESIGN.md) y sus ADR.

## Requisitos

- Node.js 24.x (ver `.nvmrc`; con `fnm`: `fnm use 24`) y npm.
- Una base PostgreSQL en Neon con tres ramas: `development` (local), `test` (pruebas) y `main` (Production, nunca desde local).

## Configuración local

```bash
npm ci
npm run test:e2e:install          # navegador de Playwright (solo para E2E)
cp .env.example .env.local        # y completar los valores de la rama `development`
npm run db:generate
npm run db:migrate:deploy         # aplica las migraciones a la rama de `.env.local`
npm run dev                       # http://localhost:3000
```

Variables (solo nombres; los valores reales **nunca** se versionan): `DATABASE_URL` (rol de aplicación, conexión *pooled*), `DIRECT_URL` (propietario, solo migraciones), `SHADOW_DATABASE_URL`, `RATE_LIMIT_HMAC_SECRET` (≥ 32 caracteres, exclusivo de cada entorno), y para las pruebas `TEST_DATABASE_URL` y `TEST_DIRECT_URL` (rama `test`, en `.env.test`). Ver `.env.example` y [docs/09-deploy/NEON-ENVIRONMENTS.md](docs/09-deploy/NEON-ENVIRONMENTS.md).

Administrador (script operativo externo, nunca desde la aplicación): `npm run admin:provision -- --environment=development --email=<correo>`. Datos de demostración ficticios: `SEED_DEMO_CONFIRM=DEVELOPMENT npm run seed:demo`.

## Pruebas y calidad

| Comando | Qué ejecuta |
|---|---|
| `npm run lint` · `npm run typecheck` | ESLint (con reglas de capas y seguridad) · TypeScript |
| `npm run test:unit` · `npm run test:coverage` | Pruebas unitarias · cobertura (≥ 90 % de líneas y ramas en `domain/`) |
| `npm run test:integration` | PostgreSQL real en la rama Neon `test` (serial) |
| `npm run test:e2e` | `next build` + `next start` + Playwright (escritorio y móvil) |
| `npm run test:trace` | Verifica la trazabilidad de los 37 criterios (`docs/07-testing/TRACEABILITY.md`) |
| `npm run ci:secrets` · `npm run ci:audit` | Higiene de secretos · política de `npm audit` |
| `SMOKE_BASE_URL=https://<despliegue> npm run test:smoke` | Smoke público y no mutante de Production |

La CI de GitHub (`static` y `db-tests`) es obligatoria para fusionar a `main`, que está protegida.

## Production

Demo pública en Vercel (`main` → Production por la integración Git) sobre Neon `main` con el rol de mínimo privilegio `fixora_app`. Las migraciones **solo** se aplican con el workflow `migrate-production` (aprobación humana, vinculado al SHA y a la identidad de las migraciones). Procedimientos operativos en [docs/09-deploy/RUNBOOKS.md](docs/09-deploy/RUNBOOKS.md); estado y evidencia en [docs/09-deploy/PRODUCTION-ENVIRONMENT.md](docs/09-deploy/PRODUCTION-ENVIRONMENT.md) y [docs/09-deploy/RELEASE-READINESS.md](docs/09-deploy/RELEASE-READINESS.md). **La demo puede recibir datos reales: no ingreses información personal real ni sensible.**

## Seguridad

Sesión opaca con hash persistido y cookie `__Host-` (`HttpOnly`, `Secure`, `SameSite=Strict`), CSP con *nonce* en la zona administrativa, cabeceras de seguridad, limitación de intentos por IP canonicalizada (HMAC), privilegios de base de datos por columna e historiales *append-only*, y proyección pública por lista positiva. Security Pass formal: [docs/08-seguridad/SECURITY-REPORT.md](docs/08-seguridad/SECURITY-REPORT.md). Esta V1 **no** está aprobada para operación real (`VAL-04` sigue abierta): es una demostración académica.

## Estructura del repositorio y documentación

```
src/            app (Next), application, domain, infrastructure
prisma/         esquema y migraciones
tests/          integration, e2e, smoke, tooling
scripts/        operación y CI (admin:provision, seed:demo, trazabilidad, auditoría)
openspec/       specs canónicas (openspec/specs) y changes archivados
docs/           pipeline documental (00 definición … 09 despliegue)
```

El proyecto sigue un pipeline documental AI-First; punto de entrada: [docs/README.md](docs/README.md). Fuentes de verdad: [PRD](docs/01-producto/PRD.md) (funcional) → [UX](docs/02-diseno/UX-EXPLORATION.md) y [DESIGN](docs/02-diseno/DESIGN.md) → [Technical Design](docs/03-arquitectura/TECHNICAL-DESIGN.md) y ADR → especificaciones OpenSpec (`openspec/`). Reglas de trabajo para agentes: [CLAUDE.md](CLAUDE.md) y [AGENTS.md](AGENTS.md).

Repositorio: https://github.com/wildtest/fixora
