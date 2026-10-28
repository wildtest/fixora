"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { RegistrationConfirmation } from "@/application/register-repair";
import {
  validateRepairRequest,
  type RepairRequestField,
} from "@/domain/repair/repair-request";
import type { FieldErrors } from "@/domain/validation/validation";
import { Alert } from "../../_components/alert";
import { DeviceTypeSelector, TextAreaField, TextField } from "../../_components/form-fields";
import { registerRepairAction } from "./actions";
import { Confirmation } from "./confirmation";
import { fieldMessage } from "./messages";

// PUB-02 + PUB-03 como un único contenedor de cliente con estados (TD §12, CHG-05 D1/D4/D7/D8).
// Privacidad: ni el código, ni la confirmación, ni lo escrito, ni la clave de idempotencia se guardan en la URL,
// en cookies ni en almacenamiento persistente; todo vive en memoria y se reinicia al salir de /registrar
// (con Cache Components la Activity puede conservar el estado, por eso el reinicio es explícito).

type Values = Record<RepairRequestField, string>;

const EMPTY: Values = {
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  deviceType: "",
  brand: "",
  model: "",
  problemDescription: "",
};

const FIELDS = Object.keys(EMPTY) as RepairRequestField[];

// Clave aleatoria de 256 bits en base64url, generada por intento en el navegador (nunca en HTML estático).
function newIdempotencyKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function RegisterFlow() {
  const [values, setValues] = useState<Values>(EMPTY);
  const [touched, setTouched] = useState<ReadonlySet<RepairRequestField>>(new Set());
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [confirmation, setConfirmation] = useState<RegistrationConfirmation | null>(null);
  const [unexpected, setUnexpected] = useState(false);
  const [pending, setPending] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const keyRef = useRef<string | null>(null);

  // Alta y reinicio explícito: al montar/mostrar se genera la clave; al desmontar/ocultar se borra todo el estado
  // sensible (formulario, confirmación y clave).
  useEffect(() => {
    keyRef.current = newIdempotencyKey();
    setIdempotencyKey(keyRef.current);
    return () => {
      keyRef.current = null;
      setIdempotencyKey(null);
      setValues(EMPTY);
      setTouched(new Set());
      setServerErrors({});
      setConfirmation(null);
      setUnexpected(false);
      setPending(false);
    };
  }, []);

  const validation = useMemo(() => validateRepairRequest(values), [values]);
  const knownErrors: FieldErrors = validation.ok ? {} : validation.fieldErrors;
  const hasKnownErrors = !validation.ok;
  const onlyMissing = Object.values(knownErrors).every((code) => code === "REQUIRED");

  const errorFor = (field: RepairRequestField): string | undefined => {
    const code = touched.has(field) ? (knownErrors[field] ?? serverErrors[field]) : serverErrors[field];
    return fieldMessage(field, code);
  };
  const visibleErrorCount = FIELDS.filter((field) => errorFor(field)).length;

  const setValue = (field: RepairRequestField) => (value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setServerErrors((current) => Object.fromEntries(Object.entries(current).filter(([key]) => key !== field)));
    setUnexpected(false);
  };
  const touch = (field: RepairRequestField) => () => setTouched((current) => new Set(current).add(field));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const key = keyRef.current;
    if (!validation.ok || !key) {
      setTouched(new Set(FIELDS));
      return;
    }
    setPending(true);
    setUnexpected(false);
    const data = new FormData();
    for (const field of FIELDS) data.set(field, values[field]);
    data.set("idempotencyKey", key);
    try {
      const result = await registerRepairAction(data);
      if (result.ok) {
        // Éxito: se descarta lo escrito y la clave; la confirmación vive solo en memoria.
        setConfirmation(result.data);
        setValues(EMPTY);
        setTouched(new Set());
        setServerErrors({});
        keyRef.current = null;
        setIdempotencyKey(null);
      } else if (result.code === "VALIDATION_FAILED") {
        setServerErrors(result.fieldErrors ?? {});
        setTouched(new Set(FIELDS));
      } else {
        setUnexpected(true);
      }
    } catch {
      setUnexpected(true);
    } finally {
      setPending(false);
    }
  }

  if (confirmation) return <Confirmation confirmation={confirmation} />;

  const disabled = pending || !idempotencyKey || hasKnownErrors;
  const reason = !idempotencyKey
    ? null
    : hasKnownErrors
      ? onlyMissing
        ? "Completa los campos obligatorios para registrar la reparación."
        : "Corrige los campos marcados para continuar."
      : null;

  return (
    <div>
      <h1 className="text-h2 text-content">Registrar reparación</h1>
      <p className="mt-2 text-body text-content-secondary">
        Cuéntanos qué le pasa a tu equipo. Registra una solicitud por cada equipo.
      </p>
      <p className="mt-4 text-small text-content-secondary">
        <span aria-hidden="true" className="text-danger">
          *
        </span>{" "}
        Campo obligatorio
      </p>

      {visibleErrorCount > 0 ? (
        <div className="mt-4">
          <Alert variant="error" role="alert" title="Hay campos por corregir">
            Revisa los campos marcados antes de registrar la reparación.
          </Alert>
        </div>
      ) : null}
      {unexpected ? (
        <div className="mt-4">
          <Alert variant="error" role="alert" title="Ocurrió un problema inesperado.">
            No pudimos registrar tu solicitud. Inténtalo nuevamente.
          </Alert>
        </div>
      ) : null}

      <form noValidate onSubmit={submit} className="mt-6 space-y-6" aria-label="Registrar reparación">
        <p className="text-small text-content-secondary">
          Pedimos tu nombre y tu teléfono para gestionar la reparación y permitir que el taller te identifique y te
          contacte.
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          <TextField
            id="customerName"
            name="customerName"
            label="Nombre del cliente"
            required
            autoComplete="name"
            value={values.customerName}
            onChange={setValue("customerName")}
            onBlur={touch("customerName")}
            error={errorFor("customerName")}
          />
          <TextField
            id="customerPhone"
            name="customerPhone"
            label="Teléfono"
            required
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+51 987 654 321"
            value={values.customerPhone}
            onChange={setValue("customerPhone")}
            onBlur={touch("customerPhone")}
            error={errorFor("customerPhone")}
          />
        </div>
        <TextField
          id="customerEmail"
          name="customerEmail"
          label="Correo electrónico"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={values.customerEmail}
          onChange={setValue("customerEmail")}
          onBlur={touch("customerEmail")}
          error={errorFor("customerEmail")}
        />

        <DeviceTypeSelector
          value={values.deviceType}
          onChange={(value) => {
            setValue("deviceType")(value);
            touch("deviceType")();
          }}
          onBlur={touch("deviceType")}
          error={errorFor("deviceType")}
        />

        <div className="grid gap-6 md:grid-cols-2">
          <TextField
            id="brand"
            name="brand"
            label="Marca"
            required
            value={values.brand}
            onChange={setValue("brand")}
            onBlur={touch("brand")}
            error={errorFor("brand")}
          />
          <TextField
            id="model"
            name="model"
            label="Modelo"
            value={values.model}
            onChange={setValue("model")}
            onBlur={touch("model")}
            error={errorFor("model")}
          />
        </div>

        <div className="space-y-3">
          <TextAreaField
            id="problemDescription"
            name="problemDescription"
            label="Descripción del problema"
            required
            placeholder="Por ejemplo: la pantalla no enciende después de una caída."
            value={values.problemDescription}
            onChange={setValue("problemDescription")}
            onBlur={touch("problemDescription")}
            error={errorFor("problemDescription")}
          />
          <Alert variant="warning" title="La descripción podrá mostrarse en la consulta pública">
            No incluyas contraseñas, PIN, patrones o códigos de desbloqueo, credenciales, información financiera ni otros
            datos sensibles.
          </Alert>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
          <button
            type="submit"
            disabled={disabled}
            aria-describedby={reason ? "submit-reason" : undefined}
            className="transition-soft inline-flex h-11 w-full items-center justify-center rounded-sm bg-primary px-4 text-button text-white hover:bg-primary-hover active:bg-primary-active disabled:cursor-default disabled:bg-surface-secondary disabled:text-content-disabled md:w-auto lg:h-10"
          >
            {pending ? "Registrando…" : "Registrar reparación"}
          </button>
          {reason ? (
            <p id="submit-reason" className="text-small text-content-secondary">
              {reason}
            </p>
          ) : null}
        </div>
      </form>
    </div>
  );
}
