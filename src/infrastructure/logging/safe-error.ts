import 'server-only';

// Extracción por lista positiva (TD §23): jamás `message`, `cause`, `stack` ni otras propiedades.

export type SafeErrorFields = {
  readonly errorName?: string;
  readonly errorCode?: string;
  readonly digest?: string;
};

export const UNKNOWN_INFRASTRUCTURE_ERROR = 'UNKNOWN_INFRASTRUCTURE_ERROR';

// Códigos genéricos de red de Node, de Prisma (P…) y SQLSTATE de PostgreSQL. Lista positiva: lo que no esté aquí
// se registra como UNKNOWN_INFRASTRUCTURE_ERROR sin inspeccionarlo. Los de base de datos los añade CHG-02; los
// SQLSTATE 23001, 23505, 23514 y 42501 están observados en sus pruebas de integración.
const KNOWN_ERROR_CODES: ReadonlySet<string> = new Set([
  'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND',
  'P1001', 'P1002', 'P1008', 'P1017', 'P2002', 'P2003', 'P2024', 'P2025', 'P2028', 'P2034',
  '23001', '23503', '23505', '23514', '40001', '40P01', '42501', '53300', '57014', '57P01',
]);

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
