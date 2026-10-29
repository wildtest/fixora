"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Alert } from "../../../_components/alert";

// Diálogo de confirmación E11 (DESIGN.md §6.12 y §12): un solo patrón para las cuatro confirmaciones. Chip de transición
// (de → a), título como pregunta, texto, alerta de consecuencia y pie con «Volver» (izquierda) y la acción con el nombre
// exacto de la transición (derecha). Foco inicial en «Volver» para irreversibles y destructivas y en la acción para la
// normal; Escape equivale a Volver; en móvil es una hoja inferior a ancho completo con botones apilados y la acción
// arriba. Se apoya en `<dialog>` modal nativo (foco atrapado, scrim, Escape). La confirmación visual NUNCA sustituye la
// validación del servidor: solo recoge `confirmed`.

export type DialogVariant = "normal" | "warning" | "destructive";

export function ConfirmDialog({
  variant,
  chip,
  title,
  description,
  summary,
  alert,
  actionLabel,
  pending,
  onConfirm,
  onBack,
}: {
  variant: DialogVariant;
  chip: string;
  title: string;
  description?: string;
  /** Resumen de lo que se confirma (p. ej. el diagnóstico y el costo que se publicarán); lo aporta el llamador. */
  summary?: ReactNode;
  alert: { variant: "info" | "warning" | "error"; title?: string; text: string };
  actionLabel: string;
  pending: boolean;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    // Foco inicial explícito (DESIGN §6.12): `autoFocus` no actúa mientras el `<dialog>` aún está cerrado.
    dialog?.querySelector<HTMLElement>("[data-initial-focus]")?.focus();
    return () => dialog?.close();
  }, []);

  const initialOnBack = variant !== "normal";
  const chipTone = variant === "destructive" ? "bg-danger-soft text-danger-text" : "bg-primary-subtle text-primary-active";
  const actionTone =
    variant === "destructive"
      ? "bg-danger text-white hover:opacity-90"
      : "bg-primary text-white hover:bg-primary-hover active:bg-primary-active";

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      data-testid="confirm-dialog"
      data-variant={variant}
      onCancel={(event) => {
        // Escape equivale a «Volver»; mientras la acción está en curso no se cierra.
        event.preventDefault();
        if (!pending) onBack();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-[560px] rounded-lg bg-surface p-0 text-content shadow-level-2 backdrop:bg-[rgb(18_26_38/0.48)] max-md:mb-0 max-md:w-full max-md:max-w-none max-md:rounded-b-none"
    >
      <div className="space-y-4 p-6">
        <span data-testid="confirm-chip" className={`inline-flex rounded-xs px-2 py-1 text-caption ${chipTone}`}>
          {chip}
        </span>
        <h2 id="confirm-title" className="text-card-title text-content">
          {title}
        </h2>
        {description ? <p className="text-body text-content-secondary">{description}</p> : null}
        {summary}
        <Alert variant={alert.variant} title={alert.title}>
          {alert.text}
        </Alert>
        <div className="flex flex-col-reverse gap-2 md:flex-row md:items-center md:justify-between">
          <button
            type="button"
            data-initial-focus={initialOnBack ? "" : undefined}
            disabled={pending}
            onClick={onBack}
            className="transition-soft inline-flex h-11 items-center justify-center rounded-sm bg-primary-subtle px-4 text-button text-primary-active hover:bg-secondary-hover disabled:cursor-default disabled:bg-surface-secondary disabled:text-content-disabled lg:h-10"
          >
            Volver
          </button>
          <button
            type="button"
            data-initial-focus={!initialOnBack ? "" : undefined}
            disabled={pending}
            onClick={onConfirm}
            className={`transition-soft inline-flex h-11 items-center justify-center rounded-sm px-4 text-button disabled:cursor-default disabled:bg-surface-secondary disabled:text-content-disabled lg:h-10 ${actionTone}`}
          >
            {pending ? "Aplicando…" : actionLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
