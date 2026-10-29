import 'server-only';
import { getConfig } from '../../infrastructure/config/env';

// Cookie de sesión administrativa (CHG-08, D8). Es una COOKIE DE SESIÓN: el login normal no establece `Max-Age` ni
// `Expires` y no hay renovación deslizante de la cookie; la vigencia real la decide la fila de PostgreSQL. Cerrar el
// navegador no es una frontera de seguridad. Nunca se lee desde JavaScript (`HttpOnly`) ni se envía entre sitios.

export type SessionCookieSettings = {
  readonly name: string;
  readonly options: {
    readonly httpOnly: true;
    readonly secure: boolean;
    readonly sameSite: 'strict';
    readonly path: '/';
  };
};

/** Producción (y `next start`): prefijo `__Host-`, `Secure`, `Path=/`, sin `Domain`. */
export const HOST_COOKIE_NAME = '__Host-fixora_session';
/** Solo desarrollo local (`next dev` sobre HTTP): nombre sin prefijo ni `Secure`, que `localhost` exige no usar. */
export const DEV_COOKIE_NAME = 'fixora_session';

export function cookieSettingsFor(nodeEnv: 'development' | 'production' | 'test'): SessionCookieSettings {
  const hardened = nodeEnv !== 'development';
  return {
    name: hardened ? HOST_COOKIE_NAME : DEV_COOKIE_NAME,
    options: { httpOnly: true, secure: hardened, sameSite: 'strict', path: '/' },
  };
}

export function sessionCookieSettings(): SessionCookieSettings {
  return cookieSettingsFor(getConfig().nodeEnv);
}
