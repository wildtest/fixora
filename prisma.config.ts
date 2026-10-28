import { defineConfig } from "prisma/config";
import { readMigrationConfig } from "./src/infrastructure/config/migration.ts";

// Configuración solo del CLI de Prisma (CHG-02, D-2). No comparte nada con el runtime de la aplicación.
// Las variables llegan por el proceso (`node --env-file-if-exists=…`, sin dotenv). Se leen de forma
// condicional: `env()` lanza si la variable falta y todos los comandos cargan este archivo, así que
// `format`, `validate` y `generate` deben funcionar sin conexión. Los comandos que conectan (`migrate *`)
// fallan con el error propio de Prisma cuando `DIRECT_URL` no está definida.
// Con `DIRECT_URL` presente se aplican las guardias de la base de sombra (D-8) antes de cualquier comando.
const migration = process.env.DIRECT_URL ? readMigrationConfig(process.env) : undefined;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  ...(migration
    ? {
        datasource: {
          url: migration.directUrl,
          ...(migration.shadowDatabaseUrl ? { shadowDatabaseUrl: migration.shadowDatabaseUrl } : {}),
        },
      }
    : {}),
});
