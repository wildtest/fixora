# Design

## Context

Motivación y alcance: ver `proposal.md`. Fuentes: Technical Design (TD) §3, §4.2, §5, §6, §18, §21.2, §21.6, §23, §24, §28; ADR-001, ADR-008, ADR-010; backlog `CHG-01`; guías instaladas de Next 16.4.3 (`node_modules/next/dist/docs/`).

**Estado actual observado del scaffold (solo lectura):**

| Elemento | Hoy |
|---|---|
| Framework | Next.js 16.4.3 (App Router, `src/app`), React 19.3.0, Tailwind 4 por regla de Turbopack |
| Código | JavaScript: `src/app/layout.js`, `src/app/page.js`, `src/app/globals.css`, `favicon.ico`. Sin `domain/`, `application/` ni `infrastructure/` |
| Módulos | `package.json` **sin** `"type": "module"` y sin `engines`; `next.config.mjs` y `eslint.config.mjs` ya son ESM; sin `postcss.config.*` ni otros archivos de herramientas; sin `.nvmrc` |
| Tipos | Sin `tsconfig.json`; `jsconfig.json` con el alias `@/* → ./src/*`. TypeScript solo aparece como dependencia **transitiva** (no define la versión del proyecto); sin `@types/*` directos |
| Lint | `eslint-config-next/core-web-vitals`; script `lint` = `eslint`. `eslint-config-next/typescript` (basada en `typescript-eslint`) forma parte del mismo paquete |
| Pruebas | Ninguna: sin Vitest, sin scripts de prueba ni de `typecheck` |
| Node | Objetivo 24.x (TD §4.2); el entorno local es 26.x |
| Scaffold a corregir después | `lang="en"`, modo oscuro automático, fuente Arial, metadatos: TD §28 los asigna a la UI (CHG-04), **no** a este change |

Restricciones: no se rediseña la arquitectura; sin contenedor de inyección ni puertos y adaptadores formales (ADR-001); ninguna dependencia se instala en esta fase de planificación.

## Goals / Non-Goals

**Goals:**
- Dejar el proyecto compilable, tipado y con capas, y entregar la **fundación de observabilidad del servidor** (logger cerrado, integración técnica con Next mediante `instrumentation.ts`/`onRequestError`) y el contrato de errores que los changes posteriores consuman sin inventar convenciones.
- Que las fronteras importantes (`domain` puro, `server-only`, nada de `process.env` ni `console` dispersos) estén **comprobadas por herramienta** con la configuración real del repositorio.
- Que la lógica pura de la fundación esté probada con Vitest desde el primer momento.

**Non-Goals:**
- Todo lo que `proposal.md` deja fuera. Además: cobertura y su umbral, Playwright, CI (CHG-03); Prisma, modelos de dominio, repositorios, limitador y validación de variables de BD (CHG-02); tokens y UI de producto (CHG-04).
- **La presentación de errores es de CHG-04**: `error.tsx`, `global-error.tsx` (si finalmente corresponde), `not-found.tsx`, el aspecto visual de los errores, los patrones del Apéndice A de DESIGN.md y la navegación de salida. CHG-01 no crea ninguna página.
- No hay Specs: el change es `skip_specs`. No se crean códigos de error de negocio.

## Decisions

### D-1. Estructura física inicial
```text
src/
  app/              rutas, layouts, UI y Server Actions (adaptadores de transporte)
  application/      casos de uso, DTO y contratos; frontera de acciones
  domain/           reglas puras e isomórficas
  infrastructure/   config y logging (más adelante BD, sesión, criptografía, limitador)
  instrumentation.ts   enganche de Next para errores del servidor (ver D-6)
tests/
  tooling/          pruebas de la propia configuración (reglas de lint)
```
La estructura **emerge de módulos reales** de la fundación: `application/` recibe `ActionResult` y `runAction`; `domain/` recibe los validadores base; `infrastructure/` recibe config y logging; `tests/tooling/` recibe las pruebas de las reglas. **No se crean carpetas vacías ni `.gitkeep`.** `presentation/` (módulos puros de presentación del TD §5) **no se crea**: nace con su primer módulo real en un change posterior, y su regla de importaciones se declara ya en la configuración de lint. Alias `@/*` (ya existente). *Descartado:* monorepo o paquetes por capa.

### D-2. TypeScript `strict`, ESM y Node
- `tsconfig.json` con `strict: true` y los valores recomendados por Next 16 para App Router (`noEmit`, `moduleResolution: bundler`, `isolatedModules`, `jsx: preserve`, plugin de Next, alias `@/*`). `jsconfig.json` se elimina tras trasladar el alias (guía de Next). Sin indicadores de rigor extra: el TD exige `strict`.
- **Política de TypeScript.** Debe instalarse **explícitamente** como `devDependency`, con una **versión estable** y **la más reciente soportada por todo el toolchain** efectivo (Next.js, `eslint-config-next`, `typescript-eslint`, Vitest y Node 24) **en el momento de aplicar CHG-01**. Una dependencia transitiva no define la versión del proyecto, y las prereleases no se usan. A la fecha de planificación la estable vigente (`latest`) es **7.0.2**, pero la versión resuelta de `typescript-eslint` (8.72.0, transitiva de `eslint-config-next` 16.4.3) declara el *peer* `typescript >=4.8.4 <6.1.0`, y la guía de Next indica que TypeScript 7 no ofrece la API de compilador de JavaScript. **Por eso no se fija todavía TypeScript 7.** El preflight de la Fase 7 revisa Next, `eslint-config-next`, `typescript-eslint` y la estable de TypeScript; si TypeScript 7 sigue fuera del rango soportado, se usa la última 6.x estable compatible, lo que es compatibilidad del toolchain y no una rebaja arquitectónica; si una versión posterior del toolchain la admite, se usa la 7.x estable.
- `"type": "module"` en `package.json` (requisito de Prisma ORM 7, TD §11/§28), **precedido de una inspección** de todos los archivos de herramientas que puedan contener CommonJS (configuración de Next, de ESLint, de PostCSS si apareciera, scripts y cualquier `.js` de herramientas). Hoy `next.config.mjs` y `eslint.config.mjs` son ESM y no hay otros; si alguno necesitara CommonJS, se migra o conserva la extensión `.cjs`/`.cts`. Ambos `.mjs` se **mantienen**.
- `engines.node = "24.x"` y `.nvmrc` con `24`. Mientras el Node local sea 26.x, `npm` avisa (`EBADENGINE`); la alineación del Node local **no bloquea la Fase 6** y es condición de entrada para aplicar y verificar CHG-01 en la Fase 7.
- `next-env.d.ts` y `*.tsbuildinfo` ya están en `.gitignore`.
- Scripts: se añaden `typecheck` (`tsc --noEmit`) y `test:unit` (`vitest run`); `dev`, `build`, `start`, `lint` se conservan.
- El scaffold se convierte **sin cambiar su comportamiento visible** (`layout.tsx` con el tipo `Metadata` y `children` tipado; `page.tsx` igual).

### D-3. Lint y pruebas de reglas
- **Base:** el ecosistema oficial de Next. Según la guía instalada, se combinan `eslint-config-next/core-web-vitals` y `eslint-config-next/typescript` (que ya trae `typescript-eslint` como parte de `eslint-config-next`); no se introduce un framework de lint nuevo ni plugins de arquitectura. Las reglas de capas se añaden con **reglas nativas de ESLint** (`no-restricted-imports`, `no-restricted-properties`, `no-restricted-syntax`, `no-console`, `no-eval`, `no-new-func`) en bloques `files:` del *flat config*.

| Ámbito | Regla |
|---|---|
| Todo `src/` | `no-console` como error; `no-eval`, `no-new-func`; `no-restricted-syntax` contra `dangerouslySetInnerHTML` en JSX |
| Fuera de `src/infrastructure/config/**` | `no-restricted-properties` sobre `process.env` (único acceso normal a variables de entorno, TD §21.6) |
| `src/domain/**` | Sin `@/application`, `@/infrastructure`, `@/app`, `@/presentation`, `next*`, `react*`, `@prisma/*`, `pg`, `server-only` ni `node:*` |
| `src/application/**` | Sin `next*`, `react*`, `@prisma/*`, `pg`, `@/app`, `@/presentation` |
| `src/infrastructure/**` | Sin `@/application`, `@/app`, `@/presentation` |
| `src/presentation/**` | Sin `@/application`, `@/infrastructure`, `@/app` |
| `src/app/**` | Sin `@/infrastructure/*` ni `@prisma/*`/`pg` (consume `application`) |

Excepciones de `no-console`: el archivo del logger y, más adelante, `scripts/` operativos autorizados. La ausencia de ciclos se obtiene de las reglas direccionales; no se añade un detector automático.

- **Las reglas se prueban con la configuración real.** `tests/tooling/` usa la clase `ESLint` (ya instalada) apuntando al `eslint.config.mjs` del repositorio y `lintText(código, { filePath })` con rutas virtuales dentro de cada capa; así corre el *parser* y las reglas efectivas de TypeScript, no una configuración paralela. Casos mínimos: `domain` no importa `application`, `infrastructure` ni `app`; `application` no importa `app` ni Next; `infrastructure` no importa implementación de `application`; `presentation` no importa `application`/`infrastructure`/`app`; `app` **sí** puede importar `application` (la dependencia no se invierte); además `process.env`, `console` y `dangerouslySetInnerHTML` fuera de sitio fallan. Sin puertos ni inyección de dependencias.

### D-4. `server-only` (resuelta)
Se usa `import 'server-only'` en los módulos exclusivamente de servidor que correspondan (configuración, logging y, más adelante, BD, sesión, criptografía, limitador). Next trata `server-only` a nivel de compilador y **su paquete npm es opcional**; además la instalación de Next trae la declaración ambiental `declare module 'server-only'` (`next/types/global.d.ts`) para TypeScript. **No se añade `server-only` a `package.json` por defecto.** En la implementación se comprueba con `typecheck`, `lint` y `build`; solo si una necesidad concreta del tooling o de la comprobación de dependencias lo exige, se añade el paquete como respaldo, con aprobación explícita. Sin React Taint (TD §21.6).

### D-5. Logger propio y cerrado (`src/infrastructure/logging/`)
- JSON de **una línea** por evento a stdout (`debug`/`info`) o stderr (`warn`/`error`); el nivel va dentro del JSON. `debug` solo fuera de producción.
- Campos (TD §23): `timestamp`, `level`, `event`, `requestId`, `surface`, `resultCode?`, `durationMs?`, `orderId?`, `environment?`, `deploymentSha?`. Para eventos de error, la lista blanca del TD §23 añade los campos opcionales `errorName?`, `errorCode?`, `digest?`, `routeType?` y `routePattern?`. **Sin campo de mensaje libre.** `surface` es una unión cerrada (`public` | `admin` | `system`, provisional).
- `event` es una unión cerrada de literales: el catálogo inicial del TD §23 como punto de partida; los nombres finales los consolidan los changes dueños.
- **Lista blanca en tiempo de ejecución:** solo se serializan las claves conocidas; las desconocidas y los valores no primitivos se descartan; las cadenas se acotan. Un `as any` o un objeto accidental no llega al log.
- Auxiliares puras: `requestIdFrom(headers)` (acepta `Headers` o un registro simple, lee solo `x-vercel-id`; si falta genera uno; **nunca** una cabecera de correlación del cliente) y `safeErrorFields(error)` (solo `name` validado, un código conocido si existe y `digest` si existe; jamás `message`, `cause` ni pila).
- Reloj y fuente de identificadores **como parámetros** de una fábrica `createLogger({...})` con un *sink* sustituible; sin contenedor de inyección.
- *Descartado (ADR-010):* Pino/Winston, `console.*` libre, Sentry, OpenTelemetry.

### D-6. `instrumentation.ts` y `onRequestError`
CHG-01 **posee** la integración técnica con Next. Se crea `src/instrumentation.ts` (la ubicación exacta —raíz o `src/`— se confirma contra la guía instalada al implementar; con `src/app` se espera `src/instrumentation.ts`) que exporta `onRequestError` y delega en una función **pura y probable** de `infrastructure/logging` que construye el evento.
- **Qué registra** (TD §23 como autoridad): evento de error, nivel, `requestId` (de `x-vercel-id`), `digest` si existe, `errorName`, `routeType` (`render` | `route` | `action` | `proxy`) y `routePattern` (el patrón lógico de ruta del contexto, p. ej. `/app/blog/[dynamic]`), `surface` derivada del patrón, y los campos de entorno/SHA.
- **Qué no registra:** `error.message`, `cause`, pila, `request.path` (puede traer *query string*), cabeceras (salvo la lectura puntual de `x-vercel-id`), cookies, cuerpo, `FormData`, tokens, tracking codes ni datos personales. En el TD no hay un campo `method` en el esquema; no se añade a menos que el TD lo incorpore.
- El manejador espera sus operaciones asíncronas, nunca lanza (un fallo de logging no puede romper la petición) y solo se carga en el runtime Node (ADR-002).
- La **verificación** es doble: pruebas unitarias de la función pura con valores canario (mensaje multilínea, `request.path` con *query* y token, cookie) y una comprobación local manual con una ruta temporal que lance un error (no se versiona). Que el hook se dispare con el comportamiento real de Next se confirma también en AV-1/Fase 7.

### D-7. `ActionResult` y `runAction` (`src/application/`)
- **Contrato estructural estable y global**, sin registro central de códigos:
  ```ts
  type ActionResult<T, C extends string = never> =
    | { ok: true; data: T }
    | { ok: false; code: C | 'INTERNAL_ERROR'; fieldErrors?: FieldErrors;
        retryAfterSeconds?: number; reference?: string }
  ```
  `C` debe ser una **unión cerrada de literales**; un tipo auxiliar rechaza `string` abierto, de modo que no hay `string` libre en lugar de códigos tipados. `INTERNAL_ERROR` es el único código transversal porque lo produce la frontera. **Los códigos concretos no nacen en CHG-01**: cada capability o change define su propia unión (`INVALID_CREDENTIALS`, `SESSION_EXPIRED`, `RATE_LIMITED`, `TRACKING_NOT_FOUND`, etc.). `FieldErrors` usa los códigos genéricos de validación (`REQUIRED`, `INVALID_FORMAT`, `TOO_LONG`). El resultado no transporta mensajes internos: la interfaz traduce el código.
- **`runAction(fn)`: frontera de ejecución de código propio de FIXORA, no un detector de errores del framework.**
  ```text
  adaptador de src/app  →  runAction(...)  →  caso de uso de application  →  domain / infrastructure
  ```
  - **Los APIs de Next quedan fuera del callback envuelto**: `redirect()`, `permanentRedirect()`, `notFound()`, `cookies()`, `headers()` y cualquier otro que pueda producir excepciones de control de flujo o aplazamientos del framework se ejecutan en el adaptador de `src/app`, antes o después de `runAction`. El adaptador prepara la entrada (contexto, sesión, cabeceras ya leídas) y pasa **valores**; actúa sobre el resultado (`redirect`, `revalidate`, etc.) fuera de la frontera. Es la misma convención de la guía de Next de llamar `redirect()` fuera del `try/catch`.
  - Qué hace `runAction`: ejecuta la operación de `application`; devuelve su resultado; ante un error **inesperado propio** devuelve `INTERNAL_ERROR` con una `reference` opaca (el `requestId` o un identificador generado; nunca un UUID de orden, código ni correo) y registra un evento sanitizado con `safeErrorFields`.
  - Qué **no** hace: importar `next/*`, reconocer errores de Next ni decidir redirecciones o `notFound`. **No se usa `error.digest` como discriminador de control de flujo ni de seguridad**: `digest` no identifica solo `redirect()`/`notFound()`, también acompaña errores ordinarios de renderizado. Tampoco se adivina el error de negocio inspeccionando `Error.message` ni cadenas.
  - Los fallos **esperados** de negocio no son excepciones genéricas: se expresan con los contratos tipados de `application`/`domain` de cada change (`INVALID_CREDENTIALS`, `SESSION_EXPIRED`, `TRANSITION_NOT_ALLOWED`, etc., que pertenecen a sus changes).
  - Garantía por construcción: `application/` y `domain/` no pueden importar Next (lint) y los APIs de Next se ejecutan fuera del callback; por eso no hace falta ninguna heurística. **No se incorpora `unstable_rethrow`** (API `unstable`, innecesaria con esta separación). Si AV-1 demostrara un caso inevitable en que un mismo `catch` mezcle errores propios y control de flujo de Next, se reevaluaría allí con la versión efectiva de Next; no se anticipa.
  - `onRequestError` **no** usa `runAction`: son dos responsabilidades distintas (frontera de ejecución de acciones frente a observación server-side de lo que escapa).

### D-8. Validadores y helpers base (`src/domain/validation/`)
Solo primitivas técnicas transversales y sin reglas de negocio: tipo de resultado de validación con errores por campo, `trim` de campos de negocio (no de contraseñas, tokens ni claves) y detección de `U+0000` (como `INVALID_FORMAT`). **No define** reglas de nombre, teléfono, correo, marca, modelo, tipo de equipo, descripción, tracking, diagnóstico ni dinero: pertenecen a los changes funcionales que las poseen. Puros, tipados e isomórficos (TD §18).

### D-9. Vitest mínimo
`vitest` (entorno Node), `vitest.config.ts` con alias `@` → `src` mediante `resolve.alias` (sin plugin adicional), `include` de `src/**/*.test.ts` y `tests/tooling/**/*.test.ts`, pruebas junto al código (TD §24). Sin cobertura, sin `@vitest/coverage-v8`, sin proyecto de integración.

### D-10. Dependencias (no se instalan aquí)
| Dependencia | Tipo | Estado |
|---|---|---|
| `typescript` | dev | Aprobada (TD §4.2). Versión por la política de D-2, decidida en el preflight de la Fase 7 |
| `@types/node`, `@types/react`, `@types/react-dom` | dev | Necesarias para `strict`. Versiones elegidas en la Fase 7 según Node 24, el React instalado y el Next instalado |
| `vitest` | dev | Aprobada (TD §4.2, ADR-008) |

Quedan **fuera**: `server-only` (solo respaldo condicionado, D-4), `@vitest/coverage-v8` y `@playwright/test` (CHG-03), Prisma/`pg` (CHG-02), `tsx`, `dotenv`, Zod, Pino y cualquier plugin de ESLint. Next instala TypeScript automáticamente la primera vez que ve un `.ts`; **se evita** instalando explícitamente con aprobación para que `package.json` y el lockfile no cambien en silencio.

### D-11. Compatibilidad con CHG-02 y con Prisma 7
`"type": "module"`, la estructura de `infrastructure/` y el módulo de configuración dejan listo el sitio para `prisma.config.ts`, el adaptador y la validación por capacidad. Como CHG-01 adopta ESM antes de que AV-2 confirme la configuración con Prisma 7, se registra una **validación previa a la implementación** (recomendación del backlog, no dependencia formal): ejecutar la comprobación acotada de ESM/Prisma de AV-2 antes de aplicar este change.

## Risks / Trade-offs

- [Migrar a ESM y TypeScript rompe el build de Next/Tailwind/Turbopack] → Cambiar un elemento por vez, con la inspección previa de CommonJS, y verificar `lint`, `typecheck` y `build` tras cada paso; reversible con `git`.
- [La estable vigente de TypeScript queda fuera del rango soportado por `typescript-eslint`] → Preflight explícito: se elige la estable más reciente soportada por todo el toolchain y se documenta (D-2).
- [`engines` 24.x avisa en Node 26.x] → Es un aviso; la alineación del Node local es condición de entrada para aplicar y verificar.
- [Las reglas de importación nativas no cubren todos los casos (importaciones dinámicas, rutas relativas profundas)] → Patrones sobre alias y rutas relativas, y pruebas con la configuración real; el alias `@/` es la convención.
- [`runAction` se trague control de flujo del framework] → Los APIs de Next (`redirect()`, `notFound()`, `cookies()`, `headers()`) se ejecutan fuera del callback envuelto y `application/` no puede importar Next (lint); no hay heurística basada en `digest` ni `unstable_rethrow`. Verificación real en AV-1 y en el primer change con acciones.
- [`onRequestError` filtre datos sensibles al registrar] → Función pura con lista blanca y valores canario; sin `message`, ruta con *query*, cabeceras ni cookies.
- [El alcance de L crece hacia CHG-02/03/04] → No-objetivos explícitos y revisión de alcance en la verificación.

## Migration Plan

1. Preflight y metadatos: DoR, `engines`, `.nvmrc`; inspección de CommonJS; `"type": "module"`.
2. Con aprobación y tras el preflight de versiones: instalar `typescript`, tipos y `vitest`.
3. Añadir `tsconfig.json`, trasladar el alias, retirar `jsconfig.json` y convertir `layout`/`page`.
4. Crear los módulos de la fundación con sus pruebas (validadores, configuración, logger, `instrumentation.ts`, `ActionResult`/`runAction`).
5. Añadir las reglas de lint y las pruebas de reglas con la configuración real.
6. Verificar `lint`, `typecheck`, `build` y `test:unit`.

**Rollback:** solo se toca código y configuración de proyecto, sin datos ni infraestructura: se revierte con `git`. No hay migraciones ni despliegues.

## Open Questions

Ninguna bloquea la aprobación de CHG-01. Quedan cerradas: la titularidad de `onRequestError` (**pertenece a CHG-01**), la instalación de `server-only` (**no se instala por defecto**) y la versión de TypeScript (**política de D-2: la estable más reciente soportada por todo el toolchain; no se fija TypeScript 7 mientras `typescript-eslint` no lo soporte**). Lo restante es **preflight de implementación de la Fase 7**: elegir las versiones exactas de `typescript`, `@types/*` y `vitest` según lo instalado y lo estable en ese momento, y confirmar la ubicación de `instrumentation.ts` contra la guía de Next.
