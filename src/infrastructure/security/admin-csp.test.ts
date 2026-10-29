import { describe, expect, it } from 'vitest';
import { adminCsp, newNonce } from './admin-csp';

describe('CSP administrativa', () => {
  it('es estricta: nonce + strict-dynamic, sin unsafe-inline ni unsafe-eval en script-src y sin terceros', () => {
    const csp = adminCsp('NONCE123', false);
    const scriptSrc = /script-src ([^;]+)/.exec(csp)?.[1] ?? '';
    expect(scriptSrc).toBe("'self' 'nonce-NONCE123' 'strict-dynamic'");
    expect(csp).toContain("style-src 'self' 'nonce-NONCE123'");
    expect(csp).not.toContain('unsafe-inline');
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).not.toMatch(/https?:|\*/);
    for (const directive of ["default-src 'self'", "object-src 'none'", "base-uri 'none'", "form-action 'self'", "frame-ancestors 'none'", "connect-src 'self'"]) {
      expect(csp).toContain(directive);
    }
  });

  it('solo en desarrollo añade unsafe-eval y WebSockets', () => {
    const csp = adminCsp('N', true);
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain('ws: wss:');
    expect(adminCsp('N', false)).not.toContain('ws:');
  });

  it('el nonce es distinto en cada petición', () => {
    const nonces = new Set(Array.from({ length: 50 }, () => newNonce()));
    expect(nonces.size).toBe(50);
    for (const nonce of nonces) expect(nonce).toMatch(/^[A-Za-z0-9+/=]{20,}$/);
  });
});
