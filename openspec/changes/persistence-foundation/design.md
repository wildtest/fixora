# Design

## Context

Motivación y alcance: ver `proposal.md`. Fuentes: Technical Design (TD) §10, §11, §13, §14, §15, §19, §22, §24, §25.1, §28, §29; ADR-003, ADR-006, ADR-007, ADR-008, ADR-009; backlog `CHG-02`.

**Premisa de orden:** este change se **aplica después de CHG-01**, que ya está **implementado, verificado y archivado** (commit `fbde0c8`). Consume, sin redefinirla, la fundación que CHG-01 entregó: TypeScript estricto y ESM (Node 24.x, `"type": "module"`), la estructura `src/app → application → domain` e `infrastructure`, las reglas de lint por capa (`eslint.config.mjs`, probadas en `tests/tooling/`), el módulo `src/infrastructure/config/env.ts` como único acceso a `process.env`, el logger cerrado (catálogo de ocho eventos del TD §23), `ActionResult`/`runAction` y Vitest 5 (`vitest.config.ts` con alias `@` y `server-only`).

**Estado actual observado (revisión previa a la aplicación, solo lectura):** el repositorio no tiene rastro de Prisma ni de PostgreSQL (`prisma/` no existe, sin dependencias de base de datos); `.env.example` está versionado y **vacío de variables** (solo comentarios); `.env*` reales están en `.gitignore`; `package.json` ya es ESM con TypeScript 6.0.3 y Vitest 5.0.5. **AV-2 está ✅ PASS** (Early ESM Precheck y Full Persistence 14/14 sobre Neon real; evidencia en `docs/03-arquitectura/validation/AV-2-PERSISTENCE.md`). El proyecto Neon del spike (`fixora-av2-spike`) fue eliminado: **no existe ningún recurso Neon de FIXORA**.

**Restricciones heredadas (cerradas en la Fase 5, no se reabren):** PostgreSQL en Neon; Prisma ORM **7.x estable** (nunca RC; un cambio de major exige una decisión nueva), `@prisma/adapter-pg` y `pg`; UUID interno separado del código de seguimiento; migraciones SQL *forward-only* con expand/contract; `READ COMMITTED`; `timestamptz(3)`; `NUMERIC` sin precisión artificial; sin triggers de negocio; sin puertos/DI formales; sin Redis; sin mocks de Prisma; dos roles de PostgreSQL con mínimo privilegio.

## Goals / Non-Goals

**Goals:**
- Dejar una base de datos reproducible desde cero, con el modelo V1 aprobado y sus restricciones declarativas, accesible solo por el rol de aplicación en el runtime.
- Probar contra **PostgreSQL real** las garantías que el diseño atribuye a la base de datos (restricciones, privilegios, atomicidad, bloqueo, limitador).
- Proteger el entorno de pruebas de operaciones destructivas contra la base equivocada.

**Non-Goals:**
- Cualquier caso de uso, repositorio por *slice*, DTO o consulta pública (CHG-05 en adelante); no hay repositorio CRUD genérico.
- El comportamiento visible `RATE_LIMITED`/`SERVICE_UNAVAILABLE` (CHG-06 y CHG-08) y la política de prefijo IPv6.
- CI (CHG-03), el *workflow* `migrate-production` y Vercel (CHG-07), autenticación, `scrypt` y *provisioning* del administrador (CHG-08), `seed:demo`.
- No se repite el Architecture Validation Gate: AV-2 ya está ✅ PASS y su estado se refleja en «Pre-implementation validations».

## Decisions

### D-1. Topología de conexiones y variables
| Variable | Quién la lee | Rol de PostgreSQL | Conexión | Notas |
|---|---|---|---|---|
| `DATABASE_URL` | Runtime de la aplicación, **solo** vía el módulo de configuración | Aplicación (mínimo privilegio) | *Pooled* (Neon) | Nunca expuesta al cliente ni `NEXT_PUBLIC_` |
| `DIRECT_URL` | `prisma.config.ts` y scripts operativos de migración | Propietario/migrador | Directa | **No** está disponible al runtime normal; **no** está en Vercel; en Production se suministra solo al *workflow* o procedimiento privilegiado aprobado (CHG-07) |
| `TEST_DATABASE_URL`, `TEST_DIRECT_URL` | El proceso de pruebas/orquestación | Aplicación / propietario de la rama `test` | *Pooled* / directa | El orquestador puede mapear `DATABASE_URL = TEST_DATABASE_URL` **solo** para el proceso hijo de la aplicación |
| `RATE_LIMIT_HMAC_SECRET` | Módulo de configuración (limitador) | — | — | Secreto dedicado del limitador; exclusivo de test en `test` |
| `SHADOW_DATABASE_URL` | `prisma.config.ts` solo para `migrate dev` | Propietario de una base **desechable** distinta de la del target | Directa | Estrategia demostrada en AV-2 (ver D-8). Solo existe en `development`; no hay `TEST_SHADOW_DATABASE_URL` (en `test` solo se usa `migrate deploy`) |

TLS obligatorio: las URL que controla la aplicación Node usan `sslmode=verify-full` **explícito** (AV-2: `require` es hoy un alias de `verify-full` en `pg` 8.23.1 y cambiará en `pg` 9); CHG-02 confirma la compatibilidad exacta con `pg`, Neon y el adaptador al generar las URL definitivas. `channel_binding` no es requisito de la arquitectura ni fue validado: no se añade. Sin valores, secretos ni archivos `.env` en este change ni en el repositorio; `.env.example` solo gana nombres y comentarios (D-12). El *build* y un Preview no requieren ninguna de estas variables.

### D-2. Prisma: runtime frente a CLI
- **Runtime:** un cliente Prisma con `@prisma/adapter-pg` sobre un `pg` *pool* creado a partir de `DATABASE_URL`, en una **instancia única del lado servidor** (reutilizada entre invocaciones de la misma instancia), exclusivamente en el runtime **Node.js** (no Edge) y detrás de `import 'server-only'`.
- **CLI:** `prisma.config.ts` (ESM) apunta el esquema y las migraciones y usa `DIRECT_URL` para el CLI; **no comparte** configuración con el runtime. En Prisma 7 la conexión del CLI se declara en `prisma.config.ts`, no con propiedades heredadas del *schema* (como `directUrl`); la forma exacta se valida en AV-2.
- **Carga de variables del CLI — decidido con evidencia de AV-2: mecanismo (B), `--env-file` de Node 24, sin `dotenv`.** Prisma 7 no carga `.env` automáticamente (documentación oficial). AV-2 ejecutó el CLI real de Prisma (`generate`, `migrate dev`, `migrate deploy`, `migrate status`) con `node --env-file=… node_modules/prisma/build/index.js …` sin ninguna dependencia adicional. Los scripts de npm usan `node --env-file-if-exists=<archivo local no versionado> node_modules/prisma/build/index.js …` (binario local, nunca `npx prisma` sin control, TD §25.3). `dotenv` queda fuera; si aparentara ser necesario, es **una dependencia que exige aprobación del usuario** antes de instalar.
- **Comandos con y sin conexión.** La documentación oficial de Prisma indica que `env()` **lanza si la variable falta** y que *cada* comando de la CLI carga `prisma.config.ts`, de modo que `generate` y `validate` fallarían sin variables si el archivo usa `env('DIRECT_URL')`. Por tanto `prisma.config.ts` (archivo de raíz, fuera del alcance de la regla de lint de `src/`) lee `process.env.DIRECT_URL` y `process.env.SHADOW_DATABASE_URL` de forma condicional y **declara `datasource` solo si `DIRECT_URL` está presente**; sin ella, `generate` y `validate` funcionan y `migrate *` falla con el error propio de Prisma. AV-2 usó `env()` con variables presentes, por lo que este comportamiento **no estaba demostrado** y se verifica como primera comprobación de la tarea 2.1. **No se introduce una `DATABASE_URL` ficticia** para hacer pasar `generate` (build y flujos estáticos).
- **Generador:** `provider = "prisma-client"` con `output` explícito dentro de `src/infrastructure/db/generated/` (D-3) y `importFileExtension = "ts"` (AV-2: sin esa opción Node no puede ejecutar el cliente generado fuera de un empaquetador, lo que importa para los scripts operativos de CHG-08); eso exige `allowImportingTsExtensions` en `tsconfig.json` (se comprueba al aplicar). `datasource db { provider = "postgresql" }` **sin** `url` ni `directUrl` en el *schema*.
- **Frontera de capas:** los tipos de Prisma **no cruzan** `infrastructure`. `domain/` y `application/` no los importan; `infrastructure` mapea hacia tipos de dominio. A las reglas de lint de CHG-01 se añade la restricción de importar la ruta del cliente generado fuera de `infrastructure/`.
- **Versión:** se diseña para Prisma 7.x. Si en la Fase 7 Prisma 8 fuera estable, **no se migra**: se informa y se pide decisión arquitectónica. Revisión previa (2026-10-27): `prisma`/`@prisma/client`/`@prisma/adapter-pg` **7.10.1** son la última 7.x publicada (el tag `latest` de `prisma` apunta a un RC de la 8: no usar `npm install prisma` sin versión), `pg` 8.23.1 (`latest`) y `@types/pg` 8.23.1.

### D-3. Estructura física
```text
prisma/
  schema.prisma
  migrations/            migraciones SQL versionadas y revisadas
prisma.config.ts         solo CLI
src/infrastructure/
  db/                    cliente (instancia única), transacción, bloqueo de fila, errores seguros
  limiter/               componente técnico del limitador
  config/                (de CHG-01) se extiende con validación por capacidad
tests/integration/
  support/               guardia, reinicio, conexiones (aplicación y propietario)
  *.test.ts              restricciones, privilegios, atomicidad, bloqueo, limitador
```
El cliente generado de Prisma se emite a `src/infrastructure/db/generated/`, **no se versiona** (`.gitignore`) y se excluye de ESLint (`globalIgnores`); se genera con `db:generate`, encadenado en `build` (sin conexión a la base de datos) y ejecutado por CI antes de lint/typecheck. Por eso `typecheck`, `test:integration` y `build` requieren que el cliente exista; las pruebas unitarias de CHG-02 no importan el cliente generado (p. ej. la clave HMAC del limitador es pura). La ruta exacta y las opciones del generador se confirman al aplicar. No se crean repositorios de órdenes, notas ni sesiones: nacen en el slice que los usa.

### D-4. Modelo relacional (nombres del TD §10; tipos y columnas auxiliares son decisión local)
Tablas y columnas en `snake_case`; `timestamptz(3)` en UTC para todos los instantes; los instantes los **aporta la aplicación** (reloj inyectable, mismo `now` en una operación), sin `DEFAULT now()`; sin longitudes en la base de datos (los límites de campos son de la Spec de cada slice).

| Tabla | Columnas principales | Claves y restricciones |
|---|---|---|
| `repair_orders` | `id` uuid; `tracking_code`; `status`; `customer_name`, `customer_name_search`, `customer_phone`, `customer_email?`; `device_type`, `brand`, `model?`, `problem_description`; `diagnosis?`, `estimated_cost?` (numeric); `version`; `created_at`, `updated_at` | PK `id`; `UNIQUE(tracking_code)`; `CHECK(version >= 1)` con `version` inicial 1; `CHECK` de costo; `CHECK` de `SC-07`; índices `(created_at DESC, id DESC)` y `(status, created_at DESC, id DESC)` |
| `order_status_history` | `id`; `order_id`; `from_status?`; `to_status`; `occurred_at` | FK `order_id` `RESTRICT`; `UNIQUE(order_id, to_status)`; `CHECK` de transiciones; índice `(order_id, occurred_at DESC)`. Única tabla de historial consumible por lo público; sin texto libre |
| `diagnosis_history` | `id`; `order_id`; valor anterior y nuevo (ambos admiten `NULL`); `occurred_at` | FK `RESTRICT`; índice `(order_id, occurred_at DESC)`. Solo administrativa |
| `cost_history` | `id`; `order_id`; costo anterior y nuevo (admiten `NULL`); `occurred_at` | FK `RESTRICT`; índice `(order_id, occurred_at DESC)`. Solo administrativa; sin texto libre |
| `order_notes` | `id`; `order_id`; `visibility`; `content`; `version`; `created_at`, `updated_at` | FK `RESTRICT`; `CHECK(version >= 1)`; índice `(order_id, visibility, created_at DESC)`; eliminación física |
| `registration_idempotency` | `key_hash`; `order_id`; `created_at` | `UNIQUE(key_hash)` y `UNIQUE(order_id)`; FK `RESTRICT`; vive tanto como la orden; solo SHA-256 de una clave aleatoria |
| `admin_users` | `id`; `email`; `password_hash`; `created_at`, `updated_at` | `UNIQUE(email)`; **singleton** garantizado por la base de datos; el mecanismo exacto (candidatos: `CHECK` sobre una clave fija, clave centinela única o índice único sobre una expresión constante) **no está congelado** y se decide en AV-2/implementación |
| `admin_sessions` | `id`; `admin_user_id`; `token_hash`; `created_at`, `last_seen_at`, `expires_at` | FK `ON DELETE CASCADE`; `UNIQUE(token_hash)`; índices por `admin_user_id` y `expires_at`; sin IP ni user-agent; solo SHA-256 del token |
| Limitador (D-9) | clave de sujeto (HMAC), superficie, ventana, contador, `blocked_until` | Separado por completo de las tablas de negocio, sin claves foráneas |

**Enums** (valores ASCII estables): `OrderStatus` (los ocho estados), `DeviceType` (`CELULAR`, `TABLET`, `LAPTOP`, `PC`, `CONSOLA`, `OTRO`), `NoteVisibility` (`PUBLIC`, `INTERNAL`) y la superficie del limitador. La máquina de estados **no** se implementa en la base de datos.

**No se almacena:** IMEI, número de serie, contraseña o PIN, accesorios, fotografías, facturación, técnico, sucursal, prioridad, moneda, motivo de cancelación, aprobación del cliente, autor, historial de notas o correcciones ni auditoría de accesos.

**Alcance del modelo (resuelto).** CHG-02 materializa en la Fase 7 el **baseline físico completo de persistencia de V1** aprobado por el Technical Design: todas las tablas, columnas, restricciones e índices anteriores, incluidos `diagnosis`, `estimated_cost`, `version`, `customer_name_search` y las estructuras de sesiones, idempotencia, notas y limitador. Esto resuelve OQ-1 y Q-6 (la clarificación quedó registrada en `OPENSPEC-STRATEGY.md`). **Tener la estructura no implementa el comportamiento:** `diagnosis` en la tabla no implementa diagnóstico, `admin_sessions` no implementa el acceso, `order_notes` no implementa notas y las tablas del limitador no implementan `RATE_LIMITED`.

**Los vertical slices se mantienen a nivel funcional.** CHG-05, 06, 08, 09a, 09b, 10, 11, 12 y 13 siguen siendo dueños de los casos de uso, los repositorios y consultas específicos, los DTO, las reglas de negocio, las Server Actions, la UI, los errores observables y las pruebas funcionales. CHG-02 no implementa por anticipado repositorios completos para esas capabilities. Cambios posteriores al modelo siguen la regla *forward-only* y expand/contract (D-6).

### D-5. Restricciones declarativas (segunda barrera parcial, TD §11)
Solo las aprobadas por el Technical Design. **No se añaden restricciones no aprobadas** (formato del código, no-op de historial, longitudes de campo): si apareciera una, se mueve a AV-2 o se elimina del baseline.

**Auditoría de restricciones no triviales.** Cada una tiene una base documental: **A** = decisión explícita en TD/ADR; **B** = consecuencia directa de una decisión aprobada; **C** = endurecimiento nuevo (ninguna).

| Restricción o regla | Base | Referencia / derivación |
|---|---|---|
| `UNIQUE(tracking_code)` | A | TD §10 y §11 (`E17`) |
| `UNIQUE(order_id, to_status)` en `order_status_history` | A | TD §11: «una orden nunca entra dos veces en el mismo estado (solo avance)». Se mantiene por estar aprobada explícitamente; **no sustituye** a la máquina de estados, que garantiza la secuencia junto con la versión optimista y las pruebas |
| `CHECK` de transiciones de una fila | A | TD §11 (evento inicial más los 10 pares) |
| `CHECK` de costo (nulo o > 0, a lo sumo dos decimales) | A | TD §8 y §11 |
| `CHECK` de `SC-07` (sin `CANCELADO`) | A | TD §11 |
| `CHECK(version >= 1)` en órdenes y notas | A | TD §11 y §14.1 |
| `UNIQUE(key_hash)` en `registration_idempotency` | A | TD §10, §11 y §13 (semántica de idempotencia) |
| `UNIQUE(order_id)` en `registration_idempotency` | A | TD §10, §11 y §13 (`key_hash UNIQUE, order_id UNIQUE`; «una fila por orden creada»). Significa que una orden es el resultado original de exactamente una clave; la semántica funcional se implementa en CHG-05 |
| Singleton de `admin_users` | A (la regla); mecanismo **no** congelado | TD §10, §11 y §15: «una restricción de la BD impide más de un administrador» |
| `UNIQUE(email)` en `admin_users`; `UNIQUE(token_hash)` en sesiones | A | TD §10 y §15 |
| FK `RESTRICT` entre la orden y sus dependientes; `ON DELETE CASCADE` en `admin_sessions.admin_user_id` | A | TD §10 (convenciones) y §15 |
| Índices | A | TD §15 y §19 (lista de índices iniciales) |
| Clave primaria `(sujeto, superficie)` de la tabla del limitador | B | TD §22: contador y bloqueo «por clave de cliente y superficie»; el modelo exacto es decisión local de este design |
| Privilegios del rol de aplicación (matriz de D-7) | A para órdenes, historiales, idempotencia, notas y `admin_users`; B para sesiones y limitador | TD §11 («lo estrictamente necesario» para sesiones y limitador): el cierre de sesión y la limpieza justifican `DELETE` |

Ninguna restricción quedó en la categoría C.

**Qué garantiza y qué no el `CHECK` de transiciones.** Solo valida la pareja `from_status → to_status` **de una fila**. **No garantiza** que el historial previo termine en `from_status`, que `repair_orders.status` coincida con el último evento, que no se salten eventos mediante `UPDATE` directo, que las filas se hayan insertado en secuencia ni que orden e historial sean atómicos. Esas garantías corresponden al dominio, al caso de uso, a la transacción, a la versión optimista, al repositorio, a las pruebas y a los privilegios del rol de aplicación (ADR-003, ADR-006). **PostgreSQL no es la máquina de estados.** La publicación de diagnóstico y costo **no** es una columna: depende del estado y del historial.

### D-6. Migraciones
Versionadas, revisadas, *forward-only* y expand/contract; nunca se edita una migración ya aplicada en un entorno compartido; nunca `db push` en Production ni migraciones en `build`, arranque o Preview; nunca desde el rol de aplicación. La **migración inicial construye una base vacía** de forma reproducible. El SQL que Prisma no expresa (`CHECK`, singleton, `GRANT`) es SQL manual dentro de las migraciones y es parte revisable del diseño. Una prueba verifica que una base vacía llega al esquema actual solo con las migraciones. **Prisma frente a SQL manual:** algunas invariantes aprobadas pueden requerir SQL manual en las migraciones si el *schema* de Prisma no las expresa correctamente. El flujo es: generar la migración, revisar el SQL, añadir de forma controlada la restricción o el `GRANT` manual dentro de la propia migración (nunca en scripts arbitrarios ni editando una migración ya aplicada) y probar la migración desde una base vacía.

### D-7. Roles y privilegios
| Rol | Uso | Privilegios |
|---|---|---|
| Propietario/migrador | `DIRECT_URL`; DDL, `GRANT`, migraciones, *provisioning*, tareas *break-glass* | Propietario; **no existe en el runtime desplegado** |
| Aplicación (runtime) | `DATABASE_URL` | Sin DDL. `repair_orders`: `SELECT`, `INSERT`, `UPDATE` (sin `DELETE`). Historiales y `registration_idempotency`: `SELECT`, `INSERT` (sin `UPDATE` ni `DELETE`). `order_notes`: `SELECT`, `INSERT`, `UPDATE`, `DELETE`. `admin_users`: solo `SELECT`. `admin_sessions` y limitador: lo estrictamente necesario |

Los `GRANT` van en las migraciones y **fallan de forma explícita si el rol de aplicación no existe**. El rol de aplicación y su contraseña se crean mediante un **paso operativo previo e interactivo** (nunca en una migración ni en el repositorio). **Evidencia de AV-2:** el rol de aplicación se crea **por SQL** (`CREATE ROLE … LOGIN PASSWORD …`, con el propietario) y **no** desde Neon Console, CLI o API, porque estos asignan `neon_superuser` (invalidaría el mínimo privilegio); un rol creado por SQL queda sin `CREATEDB`/`CREATEROLE`/superusuario ni membresías. Según la documentación de Neon, los roles son **de ámbito de rama** y una rama hija copia los roles de su padre: por eso el rol de aplicación se crea (y su contraseña se fija con `ALTER ROLE`) **en cada rama** (`development`, `test`; `main` en CHG-07), nunca en `main` antes de ramificar, y las contraseñas del propietario y de la aplicación se restablecen por rama. Nombres de rol: propuesta `fixora_app` (aplicación) y el propietario por defecto de cada rama (`neondb_owner`, miembro de `neon_superuser` por diseño de Neon, solo para migraciones).

**Secuencias.** Todas las claves primarias son UUID y la tabla del limitador usa clave compuesta: **no hay secuencias ni `serial`/`autoincrement`**, por lo que no se concede ningún privilegio de secuencia (nunca `ALL ON ALL SEQUENCES`). Si algún cambio posterior introdujera una secuencia, concederá `USAGE`/`SELECT` solo sobre ella.

**Validación de privilegios = ACL + comportamiento.** Un `GRANT` que no lanza excepción no demuestra nada (AV-2: sin *grant option* PostgreSQL emite un `WARNING` y no otorga). Las pruebas de la tarea 5.4 comprueban a la vez el catálogo (`has_table_privilege`, `has_column_privilege`, `relacl`) y el resultado real de operaciones permitidas y denegadas. Los historiales son *append-only* **para el rol de aplicación del runtime**, no de forma absoluta en PostgreSQL: el propietario, el migrador y los procedimientos *break-glass* conservan privilegios mayores. La garantía de runtime se verifica con pruebas de catálogo y de privilegios. Una prueba de integración comprueba los privilegios (intentos permitidos y denegados, y `has_table_privilege`/`has_column_privilege`).

**`GRANT UPDATE` por columnas (AV-2 lo demostró sobre una tabla de sonda):** `GRANT UPDATE(col)` funciona con Prisma/Neon (actualizar la columna concedida OK; la no concedida y `DELETE` denegados). Queda por confirmar en las tablas reales: se evaluará restringir al rol de aplicación el `UPDATE` de `repair_orders` excluyendo al menos `id`, `tracking_code` y `created_at`, y el de `order_notes` excluyendo `visibility` y `created_at`, comprobando que los `update` de Prisma de los changes posteriores solo escriben columnas concedidas. Si no encaja de forma limpia, no es un requisito. Si funciona, es defensa en profundidad; si no, la inmutabilidad de esas columnas sigue obligatoria en el dominio, los casos de uso, el repositorio y las pruebas, y el riesgo residual se documenta.

### D-8. Shadow database
`prisma migrate dev` necesita una base de sombra. **Estrategia demostrada en AV-2:** una **base de datos separada** (`fixora_shadow`) creada por SQL con el propietario, en el mismo *endpoint* directo de la rama `development`; Prisma la reinicia en cada `migrate dev` (incluidas las migraciones con `GRANT`, porque los roles son de la rama). Política obligatoria: nunca la base del target, nunca `test`, nunca `main`/Production, nunca la misma URL del *datasource*, y ningún mecanismo puede borrar una base persistente por accidente. Guardias que se implementan y prueban (si fallan, **STOP** antes de ejecutar nada): `DIRECT_URL ≠ SHADOW_DATABASE_URL`, **nombre de base distinto**, ninguna es *pooled*, y ninguna coincide con `DATABASE_URL`, `TEST_DATABASE_URL` ni `TEST_DIRECT_URL`.

### D-9. Componente técnico del limitador (`src/infrastructure/limiter/`)
Solo la primitiva persistente; sin comportamiento visible ni capability (`rate-limiting` no existe).
- **Almacén** en PostgreSQL, en una tabla separada de negocio: clave de sujeto, superficie, inicio de ventana, contador de fallos, `blocked_until`, `updated_at`; clave primaria `(sujeto, superficie)`.
- **Clave de sujeto:** `HMAC(RATE_LIMIT_HMAC_SECRET, sujeto)`; el sujeto llega **ya canonicalizado** (la normalización de IP y el prefijo IPv6 se deciden en la Spec de seguridad; esta primitiva no fija `/64`). Nunca se almacena la IP en claro.
- **API conceptual:** consultar si un sujeto está bloqueado y registrar un fallo con una política (máximo de fallos, ventana, bloqueo) **recibida como parámetro** de cada consumidor (los valores del TD §22 pertenecen a CHG-06 y CHG-08). Los aciertos no cuentan.
- **Atomicidad:** el contador se actualiza con una única sentencia parametrizada (`INSERT … ON CONFLICT DO UPDATE`), segura ante concurrencia.
- **Fallo cerrado:** el resultado de la primitiva es una unión técnica conceptual `allowed` | `blocked` | `unavailable`, sin ningún texto de interfaz ni contrato `RATE_LIMITED`/`SERVICE_UNAVAILABLE`. Ante cualquier fallo de la base de datos devuelve `unavailable`; nunca «permitido». Cómo se presenta lo deciden CHG-06 y CHG-08.
- **Limpieza oportunista**, sin cron: elimina filas con ventana y bloqueo vencidos de forma acotada. Reloj y fuente de HMAC como parámetros.
- Privilegios del rol de aplicación: `SELECT`, `INSERT`, `UPDATE`, `DELETE` sobre estas tablas.

### D-10. Primitivas de transacción y de bloqueo (sin casos de uso)
- Una función de **transacción atómica** sobre `prisma.$transaction` interactiva con aislamiento `READ COMMITTED` explícito, tiempos de espera como parámetros y **sin reintentos automáticos**. Expone a `application/` un **tipo de contexto opaco** de infraestructura (no el tipo de Prisma), de modo que `application/` orqueste transacciones sin depender de Prisma.
- Una primitiva de **bloqueo de fila** de la orden con SQL parametrizado (`SELECT … FOR UPDATE`), usada más adelante por notas y cierres. Se prohíben `$queryRawUnsafe`/`$executeRawUnsafe` y la concatenación de SQL (lint).
- El diseño deja sitio, sin implementarlos, a: orden + evento inicial + idempotencia atómicos, actualización condicional por versión e historiales atómicos. **No se crea un repositorio CRUD genérico (nada como `GenericRepository<T>`) ni repositorios funcionales de órdenes, seguimiento, administración, notas o ciclo de vida:** llegan con el slice que los necesita. `domain/` permanece independiente; los tipos de dominio y los DTO no contienen tipos de Prisma; los errores de Prisma no cruzan hacia arriba sin ser mapeados; no se crean puertos ni DI formales por «pureza».

### D-11. Futura proyección pública (SC-11)
Registrado para los slices: la consulta pública futura será un repositorio específico con **lista positiva**, que **no carga `diagnosis` ni `estimated_cost` en memoria de la aplicación mientras no sean públicos** (autorización en la proyección) y no reutiliza DTO administrativos. El modelo de CHG-02 no debe empujar hacia un `findUnique` indiscriminado: por eso no se crea ningún acceso de lectura de órdenes aquí.

### D-12. Configuración y `.env.example`
El módulo de configuración de CHG-01 se **extiende con validación por entorno y capacidad**: `database` (`DATABASE_URL`), `limiter` (`RATE_LIMIT_HMAC_SECRET`), `migration` (`DIRECT_URL`, accesible solo desde `prisma.config.ts` y scripts, no desde el código de aplicación) y `test` (`TEST_*`). Se evalúa de forma **perezosa** (al usar la capacidad), nunca al importar, de modo que el *build* y un Preview compilan sin secretos; una capacidad sin configuración **falla de forma segura** y no busca credenciales alternativas. `.env.example` se actualizará solo con **nombres y comentarios**.

### D-13. Pruebas de integración y guardia anti-desastre
- **Entorno y titularidad:** CHG-02 posee el contrato de BD de test (`TEST_DATABASE_URL`, `TEST_DIRECT_URL`), el marcador, la guardia, el reinicio y la aplicación de las migraciones al esquema de test, y el harness mínimo de PostgreSQL real con sus pruebas (migraciones, restricciones, privilegios, transacción y limitador). PostgreSQL real en la rama Neon `test`; sin SQLite, memoria ni mocks de Prisma. Un proyecto de Vitest de integración local (script `test:integration` o equivalente), **serial** (`fileParallelism` desactivado, una sola base compartida), con `include` en `tests/integration/**`. La orquestación global y la CI son de CHG-03 (ver «Handoff to CHG-03»).
- **Dos conexiones:** el rol de aplicación ejecuta lo probado; el propietario solo prepara, inspecciona y reinicia.
- **Marcador de entorno de test (comprobación decisiva):** un objeto en un esquema propio (`fixora_ops`, fuera de lo que Prisma gestiona; Prisma solo inspecciona `public`) que **solo se aprovisiona de forma explícita y deliberada** con una acción interactiva y confirmación tipada. **No lo crean** las pruebas, el arranque ni las migraciones, y **no se autocrea** si falta. Existe **solo en la rama `test`** (nunca en `development` ni `main`) y el rol de aplicación no tiene acceso a ese esquema. Que no provoque *drift*, no se pierda con `migrate deploy` y no lo cree la propia migración **no se probó en AV-2**: se verifica en las tareas 7.2 y 7.6.
- **Guardia** antes de cualquier operación destructiva (`TRUNCATE`): existen las variables `TEST_*`; el marcador existe y es de test; y, cuando las URL normales de desarrollo o producción estén disponibles al proceso de orquestación, `TEST_*` no coinciden con ellas. Si algo falla o no puede comprobarse, **se aborta**. No se basa en que el nombre de la base contenga «test». El proceso hijo de la aplicación recibe `DATABASE_URL = TEST_DATABASE_URL` sin invalidar la guardia (el reinicio no corre dentro de la aplicación).
- **Reinicio controlado** que incluye las tablas técnicas (sesiones, limitador, idempotencia) y se ejecuta tras la guardia; sin *bypass* del limitador.
- **Pruebas de este change:** una base vacía llega al esquema solo con migraciones; cada restricción de D-5 acepta lo válido y rechaza lo inválido (los 64 pares de transiciones se prueban en CHG-10); privilegios del rol de aplicación; atomicidad de una transacción; bloqueo de fila con dos conexiones; limitador (ventana, bloqueo, concurrencia, fallo cerrado, ausencia de IP en claro); la guardia aborta sin marcador.

### D-14. Ejecución de scripts TypeScript
Los scripts operativos (aprovisionar el marcador, etc.) se ejecutan con **Node 24 de forma nativa** (AV-2 ejecutó TypeScript con `pg` y el cliente generado directamente bajo Node 24.22.1). Restricciones que ello impone: sintaxis borrable de tipos, importaciones relativas **con extensión `.ts`** y **sin el alias `@/`**, que Node no resuelve; por eso el script de aprovisionamiento del marcador es autónomo (`pg` + variables de entorno) y la guardia/reinicio de las pruebas viven en `tests/integration/support/` y se ejecutan solo bajo Vitest. Si algo no fuera viable, se solicita aprobación antes de instalar `tsx`. No se añade por defecto.

### D-15. Dependencias (no se instalan aquí)
Candidatas exactas (validadas en AV-2; publicadas y estables el 2026-10-27, se reconfirman en 1.2): `prisma` **7.10.1** (dev), `@prisma/client` **7.10.1**, `@prisma/adapter-pg` **7.10.1**, `pg` **8.23.1** y `@types/pg` **8.23.1** (dev; `pg` y los tipos se declaran directamente porque las pruebas y los scripts importan `pg` aunque el adaptador ya los traiga como transitivos). Fijadas con versión exacta, nunca RC/`next`/Prisma 8. Quedan fuera `tsx`, `dotenv` (AV-2 demostró que `--env-file` basta), Redis, Zod, Faker, `testcontainers`, SDK/CLI de Neon y herramientas de CI; cualquiera de ellos que resultara necesario exige aprobación del usuario antes de instalar.

## Handoff to CHG-03

**CHG-02 entrega:** las primitivas de prueba de persistencia, el contrato de BD de test (`TEST_*`), el marcador y la guardia anti-desastre, el reinicio y la aplicación de migraciones para tests, el harness local de PostgreSQL real, el script `test:integration` (o equivalente) y las pruebas propias de persistencia (migraciones, restricciones, privilegios, transacción, bloqueo y limitador).

**CHG-03 añade, consumiendo lo anterior:** la orquestación global de Vitest y la configuración global de proyectos, la cobertura y sus umbrales, la base de Playwright, `TRACEABILITY.md`, los jobs `static` y `db-tests`, la cola y concurrencia de GitHub, los secretos del entorno `test`, la integración con la protección de `main`, el escaneo de secretos, `npm audit` y la **ejecución en CI** del harness de CHG-02.

**Regla:** CHG-02 construye el harness de persistencia; CHG-03 industrializa y orquesta la calidad y la CI. CHG-03 no vuelve a definir el marcador, la guardia ni el reinicio.

## Pre-implementation validations — AV-2 (estado tras la ejecución del gate)

**AV-2 ✅ PASS** (Early ESM Precheck + Full Persistence 14/14, 2026-10-27; `docs/03-arquitectura/validation/AV-2-PERSISTENCE.md`). Cubre lo que exige el TD §29. La lista de 16 puntos de abajo se escribió antes de ejecutar el gate y era más amplia; este es su estado real:

| # | Estado | Dueño de lo que falta |
|---|---|---|
| 1, 2 | ✅ Demostrado (Prisma 7.10.1 + adapter-pg + pg; rol de aplicación por el *pooler*; ESM; `prisma.config.ts` con `datasource.url`/`shadowDatabaseUrl`, sin `directUrl`) | — |
| 3 | ✅ Decidido: `node --env-file` (mecanismo B), sin `dotenv` | — |
| 4 | ⚠️ **No demostrado**: AV-2 usó `env()` con variables presentes; la documentación indica que `env()` lanza si faltan | Tarea 2.1 (primera comprobación) |
| 5 | ✅ Demostrado (base de sombra separada, creada por el propietario) | — |
| 6, 7, 8, 9, 11 | ✅ Demostrado (transacción interactiva con `READ COMMITTED`; `FOR UPDATE` parametrizado con dos clientes por el *pooler*; `NUMERIC` exacto con `BigInt`; `timestamptz(3)`; `LIKE … ESCAPE`) | Los consumidores de `NUMERIC`, `LIKE` y `FOR UPDATE` son CHG-11, CHG-09a y CHG-12 |
| 10 | ⚠️ `CHECK` manual y `GRANT` ✅; **mecanismo del singleton de `admin_users` no probado** | Tarea 4.2 (elegir y probar) |
| 12 | ✅ Demostrado en esencia (rol creado por SQL, sin DDL, `GRANT` verificados por ACL y comportamiento, historial *append-only*); falta repetirlo sobre las tablas reales (sin `DELETE` en `repair_orders`) | Tarea 5.4 |
| 13 | ✅ `GRANT UPDATE(col)` demostrado en una tabla de sonda; falta decidir/probar en las tablas reales | Tarea 5.5 |
| 14 | ⚠️ Parcial: `next build` con el cliente generado y `prisma generate` ✅; el encadenado en `build` y la ruta definitiva no | Tareas 2.3 y 2.5 |
| 15 | ⚠️ **No demostrado** (marcador en esquema ajeno a Prisma) | Tareas 7.2 y 7.6 |
| 16 | ✅ Demostrado (Node 24.22.1 ejecuta TypeScript con `pg` y el cliente generado) con las restricciones de D-14 | — |

Los puntos ⚠️ no bloquean el gate de AV-2 (están fuera de su lista en el TD); pasan a ser **verificaciones explícitas dentro de CHG-02** y, si una falla de forma que contradiga una decisión del TD, se detiene la aplicación y se solicita revisión arquitectónica. No se crea un AV-4. Lista original (referencia histórica):
1. Prisma ORM **7.x estable efectivo** con `@prisma/adapter-pg` y `pg` sobre Neon *pooled* con el **rol de aplicación** (no propietario).
2. **Proyecto ESM** y `prisma.config.ts`: el CLI usa `DIRECT_URL`; el runtime usa `DATABASE_URL` + adaptador; no se usan propiedades heredadas del *schema* que ya no correspondan a Prisma 7.
3. **Mecanismo de carga de variables del CLI** (no decidido): variables del proceso (A), mecanismo estable de Node 24 (B) o `dotenv` con aprobación (C), elegido con prueba real.
4. **Comandos con y sin conexión:** `prisma generate` y `validate` funcionan sin variables de conexión y sin una `DATABASE_URL` ficticia; solo los comandos que conectan las exigen.
5. **Estrategia de *shadow database*** segura con Neon (D-8) y soporte de `SHADOW_DATABASE_URL`.
6. **Transacciones interactivas** con `READ COMMITTED` explícito.
7. **SQL parametrizado** con `$queryRaw`/`$executeRaw` y `SELECT … FOR UPDATE` bajo transacción interactiva.
8. **`NUMERIC`** sin máximo artificial: mapeo de `Decimal` y conversión exacta con cadena canónica y `BigInt`, sin pasar por `number`.
9. **`timestamptz(3)`**: el mapeo declarado explícitamente no cae en `timestamp(3)`.
10. **Restricciones que Prisma no expresa** (`CHECK`, singleton, `GRANT`) como SQL manual en las migraciones, sin *drift* ni fallos en `migrate dev`/`deploy`; **mecanismo exacto del singleton** de `admin_users`.
11. **Escape literal de `LIKE`** (`%`, `_`, `\`), validado aquí aunque se consuma en CHG-09a.
12. **Roles:** nombres y creación del rol de aplicación y del propietario en Neon; `GRANT` que **fallan** si el rol falta; el rol de aplicación no tiene DDL, ni `DELETE` en `repair_orders`, ni `UPDATE`/`DELETE` en historiales; conexión *pooled* con ese rol.
13. **`GRANT UPDATE` por columnas** con Prisma/Neon y sin romper los flujos legítimos de actualización (D-7).
14. **Generación del cliente** durante el *build*, ejecución solo en Node y ubicación del cliente generado (D-3).
15. **Marcador de entorno** en un esquema ajeno a Prisma: no provoca *drift*, no se pierde con `migrate deploy` y no se autocrea.
16. **Ejecución nativa de scripts TypeScript** en Node 24 (D-14).

## Risks / Trade-offs

- [Primer change con base de datos: Prisma 7, Neon, roles y migraciones a la vez] → AV-2 previo; migración desde cero verificada; revisión de privilegios por catálogo.
- [Una restricción SQL manual provoca *drift* o fallos de `migrate`] → Validada en AV-2; pruebas de integración de cada restricción.
- [`GRANT` por columnas no soportado de forma limpia] → No es requisito: queda como evaluación.
- [El baseline completo adelanta tablas que ningún slice usa todavía] → Son tablas vacías sin comportamiento; el coste es una sola migración revisada; se documenta la desviación respecto de la estrategia (Open Questions).
- [La guardia falla en proteger por una URL mal apuntada] → El marcador explícito es la comprobación decisiva; no hay autoaprovisionamiento.
- [Conexiones agotadas en *serverless*] → Conexión *pooled* y tamaño de *pool* acotado; ajuste en implementación.
- [Arranque en frío de Neon en pruebas] → Calentamiento y tiempos de espera generosos (CHG-03 los integra en CI).
- [El limitador falla abierto por un error] → La primitiva devuelve `unavailable` ante cualquier fallo; prueba específica.
- [Prisma 8 estable aparece antes de aplicar] → No se migra automáticamente; decisión arquitectónica nueva.

## Migration Plan

1. Preflight de versiones de Prisma 7.x y aprobación de dependencias; AV-2 aprobado (✅ PASS).
2. Provisionar (con aprobación explícita del usuario, creación manual en la consola de Neon y SQL con el propietario) un proyecto Neon de FIXORA con ramas `development` y `test` (`main` queda reservada y vacía para Production/CHG-07), la base de sombra `fixora_shadow` en `development`, el rol de aplicación **por SQL** en cada rama y el marcador de `test`. La topología exacta del proyecto frente a la integración de Vercel Marketplace es una **decisión pendiente del usuario (OQ-14)**.
3. Añadir dependencias, `prisma.config.ts`, el esquema y la **migración inicial** (tablas, enums, índices, `CHECK`, singleton, `GRANT`).
4. Implementar cliente, transacción, bloqueo y limitador, y extender la configuración.
5. Implementar el proyecto de integración, la guardia y las pruebas.
6. Verificar `lint`, `typecheck`, `build`, `test:unit` y `test:integration`.

**Rollback:** solo se tocan ramas de desarrollo y de pruebas, nunca Production: se revierte el código con `git` y se restablece la rama Neon afectada. La aplicación de migraciones a Production pertenece a CHG-07 y no forma parte de este change.

## Open Questions

| # | Pregunta | Clasificación |
|---|---|---|
| OQ-1 | Alcance del baseline físico de V1 en CHG-02 y su relación con Q-6 | **RESUELTA** — CHG-02 materializa en la Fase 7 el baseline físico completo; no implementa los comportamientos; la clarificación quedó registrada en `OPENSPEC-STRATEGY.md` |
| OQ-2 | Titularidad CHG-02 / CHG-03 de la infraestructura de pruebas de integración | **RESUELTA** — CHG-02 construye el harness de persistencia; CHG-03 orquesta y ejecuta en CI (ver «Handoff to CHG-03») |
| OQ-3 | Versión exacta de Prisma 7.x y de `pg`/`@prisma/adapter-pg` | **RESUELTA** — candidatas 7.10.1 / 8.23.1 (D-15), reconfirmadas en la tarea 1.2 |
| OQ-4 | Mecanismo de carga de variables del CLI de Prisma 7 | **RESUELTA** — `node --env-file` (AV-2); `dotenv` NO. Pendiente solo el comportamiento de `generate` sin variables (tarea 2.1) |
| OQ-5 | Estrategia de *shadow database* y `SHADOW_DATABASE_URL` | **RESUELTA** — base separada `fixora_shadow` creada por el propietario (AV-2, D-8) |
| OQ-6 | Nombres de roles y mecánica de creación en Neon | **RESUELTA en mecánica** — por SQL, por rama (AV-2, D-7); nombre propuesto `fixora_app` |
| OQ-7 | `GRANT UPDATE` por columnas | Demostrado en tabla de sonda (AV-2); adopción en tablas reales en la tarea 5.5 |
| OQ-8 | Mecanismo del singleton de `admin_users` y del marcador de test frente a *drift* de Prisma | **ABIERTA** — se cierra en las tareas 4.2 y 7.2/7.6 (no probado en AV-2) |
| OQ-9 | Casos límite de SQL/Prisma (`NUMERIC`, `timestamptz(3)`, `CHECK`, `LIKE`, bloqueo) | **RESUELTA** — AV-2 (14/14) |
| OQ-10 | Generación de UUID, tamaño del *pool*, *timeouts*, forma exacta del cliente generado y de la tabla del limitador | IMPLEMENTATION DETAIL |
| OQ-11 | Normalización de IP y prefijo IPv6; políticas y valores de los límites | DEFERRED a CHG-06/CHG-08 y a la Spec de seguridad |
| OQ-12 | Desempate determinista del historial administrativo compuesto | DEFERRED a CHG-09b |
| OQ-13 | Límites de longitud de campos y restricciones adicionales (p. ej. formato del código) | DEFERRED a CHG-05 |
| OQ-14 | **Topología de Neon frente a Vercel Marketplace.** TD §3/§25.1 y ADR-003 fijan «Neon vía Vercel Marketplace» con ramas `development`/`test`/`main` en un proyecto, pero CHG-02 (Tier 0) necesita `development` y `test` **antes** de que exista el proyecto de Vercel (CHG-07). La documentación de Neon permite crear el proyecto en Neon y **vincularlo después** a Vercel con la integración gestionada por Neon («link an existing Neon project»); la integración gestionada por Vercel crea su propio proyecto. Opciones: (1) proyecto propio ahora y vinculación en CHG-07 (recomendada; conserva un solo proyecto con las tres ramas); (2) crear antes un proyecto Vercel mínimo y añadir Neon por Marketplace (adelanta parte de CHG-07); (3) proyecto propio solo para `development`/`test` y otro por Marketplace para Production (se pierde la rama `main` común). | **DECISIÓN DEL USUARIO antes de aprovisionar**; no se editan TD/ADR por esto (si el usuario elige (1) o (3) se registra una aclaración trazable aparte) |
| OQ-15 | Ubicación local de los archivos de entorno (`.env.local`, `.env.test` dentro del repo y gitignorados, frente a un archivo fuera del repo pasado con `--env-file` en la línea de comandos) | IMPLEMENTATION DETAIL — por defecto `--env-file-if-exists=.env.local`/`.env.test` creados por el propio usuario; el agente nunca los lee |

Ninguna pregunta bloquea la aprobación documental de CHG-02; OQ-14 bloquea **solo el aprovisionamiento** (tarea 5.2 y siguientes), no la preparación de dependencias, esquema y migraciones.

## Insumos de AV-2: propiedad por change

| Hallazgo de AV-2 | CHG-02 | Dueño posterior |
|---|---|---|
| Rol de aplicación creado por SQL, sin `neon_superuser` | **Implementa** (procedimiento 5.1/5.2, pruebas 5.4) | CHG-07 (rol de Production) |
| Sin DDL; `DELETE` prohibido en órdenes; historiales *append-only* | **Implementa** (GRANT + pruebas) | CHG-07 (preflight de privilegios en Production) |
| `GRANT UPDATE(col)` | **Implementa la evaluación** en tablas reales (5.5) | Cada change que escribe con `update` respeta las columnas concedidas |
| Privilegios de secuencia | No aplica (UUID) | — |
| `GRANT` sin excepción ≠ validado | **Implementa** (ACL + comportamiento) | — |
| TLS `verify-full` explícito; `channel_binding` no requerido | **Implementa** en URL/configuración definitivas | CHG-07 (variables inyectadas por la integración) |
| `NUMERIC` exacto | Solo el tipo de columna y el mapeo (`Decimal`, sin `Float`/`number`) | CHG-11 (reglas de dinero, formato, `BigInt` de céntimos) |
| `timestamptz(3)` | **Implementa** (columnas declaradas explícitamente) | — |
| Transacción interactiva por el *pooler* | **Implementa** la primitiva (D-10) | CHG-05/10/11/12/13 (casos de uso) |
| `SELECT … FOR UPDATE` | **Implementa** la primitiva parametrizada | CHG-12 (notas contra cierre) |
| `LIKE … ESCAPE` | Solo `customer_name_search` e índices; **no** el helper | CHG-09a (búsqueda) |
| Actualización condicional / `version` | Solo la columna y su `CHECK` | CHG-10/11/13 |
| Base de sombra separada | **Implementa** guardias y `SHADOW_DATABASE_URL` | — |
| `node --env-file` sin `dotenv`; TypeScript nativo en Node 24 | **Implementa** scripts y `prisma.config.ts` | CHG-03 (CI), CHG-08 (`admin:provision`) |
| Pooler: validado por tipo de endpoint y comportamiento, sin introspección del proveedor | Sin acción | — |
