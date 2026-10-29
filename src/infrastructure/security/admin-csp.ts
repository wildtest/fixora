// CSP estricta de la zona administrativa (CHG-08, D11; TD §21.3; AV-1). Un nonce por petición, sin `unsafe-inline`
// ni `unsafe-eval` en `script-src` (salvo `unsafe-eval` en desarrollo, que React usa para depurar) y sin orígenes
// de terceros. Pura y sin dependencias de Next: la usa `proxy.ts` y la prueban las pruebas unitarias.

/** Nonce impredecible y único por petición (CSPRNG), en base64. */
export function newNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString('base64');
}

export function adminCsp(nonce: string, development: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self'${development ? ' ws: wss:' : ''}`,
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
  ].join('; ');
}
