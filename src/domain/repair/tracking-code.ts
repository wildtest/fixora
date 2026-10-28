// Código de seguimiento (TD §12): 12 caracteres, alfabeto de 23 símbolos sin vocales ni `0 O 1 I L Q Y`,
// en mayúsculas, sin prefijo ni separadores. El dominio define alfabeto, longitud y generación; la fuente de
// aleatoriedad criptográfica la aporta `infrastructure` (sustituible en pruebas).

export const TRACKING_CODE_ALPHABET = '23456789BDFGHJKMNPRSTWX';
export const TRACKING_CODE_LENGTH = 12;

const PATTERN = new RegExp(`^[${TRACKING_CODE_ALPHABET}]{${TRACKING_CODE_LENGTH}}$`);

/** Fuente de bytes aleatorios criptográficamente seguros. */
export type RandomBytes = (length: number) => Uint8Array;

// Selección uniforme sin sesgo por rechazo: 256 = 11 × 23 + 3, así que los bytes ≥ 253 se descartan.
const ACCEPT_BELOW = Math.floor(256 / TRACKING_CODE_ALPHABET.length) * TRACKING_CODE_ALPHABET.length;

export function generateTrackingCode(randomBytes: RandomBytes): string {
  let code = '';
  while (code.length < TRACKING_CODE_LENGTH) {
    for (const byte of randomBytes(TRACKING_CODE_LENGTH * 2)) {
      if (byte >= ACCEPT_BELOW) continue;
      code += TRACKING_CODE_ALPHABET[byte % TRACKING_CODE_ALPHABET.length];
      if (code.length === TRACKING_CODE_LENGTH) break;
    }
  }
  return code;
}

export function isTrackingCode(value: unknown): value is string {
  return typeof value === 'string' && PATTERN.test(value);
}
