// CLI de `npm run test:trace`: node scripts/check-traceability.ts (Node 24 nativo, sin dependencias nuevas).
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { checkTraceability, EXPECTED_IDS, parseTraceTable } from './traceability.ts';

const root = process.cwd();
const TRACE_FILE = 'docs/07-testing/TRACEABILITY.md';

// `tests/trace/` queda fuera: sus pruebas usan etiquetas inválidas a propósito como casos negativos.
function collectTests(dir: string, out: Map<string, string>): void {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'generated' || name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) collectTests(full, out);
    else if (/\.(test|spec)\.ts$/.test(name)) {
      const path = relative(root, full).replaceAll('\\', '/');
      if (!path.startsWith('tests/trace/')) out.set(path, readFileSync(full, 'utf8'));
    }
  }
}

const testFiles = new Map<string, string>();
for (const dir of ['src', 'tests']) if (existsSync(join(root, dir))) collectTests(join(root, dir), testFiles);

const markdown = readFileSync(join(root, TRACE_FILE), 'utf8');
const errors = checkTraceability({ markdown, exists: (path) => existsSync(join(root, path)), testFiles });

if (errors.length > 0) {
  process.stderr.write(`Trazabilidad: ${errors.length} problema(s)\n${errors.map((e) => ` - ${e}`).join('\n')}\n`);
  process.exit(1);
}
const rows = parseTraceTable(markdown);
const byState = Object.groupBy(rows, (row) => row.state);
const summary = Object.entries(byState).map(([state, list]) => `${state}: ${list?.length ?? 0}`).join(' · ');
process.stdout.write(`Trazabilidad OK — ${rows.length}/${EXPECTED_IDS.length} identificadores (${summary}).\n`);
