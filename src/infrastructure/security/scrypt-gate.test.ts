import { describe, expect, it } from 'vitest';
import { createGate } from './scrypt-gate';

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
};

describe('tope de concurrencia de scrypt', () => {
  it('admite hasta el máximo simultáneo y ejecuta el resto en cola', async () => {
    const gate = createGate({ maxConcurrent: 1, maxQueued: 2, maxWaitMs: 1000 });
    const first = deferred();
    const order: string[] = [];
    const a = gate.run(async () => { order.push('a'); await first.promise; return 'A'; });
    const b = gate.run(async () => { order.push('b'); return 'B'; });
    await Promise.resolve();
    expect(order).toEqual(['a']); // b espera
    first.resolve();
    expect(await a).toEqual({ status: 'done', value: 'A' });
    expect(await b).toEqual({ status: 'done', value: 'B' });
    expect(order).toEqual(['a', 'b']);
  });

  it('rechaza de inmediato (busy) si la cola acotada está llena: sin cola ilimitada', async () => {
    const gate = createGate({ maxConcurrent: 1, maxQueued: 1, maxWaitMs: 1000 });
    const hold = deferred();
    const a = gate.run(() => hold.promise);
    const b = gate.run(async () => 'b');
    const c = await gate.run(async () => 'c');
    expect(c).toEqual({ status: 'busy' });
    hold.resolve();
    await a;
    expect(await b).toEqual({ status: 'done', value: 'b' });
  });

  it('rechaza (busy) si la espera en cola supera el límite', async () => {
    const gate = createGate({ maxConcurrent: 1, maxQueued: 2, maxWaitMs: 20 });
    const hold = deferred();
    const a = gate.run(() => hold.promise);
    expect(await gate.run(async () => 'tarde')).toEqual({ status: 'busy' });
    hold.resolve();
    await a;
  });

  it('libera el cupo aunque el trabajo falle', async () => {
    const gate = createGate({ maxConcurrent: 1, maxQueued: 0, maxWaitMs: 10 });
    await expect(gate.run(async () => { throw new Error('boom'); })).rejects.toThrow('boom');
    expect(await gate.run(async () => 'ok')).toEqual({ status: 'done', value: 'ok' });
  });
});
