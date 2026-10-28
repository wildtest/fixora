import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EntryPoint } from './entry-point';
import { ENTRY_POINTS, UNAVAILABLE_LABEL } from './entry-points';
import { LoadingPlaceholder } from './loading-placeholder';

// Puntos de entrada públicos (CHG-04, D-2, P-1/P-2): destinos aprobados y los dos estados del componente.
describe('destinos aprobados de los puntos de entrada (TD §6)', () => {
  it('apuntan exactamente a las rutas canónicas, sin alias', () => {
    expect(ENTRY_POINTS.register.href).toBe('/registrar');
    expect(ENTRY_POINTS.consult.href).toBe('/consultar');
    expect(ENTRY_POINTS.workshop.href).toBe('/admin/acceso');
  });

  it('cada change activa solo su acceso: registro (CHG-05) y consulta (CHG-06) activos; el taller (CHG-08) sigue sin destino', () => {
    expect(ENTRY_POINTS.register.available).toBe(true);
    expect(ENTRY_POINTS.consult.available).toBe(true);
    expect(ENTRY_POINTS.workshop.available).toBe(false);
  });
});

describe('EntryPoint', () => {
  it('disponible: es un enlace a la ruta aprobada', () => {
    const html = renderToStaticMarkup(
      <EntryPoint entry={{ ...ENTRY_POINTS.register, available: true }} variant="primary" />,
    );
    expect(html).toContain('<a ');
    expect(html).toContain('href="/registrar"');
    expect(html).toContain('Registrar reparación');
    expect(html).not.toContain('disabled');
    expect(html).not.toContain(UNAVAILABLE_LABEL);
  });

  it('no disponible: botón deshabilitado sin href, con el motivo visible y asociado', () => {
    for (const entry of [ENTRY_POINTS.workshop]) {
      const html = renderToStaticMarkup(<EntryPoint entry={entry} variant="nav" />);
      expect(html, entry.label).toContain('<button');
      expect(html, entry.label).toContain('disabled=""');
      expect(html, entry.label).toContain('type="button"');
      expect(html, entry.label).not.toContain('href=');
      expect(html, entry.label).toContain(UNAVAILABLE_LABEL);
      expect(html, entry.label).toMatch(/aria-describedby="[^"]+"/);
    }
  });
});

describe('LoadingPlaceholder (A.2): sin spinner, con texto accesible', () => {
  it('anuncia «Cargando…» solo a tecnologías de apoyo y no usa animación giratoria', () => {
    const html = renderToStaticMarkup(<LoadingPlaceholder />);
    expect(html).toContain('role="status"');
    expect(html).toContain('<span class="sr-only">Cargando…</span>');
    expect(html).toContain('bg-surface-secondary');
    expect(html).not.toMatch(/<svg|animate-spin|spinner/i);
  });

  it('acepta la altura del bloque que reemplaza', () => {
    expect(renderToStaticMarkup(<LoadingPlaceholder className="h-40" />)).toContain('h-40');
  });
});
