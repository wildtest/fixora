# ADR-003 — PostgreSQL, Prisma y migraciones

> Estado: Aceptado
> Fecha: 2026-10-26
> Fase: 5 — Technical Design / Arquitectura
> Relacionado con: [TECHNICAL-DESIGN.md](../TECHNICAL-DESIGN.md) §8, §10, §11, §20, §25.3 · ADR-001, ADR-006, ADR-007, ADR-009

## Contexto

FIXORA debe persistir órdenes, historiales, notas, sesiones y datos técnicos (`SC-14`). El despliegue es en Vercel, cuyo sistema de archivos es efímero. El dominio es pequeño y fuertemente relacional (una orden con sus dependientes). El Brief mencionaba PostgreSQL, Prisma y Neon solo como dirección provisional. Las reglas de integridad que importan —código único, costo mayor que cero, estados cerrados, historiales que solo crecen— se expresan bien como restricciones declarativas.

## Problema / fuerzas que condicionan la decisión

- Se necesitan **transacciones reales** (un cambio de estado y su historial deben ser atómicos).
- El costo no tiene tope de negocio y debe ser exacto (sin coma flotante).
- La aplicación necesita un rol de base de datos con **privilegios mínimos**, distinto del que ejecuta las migraciones.
- Funciona sobre infraestructura *serverless* con conexiones efímeras.
- Prisma ORM 7 tiene requisitos propios (proyecto ESM, `prisma.config.ts`, adaptador de controlador).

## Alternativas consideradas

### Motor
- **PostgreSQL** *(elegido)*: transacciones, `CHECK`, `UNIQUE`, claves foráneas, `NUMERIC`, `timestamptz`.
- **Base documental** (MongoDB, Firestore): menos natural para un dominio relacional y con restricciones más débiles.
- **SQLite o archivo**: no viable en Vercel.

### Proveedor
- **Neon vía Vercel Marketplace** *(elegido)*: integración nativa, ramas de base de datos, *scale-to-zero* adecuado para una demo, sin operar infraestructura.
- **Supabase**: ofrece servicios que se solaparían con decisiones propias (autenticación, almacenamiento).
- **Postgres propio o alojado a mano**: carga operativa desproporcionada.

### Acceso a datos
- **Prisma ORM 7 estable** *(elegido)*: ecosistema maduro, cliente tipado, migraciones maduras, buena documentación y herramientas (Prisma Studio), y continuidad con la dirección provisional del proyecto.
- **Drizzle**: más ligero y más cercano a SQL, con restricciones y consultas condicionales más directas. No se consideró técnicamente incorrecto; se priorizó la madurez del ecosistema, la claridad para un proyecto académico, la documentación, las migraciones maduras, Prisma Studio y la continuidad con la dirección provisional ya documentada.
- **Query builder o SQL directo** (`pg`, Kysely): máxima transparencia con más trabajo propio.

### Migraciones
- **SQL versionado, hacia delante, aplicado con comando explícito** *(elegido)*.
- **`db push` o sincronización directa**: puede destruir datos sin revisión; descartado en producción.
- **Migrar al arrancar la aplicación o en el build**: acopla el despliegue a un cambio de esquema sin aprobación; descartado.

### Integridad
- **Dominio como fuente principal más restricciones declarativas como segunda barrera parcial** *(elegido)*.
- **Triggers para reglas de negocio**: repartirían la lógica entre SQL y TypeScript; descartado en V1.

### Esquema
- **Roll-forward con expand/contract** *(elegido)* frente a **rollback ordinario de migraciones**, que obliga a diseñar cambios reversibles y no protege frente a datos ya escritos.

## Decisión

- **PostgreSQL en Neon**, con ramas `development`, `test` y `main` y regiones de Neon y Vercel emparejadas por proximidad.
- **Prisma ORM 7.x estable** con **`@prisma/adapter-pg` y `pg`** sobre transacciones PostgreSQL reales; nunca una versión RC. A fecha de este diseño (26/10/2026), Prisma ORM 8 continúa en RC; cambiar de major requiere una decisión o ADR nuevo. Sin driver HTTP si impide o complica las transacciones.
- **Dos roles y dos conexiones:** *runtime* → `DATABASE_URL` → rol de aplicación → *pooled*; *CLI y migraciones* → `DIRECT_URL` → rol migrador → directa, configurada en `prisma.config.ts`. TLS obligatorio. El proyecto debe ser **ESM**.
- **Migraciones SQL versionadas**, revisadas, **hacia delante** (forward-only) y **expand/contract**: cada migración de producción es compatible con la aplicación desplegada. El SQL manual (`CHECK`, `GRANT`, índices funcionales) es parte revisable del diseño. Nunca `db push` en producción ni migraciones en el build, el arranque o Preview.
- **Aislamiento `READ COMMITTED`** como base (ADR-006 explica la protección frente a concurrencia).
- **Convenciones del modelo** (detalle en Technical Design §10): UUID interno separado del código de seguimiento, `timestamptz(3)`, `NUMERIC` sin precisión artificial para el costo, `ON DELETE RESTRICT`, historiales en tres tablas tipadas.
- **Los repositorios devuelven tipos de dominio**, nunca modelos de Prisma.
- **Sin triggers de negocio.**

## Justificación

PostgreSQL ofrece las garantías declarativas y transaccionales que el dominio necesita sin añadir infraestructura; Neon lo entrega administrado con ramas para separar desarrollo, pruebas y demostración. Prisma se eligió por madurez, claridad y documentación para un proyecto académico, aceptando el coste de expresar algunas restricciones como SQL manual en las migraciones. Las migraciones hacia delante con expand/contract hacen seguro el rollback de la aplicación sin necesidad de revertir esquemas.

## Consecuencias positivas

- Integridad declarativa (claves, unicidad, `CHECK`) y atomicidad real.
- Entornos aislados por rama; menos diferencias entre local, CI y demo.
- Prisma Client tipado e integrado con TypeScript `strict`.

## Consecuencias / trade-offs

- **PostgreSQL, sin triggers, no puede garantizar toda la secuencia histórica.** El `CHECK` de transiciones solo asegura que cada fila sea un par permitido; no que esté encadenada con la anterior ni que `repair_orders.status` coincida con el último evento. Esas invariantes completas las preservan dominio, repositorio, transacción, concurrencia optimista y pruebas (ADR-006). **La autoridad principal sigue siendo el dominio.**
- Prisma no expresa algunas restricciones: requieren SQL manual revisado.
- Neon puede tener arranque en frío; la demo lo asume.
- Prisma 7 impone requisitos (ESM, `prisma.config.ts`, estrategia de *shadow database*) que se validan antes de implementar.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Prisma no mapea `NUMERIC` sin precisión como se espera | Validación en el Architecture Validation Gate (AV-2, aún no ejecutado); ajuste en SQL de la migración sin introducir un tope de negocio |
| Credenciales de propietario inyectadas al runtime por la integración de Marketplace | Auditar las variables efectivas y sustituirlas por el rol de aplicación (ADR-009) |
| Migración incompatible con la aplicación desplegada | Regla expand/contract y declaración de compatibilidad por PR |
| Cambio de proveedor o de plan | La separación en repositorios acota el impacto |

## Qué queda deliberadamente fuera

El schema Prisma y el SQL definitivos, los `GRANT` exactos, la estrategia de *shadow database*, el tamaño del *pool* y los tiempos de espera (Specs e implementación). La política de privilegios se justifica en ADR-007.

## Condiciones para revisar este ADR

- AV-2 contradice las decisiones de transacciones, tipos, bloqueos o escape de consultas.
- Prisma deja de ser viable (ruptura de soporte o de compatibilidad con Neon/Vercel) o se decide pasar de major.
- El volumen o los requisitos de consulta exceden lo razonable para un taller pequeño.
- Un requisito de integridad exige lógica en la base de datos que no pueda expresarse declarativamente.

## Referencias

- PRD: `SC-14`, `E1`, `E9`, `E17`, `RIE-16`, Apéndice A.
- [TECHNICAL-DESIGN.md](../TECHNICAL-DESIGN.md) §8, §10, §11, §20, §25.3, §29 (AV-2).
- Relacionado con: [ADR-001](ADR-001-arquitectura-aplicacion-y-capas.md), [ADR-006](ADR-006-estados-concurrencia-e-idempotencia.md), [ADR-007](ADR-007-seguridad-y-proteccion-frente-abuso.md), [ADR-009](ADR-009-entornos-ci-cd-y-despliegue.md).
