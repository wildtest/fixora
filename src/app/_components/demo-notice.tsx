import { ScienceIcon } from "./icons";

// Franja de entorno demostrativo (DESIGN.md §13.8 y §6.11): ancho completo bajo la cabecera, variante Info,
// texto 14, centrada. Preventiva y no obstructiva: sin casilla, consentimiento, modal ni cierre obligatorio.
export function DemoNotice() {
  return (
    <div data-testid="demo-notice" role="note" aria-label="Aviso de entorno de demostración" className="border-b border-info-line bg-info-soft">
      <p className="mx-auto flex w-full max-w-6xl items-center justify-center gap-2 px-4 py-2 text-center text-small text-info-text md:px-6 lg:px-8">
        <span className="shrink-0">
          <ScienceIcon size={18} />
        </span>
        <span>Entorno de demostración. No ingreses datos personales reales ni información sensible.</span>
      </p>
    </div>
  );
}
