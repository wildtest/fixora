# Tasks

> Planificación únicamente. Nada de esto se ejecuta hasta que el change esté revisado, aprobado y el usuario autorice `/opsx:apply` en la Fase 7. Cada instalación de dependencias requiere aprobación explícita en el momento.

## 1. Entorno, preflight de versiones y metadatos del proyecto

- [ ] 1.1 Confirmar el DoR de implementación (Node local en 24.x decidido por el usuario, comprobación acotada de ESM/Prisma de AV-2 recomendada, dependencias aprobadas) y dejarlo registrado; se verifica con `node --version` (major 24) y una nota de aprobación en el change.
- [ ] 1.2 Preflight de versiones antes de instalar: (1) comprobar la versión efectiva de `next`; (2) la de `eslint-config-next`; (3) la de `typescript-eslint` y su rango de *peer* de `typescript`; (4) la versión estable de TypeScript (`npm view typescript version` y `dist-tags`) y los requisitos de Vitest y de Node 24; (5) seleccionar la **estable más reciente soportada por todo el toolchain** (nunca prerelease) y fijarla explícitamente. Si TypeScript 7 sigue fuera del rango soportado de `typescript-eslint`, usar la última 6.x estable compatible y documentarlo como compatibilidad del toolchain. Se verifica con la nota de decisión del change que contiene versiones, evidencias y justificación.
- [ ] 1.3 Inspeccionar todos los archivos de herramientas que puedan contener CommonJS (configuración de Next, de ESLint, de PostCSS si existiera, scripts y cualquier `.js` de herramientas) y migrar o renombrar (`.cjs`/`.cts`) los que lo necesiten; se verifica con el listado inspeccionado y la ausencia de `require`/`module.exports` en archivos tratados como ESM.
- [ ] 1.4 Añadir `engines.node = "24.x"` a `package.json` y crear `.nvmrc` con `24`; se verifica con `npm pkg get engines.node` y el contenido de `.nvmrc`.
- [ ] 1.5 Con aprobación, instalar como dependencias de desarrollo `typescript` (la versión de 1.2), `@types/node` (acorde a Node 24), `@types/react`, `@types/react-dom` (acordes al React instalado) y `vitest`, fijando las versiones; se verifica con `npm ls --depth=0`, que el lockfile solo cambia por estas dependencias y que no se instalaron `server-only`, `@vitest/coverage-v8`, Playwright, Prisma ni plugins de ESLint.
- [ ] 1.6 Añadir `"type": "module"` a `package.json` tras 1.3; se verifica con `npm run lint` y `npm run build` en verde sobre el scaffold existente.

## 2. Migración a TypeScript estricto

- [ ] 2.1 Crear `tsconfig.json` con `strict: true`, `noEmit`, `moduleResolution: bundler`, `isolatedModules`, `jsx: preserve`, el plugin de Next y el alias `@/*` → `src/*`, y eliminar `jsconfig.json`; se verifica con `npx tsc --noEmit` sin errores de configuración y la ausencia de `jsconfig.json`.
- [ ] 2.2 Convertir `src/app/layout.js` y `src/app/page.js` a `layout.tsx` y `page.tsx` con tipos (`Metadata`, `children`) sin cambiar el contenido ni el comportamiento visible; se verifica con `npm run build` y la comparación del HTML renderizado de `/` antes y después.
- [ ] 2.3 Añadir el script `typecheck` (`tsc --noEmit`) y actualizar la sección «Comandos disponibles hoy» de `CLAUDE.md`; se verifica con `npm run typecheck` en verde y con que el documento lista exactamente los scripts de `package.json`.

## 3. Vitest mínimo y validadores base

- [ ] 3.1 Crear `vitest.config.ts` (entorno Node, alias `@` → `src` con `resolve.alias`, `include` de `src/**/*.test.ts` y `tests/tooling/**/*.test.ts`) y el script `test:unit`; se verifica con `npm run test:unit` descubriendo y ejecutando las pruebas de 3.2.
- [ ] 3.2 Implementar en `src/domain/validation/` únicamente primitivas técnicas genéricas: el tipo de resultado de validación con errores por campo (`REQUIRED`, `INVALID_FORMAT`, `TOO_LONG`), el `trim` de campos de negocio y el rechazo de `U+0000` como `INVALID_FORMAT`, **sin reglas de negocio** (nada de nombre, teléfono, correo, marca, modelo, tipo de equipo, descripción, tracking, diagnóstico ni dinero), con sus pruebas unitarias (campo vacío, solo espacios, `U+0000`, contraseñas y claves sin `trim`); se verifica con `npm run test:unit` en verde y con que el módulo no importa nada de `next`, `react`, `node:*` ni de otras capas.
- [ ] 3.3 Actualizar `CLAUDE.md` con el script `test:unit`; se verifica contra `package.json`.

## 4. Reglas de importación y de seguridad de lint, probadas con la configuración real

- [ ] 4.1 Configurar la base de ESLint combinando `eslint-config-next/core-web-vitals` y `eslint-config-next/typescript` según la guía instalada, y las reglas globales nativas: `no-console`, `no-eval`, `no-new-func`, `no-restricted-syntax` contra `dangerouslySetInnerHTML` y `no-restricted-properties` sobre `process.env` fuera de `src/infrastructure/config/**`; se verifica con `npm run lint` en verde sobre el código existente.
- [ ] 4.2 Declarar los bloques por capa de la tabla de D-3 en el *flat config* (`domain`, `application`, `infrastructure`, `presentation`, `app`) sin crear carpetas vacías; se verifica con `npm run lint` en verde.
- [ ] 4.3 Crear `tests/tooling/layer-boundaries.test.ts` con la clase `ESLint` cargando el `eslint.config.mjs` real y `lintText` sobre rutas virtuales de cada capa: `domain` no importa `application`/`infrastructure`/`app`; `application` no importa `app` ni Next; `infrastructure` no importa `application`; `presentation` no importa `application`/`infrastructure`/`app`; `app` **sí** importa `application`; `process.env`, `console` y `dangerouslySetInnerHTML` fuera de sitio fallan; se verifica con `npm run test:unit` en verde, con los casos prohibidos fallando y los permitidos pasando.

## 5. Configuración mínima, logger e instrumentación del servidor

- [ ] 5.1 Crear `src/infrastructure/config/` como único acceso a `process.env`, exponiendo solo `NODE_ENV`, el entorno de despliegue y el SHA si existen (sin secretos ni validación de BD); se verifica con pruebas unitarias y con que ninguna otra ruta usa `process.env` (`npm run lint`).
- [ ] 5.2 Crear `src/infrastructure/logging/` con el esquema cerrado (`timestamp`, `level`, `event`, `requestId`, `surface`, `resultCode?`, `durationMs?`, `orderId?`, `environment?`, `deploymentSha?`, y para errores `errorName?`, `errorCode?`, `digest?`, `routeType?`, `routePattern?`), la unión cerrada de eventos iniciales del TD §23, la lista blanca en tiempo de ejecución, `debug` desactivado en producción y la fábrica `createLogger` con *sink*, reloj y generador de identificadores como parámetros; se verifica con pruebas unitarias del formato JSON de una línea y del nivel por canal.
- [ ] 5.3 Implementar `requestIdFrom(headers)` (acepta `Headers` o un registro simple, lee solo `x-vercel-id`, genera uno si falta y nunca toma cabeceras de correlación del cliente) y `safeErrorFields(error)` (solo `name` validado, un código conocido si existe y `digest` si existe; nunca `message`, `cause` ni pila); se verifica con pruebas unitarias, incluido un error con `message` multilínea.
- [ ] 5.4 Añadir pruebas con valores canario sobre el *sink*: un correo, un teléfono, un código de seguimiento, un token y una contraseña pasados por campos no permitidos, por `as any` y dentro de errores no deben aparecer en la salida; se verifica con `npm run test:unit` en verde.
- [ ] 5.5 Usar `import 'server-only'` en los módulos de `infrastructure/` exclusivamente de servidor **sin instalar el paquete**; se verifica con `npm run typecheck`, `npm run lint` y `npm run build` en verde y con que `server-only` no figura en `package.json`. Solo si una necesidad concreta del tooling lo exigiera, detenerse y solicitar aprobación explícita del paquete como respaldo.
- [ ] 5.6 Implementar la función pura que construye el evento de `onRequestError` a partir de `(error, request, context)` con la lista blanca del TD §23 (`requestId`, `digest`, `errorName`, `routeType`, `routePattern`, `surface`, entorno y SHA) sin `message`, `cause`, pila, `request.path`, cabeceras (salvo la lectura de `x-vercel-id`), cookies ni cuerpo; se verifica con pruebas unitarias con canarios (mensaje multilínea, `request.path` con *query* y token, cookie).
- [ ] 5.7 Crear `src/instrumentation.ts` (ubicación confirmada contra la guía instalada) que exporta `onRequestError`, delega en 5.6 (no usa `runAction`: observa lo que escapa de la frontera de acciones), espera sus operaciones asíncronas, nunca lanza y se carga solo en el runtime Node; se verifica con `npm run build`, `npm run typecheck` y una comprobación local manual con una ruta temporal que lance un error y **no se versiona** (`git status` limpio de ella).

## 6. `ActionResult` y frontera de errores

- [ ] 6.1 Crear en `src/application/` el contrato estructural `ActionResult<T, C extends string>` con `fieldErrors?`, `retryAfterSeconds?` y `reference?`, un tipo auxiliar que rechaza `string` abierto como parámetro de códigos y `INTERNAL_ERROR` como único código transversal, **sin** unión central de códigos de negocio; se verifica con `npm run typecheck` y con pruebas de tipos (una unión cerrada compila y `string` abierto falla con `@ts-expect-error`).
- [ ] 6.2 Implementar `runAction(fn)` como frontera de ejecución de código propio de `application`: devuelve el resultado de `fn` y, ante un error inesperado propio, lo registra con `safeErrorFields` y devuelve `INTERNAL_ERROR` con una `reference` opaca sin texto técnico; **no** importa Next, **no** inspecciona `digest` ni `Error.message` para decidir el tratamiento y **no** usa `unstable_rethrow`; se verifica con pruebas unitarias (éxito, error inesperado, valor no `Error` lanzado, que no se filtran `message` ni pila, que la `reference` no contiene identificadores de negocio y que el módulo no importa `next/*`).
- [ ] 6.3 Documentar en el propio módulo la convención de ejecutar `redirect()`, `permanentRedirect()`, `notFound()`, `cookies()` y `headers()` y cualquier API de Next **fuera** del callback de `runAction`, en el adaptador de `src/app` (que prepara la entrada y actúa sobre el resultado); se verifica con la lectura del comentario del módulo y con la prueba de 4.3 que impide a `application/` importar Next.

## 7. Verificación de integración del change

- [ ] 7.1 Ejecutar `npm run lint`, `npm run typecheck`, `npm run test:unit` y `npm run build` y registrar el resultado; se verifica con las cuatro ejecuciones en verde.
- [ ] 7.2 Revisar el alcance del diff contra `proposal.md`: no hay Prisma, base de datos, limitador, CI, Playwright, cobertura, tokens/UI de producto, páginas de error (`error.tsx`, `not-found.tsx`), autenticación ni comportamiento de negocio, y no hay carpetas vacías ni `.gitkeep` nuevos; se verifica con la revisión del `git diff` y `git status`.
- [ ] 7.3 Comprobar que el comportamiento visible de `/` es el mismo que antes de la migración y que `openspec validate application-skeleton --strict` sigue pasando; se verifica con `npm run build`/`npm run dev` y el comando de validación.

## Workflow follow-up

- Revisar y aprobar el change; el usuario autoriza explícitamente `/opsx:apply` en la Fase 7, con el DoR de `docs/04-planificacion/BACKLOG.md` cumplido.
- Archivar el change tras implementarlo y verificarlo; al ser `skip_specs`, confirmar entonces el comportamiento del archive sin deltas.
- Registrar la evidencia (resultados de lint, typecheck, pruebas y build) y actualizar `docs/07-testing/` cuando exista.
