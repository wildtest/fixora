import { describe, expect, it } from 'vitest';
import { formatLimaDateTime } from '../repair/format-date';
import { ORDER_STATUSES } from '../repair/order-status';
import {
  ORDERS_PAGE_SIZE,
  SEARCH_MAX_LENGTH,
  classifySearch,
  completeCounts,
  pageWindow,
  parsePage,
  parseStatusFilter,
} from './order-directory';

describe('clasificación de la búsqueda (TD §19)', () => {
  it('vacío o solo espacios: sin criterio', () => {
    for (const value of ['', '   ', '\t\n', undefined, null, 42, {}]) {
      expect(classifySearch(value), String(value)).toEqual({ kind: 'none' });
    }
  });

  it('un código completo, con minúsculas y espacios exteriores, es búsqueda EXACTA por código', () => {
    expect(classifySearch('23456789BDFG')).toEqual({ kind: 'code', trackingCode: '23456789BDFG' });
    expect(classifySearch('  23456789bdfg \n')).toEqual({ kind: 'code', trackingCode: '23456789BDFG' });
  });

  it('un código parcial NO es coincidencia de código: se interpreta como nombre', () => {
    expect(classifySearch('23456789')).toEqual({ kind: 'name', normalizedName: '23456789' });
    expect(classifySearch('23456789BDFGH')).toEqual({ kind: 'name', normalizedName: '23456789bdfgh' });
  });

  it('un código con caracteres fuera del alfabeto o con espacios interiores no es código', () => {
    expect(classifySearch('23456789 BDFG').kind).toBe('name');
    expect(classifySearch('0O1I23456789').kind).toBe('name');
  });

  it('el nombre se normaliza con la MISMA primitiva compartida (Muñoz → munoz, tildes, mayúsculas, espacios)', () => {
    expect(classifySearch('  Muñoz  ')).toEqual({ kind: 'name', normalizedName: 'munoz' });
    expect(classifySearch('MUNOZ')).toEqual({ kind: 'name', normalizedName: 'munoz' });
    expect(classifySearch('José   Ángel')).toEqual({ kind: 'name', normalizedName: 'jose angel' });
  });

  it('los comodines viajan como texto literal (la capa de persistencia no los interpreta)', () => {
    expect(classifySearch('100%_\\')).toEqual({ kind: 'name', normalizedName: '100%_\\' });
  });

  it('acota el texto buscado', () => {
    const search = classifySearch('a'.repeat(SEARCH_MAX_LENGTH + 50));
    expect(search.kind === 'name' && search.normalizedName.length).toBe(SEARCH_MAX_LENGTH);
  });
});

describe('filtro de estado y página', () => {
  it('acepta solo los ocho estados del enum', () => {
    for (const status of ORDER_STATUSES) expect(parseStatusFilter(status)).toBe(status);
    for (const value of ['', 'todos', 'EN_DIAGNOSTICO ', 'en_diagnostico', 'x; DROP TABLE y;--', undefined, null, 3]) {
      expect(parseStatusFilter(value), String(value)).toBeNull();
    }
  });

  it('normaliza páginas no enteras, cero, negativas, NaN o infinitas a 1', () => {
    for (const value of [0, -3, 1.5, Number.NaN, Infinity, '0', '-2', '1.5', 'abc', '', undefined, null, '99999999999']) {
      expect(parsePage(value), String(value)).toBe(1);
    }
    expect(parsePage(3)).toBe(3);
    expect(parsePage('7')).toBe(7);
  });
});

describe('paginación', () => {
  it('páginas de 20 y total del conjunto filtrado', () => {
    expect(ORDERS_PAGE_SIZE).toBe(20);
    expect(pageWindow(20, 1)).toEqual({ page: 1, totalPages: 1, offset: 0 });
    expect(pageWindow(21, 1)).toEqual({ page: 1, totalPages: 2, offset: 0 });
    expect(pageWindow(21, 2)).toEqual({ page: 2, totalPages: 2, offset: 20 });
    expect(pageWindow(100, 5)).toEqual({ page: 5, totalPages: 5, offset: 80 });
  });

  it('una página inexistente se sirve como la última válida', () => {
    expect(pageWindow(45, 99)).toEqual({ page: 3, totalPages: 3, offset: 40 });
  });

  it('sin resultados: página 1, 0 páginas y sin desplazamiento', () => {
    expect(pageWindow(0, 5)).toEqual({ page: 1, totalPages: 0, offset: 0 });
  });
});

describe('conteos y fechas', () => {
  it('completa con cero los ocho estados y descarta lo desconocido', () => {
    const counts = completeCounts({ EN_REPARACION: 3, DESCONOCIDO: 9 });
    expect(Object.keys(counts)).toEqual([...ORDER_STATUSES]);
    expect(counts.EN_REPARACION).toBe(3);
    expect(counts.ENTREGADO).toBe(0);
    expect(counts).not.toHaveProperty('DESCONOCIDO');
  });

  it('presenta las fechas en America/Lima con formato DD/MM/AAAA HH:mm (UTC-5)', () => {
    expect(formatLimaDateTime('2026-10-28T10:05:00.000Z')).toBe('28/10/2026 05:05');
    expect(formatLimaDateTime('2026-01-01T03:30:00.000Z')).toBe('31/12/2025 22:30');
  });
});
