import { describe, expect, it, vi } from 'vitest';
import { parseRegistrationForm } from './parse-registration-form';
import { registerRepair, type RegisterRepairDependencies } from './register-repair';
import { registerRepairFromForm } from './register-repair-service';
import type { Logger } from '../infrastructure/logging/logger';

const KEY = 'k'.repeat(43);
const FORM = {
  customerName: 'Ana Pérez',
  customerPhone: '+51 987 654 321',
  customerEmail: '',
  deviceType: 'LAPTOP',
  brand: 'Lenovo',
  model: 'T14',
  problemDescription: 'No enciende',
};

function deps(overrides: Partial<RegisterRepairDependencies> = {}) {
  const register = vi.fn(async (command: Parameters<RegisterRepairDependencies['register']>[0]) => ({
    trackingCode: 'ABCDEFGHJKMN',
    device: { type: command.request.deviceType, brand: command.request.brand, model: command.request.model },
  }));
  const value: RegisterRepairDependencies = {
    register,
    newOrderId: () => '11111111-1111-4111-8111-111111111111',
    newTrackingCode: () => 'ABCDEFGHJKMN',
    hashKey: (key) => `sha(${key.length})`,
    now: () => new Date('2026-10-28T10:00:00.000Z'),
    ...overrides,
  };
  return { value, register };
}

describe('registerRepair', () => {
  it('con datos válidos delega la creación con el hash de la clave y devuelve solo el DTO de confirmación', async () => {
    const { value, register } = deps();
    const result = await registerRepair(FORM, KEY, value);
    expect(result).toEqual({
      ok: true,
      data: { trackingCode: 'ABCDEFGHJKMN', device: { type: 'LAPTOP', brand: 'Lenovo', model: 'T14' } },
    });
    const command = register.mock.calls[0][0];
    expect(command.keyHash).toBe("sha(43)");
    expect(JSON.stringify(command)).not.toContain(KEY); // la clave cruda no llega al repositorio
    expect(command.request.customerEmail).toBeNull();
    // Allowlist: nada de nombre, teléfono, correo, UUID, versión ni clave en la confirmación.
    const text = JSON.stringify(result);
    for (const leak of ['Ana', '987', '1111', 'version', KEY]) expect(text).not.toContain(leak);
  });

  it('una entrada inválida no crea ninguna orden y no consume la clave [SC-16]', async () => {
    const { value, register } = deps();
    const result = await registerRepair({ ...FORM, customerName: ' ', customerPhone: 'abc' }, KEY, value);
    expect(result).toEqual({
      ok: false,
      code: 'VALIDATION_FAILED',
      fieldErrors: { customerName: 'REQUIRED', customerPhone: 'INVALID_FORMAT' },
    });
    expect(register).not.toHaveBeenCalled();
    // Corregida, la misma clave registra normalmente.
    expect((await registerRepair(FORM, KEY, value)).ok).toBe(true);
    expect(register).toHaveBeenCalledTimes(1);
  });

  it('una clave de idempotencia inválida se rechaza sin crear nada', async () => {
    const { value, register } = deps();
    for (const key of ['', 'corta', 'x'.repeat(200)]) {
      const result = await registerRepair(FORM, key, value);
      expect(result).toMatchObject({ ok: false, code: 'VALIDATION_FAILED', fieldErrors: { idempotencyKey: 'INVALID_FORMAT' } });
    }
    expect(register).not.toHaveBeenCalled();
  });
});

describe('parseRegistrationForm (allowlist)', () => {
  const formOf = (entries: Record<string, unknown>) => ({ get: (name: string) => entries[name] ?? null });

  it('solo toma los campos aprobados y la clave; ignora cualquier otro', () => {
    const parsed = parseRegistrationForm(formOf({ ...FORM, idempotencyKey: KEY, isAdmin: 'true', status: 'ENTREGADO', trackingCode: 'X' }));
    expect(Object.keys(parsed.request).sort()).toEqual(
      ['brand', 'customerEmail', 'customerName', 'customerPhone', 'deviceType', 'model', 'problemDescription'],
    );
    expect(parsed.idempotencyKey).toBe(KEY);
    expect(JSON.stringify(parsed)).not.toMatch(/isAdmin|ENTREGADO|trackingCode/);
  });

  it('los campos ausentes o que no son texto (archivos) se tratan como ausentes', () => {
    const parsed = parseRegistrationForm(formOf({ customerName: new Blob(['x']), brand: 'HP' }));
    expect(parsed.request).toEqual({ brand: 'HP' });
    expect(parsed.idempotencyKey).toBe('');
  });
});

describe('registerRepairFromForm — fallo inesperado [E1]', () => {
  it('devuelve INTERNAL_ERROR genérico y registra sin datos personales', async () => {
    const lines: string[] = [];
    const logger: Logger = {
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: (fields) => void lines.push(JSON.stringify(fields)),
    };
    const failing = deps({
      register: async () => {
        throw Object.assign(new Error('CANARY Ana Pérez 987654321 INSERT INTO repair_orders'), { code: 'P1001' });
      },
    });
    const form = { get: (name: string) => ({ ...FORM, idempotencyKey: KEY })[name as keyof typeof FORM] ?? (name === 'idempotencyKey' ? KEY : null) };
    const result = await registerRepairFromForm(form, () => failing.value, { logger, requestId: 'req-1' });
    expect(result).toEqual({ ok: false, code: 'INTERNAL_ERROR', reference: 'req-1' });
    const output = lines.join('\n');
    expect(output).toContain('P1001');
    for (const leak of ['CANARY', 'Ana', '987654321', 'INSERT', KEY, 'ABCDEFGHJKMN']) expect(output).not.toContain(leak);
    expect(JSON.stringify(result)).not.toMatch(/CANARY|INSERT|Ana/);
  });
});
