// Higiene de secretos de CI (CHG-03, D-8): comprobación PROPIA y ligera sobre los archivos versionados.
// NO sustituye a la capacidad nativa de GitHub (secret scanning y push protection), que es la detección
// principal; no instala ni usa escáneres de terceros. Ejecutable con Node 24 nativo:
//   node scripts/check-secrets.ts
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export type SecretFinding = { readonly file: string; readonly line?: number; readonly rule: string };

const RULES: readonly { rule: string; pattern: RegExp }[] = [
  { rule: 'clave privada PEM', pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/ },
  // URL de PostgreSQL con contraseña real (los marcadores `<…>` y los ejemplos vacíos no cuentan).
  { rule: 'URL de base de datos con credenciales', pattern: /postgres(?:ql)?:\/\/[^\s:@/<]+:(?!<)(?!\$\{)(?![^\s@]*canary)[^\s@<]{4,}@/i },
  { rule: 'token de GitHub', pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})\b/ },
  { rule: 'contraseña de Neon (npg_)', pattern: /\bnpg_[A-Za-z0-9]{8,}\b/ },
  { rule: 'clave de AWS', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
];

// Archivos de entorno reales que nunca deben estar versionados (`.env.example` sí).
const FORBIDDEN_FILE = /(^|\/)\.env(?!\.example$)(\.[\w.-]+)?$|(^|\/)admin-credentials\.local$/;

export function scanContent(file: string, content: string): SecretFinding[] {
  const findings: SecretFinding[] = [];
  content.split('\n').forEach((text, index) => {
    for (const { rule, pattern } of RULES) if (pattern.test(text)) findings.push({ file, line: index + 1, rule });
  });
  return findings;
}

export function scanFileNames(files: readonly string[]): SecretFinding[] {
  return files.filter((file) => FORBIDDEN_FILE.test(file)).map((file) => ({ file, rule: 'archivo de entorno real versionado' }));
}

function main(): void {
  const listed = spawnSync('git', ['ls-files', '-z'], { encoding: 'utf8' });
  if (listed.status !== 0) {
    process.stderr.write('No se pudo listar los archivos versionados.\n');
    process.exit(1);
  }
  const files = listed.stdout.split('\0').filter(Boolean);
  const findings = [...scanFileNames(files)];
  for (const file of files) {
    // Esta comprobación y sus pruebas contienen patrones y valores ficticios a propósito.
    if (/^(scripts\/check-secrets\.ts|tests\/trace\/|tests\/tooling\/ci-scripts\.test\.ts)/.test(file)) continue;
    if (/\.(png|jpe?g|webp|ico|woff2?|lock)$/.test(file) || file === 'package-lock.json') continue;
    try {
      findings.push(...scanContent(file, readFileSync(file, 'utf8')));
    } catch {
      // archivo eliminado o ilegible: no es un hallazgo
    }
  }
  if (findings.length > 0) {
    // Solo regla y ubicación: nunca el valor encontrado.
    process.stderr.write(`Posibles secretos versionados (${findings.length}):\n${findings.map((f) => ` - ${f.file}${f.line ? `:${f.line}` : ''} — ${f.rule}`).join('\n')}\n`);
    process.exit(1);
  }
  process.stdout.write(`Higiene de secretos OK — ${files.length} archivos versionados revisados.\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
