import 'server-only';
import { createAdminStore } from '../../infrastructure/admin/admin-store';
import { getLimiter, type Limiter } from '../../infrastructure/limiter/limiter';
import { getLogger } from '../../infrastructure/logging/server-logger';
import { newUuid, secureRandomBytes, sha256Hex } from '../../infrastructure/security/crypto';
import { clientSubject } from '../../infrastructure/security/client-subject';
import { dummyHash, verifyPassword } from '../../infrastructure/security/password-hash';
import { createGate } from '../../infrastructure/security/scrypt-gate';
import type { ActionResult } from '../action-result';
import type { AdminContext } from './admin-context';
import { createSessionService, type SessionService } from './session-service';
import { LOGIN_POLICY, signIn, type SignInCode, type SignInDependencies } from './sign-in';
import { runAction, type RunActionOptions } from '../run-action';

// Composición de producción del acceso administrativo (CHG-08). El limitador es la primitiva de CHG-02 (HMAC del
// origen; la IP nunca se almacena en claro). Si no puede construirse (configuración ausente) o falla, el resultado
// es `unavailable` (falla cerrada), nunca «permitido». La verificación de contraseña pasa por un tope de
// concurrencia por instancia, acotado: si no cabe, SERVICE_UNAVAILABLE.

const UNAVAILABLE_LIMITER: Pick<Limiter, 'isBlocked' | 'recordFailure'> = {
  isBlocked: async () => ({ status: 'unavailable' }),
  recordFailure: async () => ({ status: 'unavailable' }),
};

function productionLimiter(): Pick<Limiter, 'isBlocked' | 'recordFailure'> {
  try {
    return getLimiter();
  } catch {
    return UNAVAILABLE_LIMITER;
  }
}

const scryptGate = createGate();

export function productionSessionService(): SessionService {
  return createSessionService({
    store: createAdminStore(),
    now: () => new Date(),
    newId: newUuid,
    newToken: () => Buffer.from(secureRandomBytes(32)).toString('base64url'),
    hashToken: sha256Hex,
  });
}

export function productionSignInDependencies(): SignInDependencies {
  const limiter = productionLimiter();
  return {
    isBlocked: (subject) => limiter.isBlocked(subject, 'ADMIN_LOGIN'),
    recordFailure: (subject) => limiter.recordFailure(subject, 'ADMIN_LOGIN', LOGIN_POLICY),
    // Los repositorios se crean al usarse, solo si el limitador permitió el intento: sin configuración de base de
    // datos el limitador ya habrá fallado cerrado y nunca se llega aquí.
    findAdminByEmail: (email) => createAdminStore().findAdminByEmail(email),
    dummyHash,
    checkPassword: async (password, hash) => {
      const result = await scryptGate.run(() => verifyPassword(password, hash));
      if (result.status === 'busy') return 'busy';
      return result.value ? 'valid' : 'invalid';
    },
    issueSession: (adminId) => productionSessionService().issue(adminId),
    onEvent: (event) => {
      try {
        getLogger().warn({ event, requestId: newUuid(), surface: 'admin' });
      } catch {
        // Un fallo de logging no cambia el resultado.
      }
    },
  };
}

/**
 * `forwardedFor` es el valor de `x-vercel-forwarded-for` ya leído por el adaptador (las cabeceras del framework
 * no se leen dentro de `runAction`).
 */
export function signInFromRequest(
  input: { readonly email: unknown; readonly password: unknown },
  forwardedFor: string | null,
  dependencies: () => SignInDependencies = productionSignInDependencies,
  options: RunActionOptions = {},
): Promise<ActionResult<{ readonly sessionToken: string }, SignInCode>> {
  return runAction(() => signIn(input, clientSubject(forwardedFor), dependencies()), { surface: 'admin', ...options });
}

/** Autoriza una petición: el contexto del administrador si la sesión es válida; `null` en cualquier otro caso. */
export function authenticateSession(token: string | undefined): Promise<AdminContext | null> {
  return productionSessionService().authenticate(token);
}

/** Cierra la sesión en el servidor (idempotente). */
export function revokeSession(token: string | undefined): Promise<void> {
  return productionSessionService().revoke(token);
}
