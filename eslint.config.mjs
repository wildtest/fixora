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

// `name` (módulo exacto) se expresa como regex para unificar todo en `patterns`.
const restrictImports = (...entries) => ({
  "no-restricted-imports": [
    "error",
    {
      patterns: entries.map(({ name, ...rest }) =>
        name ? { ...rest, regex: "^" + name + "$" } : rest,
      ),
    },
  ],
});

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
      "no-restricted-properties": [
        "error",
        {
          object: "process",
          property: "env",
          message: "Las variables de entorno se leen solo en src/infrastructure/config.",
        },
      ],
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
    rules: { "no-restricted-properties": "off" },
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
      { name: "server-only", message: "domain es puro e isomórfico." },
      { regex: "^node:", message: "domain es puro e isomórfico." },
    ),
  },
  {
    files: [layer("application")],
    rules: restrictImports(fromLayer("app"), fromLayer("presentation"), ...frameworks),
  },
  {
    files: [layer("infrastructure")],
    rules: restrictImports(fromLayer("application"), fromLayer("app"), fromLayer("presentation")),
  },
  {
    files: [layer("presentation")],
    rules: restrictImports(fromLayer("application"), fromLayer("infrastructure"), fromLayer("app")),
  },
  {
    files: [layer("app")],
    rules: restrictImports(
      fromLayer("infrastructure"),
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
  ]),
]);

export default eslintConfig;
