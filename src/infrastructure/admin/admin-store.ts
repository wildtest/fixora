import 'server-only';
import { getPrisma } from '../db/client';
import type { PrismaClient } from '../db/generated/client.ts';

// Persistencia del administrador y sus sesiones (CHG-08, D7). El rol de aplicación solo LEE `admin_users` y puede
// crear, leer, borrar y actualizar únicamente `last_seen_at` de `admin_sessions` (privilegios de CHG-02): el
// administrador se aprovisiona fuera de la aplicación. Solo se persiste el SHA-256 del token, nunca el token.

export type AdminRecord = { readonly id: string; readonly passwordHash: string };

export type SessionRecord = {
  readonly id: string;
  readonly adminUserId: string;
  readonly lastSeenAt: Date;
  readonly expiresAt: Date;
};

export type NewSession = {
  readonly id: string;
  readonly adminUserId: string;
  readonly tokenHash: string;
  readonly now: Date;
  readonly expiresAt: Date;
};

export type AdminStore = {
  findAdminByEmail(email: string): Promise<AdminRecord | null>;
  createSession(session: NewSession): Promise<void>;
  findSessionByTokenHash(tokenHash: string): Promise<SessionRecord | null>;
  touchSession(id: string, now: Date): Promise<void>;
  deleteSessionById(id: string): Promise<void>;
  deleteSessionByTokenHash(tokenHash: string): Promise<void>;
  /** Limpieza oportunista acotada: filas vencidas por vigencia absoluta o por inactividad. */
  deleteExpiredSessions(now: Date, idleMs: number, limit: number): Promise<number>;
};

export function createAdminStore(
  db: Pick<PrismaClient, 'adminUser' | 'adminSession' | '$executeRaw'> = getPrisma(),
): AdminStore {
  return {
    async findAdminByEmail(email) {
      return db.adminUser.findUnique({ where: { email }, select: { id: true, passwordHash: true } });
    },

    async createSession({ id, adminUserId, tokenHash, now, expiresAt }) {
      await db.adminSession.create({
        data: { id, adminUserId, tokenHash, createdAt: now, lastSeenAt: now, expiresAt },
        select: { id: true },
      });
    },

    async findSessionByTokenHash(tokenHash) {
      return db.adminSession.findUnique({
        where: { tokenHash },
        select: { id: true, adminUserId: true, lastSeenAt: true, expiresAt: true },
      });
    },

    async touchSession(id, now) {
      // Solo `last_seen_at`: `expires_at` es absoluto y el rol de aplicación no puede actualizarlo.
      await db.adminSession.updateMany({ where: { id }, data: { lastSeenAt: now } });
    },

    async deleteSessionById(id) {
      await db.adminSession.deleteMany({ where: { id } });
    },

    async deleteSessionByTokenHash(tokenHash) {
      await db.adminSession.deleteMany({ where: { tokenHash } });
    },

    async deleteExpiredSessions(now, idleMs, limit) {
      const iso = now.toISOString();
      return db.$executeRaw`
        DELETE FROM "admin_sessions" WHERE ctid IN (
          SELECT ctid FROM "admin_sessions"
          WHERE "expires_at" <= ${iso}::timestamptz
             OR "last_seen_at" + ${idleMs}::int * interval '1 millisecond' <= ${iso}::timestamptz
          LIMIT ${limit}::int)`;
    },
  };
}
