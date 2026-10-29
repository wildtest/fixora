import { parseOrderId } from '../../domain/admin/order-detail';
import { normalizeCustomerNameSearch } from '../../domain/repair/customer-name-search';
import { canEditBasicData } from '../../domain/repair/lifecycle';
import { validateRepairRequest, type RawRepairRequest, type RepairRequestField, type RepairRequestInput } from '../../domain/repair/repair-request';
import type { OrderDataStore } from '../../infrastructure/admin/order-data-store';
import type { ActionResult } from '../action-result';
import type { AdminContext } from './admin-context';

// Corrección de los datos básicos de una orden (CHG-13 D1–D8): UNA operación conjunta y atómica sobre una lista CERRADA de
// siete campos, con las MISMAS validaciones y normalización del registro (`validateRepairRequest`, sin reglas administrativas).
// Precedencia:
//   sesión (el guardia, antes) → entrada técnica → orden existente → versión vigente (STALE_ORDER) → estado final (ORDER_CLOSED)
//   → validar y normalizar los siete campos → no-op (sin escritura) → UPDATE condicional por versión (0 filas ⇒ STALE_ORDER).
// La lista de campos se aplica por selección explícita: lo que no esté en ella (`trackingCode`, `status`, `diagnosis`,
// `estimatedCost`, `version`, …) se ignora y jamás se escribe. Sin historial, sin fusión, reintento ni last-write-wins.

export type BasicDataCode = 'VALIDATION_FAILED' | 'STALE_ORDER' | 'ORDER_CLOSED';

export type BasicDataOutcome = {
  /** Versión vigente tras la operación (sin cambio si fue un éxito sin efecto). */
  readonly version: number;
  readonly changed: boolean;
};

export type BasicDataDependencies = { readonly store: OrderDataStore; readonly now: () => Date };

/** La lista cerrada de campos corregibles (D1). */
export const CORRECTABLE_FIELDS: readonly RepairRequestField[] = [
  'customerName',
  'customerPhone',
  'customerEmail',
  'deviceType',
  'brand',
  'model',
  'problemDescription',
] as const;

type Technical = { readonly orderId: string; readonly expectedVersion: number; readonly raw: RawRepairRequest };

function parseTechnical(input: unknown): Technical | null {
  if (typeof input !== 'object' || input === null) return null;
  const body = input as Record<string, unknown>;
  const orderId = parseOrderId(body.orderId);
  const { expectedVersion } = body;
  if (orderId === null) return null;
  if (typeof expectedVersion !== 'number' || !Number.isSafeInteger(expectedVersion) || expectedVersion < 1) return null;
  // Selección explícita por allowlist: ningún valor fuera de la lista llega al dominio. Todos deben ser texto.
  const raw: Partial<Record<RepairRequestField, string>> = {};
  for (const field of CORRECTABLE_FIELDS) {
    const value = body[field];
    if (typeof value !== 'string') return null;
    raw[field] = value;
  }
  return { orderId, expectedVersion, raw };
}

const same = (a: RepairRequestInput, b: RepairRequestInput): boolean =>
  CORRECTABLE_FIELDS.every((field) => a[field as keyof RepairRequestInput] === b[field as keyof RepairRequestInput]);

export async function saveBasicOrderData(
  _admin: AdminContext,
  input: unknown,
  { store, now }: BasicDataDependencies,
): Promise<ActionResult<BasicDataOutcome, BasicDataCode>> {
  const technical = parseTechnical(input);
  if (technical === null) return { ok: false, code: 'VALIDATION_FAILED' };
  const { orderId, expectedVersion } = technical;

  return store.inTransaction<ActionResult<BasicDataOutcome, BasicDataCode>>(async (unit) => {
    const current = await unit.load(orderId);
    if (current === null) return { ok: false, code: 'VALIDATION_FAILED' };
    // Con una versión obsoleta gana STALE_ORDER aunque la orden ya sea final: la vista revisada era antigua.
    if (current.version !== expectedVersion) return { ok: false, code: 'STALE_ORDER' };
    if (!canEditBasicData(current.status)) return { ok: false, code: 'ORDER_CLOSED' };

    const validated = validateRepairRequest(technical.raw);
    if (!validated.ok) return { ok: false, code: 'VALIDATION_FAILED', fieldErrors: validated.fieldErrors };
    // Se comparan los valores YA normalizados con los persistidos; ningún no-op parcial.
    if (same(validated.value, current)) return { ok: true, data: { version: current.version, changed: false } };

    const nameChanged = validated.value.customerName !== current.customerName;
    const applied = await unit.apply({
      orderId,
      expectedVersion,
      data: validated.value,
      nameSearch: nameChanged ? normalizeCustomerNameSearch(validated.value.customerName) : null,
      now: now(),
    });
    if (applied === 'stale') return { ok: false, code: 'STALE_ORDER' };
    return { ok: true, data: { version: expectedVersion + 1, changed: true } };
  });
}
