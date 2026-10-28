import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Comportamiento real del CLI de Prisma con `prisma.config.ts` (CHG-02, D-2/D-8). No conecta a ninguna base.
const root = fileURLToPath(new URL('../../', import.meta.url));
const cli = fileURLToPath(new URL('../../node_modules/prisma/build/index.js', import.meta.url));
const CANARY = 'canary-password-9f3a';

function prisma(args: string[], env: Record<string, string>) {
  // Entorno mínimo: ninguna variable de base de datos heredada del proceso.
  const clean: Record<string, string> = { PATH: process.env.PATH ?? '', SystemRoot: process.env.SystemRoot ?? '' };
  const result = spawnSync(process.execPath, [cli, ...args], { cwd: root, env: { ...clean, ...env } as NodeJS.ProcessEnv, encoding: 'utf8' });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

describe('prisma.config.ts', () => {
  it('validate y generate funcionan sin ninguna variable de entorno (sin DATABASE_URL ficticia)', () => {
    expect(prisma(['validate'], {}).status).toBe(0);
    expect(prisma(['generate'], {}).status).toBe(0);
  });

  it('PARA antes de operar si la base de sombra coincide con DIRECT_URL, sin revelar credenciales', () => {
    const direct = `postgresql://owner:${CANARY}@ep-abc.region.aws.neon.tech/neondb?sslmode=verify-full`;
    const result = prisma(['validate'], { DIRECT_URL: direct, SHADOW_DATABASE_URL: direct });
    expect(result.status).not.toBe(0);
    expect(result.output).toContain('SHADOW_DATABASE_URL');
    expect(result.output).not.toContain(CANARY);
  });

  it('PARA si la base de sombra tiene el mismo nombre de base de datos que el target', () => {
    const direct = `postgresql://owner:${CANARY}@ep-abc.region.aws.neon.tech/neondb?sslmode=verify-full`;
    const shadow = `postgresql://owner:${CANARY}@ep-abc.region.aws.neon.tech/neondb?sslmode=verify-full&application_name=x`;
    const result = prisma(['validate'], { DIRECT_URL: direct, SHADOW_DATABASE_URL: shadow });
    expect(result.status).not.toBe(0);
    expect(result.output).not.toContain(CANARY);
  });

  it('acepta una sombra distinta (la validación no conecta)', () => {
    const direct = `postgresql://owner:${CANARY}@ep-abc.region.aws.neon.tech/neondb?sslmode=verify-full`;
    const shadow = `postgresql://owner:${CANARY}@ep-abc.region.aws.neon.tech/fixora_shadow?sslmode=verify-full`;
    expect(prisma(['validate'], { DIRECT_URL: direct, SHADOW_DATABASE_URL: shadow }).status).toBe(0);
  });
});

describe('schema.prisma', () => {
  const schema = readFileSync(fileURLToPath(new URL('../../prisma/schema.prisma', import.meta.url)), 'utf8');

  it('no declara url ni directUrl en el datasource (Prisma 7: van en prisma.config.ts)', () => {
    const datasource = /datasource\s+db\s*\{[^}]*\}/.exec(schema)?.[0] ?? '';
    expect(datasource).toContain('provider = "postgresql"');
    expect(datasource).not.toMatch(/\burl\b|directUrl|shadowDatabaseUrl/);
  });

  it('emite el cliente en infrastructure/db/generated con extensión .ts', () => {
    expect(schema).toContain('output              = "../src/infrastructure/db/generated"');
    expect(schema).toContain('importFileExtension = "ts"');
  });

  it('declara timestamptz(3) explícito y NUMERIC sin precisión; sin Float ni timestamp sin zona', () => {
    expect(schema).not.toMatch(/\bFloat\b/);
    expect(schema).not.toMatch(/@db\.Timestamp\(/);
    expect(schema).not.toMatch(/@db\.Decimal\(/);
    const dateTimeLines = schema.split('\n').filter((line) => /\bDateTime\b/.test(line));
    expect(dateTimeLines.length).toBeGreaterThan(0);
    expect(dateTimeLines.filter((line) => !line.includes('@db.Timestamptz(3)'))).toEqual([]);
  });
});
