// Sujeto del limitador (TD §22): el origen del cliente tal como lo publica la plataforma. En Vercel, la cabecera
// documentada `x-vercel-forwarded-for` (la plataforma la establece y SOBRESCRIBE cualquier valor enviado por el cliente:
// verificado en Production, ver `docs/08-seguridad/SECURITY-REPORT.md` SEC-001; el código de negocio nunca lee
// `X-Forwarded-For` arbitrario). La acción lee las cabeceras del framework y pasa el valor aquí.
//
// Canonicalización (CHG-14, cierra el diferimiento de TD §22): una IPv4 se conserva en su forma decimal canónica; una IPv6
// se reduce a su PREFIJO /64 (el que un proveedor asigna a un único cliente), de modo que rotar direcciones dentro del
// prefijo NO permita eludir el límite; una IPv6 «mapeada a IPv4» (`::ffff:a.b.c.d`) se trata como esa IPv4. Un valor que no
// sea una IP válida cuenta como desconocido. El sujeto nunca se almacena en claro: el limitador guarda únicamente su HMAC.

const MAX_SUBJECT_LENGTH = 64;
/** Sujeto compartido cuando la plataforma no informa el origen (desarrollo local): ante la duda, todos juntos. */
export const UNKNOWN_SUBJECT = 'unknown';

/** Longitud del prefijo IPv6 que identifica a un cliente (un /64 es una única red de cliente). */
export const IPV6_PREFIX_GROUPS = 4;

function parseIpv4(text: string): number[] | null {
  const parts = text.split('.');
  if (parts.length !== 4) return null;
  const octets: number[] = [];
  for (const part of parts) {
    if (!/^(0|[1-9][0-9]{0,2})$/.test(part)) return null; // sin ceros a la izquierda ni signos
    const value = Number(part);
    if (value > 255) return null;
    octets.push(value);
  }
  return octets;
}

/** Los ocho grupos de 16 bits de una IPv6, o `null` si no es una IPv6 válida. */
function parseIpv6(text: string): number[] | null {
  if (text.length === 0 || !/^[0-9a-f:.]+$/.test(text)) return null;
  const doubleColon = text.indexOf('::');
  if (doubleColon !== text.lastIndexOf('::')) return null; // a lo sumo un «::»
  const toGroups = (side: string): number[] | null => {
    if (side === '') return [];
    const groups: number[] = [];
    const pieces = side.split(':');
    for (const [index, piece] of pieces.entries()) {
      if (piece.includes('.')) {
        // IPv4 incrustada: solo como último elemento; ocupa dos grupos.
        if (index !== pieces.length - 1) return null;
        const octets = parseIpv4(piece);
        if (octets === null) return null;
        groups.push((octets[0]! << 8) | octets[1]!, (octets[2]! << 8) | octets[3]!);
      } else {
        if (!/^[0-9a-f]{1,4}$/.test(piece)) return null;
        groups.push(parseInt(piece, 16));
      }
    }
    return groups;
  };
  if (doubleColon === -1) {
    const groups = toGroups(text);
    return groups !== null && groups.length === 8 ? groups : null;
  }
  const head = toGroups(text.slice(0, doubleColon));
  const tail = toGroups(text.slice(doubleColon + 2));
  if (head === null || tail === null) return null;
  const missing = 8 - head.length - tail.length;
  if (missing < 1) return null; // «::» debe representar al menos un grupo
  return [...head, ...new Array<number>(missing).fill(0), ...tail];
}

export function clientSubject(forwardedFor: string | null | undefined): string {
  // Solo el primer elemento de la lista; sin corchetes ni identificador de zona.
  const first = (forwardedFor?.split(',')[0] ?? '').trim().toLowerCase().replace(/^\[|\]$/g, '').split('%')[0] ?? '';
  if (first.length === 0 || first.length > MAX_SUBJECT_LENGTH) return UNKNOWN_SUBJECT;

  const ipv4 = parseIpv4(first);
  if (ipv4 !== null) return ipv4.join('.');

  const groups = parseIpv6(first);
  if (groups === null) return UNKNOWN_SUBJECT;
  // IPv4 mapeada (::ffff:a.b.c.d): el cliente es esa IPv4.
  if (groups.slice(0, 5).every((group) => group === 0) && groups[5] === 0xffff) {
    return [groups[6]! >> 8, groups[6]! & 0xff, groups[7]! >> 8, groups[7]! & 0xff].join('.');
  }
  return `${groups.slice(0, IPV6_PREFIX_GROUPS).map((group) => group.toString(16)).join(':')}::/64`;
}
