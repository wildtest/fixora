"use client";

import { useEffect, useState, type FormEvent } from "react";
import { TextField } from "../../_components/form-fields";
import { AccessAlert, type AccessFailureCode } from "../_components/access-alert";
import { signInAction } from "./actions";

// ADM-01 como un contenedor de cliente con estados (CHG-08 D13):
//   idle → submitting → (redirige a /admin) | invalid | rate-limited | unavailable | error
// Sin «recordarme», sin inicio social, sin recuperación de contraseña ni ayudas que revelen la cuenta. La
// contraseña vive solo en memoria y se descarta tras un fallo; nunca se guarda en almacenamiento. Con Cache
// Components la Activity puede conservar el estado al ocultarse la ruta, por eso se reinicia al salir.
export function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [failure, setFailure] = useState<AccessFailureCode | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(
    () => () => {
      setEmail("");
      setPassword("");
      setFailure(null);
      setPending(false);
    },
    [],
  );

  async function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (pending) return;
    setPending(true);
    setFailure(null);
    try {
      const result = await signInAction({ email, password });
      // Si el inicio fue válido, la acción redirige y esta línea no llega a ejecutarse.
      setFailure(result.code);
      setPassword("");
      setPending(false);
    } catch {
      setFailure("INTERNAL_ERROR");
      setPassword("");
      setPending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="text-h2 text-content">Acceso al taller</h1>
      <p className="mt-2 text-body text-content-secondary">Ingresa con tu correo y tu contraseña.</p>

      {failure ? (
        <div className="mt-4">
          <AccessAlert
            code={failure}
            onRetry={failure === "SERVICE_UNAVAILABLE" || failure === "INTERNAL_ERROR" ? () => void submit() : undefined}
          />
        </div>
      ) : null}

      <form noValidate onSubmit={submit} className="mt-6 flex flex-col gap-4" aria-label="Acceso al taller">
        <TextField
          id="email"
          name="email"
          label="Correo"
          type="email"
          inputMode="email"
          autoComplete="username"
          value={email}
          onChange={setEmail}
          onBlur={() => undefined}
          required
        />
        <TextField
          id="password"
          name="password"
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          onBlur={() => undefined}
          required
        />
        <button
          type="submit"
          disabled={pending}
          className="transition-soft mt-2 inline-flex h-11 w-full items-center justify-center rounded-sm bg-primary px-4 text-button text-white hover:bg-primary-hover active:bg-primary-active disabled:cursor-default disabled:bg-surface-secondary disabled:text-content-disabled lg:h-10"
        >
          {pending ? "Ingresando…" : "Iniciar sesión"}
        </button>
      </form>
    </div>
  );
}
