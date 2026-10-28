import {
  validateTextField,
  type FieldErrorCode,
  type FieldErrors,
  type ValidationResult,
} from '../validation/validation';
import { isDeviceType, type DeviceType } from './device-type';

// Solicitud de reparación (PRD §4.3; CHG-05 D2/D2.1/D2.2). Validadores puros e isomórficos: el servidor es la
// barrera y la misma lógica da la ayuda inmediata en el cliente. Límites en caracteres de texto, no en bytes.

export const REPAIR_REQUEST_LIMITS = {
  customerName: 100,
  brand: 60,
  model: 60,
  problemDescription: 2000,
  customerEmail: 254,
} as const;

export const PHONE_DIGITS = { min: 7, max: 15 } as const;

export type RepairRequestField =
  | 'customerName'
  | 'customerPhone'
  | 'customerEmail'
  | 'deviceType'
  | 'brand'
  | 'model'
  | 'problemDescription';

/** Entrada cruda: lo que llega del formulario. Los campos ausentes se tratan como vacíos. */
export type RawRepairRequest = Readonly<Partial<Record<RepairRequestField, string>>>;

export type RepairRequestInput = {
  readonly customerName: string;
  /** Lo que escribió el usuario tras `trim` (se conserva tal cual para el taller). */
  readonly customerPhone: string;
  readonly customerEmail: string | null;
  readonly deviceType: DeviceType;
  readonly brand: string;
  readonly model: string | null;
  readonly problemDescription: string;
};

// Solo dígitos, espacios, guiones, paréntesis y un único «+» inicial.
const PHONE_CHARACTERS = /^\+?[0-9 ()-]+$/;
// Sintaxis sencilla y acotada: sin pretender reproducir RFC 5322 ni verificar el dominio.
const EMAIL_SYNTAX = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

function validatePhone(raw: string): ValidationResult<string> {
  const value = raw.trim();
  if (raw.includes('\u0000')) return { ok: false, fieldErrors: { customerPhone: 'INVALID_FORMAT' } };
  if (value.length === 0) return { ok: false, fieldErrors: { customerPhone: 'REQUIRED' } };
  if (!PHONE_CHARACTERS.test(value)) return { ok: false, fieldErrors: { customerPhone: 'INVALID_FORMAT' } };
  const digits = value.replace(/\D/g, '').length;
  if (digits < PHONE_DIGITS.min || digits > PHONE_DIGITS.max) {
    return { ok: false, fieldErrors: { customerPhone: 'INVALID_FORMAT' } };
  }
  return { ok: true, value };
}

function validateOptionalText(
  field: RepairRequestField,
  raw: string,
  maxLength: number,
): ValidationResult<string | null> {
  const result = validateTextField(field, raw, { maxLength, required: false });
  if (!result.ok) return result;
  return { ok: true, value: result.value === '' ? null : result.value };
}

function validateEmail(raw: string): ValidationResult<string | null> {
  const result = validateOptionalText('customerEmail', raw, REPAIR_REQUEST_LIMITS.customerEmail);
  if (!result.ok || result.value === null) return result;
  return EMAIL_SYNTAX.test(result.value) ? result : { ok: false, fieldErrors: { customerEmail: 'INVALID_FORMAT' } };
}

function validateDeviceType(raw: string): ValidationResult<DeviceType> {
  const value = raw.trim();
  if (value.length === 0) return { ok: false, fieldErrors: { deviceType: 'REQUIRED' } };
  if (!isDeviceType(value)) return { ok: false, fieldErrors: { deviceType: 'INVALID_FORMAT' } };
  return { ok: true, value };
}

export function validateRepairRequest(raw: RawRepairRequest): ValidationResult<RepairRequestInput> {
  const text = (field: RepairRequestField) => raw[field] ?? '';
  const customerName = validateTextField('customerName', text('customerName'), { maxLength: REPAIR_REQUEST_LIMITS.customerName });
  const customerPhone = validatePhone(text('customerPhone'));
  const customerEmail = validateEmail(text('customerEmail'));
  const deviceType = validateDeviceType(text('deviceType'));
  const brand = validateTextField('brand', text('brand'), { maxLength: REPAIR_REQUEST_LIMITS.brand });
  const model = validateOptionalText('model', text('model'), REPAIR_REQUEST_LIMITS.model);
  const problemDescription = validateTextField('problemDescription', text('problemDescription'), {
    maxLength: REPAIR_REQUEST_LIMITS.problemDescription,
  });

  if (
    customerName.ok && customerPhone.ok && customerEmail.ok && deviceType.ok && brand.ok && model.ok && problemDescription.ok
  ) {
    return {
      ok: true,
      value: {
        customerName: customerName.value,
        customerPhone: customerPhone.value,
        customerEmail: customerEmail.value,
        deviceType: deviceType.value,
        brand: brand.value,
        model: model.value,
        problemDescription: problemDescription.value,
      },
    };
  }

  const fieldErrors: Record<string, FieldErrorCode> = {};
  for (const result of [customerName, customerPhone, customerEmail, deviceType, brand, model, problemDescription]) {
    if (!result.ok) Object.assign(fieldErrors, result.fieldErrors);
  }
  return { ok: false, fieldErrors: fieldErrors as FieldErrors };
}
