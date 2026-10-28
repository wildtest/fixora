# Entornos de base de datos en Neon

> Procedimiento operativo de CHG-02 `persistence-foundation` (tarea 5.1). **No contiene credenciales, URL de conexión ni identificadores de recurso**: en cualquier registro solo se usa `ep-<ID>`. Las decisiones están en `openspec/changes/persistence-foundation/design.md` (D-1, D-7, D-8, D-13); este documento solo describe cómo ejecutarlas.

## Topología (OQ-14, confirmada)

Un proyecto Neon propio de FIXORA con tres ramas:

| Rama | Uso | Qué existe en ella |
|---|---|---|
| `main` | Producción (CHG-07) | **Reservada y vacía.** No se crea ningún rol de aplicación ni se migra antes de CHG-07 |
| `development` | Desarrollo local | Rol `fixora_app`, base `fixora_shadow` (sombra de `migrate dev`), esquema `public` migrado |
| `test` | Pruebas de integración | Rol `fixora_app`, esquema `public` migrado, marcador `fixora_ops` |

La vinculación posterior con Vercel (integración gestionada por Neon) es de CHG-07.

## Reglas

1. **Los roles son de ámbito de rama** y una rama hija copia los de su padre. Por eso `fixora_app` se crea **en cada rama** (`development`, `test`) y nunca en `main` antes de ramificar.
2. **El rol de aplicación se crea por SQL** con el propietario de la rama (`neondb_owner`), **nunca** desde Neon Console, CLI o API: estos le asignan `neon_superuser` y rompen el mínimo privilegio.
3. **Las contraseñas las fija la persona operadora de forma interactiva** (`ALTER ROLE … PASSWORD …`), no se escriben en el repositorio, en documentos ni en migraciones. Cada rama tiene sus propias credenciales: las de un entorno no funcionan en otro.
4. **Los archivos de entorno los crea la persona operadora** y no se versionan (`.gitignore`). El agente de desarrollo no los lee. Ver `.env.example` para los nombres.
5. Las migraciones **nunca** se ejecutan contra `main` desde este procedimiento.

## Procedimiento por rama (propietario de la rama, por SQL)

### `development`

```sql
CREATE ROLE fixora_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE DATABASE fixora_shadow;
-- Contraseña, de forma interactiva (no se guarda en ningún archivo versionado):
-- ALTER ROLE fixora_app PASSWORD '<elegida por la persona operadora>';
```

### `test`

```sql
CREATE ROLE fixora_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
-- ALTER ROLE fixora_app PASSWORD '<distinta de la de development>';
```

Después, **solo en `test`**, el marcador de entorno (script autónomo, interactivo, con confirmación tipada; nunca lo ejecutan pruebas, arranque ni migraciones):

```bash
node --env-file-if-exists=.env.test scripts/provision-test-marker.ts
```

## Variables por archivo

| Archivo | Variables | Notas |
|---|---|---|
| `.env.local` (rama `development`) | `DATABASE_URL` (rol `fixora_app`, **pooled**), `DIRECT_URL` (propietario, **directa**), `SHADOW_DATABASE_URL` (propietario, directa, base `fixora_shadow`), `RATE_LIMIT_HMAC_SECRET` | Todas con `sslmode=verify-full` explícito y sin `channel_binding` |
| `.env.test` (rama `test`) | `TEST_DATABASE_URL` (rol `fixora_app`, **pooled**), `TEST_DIRECT_URL` (propietario, **directa**) | Nombres `TEST_*`: la guardia exige que no coincidan con `DATABASE_URL`/`DIRECT_URL` |

## Comandos

```bash
npm run db:generate         # genera el cliente (sin conexión)
npm run db:migrate:dev      # migrate dev contra development (usa SHADOW_DATABASE_URL)
npm run db:migrate:deploy   # migrate deploy con DIRECT_URL del archivo cargado (.env.local = development)
npm run test:integration    # guardia → esquema public vacío en `test` → migraciones → pruebas
```

## Comprobaciones sin exponer secretos

- Rol de aplicación sin privilegios elevados: `rolsuper`, `rolcreatedb`, `rolcreaterole`, `rolreplication` y `rolbypassrls` en falso y sin membresías (lo verifica `tests/integration/privileges.test.ts`).
- Aislamiento: el marcador existe solo en `test` y el rol de aplicación no tiene acceso a `fixora_ops`.
- La rama `main` no se toca: sin rol, sin migraciones, sin marcador.
