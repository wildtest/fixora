import 'server-only';

// Extracción por lista positiva (TD §23): jamás `message`, `cause`, `stack` ni otras propiedades.

export type SafeErrorFields = {
  readonly errorName?: string;
  readonly errorCode?: string;
  readonly digest?: string;
};

export const UNKNOWN_INFRASTRUCTURE_ERROR = 'UNKNOWN_INFRASTRUCTURE_ERROR';

// Códigos genéricos de red de Node. Los de Prisma/PostgreSQL los añade CHG-02 con su evidencia.
const KNOWN_ERROR_CODES: ReadonlySet<string> = new Set(['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND']);

const NAME = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const DIGEST = /^[A-Za-z0-9]{1,32}$/;

export function safeErrorFields(error: unknown): SafeErrorFields {
  try {
    if (typeof error !== 'object' || error === null) return {};
    const source = error as Record<string, unknown>;
    const name = typeof source.name === 'string' && NAME.test(source.name) ? source.name : undefined;
    const code = source.code;
    const errorCode =
      typeof code === 'string' ? (KNOWN_ERROR_CODES.has(code) ? code : UNKNOWN_INFRASTRUCTURE_ERROR) : undefined;
    const digest = typeof source.digest === 'string' && DIGEST.test(source.digest) ? source.digest : undefined;
    return {
      ...(name && { errorName: name }),
      ...(errorCode && { errorCode }),
      ...(digest && { digest }),
    };
  } catch {
    return {};
  }
}
