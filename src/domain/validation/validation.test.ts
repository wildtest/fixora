import { describe, expect, it } from 'vitest';
import { hasNullCharacter, trimBusinessText, validateTextField } from './validation';

describe('validateTextField', () => {
  const opts = { maxLength: 5 };

  it('acepta y recorta un valor válido', () => {
    expect(validateTextField('f', '  abc  ', opts)).toEqual({ ok: true, value: 'abc' });
  });

  it('rechaza el campo vacío como REQUIRED', () => {
    expect(validateTextField('f', '', opts)).toEqual({ ok: false, fieldErrors: { f: 'REQUIRED' } });
  });

  it('rechaza solo espacios como REQUIRED', () => {
    expect(validateTextField('f', '   \t ', opts)).toEqual({ ok: false, fieldErrors: { f: 'REQUIRED' } });
  });

  it('acepta vacío cuando el campo no es obligatorio', () => {
    expect(validateTextField('f', '  ', { ...opts, required: false })).toEqual({ ok: true, value: '' });
  });

  it('rechaza U+0000 como INVALID_FORMAT, incluso con trim desactivado', () => {
    expect(validateTextField('f', 'a\u0000b', opts)).toEqual({ ok: false, fieldErrors: { f: 'INVALID_FORMAT' } });
    expect(validateTextField('f', 'a\u0000b', { ...opts, trim: false })).toEqual({
      ok: false,
      fieldErrors: { f: 'INVALID_FORMAT' },
    });
  });

  it('rechaza el exceso de longitud como TOO_LONG, contando puntos de código', () => {
    expect(validateTextField('f', 'abcdef', opts)).toEqual({ ok: false, fieldErrors: { f: 'TOO_LONG' } });
    expect(validateTextField('f', '😀😀😀😀😀', opts)).toEqual({ ok: true, value: '😀😀😀😀😀' });
    expect(validateTextField('f', '😀😀😀😀😀😀', opts)).toEqual({ ok: false, fieldErrors: { f: 'TOO_LONG' } });
  });

  it('no recorta contraseñas, tokens ni claves con trim: false', () => {
    expect(validateTextField('password', '  s3cret  ', { maxLength: 20, trim: false })).toEqual({
      ok: true,
      value: '  s3cret  ',
    });
  });

  it('un valor solo de espacios sin trim cuenta como contenido', () => {
    expect(validateTextField('password', '   ', { maxLength: 20, trim: false })).toEqual({ ok: true, value: '   ' });
  });
});

describe('helpers', () => {
  it('trimBusinessText recorta ambos extremos', () => {
    expect(trimBusinessText('\n x y \t')).toBe('x y');
  });

  it('hasNullCharacter detecta U+0000', () => {
    expect(hasNullCharacter('a\u0000')).toBe(true);
    expect(hasNullCharacter('abc')).toBe(false);
  });
});
