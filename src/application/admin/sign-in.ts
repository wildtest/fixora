import { isLoginPasswordAcceptable, parseEmail } from '../../domain/admin/credentials';
import type { ActionResult } from '../action-result';

// Caso de uso del inicio de sesión administrativo (CHG-08, D1/D4). Orden seguro:
//   sujeto → limitador (¿bloqueado? ¿no disponible?) → entrada → búsqueda → verificación (con tope de concurrencia)
//   → sesión. Un correo inexistente recorre la verificación contra un hash ficticio de parámetros equivalentes.
// Un fallo cuenta contra el limitador; un acierto no. La falla del limitador y la falta de capacidad nunca se
// presentan como credenciales inválidas. Sin textos de interfaz: devuelve códigos.

export type SignInCode = 'INVALID_CREDENTIALS' | 'RATE_LIMITED' | 'SERVICE_UNAVAILABLE';

/** Política del acceso administrativo (TD §22): 5 fallos en 15 minutos bloquean 15 minutos. */
export const LOGIN_POLICY = { maxFailures: 5, windowMs: 15 * 60_000, blockMs: 15 * 60_000 } as const;

export type LimiterDecision =
  | { readonly status: 'allowed' }
  | { readonly status: 'blocked'; readonly blockedUntil: Date }
  | { readonly status: 'unavailable' };

export type PasswordCheck = 'valid' | 'invalid' | 'busy';

export type SignInEvent = 'auth.login.failed' | 'auth.rate_limited' | 'limiter.unavailable';

export type SignInDependencies = {
  readonly isBlocked: (subject: string) => Promise<LimiterDecision>;
  readonly recordFailure: (subject: string) => Promise<LimiterDecision>;
  readonly findAdminByEmail: (email: string) => Promise<{ readonly id: string; readonly passwordHash: string } | null>;
  readonly dummyHash: () => Promise<string>;
  /** Verificación acotada por el tope de concurrencia: `busy` si no se puede atender ahora. */
  readonly checkPassword: (password: string, hash: string) => Promise<PasswordCheck>;
  /** Crea una sesión nueva y devuelve el token crudo (solo para el adaptador que fija la cookie). */
  readonly issueSession: (adminId: string) => Promise<string>;
  /** Evento operativo sin datos sensibles (ni correo ni contraseña ni origen). */
  readonly onEvent: (event: SignInEvent) => void;
};

export type SignInInput = { readonly email: unknown; readonly password: unknown };

type Result = ActionResult<{ readonly sessionToken: string }, SignInCode>;

export async function signIn(input: SignInInput, subject: string, dependencies: SignInDependencies): Promise<Result> {
  const blocked = await dependencies.isBlocked(subject);
  if (blocked.status === 'unavailable') {
    dependencies.onEvent('limiter.unavailable');
    return { ok: false, code: 'SERVICE_UNAVAILABLE' };
  }
  if (blocked.status === 'blocked') {
    dependencies.onEvent('auth.rate_limited');
    return { ok: false, code: 'RATE_LIMITED' };
  }

  const failure = async (): Promise<Result> => {
    dependencies.onEvent('auth.login.failed');
    const recorded = await dependencies.recordFailure(subject);
    if (recorded.status === 'unavailable') {
      dependencies.onEvent('limiter.unavailable');
      return { ok: false, code: 'SERVICE_UNAVAILABLE' };
    }
    return { ok: false, code: 'INVALID_CREDENTIALS' };
  };

  // Entrada vacía, mal formada o enorme: el mismo resultado genérico, sin gastar `scrypt` y sin explicar la causa.
  const email = parseEmail(input.email);
  if (!isLoginPasswordAcceptable(input.password)) return failure();
  const password = input.password;

  const admin = email === null ? null : await dependencies.findAdminByEmail(email);
  const hash = admin?.passwordHash ?? (await dependencies.dummyHash());
  const check = await dependencies.checkPassword(password, hash);
  if (check === 'busy') return { ok: false, code: 'SERVICE_UNAVAILABLE' };
  if (admin === null || check !== 'valid') return failure();

  return { ok: true, data: { sessionToken: await dependencies.issueSession(admin.id) } };
}
