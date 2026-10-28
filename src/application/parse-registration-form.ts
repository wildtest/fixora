import type { RawRepairRequest, RepairRequestField } from '../domain/repair/repair-request';

// Parseo explícito de `FormData` con allowlist (CHG-05 D1): solo los campos aprobados y la clave de
// idempotencia; cualquier otro campo se ignora y nunca viaja a `application`/`domain`. Los valores que no
// son texto (p. ej. archivos) se tratan como ausentes.

export type FormLike = { get(name: string): unknown };

const FIELDS: readonly RepairRequestField[] = [
  'customerName',
  'customerPhone',
  'customerEmail',
  'deviceType',
  'brand',
  'model',
  'problemDescription',
];

export type ParsedRegistrationForm = {
  readonly request: RawRepairRequest;
  readonly idempotencyKey: string;
};

function text(form: FormLike, name: string): string | undefined {
  const value = form.get(name);
  return typeof value === 'string' ? value : undefined;
}

export function parseRegistrationForm(form: FormLike): ParsedRegistrationForm {
  const request: Partial<Record<RepairRequestField, string>> = {};
  for (const field of FIELDS) {
    const value = text(form, field);
    if (value !== undefined) request[field] = value;
  }
  return { request, idempotencyKey: text(form, 'idempotencyKey') ?? '' };
}
