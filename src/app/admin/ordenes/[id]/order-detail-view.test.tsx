import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { AdminOrderDetailDTO } from '@/domain/admin/order-detail';
import { OrderDetailView } from './order-detail-view';

// Solo se prueba la PRESENTACIÓN: el router y la Server Action no existen fuera de Next.
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => undefined }) }));
vi.mock('./actions', () => ({
  transitionOrderStatus: async () => ({ ok: false, code: 'INTERNAL_ERROR' }),
  saveDiagnosis: async () => ({ ok: false, code: 'INTERNAL_ERROR' }),
  saveEstimatedCost: async () => ({ ok: false, code: 'INTERNAL_ERROR' }),
}));

// Presentación del detalle administrativo (CHG-09b): solo lectura, separación Público/Interno y ausencias.
const base: AdminOrderDetailDTO = {
  id: '0f8fad5b-d9cb-469f-a165-70867728950e',
  trackingCode: '23456789BDFG',
  status: 'EQUIPO_RECIBIDO',
  createdAt: '2026-10-28T15:05:00.000Z',
  customer: { name: 'Ana Quispe', phone: '+51 999 111 222', email: 'ana@example.com' },
  device: { type: 'LAPTOP', brand: 'Lenovo', model: 'T14' },
  problemDescription: 'No enciende',
  version: 2,
  allowedTransitions: [],
  diagnosis: null,
  estimatedCost: null,
  canEditDiagnosisAndCost: false,
  neverPublished: false,
  history: [
    { type: 'STATUS', fromStatus: 'SOLICITUD_RECIBIDA', toStatus: 'EQUIPO_RECIBIDO', occurredAt: '2026-10-29T15:00:00.000Z' },
    { type: 'STATUS', fromStatus: null, toStatus: 'SOLICITUD_RECIBIDA', occurredAt: '2026-10-28T15:05:00.000Z' },
  ],
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
    const out = html({ ...base, status: 'SOLICITUD_RECIBIDA', statusHistory: [base.statusHistory[1]!], history: [base.history[1]!] });
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

  it('orden final sin valores: solo lectura, sin botones ni campos, y sin marcadores de notas ni de funciones futuras', () => {
    const out = html({ ...base, status: 'ENTREGADO' });
    expect(out).not.toMatch(/<button|<form|<input|<textarea|<select|disabled/);
    expect(out).not.toMatch(/Notas|Nota |próximamente|Avanzar|Cancelar orden|Editar|Guardar/);
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
      neverPublished: true,
      statusHistory: [
        { fromStatus: 'EQUIPO_RECIBIDO', toStatus: 'CANCELADO', occurredAt: '2026-10-30T15:00:00.000Z' },
        ...base.statusHistory,
      ],
    });
    expect(out).toContain('Cancelado desde «Equipo recibido»');
  });
});

describe('acciones de ciclo de vida (CHG-10)', () => {
  const withTransitions = (status: AdminOrderDetailDTO['status'], allowedTransitions: AdminOrderDetailDTO['allowedTransitions']) =>
    html({ ...base, status, allowedTransitions });

  it('avance y cancelación coexisten, fuera del Journey, sin selector libre ni etapas clicables', () => {
    const out = withTransitions('SOLICITUD_RECIBIDA', [
      { targetStatus: 'EQUIPO_RECIBIDO', requiresConfirmation: false },
      { targetStatus: 'CANCELADO', requiresConfirmation: true },
    ]);
    expect(out).toContain('Avanzar a Equipo recibido');
    expect(out).toContain('Cancelar orden');
    expect(out).not.toMatch(/<select|<input|<textarea|contenteditable/);
    const journey = out.slice(out.indexOf('data-testid="repair-journey"'), out.indexOf('data-testid="lifecycle-actions"'));
    expect(journey).not.toMatch(/<button|<a /);
    expect(out.indexOf('data-testid="lifecycle-actions"')).toBeGreaterThan(out.indexOf('data-testid="repair-journey"'));
  });

  it('el avance a Esperando aprobación sin diagnóstico y costo está bloqueado con su motivo y la cancelación sigue disponible', () => {
    const out = withTransitions('EN_DIAGNOSTICO', [
      { targetStatus: 'ESPERANDO_APROBACION', requiresConfirmation: true, blockedReason: 'DIAGNOSIS_AND_COST_REQUIRED' },
      { targetStatus: 'CANCELADO', requiresConfirmation: true },
    ]);
    expect(out).toMatch(/<button[^>]*disabled=""[^>]*>Avanzar a Esperando aprobación/);
    expect(out).toContain('Faltan datos de la reparación');
    expect(out).toMatch(/<button(?![^>]*disabled="")[^>]*>Cancelar orden/);
    expect(out).not.toContain('confirm-dialog'); // el diálogo no es alcanzable: nunca se abre vacío
    expect(out).not.toMatch(/S\/ 0|null|undefined/);
  });

  it('en estados finales no hay ninguna acción de avance ni de cancelación', () => {
    for (const status of ['ENTREGADO', 'CANCELADO'] as const) {
      const out = withTransitions(status, []);
      expect(out, status).not.toContain('lifecycle-actions');
      expect(out, status).not.toMatch(/Avanzar a|Cancelar orden/);
    }
  });

  it('solo en En reparación o Listo para recojo no se ofrece cancelar', () => {
    const out = withTransitions('EN_REPARACION', [{ targetStatus: 'LISTO_PARA_RECOJO', requiresConfirmation: false }]);
    expect(out).toContain('Avanzar a Listo para recojo');
    expect(out).not.toContain('Cancelar orden');
  });
});

describe('diagnóstico y costo en el detalle (CHG-11)', () => {
  const editable = { ...base, status: 'EN_DIAGNOSTICO' as const, canEditDiagnosisAndCost: true };

  it('editable: un campo y un guardado independientes por dato, con el rótulo «Aún no visible para el cliente»', () => {
    const out = html(editable);
    expect(out).toContain('Guardar diagnóstico');
    expect(out).toContain('Guardar costo');
    expect(out.match(/Aún no visible para el cliente/g)).toHaveLength(2);
    expect(out.match(/<textarea/g)).toHaveLength(1);
    expect(out).toMatch(/aria-label="Diagnóstico"/);
    expect(out).toMatch(/aria-label="Costo estimado"/);
    expect(out).not.toMatch(/S\/ 0|0\.00|null|undefined/); // la ausencia no se presenta como cero ni como valor técnico
  });

  it('editable con valores: los muestra tal cual (costo con dos decimales) y el diagnóstico como texto', () => {
    const out = html({ ...editable, diagnosis: '<b>Placa</b> dañada', estimatedCost: '180.00' });
    expect(out).toContain('value="180.00"');
    expect(out).toContain('&lt;b&gt;Placa&lt;/b&gt; dañada');
    expect(out).not.toContain('<b>Placa</b>');
  });

  it('congelado (Esperando aprobación, En reparación, Listo para recojo): solo lectura con «Congelado» y sin guardar', () => {
    for (const status of ['ESPERANDO_APROBACION', 'EN_REPARACION', 'LISTO_PARA_RECOJO'] as const) {
      const out = html({ ...base, status, diagnosis: 'Cambio de pantalla', estimatedCost: '180.50' });
      expect(out, status).toContain('Congelado');
      expect(out, status).toContain('Cambio de pantalla');
      expect(out, status).toContain('S/ 180.50');
      expect(out, status).not.toMatch(/<textarea|<input|Guardar|Aún no visible/);
      expect(out, status).toMatch(/border-dashed/);
    }
  });

  it('estados finales: «Solo lectura»; Cancelado sin haber alcanzado la aprobación añade «Nunca se publicó al cliente»', () => {
    const delivered = html({ ...base, status: 'ENTREGADO', diagnosis: 'Ok', estimatedCost: '10.00' });
    expect(delivered).toContain('Solo lectura');
    expect(delivered).not.toContain('Nunca se publicó al cliente');
    const neverPublished = html({ ...base, status: 'CANCELADO', diagnosis: 'Interno', estimatedCost: '10.00', neverPublished: true });
    expect(neverPublished).toContain('Solo lectura');
    expect(neverPublished).toContain('Nunca se publicó al cliente');
    const afterApproval = html({ ...base, status: 'CANCELADO', diagnosis: 'Publicado', estimatedCost: '10.00', neverPublished: false });
    expect(afterApproval).not.toContain('Nunca se publicó al cliente');
  });

  it('el historial combina estado, diagnóstico y costo con sus valores exactos y sin autor', () => {
    const out = html({
      ...base,
      history: [
        { type: 'COST', previous: '150.00', next: '180.00', occurredAt: '2026-10-29T16:00:00.000Z' },
        { type: 'DIAGNOSIS', previous: 'Falla leve', next: 'Placa dañada', occurredAt: '2026-10-29T15:30:00.000Z' },
        { type: 'COST', previous: null, next: '150.00', occurredAt: '2026-10-29T15:10:00.000Z' },
        { type: 'DIAGNOSIS', previous: null, next: 'Falla leve', occurredAt: '2026-10-29T15:05:00.000Z' },
        { type: 'DIAGNOSIS', previous: 'Placa dañada', next: null, occurredAt: '2026-10-29T15:40:00.000Z' },
        ...base.history,
      ],
    });
    expect(out).toContain('S/ 150.00 → <strong>S/ 180.00</strong>');
    expect(out).toContain('Falla leve → <strong>Placa dañada</strong>');
    expect(out).toContain('<strong>S/ 150.00</strong>'); // primer registro: solo el valor
    expect(out).toContain('<strong>Falla leve</strong>');
    expect(out).toContain('Placa dañada → <strong>sin diagnóstico</strong>');
    expect(out).toMatch(/data-type="COST"/);
    expect(out).toMatch(/data-type="DIAGNOSIS"/);
    expect(out).not.toMatch(/autor|usuario|admin@|IP /i);
  });
});
