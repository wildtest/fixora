import { describe, expect, it } from 'vitest';
import { normalizeCustomerNameSearch } from './customer-name-search';
import { DEVICE_TYPES, DEVICE_TYPE_LABELS, isDeviceType } from './device-type';
import { isIdempotencyKey } from './idempotency-key';
import { PHONE_DIGITS, REPAIR_REQUEST_LIMITS, validateRepairRequest, type RawRepairRequest } from './repair-request';
import {
  TRACKING_CODE_ALPHABET,
  TRACKING_CODE_LENGTH,
  generateTrackingCode,
  isTrackingCode,
} from './tracking-code';

const VALID: RawRepairRequest = {
  customerName: 'Ana Pérez',
  customerPhone: '+51 987 654 321',
  customerEmail: '',
  deviceType: 'CELULAR',
  brand: 'Samsung',
  model: '',
  problemDescription: 'No enciende',
};

const errorsOf = (raw: RawRepairRequest) => {
  const result = validateRepairRequest(raw);
  return result.ok ? null : result.fieldErrors;
};

describe('DeviceType [SC-16]', () => {
  it('son exactamente seis valores con su etiqueta', () => {
    expect(DEVICE_TYPES).toEqual(['CELULAR', 'TABLET', 'LAPTOP', 'PC', 'CONSOLA', 'OTRO']);
    expect(Object.values(DEVICE_TYPE_LABELS)).toEqual(['Celular', 'Tablet', 'Laptop', 'PC', 'Consola', 'Otro']);
  });

  it('rechaza cualquier otro valor', () => {
    for (const bad of ['celular', 'SMARTWATCH', '', 'PC ', 7, null, undefined]) expect(isDeviceType(bad)).toBe(false);
  });
});

describe('validateRepairRequest — campos obligatorios y opcionales [SC-16] [E3]', () => {
  it('acepta una solicitud válida sin correo ni modelo y los normaliza a null', () => {
    const result = validateRepairRequest(VALID);
    expect(result).toEqual({
      ok: true,
      value: {
        customerName: 'Ana Pérez',
        customerPhone: '+51 987 654 321',
        customerEmail: null,
        deviceType: 'CELULAR',
        brand: 'Samsung',
        model: null,
        problemDescription: 'No enciende',
      },
    });
  });

  it('recorta los espacios exteriores y trata opcionales solo con espacios como no informados', () => {
    const result = validateRepairRequest({ ...VALID, customerName: '  Ana  ', customerEmail: '   ', model: '  ', brand: ' HP ' });
    expect(result.ok && [result.value.customerName, result.value.customerEmail, result.value.model, result.value.brand]).toEqual([
      'Ana',
      null,
      null,
      'HP',
    ]);
  });

  it('rechaza obligatorios vacíos o solo con espacios, uno por uno', () => {
    for (const field of ['customerName', 'customerPhone', 'deviceType', 'brand', 'problemDescription'] as const) {
      expect(errorsOf({ ...VALID, [field]: '   ' }), field).toEqual({ [field]: 'REQUIRED' });
      expect(errorsOf({ ...VALID, [field]: undefined }), field).toEqual({ [field]: 'REQUIRED' });
    }
  });

  it('informa todos los campos inválidos a la vez', () => {
    expect(errorsOf({})).toEqual({
      customerName: 'REQUIRED',
      customerPhone: 'REQUIRED',
      deviceType: 'REQUIRED',
      brand: 'REQUIRED',
      problemDescription: 'REQUIRED',
    });
  });

  it('acepta textos mínimos: un nombre de un carácter y una descripción breve', () => {
    expect(errorsOf({ ...VALID, customerName: 'X', problemDescription: 'No enciende' })).toBeNull();
  });

  it('un tipo de equipo fuera de la lista se rechaza', () => {
    expect(errorsOf({ ...VALID, deviceType: 'SMARTWATCH' })).toEqual({ deviceType: 'INVALID_FORMAT' });
  });

  it('rechaza el carácter nulo en cualquier texto', () => {
    for (const field of ['customerName', 'brand', 'model', 'problemDescription', 'customerPhone', 'customerEmail'] as const) {
      expect(errorsOf({ ...VALID, [field]: 'a\u0000b' }), field).toEqual({ [field]: 'INVALID_FORMAT' });
    }
  });
});

describe('límites en caracteres, no en bytes', () => {
  const limits = [
    ['customerName', REPAIR_REQUEST_LIMITS.customerName],
    ['brand', REPAIR_REQUEST_LIMITS.brand],
    ['model', REPAIR_REQUEST_LIMITS.model],
    ['problemDescription', REPAIR_REQUEST_LIMITS.problemDescription],
  ] as const;

  it.each(limits)('%s: el límite exacto se acepta y uno más se rechaza', (field, max) => {
    expect(errorsOf({ ...VALID, [field]: 'a'.repeat(max) })).toBeNull();
    expect(errorsOf({ ...VALID, [field]: 'a'.repeat(max + 1) })).toEqual({ [field]: 'TOO_LONG' });
  });

  it.each(limits)('%s: tildes, ñ y emoji cuentan como un carácter y no por sus bytes', (field, max) => {
    expect(errorsOf({ ...VALID, [field]: 'ñ'.repeat(max) })).toBeNull();
    expect(errorsOf({ ...VALID, [field]: '😀'.repeat(max) })).toBeNull(); // 4 bytes UTF-8 y 2 unidades UTF-16 cada uno
    expect(errorsOf({ ...VALID, [field]: '😀'.repeat(max + 1) })).toEqual({ [field]: 'TOO_LONG' });
  });

  it('el contenido con apariencia de código se conserva literal', () => {
    const result = validateRepairRequest({ ...VALID, problemDescription: '<script>alert(1)</script> {{7*7}} ${x}' });
    expect(result.ok && result.value.problemDescription).toBe('<script>alert(1)</script> {{7*7}} ${x}');
  });
});

describe('teléfono [E3]', () => {
  it.each(['+51 987 654 321', '(01) 234-5678', '987654321', '1234567', '123456789012345', '+1 (555) 123-4567'])(
    'acepta %s',
    (phone) => {
      expect(errorsOf({ ...VALID, customerPhone: phone })).toBeNull();
    },
  );

  it.each([
    '123456', // 6 dígitos
    '1234567890123456', // 16 dígitos
    'abc1234567',
    '987 654 321 ext 5',
    '987#654321',
    '987*654321',
    '51+987654321',
    '++51987654321',
    '+51 987 654 321 +',
    '987.654.321',
    '٩٨٧٦٥٤٣٢١', // dígitos árabes
  ])('rechaza %s', (phone) => {
    expect(errorsOf({ ...VALID, customerPhone: phone })).toEqual({ customerPhone: 'INVALID_FORMAT' });
  });

  it('conserva lo escrito (tras trim) y los límites son 7 y 15', () => {
    const result = validateRepairRequest({ ...VALID, customerPhone: '  (01) 234-5678 ' });
    expect(result.ok && result.value.customerPhone).toBe('(01) 234-5678');
    expect(PHONE_DIGITS).toEqual({ min: 7, max: 15 });
  });
});

describe('correo', () => {
  it.each(['ana@example.com', 'ana.perez+taller@sub.example.co', 'a@b.c'])('acepta %s sin alterar mayúsculas', (email) => {
    const result = validateRepairRequest({ ...VALID, customerEmail: email });
    expect(result.ok && result.value.customerEmail).toBe(email);
  });

  it.each(['ana', 'ana@', '@example.com', 'ana@example', 'ana@@example.com', 'ana perez@example.com', 'ana@exa mple.com', 'ana@.com'])(
    'rechaza %s',
    (email) => {
      expect(errorsOf({ ...VALID, customerEmail: email })).toEqual({ customerEmail: 'INVALID_FORMAT' });
    },
  );

  it('el límite es 254 caracteres', () => {
    const at254 = `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(61)}`;
    expect(at254).toHaveLength(254);
    expect(errorsOf({ ...VALID, customerEmail: at254 })).toBeNull();
    expect(errorsOf({ ...VALID, customerEmail: `a${at254}` })).toEqual({ customerEmail: 'TOO_LONG' });
  });
});

describe('código de seguimiento [E16] [E17]', () => {
  const fixed = (bytes: number[]) => () => Uint8Array.from(bytes);

  it('tiene 12 caracteres del alfabeto aprobado (sin vocales ni 0 O 1 I L Q Y)', () => {
    expect(TRACKING_CODE_ALPHABET).toBe('23456789BDFGHJKMNPRSTWX');
    expect(TRACKING_CODE_ALPHABET).toHaveLength(23);
    expect(TRACKING_CODE_ALPHABET).not.toMatch(/[AEIOU01LQY]/);
    const code = generateTrackingCode((n) => Uint8Array.from({ length: n }, (_, i) => i * 7));
    expect(code).toHaveLength(TRACKING_CODE_LENGTH);
    expect(isTrackingCode(code)).toBe(true);
  });

  it('descarta los bytes ≥ 253 (selección sin sesgo)', () => {
    let calls = 0;
    const code = generateTrackingCode((n) => {
      calls += 1;
      return calls === 1 ? Uint8Array.from({ length: n }, () => 255) : Uint8Array.from({ length: n }, (_, i) => i);
    });
    expect(calls).toBe(2);
    expect(code).toBe(Array.from({ length: 12 }, (_, i) => TRACKING_CODE_ALPHABET[i]).join(''));
  });

  it('mapea cada valor del alfabeto exactamente (0 → primero, 252 → último)', () => {
    expect(generateTrackingCode(fixed(Array(24).fill(0)))).toBe('2'.repeat(12));
    expect(generateTrackingCode(fixed(Array(24).fill(252)))).toBe('X'.repeat(12));
  });

  it('con muchos códigos aleatorios usa todo el alfabeto de forma aproximadamente uniforme', () => {
    const counts = new Map<string, number>();
    let seed = 12345;
    const pseudo = (n: number) => Uint8Array.from({ length: n }, () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) >> 16) & 255);
    for (let i = 0; i < 2000; i += 1) {
      for (const ch of generateTrackingCode(pseudo)) counts.set(ch, (counts.get(ch) ?? 0) + 1);
    }
    expect(counts.size).toBe(23);
    const expected = (2000 * 12) / 23;
    for (const count of counts.values()) expect(Math.abs(count - expected)).toBeLessThan(expected * 0.2);
  });

  it('isTrackingCode exige el formato exacto', () => {
    expect(isTrackingCode('23456789BDFG')).toBe(true);
    for (const bad of ['23456789BDF', '23456789BDFGH', '23456789bdfg', '23456789BDF0', '2345 6789BDFG', 'A3456789BDFG', '', null, 12]) {
      expect(isTrackingCode(bad)).toBe(false);
    }
  });
});

describe('normalizeCustomerNameSearch (TD §19)', () => {
  it.each([
    ['Muñoz', 'munoz'],
    ['  Wilder   Moreno  Zavaleta ', 'wilder moreno zavaleta'],
    ['ÁNGEL Pérez', 'angel perez'],
    ['José\tMaría', 'jose maria'],
    ['ñandú', 'nandu'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeCustomerNameSearch(input)).toBe(expected);
  });

  it('es idempotente y no altera el nombre original', () => {
    const name = 'Muñoz Ñandú';
    expect(normalizeCustomerNameSearch(normalizeCustomerNameSearch(name))).toBe(normalizeCustomerNameSearch(name));
    expect(name).toBe('Muñoz Ñandú');
  });
});

describe('clave de idempotencia [E1]', () => {
  it('acepta base64url de 32 a 128 caracteres', () => {
    expect(isIdempotencyKey('A'.repeat(43))).toBe(true);
    expect(isIdempotencyKey('a-_9'.repeat(8))).toBe(true);
  });

  it.each(['', 'corta', 'a'.repeat(31), 'a'.repeat(129), `${'a'.repeat(40)}+/=`, `${'a'.repeat(40)} `, 42, null])(
    'rechaza %s',
    (value) => {
      expect(isIdempotencyKey(value)).toBe(false);
    },
  );
});
