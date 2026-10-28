import type { Metadata } from "next";
import { TrackFlow } from "./track-flow";

// PUB-04 — Consultar reparación. Shell estático; el estado vive en el contenedor de cliente. Hereda el robots
// noindex del layout raíz: solo la landing es indexable. El código nunca va en la ruta ni en la query.
export const metadata: Metadata = {
  title: "Consultar reparación",
};

export default function TrackPage() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <TrackFlow />
    </div>
  );
}
