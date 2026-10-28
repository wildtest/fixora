import 'server-only';
import { readLimiterConfig } from '../config/capabilities';
import { getPrisma } from '../db/client';
import type { PrismaClient } from '../db/generated/client.ts';
import { subjectKey } from './subject-key';

// Componente técnico del limitador (CHG-02, D-9): solo la primitiva persistente. Sin textos de interfaz, sin
// contrato `RATE_LIMITED`/`SERVICE_UNAVAILABLE` (CHG-06/CHG-08) y sin fijar políticas ni prefijos IPv6.

export type LimiterSurface = 'PUBLIC_TRACKING' | 'ADMIN_LOGIN';

/** Política recibida de cada consumidor: los valores del TD §22 pertenecen a CHG-06 y CHG-08. */
export type LimiterPolicy = {
  readonly maxFailures: number;
  readonly windowMs: number;
  readonly blockMs: number;
};

/** Resultado técnico; `unavailable` es el fallo cerrado: nunca equivale a «permitido». */
export type LimiterDecision =
  | { readonly status: 'allowed' }
  | { readonly status: 'blocked'; readonly blockedUntil: Date }
  | { readonly status: 'unavailable' };

export type LimiterDependencies = {
  readonly db: Pick<PrismaClient, '$queryRaw' | '$executeRaw'>;
  readonly hmacSecret: string;
  readonly now: () => Date;
};

export type Limiter = {
  /** ¿Está bloqueado el sujeto? Los aciertos no cuentan: no hay operación de acierto. */
  isBlocked(subject: string, surface: LimiterSurface): Promise<LimiterDecision>;
  /** Registra un fallo de forma atómica y devuelve si el sujeto queda bloqueado. */
  recordFailure(subject: string, surface: LimiterSurface, policy: LimiterPolicy): Promise<LimiterDecision>;
  /** Limpieza oportunista acotada: elimina como máximo `limit` filas con ventana y bloqueo vencidos. */
  cleanupExpired(surface: LimiterSurface, windowMs: number, limit: number): Promise<number | 'unavailable'>;
};

type BucketRow = { blocked_until: Date | null };

function decide(blockedUntil: Date | null, now: Date): LimiterDecision {
  return blockedUntil !== null && blockedUntil.getTime() > now.getTime()
    ? { status: 'blocked', blockedUntil }
    : { status: 'allowed' };
}

export function createLimiter({ db, hmacSecret, now }: LimiterDependencies): Limiter {
  return {
    async isBlocked(subject, surface) {
      try {
        const at = now();
        const key = subjectKey(hmacSecret, subject);
        const rows = await db.$queryRaw<BucketRow[]>`
          SELECT "blocked_until" FROM "rate_limit_buckets"
          WHERE "subject_key" = ${key} AND "surface" = ${surface}::rate_limit_surface`;
        return decide(rows[0]?.blocked_until ?? null, at);
      } catch {
        return { status: 'unavailable' };
      }
    },

    async recordFailure(subject, surface, policy) {
      try {
        const at = now();
        const iso = at.toISOString();
        const key = subjectKey(hmacSecret, subject);
        const { maxFailures, windowMs, blockMs } = policy;
        // Una sola sentencia: segura ante concurrencia (el conflicto serializa por fila). Mientras haya bloqueo
        // vigente no se extiende ni se cuenta; una ventana o un bloqueo vencidos reinician el contador.
        const rows = await db.$queryRaw<BucketRow[]>`
          INSERT INTO "rate_limit_buckets" AS b
            ("subject_key", "surface", "window_start", "failure_count", "blocked_until", "updated_at")
          VALUES (
            ${key}, ${surface}::rate_limit_surface, ${iso}::timestamptz, 1,
            CASE WHEN 1 >= ${maxFailures}::int
              THEN ${iso}::timestamptz + ${blockMs}::int * interval '1 millisecond' END,
            ${iso}::timestamptz)
          ON CONFLICT ("subject_key", "surface") DO UPDATE SET
            "window_start" = CASE
              WHEN b."blocked_until" > ${iso}::timestamptz THEN b."window_start"
              WHEN b."blocked_until" IS NOT NULL
                OR b."window_start" + ${windowMs}::int * interval '1 millisecond' <= ${iso}::timestamptz
                THEN ${iso}::timestamptz
              ELSE b."window_start" END,
            "failure_count" = CASE
              WHEN b."blocked_until" > ${iso}::timestamptz THEN b."failure_count"
              WHEN b."blocked_until" IS NOT NULL
                OR b."window_start" + ${windowMs}::int * interval '1 millisecond' <= ${iso}::timestamptz
                THEN 1
              ELSE b."failure_count" + 1 END,
            "blocked_until" = CASE
              WHEN b."blocked_until" > ${iso}::timestamptz THEN b."blocked_until"
              WHEN b."blocked_until" IS NOT NULL
                OR b."window_start" + ${windowMs}::int * interval '1 millisecond' <= ${iso}::timestamptz
                THEN CASE WHEN 1 >= ${maxFailures}::int
                  THEN ${iso}::timestamptz + ${blockMs}::int * interval '1 millisecond' END
              WHEN b."failure_count" + 1 >= ${maxFailures}::int
                THEN ${iso}::timestamptz + ${blockMs}::int * interval '1 millisecond'
              ELSE NULL END,
            "updated_at" = ${iso}::timestamptz
          RETURNING "blocked_until"`;
        return decide(rows[0]?.blocked_until ?? null, at);
      } catch {
        return { status: 'unavailable' };
      }
    },

    async cleanupExpired(surface, windowMs, limit) {
      try {
        const iso = now().toISOString();
        return await db.$executeRaw`
          DELETE FROM "rate_limit_buckets" WHERE ctid IN (
            SELECT ctid FROM "rate_limit_buckets"
            WHERE "surface" = ${surface}::rate_limit_surface
              AND ("blocked_until" IS NULL OR "blocked_until" <= ${iso}::timestamptz)
              AND "window_start" + ${windowMs}::int * interval '1 millisecond' <= ${iso}::timestamptz
            LIMIT ${limit}::int)`;
      } catch {
        return 'unavailable';
      }
    },
  };
}

/** Limiter de producción: base de datos del runtime, secreto dedicado y reloj del sistema. */
export function getLimiter(): Limiter {
  return createLimiter({ db: getPrisma(), hmacSecret: readLimiterConfig().hmacSecret, now: () => new Date() });
}
