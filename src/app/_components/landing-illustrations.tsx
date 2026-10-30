// Ilustraciones conceptuales de PUB-01 (landing-visual-enhancement). SVG locales, sin gradientes ni recursos
// externos, con los tokens de color del sistema visual. Son decorativas (aria-hidden): el rótulo «ilustrativo»
// lo da el texto que las acompaña. No representan ninguna orden, código ni progreso reales.

const LINE = "var(--color-line)";
const STRONG = "var(--color-line-strong)";
const INK = "var(--color-content-secondary)";
const PRIMARY = "var(--color-primary)";
const SUBTLE = "var(--color-primary-subtle)";
const SURFACE = "var(--color-surface)";
const PANEL = "var(--color-surface-secondary)";
const SUCCESS = "var(--color-success)";
const SUCCESS_SOFT = "var(--color-success-soft)";

function Check({
  x,
  y,
  color = "#fff",
}: {
  x: number;
  y: number;
  color?: string;
}) {
  return (
    <path
      d={`M${x - 4} ${y} l3 3 l5 -6`}
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

/** Equipo + reparación + seguimiento digital: teléfono con checkpoints, portátil, herramienta y tarjeta de código. */
export function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 480 380"
      className="h-auto w-full"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="1"
        y="1"
        width="478"
        height="378"
        rx="12"
        fill={PANEL}
        stroke={LINE}
        strokeWidth="2"
      />
      {/* Rejilla técnica sutil */}
      {[0, 1, 2, 3, 4, 5].map((col) =>
        [0, 1, 2, 3].map((row) => (
          <circle
            key={`${col}-${row}`}
            cx={28 + col * 14}
            cy={28 + row * 14}
            r="1.6"
            fill={STRONG}
            opacity="0.5"
          />
        )),
      )}

      {/* Portátil (equipo en reparación) */}
      <rect
        x="226"
        y="176"
        width="212"
        height="132"
        rx="9"
        fill={SURFACE}
        stroke={INK}
        strokeWidth="2.5"
      />
      <rect x="238" y="188" width="188" height="108" rx="4" fill={PANEL} />
      <path
        d="M208 316 h248 l-14 14 h-220 z"
        fill={SURFACE}
        stroke={INK}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <rect x="320" y="318" width="60" height="4" rx="2" fill={LINE} />
      {/* Contenido neutro de la pantalla: pieza interna y chequeos */}
      <rect
        x="252"
        y="204"
        width="56"
        height="40"
        rx="5"
        fill={SUBTLE}
        stroke={PRIMARY}
        strokeWidth="2"
      />
      <circle
        cx="280"
        cy="224"
        r="9"
        fill="none"
        stroke={PRIMARY}
        strokeWidth="2"
      />
      <circle cx="280" cy="224" r="2.5" fill={PRIMARY} />
      <rect x="324" y="206" width="84" height="7" rx="3.5" fill={LINE} />
      <rect x="324" y="222" width="64" height="7" rx="3.5" fill={LINE} />
      <rect x="324" y="238" width="74" height="7" rx="3.5" fill={LINE} />
      <rect x="252" y="260" width="156" height="8" rx="4" fill={LINE} />
      <rect x="252" y="260" width="92" height="8" rx="4" fill={PRIMARY} />
      <rect x="252" y="276" width="96" height="6" rx="3" fill={LINE} />

      {/* Teléfono con Repair Journey */}
      <rect
        x="64"
        y="64"
        width="160"
        height="276"
        rx="24"
        fill={SURFACE}
        stroke={INK}
        strokeWidth="2.5"
      />
      <rect x="76" y="84" width="136" height="236" rx="12" fill={PANEL} />
      <rect x="120" y="72" width="48" height="6" rx="3" fill={LINE} />
      <line x1="104" y1="126" x2="104" y2="278" stroke={LINE} strokeWidth="3" />
      <line
        x1="104"
        y1="126"
        x2="104"
        y2="200"
        stroke={PRIMARY}
        strokeWidth="3"
      />
      {[126, 164, 202, 240, 278].map((cy, i) => (
        <g key={cy}>
          {i < 2 ? (
            <>
              <circle cx="104" cy={cy} r="11" fill={PRIMARY} />
              <Check x={104} y={cy} />
            </>
          ) : i === 2 ? (
            <>
              <circle
                cx="104"
                cy={cy}
                r="12"
                fill={SURFACE}
                stroke={PRIMARY}
                strokeWidth="3"
              />
              <circle cx="104" cy={cy} r="4.5" fill={PRIMARY} />
            </>
          ) : (
            <circle
              cx="104"
              cy={cy}
              r="10"
              fill={SURFACE}
              stroke={STRONG}
              strokeWidth="2"
            />
          )}
          <rect
            x="126"
            y={cy - 7}
            width={i === 2 ? 66 : 56}
            height="6"
            rx="3"
            fill={i < 3 ? INK : LINE}
            opacity={i < 3 ? 0.75 : 1}
          />
          <rect x="126" y={cy + 3} width="36" height="5" rx="2.5" fill={LINE} />
        </g>
      ))}

      {/* Tarjeta flotante: código de seguimiento (marcadores, no un código real) */}
      <rect
        x="262"
        y="62"
        width="184"
        height="84"
        rx="10"
        fill={SURFACE}
        stroke={LINE}
        strokeWidth="2"
      />
      <rect
        x="262"
        y="66"
        width="184"
        height="84"
        rx="10"
        fill="none"
        stroke={LINE}
        strokeWidth="1"
        opacity="0.6"
      />
      <rect x="276" y="76" width="64" height="16" rx="8" fill={SUBTLE} />
      <circle cx="287" cy="84" r="3" fill={PRIMARY} />
      <rect
        x="295"
        y="81.5"
        width="36"
        height="5"
        rx="2.5"
        fill={PRIMARY}
        opacity="0.55"
      />
      {[0, 1, 2].map((g) =>
        [0, 1, 2, 3].map((d) => (
          <circle
            key={`${g}-${d}`}
            cx={282 + g * 54 + d * 11}
            cy={118}
            r="3.2"
            fill={STRONG}
          />
        )),
      )}
      <circle
        cx="424"
        cy="84"
        r="10"
        fill={SUCCESS_SOFT}
        stroke={SUCCESS}
        strokeWidth="1.5"
      />
      <Check x={424} y={84} color={SUCCESS} />

      {/* Herramienta (destornillador) cruzada sobre el portátil */}
      <g transform="translate(392 118) rotate(38)">
        <rect x="-5" y="0" width="10" height="40" rx="5" fill={PRIMARY} />
        <rect x="-2.5" y="40" width="5" height="40" fill={INK} />
        <path d="M-2.5 80 h5 l-1 8 h-3 z" fill={INK} />
      </g>
      {/* Llave de apoyo */}
      <g transform="translate(420 250) rotate(-28)" opacity="0.95">
        <rect x="-4" y="0" width="8" height="48" rx="4" fill={STRONG} />
        <circle
          cx="0"
          cy="0"
          r="11"
          fill={SURFACE}
          stroke={STRONG}
          strokeWidth="3"
        />
        <path d="M-5 -13 h10 v8 h-10 z" fill={PANEL} />
      </g>
    </svg>
  );
}

/** Paso 01: formulario junto a un equipo. */
export function StepFormArt() {
  return (
    <svg
      viewBox="0 0 160 72"
      className="h-auto w-full"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="10"
        y="8"
        width="64"
        height="56"
        rx="6"
        fill={SURFACE}
        stroke={LINE}
        strokeWidth="2"
      />
      <rect x="20" y="18" width="44" height="6" rx="3" fill={LINE} />
      <rect x="20" y="30" width="34" height="6" rx="3" fill={LINE} />
      <rect x="20" y="44" width="44" height="10" rx="5" fill={PRIMARY} />
      <rect
        x="92"
        y="14"
        width="46"
        height="34"
        rx="5"
        fill={SUBTLE}
        stroke={PRIMARY}
        strokeWidth="2"
      />
      <path
        d="M86 54 h58 l-6 6 h-46 z"
        fill={SURFACE}
        stroke={PRIMARY}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle
        cx="115"
        cy="31"
        r="5"
        fill="none"
        stroke={PRIMARY}
        strokeWidth="2"
      />
    </svg>
  );
}

/** Paso 02: identificador de seguimiento (marcadores). */
export function StepCodeArt() {
  return (
    <svg
      viewBox="0 0 160 72"
      className="h-auto w-full"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="12"
        y="14"
        width="136"
        height="44"
        rx="8"
        fill={SURFACE}
        stroke={LINE}
        strokeWidth="2"
      />
      {[0, 1, 2].map((g) =>
        [0, 1, 2, 3].map((d) => (
          <circle
            key={`${g}-${d}`}
            cx={30 + g * 40 + d * 9}
            cy={36}
            r="2.8"
            fill={STRONG}
          />
        )),
      )}
      <circle
        cx="136"
        cy="14"
        r="10"
        fill={SUCCESS_SOFT}
        stroke={SUCCESS}
        strokeWidth="1.5"
      />
      <Check x={136} y={14} color={SUCCESS} />
    </svg>
  );
}

/** Paso 03: avance de la reparación. */
export function StepTrackArt() {
  return (
    <svg
      viewBox="0 0 160 72"
      className="h-auto w-full"
      aria-hidden="true"
      focusable="false"
    >
      <line x1="26" y1="36" x2="134" y2="36" stroke={LINE} strokeWidth="3" />
      <line x1="26" y1="36" x2="80" y2="36" stroke={PRIMARY} strokeWidth="3" />
      <circle cx="26" cy="36" r="9" fill={PRIMARY} />
      <Check x={26} y={36} />
      <circle
        cx="80"
        cy="36"
        r="10"
        fill={SURFACE}
        stroke={PRIMARY}
        strokeWidth="3"
      />
      <circle cx="80" cy="36" r="3.5" fill={PRIMARY} />
      <circle
        cx="134"
        cy="36"
        r="8"
        fill={SURFACE}
        stroke={STRONG}
        strokeWidth="2"
      />
      <rect x="14" y="52" width="24" height="5" rx="2.5" fill={LINE} />
      <rect x="68" y="52" width="24" height="5" rx="2.5" fill={LINE} />
      <rect x="122" y="52" width="24" height="5" rx="2.5" fill={LINE} />
    </svg>
  );
}
