# ADR-008 — Estrategia de testing y calidad

> Estado: Aceptado
> Fecha: 2026-10-26
> Fase: 5 — Technical Design / Arquitectura
> Relacionado con: [TECHNICAL-DESIGN.md](../TECHNICAL-DESIGN.md) §24 · ADR-001, ADR-006, ADR-007, ADR-009

## Contexto

El PRD exige evidencia trazable de qué prueba o mecanismo verifica cada criterio (`SC-01` a `SC-20`) y cada regla de comportamiento (`E1` a `E17`), al menos una prueba E2E del flujo principal (`SC-17`), un Security Pass (`SC-18`) y una revisión manual estructurada de la usabilidad responsive (`SC-15`). Acepta que cada regla se pruebe en el nivel más apropiado, sin obligar a cubrir todo con E2E. El stack incluye Next.js 16.4.3; según su documentación, Vitest no soporta Server Components `async` y Playwright se recomienda contra el build de producción.

## Problema / fuerzas que condicionan la decisión

- Las garantías que importan —restricciones, transacciones, concurrencia, privilegios— solo se demuestran contra PostgreSQL real.
- Los comportamientos de Next (Server Actions, Server Components, headers, CSP, navegación) solo se observan en un navegador real.
- Hay una sola base de datos de pruebas compartida y un riesgo real de ejecutar operaciones destructivas contra la base equivocada.
- Se desea evitar dependencias y pruebas frágiles de poco valor.

## Alternativas consideradas

### Runner
- **Vitest en entorno Node** *(elegido)*: soporte de TypeScript y alias, casos parametrizados, cobertura V8 y documentado por Next.
- **Jest (`next/jest`):** configuración más pesada.
- **`node:test`:** sin dependencias, pero con menos ergonomía y soporte desigual de alias y tipos.

### Persistencia en pruebas
- **PostgreSQL real (rama Neon `test`)** *(elegido)*.
- **SQLite, base en memoria o mocks de Prisma/PostgreSQL:** no verifican restricciones, transacciones ni concurrencia reales.

### Pruebas de componentes
- **Lógica extraída a funciones puras y comportamiento en Playwright** *(elegido)*.
- **React Testing Library y jsdom:** añaden dependencias y fragilidad para componentes cuya lógica ya se prueba aparte.

### Alcance de los E2E
- **Un flujo obligatorio más regresión selectiva** *(elegido)*.
- **E2E para todo:** lento y frágil; el PRD no lo exige.

### Aislamiento
- **Reinicio controlado (`TRUNCATE`) y ejecución serial** *(elegido)*.
- **Reversión por transacción por prueba:** incompatible con transacciones propias del código bajo prueba.
- **Una base por trabajador:** coste desproporcionado por ahora.

### Cobertura
- **Umbral solo en módulos puros, junto con trazabilidad por criterio** *(elegido)*.
- **Porcentaje global arbitrario:** premia código trivial y no demuestra criterios del PRD.

## Decisión

- **Vitest (entorno Node)** para pruebas unitarias e integración, **Playwright** para E2E y smoke. Dependencias aprobadas arquitectónicamente para instalar después: `vitest`, `@vitest/coverage-v8`, `@playwright/test`. Sin React Testing Library, jsdom ni user-event en V1; las Server Actions son delgadas y no se mockean internals de Next.
- **Integración contra PostgreSQL real** (rama Neon `test`), nunca contra SQLite, memoria o mocks para persistencia, restricciones, transacciones o concurrencia; el rol de aplicación ejecuta lo probado y el propietario solo prepara y limpia.
- **Guardia anti-desastre** antes de operaciones destructivas: variables `TEST_*` explícitas; un **marcador de entorno de test** que es la comprobación decisiva y que **no crean las pruebas, ni el arranque, ni las migraciones normales, ni se crea automáticamente al faltar** (se aprovisiona explícitamente con la infraestructura `test`); y, cuando las URL normales de desarrollo o producción están disponibles para el proceso de orquestación, `TEST_*` no coinciden con ellas. Si algo falla o no puede comprobarse el marcador, se aborta. El proceso de orquestación posee `TEST_*`; el proceso hijo de la aplicación E2E recibe `DATABASE_URL = TEST_DATABASE_URL`, lo cual no invalida la guardia porque el helper destructivo no corre dentro de la aplicación.
- **Fixtures deterministas, ficticias y sin Faker**; las órdenes se construyen con los casos de uso reales, con reloj y fuente aleatoria inyectables. Reinicio controlado de tablas, incluidas las técnicas (sesiones, limitador, idempotencia), sin ningún *bypass* del limitador para pruebas.
- **Nivel de cada prueba:** `domain/`, helpers, parsers y normalizadores puros → unitarias; `application/` que orquesta repositorios y transacciones, y repositorios y restricciones → integración (no se mockean Prisma ni los repositorios para llamarlo «unitario»); Next, UI y Server Actions → Playwright. Reloj y aleatoriedad pasan como parámetros explícitos, sin contenedor de inyección.
- **Invariantes añadidas:** tras cada caso de uso que cambia el estado, `repair_orders.status` coincide con el `to_status` del último evento y, si falla el historial, el estado no cambia; cuatro pruebas de diagnóstico/costo no publicados (ADR-005); prueba parametrizada de las Server Actions administrativas sin sesión (ADR-004); E2E de «navegar fuera y volver» para `/consultar` y `/registrar` (ADR-002).
- **Concurrencia real** con conexiones separadas: `Promise.all` para invariantes y entrelazado determinista mediante un bloqueo retenido cuando importa el orden; sin reintentos del runner que oculten carreras.
- **Playwright** contra `next build` y `next start`, nunca contra `next dev`; `workers: 1` en CI; como máximo un reintento en CI, con *trace* en el primer reintento. Proyectos `chromium-desktop` (suite completa), `chromium-mobile` y `webkit-mobile` (flujos públicos críticos y responsive); Firefox fuera del CI de V1.
- **E2E-01 (`SC-17`)** recorre un flujo válido: registro → código → administrador → `SOLICITUD_RECIBIDA → EQUIPO_RECIBIDO → EN_DIAGNOSTICO` → diagnóstico y costo → `ESPERANDO_APROBACION` con `E11` → consulta pública con los datos publicados.
- **Cobertura V8 con umbral de 90 % de líneas y de ramas únicamente en `domain` y módulos puros seleccionados**, con `coverage.include` explícito. Sin porcentaje global ni umbral en UI, acciones, infraestructura o Prisma.
- **Trazabilidad** en `docs/07-testing/TRACEABILITY.md` (`SC-01`…`SC-20`, `E1`…`E17`) con nivel, prueba o evidencia y estado, verificada por un script sin dependencias. No todo criterio exige prueba automatizada.
- **Regresión de seguridad** automatizada en cada cambio; el **Security Pass** es una actividad formal separada que no la reemplaza ni es reemplazada por ella.

## Justificación

Probar cada regla en el nivel más barato que realmente la demuestre mantiene la suite rápida y significativa: el dominio con pruebas unitarias exhaustivas, las garantías de datos con PostgreSQL real, y solo lo que depende del framework en el navegador. **No existe un objetivo de «100 % de cobertura»**: la cobertura es un indicador secundario frente a pruebas explícitas de invariantes (matriz completa, `SC-11` con una orden poblada, privilegios del rol, carreras de concurrencia).

## Consecuencias positivas

- Evidencia directa para `SC-01`…`SC-20` y `E1`…`E17`.
- Garantías de base de datos y de concurrencia probadas de verdad.
- Pocas dependencias de prueba.

## Consecuencias / trade-offs

- Las pruebas de integración y E2E dependen de Neon (red y arranque en frío) y se ejecutan en serie.
- No se prueban unitariamente los Server Components `async` ni se hace regresión visual, pruebas de carga ni certificación WCAG.
- Playwright WebKit no equivale a certificar Safari o iPhone reales; Firefox solo tendrá una pasada manual.
- La revisión de `SC-15` sigue siendo manual estructurada.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Limpieza destructiva sobre la base equivocada | Guardia de múltiples comprobaciones; el marcador de entorno, aprovisionado explícitamente y nunca autocreado, es la comprobación decisiva |
| Pruebas inestables por Neon | Calentamiento previo, tiempos de espera generosos, un solo reintento investigable |
| Acumulación de intentos del limitador entre pruebas | Reinicio de sus tablas entre pruebas |

## Qué queda deliberadamente fuera

Configuración concreta de Vitest y Playwright, globs de cobertura, nombres de variables de test y el contenido de la revisión manual de `SC-15` (Specs y `docs/07-testing/`).

## Condiciones para revisar este ADR

- El tiempo de CI exige ramas efímeras de Neon o paralelismo.
- Aparece un componente cliente con lógica que justifique pruebas de componentes.
- Se incorpora una plataforma o un navegador que exija ampliar la matriz.
- Cambian los criterios de éxito del PRD.

## Referencias

- PRD: `SC-01` a `SC-20`, `E1` a `E17`, §6.
- [TECHNICAL-DESIGN.md](../TECHNICAL-DESIGN.md) §24.
- Relacionado con: [ADR-001](ADR-001-arquitectura-aplicacion-y-capas.md), [ADR-006](ADR-006-estados-concurrencia-e-idempotencia.md), [ADR-007](ADR-007-seguridad-y-proteccion-frente-abuso.md), [ADR-009](ADR-009-entornos-ci-cd-y-despliegue.md).
