// Identidad del contenido de migraciones (CHG-07 D5). La invariante de `migrate-production` es el CONTENIDO de
// `prisma/migrations/`, no el SHA: un merge o squash puede producir otro SHA y ser correcto; lo incorrecto es que el
// contenido migrado difiera del fusionado. La identidad es un SHA-256 determinista del conjunto de archivos
// (ruta relativa con `/` + resumen de su contenido, en orden), insensible al sistema operativo y a los finales de
// línea. Ejecutable con Node 24 nativo, sin dependencias:
//   node scripts/migration-identity.ts [directorio]            → imprime la identidad
//   node scripts/migration-identity.ts [directorio] --expect <hex>  → falla (rc 1) si no coincide
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export type MigrationFile = { readonly path: string; readonly content: string };

const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

/** Un commit completo: 40 hexadecimales en minúscula (no ramas, ni `HEAD`, ni abreviaturas). */
export function isFullSha(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{40}$/.test(value);
}

export function isIdentity(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}

export function migrationsIdentity(files: readonly MigrationFile[]): string {
  const lines = files
    .map((file) => ({ path: file.path.replaceAll('\\', '/'), digest: sha256(file.content.replaceAll('\r\n', '\n')) }))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
    .map((entry) => `${entry.path}\u0000${entry.digest}\n`);
  return sha256(lines.join(''));
}

export function readMigrationFiles(directory: string): MigrationFile[] {
  const files: MigrationFile[] = [];
  const walk = (current: string) => {
    for (const name of readdirSync(current)) {
      const full = join(current, name);
      if (statSync(full).isDirectory()) walk(full);
      else files.push({ path: relative(directory, full), content: readFileSync(full, 'utf8') });
    }
  };
  walk(directory);
  return files;
}

function main(): void {
  const args = process.argv.slice(2);
  const expectAt = args.indexOf('--expect');
  const expected = expectAt === -1 ? undefined : args[expectAt + 1];
  const directory = args.find((arg, index) => !arg.startsWith('--') && index !== expectAt + 1) ?? 'prisma/migrations';
  const files = readMigrationFiles(directory);
  if (files.length === 0) {
    process.stderr.write(`Sin migraciones en ${directory}.\n`);
    process.exit(1);
  }
  const identity = migrationsIdentity(files);
  process.stdout.write(`${identity}\n`);
  process.stderr.write(`Identidad de ${files.length} archivo(s) de migración.\n`);
  if (expected !== undefined) {
    if (!isIdentity(expected) || expected !== identity) {
      process.stderr.write('La identidad del contenido de migraciones NO coincide con la autorizada.\n');
      process.exit(1);
    }
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
