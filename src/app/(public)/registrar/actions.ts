'use server';

import type { ActionResult } from '@/application/action-result';
import { registerRepairFromForm } from '@/application/register-repair-service';
import type { RegisterRepairCode, RegistrationConfirmation } from '@/application/register-repair';

// Server Action adaptadora de PUB-02. Origin/Host los verifica Next. No registra ni devuelve datos personales.
export async function registerRepairAction(
  formData: FormData,
): Promise<ActionResult<RegistrationConfirmation, RegisterRepairCode>> {
  return registerRepairFromForm(formData);
}
