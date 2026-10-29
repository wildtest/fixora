import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { PublicOrderView } from '@/domain/repair/public-order-view';
import { LookupAlert } from './lookup-alert';
import { TrackingResult } from './tracking-result';

const VIEW: PublicOrderView = {
  trackingCode: '23456789BDFG',
  status: 'EQUIPO_RECIBIDO',
  device: { type: 'CELULAR', brand: 'Samsung', model: null },
  problemDescription: 'No enciende <b>nada</b>\nsegunda línea',
  statusTimeline: [
    { status: 'EQUIPO_RECIBIDO', occurredAt: '2026-10-21T15:00:00.000Z' },
    { status: 'SOLICITUD_RECIBIDA', occurredAt: '2026-10-20T15:05:00.000Z' },
  ],
  repairDetails: null,
};

describe('TrackingResult (PUB-05) [SC-02] [SC-11]', () => {
  const html = renderToStaticMarkup(<TrackingResult order={VIEW} />);

  it('muestra código, estado, equipo, descripción, recorrido e historial más reciente primero con hora de Perú', () => {
    expect(html).toContain('23456789BDFG');
    expect(html).toContain('>Equipo recibido<');
    expect(html).toContain('Celular');
    expect(html).toContain('Samsung');
    expect(html).toContain('Etapa 2 de 7 · Equipo recibido');
    const history = html.slice(html.indexOf('Historial de estados'));
    expect(history.indexOf('21/10/2026 10:00')).toBeGreaterThan(-1);
    expect(history.indexOf('21/10/2026 10:00')).toBeLessThan(history.indexOf('20/10/2026 10:05'));
  });

  it('el modelo ausente no rompe la sección', () => {
    expect(html).not.toContain('>Modelo<');
  });

  it('el texto del cliente se escapa y se muestra literal', () => {
    expect(html).toContain('No enciende &lt;b&gt;nada&lt;/b&gt;');
    expect(html).not.toContain('<b>nada</b>');
  });

  it('sin diagnóstico, costo ni notas muestra el vacío informativo (E6), sin consultar nada', () => {
    expect(html).toContain('Todavía no hay información adicional disponible');
  });

  it('solo pinta la lista positiva: propiedades extra de un objeto hostil no llegan al HTML', () => {
    const hostile = {
      ...VIEW,
      customerName: 'CANARY-NAME',
      customerPhone: 'CANARY-PHONE',
      customerEmail: 'canary@example.com',
      diagnosis: 'CANARY-DIAGNOSIS',
      estimatedCost: '999.00',
      internalNotes: ['CANARY-NOTE'],
      id: '11111111-1111-4111-8111-111111111111',
      version: 7,
    } as unknown as PublicOrderView;
    const output = renderToStaticMarkup(<TrackingResult order={hostile} />);
    for (const leak of ['CANARY', '999.00', '1111', 'version']) expect(output).not.toContain(leak);
  });

  it('con diagnóstico y costo públicos (CHG-11): tarjeta propia con el costo destacado a dos decimales y el diagnóstico como texto', () => {
    const published = renderToStaticMarkup(
      <TrackingResult
        order={{ ...VIEW, status: 'ESPERANDO_APROBACION', repairDetails: { diagnosis: 'Cambio de <i>pantalla</i>\nOtra línea', estimatedCost: '180.00' } }}
      />,
    );
    expect(published).toContain('data-testid="repair-details"');
    expect(published).toContain('S/ 180.00');
    expect(published).toContain('Cambio de &lt;i&gt;pantalla&lt;/i&gt;');
    expect(published).not.toContain('<i>pantalla</i>');
    expect(published).not.toContain('Todavía no hay información adicional disponible'); // ya hay información publicada
    // Sin historial de cambios, versión ni indicador de publicación.
    expect(published).not.toMatch(/version|published|publicad[oa]|anterior/i);
  });

  it('con repairDetails = null no hay tarjeta de diagnóstico y costo, aunque la vista traiga otras propiedades', () => {
    expect(html).not.toContain('data-testid="repair-details"');
    expect(html).not.toContain('S/ ');
  });

  it('no ofrece acciones que modifiquen datos', () => {
    expect(html).not.toMatch(/<form|<input|<textarea|<button/);
  });
});

describe('LookupAlert (DESIGN.md §13.2 y A.5)', () => {
  it('RATE_LIMITED, SERVICE_UNAVAILABLE y no encontrado son avisos distintos', () => {
    const notFound = renderToStaticMarkup(<LookupAlert code="TRACKING_NOT_FOUND" />);
    const limited = renderToStaticMarkup(<LookupAlert code="RATE_LIMITED" />);
    const unavailable = renderToStaticMarkup(<LookupAlert code="SERVICE_UNAVAILABLE" onRetry={() => {}} />);
    expect(notFound).toContain('No encontramos una reparación con ese código.');
    expect(notFound).toContain('Verifica el código e inténtalo nuevamente.');
    expect(limited).toContain('Demasiados intentos');
    expect(limited).not.toContain('Reintentar');
    expect(unavailable).toContain('Servicio no disponible temporalmente');
    expect(unavailable).toContain('Reintentar');
    expect(unavailable).not.toContain('Demasiados intentos');
    // No filtran nombres técnicos ni insinúan que el código era casi correcto.
    for (const html of [notFound, limited, unavailable]) {
      expect(html).not.toMatch(/RATE_LIMITED|SERVICE_UNAVAILABLE|TRACKING_NOT_FOUND|casi/);
    }
  });
});
