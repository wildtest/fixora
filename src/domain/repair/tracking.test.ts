import { describe, expect, it } from 'vitest';
import { formatLimaDateTime } from './format-date';
import { JOURNEY_STAGES, buildJourney } from './journey';
import { ORDER_STATUSES, ORDER_STATUS_LABELS, isOrderStatus, type OrderStatus } from './order-status';
import type { PublicStatusEvent } from './public-order-view';
import { normalizeTrackingCode } from './tracking-lookup';

describe('normalizeTrackingCode [E15] [SC-02]', () => {
  const CODE = '23456789BDFG';

  it('acepta el código canónico', () => {
    expect(normalizeTrackingCode(CODE)).toBe(CODE);
  });

  it('tolera espacio exterior y mayúsculas/minúsculas ASCII', () => {
    for (const input of ['23456789bdfg', '  23456789BDFG', '23456789BDFG  ', '\t23456789bdfg\n', ' 23456789bDfG ']) {
      expect(normalizeTrackingCode(input), JSON.stringify(input)).toBe(CODE);
    }
  });

  it('NO corrige, completa ni aproxima: espacios o guiones interiores, O/0, I/L/1, longitud y Unicode', () => {
    const rejected = [
      '2345 6789BDFG', // espacio interior
      '23456789-BDFG', // guion
      '23456789BDF0', // 0 no pertenece al alfabeto
      '23456789BDFO', // O no pertenece
      '23456789BDFI', // I no pertenece
      '23456789BDFL', // L no pertenece
      '234567891DFG', // 1 no pertenece
      '23456789BDF', // 11
      '23456789BDFGH', // 13
      '', // vacío
      '   ', // solo espacios
      '２３４５６７８９ＢＤＦＧ', // anchura completa
      '23456789BDFG ', // espacio no ASCII exterior: no se trata como espacio accidental
      '23456789BDFG\u0000',
      '23456789ｂｄｆｇ',
    ];
    for (const input of rejected) expect(normalizeTrackingCode(input), JSON.stringify(input)).toBeNull();
  });

  it('un texto con apariencia de consulta o de instrucción no es un código', () => {
    for (const input of ["' OR 1=1 --", '<script>', '23456789BDFG; DROP TABLE x', 'ana@example.com', '987654321']) {
      expect(normalizeTrackingCode(input)).toBeNull();
    }
  });
});

describe('formatLimaDateTime (hora de Perú)', () => {
  it('convierte UTC a America/Lima (UTC−5) con el formato DD/MM/AAAA HH:mm de 24 horas', () => {
    expect(formatLimaDateTime('2026-10-20T15:05:00.000Z')).toBe('20/10/2026 10:05');
    expect(formatLimaDateTime('2026-10-21T03:30:00.000Z')).toBe('20/10/2026 22:30'); // cambia el día respecto de UTC
    expect(formatLimaDateTime('2026-01-01T04:59:00.000Z')).toBe('31/12/2025 23:59');
  });
});

describe('estados de la orden', () => {
  it('son ocho, con los nombres exactos del PRD', () => {
    expect(ORDER_STATUSES).toHaveLength(8);
    expect(Object.values(ORDER_STATUS_LABELS)).toEqual([
      'Solicitud recibida', 'Equipo recibido', 'En diagnóstico', 'Esperando aprobación',
      'En reparación', 'Listo para recojo', 'Entregado', 'Cancelado',
    ]);
    expect(isOrderStatus('CANCELADO')).toBe(true);
    expect(isOrderStatus('OTRO')).toBe(false);
  });
});

describe('buildJourney (presentación; no valida transiciones)', () => {
  const at = (day: number) => `2026-10-${String(day).padStart(2, '0')}T15:00:00.000Z`;
  const event = (status: OrderStatus, day: number): PublicStatusEvent => ({ status, occurredAt: at(day) });
  const states = (status: OrderStatus, timeline: PublicStatusEvent[]) => buildJourney(status, timeline).stages.map((s) => s.state);

  it('tiene siete etapas con el nombre exacto del PRD, sin Cancelado como etapa', () => {
    const journey = buildJourney('SOLICITUD_RECIBIDA', [event('SOLICITUD_RECIBIDA', 1)]);
    expect(journey.stages.map((s) => s.name)).toEqual([
      'Solicitud recibida', 'Equipo recibido', 'En diagnóstico', 'Esperando aprobación',
      'En reparación', 'Listo para recojo', 'Entregado',
    ]);
    expect(JOURNEY_STAGES).not.toContain('CANCELADO');
  });

  it('una orden recién registrada: etapa 1 actual con su fecha y el resto pendiente, sin inventar eventos', () => {
    const journey = buildJourney('SOLICITUD_RECIBIDA', [event('SOLICITUD_RECIBIDA', 1)]);
    expect(journey.headline).toBe('Etapa 1 de 7 · Solicitud recibida');
    expect(journey.stages[0]).toMatchObject({ state: 'current', occurredAt: at(1) });
    expect(journey.stages.slice(1).every((s) => s.state === 'pending' && s.occurredAt === null)).toBe(true);
    expect(journey.cancelled).toBeNull();
  });

  it.each(
    (['SOLICITUD_RECIBIDA', 'EQUIPO_RECIBIDO', 'EN_DIAGNOSTICO', 'ESPERANDO_APROBACION', 'EN_REPARACION', 'LISTO_PARA_RECOJO'] as const).map(
      (status, index) => [status, index] as const,
    ),
  )('%s: etapas previas completadas, la actual en %i y las siguientes pendientes', (status, index) => {
    const timeline = JOURNEY_STAGES.slice(0, index + 1).map((stage, i) => event(stage, i + 1));
    const result = states(status, timeline);
    expect(result.slice(0, index)).toEqual(Array(index).fill('completed'));
    expect(result[index]).toBe('current');
    expect(result.slice(index + 1)).toEqual(Array(6 - index).fill('pending'));
    expect(buildJourney(status, timeline).headline).toBe(`Etapa ${index + 1} de 7 · ${ORDER_STATUS_LABELS[status]}`);
  });

  it('ENTREGADO: todas completadas y la última es «final»', () => {
    const timeline = JOURNEY_STAGES.map((stage, i) => event(stage, i + 1));
    expect(states('ENTREGADO', timeline)).toEqual([...Array(6).fill('completed'), 'final']);
  });

  it.each([
    ['SOLICITUD_RECIBIDA', 0],
    ['EQUIPO_RECIBIDO', 1],
    ['EN_DIAGNOSTICO', 2],
    ['ESPERANDO_APROBACION', 3],
  ] as const)('CANCELADO desde %s: la rama sale de esa etapa y las siguientes no se alcanzaron', (from, index) => {
    const timeline = [...JOURNEY_STAGES.slice(0, index + 1).map((stage, i) => event(stage, i + 1)), event('CANCELADO', 20)];
    const journey = buildJourney('CANCELADO', timeline);
    expect(journey.stages.map((s) => s.state)).toEqual([
      ...Array(index).fill('completed'),
      'cancelled-here',
      ...Array(6 - index).fill('not-reached'),
    ]);
    expect(journey.headline).toBe(`Cancelado desde «${ORDER_STATUS_LABELS[from]}»`);
    expect(journey.cancelled).toEqual({ from: ORDER_STATUS_LABELS[from], occurredAt: at(20) });
    expect(journey.stages.length).toBe(7); // Cancelado nunca es una octava etapa
  });

  it('el timeline puede llegar en cualquier orden (más reciente primero): el Journey no depende de él', () => {
    const asc = [event('SOLICITUD_RECIBIDA', 1), event('EQUIPO_RECIBIDO', 2), event('CANCELADO', 3)];
    const desc = [...asc].reverse();
    expect(buildJourney('CANCELADO', desc)).toEqual(buildJourney('CANCELADO', asc));
  });

  it('una orden cancelada sin historial legible se presenta sin lanzar', () => {
    const journey = buildJourney('CANCELADO', []);
    expect(journey.stages[0].state).toBe('cancelled-here');
    expect(journey.cancelled?.occurredAt).toBeNull();
  });

  it('representa cualquiera de los ocho estados sin decidir cuándo pueden ocurrir', () => {
    for (const status of ORDER_STATUSES) expect(() => buildJourney(status, [])).not.toThrow();
  });
});
