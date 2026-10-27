# ADR-001 — Arquitectura de aplicación y límites de capas

> Estado: Aceptado
> Fecha: 2026-10-26
> Fase: 5 — Technical Design / Arquitectura
> Relacionado con: [TECHNICAL-DESIGN.md](../TECHNICAL-DESIGN.md) §3, §4, §5 · ADR-002, ADR-003, ADR-008

## Contexto

FIXORA V1 atiende a **un taller, un local y un administrador**, con el volumen de un pequeño negocio (`SUP-02`, `SUP-07`). El repositorio contiene hoy solo el scaffold de Next.js 16.4.3 (App Router, JavaScript). El despliegue en Vercel es una restricción fija del proyecto (PRD §4.11). El PRD exige que las reglas sensibles —transiciones de estado, visibilidad de diagnóstico y costo, separación público/interno y autorización— se cumplan en el servidor y puedan demostrarse con pruebas y con un Security Pass (`SC-06` a `SC-12`, `SC-17`, `SC-18`).

## Problema / fuerzas que condicionan la decisión

- Las reglas críticas deben ser verificables de forma aislada y no pueden depender de la interfaz.
- Una sola persona desarrolla y opera el sistema: la simplicidad operacional pesa más que la flexibilidad futura.
- El riesgo principal es filtrar datos internos al área pública (`SC-11`) o permitir transiciones inválidas (`SC-06`); una organización que dispersa las reglas lo agrava.
- No hay consumidores externos, ni equipos separados, ni necesidad de desplegar partes de forma independiente.

## Alternativas consideradas

### Opción A — Monolito modular Next.js con capas ligeras *(elegida)*
Una sola aplicación con límites internos: presentación y transporte, aplicación, dominio e infraestructura.

### Opción B — Next.js como UI y un backend/API independiente
Separa responsabilidades con fuerza, pero exige dos despliegues, CORS, dos canalizaciones, secretos duplicados y una superficie de ataque mayor, sin ningún consumidor que lo justifique.

### Opción C — Microservicios
Desproporcionada para un dominio con una orden y sus dependientes.

### Opción D — Arquitectura hexagonal formal (puertos y adaptadores con interfaces y contenedor de inyección de dependencias)
Máxima sustituibilidad, pero introduce abstracciones sin un segundo adaptador real. Las pruebas de integración contra PostgreSQL real ya verifican el comportamiento que importa.

### Opción E — Next.js «plano» (reglas dentro de páginas y acciones, sin capas)
Es lo más rápido al principio, pero dispersa la máquina de estados y la construcción de datos públicos, y hace costoso probar y auditar `SC-11`.

### Lenguaje: JavaScript frente a TypeScript `strict`
Mantener JavaScript evita migrar el scaffold, pero deja sin tipos las piezas que más importan (estados, dinero, código de seguimiento, DTO público frente a administrativo).

## Decisión

- **Monolito modular Next.js** (App Router) con estas capas: `src/app` (rutas, UI y Server Actions como adaptadores de transporte), `application` (casos de uso, transacciones, DTO), `domain` (reglas puras), `infrastructure` (PostgreSQL/Prisma, sesión, criptografía, entorno, reloj, logger, limitador) y módulos puros de presentación (formato de fechas, Journey).
- **Dirección de dependencias:** `app → application`; `application → domain`; `application → infrastructure`; `infrastructure → domain`. **`infrastructure` no importa implementación de `application`. `domain` es independiente** de application, infrastructure, Next, Prisma y Vercel. **No se permiten dependencias circulares.**
- **TypeScript con `strict`**; `typecheck` como puerta de CI.
- **Server Components por defecto**; Client Components solo donde hay interacción real.
- Las reglas sensibles viven en servidor y no en componentes de UI. Los validadores son funciones puras e isomórficas de `domain`.
- Solo `infrastructure` accede a la base de datos y a las variables de entorno; esos módulos son `server-only`.
- **Sin** backend/API separado, microservicios, contenedor de inyección de dependencias ni arquitectura formal de puertos y adaptadores en V1.

## Justificación

Un monolito modular da una sola unidad de despliegue y de seguridad, que es lo que un único operador necesita, y los límites internos hacen probables las reglas de negocio sin infraestructura. Mantener `domain` puro permite pruebas unitarias baratas de la matriz de estados, las capacidades, los validadores y el dinero. TypeScript `strict` convierte en errores de compilación las confusiones que más daño harían (asignar un DTO administrativo donde se espera uno público, usar `number` para dinero, saltarse un estado).

## Consecuencias positivas

- Un despliegue, un pipeline, un conjunto de secretos.
- Reglas críticas aisladas, con cobertura exigente en `domain` (ADR-008).
- Fugas de datos más difíciles: DTO construidos en una capa y tipos separados (ADR-005).
- Migrar o sustituir una pieza de infraestructura afecta sobre todo a `infrastructure`, porque los repositorios devuelven tipos de dominio.

## Consecuencias / trade-offs

- **`application` conoce la infraestructura concreta** en V1: no hay abstracción formal de puertos. Es deliberado: no se introduce inyección de dependencias «por si acaso».
- Las pruebas no sustituyen repositorios por dobles: se prueban contra PostgreSQL real, y solo el reloj y la fuente aleatoria se inyectan (ADR-008).
- La disciplina de capas depende de reglas automáticas y de revisión, no de límites físicos de despliegue.
- La migración a TypeScript añade una tarea inicial al proyecto.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Erosión de capas (lógica que se filtra a componentes o acciones) | Acciones delgadas; reglas de ESLint de importaciones restringidas; revisión; pruebas de integración |
| `domain` crece hasta mezclar presentación o infraestructura | Regla de dependencia explícita; el formateo de fechas y el Journey viven fuera de `domain` |
| Fricción por la migración a TypeScript | Parte del Architecture Validation Gate y de la preparación de la implementación |

## Qué queda deliberadamente fuera

La estructura física de carpetas y archivos, los nombres de los casos de uso y los contratos concretos (Specs). Tampoco se decide aquí el transporte ni el renderizado (ADR-002).

## Condiciones para revisar este ADR

- Aparece la necesidad de un **backend independiente** o de consumidores externos (por ejemplo, otra aplicación cliente).
- Existen **varias aplicaciones, equipos o despliegues independientes**.
- Un segundo adaptador real de persistencia o de otro servicio justifica puertos formales.
- El dominio crece hasta que el monolito deja de ser manejable por una sola unidad de despliegue.

No son funcionalidades prometidas: son los hechos que reabrirían la decisión.

## Referencias

- PRD: `SC-06` a `SC-12`, `SC-17`, `SC-18`, `SUP-02`, `SUP-07`, §4.11.
- [TECHNICAL-DESIGN.md](../TECHNICAL-DESIGN.md) §3 (principios), §4 (stack), §5 (capas y dependencias), §18 (validación).
- Relacionado con: [ADR-002](ADR-002-renderizado-cache-y-transporte.md), [ADR-003](ADR-003-postgresql-prisma-y-migraciones.md), [ADR-008](ADR-008-testing-y-calidad.md).
