import { describe, expect, it, vi } from 'vitest';
import type { AdminOrderDetailDTO } from '../../domain/admin/order-detail';
import { issueAdminContext } from './admin-context';
import { getAdminOrderDetail } from './order-detail';

const admin = issueAdminContext('admin-1');
const ID = '0f8fad5b-d9cb-469f-a165-70867728950e';
const dto = { id: ID } as AdminOrderDetailDTO;

describe('getAdminOrderDetail', () => {
  it('un identificador mal formado se resuelve como no encontrada SIN consultar la base de datos', async () => {
    const findById = vi.fn(async () => dto);
    for (const raw of ['', 'basura', '23456789BDFG', undefined, 7]) {
      expect(await getAdminOrderDetail(admin, raw, { findById }), String(raw)).toBeNull();
    }
    expect(findById).not.toHaveBeenCalled();
  });

  it('un UUID válido se consulta normalizado y devuelve la orden o null (indistinguible de lo mal formado)', async () => {
    const findById = vi.fn(async (id: string) => (id === ID ? dto : null));
    expect(await getAdminOrderDetail(admin, ID.toUpperCase(), { findById })).toBe(dto);
    expect(findById).toHaveBeenCalledWith(ID);
    expect(await getAdminOrderDetail(admin, '11111111-1111-4111-8111-111111111111', { findById })).toBeNull();
  });

  it('un fallo del repositorio se propaga (la página lo muestra con el error seguro)', async () => {
    await expect(getAdminOrderDetail(admin, ID, { findById: async () => Promise.reject(new Error('base caída')) })).rejects.toThrow('base caída');
  });
});
