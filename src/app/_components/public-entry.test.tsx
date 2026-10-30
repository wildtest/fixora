import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EntryPoint } from './entry-point';
import { ENTRY_POINTS, UNAVAILABLE_LABEL } from './entry-points';
import { LandingClarityBand, LandingEntryCards, LandingFooter, LandingHero, LandingHowItWorks, LandingPrivacy } from './landing-sections';
import { LoadingPlaceholder } from './loading-placeholder';

// Puntos de entrada públicos (CHG-04, D-2, P-1/P-2): destinos aprobados y los dos estados del componente.
describe('destinos aprobados de los puntos de entrada (TD §6)', () => {
  it('apuntan exactamente a las rutas canónicas, sin alias', () => {
    expect(ENTRY_POINTS.register.href).toBe('/registrar');
    expect(ENTRY_POINTS.consult.href).toBe('/consultar');
    expect(ENTRY_POINTS.workshop.href).toBe('/admin/acceso');
  });

  it('los tres accesos están activos: registro (CHG-05), consulta (CHG-06) y taller (CHG-08)', () => {
    expect(ENTRY_POINTS.register.available).toBe(true);
    expect(ENTRY_POINTS.consult.available).toBe(true);
    expect(ENTRY_POINTS.workshop.available).toBe(true);
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
    for (const entry of [{ ...ENTRY_POINTS.workshop, available: false }]) {
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

// PUB-01 narrativa (landing-visual-fidelity): lo ilustrativo está rotulado y no hay campo de consulta.
describe('narrativa de la landing', () => {
  const html = renderToStaticMarkup(
    <>
      <LandingHero />
      <LandingEntryCards />
      <LandingClarityBand />
      <LandingHowItWorks />
      <LandingPrivacy />
      <LandingFooter />
    </>,
  );

  it('contiene las secciones aprobadas y un único h1', () => {
    expect(html.match(/<h1/g)).toHaveLength(1);
    for (const text of [
      'Sistema de seguimiento abierto',
      'siempre bajo control.',
      'Registrar reparación',
      'Consultar reparación',
      'Claridad técnica en tiempo real sin fricción',
      '¿Cómo funciona el proceso?',
      'Registra tu equipo',
      'Recibe tu código',
      'Consulta el avance',
      'Privacidad y control absoluto',
      'Sin cuentas ni contraseñas',
      'Trazabilidad de estado',
      'Protección de datos personales',
      'FIXORA © 2026',
    ]) {
      expect(html, text).toContain(text);
    }
  });

  it('los accesos reales apuntan a las rutas aprobadas y no hay campo de consulta', () => {
    expect(html).toContain('href="/registrar"');
    expect(html).toContain('href="/consultar"');
    expect(html).not.toMatch(/<(input|textarea|select|form)/);
  });

  it('lo ilustrativo está rotulado y no usa códigos verosímiles', () => {
    expect(html).toContain('Ejemplo ilustrativo');
    expect(html).toContain('Ilustración');
    expect(html).not.toMatch(/FX-2026|EJ-8921|EJ-0000|TOKEN ACTIVO/);
  });
});
