import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { AdminOrderDetailDTO } from '@/domain/admin/order-detail';
import { OrderDetailView } from './order-detail-view';

// Presentación del detalle administrativo (CHG-09b): solo lectura, separación Público/Interno y ausencias.
const base: AdminOrderDetailDTO = {
  id: '0f8fad5b-d9cb-469f-a165-70867728950e',
  trackingCode: '23456789BDFG',
  status: 'EQUIPO_RECIBIDO',
  createdAt: '2026-10-28T15:05:00.000Z',
  customer: { name: 'Ana Quispe', phone: '+51 999 111 222', email: 'ana@example.com' },
  device: { type: 'LAPTOP', brand: 'Lenovo', model: 'T14' },
  problemDescription: 'No enciende',
  statusHistory: [
    { fromStatus: 'SOLICITUD_RECIBIDA', toStatus: 'EQUIPO_RECIBIDO', occurredAt: '2026-10-29T15:00:00.000Z' },
    { fromStatus: null, toStatus: 'SOLICITUD_RECIBIDA', occurredAt: '2026-10-28T15:05:00.000Z' },
  ],
};
const html = (order: AdminOrderDetailDTO = base) => renderToStaticMarkup(<OrderDetailView order={order} />);

describe('detalle administrativo', () => {
  it('muestra identificación, contacto, equipo, problema, estado y recorrido', () => {
    const out = html();
    for (const text of ['23456789BDFG', 'Registrada el 28/10/2026 10:05', 'Ana Quispe', '+51 999 111 222', 'ana@example.com', 'Laptop', 'Lenovo', 'T14', 'No enciende', 'Equipo recibido', 'Recorrido de la reparación']) {
      expect(out, text).toContain(text);
    }
    expect(out).toContain('data-testid="repair-journey"');
  });

  it('separa Público e Interno con etiqueta, encabezado, borde discontinuo y orden (Público primero)', () => {
    const out = html();
    expect(out).toContain('Público — Visible al cliente');
    expect(out).toContain('Lo que el cliente puede ver con su código');
    expect(out).toContain('Interno — Solo taller');
    expect(out).toContain('Nunca se muestra al cliente');
    expect(out.indexOf('block-public')).toBeLessThan(out.indexOf('block-internal'));
    expect(out).toMatch(/block-internal[^>]*border-dashed/);
    expect(out).not.toMatch(/block-public[^>]*border-dashed/);
    // El contacto vive solo en el bloque Interno.
    const publicBlock = out.slice(out.indexOf('block-public'), out.indexOf('block-internal'));
    for (const secret of ['Ana Quispe', '+51 999', 'ana@example.com']) expect(publicBlock, secret).not.toContain(secret);
  });

  it('correo y modelo ausentes se presentan con un texto comprensible, nunca null/undefined ni valores ficticios', () => {
    const out = html({ ...base, customer: { ...base.customer, email: null }, device: { ...base.device, model: null } });
    expect(out.match(/No informado/g)).toHaveLength(2);
    expect(out).not.toMatch(/null|undefined/);
  });

  it('el registro inicial se muestra como «Solicitud recibida» con su fecha, sin estado anterior ni eventos inventados', () => {
    const out = html({ ...base, status: 'SOLICITUD_RECIBIDA', statusHistory: [base.statusHistory[1]!] });
    expect(out.match(/data-testid="history-event"/g)).toHaveLength(1);
    expect(out).toContain('<strong>Solicitud recibida</strong>');
    expect(out).not.toContain('→');
    expect(out).not.toMatch(/null/);
  });

  it('el historial va del más reciente al más antiguo con «{anterior} → {nuevo}»', () => {
    const out = html();
    expect(out.indexOf('Solicitud recibida → <strong>Equipo recibido</strong>')).toBeGreaterThan(-1);
    expect(out.indexOf('29/10/2026 10:00')).toBeLessThan(out.indexOf('28/10/2026 10:05', out.indexOf('history-event')));
  });

  it('solo lectura: sin botones, formularios, campos ni controles deshabilitados, y sin marcadores de funciones futuras', () => {
    const out = html();
    expect(out).not.toMatch(/<button|<form|<input|<textarea|<select|disabled/);
    expect(out).not.toMatch(/Diagnóstico|Costo|Notas|Nota |próximamente|Avanzar|Cancelar orden|Editar/); // «En diagnóstico» es una etapa del recorrido, no una sección
    expect(out).not.toContain(base.id); // el UUID interno no se presenta como dato de negocio
  });

  it('el contenido del cliente se escapa (nunca HTML crudo) y el texto largo se ajusta', () => {
    const out = html({ ...base, customer: { ...base.customer, name: '<script>alert(1)</script>' }, problemDescription: 'x'.repeat(500) });
    expect(out).not.toContain('<script>alert(1)</script>');
    expect(out).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(out).toContain('break-words');
  });

  it('una orden cancelada muestra el recorrido con la etapa interrumpida', () => {
    const out = html({
      ...base,
      status: 'CANCELADO',
      statusHistory: [
        { fromStatus: 'EQUIPO_RECIBIDO', toStatus: 'CANCELADO', occurredAt: '2026-10-30T15:00:00.000Z' },
        ...base.statusHistory,
      ],
    });
    expect(out).toContain('Cancelado desde «Equipo recibido»');
  });
});
