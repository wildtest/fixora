"use client";

import { useEffect, useRef, useState } from "react";
import type { RegistrationConfirmation } from "@/application/register-repair";
import { DEVICE_TYPE_LABELS } from "@/domain/repair/device-type";
import { Alert } from "../../_components/alert";
import { ButtonLink } from "../../_components/button-link";
import { LookupAlert, type LookupFailureCode } from "../../_components/lookup-alert";
import { CheckIcon, CopyIcon } from "../../_components/form-icons";
import { ArrowForwardIcon } from "../../_components/icons";

// PUB-03 — Confirmación (DESIGN.md §6.9): código destacado y seleccionable con un clic, aviso de conservarlo
// (no hay recuperación de autoservicio, E2), resumen del equipo sin datos personales y acciones. El código
// nunca va a la URL ni a almacenamiento persistente.
export function Confirmation({
  confirmation,
  onConsult,
  consulting,
  lookupFailure,
}: {
  confirmation: RegistrationConfirmation;
  /** Consulta la orden recién creada con el código en memoria (PUB-05 sin cambiar de URL). */
  onConsult: () => void;
  consulting: boolean;
  lookupFailure: LookupFailureCode | null;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(confirmation.trackingCode);
      setCopy("copied");
    } catch {
      setCopy("failed");
    }
  }

  const { device } = confirmation;
  return (
    <div className="mx-auto max-w-xl">
      <h1 ref={headingRef} tabIndex={-1} className="text-h2 text-content focus:outline-none">
        Solicitud registrada
      </h1>
      <p className="mt-2 text-body text-content-secondary">
        Recibimos tu solicitud de reparación. Usa este código para consultar el estado de tu equipo.
      </p>

      <section
        aria-labelledby="codigo-etiqueta"
        className="mt-6 rounded-md border border-line bg-surface p-6 shadow-level-1"
      >
        <p id="codigo-etiqueta" className="text-label text-content-secondary">
          Código de seguimiento
        </p>
        <p
          data-testid="tracking-code"
          className="mt-2 select-all whitespace-nowrap rounded-md border border-info-line bg-primary-subtle px-3 py-4 text-center font-mono text-[1.75rem] font-medium leading-9 tracking-[0.08em] text-primary-active md:text-[2rem] md:leading-10"
        >
          {confirmation.trackingCode}
        </p>
        <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center">
          <button
            type="button"
            onClick={copyCode}
            className="transition-soft inline-flex h-11 w-full items-center justify-center gap-2 rounded-sm bg-primary-subtle px-4 text-button text-primary-active hover:bg-secondary-hover md:w-auto lg:h-10"
          >
            <CopyIcon size={20} />
            Copiar código
          </button>
          <p role="status" className="text-small text-success">
            {copy === "copied" ? (
              <span className="inline-flex items-center gap-1">
                <CheckIcon size={16} />
                Código copiado
              </span>
            ) : null}
            {copy === "failed" ? (
              <span className="text-danger-text">No se pudo copiar. Selecciona el código y cópialo manualmente.</span>
            ) : null}
          </p>
        </div>
      </section>

      <div className="mt-4">
        <Alert variant="warning" title="Conserva este código">
          No hay recuperación de autoservicio: si lo pierdes, tendrás que contactar al taller. No volverá a mostrarse en
          esta pantalla.
        </Alert>
      </div>

      <dl className="mt-6 rounded-md bg-surface-secondary p-4 text-body">
        <div className="flex flex-wrap justify-between gap-x-4">
          <dt className="text-label text-content-secondary">Equipo</dt>
          <dd className="font-medium">{DEVICE_TYPE_LABELS[device.type]}</dd>
        </div>
        <div className="mt-2 flex flex-wrap justify-between gap-x-4">
          <dt className="text-label text-content-secondary">Marca</dt>
          <dd className="font-medium">{device.brand}</dd>
        </div>
        {device.model ? (
          <div className="mt-2 flex flex-wrap justify-between gap-x-4">
            <dt className="text-label text-content-secondary">Modelo</dt>
            <dd className="font-medium">{device.model}</dd>
          </div>
        ) : null}
      </dl>

      {lookupFailure ? (
        <div className="mt-6">
          <LookupAlert code={lookupFailure} onRetry={lookupFailure === "SERVICE_UNAVAILABLE" || lookupFailure === "INTERNAL_ERROR" ? onConsult : undefined} />
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-2 md:flex-row md:items-start">
        <button
          type="button"
          onClick={onConsult}
          disabled={consulting}
          className="transition-soft inline-flex h-11 w-full items-center justify-center gap-2 rounded-sm bg-primary px-4 text-button text-white hover:bg-primary-hover active:bg-primary-active disabled:cursor-default disabled:bg-surface-secondary disabled:text-content-disabled md:w-auto lg:h-10"
        >
          {consulting ? "Consultando…" : "Consultar estado"}
          <ArrowForwardIcon size={20} />
        </button>
        <ButtonLink href="/" variant="secondary">
          Volver al inicio
        </ButtonLink>
      </div>
    </div>
  );
}
