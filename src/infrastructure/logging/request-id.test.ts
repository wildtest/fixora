import { describe, expect, it } from 'vitest';
import { requestIdFrom } from './request-id';

const generated = () => 'generated-id';

describe('requestIdFrom', () => {
  it('lee x-vercel-id de Headers', () => {
    expect(requestIdFrom(new Headers({ 'x-vercel-id': 'iad1::abc-123' }), generated)).toBe('iad1::abc-123');
  });

  it('lee x-vercel-id de un registro simple, sin distinguir mayúsculas', () => {
    expect(requestIdFrom({ 'X-Vercel-Id': 'cdg1::xyz' }, generated)).toBe('cdg1::xyz');
    expect(requestIdFrom({ 'x-vercel-id': ['fra1::first', 'fra1::second'] }, generated)).toBe('fra1::first');
  });

  it('genera un identificador si falta', () => {
    expect(requestIdFrom(undefined, generated)).toBe('generated-id');
    expect(requestIdFrom({}, generated)).toBe('generated-id');
  });

  it('nunca toma cabeceras de correlación enviadas por el cliente', () => {
    const headers = { 'x-request-id': 'client-id', 'x-correlation-id': 'client-id', traceparent: 'client-id' };
    expect(requestIdFrom(headers, generated)).toBe('generated-id');
    expect(requestIdFrom(new Headers(headers), generated)).toBe('generated-id');
  });

  it('descarta un x-vercel-id con formato inválido', () => {
    expect(requestIdFrom({ 'x-vercel-id': 'bad id\nwith newline' }, generated)).toBe('generated-id');
  });

  it('genera un UUID por defecto', () => {
    expect(requestIdFrom(undefined)).toMatch(/^[0-9a-f-]{36}$/);
  });
});
