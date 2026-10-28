import { describe, expect, it } from 'vitest';
import { EXPECTED_IDS, checkTraceability, evidencePaths, parseTraceTable } from '../../scripts/traceability.ts';

const HEADER = '| ID | change dueño | nivel | prueba o evidencia | estado |\n|---|---|---|---|---|\n';
const row = (id: string, owner = 'CHG-05', evidence = 'pendiente de prueba', state = 'pendiente') =>
  `| ${id} | ${owner} | E2E | ${evidence} | ${state} |`;
const full = (overrides: Record<string, string> = {}) =>
  HEADER + EXPECTED_IDS.map((id) => overrides[id] ?? row(id)).join('\n') + '\n';
const exists = (known: string[]) => (path: string) => known.includes(path);

describe('checkTraceability', () => {
  it('acepta una tabla completa y válida (37 identificadores)', () => {
    expect(EXPECTED_IDS).toHaveLength(37);
    expect(checkTraceability({ markdown: full(), exists: exists([]) })).toEqual([]);
  });

  it('detecta un identificador ausente', () => {
    const markdown = full().replace(row('E9') + '\n', '');
    expect(checkTraceability({ markdown, exists: exists([]) })).toEqual(['Falta el identificador E9']);
  });

  it('detecta identificadores desconocidos y duplicados', () => {
    const markdown = full() + row('SC-21') + '\n' + row('E18') + '\n' + row('SC-01') + '\n';
    const errors = checkTraceability({ markdown, exists: exists([]) });
    expect(errors).toContain('Identificador desconocido: "SC-21"');
    expect(errors).toContain('Identificador desconocido: "E18"');
    expect(errors).toContain('Identificador duplicado: SC-01');
  });

  it('detecta criterios sin dueño válido', () => {
    const markdown = full({ 'SC-03': row('SC-03', ''), 'SC-04': row('SC-04', 'alguien') });
    const errors = checkTraceability({ markdown, exists: exists([]) });
    expect(errors).toContain('SC-03: sin change dueño válido ("")');
    expect(errors).toContain('SC-04: sin change dueño válido ("alguien")');
  });

  it('acepta dueños con sufijo (CHG-09a, CHG-09b)', () => {
    expect(checkTraceability({ markdown: full({ E7: row('E7', 'CHG-09a') }), exists: exists([]) })).toEqual([]);
  });

  it('detecta estados fuera del vocabulario', () => {
    const errors = checkTraceability({ markdown: full({ 'SC-02': row('SC-02', 'CHG-06', 'x', 'hecho') }), exists: exists([]) });
    expect(errors).toEqual(['SC-02: estado fuera del vocabulario ("hecho")']);
  });

  it('exige rutas existentes cuando el estado es implementado, parcial o verificado', () => {
    for (const state of ['parcial', 'implementado', 'verificado']) {
      const good = full({ 'SC-14': row('SC-14', 'CHG-02', '`tests/integration/a.test.ts`', state) });
      expect(checkTraceability({ markdown: good, exists: exists(['tests/integration/a.test.ts']) }), state).toEqual([]);
      expect(checkTraceability({ markdown: good, exists: exists([]) }), state).toEqual([
        'SC-14: la evidencia "tests/integration/a.test.ts" no existe',
      ]);
      const none = full({ 'SC-14': row('SC-14', 'CHG-02', 'sin rutas', state) });
      expect(checkTraceability({ markdown: none, exists: exists([]) })[0], state).toContain('sin ninguna ruta de evidencia');
    }
  });

  it('un estado pendiente no exige rutas existentes', () => {
    const markdown = full({ 'SC-14': row('SC-14', 'CHG-02', '`tests/no-existe.test.ts`', 'pendiente') });
    expect(checkTraceability({ markdown, exists: exists([]) })).toEqual([]);
  });

  it('comprueba las etiquetas [SC-xx]/[Ex] de las pruebas', () => {
    const testFiles = new Map([
      ['tests/ok.test.ts', "it('[SC-14] persiste [E9]', () => {})"],
      ['tests/mal.test.ts', "it('[SC-99] x', () => {}); it('[E18] y', () => {})"],
    ]);
    expect(checkTraceability({ markdown: full(), exists: exists([]), testFiles })).toEqual([
      'tests/mal.test.ts: la etiqueta [SC-99] no existe',
      'tests/mal.test.ts: la etiqueta [E18] no existe',
    ]);
  });
});

describe('parseTraceTable y evidencePaths', () => {
  it('ignora el encabezado, el separador y las líneas que no son filas de cinco columnas', () => {
    const rows = parseTraceTable('# Título\n\n' + HEADER + row('SC-01') + '\ntexto | suelto\n');
    expect(rows.map((r) => r.id)).toEqual(['SC-01']);
  });

  it('extrae las rutas entre comillas invertidas', () => {
    expect(evidencePaths('`a/b.test.ts`; `c.md` — nota')).toEqual(['a/b.test.ts', 'c.md']);
    expect(evidencePaths('sin rutas')).toEqual([]);
  });
});
