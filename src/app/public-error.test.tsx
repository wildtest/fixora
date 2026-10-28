import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import GlobalError from './global-error';
import PublicError from './(public)/error';

// `next/font/google` y el CSS solo existen en el compilador de Next: aquí se sustituyen.
vi.mock('./fonts', () => ({ geistSans: { variable: 'font-geist-sans' }, geistMono: { variable: 'font-geist-mono' } }));
vi.mock('./globals.css', () => ({}));

// Presentación del error inesperado (CHG-04, D-9): seguro, sin detalles técnicos y con recuperación.
const hostile = Object.assign(new Error('CANARY-MESSAGE select * from repair_orders'), {
  name: 'PrismaClientKnownRequestError',
  digest: 'CANARY-DIGEST-123',
  stack: 'at secret/path/file.ts:10',
});

function findButton(node: ReactNode): ReactElement<{ onClick?: () => void }> | undefined {
  if (!isValidElement(node)) return undefined;
  const element = node as ReactElement<{ onClick?: () => void; children?: ReactNode; action?: ReactNode }>;
  if (element.type === 'button') return element;
  for (const key of ['action', 'children'] as const) {
    const child = element.props[key];
    for (const item of Array.isArray(child) ? child : [child]) {
      const found = findButton(item as ReactNode);
      if (found) return found;
    }
  }
  return undefined;
}

describe.each([
  ['error del grupo público', () => PublicError({ error: hostile, retry: () => {} })],
  ['global-error autocontenido', () => GlobalError({ error: hostile, retry: () => {} })],
] as const)('%s', (_name, render) => {
  const html = renderToStaticMarkup(render());

  it('informa del problema y ofrece «Reintentar», con el rol de alerta', () => {
    expect(html).toContain('Ocurrió un problema inesperado.');
    expect(html).toContain('Inténtalo nuevamente.');
    expect(html).toContain('Reintentar');
    expect(html).toContain('role="alert"');
  });

  it('no revela mensaje, nombre de excepción, pila, digest ni SQL', () => {
    for (const secret of ['CANARY', 'PrismaClient', 'secret/path', 'select *', 'repair_orders', 'digest']) {
      expect(html, secret).not.toContain(secret);
    }
  });

  it('no usa estilos en línea (CSP style-src self)', () => {
    expect(html).not.toMatch(/\sstyle=|<style/);
  });

  it('muestra la «Referencia» solo cuando existe una propia de FIXORA: hoy no se muestra', () => {
    expect(html).not.toContain('Referencia');
  });
});

describe('«Reintentar» invoca retry del límite de error', () => {
  it.each([
    ['error del grupo público', (retry: () => void) => PublicError({ error: hostile, retry })],
    ['global-error', (retry: () => void) => GlobalError({ error: hostile, retry })],
  ])('%s', (_name, build) => {
    const retry = vi.fn();
    const button = findButton(build(retry));
    expect(button).toBeDefined();
    button?.props.onClick?.();
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
