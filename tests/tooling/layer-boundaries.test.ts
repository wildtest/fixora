import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { beforeAll, describe, expect, it } from 'vitest';

// Usa el eslint.config.mjs real del repositorio (no una configuración paralela).
const root = fileURLToPath(new URL('../../', import.meta.url));
let eslint: ESLint;

beforeAll(() => {
  eslint = new ESLint({ cwd: root, overrideConfigFile: resolve(root, 'eslint.config.mjs') });
}, 30_000);

async function rulesFor(filePath: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: resolve(root, filePath) });
  const fatal = result.messages.filter((m) => m.fatal);
  expect(fatal, `error de análisis en ${filePath}`).toEqual([]);
  return result.messages.map((m) => m.ruleId ?? 'fatal');
}

const IMPORT_RULE = 'no-restricted-imports';

const forbiddenImports: [string, string, string][] = [
  ['domain → application', 'src/domain/x.ts', "import { a } from '@/application/action';"],
  ['domain → infrastructure', 'src/domain/x.ts', "import { a } from '@/infrastructure/config';"],
  ['domain → app', 'src/domain/x.ts', "import { a } from '@/app/page';"],
  ['domain → presentation', 'src/domain/x.ts', "import { a } from '@/presentation/x';"],
  ['domain → application (ruta relativa)', 'src/domain/validation/x.ts', "import { a } from '../../application/action';"],
  ['domain → next', 'src/domain/x.ts', "import { redirect } from 'next/navigation';"],
  ['domain → react', 'src/domain/x.ts', "import { useState } from 'react';"],
  ['domain → @prisma', 'src/domain/x.ts', "import { PrismaClient } from '@prisma/client';"],
  ['domain → pg', 'src/domain/x.ts', "import pg from 'pg';"],
  ['domain → server-only', 'src/domain/x.ts', "import 'server-only';"],
  ['domain → node:*', 'src/domain/x.ts', "import { readFile } from 'node:fs';"],
  ['application → app', 'src/application/x.ts', "import { a } from '@/app/page';"],
  ['application → presentation', 'src/application/x.ts', "import { a } from '@/presentation/x';"],
  ['application → next', 'src/application/x.ts', "import { cookies } from 'next/headers';"],
  ['application → react', 'src/application/x.ts', "import { useState } from 'react';"],
  ['application → @prisma', 'src/application/x.ts', "import { Prisma } from '@prisma/client';"],
  ['infrastructure → application', 'src/infrastructure/x.ts', "import { a } from '@/application/action';"],
  ['infrastructure → app', 'src/infrastructure/x.ts', "import { a } from '@/app/page';"],
  ['infrastructure → presentation', 'src/infrastructure/x.ts', "import { a } from '@/presentation/x';"],
  ['presentation → application', 'src/presentation/x.ts', "import { a } from '@/application/action';"],
  ['presentation → infrastructure', 'src/presentation/x.ts', "import { a } from '@/infrastructure/config';"],
  ['presentation → app', 'src/presentation/x.ts', "import { a } from '@/app/page';"],
  ['app → infrastructure', 'src/app/x.tsx', "import { a } from '@/infrastructure/logging/logger';"],
  ['app → @prisma', 'src/app/x.tsx', "import { PrismaClient } from '@prisma/client';"],
  ['app → pg', 'src/app/x.tsx', "import pg from 'pg';"],
];

const allowedImports: [string, string, string][] = [
  ['app → application', 'src/app/x.tsx', "import { run } from '@/application/run-action';"],
  ['app → next', 'src/app/x.tsx', "import { redirect } from 'next/navigation';"],
  ['app → react', 'src/app/x.tsx', "import { useState } from 'react';"],
  ['app → domain', 'src/app/x.tsx', "import { a } from '@/domain/validation/validation';"],
  ['application → domain', 'src/application/x.ts', "import { a } from '@/domain/validation/validation';"],
  ['application → infrastructure (ADR-001)', 'src/application/x.ts', "import { a } from '@/infrastructure/logging/logger';"],
  ['infrastructure → domain', 'src/infrastructure/x.ts', "import { a } from '@/domain/validation/validation';"],
  ['infrastructure → server-only', 'src/infrastructure/x.ts', "import 'server-only';"],
  ['domain → mismo módulo (relativa)', 'src/domain/validation/x.ts', "import { a } from './validation';"],
  ['presentation → domain', 'src/presentation/x.ts', "import { a } from '@/domain/validation/validation';"],
  ['presentation → react', 'src/presentation/x.tsx', "import { useState } from 'react';"],
];

describe('límites de capas (ADR-001)', () => {
  it.each(forbiddenImports)('prohíbe %s', async (_name, file, code) => {
    expect(await rulesFor(file, code)).toContain(IMPORT_RULE);
  });

  it.each(allowedImports)('permite %s', async (_name, file, code) => {
    expect(await rulesFor(file, code)).not.toContain(IMPORT_RULE);
  });
});

describe('reglas de seguridad de lint', () => {
  it('prohíbe process.env fuera de infrastructure/config', async () => {
    expect(await rulesFor('src/app/x.ts', 'export const a = process.env.X;')).toContain('no-restricted-properties');
    expect(await rulesFor('src/domain/x.ts', 'export const a = process.env.X;')).toContain('no-restricted-properties');
    expect(await rulesFor('src/infrastructure/logging/x.ts', 'export const a = process.env.X;')).toContain(
      'no-restricted-properties',
    );
  });

  it('permite process.env en infrastructure/config', async () => {
    expect(await rulesFor('src/infrastructure/config/env.ts', 'export const a = process.env.X;')).not.toContain(
      'no-restricted-properties',
    );
  });

  it('prohíbe console salvo en el sink del logger', async () => {
    const code = "console.log('x');";
    expect(await rulesFor('src/domain/x.ts', code)).toContain('no-console');
    expect(await rulesFor('src/infrastructure/logging/logger.ts', code)).toContain('no-console');
    expect(await rulesFor('src/infrastructure/logging/console-sink.ts', code)).not.toContain('no-console');
  });

  it('prohíbe dangerouslySetInnerHTML (JSX y createElement)', async () => {
    expect(
      await rulesFor('src/app/x.tsx', 'export const A = () => <div dangerouslySetInnerHTML={{ __html: "x" }} />;'),
    ).toContain('no-restricted-syntax');
    expect(
      await rulesFor('src/app/x.ts', 'export const p = { dangerouslySetInnerHTML: { __html: "x" } };'),
    ).toContain('no-restricted-syntax');
  });

  it('prohíbe eval y new Function', async () => {
    expect(await rulesFor('src/domain/x.ts', "eval('1');")).toContain('no-eval');
    expect(await rulesFor('src/domain/x.ts', "export const f = new Function('return 1');")).toContain('no-new-func');
  });
});
