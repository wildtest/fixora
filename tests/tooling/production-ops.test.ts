import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { isFullSha, isIdentity, migrationsIdentity, readMigrationFiles } from '../../scripts/migration-identity.ts';
import { COLUMNS, TABLES, verifyRuntimePrivileges, type Queryable } from '../../scripts/verify-runtime-privileges.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));

describe('identidad del contenido de migraciones (CHG-07 D5)', () => {
  const files = [
    { path: '20261028062222_init/migration.sql', content: 'CREATE TABLE a ();\n' },
    { path: 'migration_lock.toml', content: 'provider = "postgresql"\n' },
  ];

  it('es un SHA-256 determinista e independiente del orden y de los finales de línea', () => {
    const identity = migrationsIdentity(files);
    expect(isIdentity(identity)).toBe(true);
    expect(migrationsIdentity([...files].reverse())).toBe(identity);
    expect(migrationsIdentity(files.map((f) => ({ ...f, content: f.content.replaceAll('\n', '\r\n') })))).toBe(identity);
    expect(migrationsIdentity(files.map((f) => ({ ...f, path: f.path.replaceAll('/', '\\') })))).toBe(identity);
  });

  it('cambia ante CUALQUIER cambio de contenido, de ruta o de conjunto (invalida la autorización)', () => {
    const identity = migrationsIdentity(files);
    expect(migrationsIdentity([{ ...files[0], content: 'CREATE TABLE b ();\n' }, files[1]])).not.toBe(identity);
    expect(migrationsIdentity([{ ...files[0], path: '20261028062223_init/migration.sql' }, files[1]])).not.toBe(identity);
    expect(migrationsIdentity([...files, { path: '20261101000000_x/migration.sql', content: 'SELECT 1;' }])).not.toBe(identity);
    expect(migrationsIdentity(files.slice(0, 1))).not.toBe(identity);
    expect(migrationsIdentity([{ ...files[0], content: files[0].content + ' ' }, files[1]])).not.toBe(identity);
  });

  it('la identidad de las migraciones reales del repositorio es estable y legible', () => {
    const real = readMigrationFiles(`${root}prisma/migrations`);
    expect(real.length).toBeGreaterThanOrEqual(2);
    expect(migrationsIdentity(real)).toBe(migrationsIdentity(readMigrationFiles(`${root}prisma/migrations`)));
  });

  it('solo acepta un commit completo (no ramas, HEAD ni abreviaturas)', () => {
    expect(isFullSha('a'.repeat(40))).toBe(true);
    for (const bad of ['main', 'HEAD', 'a'.repeat(7), 'a'.repeat(39), 'a'.repeat(41), 'A'.repeat(40), `${'a'.repeat(39)}g`, '', null, 5]) {
      expect(isFullSha(bad), String(bad)).toBe(false);
    }
  });
});

describe('workflow migrate-production (CHG-07 D5)', () => {
  const text = readFileSync(`${root}.github/workflows/migrate-production.yml`, 'utf8').replaceAll('\r', '');
  const code = text.split('\n').filter((line) => !line.trim().startsWith('#')).join('\n');
  const job = (name: string) => {
    const start = code.indexOf(`\n  ${name}:\n`);
    const rest = code.slice(start + 1);
    const next = rest.slice(1).search(/\n {2}[a-z-]+:\n/);
    return next === -1 ? rest : rest.slice(0, next + 1);
  };

  it('es solo manual: workflow_dispatch, sin push ni pull_request', () => {
    expect(code).toMatch(/\non:\n {2}workflow_dispatch:/);
    expect(code).not.toMatch(/\n {2}(push|pull_request|pull_request_target|schedule|workflow_run):/);
  });

  it('la definición solo corre desde main y los permisos son mínimos', () => {
    expect(job('verify')).toContain("if: github.ref == 'refs/heads/main'");
    expect(job('migrate')).toContain("if: github.ref == 'refs/heads/main'");
    expect(code).toMatch(/\npermissions:\n {2}contents: read\n/);
    expect(code).not.toMatch(/write-all|contents: write|id-token/);
  });

  it('un solo tren de migración y nunca se cancela una migración en curso', () => {
    expect(code).toMatch(/concurrency:\n {2}group: migrate-production\n {2}cancel-in-progress: false/);
  });

  it('exige SHA completo, identidad del contenido y confirmación de la rama de recuperación', () => {
    for (const input of ['source_sha', 'migrations_identity', 'recovery_branch_confirmed']) {
      expect(code).toMatch(new RegExp(`${input}:\\n\\s+description: .+\\n\\s+required: true`));
    }
    expect(job('verify')).toMatch(/\^\[0-9a-f\]\{40\}\$/);
    expect(job('verify')).toMatch(/--expect/);
    expect(job('verify')).toContain('head.repo.full_name');
  });

  it('el job verify no recibe ningún secreto ni Environment; el job migrate usa el Environment production', () => {
    expect(job('verify')).not.toMatch(/secrets\.|environment:/);
    expect(job('migrate')).toMatch(/needs: verify/);
    expect(job('migrate')).toMatch(/environment: production/);
  });

  it('DIRECT_URL solo llega a los pasos que conectan (migrate deploy y status), nunca al job ni al workflow', () => {
    expect(code.match(/secrets\.DIRECT_URL/g)).toHaveLength(2);
    const lines = code.split('\n');
    lines.forEach((line, index) => {
      if (!line.includes('secrets.DIRECT_URL')) return;
      // El comando del mismo paso (las dos líneas siguientes) debe ser el CLI de Prisma migrate.
      expect(lines.slice(index, index + 3).join('\n')).toMatch(/node node_modules\/prisma\/build\/index\.js migrate (deploy|status)/);
    });
    expect(code).not.toMatch(/\n {4}env:\n {6}DIRECT_URL/); // no a nivel de job
    expect(code).not.toMatch(/\nenv:\n/); // ni a nivel de workflow
  });

  it('frontera de comandos: instalación sin scripts, solo migrate; no ejecuta la aplicación, build, pruebas ni seed', () => {
    const migrate = job('migrate');
    expect(migrate).toContain('npm ci --ignore-scripts');
    expect(migrate).toMatch(/migrate deploy/);
    for (const forbidden of ['next build', 'next start', 'npm run', 'npm test', 'seed', 'db push', 'migrate dev', 'migrate reset', 'npx ', 'vitest', 'playwright']) {
      expect(migrate, forbidden).not.toContain(forbidden);
    }
    expect(code).not.toMatch(/SHADOW_DATABASE_URL/);
  });

  it('acciones externas fijadas por SHA completo con el tag como comentario', () => {
    const uses = [...text.matchAll(/uses: (\S+)(.*)/g)];
    expect(uses.length).toBeGreaterThan(0);
    for (const [, ref, rest] of uses) {
      expect(ref, ref).toMatch(/^actions\/[a-z-]+@[0-9a-f]{40}$/);
      expect(rest, ref).toMatch(/# v\d+\.\d+\.\d+/);
    }
  });

  it('la evidencia no imprime credenciales', () => {
    expect(job('migrate')).toContain('GITHUB_STEP_SUMMARY');
    expect(job('migrate').match(/echo "- [^"]*"/g)?.join('\n')).not.toMatch(/DIRECT_URL|postgres/);
  });
});

describe('una sola autoridad de despliegue (CHG-07 D2)', () => {
  const dir = `${root}.github/workflows/`;
  const workflows = readdirSync(dir).filter((name) => name.endsWith('.yml'));

  it('ningún workflow despliega ni guarda VERCEL_TOKEN, y DIRECT_URL solo existe en migrate-production', () => {
    for (const name of workflows) {
      const content = readFileSync(`${dir}${name}`, 'utf8');
      expect(content, name).not.toMatch(/VERCEL_TOKEN|vercel (deploy|--prod)|amondnet\/vercel|vercel\/actions/i);
      const executable = content
        .split(String.fromCharCode(10))
        .filter((line) => !line.trim().startsWith(String.fromCharCode(35)))
        .join(String.fromCharCode(10));
      // TEST_DIRECT_URL (CHG-03) no cuenta: se busca la variable exacta.
      if (name !== "migrate-production.yml") expect(executable, name).not.toMatch(/(^|[^A-Z_])DIRECT_URL/);
    }
  });

  it('el pipeline normal nunca migra Production', () => {
    const ci = readFileSync(`${dir}ci.yml`, 'utf8');
    expect(ci).not.toMatch(/migrate (deploy|dev)|db:migrate|PRODUCTION/i);
  });

  it('no hay vercel.json ni scripts de build que migren o creen datos', () => {
    const pkg = JSON.parse(readFileSync(`${root}package.json`, 'utf8')) as { scripts: Record<string, string> };
    expect(pkg.scripts.build).toBe('npm run db:generate && next build');
    expect(pkg.scripts.start).toBe('next start');
    for (const [name, script] of Object.entries(pkg.scripts)) {
      if (['db:migrate:dev', 'db:migrate:deploy'].includes(name)) continue;
      expect(script, name).not.toMatch(/migrate (deploy|dev)/);
    }
    expect(readdirSync(root)).not.toContain('vercel.json');
  });
});

describe('verifyRuntimePrivileges (catálogo)', () => {
  // Base de datos simulada: el rol conforme concede exactamente lo aprobado.
  function fake(overrides: { attrs?: Record<string, boolean>; granted?: (table: string, privilege: string) => boolean; column?: (table: string, column: string) => boolean; memberships?: string[]; schemaCreate?: boolean }): Queryable {
    const approved = new Map(TABLES.map((t) => [t.table, new Set(t.granted)]));
    const columns = new Map(COLUMNS.map((c) => [`${c.table}.${c.column}`, c.update]));
    return {
      async query(sql, params = []) {
        if (sql.includes('current_user::text')) return { rows: [{ role: 'fixora_app' }] };
        if (sql.includes('FROM pg_roles WHERE rolname = current_user')) return { rows: [overrides.attrs ?? { rolsuper: false, rolcreatedb: false, rolcreaterole: false, rolreplication: false, rolbypassrls: false }] };
        if (sql.includes('pg_auth_members')) return { rows: (overrides.memberships ?? []).map((rolname) => ({ rolname })) };
        if (sql.includes('has_schema_privilege')) return { rows: [{ ok: overrides.schemaCreate ?? false }] };
        if (sql.includes('relowner')) return { rows: [{ n: 0 }] };
        if (sql.includes('has_table_privilege')) {
          const [qualified, privilege] = params as [string, string];
          const table = qualified.replace('public.', '');
          return { rows: [{ ok: overrides.granted ? overrides.granted(table, privilege) : approved.get(table)?.has(privilege) ?? false }] };
        }
        if (sql.includes('has_column_privilege')) {
          const [qualified, column] = params as [string, string];
          const table = qualified.replace('public.', '');
          return { rows: [{ ok: overrides.column ? overrides.column(table, column) : columns.get(`${table}.${column}`) ?? false }] };
        }
        if (sql.includes("relkind = 'S'")) return { rows: [{ n: 0 }] };
        throw new Error(`consulta no prevista: ${sql.slice(0, 40)}`);
      },
    };
  }

  it('un rol conforme no produce problemas', async () => {
    expect(await verifyRuntimePrivileges(fake({}))).toEqual([]);
  });

  it('detecta DELETE sobre órdenes, UPDATE de historiales, DDL, atributos elevados y membresías', async () => {
    const problems = await verifyRuntimePrivileges(
      fake({
        attrs: { rolsuper: false, rolcreatedb: true, rolcreaterole: false, rolreplication: false, rolbypassrls: false },
        memberships: ['neon_superuser'],
        schemaCreate: true,
        granted: (table, privilege) => TABLES.find((t) => t.table === table)!.granted.includes(privilege) || (table === 'repair_orders' && privilege === 'DELETE') || (table === 'order_status_history' && privilege === 'UPDATE'),
      }),
    );
    const text = problems.join('\n');
    expect(text).toContain('atributos elevados');
    expect(text).toContain('neon_superuser');
    expect(text).toContain('DDL');
    expect(text).toContain('repair_orders: tiene DELETE');
    expect(text).toContain('order_status_history: tiene UPDATE');
  });

  it('detecta columnas inmutables actualizables y mutables no actualizables', async () => {
    const problems = await verifyRuntimePrivileges(fake({ column: (table, column) => !(table === 'repair_orders' && column === 'status') || false }));
    const text = problems.join('\n');
    expect(text).toContain('repair_orders.tracking_code: UPDATE concedido');
    expect(text).toContain('repair_orders.status: UPDATE denegado');
  });

  it('cubre las nueve tablas y no usa operaciones destructivas', () => {
    expect(TABLES.map((t) => t.table)).toHaveLength(9);
    const source = readFileSync(`${root}scripts/verify-runtime-privileges.ts`, 'utf8');
    expect(source).not.toMatch(/\b(INSERT|DELETE|DROP|TRUNCATE|ALTER|CREATE)\s+(INTO|FROM|TABLE|ROLE|SCHEMA)\b/i);
  });
});
