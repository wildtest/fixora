// Tope de concurrencia de scrypt por instancia (CHG-08, D5). Cada verificación usa ≈ 128 MiB: se admiten pocas a
// la vez, con una cola ACOTADA y una espera acotada. Si no cabe, el resultado es `busy` (→ SERVICE_UNAVAILABLE),
// nunca «credenciales inválidas». No es un control distribuido de seguridad: el principal es el limitador persistente.

export type GateOptions = {
  /** Verificaciones simultáneas por instancia. */
  readonly maxConcurrent: number;
  /** Esperas en cola admitidas; más allá se rechaza de inmediato. */
  readonly maxQueued: number;
  /** Espera máxima en cola antes de rechazar, en milisegundos. */
  readonly maxWaitMs: number;
};

export type GateResult<T> = { readonly status: 'done'; readonly value: T } | { readonly status: 'busy' };

export type Gate = { run<T>(work: () => Promise<T>): Promise<GateResult<T>> };

export const SCRYPT_GATE_DEFAULTS: GateOptions = { maxConcurrent: 2, maxQueued: 4, maxWaitMs: 2_000 };

export function createGate(options: GateOptions = SCRYPT_GATE_DEFAULTS): Gate {
  let active = 0;
  const queue: Array<{ grant: () => void; timer: ReturnType<typeof setTimeout> }> = [];

  function release(): void {
    const next = queue.shift();
    if (next) {
      clearTimeout(next.timer);
      next.grant(); // el cupo pasa directamente al siguiente (`active` no cambia)
    } else {
      active -= 1;
    }
  }

  function acquire(): Promise<boolean> {
    if (active < options.maxConcurrent) {
      active += 1;
      return Promise.resolve(true);
    }
    if (queue.length >= options.maxQueued) return Promise.resolve(false);
    return new Promise<boolean>((resolve) => {
      const entry = {
        grant: () => resolve(true),
        timer: setTimeout(() => {
          const index = queue.indexOf(entry);
          if (index >= 0) queue.splice(index, 1);
          resolve(false);
        }, options.maxWaitMs),
      };
      queue.push(entry);
    });
  }

  return {
    async run<T>(work: () => Promise<T>): Promise<GateResult<T>> {
      if (!(await acquire())) return { status: 'busy' };
      try {
        return { status: 'done', value: await work() };
      } finally {
        release();
      }
    },
  };
}
