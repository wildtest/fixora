import { describe, expect, it } from 'vitest';
import { DETAIL_KEYS, journeyTimeline, parseOrderId } from './order-detail';

describe('identificador de la ruta del detalle', () => {
  it('acepta un UUID y lo normaliza a minúsculas', () => {
    expect(parseOrderId('0F8FAD5B-D9CB-469F-A165-70867728950E')).toBe('0f8fad5b-d9cb-469f-a165-70867728950e');
    expect(parseOrderId('0f8fad5b-d9cb-469f-a165-70867728950e')).toBe('0f8fad5b-d9cb-469f-a165-70867728950e');
  });

  it('rechaza lo que no es un UUID, incluido el código de seguimiento, sin llegar a la base de datos', () => {
    for (const value of ['', 'abc', '23456789BDFG', '0f8fad5b-d9cb-469f-a165-70867728950', '0f8fad5b-d9cb-469f-a165-70867728950ez', "x'; DROP TABLE repair_orders;--", '../../etc/passwd', ' 0f8fad5b-d9cb-469f-a165-70867728950e', undefined, null, 42, ['0f8fad5b-d9cb-469f-a165-70867728950e']]) {
      expect(parseOrderId(value), String(value)).toBeNull();
    }
  });
});

describe('contrato del DTO y del recorrido', () => {
  it('lista positiva: ni diagnóstico, ni costo, ni notas, ni versión, ni capacidades', () => {
    expect([...DETAIL_KEYS]).toEqual(['createdAt', 'customer', 'device', 'id', 'problemDescription', 'status', 'statusHistory', 'trackingCode']);
    for (const forbidden of ['diagnosis', 'estimatedCost', 'notes', 'version', 'capabilities', 'updatedAt']) {
      expect([...DETAIL_KEYS]).not.toContain(forbidden);
    }
  });

  it('el recorrido solo toma el estado alcanzado y su fecha de cada evento', () => {
    expect(
      journeyTimeline([
        { fromStatus: 'SOLICITUD_RECIBIDA', toStatus: 'EQUIPO_RECIBIDO', occurredAt: '2026-10-28T11:00:00.000Z' },
        { fromStatus: null, toStatus: 'SOLICITUD_RECIBIDA', occurredAt: '2026-10-28T10:00:00.000Z' },
      ]),
    ).toEqual([
      { status: 'EQUIPO_RECIBIDO', occurredAt: '2026-10-28T11:00:00.000Z' },
      { status: 'SOLICITUD_RECIBIDA', occurredAt: '2026-10-28T10:00:00.000Z' },
    ]);
  });
});
