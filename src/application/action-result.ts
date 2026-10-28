import type { FieldErrors } from '@/domain/validation/validation';

// Contrato estructural estable y global de las acciones (TD §6). La forma es común;
// los códigos concretos los define cada change con su propia unión cerrada de literales
// (no hay registro central). `INTERNAL_ERROR` es el único código transversal: lo produce `runAction`.
// El resultado no transporta mensajes internos: la interfaz traduce el código.

export type InternalErrorCode = 'INTERNAL_ERROR';

export type ActionSuccess<T> = { readonly ok: true; readonly data: T };

export type ActionFailure<C extends string> = {
  readonly ok: false;
  readonly code: C | InternalErrorCode;
  readonly fieldErrors?: FieldErrors;
  readonly retryAfterSeconds?: number;
  readonly reference?: string;
};

// `C` debe ser una unión cerrada de literales: con `string` abierto el tipo resultante es `never`
// y cualquier uso falla al compilar.
export type ActionResult<T, C extends string = never> = string extends C
  ? never
  : ActionSuccess<T> | ActionFailure<C>;
