// Verificación ligera de trazabilidad (CHG-03, D-9). Lógica pura y sin dependencias: se ejecuta con Node 24
// nativo (sin alias `@/`). Es una compuerta DISTINTA de la cobertura de código.

export const SUCCESS_CRITERIA = Array.from({ length: 20 }, (_, i) => `SC-${String(i + 1).padStart(2, '0')}`);
export const EDGE_CASES = Array.from({ length: 17 }, (_, i) => `E${i + 1}`);
export const EXPECTED_IDS: readonly string[] = [...SUCCESS_CRITERIA, ...EDGE_CASES];

export const STATES = ['pendiente', 'parcial', 'implementado', 'verificado'] as const;
const STATES_WITH_EVIDENCE: ReadonlySet<string> = new Set(['parcial', 'implementado', 'verificado']);

const ID = /^(SC-\d{2}|E\d{1,2})$/;
const OWNER = /^CHG-\d{2}[ab]?$/;
const TAG = /\[(SC-\d{2}|E\d{1,2})\]/g;

export type TraceRow = {
  readonly id: string;
  readonly owner: string;
  readonly level: string;
  readonly evidence: string;
  readonly state: string;
};

export function parseTraceTable(markdown: string): TraceRow[] {
  const rows: TraceRow[] = [];
  for (const raw of markdown.replaceAll('\r', '').split('\n')) {
    if (!raw.startsWith('|')) continue;
    const cells = raw.split('|').slice(1, -1).map((cell) => cell.trim());
    if (cells.length !== 5) continue;
    const [id, owner, level, evidence, state] = cells;
    if (id === 'ID' || /^-+$/.test(id)) continue;
    rows.push({ id, owner, level, evidence, state });
  }
  return rows;
}

/** Rutas citadas entre comillas invertidas en la columna de evidencia. */
export function evidencePaths(evidence: string): string[] {
  return [...evidence.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
}

export type TraceInput = {
  readonly markdown: string;
  /** ¿Existe la ruta (relativa a la raíz del repositorio)? */
  readonly exists: (path: string) => boolean;
  /** Contenido de los archivos de prueba, para comprobar las etiquetas [SC-xx]/[Ex]. */
  readonly testFiles?: ReadonlyMap<string, string>;
};

export function checkTraceability({ markdown, exists, testFiles }: TraceInput): string[] {
  const errors: string[] = [];
  const rows = parseTraceTable(markdown);
  const seen = new Set<string>();

  for (const row of rows) {
    if (!ID.test(row.id) || !EXPECTED_IDS.includes(row.id)) {
      errors.push(`Identificador desconocido: "${row.id}"`);
      continue;
    }
    if (seen.has(row.id)) errors.push(`Identificador duplicado: ${row.id}`);
    seen.add(row.id);
    if (!OWNER.test(row.owner)) errors.push(`${row.id}: sin change dueño válido ("${row.owner}")`);
    if (!(STATES as readonly string[]).includes(row.state)) {
      errors.push(`${row.id}: estado fuera del vocabulario ("${row.state}")`);
      continue;
    }
    if (STATES_WITH_EVIDENCE.has(row.state)) {
      const paths = evidencePaths(row.evidence);
      if (paths.length === 0) errors.push(`${row.id}: estado "${row.state}" sin ninguna ruta de evidencia entre comillas invertidas`);
      for (const path of paths) {
        if (!exists(path)) errors.push(`${row.id}: la evidencia "${path}" no existe`);
      }
    }
  }

  for (const id of EXPECTED_IDS) {
    if (!seen.has(id)) errors.push(`Falta el identificador ${id}`);
  }

  for (const [file, content] of testFiles ?? []) {
    for (const match of content.matchAll(TAG)) {
      if (!EXPECTED_IDS.includes(match[1])) errors.push(`${file}: la etiqueta [${match[1]}] no existe`);
    }
  }
  return errors;
}
