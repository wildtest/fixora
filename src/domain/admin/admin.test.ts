import { describe, expect, it } from 'vitest';
import {
  EMAIL_MAX_LENGTH,
  isLoginPasswordAcceptable,
  isProvisionPasswordAcceptable,
  normalizeEmail,
  parseEmail,
  passwordLength,
} from './credentials';
import {
  SESSION_ABSOLUTE_MS,
  SESSION_IDLE_MS,
  SESSION_TOUCH_INTERVAL_MS,
  absoluteExpiry,
  isSessionActive,
  shouldTouch,
} from './session-policy';

describe('credenciales del administrador', () => {
  it('normaliza el correo con trim + minúsculas, igual para login y aprovisionamiento', () => {
    expect(normalizeEmail('  Admin@Taller.EXAMPLE ')).toBe('admin@taller.example');
    expect(parseEmail('  Admin@Taller.EXAMPLE ')).toBe('admin@taller.example');
  });

  it('rechaza correos vacíos, mal formados, con espacios internos, sin texto o demasiado largos', () => {
    for (const value of ['', '   ', 'sin-arroba', '@x', 'x@', 'a b@c', 'a@b c', 'a@@b', 42, null, undefined]) {
      expect(parseEmail(value), String(value)).toBeNull();
    }
    expect(parseEmail(`${'a'.repeat(EMAIL_MAX_LENGTH)}@x`)).toBeNull();
  });

  it('cuenta la longitud de la contraseña en caracteres Unicode', () => {
    expect(passwordLength('ñandú')).toBe(5);
    expect(passwordLength('😀'.repeat(10))).toBe(10);
  });

  it('el login acepta de 1 a 128 caracteres sin recortar espacios y rechaza lo vacío o enorme', () => {
    expect(isLoginPasswordAcceptable(' x ')).toBe(true);
    expect(isLoginPasswordAcceptable('a'.repeat(128))).toBe(true);
    expect(isLoginPasswordAcceptable('😀'.repeat(128))).toBe(true);
    expect(isLoginPasswordAcceptable('a'.repeat(129))).toBe(false);
    expect(isLoginPasswordAcceptable('')).toBe(false);
    expect(isLoginPasswordAcceptable(undefined)).toBe(false);
    expect(isLoginPasswordAcceptable(123)).toBe(false);
  });

  it('el aprovisionamiento exige de 15 a 128 caracteres y admite espacios y Unicode', () => {
    expect(isProvisionPasswordAcceptable('a'.repeat(14))).toBe(false);
    expect(isProvisionPasswordAcceptable('a'.repeat(15))).toBe(true);
    expect(isProvisionPasswordAcceptable(' contraseña con espacios 😀 ')).toBe(true);
    expect(isProvisionPasswordAcceptable('a'.repeat(129))).toBe(false);
  });
});

describe('política de sesión', () => {
  const created = new Date('2026-10-28T10:00:00.000Z');
  const at = (ms: number) => new Date(created.getTime() + ms);

  it('la expiración absoluta es de 12 horas desde el inicio', () => {
    expect(absoluteExpiry(created).getTime() - created.getTime()).toBe(SESSION_ABSOLUTE_MS);
  });

  it('es válida mientras no pasen 60 minutos de inactividad ni 12 horas', () => {
    const times = { lastSeenAt: created, expiresAt: absoluteExpiry(created) };
    expect(isSessionActive(times, at(SESSION_IDLE_MS - 1))).toBe(true);
    expect(isSessionActive(times, at(SESSION_IDLE_MS))).toBe(false);
  });

  it('la actividad extiende la inactividad pero nunca el máximo absoluto', () => {
    const expiresAt = absoluteExpiry(created);
    const active = { lastSeenAt: at(SESSION_ABSOLUTE_MS - 1000), expiresAt };
    expect(isSessionActive(active, at(SESSION_ABSOLUTE_MS - 1))).toBe(true);
    expect(isSessionActive(active, at(SESSION_ABSOLUTE_MS))).toBe(false);
  });

  it('solo persiste actividad pasado el intervalo de throttling', () => {
    expect(shouldTouch(created, at(SESSION_TOUCH_INTERVAL_MS - 1))).toBe(false);
    expect(shouldTouch(created, at(SESSION_TOUCH_INTERVAL_MS))).toBe(true);
  });
});
