import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Revisión estática de seguridad (CHG-14, D6/D8): invariantes del código fuente que no dependen de datos. Detectan que
// una API insegura, SQL concatenado, un `console` fuera del logger o una Server Action administrativa sin guardia
// vuelvan a aparecer. Solo lee código de producción: ni el cliente de Prisma generado ni las pruebas.

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (entry === 'generated' || entry === 'node_modules') return [];
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const production = walk('src')
  .map((file) => file.replace(/\\/g, '/'))
  .filter((file) => /\.(ts|tsx)$/.test(file) && !/\.test\.(ts|tsx)$/.test(file));

const code = (file: string) =>
  readFileSync(file, 'utf8')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//') && !line.trim().startsWith('*') && !line.trim().startsWith('/*'))
    .join('\n');

describe('APIs inseguras ausentes del código de producción', () => {
  it.each([
    ['dangerouslySetInnerHTML', /dangerouslySetInnerHTML/],
    ['eval()', /\beval\s*\(/],
    ['new Function', /new\s+Function\s*\(/],
    ['innerHTML / outerHTML / insertAdjacentHTML', /\.(innerHTML|outerHTML)\s*=|insertAdjacentHTML/],
    ['document.write', /document\.write\s*\(/],
    ['SQL sin parametrizar ($queryRawUnsafe / $executeRawUnsafe)', /\$(queryRawUnsafe|executeRawUnsafe)/],
    ['SQL crudo en forma de llamada (cadena concatenable) en lugar de plantilla etiquetada', /\$(queryRaw|executeRaw)\s*\(/],
    ['Prisma.raw / Prisma.sql sobre cadenas dinámicas', /Prisma\.(raw|sql)\s*\(/],
  ])('%s', (_name, pattern) => {
    const offenders = production.filter((file) => pattern.test(code(file)));
    expect(offenders).toEqual([]);
  });
});

describe('registro y almacenamiento', () => {
  it('ningún `console.*` fuera del logger y de su destino', () => {
    const offenders = production.filter((file) => /\bconsole\.(log|info|warn|error|debug|trace)\b/.test(code(file)) && !file.endsWith('src/infrastructure/logging/console-sink.ts'));
    expect(offenders).toEqual([]);
  });

  it('el navegador no usa localStorage, sessionStorage, IndexedDB ni cookies propias desde el cliente', () => {
    const offenders = production.filter((file) => /\b(localStorage|sessionStorage|indexedDB)\b|document\.cookie/.test(code(file)));
    expect(offenders).toEqual([]);
  });

  it('ninguna lectura de cabeceras de IP salvo la fuente aprobada del limitador (x-vercel-forwarded-for)', () => {
    const offenders = production.filter((file) => /x-forwarded-for|x-real-ip|cf-connecting-ip|forwarded['"]/i.test(code(file)));
    expect(offenders).toEqual([]);
  });
});

// Única excepción justificada: el cierre de sesión es idempotente y solo revoca la sesión que presenta la cookie; sin sesión
// termina en el estado no autenticado seguro y no lee ni escribe datos de órdenes.
const NO_SESSION_REQUIRED = new Set(['signOutAction']);

describe('Server Actions administrativas: toda acción exportada pasa por la guardia de sesión', () => {
  const actionFiles = production.filter((file) => /^src\/app\/admin\/.*actions\.ts$/.test(file) && file !== 'src/app/admin/acceso/actions.ts');

  it('existen las acciones esperadas', () => {
    expect(actionFiles.length).toBeGreaterThan(0);
  });

  it.each(actionFiles)('%s', (file) => {
    const source = code(file);
    expect(source.startsWith('"use server"') || source.startsWith("'use server'")).toBe(true);
    // Cada función exportada delega en un servicio `*Action(authenticateRequest, …)` o comprueba la sesión ella misma.
    const exported = [...source.matchAll(/export\s+async\s+function\s+(\w+)\s*\([^)]*\)[^{]*\{([\s\S]*?)\n\}/g)];
    expect(exported.length).toBeGreaterThan(0);
    for (const [, name, body] of exported) {
      if (NO_SESSION_REQUIRED.has(name!)) continue;
      expect(body, `${file}: ${name}`).toMatch(/authenticateRequest|requireAdmin|authenticate\(/);
    }
    // No se exportan valores que no sean funciones asíncronas (una constante exportada de un módulo "use server" es un error).
    expect(source).not.toMatch(/export\s+(const|let|var)\s/);
  });
});
