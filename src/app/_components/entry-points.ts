// Puntos de entrada públicos y su disponibilidad.
//
// Mientras el feature dueño de una ruta no exista, `available` es false: el acceso se muestra pero no
// navega ni simula ninguna operación (se renderiza como control deshabilitado con el motivo visible).
// Cada change activa únicamente su propio acceso:
//   - CHG-05 (registro de reparación)  → `register.available = true` (✓ activado)
//   - CHG-06 (consulta pública)        → `consult.available = true`
//   - CHG-08 (acceso administrativo)   → `workshop.available = true`

export type EntryPointDefinition = {
  readonly href: string;
  readonly label: string;
  readonly available: boolean;
};

export const ENTRY_POINTS = {
  register: { href: "/registrar", label: "Registrar reparación", available: true },
  consult: { href: "/consultar", label: "Consultar estado", available: false },
  workshop: { href: "/admin/acceso", label: "Acceso Taller", available: false },
} as const satisfies Record<string, EntryPointDefinition>;

export const UNAVAILABLE_LABEL = "Disponible próximamente";
