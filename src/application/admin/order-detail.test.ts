import { describe, expect, it, vi } from 'vitest';
import type { AdminOrderDetailRecord } from '../../infrastructure/admin/admin-order-detail-store';
import { issueAdminContext } from './admin-context';
import { getAdminOrderDetail } from './order-detail';

const admin = issueAdminContext('admin-1');
const ID = '0f8fad5b-d9cb-469f-a165-70867728950e';
const record = { id: ID, status: 'EN_DIAGNOSTICO', version: 3, diagnosis: null, estimatedCost: null, reachedApproval: false } as unknown as AdminOrderDetailRecord;

describe('getAdminOrderDetail', () => {
  it('un identificador mal formado se resuelve como no encontrada SIN consultar la base de datos', async () => {
    const findById = vi.fn(async () => record);
    for (const raw of ['', 'basura', '23456789BDFG', undefined, 7]) {
      expect(await getAdminOrderDetail(admin, raw, { findById }), String(raw)).toBeNull();
    }
    expect(findById).not.toHaveBeenCalled();
  });

  it('un UUID válido se consulta normalizado y devuelve la orden o null (indistinguible de lo mal formado)', async () => {
    const findById = vi.fn(async (id: string) => (id === ID ? record : null));
    const detail = await getAdminOrderDetail(admin, ID.toUpperCase(), { findById });
    expect(detail).toMatchObject({ id: ID, version: 3 });
    expect(detail).not.toHaveProperty('reachedApproval'); // dato interno: solo decide la indicación «nunca se publicó»
    expect(detail).toMatchObject({ canEditDiagnosisAndCost: true, neverPublished: false });
    expect(detail?.allowedTransitions).toEqual([
      { targetStatus: 'ESPERANDO_APROBACION', requiresConfirmation: true, blockedReason: 'DIAGNOSIS_AND_COST_REQUIRED' },
      { targetStatus: 'CANCELADO', requiresConfirmation: true },
    ]);
    expect(findById).toHaveBeenCalledWith(ID);
    expect(await getAdminOrderDetail(admin, '11111111-1111-4111-8111-111111111111', { findById })).toBeNull();
  });

  it('un fallo del repositorio se propaga (la página lo muestra con el error seguro)', async () => {
    await expect(getAdminOrderDetail(admin, ID, { findById: async () => Promise.reject(new Error('base caída')) })).rejects.toThrow('base caída');
  });
});
