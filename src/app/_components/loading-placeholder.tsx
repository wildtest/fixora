// Marcador de posición de carga genérica (DESIGN.md A.2): Surface secondary, radio 8 y la altura aproximada del
// bloque que reemplaza, sin texto visible ni spinner. El texto «Cargando…» es solo para tecnologías de apoyo.
// Primitiva para los slices: este change no tiene partes que esperen datos, por lo que aún no se usa.
export function LoadingPlaceholder({ className = "h-24" }: { className?: string }) {
  return (
    <div role="status" className={`rounded-md bg-surface-secondary ${className}`}>
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
