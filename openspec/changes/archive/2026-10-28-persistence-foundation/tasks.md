# Tasks

> Planificación únicamente. Nada de esto se ejecuta hasta que el change esté revisado, aprobado y el usuario autorice `/opsx:apply` en la Fase 7, **con CHG-01 aplicado y AV-2 aprobado**. Toda instalación de dependencias, creación de ramas o roles en Neon y cualquier conexión a una base de datos requiere aprobación explícita en el momento. No hay tareas de lógica de negocio.

## 1. Preflight de toolchain y dependencias

- [x] 1.1 Confirmar el DoR de implementación: CHG-01 aplicado y archivado (✅ `fbde0c8`), AV-2 ✅ PASS (ver el estado en `design.md`), Node en 24.x (`fnm`, 24.22.1) y aprobación de dependencias, de la topología de Neon (OQ-14) y de las acciones en Neon; se verifica con una nota de aprobación en el change y `node --version` (major 24).
- [x] 1.2 Preflight de versiones: `npm view` de `prisma`, `@prisma/client`, `@prisma/adapter-pg`, `pg` y `@types/pg`, y la documentación oficial de Prisma 7; confirmar las candidatas exactas validadas en AV-2 (**7.10.1** para los tres paquetes de Prisma, **8.23.1** para `pg` y `@types/pg`), siempre **Prisma 7.x estable** (nunca RC, `next` ni Prisma 8; el tag `latest` de `prisma` apunta a un RC de la 8). Si Prisma 8 fuera estable, **no migrar**: informar y pedir decisión arquitectónica. Se verifica con la nota de decisión que registra versiones y evidencias.
- [x] 1.3 Con aprobación, instalar con versión exacta `prisma` y `@types/pg` (dev), `@prisma/client`, `@prisma/adapter-pg` y `pg` (dependencias); se verifica con `npm ls --depth=0`, que el lockfile solo cambia por estas dependencias y sus transitivas y que no se instalaron `dotenv`, `tsx` ni otras herramientas (cualquier necesidad nueva exige aprobación del usuario).

## 2. Configuración de Prisma, conexión y capacidades de entorno

- [x] 2.1 Crear `prisma.config.ts` (ESM) para el CLI: ubicación del esquema y de las migraciones y `DIRECT_URL` para el CLI, sin propiedades heredadas del *schema* que ya no correspondan a Prisma 7; el archivo lee `process.env.DIRECT_URL`/`SHADOW_DATABASE_URL` de forma condicional (declara `datasource` solo si `DIRECT_URL` existe, porque `env()` lanza si falta) y la carga de variables locales usa `node --env-file-if-exists` (AV-2; sin `dotenv`); se verifica **primero** que `prisma validate` y `prisma generate` funcionan **sin** variables definidas, luego `migrate deploy` con ellas, que `directUrl` no aparece en el *schema* y que no hay secretos ni `.env` versionados. Incluye las guardias `DIRECT_URL ≠ SHADOW_DATABASE_URL`, nombre de base distinto y ninguna *pooled*, con una prueba que demuestra la parada.
- [x] 2.2 Extender `src/infrastructure/config/` con la validación **perezosa por capacidad** (`database`, `limiter`, `migration`, `test`) que falla de forma segura y no busca credenciales alternativas; `DIRECT_URL` no es accesible desde el código de aplicación; se verifica con pruebas unitarias (capacidad ausente falla, nunca al importar) y con `npm run build` sin variables de base de datos.
- [x] 2.3 Crear `src/infrastructure/db/` con la instancia única del cliente Prisma + `@prisma/adapter-pg` sobre `pg` (`DATABASE_URL` *pooled*), solo runtime Node y `import 'server-only'`, con TLS `sslmode=verify-full` explícito (sin fallback silencioso a `DIRECT_URL`); se verifica con `npm run typecheck`, `npm run build` y una prueba de integración de conexión con el rol de aplicación que confirma `current_user` y TLS.
- [x] 2.4 Extender las reglas de lint para que el cliente generado y `@prisma/*` solo se importen dentro de `infrastructure/`, y que `$queryRawUnsafe`/`$executeRawUnsafe` queden prohibidos (extendiendo el `eslint.config.mjs` de CHG-01, sin un segundo linter), y excluir de ESLint el directorio del cliente generado; se verifica con casos nuevos en `tests/tooling/` (prohibidos fallan, permitidos pasan).
- [x] 2.5 Añadir los scripts `db:generate`, `db:migrate:dev` y `db:migrate:deploy` (binario local de Prisma con `node --env-file-if-exists`), encadenar `db:generate` al `build` sin conexión a la base de datos y sin una `DATABASE_URL` ficticia, añadir el directorio del cliente generado al `.gitignore` y `allowImportingTsExtensions` al `tsconfig.json` si el generador con `importFileExtension = "ts"` lo exige; se verifica con `npm run build` en verde sin `DATABASE_URL`, con que `build` no ejecuta migraciones y con que `npm run typecheck` pasa tras `db:generate`.

## 3. Esquema y modelo de datos

- [x] 3.1 Definir en `prisma/schema.prisma` los enums `OrderStatus`, `DeviceType`, `NoteVisibility` y la superficie del limitador, con valores ASCII estables; se verifica con `prisma validate` y una comparación con el TD §7.2 y §10.
- [x] 3.2 Definir `repair_orders` (UUID, `tracking_code`, `status`, datos del cliente y del equipo, `customer_name_search`, `diagnosis?`, `estimated_cost?`, `version`, `timestamptz(3)`), sin campos no aprobados; se verifica con `prisma validate` y la revisión contra la lista «Qué no se almacena».
- [x] 3.3 Definir los tres historiales tipados (`order_status_history`, `diagnosis_history`, `cost_history`), `order_notes` y `registration_idempotency` con sus claves foráneas `RESTRICT`, índices y `UNIQUE` aprobados; se verifica con `prisma validate` y la revisión contra el TD §10, §11 y §19.
- [x] 3.4 Definir `admin_users` y `admin_sessions` (`token_hash` único, `ON DELETE CASCADE`, `last_seen_at`, `expires_at`, sin IP ni user-agent) y la tabla del limitador, separada de las de negocio y sin claves foráneas; se verifica con `prisma validate`.
- [x] 3.5 Declarar explícitamente `timestamptz(3)` y `NUMERIC` sin precisión artificial en los campos correspondientes; se verifica con el SQL generado de la migración (3.x → 4.1) y la prueba de tipos de AV-2.

## 4. Migración inicial y restricciones SQL

- [x] 4.1 Generar la **migración inicial** que construye una base vacía (tablas, enums, índices) y revisar el SQL; se verifica con `prisma migrate deploy` sobre una base de test vacía y con la prueba «una base vacía llega al esquema solo con migraciones».
- [x] 4.2 Añadir como SQL manual revisable las restricciones aprobadas: `CHECK` de transiciones de `order_status_history` (evento inicial más los 10 pares), `CHECK` de costo (nulo o > 0 con a lo sumo dos decimales), `CHECK` de `SC-07` (sin `CANCELADO`), `CHECK(version >= 1)` en órdenes y notas, y el singleton de `admin_users` (elegir y justificar el mecanismo entre los candidatos de D-4, ya que AV-2 no lo probó, y comprobar que `migrate dev`/`deploy` no producen *drift*); se verifica con pruebas de integración que aceptan lo válido y rechazan lo inválido, incluido que `CANCELADO` sin diagnóstico ni costo es aceptado.
- [x] 4.3 Probar las unicidades de `tracking_code`, `(order_id, to_status)`, `key_hash`, `order_id` de idempotencia, `email` y `token_hash`, y que las claves foráneas impiden eliminar una orden con dependientes; se verifica con pruebas de integración.
- [x] 4.4 Verificar que no existe ningún *trigger* de negocio y que la migración no contiene contraseñas ni nombres de secretos; se verifica con una revisión del SQL y una consulta de catálogo en la prueba.
- [x] 4.5 Auditar cada restricción no trivial (`UNIQUE`, `CHECK`, acción de FK y regla de privilegios) contra la tabla de D-5: cada una debe tener base A (decisión explícita en TD/ADR) o B (consecuencia directa) y ninguna puede ser un endurecimiento nuevo (C); se verifica con la tabla revisada en el change y con que la migración no contiene restricciones fuera de ella.

## 5. Roles y privilegios

- [x] 5.1 Documentar el procedimiento operativo de creación del proyecto/ramas y de roles en Neon (según OQ-14): el rol de aplicación se crea **por SQL** con el propietario de cada rama (nunca desde Console/CLI/API, que asignan `neon_superuser`), con contraseña interactiva fijada por `ALTER ROLE` en cada rama; propietario con contraseña restablecida por rama; base de sombra `fixora_shadow` solo en `development`; ningún rol de aplicación en `main` antes de ramificar; archivos de entorno creados por el usuario y no versionados; se verifica con la lista revisada y sin ninguna credencial escrita.
- [x] 5.2 Con aprobación (y la decisión OQ-14), ejecutar ese procedimiento solo en `development` y `test` (nunca `main`); se verifica con la comprobación de que las credenciales de un entorno no funcionan en otro, con que el rol de aplicación no pertenece a `neon_superuser` ni tiene `CREATEDB`/`CREATEROLE`, y con la conexión *pooled* usando el rol de aplicación.
- [x] 5.3 Añadir los `GRANT` a la migración, que **fallan de forma explícita si el rol de aplicación no existe**; se verifica con `prisma migrate deploy` con y sin el rol creado.
- [x] 5.4 Pruebas de privilegios del rol de aplicación: sin DDL; sin `DELETE` en `repair_orders`; sin `UPDATE`/`DELETE` en historiales y en `registration_idempotency`; `admin_users` solo `SELECT`; `order_notes` con `DELETE`; se verifica con intentos denegados reales en la rama `test` **y** con `has_table_privilege`/`has_column_privilege`/`relacl` (un `GRANT` sin excepción no prueba nada: ACL + comportamiento), y se confirma que no existen secuencias ni privilegios de secuencia concedidos (claves UUID).
- [x] 5.5 Decidir `GRANT UPDATE` por columnas en las tablas reales (excluyendo `id`, `tracking_code`, `created_at` en órdenes y `visibility`, `created_at` en notas; AV-2 ya demostró que el mecanismo funciona con Prisma/Neon en una tabla de sonda); se verifica con la nota de resultado: adoptarlo solo si es compatible con las actualizaciones previstas de los changes posteriores (`version`, `updated_at`, `status`, `diagnosis`, `estimated_cost`), de lo contrario documentar que no se adopta.

## 6. Primitivas de transacción y de bloqueo

- [x] 6.1 Implementar la transacción atómica en `infrastructure/db` con `READ COMMITTED` explícito, tiempos de espera como parámetros, sin reintentos automáticos y exponiendo a `application/` un tipo de contexto opaco sin tipos de Prisma; se verifica con pruebas de integración (confirmación y reversión completas) y con la regla de lint de 2.4.
- [x] 6.2 Implementar el bloqueo de fila de la orden con SQL parametrizado (`SELECT … FOR UPDATE`); se verifica con una prueba de integración con dos conexiones reales que demuestra que el segundo bloqueo espera hasta que el primero termina.
- [x] 6.3 Confirmar que no se creó ningún repositorio de órdenes, notas ni sesiones, ni CRUD genérico, ni caso de uso; se verifica con la revisión del diff.

## 7. Guardia anti-desastre e infraestructura de pruebas de integración

- [x] 7.1 Crear `tests/integration/support/` con las dos conexiones (aplicación y propietario de test), la lectura de `TEST_*` y el proyecto de Vitest de integración serial con el script `test:integration`; se verifica ejecutando una prueba de humo de conexión contra la rama `test` y confirmando que no corre en paralelo.
- [x] 7.2 Crear el procedimiento de aprovisionamiento **explícito e interactivo** del marcador de entorno de test en un esquema ajeno a Prisma (`fixora_ops`, solo en la rama `test`), mediante un script **autónomo** (`pg` + variables de entorno, sin alias `@/`, ejecutable con Node 24 nativo) que no se ejecuta desde pruebas, arranque ni migraciones y no se autocrea; se verifica con que `migrate deploy` y las pruebas no lo crean, con que el script exige confirmación tipada, y con que el marcador no produce *drift* ni se pierde tras `migrate deploy`/`migrate status` (no probado en AV-2).
- [x] 7.3 Implementar la guardia: variables `TEST_*` presentes, marcador existente y de test, y `TEST_*` distintas de las URL normales cuando estén disponibles; aborta ante cualquier duda; se verifica con pruebas que demuestran que sin marcador, con una URL igual a la de desarrollo o con variables ausentes **aborta antes** de cualquier operación destructiva.
- [x] 7.4 Implementar el reinicio controlado (incluye sesiones, limitador e idempotencia) que solo se ejecuta tras la guardia; se verifica con una prueba que lo ejecuta en la rama `test` marcada y otra que se niega fuera de ella.
- [x] 7.5 Comprobar el mapeo `DATABASE_URL = TEST_DATABASE_URL` solo para un proceso hijo de aplicación sin invalidar la guardia; se verifica con una prueba que levanta un proceso hijo con ese entorno y confirma que el helper destructivo no corre dentro de él.
- [x] 7.6 Implementar la aplicación de las migraciones al esquema de test como parte del harness (solo tras la guardia, con `TEST_DIRECT_URL`); se verifica con una prueba que parte de una rama `test` marcada y vacía y llega al esquema actual, y con que se niega a ejecutarse sin marcador.

## 8. Componente técnico del limitador

- [x] 8.1 Implementar la clave de sujeto `HMAC(RATE_LIMIT_HMAC_SECRET, sujeto canonicalizado)`; se verifica con pruebas unitarias (determinista con el mismo secreto, distinta con otro) y que nunca se almacena la IP en claro.
- [x] 8.2 Implementar el registro de fallos y la consulta de bloqueo con política recibida por parámetro, actualización atómica (`INSERT … ON CONFLICT DO UPDATE`) y reloj inyectable; los aciertos no cuentan; se verifica con pruebas de integración de ventana, umbral, bloqueo y expiración y de concurrencia con conexiones reales.
- [x] 8.3 Implementar el **fallo cerrado**: ante cualquier fallo de la base de datos devuelve el resultado técnico `unavailable`, nunca «permitido»; se verifica con una prueba que simula la caída del almacén.
- [x] 8.4 Implementar la limpieza oportunista acotada de filas vencidas; se verifica con pruebas de integración que no elimina bloqueos vigentes.
- [x] 8.5 Confirmar que no se definió `RATE_LIMITED`, `SERVICE_UNAVAILABLE`, `/64` ni políticas de CHG-06/CHG-08 y que no existe una capability `rate-limiting`; se verifica con la revisión del diff.

## 9. Validaciones de seguridad y de alcance

- [x] 9.1 Verificar que los logs y errores de este change no contienen valores de conexión, contraseñas ni parámetros SQL (valores canario sobre el logger de CHG-01); se verifica con pruebas.
- [x] 9.2 Verificar que ningún secreto ni `.env` real quedó en el repositorio y que `.env.example` solo contiene nombres de variables y comentarios; se verifica con `git status`/`git diff` y la revisión del archivo.
- [x] 9.3 Revisar el alcance del diff contra `proposal.md`: no hay registro, consulta, autenticación, ciclo de vida, notas, UI, CI completo, *workflow* de migración de producción ni despliegue; se verifica con la revisión del `git diff`.

## 10. Verificación final del change

- [x] 10.1 Ejecutar `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run test:integration` y `npm run build` y registrar el resultado; se verifica con las cinco ejecuciones en verde.
- [x] 10.2 Ejecutar una migración desde una base vacía de test y registrar la evidencia de las pruebas de restricciones, privilegios, atomicidad, bloqueo y limitador; se verifica con el informe de pruebas.
- [x] 10.3 Confirmar que `openspec validate persistence-foundation --strict` sigue pasando y que Production no fue tocada; se verifica con el comando de validación y la revisión de las credenciales usadas.

## Notas de implementación (2026-10-28)

- **1.1 Aprobación.** El usuario aprobó por escrito: dependencias (`prisma`, `@prisma/client`, `@prisma/adapter-pg` 7.10.1; `pg`, `@types/pg` 8.23.1; retirar `dotenv`), la topología de Neon **OQ-14 = proyecto propio con `main`/`development`/`test`** y las acciones en Neon solo sobre `development` y `test` (nunca `main`). Node 24.22.1 (fnm).
- **1.2 Preflight.** `npm view` el 2026-10-28: `prisma` `latest` = 8.0.0-rc.28 (no usar), `prev` = 7.10.1; `@prisma/client` y `@prisma/adapter-pg` `latest` = 7.10.1; `pg` 8.23.1; `@types/pg` 8.23.1. Prisma 8 sigue en RC: no se migra. `dotenv` solo permanece como transitivo de `prisma` (c12); no es dependencia del proyecto.
- **4.2 Singleton de `admin_users`** (OQ-8 parcial): columna centinela `singleton boolean NOT NULL DEFAULT true` con `UNIQUE(singleton)` (índice que genera Prisma) más `CHECK (singleton IS TRUE)` manual. Elegido sobre el índice único de expresión constante porque Prisma lo expresa sin SQL fuera del esquema y `migrate diff` no reporta *drift*. Un segundo administrador viola la unicidad aunque cambie el correo; `singleton = false` viola el `CHECK`.
- **4.2 Defecto hallado por las pruebas y corregido.** En el `CHECK` de transiciones, `(NULL, X) IN (…)` evalúa a `NULL` y el `CHECK` lo acepta: `NULL → EQUIPO_RECIBIDO` pasaba. Se añadió `"from_status" IS NOT NULL AND` antes del `IN`. La migración inicial aún no estaba confirmada ni aplicada fuera de las ramas propias, así que se editó en su sitio y se reconstruyó el esquema `public` de `development` (vacío de datos); `test` se reconstruye en cada ejecución.
- **4.5 Auditoría.** Se mantiene la tabla de D-5 sin restricciones de categoría C. Añadidos: `UNIQUE(singleton)` + `CHECK (singleton IS TRUE)` (A: «una restricción de la BD impide más de un administrador», mecanismo local); `PRIMARY KEY (subject_key, surface)` del limitador (B); sin índice sobre `updated_at` del limitador (no especulativo). El `ON DELETE RESTRICT` se manifiesta como SQLSTATE `23001`.
- **5.5 `GRANT UPDATE` por columnas: ADOPTADO.** `repair_orders`: todas las columnas salvo `id`, `tracking_code`, `created_at`. `order_notes`: solo `content`, `version`, `updated_at` (excluye `id`, `order_id`, `visibility`, `created_at`). `admin_sessions`: solo `last_seen_at` (`expires_at` es absoluto, TD §15). Compatible con las actualizaciones de CHG-10/11/12/13. **Consecuencia:** una columna nueva actualizable exige su propio `GRANT UPDATE(col)` en la migración que la añade.
- **2.5 Desviación menor.** `db:generate` no carga `--env-file` (`generate` no necesita variables), de modo que `build` no depende de ningún archivo local; `db:migrate:dev` y `db:migrate:deploy` sí usan `--env-file-if-exists=.env.local`.
- **D-12 / safe-error.** Se amplió la lista positiva de `safe-error.ts` (CHG-01 delegó esos códigos en CHG-02) con códigos de Prisma y SQLSTATE de PostgreSQL; todo lo demás sigue degradándose a `UNKNOWN_INFRASTRUCTURE_ERROR`.
- **7.2 Marcador.** El script exige la confirmación tipada exacta (EOF o texto distinto aborta sin cambios). En esta ronda lo ejecutó el agente con la confirmación por la entrada estándar, por autorización expresa del usuario para crear en `test` los objetos que exige CHG-02; existe solo en la rama `test`.
- **Credenciales de verificación.** Para ejecutar la suite en esta ronda se fijó en `test` una contraseña aleatoria, no almacenada, al rol `fixora_app`. El usuario debe fijar la suya con `ALTER ROLE` en `development` y `test`.

### Cierre de 5.2 y 10.1 (2026-10-28, con credenciales reales)

- **5.2.** Con `.env.local` y `.env.test` reales: `fixora_app` conecta por el *pooler* en `development` y en `test` (rol correcto, TLS, `SELECT` permitido, DDL denegado `42501`, sin `SUPERUSER`/`CREATEDB`/`CREATEROLE`, sin membresía en `neon_superuser`). Credenciales cruzadas (usuario y contraseña de una rama contra el endpoint de la otra) fallan con `28P01` en ambos sentidos; endpoints y contraseñas distintos. `development` y `test` son líneas de tiempo distintas; el marcador existe solo en `test`. No se usó ninguna URL de `main`.
- **10.1.** `npm run lint`, `typecheck`, `test:unit`, `test:integration` (con los archivos de entorno reales) y `build` en verde. `migrate status` y `migrate diff` limpios en `development` y `test`.

## Workflow follow-up

- Revisar y aprobar el change; el usuario autoriza explícitamente `/opsx:apply` en la Fase 7, con el DoR de `docs/04-planificacion/BACKLOG.md` cumplido y AV-2 aprobado.
- Archivar el change tras implementarlo y verificarlo; al ser `skip_specs`, confirmar entonces el comportamiento del archive sin deltas.
- Registrar la evidencia de pruebas y actualizar `docs/07-testing/` y el procedimiento de entornos en `docs/09-deploy/` cuando existan.
