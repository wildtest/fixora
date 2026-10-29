// Política de vigencia de la sesión administrativa (CHG-08, D7): 60 minutos de inactividad y 12 horas absolutas
// desde el inicio. La vigencia efectiva es la menor de ambas; no hay renovación del máximo absoluto.

export const SESSION_IDLE_MS = 60 * 60_000;
export const SESSION_ABSOLUTE_MS = 12 * 60 * 60_000;
/** Frecuencia máxima de escritura de `last_seen_at` (throttling): la sesión nunca vive más de lo contratado. */
export const SESSION_TOUCH_INTERVAL_MS = 60_000;

export type SessionTimes = {
  readonly lastSeenAt: Date;
  /** Instante absoluto de expiración (`created_at` + 12 h), fijado al crear la sesión. */
  readonly expiresAt: Date;
};

export function absoluteExpiry(createdAt: Date): Date {
  return new Date(createdAt.getTime() + SESSION_ABSOLUTE_MS);
}

export function isSessionActive(times: SessionTimes, now: Date): boolean {
  const t = now.getTime();
  return t < times.expiresAt.getTime() && t - times.lastSeenAt.getTime() < SESSION_IDLE_MS;
}

/** ¿Toca persistir una nueva actividad? Solo si ya pasó el intervalo de throttling. */
export function shouldTouch(lastSeenAt: Date, now: Date): boolean {
  return now.getTime() - lastSeenAt.getTime() >= SESSION_TOUCH_INTERVAL_MS;
}
