// Política de `npm audit` de V1 (CHG-03, D-8), ejecutable con Node 24 nativo:
//   node scripts/audit-policy.ts
// Bloquean CI los hallazgos CRÍTICOS y ALTOS; los moderados, bajos e informativos se REPORTAN sin bloquear.
// Nunca `npm audit fix --force` ni actualizaciones de major automáticas. Una excepción temporal para un hallazgo
// alto o crítico exige documentación (advisory, paquete, exposición real, mitigación, fecha de revisión) y la
// aprobación explícita del usuario: ver docs/07-testing/CI-QUALITY-GATES.md.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export type AuditVulnerability = { readonly name?: string; readonly severity?: string };
export type AuditReport = { readonly vulnerabilities?: Readonly<Record<string, AuditVulnerability>> };
export type AuditVerdict = { readonly blocking: string[]; readonly reported: string[] };

const BLOCKING = new Set(['critical', 'high']);

export function evaluateAudit(report: AuditReport): AuditVerdict {
  const blocking: string[] = [];
  const reported: string[] = [];
  for (const [name, vulnerability] of Object.entries(report.vulnerabilities ?? {})) {
    const severity = vulnerability.severity ?? 'unknown';
    // Una severidad desconocida se trata como bloqueante: ante la duda, CI en rojo.
    const entry = `${name} (${severity})`;
    (BLOCKING.has(severity) || !['moderate', 'low', 'info'].includes(severity) ? blocking : reported).push(entry);
  }
  return { blocking, reported };
}

function main(): void {
  // Con `npm run` se reutiliza el mismo npm (npm_execpath) sin shell; si no, se invoca `npm` directamente.
  const npmCli = process.env.npm_execpath;
  const result = npmCli
    ? spawnSync(process.execPath, [npmCli, 'audit', '--json'], { encoding: 'utf8' })
    : spawnSync('npm', ['audit', '--json'], { encoding: 'utf8' });
  let report: AuditReport;
  try {
    report = JSON.parse(result.stdout) as AuditReport;
  } catch {
    process.stderr.write('npm audit no devolvió un informe legible: CI en rojo.\n');
    process.exit(1);
  }
  const { blocking, reported } = evaluateAudit(report);
  if (reported.length > 0) process.stdout.write(`npm audit — reportados sin bloquear (${reported.length}): ${reported.join(', ')}\n`);
  if (blocking.length > 0) {
    process.stderr.write(`npm audit — BLOQUEAN CI (${blocking.length}): ${blocking.join(', ')}\n`);
    process.exit(1);
  }
  process.stdout.write('npm audit OK — sin hallazgos críticos ni altos.\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
