import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const SRC = "src/**/*.{js,jsx,mjs,ts,tsx,mts}";
const layer = (name) => `src/${name}/**/*.{js,jsx,mjs,ts,tsx,mts}`;

// Importaciones de otra capa por alias (@/capa) o por ruta relativa (../capa).
const fromLayer = (name) => ({
  regex: "^(@/|(\\.\\./)+)" + name + "(/|$)",
  message: `Dependencia de capa no permitida: ${name}.`,
});

const frameworks = [
  { name: "next", message: "Next.js no puede usarse en esta capa." },
  { name: "react", message: "React no puede usarse en esta capa." },
  { name: "react-dom", message: "React no puede usarse en esta capa." },
  { regex: "^(next|react|react-dom)/", message: "Next.js/React no pueden usarse en esta capa." },
  { regex: "^@prisma/", message: "Prisma solo se usa desde infrastructure." },
  { name: "pg", message: "pg solo se usa desde infrastructure." },
];

// `DIRECT_URL` es del propietario/migrador: el código de aplicación no importa la configuración de migración.
const noMigrationConfig = {
  regex: "(^|/)config/migration(\.ts)?$",
  message: "La configuración de migración (DIRECT_URL) no es accesible desde el código de aplicación.",
};

// El cliente generado de Prisma solo se importa dentro de infrastructure/.
const noGeneratedClient = {
  regex: "(^|/)db/generated(/|$)",
  message: "El cliente generado de Prisma solo se importa dentro de infrastructure.",
};

// `name` (módulo exacto) se expresa como regex para unificar todo en `patterns`.
const restrictImports = (...entries) => ({
  "no-restricted-imports": [
    "error",
    {
      patterns: [...entries, noMigrationConfig].map(({ name, ...rest }) =>
        name ? { ...rest, regex: "^" + name + "$" } : rest,
      ),
    },
  ],
});

const PROCESS_ENV = {
  object: "process",
  property: "env",
  message: "Las variables de entorno se leen solo en src/infrastructure/config.",
};

// SQL sin parametrizar: prohibido en todo el código (CHG-02).
const UNSAFE_SQL = ["$queryRawUnsafe", "$executeRawUnsafe"].map((property) => ({
  property,
  message: "SQL sin parametrizar prohibido: usa $queryRaw/$executeRaw con plantillas etiquetadas.",
}));

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // Seguridad: todo el código de la aplicación.
  {
    files: [SRC],
    rules: {
      "no-console": "error",
      "no-eval": "error",
      "no-new-func": "error",
      "no-restricted-properties": ["error", PROCESS_ENV, ...UNSAFE_SQL],
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: "dangerouslySetInnerHTML está prohibido.",
        },
        {
          selector: "Property[key.name='dangerouslySetInnerHTML']",
          message: "dangerouslySetInnerHTML está prohibido.",
        },
      ],
    },
  },

  // Excepciones mínimas y explícitas.
  {
    files: ["src/infrastructure/config/**/*.{ts,mjs,js}"],
    rules: { "no-restricted-properties": ["error", ...UNSAFE_SQL] },
  },
  {
    files: ["tests/**/*.{ts,mts}", "scripts/**/*.{ts,mts}", "prisma.config.ts"],
    rules: { "no-restricted-properties": ["error", ...UNSAFE_SQL] },
  },
  {
    files: ["src/infrastructure/logging/console-sink.ts"],
    rules: { "no-console": "off" },
  },

  // Capas (ADR-001). Dirección permitida: app → application → domain, application → infrastructure.
  {
    files: [layer("domain")],
    rules: restrictImports(
      fromLayer("application"),
      fromLayer("infrastructure"),
      fromLayer("app"),
      fromLayer("presentation"),
      ...frameworks,
      noGeneratedClient,
      { name: "server-only", message: "domain es puro e isomórfico." },
      { regex: "^node:", message: "domain es puro e isomórfico." },
    ),
  },
  {
    files: [layer("application")],
    rules: restrictImports(fromLayer("app"), fromLayer("presentation"), noGeneratedClient, ...frameworks),
  },
  {
    files: [layer("infrastructure")],
    rules: restrictImports(fromLayer("application"), fromLayer("app"), fromLayer("presentation")),
  },
  {
    files: [layer("presentation")],
    rules: restrictImports(fromLayer("application"), fromLayer("infrastructure"), fromLayer("app"), noGeneratedClient),
  },
  {
    files: [layer("app")],
    rules: restrictImports(
      fromLayer("infrastructure"),
      noGeneratedClient,
      { regex: "^@prisma/", message: "app no accede a Prisma." },
      { name: "pg", message: "app no accede a pg." },
    ),
  },

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Cliente de Prisma generado (db:generate): código generado, no se lintéa.
    "src/infrastructure/db/generated/**",
  ]),
]);

export default eslintConfig;
