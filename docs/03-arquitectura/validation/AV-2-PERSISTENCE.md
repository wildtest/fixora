# AV-2 — Persistencia

**AV-2 overall: PASS.**

```text
Early ESM Compatibility Precheck → PASS
Full Persistence Validation      → PASS (14/14)
Overall AV-2                     → PASS
Neon spike resource cleanup      → COMPLETED
```

Resultados revisados y aprobados por el propietario del proyecto.

**Gate:** Architecture Validation Gate (TD §29), Fase 7.0. **Fecha:** 2026-10-27. Este documento es evidencia, no una decisión de arquitectura nueva; no contradice el Technical Design ni los ADR. No hay `ARCHITECTURE REVIEW REQUIRED`.

## Early ESM Compatibility Precheck

**Resultado: PASS.**

**Pregunta:** ¿La arquitectura prevista de FIXORA puede convivir bajo Node 24 con TypeScript + ESM + Next.js 16.4.3 + Prisma ORM 7.10.1 + `@prisma/adapter-pg`? Respuesta: sí. No implementa CHG-01 ni CHG-02 y no usa el schema real.

### Entorno
| Elemento | Valor |
|---|---|
| Node.js | **v24.22.1** (binario portable oficial verificado por SHA-256); npm 11.19.1. El Node global del usuario (v26.11.1) no se modificó |
| Next.js / React / React DOM | 16.4.3 / 19.3.0 / 19.3.0 |
| TypeScript | **6.0.3** (compatible con `typescript-eslint` `<6.1.0`; no TS 7) |
| `@types/node` / `@types/react` / `@types/react-dom` / `@types/pg` | 24.19.2 / 19.3.0 / 19.3.0 / 8.23.1 |
| Prisma | `prisma`, `@prisma/client`, `@prisma/adapter-pg` **7.10.1** (exactos; **no** el RC 8.x que hoy es el tag `latest` de `prisma`); `pg` 8.23.1 |
| Proyecto | `"type": "module"`, `tsconfig` con `module: ESNext` y `moduleResolution: bundler`, `cacheComponents: true`; spike en un directorio temporal fuera del repositorio |

No se instalaron `tsx`, `server-only` ni `dotenv`. La URL de base de datos fue un valor sintáctico ficticio cargado con `node --env-file`; no se conectó a ninguna base de datos ni se ejecutó `migrate` ni `db push`.

### Comprobaciones
| ID | Comando | Resultado |
|---|---|---|
| A | `node --env-file=… node_modules/prisma/build/index.js generate` (generador `prisma-client`, `output` explícito) | PASS: «Loaded Prisma config from prisma.config.ts» y «Generated Prisma Client (7.10.1)» |
| B | `tsc --noEmit` | PASS (rc 0) |
| C | `next build` (sin conexión a PostgreSQL) | PASS: `○ /` estático, `/_not-found` |
| D | Módulo TS que importa `PrismaPg` y `PrismaClient` e instancia `new PrismaPg({ connectionString })` / `new PrismaClient({ adapter })` sin consultas; incluido en la página y empaquetado por `next build` | PASS (tipos, ESM y empaquetado) |

Comprobación adicional: con el generador `importFileExtension = "ts"`, Node 24.22.1 importa y ejecuta directamente el cliente generado (instancia correcta; `$connect`, `$transaction`, `$queryRaw` presentes) y `tsc` y `next build` siguen pasando. Sin esa opción, el cliente generado usa importaciones sin extensión y Node no puede cargarlo fuera de un empaquetador.

### Hallazgos de configuración (todos IMPLEMENTATION DETAIL; ninguno cambia la arquitectura)
- **Generador:** `provider = "prisma-client"` con `output` obligatorio (`../generated/prisma` en el spike); `datasource db { provider = "postgresql" }` **sin** `url` en el schema.
- **`prisma.config.ts`:** `defineConfig({ schema, datasource: { url: env("DIRECT_URL") } })`; Prisma 7 lo carga bajo Node 24 sin `tsx`. `directUrl` no existe en v7: la CLI usa `datasource.url` (aquí la URL directa). La variable se carga con `node --env-file`; **`dotenv` no es necesario**.
- **Cliente en tiempo de ejecución:** `new PrismaPg({ connectionString })` y `new PrismaClient({ adapter })`.
- **Scripts operativos** (`admin:provision`, `seed:demo`): con `importFileExtension = "ts"` pueden ejecutarse con Node 24 directamente, lo que sugiere que `tsx` no es necesario; CHG-02 lo confirma.
- **npm 11.19** muestra «install-scripts … approve» y no ejecuta por defecto los scripts de instalación de `prisma` y `@prisma/engines`; `prisma generate` funcionó igualmente. A tener en cuenta en CI (`npm ci --ignore-scripts` ya previsto en el TD).
- **Versiones:** fijar `prisma` a 7.10.1 (el tag `latest` es un RC 8) y TypeScript a 6.0.x.
- `next build` añadió `allowJs` a `tsconfig.json`.

## Full Persistence Validation — Neon real

**Resultado: PASS (14/14).** Ejecutado contra un proyecto Neon **real y temporal** (`fixora-av2-spike`, plan gratuito, región `us-east-2`, PostgreSQL 18.6), con Node 24.22.1 portable (SHA-256 verificado contra `SHASUMS256.txt`), fuera del repositorio. No se usó PostgreSQL local, SQLite, mocks ni `db push`.

### Entorno y aprovisionamiento
| Elemento | Valor |
|---|---|
| Dependencias del spike (exactas) | `prisma`, `@prisma/client`, `@prisma/adapter-pg` 7.10.1 · `pg` 8.23.1 · `@types/pg` 8.23.1 · `typescript` 6.0.3 · `@types/node` 24.19.2. Sin Next/React/Playwright/`tsx`/`dotenv`/`server-only`/Vitest |
| Proyecto Neon | creado manualmente por el usuario en la Console (sin `neonctl` ni MCP; no se eludió autenticación). Rama `main`, base de arranque `neondb`, rol `neondb_owner` |
| Owner | `neondb_owner` (miembro de `neon_superuser`, por diseño de Neon); solo para migraciones y provisioning, **nunca** en el runtime |
| Bases creadas por SQL (con el owner) | `fixora_av2` (app), `fixora_av2_shadow` (shadow), `fixora_av2_empty` (prueba desde vacío) |
| Rol runtime | `fixora_av2_runtime`, creado por SQL `CREATE ROLE … LOGIN`: `rolsuper=f`, `rolcreatedb=f`, `rolcreaterole=f`, `rolbypassrls=f`, **sin membresías** (los roles creados desde Console/API/CLI reciben `neon_superuser`, por eso no se crearon así) |
| Secretos | URLs y contraseña en archivos temporales fuera del repo, cargados con `node --env-file`; no se imprimieron ni se guardan en este documento (hosts abreviados como `ep-<ID>`) |

### Conexiones (AV2-02)
| Variable | Rol | Host | Uso |
|---|---|---|---|
| `DATABASE_URL` | `fixora_av2_runtime` | `ep-<ID>-pooler.c-7.us-east-2.aws.neon.tech` (**pooled**) | runtime de la aplicación (adapter-pg) |
| `DIRECT_URL` | `neondb_owner` | `ep-<ID>.c-7.us-east-2.aws.neon.tech` (**directa**) | migraciones (`datasource.url` en `prisma.config.ts`) |
| `SHADOW_DATABASE_URL` | `neondb_owner` | directa, base `fixora_av2_shadow` | `datasource.shadowDatabaseUrl` |

Guardia `guards.mjs` (STOP si falla): `DATABASE_URL ≠ DIRECT_URL`, `DIRECT_URL ≠ SHADOW_DATABASE_URL`, `DATABASE_URL` contiene `-pooler`, `DIRECT_URL` y shadow no, shadow en base distinta, runtime ≠ owner. Positivo: «guards OK». Negativos (variables forzadas a iguales): «STOP: DATABASE_URL === DIRECT_URL» y «STOP: DIRECT_URL === SHADOW_DATABASE_URL» (rc 2).

`prisma.config.ts`: `datasource: { url: env('DIRECT_URL'), shadowDatabaseUrl: env('SHADOW_DATABASE_URL') }` (sin `directUrl`, inexistente en v7). El runtime usa `new PrismaPg({ connectionString: DATABASE_URL })`.

### Migraciones (Prisma Migrate real, sin `db push`)
| Paso | Comando (con `node --env-file=…`) | Resultado |
|---|---|---|
| M1 | `prisma migrate dev --name init` | `init` aplicada vía directa + shadow: 3 tablas (`av2_item`, `av2_privilege_probe`, `av2_history`) |
| M2 | `prisma migrate dev --create-only --name amount_check`; SQL escrito **antes** de aplicar; aplicada con el siguiente `migrate dev` | `ALTER TABLE "av2_item" ADD CONSTRAINT "av2_item_amount_positive" CHECK (amount IS NULL OR amount > 0)` |
| M3 | ídem `runtime_grants` | `GRANT USAGE ON SCHEMA`, `SELECT, INSERT, UPDATE` en `av2_item`, `SELECT, INSERT, UPDATE ("editable_value")` en `av2_privilege_probe`, `SELECT, INSERT` en `av2_history`, `USAGE, SELECT` en las secuencias |
| Estado | `prisma migrate status` | «3 migrations found … Database schema is up to date!» |
| Drift | `prisma migrate dev` repetido | «Already in sync, no schema change or pending migration was found.» (el CHECK manual no genera drift; ninguna migración aplicada se editó) |
| Desde vacío | `fixora_av2_empty` creada por SQL → `prisma migrate deploy` | las 3 migraciones se aplican en orden; `migrate status` limpio; el esquema (columnas, tipos, constraints, índices, 7 grants de tabla + 1 grant de columna) es **idéntico** al de `migrate dev` |

### Pruebas (suite `tests.ts` bajo Node 24, TypeScript sin `tsx`; `tsc` solo avisa de una directiva `@ts-expect-error` sin uso)
| ID | Objetivo | Conexión | Esperado | Real | Resultado |
|---|---|---|---|---|---|
| AV2-01 | Prisma 7.10.1 + adapter-pg + pg | pooled, runtime | consulta correcta con el rol runtime | `current_user=fixora_av2_runtime`; owner directo `neondb_owner`; BD `fixora_av2` | **PASS** |
| AV2-02 | Separación pooled / directa / shadow | las tres | guardias y roles distintos | ver «Conexiones»; mismo rol runtime en directa y pooled (`fixora_av2_runtime`) y owner distinto | **PASS** |
| AV2-03 | TLS real | pooled y directa | conexión cifrada; sin TLS rechazada | ambas `encrypted=true`, TLSv1.3; con `ssl:false` el cliente rechaza («connection is insecure») | **PASS** |
| AV2-04 | `migrate dev` real + 2.ª migración + `status` | directa + shadow | migraciones aplicadas, estado limpio | ver «Migraciones» | **PASS** |
| AV2-05 | Migración desde vacío | directa (`fixora_av2_empty`) | mismo esquema que `migrate dev` | idéntico | **PASS** |
| AV2-06 | `CHECK (amount IS NULL OR amount > 0)` manual | runtime | `0` y `-1.00` rechazados; `0.01` y `NULL` aceptados; sin drift | error `23514` «violates check constraint "av2_item_amount_positive"»; resto aceptado | **PASS** |
| AV2-07 | Transacción interactiva por el pooler | pooled | rollback ante excepción; commit; mismo backend dentro de la tx; `timeout` efectivo | `$transaction(fn, { maxWait: 5000, timeout: 10000, isolationLevel: ReadCommitted })`: tras excepción 0 filas; tras commit 1 fila; mismo `pg_backend_pid()` en dos consultas de la tx; `timeout: 500` con 1500 ms de trabajo → `P2028` | **PASS** |
| AV2-08 | `SELECT … FOR UPDATE` (`$queryRaw` *tagged template*) con dos clientes | pooled (2 `PrismaClient`) | TX-B espera hasta el commit de TX-A y ve su cambio | A `LOCK_ACQUIRED@1113 ms` → B `BEGIN@2026` → A `COMMIT@4692` → B `LOCK_ACQUIRED@4838`, B leyó `v1-by-A`; mientras esperaba, `pg_stat_activity` mostraba `Lock/transactionid`. Coordinación determinista con señales (no depende del azar) | **PASS** |
| AV2-09 | `NUMERIC` sin precisión sin pasar por `number` | pooled | `numeric` sin precisión/escala; cadena canónica; `BigInt` de céntimos | columna `numeric` (`numeric_precision` y `numeric_scale` nulos). `180.00`→`18000n`, `180.01`→`18001n`, `0.01`→`1n`, `12345678901234567890123456789.12`→`1234567890123456789012345678912n`; `SUM(180.00+180.01)=360.01`. `Number("180.00")` daría `180` y el valor grande `1.2345678901234568e+28` (no se usó). Sin `Number()`/`parseFloat`/`Math.round(*100)` | **PASS** |
| AV2-10 | `timestamptz(3)` | pooled | catálogo y mismo instante UTC | `format_type = timestamp(3) with time zone` (`@db.Timestamptz(3)`); `2026-03-15T10:20:30.123Z` ida y vuelta idéntico; `…05:20:30.123-05:00` → mismo instante; `TimeZone` de sesión `GMT`; el sistema local estaba en UTC−5 (offset 300 min), distinto de UTC | **PASS** |
| AV2-11 | `LIKE`/`ILIKE` con `ESCAPE '\'` | pooled | `%`, `_`, `\` literales y substring normal | `%`→solo `ab%cd`; `_`→solo `ab_cd`; `\`→solo `ab\cd`; `b%c`→solo `ab%cd`; `ab`→los 5 títulos con «ab»; `Xc`→`abXcd`; `ILIKE abc`→`abcd` y `zz ABC zz`; sin escapar, `%%%` coincide con 6/6 (contraste) | **PASS** |
| AV2-12 | Rol runtime sin DDL | pooled, runtime | DDL y administración denegados | `CREATE TABLE`, `ALTER TABLE`, `DROP TABLE`, `CREATE SCHEMA`, `CREATE ROLE`, `ALTER ROLE … SUPERUSER`, `TRUNCATE`: denegados; no se creó ningún objeto. **`GRANT` no falla**: PostgreSQL emite un *WARNING* y no otorga nada si el grantor carece de *grant option*; se verificó que la ACL de las tablas no cambia y que `DELETE` sigue denegado tras `GRANT ALL … TO PUBLIC` y `GRANT DELETE, UPDATE … TO fixora_av2_runtime` | **PASS** |
| AV2-13 | `GRANT UPDATE(columna)` | pooled, runtime | solo la columna concedida | `UPDATE editable_value` OK; `UPDATE protected_value` denegado; `DELETE` denegado; fila final `{editable_value: e1, protected_value: p0}` | **PASS** |
| AV2-14 | Historial append-only | pooled, runtime | solo `SELECT`/`INSERT` | `INSERT`/`SELECT` OK; `UPDATE`, `DELETE` y `deleteMany` denegados; nota intacta | **PASS** |

`SELECT current_user`: `neondb_owner` en la conexión directa del owner y `fixora_av2_runtime` en el runtime.

### Implementation inputs for CHG-02 and downstream changes
Todos son **IMPLEMENTATION DETAIL**; ninguno cambia el Technical Design ni los ADR.
1. **Roles de aplicación (Neon):** los roles de mínimo privilegio se crean por **SQL** (`CREATE ROLE … LOGIN PASSWORD …`) con el owner, **no** mediante Neon Console, CLI o API, que asignan `neon_superuser`. El owner/migrador sí puede usar el rol administrativo de Neon (`neondb_owner` es miembro de `neon_superuser` y puede `CREATE DATABASE`/`CREATE ROLE`).
2. **Secuencias:** si una tabla usa secuencia/autoincremento, el rol runtime puede necesitar `USAGE` y `SELECT` sobre la secuencia según la operación. CHG-02 debe probar la matriz real de privilegios con el schema definitivo y **no** conceder `ALL ON ALL SEQUENCES` por defecto sin necesidad demostrada.
3. **Validación de `GRANT`:** un `GRANT` no se considera validado porque el comando no lance excepción (sin *grant option* PostgreSQL emite un WARNING y no otorga nada). La prueba de privilegios debe verificar **ACL/catálogo efectivos + que la operación tenga éxito o falle según lo esperado**: los permisos se validan por comportamiento y ACL.
4. **NUMERIC:** Prisma `Decimal` es exacto y **no** pasa por `number` de JavaScript. `Decimal.toString()` puede normalizar `180.00`→`180` (correcto) y usar notación exponencial en valores grandes. La forma canónica a dos decimales se produce después con lógica exacta (p. ej. `toFixed(2)` o el mecanismo aprobado equivalente) y de ahí `BigInt` con aritmética de cadenas. No introducir `number`.
5. **TLS:** para las conexiones controladas por la aplicación Node, preferir `sslmode=verify-full` explícito en lugar de la semántica implícita de `sslmode=require` (hoy alias de `verify-full` en `pg` 8.23.1, con aviso; `pg` 9 pasará a semántica libpq). CHG-02 debe confirmar la compatibilidad exacta con `pg@8.23.1`, Neon y el adaptador de Prisma al generar las URLs/config definitivas. El parámetro de servidor `ssl` figura `off` en Neon (TLS terminado en el proxy); el cifrado real se comprobó en el socket cliente (TLSv1.3) y con el rechazo de la conexión sin TLS.
6. **`channel_binding`:** NOT REQUIRED BY THE ARCHITECTURE; **not validated in AV-2** (se eliminó de las URLs derivadas del spike). No es requisito ni debe añadirse incidentalmente.
7. **Pooler:** `DATABASE_URL` pooled = hostname del endpoint con `-pooler`. Transacción interactiva + `SELECT … FOR UPDATE` + dos clientes funcionan a través del pooler y el bloqueo es correcto: evidencia suficiente para las decisiones de FIXORA. Sigue prohibido por diseño lo que dependa de estado de sesión (`SET`, *advisory locks* de sesión).
8. **Prisma 7 CLI:** `migrate dev` no admite `--skip-generate`; `--create-only` aplica antes las migraciones pendientes y crea la siguiente sin aplicarla, lo que permite escribir a mano el SQL (CHECK, GRANT) y aplicarlo después sin editar migraciones ya aplicadas. La CLI imprime el host del endpoint: no pegar logs sin redactar.
9. **Shadow:** una base `*_shadow` en el mismo endpoint, creada por el owner, basta para `migrate dev`.

### Ambiente y límites
- **Ambiente del spike (no requisito):** PostgreSQL 18.6, región Neon `us-east-2`. La arquitectura requiere *PostgreSQL on Neon* compatible con los mecanismos aprobados; la versión definitiva se comprobará al crear el entorno real. **No** se fija PostgreSQL 18.6 como requisito de FIXORA.
- **Pooling:** el modo se validó por tipo de endpoint y comportamiento transaccional observable, no por introspección interna del proveedor. No es un finding.
- Un solo proyecto y región; ejecución desde Windows local, no desde Vercel (latencias, cold starts y límites de conexión corresponden a CHG-07/AV-3); un solo cliente concurrente adicional en `FOR UPDATE` (sin pruebas de carga).

## Dependencias diferidas
`tsx` → NOT REQUIRED NOW (Node 24 ejecuta el cliente generado con `importFileExtension = "ts"`; CHG-02 lo confirma) · `server-only` → CHG-01, NOT REQUIRED FOR AV · `dotenv` → NOT REQUIRED (`node --env-file` bastó en todas las pruebas).

## Cambios desbloqueados / bloqueados
**AV-2 Full = PASS.** El prerrequisito de AV de **CHG-02 queda satisfecho** (no aplicado; sigue requiriendo autorización explícita y las demás dependencias). Aguas abajo se despeja el riesgo de CHG-09a (`LIKE`), CHG-11 (`NUMERIC`) y CHG-12 (`SELECT … FOR UPDATE`). AV-3 sigue **DEFERRED UNTIL CHG-07**.

## Archivos temporales y limpieza
Spike en `…/Temp/fixora-architecture-validation/av2-full/` (con las URLs, la contraseña del rol runtime y los scripts), Node portable y descargas: **eliminados** tras documentar; ningún código del spike se copió a `src/`. Spike del precheck ESM (`av2-esm/`): eliminado.

**Neon spike resource cleanup: COMPLETED.** The temporary Neon project `fixora-av2-spike` was deleted manually by the project owner after evidence collection (el agente no tuvo acceso para eliminarlo). Con él desaparecieron las bases `fixora_av2`, `fixora_av2_shadow`, `fixora_av2_empty` y el rol runtime del spike. Este documento no contiene ID de proyecto, URLs, hosts completos ni credenciales.
