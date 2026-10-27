# Proposal

## Why

Todos los vertical slices de FIXORA (registro, consulta, acceso, ciclo de vida) escriben o leen PostgreSQL, y varias de sus garantías de seguridad viven en la base de datos: mínimo privilegio, historiales *append-only* para el rol de aplicación, restricciones declarativas, hash de sesiones, idempotencia del registro y el almacén del limitador de intentos. Esa base debe quedar construida, probada contra PostgreSQL real y protegida de operaciones destructivas **antes** del primer slice; si cada change inventara su propia conexión, su rol o su forma de probar, `SC-11` y `SC-12` se apoyarían en convenciones inconsistentes.

## What Changes

- Preparar **Prisma ORM 7.x estable** con **`@prisma/adapter-pg` y `pg`** sobre **PostgreSQL en Neon**, con la **separación entre el runtime** (`DATABASE_URL`, rol de aplicación, conexión *pooled*) **y el CLI/migraciones** (`DIRECT_URL`, rol migrador, conexión directa, `prisma.config.ts`).
- Definir y migrar el **modelo relacional V1 aprobado** (`repair_orders`, tres historiales tipados, `order_notes`, `registration_idempotency`, `admin_users`, `admin_sessions` y las tablas del limitador) con sus enums, índices y **restricciones declarativas** (segunda barrera parcial; el dominio sigue siendo la autoridad).
- Establecer las **migraciones versionadas, hacia delante y expand/contract**, y los **roles de PostgreSQL con mínimo privilegio** (propietario/migrador frente a aplicación), con `GRANT` en migraciones y sin contraseñas en ellas.
- Crear la **infraestructura de pruebas de integración contra PostgreSQL real** con **guardia anti-desastre** y marcador de entorno de test provisionado de forma deliberada.
- Crear el **componente técnico persistente del limitador** de intentos (almacén, clave HMAC de la IP, ventanas y bloqueos, limpieza oportunista, fallo cerrado desde la primitiva), sin definir su comportamiento visible.
- Crear las **primitivas de transacción y de bloqueo** que los casos de uso futuros necesitarán (transacción atómica, bloqueo de fila parametrizado), sin ningún caso de uso.
- Extender el módulo de **configuración** de `infrastructure` con validación por capacidad para la base de datos y el secreto HMAC, sin que el *build* ni un Preview la requieran.

Es un cambio puramente técnico: **no introduce ningún comportamiento observable del producto**.

## Capabilities

### New Capabilities
Ninguna. Este change no tiene delta specs; se declara `skip_specs: true` en su `.openspec.yaml`. `RATE_LIMITED` y `SERVICE_UNAVAILABLE` como comportamiento observable pertenecen a CHG-06 y CHG-08; no existe una capability `rate-limiting`.

### Modified Capabilities
Ninguna.

## Impact

- **Documentos que respaldan el cambio:** Technical Design §10, §11, §13, §14, §15, §19, §22, §24, §25.1, §29 (AV-2); ADR-003 (PostgreSQL, Prisma y migraciones), ADR-006 (concurrencia e idempotencia), ADR-007 (privilegios y limitador), ADR-008 (pruebas); backlog `CHG-02`.
- **Criterios PRD:** `SC-14` (los datos persisten) como criterio primario. Habilita, sin satisfacerlos, `SC-11` y `SC-12` (mínimo privilegio y hash de sesión) y `E1`, `E9` y `E17` (idempotencia, versión y unicidad del código).
- **Código afectado (cuando se implemente):** `prisma/` (schema y migraciones), `prisma.config.ts`, `src/infrastructure/` (cliente, transacciones, bloqueo, limitador, configuración), `tests/integration/` (apoyo y pruebas) y `package.json`/lockfile.
- **Dependencias:** `prisma`, `@prisma/client`, `@prisma/adapter-pg`, `pg` y, si hiciera falta, los tipos de `pg`. **No se instala nada en este change de planificación**; antes de aplicarlo se hace un preflight de versiones con Prisma 7.x estable (un cambio de major requiere una decisión nueva).
- **Fuera de alcance:** registro, consulta pública, autenticación y sesiones (comportamiento), ciclo de vida, diagnóstico, notas, correcciones, UI, el comportamiento `RATE_LIMITED`/`SERVICE_UNAVAILABLE`, repositorios de aplicación por slice, CI completo (CHG-03), despliegue y *workflow* `migrate-production` (CHG-07). No se ejecuta el Architecture Validation Gate.
