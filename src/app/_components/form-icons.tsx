import { Icon, type IconProps } from "./icons";

// Iconos locales de los formularios públicos (DESIGN.md §6.5, §6.9, §13): mismas reglas que `icons.tsx`
// (contorno, trazo uniforme, `currentColor`, decorativos). Sin librería de iconos.

/** `smartphone`. */
export function PhoneDeviceIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="7" y="2.75" width="10" height="18.5" rx="2" />
      <path d="M11 18.25h2" />
    </Icon>
  );
}

/** `tablet_mac`. */
export function TabletDeviceIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4.75" y="3" width="14.5" height="18" rx="2" />
      <path d="M11 18h2" />
    </Icon>
  );
}

/** `laptop`. */
export function LaptopDeviceIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="5" y="5" width="14" height="10" rx="1.5" />
      <path d="M2.75 18.5h18.5" />
    </Icon>
  );
}

/** `desktop_windows`. */
export function DesktopDeviceIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="4" width="18" height="12" rx="1.5" />
      <path d="M9 20h6M12 16v4" />
    </Icon>
  );
}

/** `sports_esports`. */
export function ConsoleDeviceIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7.5 8h9a4.5 4.5 0 0 1 4.4 5.4l-.5 2.4a2.2 2.2 0 0 1-3.8 1l-1.6-1.8h-6l-1.6 1.8a2.2 2.2 0 0 1-3.8-1l-.5-2.4A4.5 4.5 0 0 1 7.5 8z" />
      <path d="M8 10.75v3M6.5 12.25h3" />
      <circle cx="15.75" cy="11.5" r=".6" />
      <circle cx="17.5" cy="13.25" r=".6" />
    </Icon>
  );
}

/** `devices_other`. */
export function OtherDeviceIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2.75" y="5" width="12" height="9" rx="1.5" />
      <path d="M6 18h5M8.5 14v4" />
      <rect x="16.75" y="9" width="4.5" height="9" rx="1.2" />
    </Icon>
  );
}

/** `check`. */
export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Icon>
  );
}

/** `content_copy`. */
export function CopyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="8.75" y="8.75" width="11.5" height="11.5" rx="2" />
      <path d="M15.25 8.75V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.25a2 2 0 0 0 2 2h2.75" />
    </Icon>
  );
}

/** `warning`. */
export function WarningIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.75l9.25 16H2.75l9.25-16z" />
      <path d="M12 10v4.25M12 17.25v.01" />
    </Icon>
  );
}
