import type { Instrumentation } from 'next';

// Enganche técnico de Next (CHG-01): registra errores inesperados del servidor con el logger cerrado.
// El manejador solo se carga en el runtime Node (ADR-002); `NEXT_RUNTIME` se consulta a través de la
// configuración dentro del propio manejador, nunca con `process.env` directo.
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  try {
    const { handleRequestError } = await import('@/infrastructure/logging/request-error');
    await handleRequestError(error, request, context);
  } catch {
    // Un fallo de logging no puede romper la petición.
  }
};
