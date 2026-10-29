"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useState, useTransition, type ReactNode } from "react";
import { ABSENT_TEXT } from "@/domain/admin/order-detail";
import { DEVICE_TYPE_LABELS, type DeviceType } from "@/domain/repair/device-type";
import { REPAIR_REQUEST_LIMITS, type RepairRequestField } from "@/domain/repair/repair-request";
import { fieldMessage } from "../../../(public)/registrar/messages";
import { Alert } from "../../../_components/alert";
import { ButtonLink } from "../../../_components/button-link";
import { DeviceTypeSelector, TextAreaField, TextField } from "../../../_components/form-fields";
import { saveBasicOrderData } from "./actions";

// Corrección de los datos básicos en ADM-04 (CHG-13 D9). Un solo estado de edición compartido por los dos bloques: el
// equipo y la descripción se editan en el bloque Público; nombre, teléfono y correo, en el Interno; «Guardar cambios» y
// «Cancelar edición» viven en la barra de acciones y NO hay pantalla, modal ni confirmación. El guardado es conjunto y
// atómico (los siete campos o ninguno). `canEdit` es una INDICACIÓN: el servidor recalcula versión, terminalidad y validación.
// El guardado viaja con la versión que la persona REVISÓ al entrar en edición (sin fusión). El código de seguimiento nunca
// es un campo. Sin mutación optimista: el valor vigente proviene del servidor tras `refresh()`. Nunca se registra lo escrito.

export type BasicDataOrder = {
  readonly orderId: string;
  readonly version: number;
  readonly canEdit: boolean;
  readonly customer: { readonly name: string; readonly phone: string; readonly email: string | null };
  readonly device: { readonly type: DeviceType; readonly brand: string; readonly model: string | null };
  readonly problemDescription: string;
};

type Values = Record<RepairRequestField, string>;
type Failure = "STALE_ORDER" | "ORDER_CLOSED" | "SESSION_EXPIRED" | "UNEXPECTED";
type Errors = Partial<Record<RepairRequestField, string>>;

const FAILURES: Record<Failure, { variant: "warning" | "error"; title: string; text: string; refresh: boolean }> = {
  STALE_ORDER: {
    variant: "warning",
    title: "La orden cambió desde que abriste esta pantalla",
    text: "No se guardó nada. Actualiza para ver la información vigente y vuelve a corregir.",
    refresh: true,
  },
  ORDER_CLOSED: { variant: "warning", title: "Esta orden ya no admite cambios", text: "La orden ya fue cerrada. Actualízala para ver su estado actual.", refresh: true },
  SESSION_EXPIRED: { variant: "warning", title: "Tu sesión expiró", text: "La acción no se ejecutó. Inicia sesión nuevamente para continuar.", refresh: false },
  UNEXPECTED: { variant: "error", title: "Ocurrió un problema inesperado.", text: "No se guardó nada. Inténtalo nuevamente.", refresh: true },
};

const primaryButton =
  "transition-soft inline-flex h-11 w-full items-center justify-center rounded-sm bg-primary px-4 text-button text-white hover:bg-primary-hover active:bg-primary-active disabled:cursor-default disabled:bg-surface-secondary disabled:text-content-disabled md:w-auto lg:h-10";
const secondaryButton =
  "transition-soft inline-flex h-11 w-full items-center justify-center rounded-sm bg-primary-subtle px-4 text-button text-primary-active hover:bg-secondary-hover disabled:cursor-default disabled:bg-surface-secondary disabled:text-content-disabled md:w-auto lg:h-10";

type Editor = {
  order: BasicDataOrder;
  editing: boolean;
  values: Values;
  errors: Errors;
  setValue: (field: RepairRequestField, value: string) => void;
};

const Context = createContext<{
  editor: Editor;
  pending: boolean;
  failure: Failure | null;
  notice: string | null;
  start: () => void;
  cancel: () => void;
  save: () => void;
  refresh: () => void;
} | null>(null);

function useBasicData() {
  const value = useContext(Context);
  if (value === null) throw new Error("BasicDataProvider ausente.");
  return value;
}

const initialValues = (order: BasicDataOrder): Values => ({
  customerName: order.customer.name,
  customerPhone: order.customer.phone,
  customerEmail: order.customer.email ?? "",
  deviceType: order.device.type,
  brand: order.device.brand,
  model: order.device.model ?? "",
  problemDescription: order.problemDescription,
});

export function BasicDataProvider({ order, children }: { order: BasicDataOrder; children: ReactNode }) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<Values>(() => initialValues(order));
  const [reviewedVersion, setReviewedVersion] = useState(order.version);
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<Failure | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const pending = saving || refreshing;

  const start = () => {
    setValues(initialValues(order));
    setReviewedVersion(order.version); // la versión REVISADA al entrar en edición
    setErrors({});
    setFailure(null);
    setNotice(null);
    setEditing(true);
  };
  const cancel = () => {
    setEditing(false);
    setErrors({});
    setFailure(null);
  };
  const refresh = () => {
    setFailure(null);
    setEditing(false);
    startRefresh(() => router.refresh());
  };

  async function save() {
    if (pending) return;
    setSaving(true);
    setErrors({});
    setFailure(null);
    setNotice(null);
    try {
      const result = await saveBasicOrderData({ orderId: order.orderId, expectedVersion: reviewedVersion, ...values });
      if (result.ok) {
        setEditing(false);
        setNotice(result.data.changed ? "Datos guardados." : "Sin cambios que guardar.");
        if (result.data.changed) startRefresh(() => router.refresh());
      } else if (result.code === "VALIDATION_FAILED") {
        const next: Errors = {};
        for (const [field, code] of Object.entries(result.fieldErrors ?? {})) {
          next[field as RepairRequestField] = fieldMessage(field as RepairRequestField, code);
        }
        setErrors(next);
        if (Object.keys(next).length === 0) setFailure("UNEXPECTED");
      } else if (result.code === "STALE_ORDER" || result.code === "ORDER_CLOSED" || result.code === "SESSION_EXPIRED") {
        setFailure(result.code);
      } else {
        setFailure("UNEXPECTED");
      }
    } catch {
      setFailure("UNEXPECTED");
    } finally {
      setSaving(false);
    }
  }

  const editor: Editor = {
    order,
    editing,
    values,
    errors,
    setValue: (field, value) => setValues((current) => ({ ...current, [field]: value })),
  };
  return (
    <Context.Provider value={{ editor, pending, failure, notice, start, cancel, save, refresh }}>
      {/* Sin <form> envolvente: el detalle ya contiene otros formularios (diagnóstico, costo, notas) y no pueden anidarse. */}
      <div data-testid="basic-data" data-editing={editing ? "true" : "false"}>
        {children}
      </div>
    </Context.Provider>
  );
}

/** Barra de acciones: «Editar datos» (si la orden está abierta) o «Guardar cambios» / «Cancelar edición», más avisos. */
export function BasicDataBar() {
  const { editor, pending, failure, notice, start, cancel, save, refresh } = useBasicData();
  const spec = failure ? FAILURES[failure] : null;
  return (
    <div className="space-y-3" data-testid="basic-data-bar">
      {editor.editing ? (
        <div className="flex flex-col gap-2 md:flex-row" data-testid="basic-data-actions">
          <button type="button" onClick={save} disabled={pending} className={primaryButton}>
            {pending ? "Guardando…" : "Guardar cambios"}
          </button>
          <button type="button" disabled={pending} onClick={cancel} className={secondaryButton}>
            Cancelar edición
          </button>
        </div>
      ) : editor.order.canEdit ? (
        <div>
          <button type="button" onClick={start} disabled={pending} className={secondaryButton}>
            Editar datos
          </button>
        </div>
      ) : null}
      {notice ? (
        <p role="status" data-testid="basic-data-notice" className="text-small text-success">
          {notice}
        </p>
      ) : null}
      {spec && failure ? (
        <div data-testid="basic-data-failure" data-code={failure}>
          <Alert
            variant={spec.variant}
            role="alert"
            title={spec.title}
            action={
              failure === "SESSION_EXPIRED" ? (
                <ButtonLink href="/admin/acceso">Ir al inicio de sesión</ButtonLink>
              ) : spec.refresh ? (
                <button type="button" onClick={refresh} disabled={pending} className={secondaryButton}>
                  Actualizar orden
                </button>
              ) : undefined
            }
          >
            {spec.text}
          </Alert>
        </div>
      ) : null}
    </div>
  );
}

function ReadOnly({ label, children, testId }: { label: string; children: ReactNode; testId?: string }) {
  return (
    <div>
      <dt className="text-label text-content-secondary">{label}</dt>
      <dd data-testid={testId} className="mt-0.5 whitespace-pre-wrap break-words text-body text-content [overflow-wrap:anywhere]">
        {children}
      </dd>
    </div>
  );
}

const absent = <span className="text-content-muted">{ABSENT_TEXT}</span>;

/** Bloque Público: tipo de equipo, marca, modelo y descripción. */
export function PublicBasicData() {
  const { editor } = useBasicData();
  const { order, editing, values, errors, setValue } = editor;
  if (!editing) {
    return (
      <dl className="space-y-4 px-4 py-4">
        <ReadOnly label="Tipo de equipo">{DEVICE_TYPE_LABELS[order.device.type]}</ReadOnly>
        <ReadOnly label="Marca">{order.device.brand}</ReadOnly>
        <ReadOnly label="Modelo" testId="detail-model">
          {order.device.model ?? absent}
        </ReadOnly>
        <ReadOnly label="Descripción del problema" testId="detail-problem">
          {order.problemDescription}
        </ReadOnly>
      </dl>
    );
  }
  return (
    <div className="space-y-4 px-4 py-4" data-testid="basic-data-public-edit">
      <DeviceTypeSelector value={values.deviceType} onChange={(value) => setValue("deviceType", value)} onBlur={() => undefined} error={errors.deviceType} />
      <TextField id="edit-brand" name="brand" label="Marca" required value={values.brand} onChange={(value) => setValue("brand", value)} onBlur={() => undefined} error={errors.brand} />
      <TextField id="edit-model" name="model" label="Modelo" value={values.model} onChange={(value) => setValue("model", value)} onBlur={() => undefined} error={errors.model} />
      <TextAreaField
        id="edit-problem"
        name="problemDescription"
        label="Descripción del problema"
        required
        value={values.problemDescription}
        onChange={(value) => setValue("problemDescription", value)}
        onBlur={() => undefined}
        error={errors.problemDescription}
        hint={`Hasta ${REPAIR_REQUEST_LIMITS.problemDescription} caracteres.`}
      />
    </div>
  );
}

/** Bloque Interno: nombre, teléfono y correo del cliente. */
export function InternalBasicData() {
  const { editor } = useBasicData();
  const { order, editing, values, errors, setValue } = editor;
  if (!editing) {
    return (
      <dl className="space-y-4">
        <ReadOnly label="Nombre" testId="detail-name">
          {order.customer.name}
        </ReadOnly>
        <ReadOnly label="Teléfono" testId="detail-phone">
          {order.customer.phone}
        </ReadOnly>
        <ReadOnly label="Correo" testId="detail-email">
          {order.customer.email ?? absent}
        </ReadOnly>
      </dl>
    );
  }
  return (
    <div className="space-y-4" data-testid="basic-data-internal-edit">
      <TextField id="edit-name" name="customerName" label="Nombre" required autoComplete="off" value={values.customerName} onChange={(value) => setValue("customerName", value)} onBlur={() => undefined} error={errors.customerName} />
      <TextField id="edit-phone" name="customerPhone" label="Teléfono" required type="tel" inputMode="tel" autoComplete="off" value={values.customerPhone} onChange={(value) => setValue("customerPhone", value)} onBlur={() => undefined} error={errors.customerPhone} />
      <TextField id="edit-email" name="customerEmail" label="Correo" type="email" inputMode="email" autoComplete="off" value={values.customerEmail} onChange={(value) => setValue("customerEmail", value)} onBlur={() => undefined} error={errors.customerEmail} />
    </div>
  );
}
