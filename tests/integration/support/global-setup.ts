import { rebuildTestSchema } from './reset.ts';

// Antes de las pruebas: guardia → esquema `public` vacío → migraciones versionadas (tarea 7.6).
// Si la guardia falla, ninguna prueba corre y nada se modifica. El error se re-lanza sin pila: el mensaje
// nombra variables, nunca valores, y el mapeo de pilas de Vitest no debe tapar el motivo del aborto.
export default async function setup(): Promise<void> {
  try {
    await rebuildTestSchema();
  } catch (error) {
    const failure = new Error(error instanceof Error ? error.message : 'Fallo del harness de integración.');
    failure.stack = `${failure.name}: ${failure.message}`;
    throw failure;
  }
}
