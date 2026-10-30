import type { ReactNode, SVGProps } from "react";

// Iconos SVG locales (DESIGN.md §5.6, TD §30): contorno, trazo uniforme, `currentColor`.
// Material Symbols Outlined es solo referencia visual; no hay librería ni fuente de iconos.
// Son decorativos junto a texto, por lo que se ocultan a tecnologías de apoyo.

export type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & { size?: number };

export function Icon({ size = 20, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Marca de FIXORA (`build_circle`): llave dentro de un círculo. */
export function LogoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9.25" />
      <path d="M14.8 7.6a3.1 3.1 0 0 0-3.9 3.9l-3.3 3.3a1.2 1.2 0 0 0 1.7 1.7l3.3-3.3a3.1 3.1 0 0 0 3.9-3.9l-1.9 1.9-1.6-.3-.3-1.6 1.9-1.9z" />
    </Icon>
  );
}

/** Entorno demostrativo (`science`). */
export function ScienceIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 3h6" />
      <path d="M10 3v6.2L4.9 18a1.6 1.6 0 0 0 1.4 2.4h11.4a1.6 1.6 0 0 0 1.4-2.4L14 9.2V3" />
      <path d="M7.4 14.5h9.2" />
    </Icon>
  );
}

/** Acceso al taller (`lock`). */
export function LockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="5" y="11" width="14" height="9.5" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </Icon>
  );
}

export function ArrowForwardIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </Icon>
  );
}

/** Búsqueda (`search`): tarjeta de consulta. */
export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="10.5" cy="10.5" r="6.25" />
      <path d="M15.2 15.2L20 20" />
    </Icon>
  );
}

/** Sin resultados (`search_off`): estado 404. */
export function SearchOffIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="10.5" cy="10.5" r="6.25" />
      <path d="M15.2 15.2L20 20" />
      <path d="M4 4l16 16" />
    </Icon>
  );
}

/** Registro (`assignment`): tarjeta de registro de una reparación. */
export function AssignmentIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3h6v1" />
      <path d="M12 10v6" />
      <path d="M9 13h6" />
    </Icon>
  );
}

/** Error (`error`). */
export function ErrorIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9.25" />
      <path d="M12 7v6" />
      <path d="M12 16.5h.01" />
    </Icon>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </Icon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </Icon>
  );
}

/** Visible al cliente (`visibility`): ojo. */
export function VisibilityIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.75" />
    </Icon>
  );
}

/** Cambio de estado (`sync_alt`): dos flechas opuestas. */
export function SyncAltIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 8h14" />
      <path d="M15 5l3 3-3 3" />
      <path d="M20 16H6" />
      <path d="M9 13l-3 3 3 3" />
    </Icon>
  );
}

/** Cambio de diagnóstico (`description`): hoja con líneas. */
export function DescriptionIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 3.5h7l4 4v13H7z" />
      <path d="M14 3.5v4h4" />
      <path d="M9.5 12h5" />
      <path d="M9.5 15.5h5" />
    </Icon>
  );
}

/** Cambio de costo (`payments`): billete. */
export function PaymentsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="6.5" width="18" height="11" rx="1.5" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6.5 9.5v.01" />
      <path d="M17.5 14.5v.01" />
    </Icon>
  );
}

// Iconos locales de la narrativa de PUB-01 (CHG landing-visual-fidelity): mismas reglas que el resto (contorno,
// `currentColor`, decorativos).

/** Pasos y beneficios: equipo (`devices`). */
export function DevicesIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="5" width="13" height="10" rx="1.5" />
      <path d="M1.75 18.5h15.5" />
      <rect x="18" y="9" width="4" height="9" rx="1" />
    </Icon>
  );
}

/** Código (`tag`): almohadilla. */
export function HashIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9.5 4l-1.5 16" />
      <path d="M16 4l-1.5 16" />
      <path d="M4.5 9h15.5" />
      <path d="M4 15h15.5" />
    </Icon>
  );
}

/** Sin cuentas (`no_accounts`): persona tachada. */
export function NoAccountIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="8.5" r="3.25" />
      <path d="M5.5 19.5c.6-3.2 3.2-5 6.5-5s5.9 1.8 6.5 5" />
      <path d="M4 4l16 16" />
    </Icon>
  );
}

/** Trazabilidad (`timeline`): línea con puntos. */
export function TimelineIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="5.5" cy="17" r="1.75" />
      <circle cx="12" cy="8" r="1.75" />
      <circle cx="18.5" cy="14" r="1.75" />
      <path d="M7 15.8l3.8-6" />
      <path d="M13.5 9.2l3.6 3.7" />
    </Icon>
  );
}

/** Protección (`shield`). */
export function ShieldIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.25l7 2.75v5.5c0 4.2-2.9 7.7-7 9.25-4.1-1.55-7-5.05-7-9.25V6z" />
      <path d="M9.25 12l2 2 3.5-3.75" />
    </Icon>
  );
}

/** Comprobado (`check_circle`). */
export function CheckCircleIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9.25" />
      <path d="M8 12.25l2.75 2.75L16 9.5" />
    </Icon>
  );
}
