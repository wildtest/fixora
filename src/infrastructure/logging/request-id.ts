import 'server-only';

type HeaderRecord = Readonly<Record<string, string | readonly string[] | undefined>>;
export type HeadersLike = Headers | HeaderRecord;

const VERCEL_ID = /^[A-Za-z0-9._:-]{1,128}$/;

function readVercelId(headers: HeadersLike): string | undefined {
  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    return headers.get('x-vercel-id') ?? undefined;
  }
  const record = headers as HeaderRecord;
  const key = Object.keys(record).find((name) => name.toLowerCase() === 'x-vercel-id');
  const value = key === undefined ? undefined : record[key];
  return typeof value === 'string' ? value : Array.isArray(value) ? value[0] : undefined;
}

// Lee únicamente `x-vercel-id`; nunca una cabecera de correlación enviada por el cliente.
// Si falta (o no es válida) genera un identificador opaco con `newId`.
export function requestIdFrom(
  headers: HeadersLike | undefined,
  newId: () => string = () => crypto.randomUUID(),
): string {
  try {
    const candidate = headers ? readVercelId(headers) : undefined;
    if (candidate !== undefined && VERCEL_ID.test(candidate)) return candidate;
  } catch {
    // cabeceras inaccesibles: se genera un identificador.
  }
  return newId();
}
