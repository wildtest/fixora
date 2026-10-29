import type { ReactNode } from "react";
import { DEVICE_TYPES, DEVICE_TYPE_LABELS, type DeviceType } from "@/domain/repair/device-type";
import {
  ConsoleDeviceIcon,
  DesktopDeviceIcon,
  LaptopDeviceIcon,
  OtherDeviceIcon,
  PhoneDeviceIcon,
  TabletDeviceIcon,
  CheckIcon,
} from "./form-icons";
import { ErrorIcon } from "./icons";

// Campos de formulario público (DESIGN.md §6.2–§6.5, §13.1). Solo lo que usa el registro: campo de texto,
// área de texto y selector del tipo de equipo. Etiqueta siempre visible arriba; el ejemplo va en el
// placeholder, nunca como etiqueta; el error combina borde de 2 px, icono y mensaje (no solo color).

const CONTROL =
  "transition-soft block w-full rounded-sm bg-surface px-3 text-body text-content placeholder:text-content-muted hover:border-content-secondary";
const BORDER_OK = "border border-line-strong";
const BORDER_ERROR = "border-2 border-danger";

export function FieldShell({
  id,
  label,
  required,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-label text-content">
          {label}
          {required ? (
            <span aria-hidden="true" className="text-danger">
              {" "}
              *
            </span>
          ) : null}
        </label>
        {required ? null : <span className="text-caption text-content-muted">Opcional</span>}
      </div>
      <div className="mt-1">{children}</div>
      {hint ? (
        <p id={`${id}-hint`} className="mt-1 text-small text-content-secondary">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="mt-1 flex items-start gap-1.5 text-small text-danger-text">
          <span className="mt-0.5 shrink-0">
            <ErrorIcon size={16} />
          </span>
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, hint: ReactNode, error?: string) {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

export function TextField({
  id,
  name,
  label,
  value,
  onChange,
  onBlur,
  required,
  hint,
  error,
  type = "text",
  inputMode,
  autoComplete,
  placeholder,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  type?: "text" | "email" | "tel" | "password";
  inputMode?: "text" | "email" | "tel";
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <FieldShell id={id} label={label} required={required} hint={hint} error={error}>
      <input
        id={id}
        name={name}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        aria-required={required ? true : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`${CONTROL} h-11 ${error ? BORDER_ERROR : BORDER_OK}`}
      />
    </FieldShell>
  );
}

export function TextAreaField({
  id,
  name,
  label,
  value,
  onChange,
  onBlur,
  required,
  hint,
  error,
  placeholder,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  placeholder?: string;
}) {
  return (
    <FieldShell id={id} label={label} required={required} hint={hint} error={error}>
      <textarea
        id={id}
        name={name}
        rows={4}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        aria-required={required ? true : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`${CONTROL} min-h-28 resize-y py-3 ${error ? BORDER_ERROR : BORDER_OK}`}
      />
    </FieldShell>
  );
}

const DEVICE_ICONS: Record<DeviceType, ReactNode> = {
  CELULAR: <PhoneDeviceIcon size={24} />,
  TABLET: <TabletDeviceIcon size={24} />,
  LAPTOP: <LaptopDeviceIcon size={24} />,
  PC: <DesktopDeviceIcon size={24} />,
  CONSOLA: <ConsoleDeviceIcon size={24} />,
  OTRO: <OtherDeviceIcon size={24} />,
};

/** Selector de tipo de equipo (§6.5): grupo de selección única, icono 24 + texto, alto 72, check al seleccionar. */
export function DeviceTypeSelector({
  value,
  onChange,
  onBlur,
  error,
}: {
  value: string;
  onChange: (value: DeviceType) => void;
  onBlur: () => void;
  error?: string;
}) {
  return (
    <fieldset aria-describedby={error ? "deviceType-error" : undefined} className="min-w-0">
      <legend className="text-label text-content">
        Tipo de equipo
        <span aria-hidden="true" className="text-danger">
          {" "}
          *
        </span>
      </legend>
      <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {DEVICE_TYPES.map((type) => {
          const selected = value === type;
          return (
            <label
              key={type}
              className={`transition-soft relative flex h-[72px] min-w-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-sm text-small hover:bg-page has-[:focus-visible]:shadow-[0_0_0_2px_#fff,0_0_0_4px_var(--color-primary)] ${
                selected
                  ? "border-2 border-primary bg-primary-subtle font-semibold text-primary-active"
                  : error
                    ? "border-2 border-danger bg-surface text-content"
                    : "border border-line-strong bg-surface text-content hover:border-content-secondary"
              }`}
            >
              <input
                type="radio"
                name="deviceType"
                value={type}
                checked={selected}
                onChange={() => onChange(type)}
                onBlur={onBlur}
                className="sr-only"
              />
              {DEVICE_ICONS[type]}
              <span>{DEVICE_TYPE_LABELS[type]}</span>
              {selected ? (
                <span className="absolute right-1 top-1 text-primary-active">
                  <CheckIcon size={16} />
                </span>
              ) : null}
            </label>
          );
        })}
      </div>
      {error ? (
        <p id="deviceType-error" className="mt-1 flex items-start gap-1.5 text-small text-danger-text">
          <span className="mt-0.5 shrink-0">
            <ErrorIcon size={16} />
          </span>
          <span>{error}</span>
        </p>
      ) : null}
    </fieldset>
  );
}
