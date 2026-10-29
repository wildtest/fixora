import type { AdminStore } from '../../infrastructure/admin/admin-store';
import { SESSION_IDLE_MS, absoluteExpiry, isSessionActive, shouldTouch } from '../../domain/admin/session-policy';
import { issueAdminContext, type AdminContext } from './admin-context';

// Servicio de sesión administrativa (CHG-08, D7/D9). La autoridad es la fila de PostgreSQL: la cookie solo porta el
// token opaco (256 bits de CSPRNG) y su presencia no prueba validez. Solo se persiste SHA-256(token).

const TOKEN_SHAPE = /^[A-Za-z0-9_-]{43}$/; // 32 bytes en base64url, sin relleno
const CLEANUP_LIMIT = 20;

export type SessionStore = Pick<
  AdminStore,
  | 'createSession'
  | 'findSessionByTokenHash'
  | 'touchSession'
  | 'deleteSessionById'
  | 'deleteSessionByTokenHash'
  | 'deleteExpiredSessions'
>;

export type SessionServiceDependencies = {
  readonly store: SessionStore;
  readonly now: () => Date;
  readonly newId: () => string;
  /** Token crudo de 256 bits (base64url) generado con un CSPRNG. */
  readonly newToken: () => string;
  readonly hashToken: (token: string) => string;
};

export type SessionService = {
  /** Crea una sesión nueva e independiente (nunca reutiliza un token previo) y devuelve el token crudo. */
  issue(adminId: string): Promise<string>;
  /** `null` ante CUALQUIER sesión no válida: ausente, mal formada, inexistente, vencida o eliminada. */
  authenticate(token: string | undefined): Promise<AdminContext | null>;
  /** Idempotente: elimina la fila de la sesión si existe. */
  revoke(token: string | undefined): Promise<void>;
};

async function bestEffort(work: () => Promise<unknown>): Promise<void> {
  try {
    await work();
  } catch {
    // La limpieza oportunista y la actualización de actividad no cambian el resultado de la autorización.
  }
}

export function createSessionService({ store, now, newId, newToken, hashToken }: SessionServiceDependencies): SessionService {
  return {
    async issue(adminId) {
      const at = now();
      const token = newToken();
      await store.createSession({
        id: newId(),
        adminUserId: adminId,
        tokenHash: hashToken(token),
        now: at,
        expiresAt: absoluteExpiry(at),
      });
      await bestEffort(() => store.deleteExpiredSessions(at, SESSION_IDLE_MS, CLEANUP_LIMIT));
      return token;
    },

    async authenticate(token) {
      if (token === undefined || !TOKEN_SHAPE.test(token)) return null;
      const session = await store.findSessionByTokenHash(hashToken(token));
      if (session === null) return null;
      const at = now();
      if (!isSessionActive(session, at)) {
        await bestEffort(() => store.deleteSessionById(session.id));
        return null;
      }
      if (shouldTouch(session.lastSeenAt, at)) await bestEffort(() => store.touchSession(session.id, at));
      return issueAdminContext(session.adminUserId);
    },

    async revoke(token) {
      if (token === undefined || !TOKEN_SHAPE.test(token)) return;
      await store.deleteSessionByTokenHash(hashToken(token));
    },
  };
}
