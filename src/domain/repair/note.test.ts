import { describe, expect, it } from 'vitest';
import { canManageNotes } from './lifecycle';
import { isNoteVisibility, normalizeNoteContent, NOTE_MAX_LENGTH } from './note';
import { ORDER_STATUSES } from './order-status';

// Dominio de las notas (CHG-12): visibilidades cerradas, validación del contenido y capacidad por estado.
describe('visibilidad', () => {
  it('solo PUBLIC e INTERNAL', () => {
    expect(isNoteVisibility('PUBLIC')).toBe(true);
    expect(isNoteVisibility('INTERNAL')).toBe(true);
    for (const v of ['public', 'PRIVATE', '', null, undefined, 1]) expect(isNoteVisibility(v)).toBe(false);
  });
});

describe('normalizeNoteContent', () => {
  it('recorta los extremos y conserva el interior (saltos de línea incluidos)', () => {
    expect(normalizeNoteContent('  hola\n\nmundo \n')).toEqual({ ok: true, value: 'hola\n\nmundo' });
  });

  it('vacío o solo espacios → REQUIRED; un valor no textual también', () => {
    for (const v of ['', '   ', '\n\t', null, undefined, 5]) {
      expect(normalizeNoteContent(v), String(v)).toEqual({ ok: false, fieldErrors: { content: 'REQUIRED' } });
    }
  });

  it('U+0000 se rechaza', () => {
    expect(normalizeNoteContent('a\u0000b')).toEqual({ ok: false, fieldErrors: { content: 'INVALID_FORMAT' } });
  });

  it('2000 caracteres es válido y 2001 es TOO_LONG, medido tras el trim', () => {
    expect(normalizeNoteContent('a'.repeat(NOTE_MAX_LENGTH)).ok).toBe(true);
    expect(normalizeNoteContent(`  ${'a'.repeat(NOTE_MAX_LENGTH)}  `).ok).toBe(true);
    expect(normalizeNoteContent('a'.repeat(NOTE_MAX_LENGTH + 1))).toEqual({ ok: false, fieldErrors: { content: 'TOO_LONG' } });
  });

  it('cuenta puntos de código, no unidades UTF-16', () => {
    expect(normalizeNoteContent('😀'.repeat(NOTE_MAX_LENGTH)).ok).toBe(true);
    expect(normalizeNoteContent('😀'.repeat(NOTE_MAX_LENGTH + 1)).ok).toBe(false);
  });

  it('el HTML se conserva como texto literal', () => {
    expect(normalizeNoteContent('<script>x</script>')).toEqual({ ok: true, value: '<script>x</script>' });
  });
});

describe('canManageNotes', () => {
  it('true en los seis estados no finales y false en Entregado y Cancelado (sin congelamiento)', () => {
    const expected = Object.fromEntries(ORDER_STATUSES.map((s) => [s, s !== 'ENTREGADO' && s !== 'CANCELADO']));
    expect(Object.fromEntries(ORDER_STATUSES.map((s) => [s, canManageNotes(s)]))).toEqual(expected);
    expect(canManageNotes('EN_REPARACION')).toBe(true); // diagnóstico y costo congelados, notas no
  });
});
