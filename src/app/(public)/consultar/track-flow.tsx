"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { PublicOrderView } from "@/domain/repair/public-order-view";
import { LookupAlert, type LookupFailureCode } from "../../_components/lookup-alert";
import { TrackingResult } from "../../_components/tracking-result";
import { trackOrderAction } from "./actions";

// PUB-04 → PUB-05 como un contenedor de cliente con estados (CHG-06 D9):
//   idle → submitting → success | not-found | rate-limited | unavailable | error
// El código es un secreto bearer de lectura: viaja en el cuerpo de la Server Action, nunca en la URL, y ni él ni
// el resultado se guardan en almacenamiento persistente. Con Cache Components la Activity puede conservar el
// estado al ocultarse la ruta; por eso el reinicio al salir es explícito (cleanup del efecto) y una recarga vuelve
// al formulario vacío sin repetir la consulta.
export function TrackFlow() {
  const [code, setCode] = useState("");
  const [order, setOrder] = useState<PublicOrderView | null>(null);
  const [failure, setFailure] = useState<LookupFailureCode | null>(null);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => {
      setCode("");
      setOrder(null);
      setFailure(null);
      setPending(false);
    },
    [],
  );

  useEffect(() => {
    if (order) document.getElementById("resultado-titulo")?.focus();
  }, [order]);

  async function search(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (pending) return;
    setPending(true);
    setFailure(null);
    try {
      const result = await trackOrderAction(code);
      if (result.ok) {
        // Éxito: se descarta lo escrito; el resultado vive solo en memoria.
        setOrder(result.data);
        setCode("");
      } else {
        setFailure(result.code);
      }
    } catch {
      setFailure("INTERNAL_ERROR");
    } finally {
      setPending(false);
    }
  }

  function reset() {
    setOrder(null);
    setFailure(null);
    setCode("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  if (order) {
    return (
      <div>
        <TrackingResult
          order={order}
          actions={
            <button
              type="button"
              onClick={reset}
              className="transition-soft inline-flex h-11 w-full items-center justify-center rounded-sm bg-primary-subtle px-4 text-button text-primary-active hover:bg-secondary-hover md:w-auto lg:h-10"
            >
              Consultar otro código
            </button>
          }
        />
      </div>
    );
  }

  const invalid = failure === "TRACKING_NOT_FOUND";
  return (
    <div className="mx-auto w-full max-w-xl">
      <h1 className="text-h2 text-content">
        Consultar reparación
      </h1>
      <p className="mt-2 text-body text-content-secondary">
        Ingresa el código de seguimiento que recibiste al registrar tu reparación.
      </p>

      {failure ? (
        <div className="mt-4">
          <LookupAlert code={failure} onRetry={failure === "SERVICE_UNAVAILABLE" || failure === "INTERNAL_ERROR" ? () => void search() : undefined} />
        </div>
      ) : null}

      <form noValidate onSubmit={search} className="mt-6" aria-label="Consultar reparación">
        <label htmlFor="trackingCode" className="text-label text-content">
          Código de seguimiento
        </label>
        <input
          ref={inputRef}
          id="trackingCode"
          name="trackingCode"
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          value={code}
          onChange={(event) => {
            setCode(event.target.value);
            if (failure === "TRACKING_NOT_FOUND") setFailure(null);
          }}
          aria-invalid={invalid ? true : undefined}
          aria-describedby="trackingCode-help"
          className={`transition-soft mt-1 block h-11 w-full rounded-sm bg-surface px-3 font-mono text-body uppercase tracking-[0.04em] text-content placeholder:text-content-muted placeholder:normal-case hover:border-content-secondary ${
            invalid ? "border-2 border-danger" : "border border-line-strong"
          }`}
        />
        <p id="trackingCode-help" className="mt-1 text-small text-content-secondary">
          Son 12 caracteres. No importa si escribes en mayúsculas o minúsculas.
        </p>

        <button
          type="submit"
          disabled={pending}
          className="transition-soft mt-6 inline-flex h-11 w-full items-center justify-center rounded-sm bg-primary px-4 text-button text-white hover:bg-primary-hover active:bg-primary-active disabled:cursor-default disabled:bg-surface-secondary disabled:text-content-disabled md:w-auto lg:h-10"
        >
          {pending ? "Consultando…" : "Consultar estado"}
        </button>
      </form>

      <p className="mt-6 text-small text-content-secondary">
        ¿Perdiste tu código? No podemos recuperarlo desde aquí. Contacta al taller por un canal externo (teléfono o
        mensaje) y ellos podrán ayudarte.
      </p>
    </div>
  );
}
