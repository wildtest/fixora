import { describe, expect, it } from 'vitest';
import { clientSubject, UNKNOWN_SUBJECT } from './client-subject';

// Sujeto del limitador (TD §22, CHG-14): canonicalización de la IP antes del HMAC. Es lo que impide eludir el límite rotando
// direcciones dentro del prefijo asignado a un cliente, y lo que hace que una cabecera mal formada no cree cubos infinitos.
describe('clientSubject — IPv4', () => {
  it('conserva la forma decimal canónica y toma solo el primer valor de la lista', () => {
    expect(clientSubject('203.0.113.7')).toBe('203.0.113.7');
    expect(clientSubject(' 203.0.113.7 , 10.0.0.1, 192.0.2.1')).toBe('203.0.113.7');
  });

  it('rechaza lo que no es una IPv4 canónica: octetos fuera de rango, ceros a la izquierda, signos, texto', () => {
    for (const value of ['256.1.1.1', '1.1.1', '1.1.1.1.1', '01.2.3.4', '1.2.3.-4', '1.2.3.4x', 'a.b.c.d', '203.0.113.7-abc']) {
      expect(clientSubject(value), value).toBe(UNKNOWN_SUBJECT);
    }
  });
});

describe('clientSubject — IPv6 por prefijo /64', () => {
  it('direcciones distintas dentro del mismo /64 son el MISMO sujeto (no se elude rotando la parte de host)', () => {
    const a = clientSubject('2001:db8:aaaa:bbbb::1');
    const b = clientSubject('2001:db8:aaaa:bbbb:1234:5678:9abc:def0');
    const c = clientSubject('2001:DB8:AAAA:BBBB:ffff:ffff:ffff:ffff');
    expect(a).toBe('2001:db8:aaaa:bbbb::/64');
    expect(b).toBe(a);
    expect(c).toBe(a);
  });

  it('prefijos /64 distintos son sujetos distintos', () => {
    expect(clientSubject('2001:db8:aaaa:bbbb::1')).not.toBe(clientSubject('2001:db8:aaaa:bbbc::1'));
    expect(clientSubject('2001:db8:aaaa:bbbb::1')).not.toBe(clientSubject('2001:db8:aaab:bbbb::1'));
  });

  it('las formas comprimidas y expandidas de una misma dirección coinciden; ceros a la izquierda no importan', () => {
    expect(clientSubject('2001:db8::1')).toBe(clientSubject('2001:0db8:0000:0000:0000:0000:0000:0001'));
    expect(clientSubject('2001:db8::')).toBe('2001:db8:0:0::/64');
    expect(clientSubject('::1')).toBe('0:0:0:0::/64');
    expect(clientSubject('[2001:db8::1]')).toBe('2001:db8:0:0::/64'); // corchetes
    expect(clientSubject('fe80::1%eth0')).toBe('fe80:0:0:0::/64'); // identificador de zona
  });

  it('una IPv6 mapeada a IPv4 es esa IPv4 (no un cubo propio)', () => {
    expect(clientSubject('::ffff:203.0.113.7')).toBe('203.0.113.7');
    expect(clientSubject('::FFFF:cb00:7107')).toBe('203.0.113.7');
  });

  it('rechaza direcciones mal formadas: dos «::», demasiados grupos, grupos largos, caracteres ajenos', () => {
    for (const value of ['2001::db8::1', '1:2:3:4:5:6:7:8:9', '2001:db8:12345::1', '2001:db8:::1', 'g::1', '2001:db8::1/64', '::ffff:1.2.3', ':::']) {
      expect(clientSubject(value), value).toBe(UNKNOWN_SUBJECT);
    }
  });
});

describe('clientSubject — ausencia y desmesura', () => {
  it('sin cabecera, vacía o desmesurada: un único sujeto compartido (falla segura hacia el límite, nunca hacia la elusión)', () => {
    for (const value of [null, undefined, '', '   ', ',', 'x'.repeat(65), `${'1'.repeat(70)}`]) {
      expect(clientSubject(value), String(value)).toBe(UNKNOWN_SUBJECT);
    }
  });

  it('un cliente que envía basura distinta en cada intento no obtiene un cubo nuevo cada vez', () => {
    const subjects = new Set(Array.from({ length: 50 }, (_, i) => clientSubject(`basura-${i}-${Math.random()}`)));
    expect([...subjects]).toEqual([UNKNOWN_SUBJECT]);
  });
});
