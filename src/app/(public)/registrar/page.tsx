import type { Metadata } from "next";
import { RegisterFlow } from "./register-flow";

// PUB-02 — Registro de una reparación. Shell estático (sin cookies, cabeceras ni datos); el estado vive en el
// contenedor de cliente. Hereda el robots noindex del layout raíz: solo la landing es indexable.
export const metadata: Metadata = {
  title: "Registrar reparación",
};

export default function RegisterPage() {
  return (
    <div className="mx-auto w-full max-w-[720px]">
      <RegisterFlow />
    </div>
  );
}
