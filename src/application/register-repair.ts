import type { DeviceType } from '../domain/repair/device-type';
import { isIdempotencyKey } from '../domain/repair/idempotency-key';
import {
  validateRepairRequest,
  type RawRepairRequest,
  type RepairRequestInput,
} from '../domain/repair/repair-request';
import type { FieldErrors } from '../domain/validation/validation';
import type { ActionResult } from './action-result';

// Caso de uso `registerRepair` (CHG-05): valida, calcula el hash de la clave y delega la creación atómica e
// idempotente. Las dependencias llegan por parámetro (sin puertos formales ni DI) para poder probarlo.

/** DTO de la confirmación (allowlist): sin nombre, teléfono, correo, UUID, versión ni clave. */
export type RegistrationConfirmation = {
  readonly trackingCode: string;
  readonly device: { readonly type: DeviceType; readonly brand: string; readonly model: string | null };
};

export type RegisterRepairCode = 'VALIDATION_FAILED';

export type RegisterRepairDependencies = {
  readonly register: (command: {
    readonly orderId: string;
    readonly request: RepairRequestInput;
    readonly keyHash: string;
    readonly now: Date;
    readonly newTrackingCode: () => string;
  }) => Promise<RegistrationConfirmation>;
  readonly newOrderId: () => string;
  readonly newTrackingCode: () => string;
  readonly hashKey: (key: string) => string;
  readonly now: () => Date;
};

export async function registerRepair(
  raw: RawRepairRequest,
  idempotencyKey: string,
  dependencies: RegisterRepairDependencies,
): Promise<ActionResult<RegistrationConfirmation, RegisterRepairCode>> {
  const validation = validateRepairRequest(raw);
  const keyErrors: FieldErrors = isIdempotencyKey(idempotencyKey) ? {} : { idempotencyKey: 'INVALID_FORMAT' };
  if (!validation.ok || Object.keys(keyErrors).length > 0) {
    // Una validación fallida no crea nada ni consume la clave.
    return {
      ok: false,
      code: 'VALIDATION_FAILED',
      fieldErrors: { ...(validation.ok ? {} : validation.fieldErrors), ...keyErrors },
    };
  }
  const data = await dependencies.register({
    orderId: dependencies.newOrderId(),
    request: validation.value,
    keyHash: dependencies.hashKey(idempotencyKey),
    now: dependencies.now(),
    newTrackingCode: dependencies.newTrackingCode,
  });
  return { ok: true, data };
}
