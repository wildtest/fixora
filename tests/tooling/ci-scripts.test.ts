import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { evaluateAudit } from '../../scripts/audit-policy.ts';
import { scanContent, scanFileNames } from '../../scripts/check-secrets.ts';

// Política de npm audit (CHG-03, D-8) y comprobación propia de secretos. Valores ficticios.
describe('política de npm audit', () => {
  const report = (severities: Record<string, string>) => ({
    vulnerabilities: Object.fromEntries(Object.entries(severities).map(([name, severity]) => [name, { name, severity }])),
  });

  it('un hallazgo ALTO simulado bloquea', () => {
    expect(evaluateAudit(report({ 'paquete-x': 'high' })).blocking).toEqual(['paquete-x (high)']);
  });

  it('un hallazgo CRÍTICO simulado bloquea', () => {
    expect(evaluateAudit(report({ 'paquete-y': 'critical' })).blocking).toEqual(['paquete-y (critical)']);
  });

  it('moderados, bajos e informativos se reportan sin bloquear', () => {
    const verdict = evaluateAudit(report({ a: 'moderate', b: 'low', c: 'info' }));
    expect(verdict.blocking).toEqual([]);
    expect(verdict.reported).toEqual(['a (moderate)', 'b (low)', 'c (info)']);
  });

  it('una severidad desconocida bloquea (ante la duda, CI en rojo)', () => {
    expect(evaluateAudit(report({ raro: 'extraordinaria' })).blocking).toEqual(['raro (extraordinaria)']);
  });

  it('un informe sin hallazgos no bloquea ni reporta', () => {
    expect(evaluateAudit({ vulnerabilities: {} })).toEqual({ blocking: [], reported: [] });
    expect(evaluateAudit({})).toEqual({ blocking: [], reported: [] });
  });
});

describe('comprobación propia de secretos', () => {
  it('detecta una URL de base de datos con credenciales (valor ficticio) sin devolver el valor', () => {
    const findings = scanContent('x.ts', 'const u = "postgresql://usuario:ficticia1234@host.example/db";');
    expect(findings).toEqual([{ file: 'x.ts', line: 1, rule: 'URL de base de datos con credenciales' }]);
    expect(JSON.stringify(findings)).not.toContain('ficticia1234');
  });

  it('detecta claves privadas, tokens de GitHub y contraseñas npg_ ficticios', () => {
    expect(scanContent('k', '-----BEGIN PRIVATE KEY-----')).toHaveLength(1);
    expect(scanContent('t', `token ${'gh' + 'p_'}${'a'.repeat(36)}`)).toHaveLength(1);
    expect(scanContent('n', `x ${'npg' + '_'}${'A'.repeat(12)}`)).toHaveLength(1);
  });

  it('no marca marcadores, plantillas ni valores canario', () => {
    expect(scanContent('d', 'postgresql://fixora_app:<DEVELOPMENT_FIXORA_APP_PASSWORD>@<HOST>/neondb')).toEqual([]);
    expect(scanContent('d', 'postgresql://u:${PASSWORD}@h/db')).toEqual([]);
    expect(scanContent('d', 'postgresql://u:canary-password-9f3a@h/db')).toEqual([]);
    expect(scanContent('d', 'DATABASE_URL=')).toEqual([]);
  });

  it('marca archivos .env reales versionados, pero no .env.example', () => {
    const files = ['.env.example', '.env', '.env.local', '.env.test', 'a/.env.production', 'admin-credentials.local', 'src/envelope.ts'];
    expect(scanFileNames(files).map((f) => f.file)).toEqual(['.env', '.env.local', '.env.test', 'a/.env.production', 'admin-credentials.local']);
  });
});

// Revisión estructural del workflow (CHG-03, D-4…D-8): texto plano, sin dependencias de YAML.
describe('workflow ci.yml', () => {
  const text = readFileSync(fileURLToPath(new URL('../../.github/workflows/ci.yml', import.meta.url)), 'utf8').replaceAll('\r', '');
  const job = (name: string) => {
    const start = text.indexOf(`\n  ${name}:\n`);
    const rest = text.slice(start + 1);
    const next = rest.slice(1).search(/\n {2}[a-z-]+:\n/);
    return next === -1 ? rest : rest.slice(0, next + 1);
  };

  it('dispara en pull_request y push hacia main, nunca pull_request_target, sin filtros por ruta', () => {
    expect(text).toMatch(/pull_request:\n\s+branches: \[main\]/);
    expect(text).toMatch(/push:\n\s+branches: \[main\]/);
    const code = text.split('\n').filter((line) => !line.trim().startsWith('#')).join('\n');
    expect(code).not.toContain('pull_request_target');
    expect(code).not.toMatch(/\bpaths(-ignore)?:/);
  });

  it('permisos mínimos: contents: read y nada de write-all', () => {
    expect(text).toMatch(/\npermissions:\n {2}contents: read\n/);
    expect(text).not.toMatch(/write-all|contents: write/);
  });

  it('toda acción externa va fijada por SHA completo con el tag como comentario', () => {
    const uses = [...text.matchAll(/uses: (\S+)(.*)/g)];
    expect(uses.length).toBeGreaterThan(0);
    for (const [, ref, rest] of uses) {
      expect(ref, ref).toMatch(/^actions\/[a-z-]+@[0-9a-f]{40}$/);
      expect(rest, ref).toMatch(/# v\d+\.\d+\.\d+/);
    }
  });

  it('static no recibe credenciales PostgreSQL ni usa el Environment test ni el grupo de la base', () => {
    const body = job('static');
    expect(body).not.toMatch(/DATABASE_URL|DIRECT_URL|TEST_|secrets\./);
    expect(body).not.toMatch(/environment:|concurrency:|needs:/);
    expect(body).not.toMatch(/db:migrate|migrate/);
  });

  it('db-tests es independiente de static (sin needs), usa solo credenciales de test y serializa con cola sin cancelar', () => {
    const body = job('db-tests');
    expect(body).not.toMatch(/needs:/);
    expect(body).toMatch(/environment: test/);
    expect(body).toMatch(/concurrency:\n\s+group: fixora-db-tests\n\s+queue: max/);
    expect(body).not.toMatch(/cancel-in-progress/);
    expect(body).toMatch(/TEST_DATABASE_URL: \$\{\{ secrets\.TEST_DATABASE_URL \}\}/);
    expect(body).not.toMatch(/\bDATABASE_URL: |\bDIRECT_URL: |production/i);
  });

  it('static y db-tests ejecutan los pasos definidos en orden', () => {
    const order = (body: string, steps: string[]) => steps.map((s) => body.indexOf(s));
    const sorted = (xs: number[]) => xs.every((x, i) => x > -1 && (i === 0 || x > xs[i - 1]));
    expect(sorted(order(job('static'), ['actions/checkout', 'actions/setup-node', 'npm ci', 'db:generate', 'npm run lint', 'npm run typecheck', 'test:coverage', 'test:trace', 'ci:secrets', 'ci:audit', 'npm run build']))).toBe(true);
    expect(sorted(order(job('db-tests'), ['actions/checkout', 'actions/setup-node', 'npm ci', 'db:generate', 'ci:warm', 'test:integration', 'playwright', 'test:e2e', 'upload-artifact']))).toBe(true);
  });

  it('las trazas se suben solo ante fallo y con retención corta', () => {
    const body = job('db-tests');
    expect(body).toMatch(/if: failure\(\)\n\s+uses: actions\/upload-artifact/);
    expect(body).toMatch(/retention-days: 3/);
  });
});

// Los registros de los scripts propios no contienen valores de conexión (CHG-03, tarea 9.4): valores canario.
describe('registros de los scripts de CI', () => {
  const CANARY = 'canary-password-7c1d';
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const run = (script: string, env: Record<string, string>) => {
    const result = spawnSync(process.execPath, [script], {
      cwd: root,
      encoding: 'utf8',
      env: { PATH: process.env.PATH ?? '', SystemRoot: process.env.SystemRoot ?? '', WARM_NEON_ATTEMPTS: '1', ...env } as unknown as NodeJS.ProcessEnv,
    });
    return { status: result.status, output: `${result.stdout}${result.stderr}` };
  };

  it('warm-neon con una conexión inalcanzable falla sin imprimir la URL ni la contraseña', () => {
    const url = `postgresql://owner:${CANARY}@127.0.0.1:1/neondb?sslmode=verify-full`;
    const { status, output } = run('scripts/warm-neon.ts', { TEST_DIRECT_URL: url });
    expect(status).toBe(1);
    expect(output).not.toContain(CANARY);
    expect(output).not.toContain('127.0.0.1');
  });

  it('warm-neon con configuración inválida nombra la variable, nunca el valor', () => {
    const url = `postgresql://owner:${CANARY}@host.example/neondb?sslmode=require`;
    const { status, output } = run('scripts/warm-neon.ts', { TEST_DIRECT_URL: url });
    expect(status).toBe(1);
    expect(output).toContain('TEST_DIRECT_URL');
    expect(output).not.toContain(CANARY);
  });

  it('warm-neon sin la variable lo dice sin más', () => {
    const { status, output } = run('scripts/warm-neon.ts', {});
    expect(status).toBe(1);
    expect(output).toContain('TEST_DIRECT_URL');
  });
});
