import 'server-only';
import { generateTrackingCode } from '../domain/repair/tracking-code';
import { createRegistrationStore } from '../infrastructure/registration/registration-store';
import { newUuid, secureRandomBytes, sha256Hex } from '../infrastructure/security/crypto';
import { runAction, type RunActionOptions } from './run-action';
import { parseRegistrationForm, type FormLike } from './parse-registration-form';
import {
  registerRepair,
  type RegisterRepairCode,
  type RegisterRepairDependencies,
  type RegistrationConfirmation,
} from './register-repair';
import type { ActionResult } from './action-result';

// Composición de producción del registro: Server Action → parseo con allowlist → `registerRepair`.
// Un fallo inesperado no sale de aquí como excepción: `runAction` lo registra sin datos personales y devuelve
// `INTERNAL_ERROR` genérico.

export function productionDependencies(): RegisterRepairDependencies {
  const store = createRegistrationStore();
  return {
    register: (command) => store.register(command),
    newOrderId: newUuid,
    newTrackingCode: () => generateTrackingCode(secureRandomBytes),
    hashKey: sha256Hex,
    now: () => new Date(),
  };
}

export function registerRepairFromForm(
  form: FormLike,
  dependencies: () => RegisterRepairDependencies = productionDependencies,
  options: RunActionOptions = {},
): Promise<ActionResult<RegistrationConfirmation, RegisterRepairCode>> {
  return runAction(
    () => {
      const { request, idempotencyKey } = parseRegistrationForm(form);
      return registerRepair(request, idempotencyKey, dependencies());
    },
    { surface: 'public', ...options },
  );
}
