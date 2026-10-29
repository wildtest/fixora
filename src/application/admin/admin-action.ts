import type { ActionResult } from '../action-result';
import type { AdminContext } from './admin-context';

// Patrón reutilizable de acción administrativa (CHG-08, D9):
//   requireAdmin → validar entrada → caso de uso → transacción
// La sesión se vuelve a comprobar en CADA acción, con independencia de que la pantalla de origen estuviera
// protegida. Sin sesión válida la acción NO se ejecuta, no deja estado parcial y devuelve `SESSION_EXPIRED`
// (código único para toda sesión no válida: ausente, inventada, vencida o eliminada; no existe `UNAUTHORIZED`).
// Los changes administrativos posteriores envuelven con esto cada una de sus acciones.

export type SessionExpiredCode = 'SESSION_EXPIRED';

export async function guardAdminAction<T, C extends string = never>(
  authenticate: () => Promise<AdminContext | null>,
  work: (admin: AdminContext) => Promise<ActionResult<T, C>> | ActionResult<T, C>,
): Promise<ActionResult<T, C | SessionExpiredCode>> {
  const admin = await authenticate();
  if (admin === null) {
    // `ActionResult` es condicional sobre `C`; `SESSION_EXPIRED` siempre es un código válido de la unión ampliada.
    return { ok: false, code: 'SESSION_EXPIRED' } as unknown as ActionResult<T, C | SessionExpiredCode>;
  }
  return (await work(admin)) as ActionResult<T, C | SessionExpiredCode>;
}
