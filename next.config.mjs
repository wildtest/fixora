const isDevelopment = process.env.NODE_ENV === "development";

// Cabeceras de seguridad de toda la aplicación (TD §21.3; HSTS lo publica Vercel y no se duplica).
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "no-referrer" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

// CSP pública estática, sin nonce y sin orígenes de terceros. AV-1: el shell estático de Next necesita
// `script-src 'unsafe-inline'` para hidratarse; los estilos no lo necesitan. `unsafe-eval` y los WebSockets
// solo en desarrollo. No se aplica a `/admin/**`, que tendrá su CSP estricta con nonce (CHG-08).
const publicCsp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
  `style-src 'self'${isDevelopment ? " 'unsafe-inline'" : ""}`,
  "img-src 'self' data:",
  "font-src 'self'",
  `connect-src 'self'${isDevelopment ? " ws: wss:" : ""}`,
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "frame-src 'none'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // Cuerpo máximo de las Server Actions bajo el predeterminado de 1 MB (CHG-08): los formularios de FIXORA son de texto corto.
  experimental: { serverActions: { bodySizeLimit: "64kb" } },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Todas las rutas salvo `/admin` y `/admin/**`.
      {
        source: "/((?!admin(?:/|$)).*)",
        headers: [{ key: "Content-Security-Policy", value: publicCsp }],
      },
    ];
  },
};

export default nextConfig;
