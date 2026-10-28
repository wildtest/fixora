import { ORDER_STATUS_LABELS, type OrderStatus } from './order-status';
import type { PublicStatusEvent } from './public-order-view';

// Repair Journey (DESIGN.md §7): componente de PRESENTACIÓN. Recibe el estado y los eventos y decide cómo
// mostrar cada etapa. NO acepta ni rechaza transiciones y no es una segunda máquina de estados (la matriz, la
// cancelación y E11 son de CHG-10). Puede recibir cualquiera de los ocho estados válidos persistidos.

export const JOURNEY_STAGES = [
  'SOLICITUD_RECIBIDA',
  'EQUIPO_RECIBIDO',
  'EN_DIAGNOSTICO',
  'ESPERANDO_APROBACION',
  'EN_REPARACION',
  'LISTO_PARA_RECOJO',
  'ENTREGADO',
] as const satisfies readonly OrderStatus[];

export type JourneyStageState = 'completed' | 'current' | 'final' | 'pending' | 'cancelled-here' | 'not-reached';

export type JourneyStage = {
  readonly status: OrderStatus;
  readonly name: string;
  readonly number: number;
  readonly state: JourneyStageState;
  /** ISO 8601 UTC o `null` si la etapa no tiene evento (se muestra «—»). */
  readonly occurredAt: string | null;
};

export type Journey = {
  /** «Etapa N de 7 · {nombre}» o «Cancelado desde «{etapa}»». */
  readonly headline: string;
  readonly stages: readonly JourneyStage[];
  readonly cancelled: { readonly from: string; readonly occurredAt: string | null } | null;
};

function dateOf(timeline: readonly PublicStatusEvent[], status: OrderStatus): string | null {
  // Si hubiera varios eventos del mismo estado, el más antiguo es el de entrada.
  const dates = timeline.filter((event) => event.status === status).map((event) => event.occurredAt);
  return dates.length > 0 ? dates.reduce((a, b) => (a < b ? a : b)) : null;
}

export function buildJourney(status: OrderStatus, timeline: readonly PublicStatusEvent[]): Journey {
  const stageOf = (index: number, state: JourneyStageState): JourneyStage => {
    const stageStatus = JOURNEY_STAGES[index];
    return {
      status: stageStatus,
      name: ORDER_STATUS_LABELS[stageStatus],
      number: index + 1,
      state,
      occurredAt: state === 'pending' || state === 'not-reached' ? null : dateOf(timeline, stageStatus),
    };
  };

  if (status === 'CANCELADO') {
    // La etapa interrumpida es la del último evento de estado anterior a la cancelación.
    const ordered = [...timeline].sort((a, b) => (a.occurredAt < b.occurredAt ? -1 : a.occurredAt > b.occurredAt ? 1 : 0));
    const lastStage = ordered.filter((event) => event.status !== 'CANCELADO').at(-1)?.status;
    const cancelledIndex = Math.max(
      0,
      JOURNEY_STAGES.findIndex((stage) => stage === lastStage),
    );
    const stages = JOURNEY_STAGES.map((_, index) =>
      stageOf(index, index < cancelledIndex ? 'completed' : index === cancelledIndex ? 'cancelled-here' : 'not-reached'),
    );
    const from = ORDER_STATUS_LABELS[JOURNEY_STAGES[cancelledIndex]];
    return {
      headline: `Cancelado desde «${from}»`,
      stages,
      cancelled: { from, occurredAt: dateOf(timeline, 'CANCELADO') },
    };
  }

  const current = JOURNEY_STAGES.findIndex((stage) => stage === status);
  const stages = JOURNEY_STAGES.map((_, index) =>
    stageOf(index, index < current ? 'completed' : index === current ? (status === 'ENTREGADO' ? 'final' : 'current') : 'pending'),
  );
  return {
    headline: `Etapa ${current + 1} de ${JOURNEY_STAGES.length} · ${ORDER_STATUS_LABELS[status]}`,
    stages,
    cancelled: null,
  };
}
