import type { Metadata } from "next";
import "./globals.css";
import { geistMono, geistSans } from "./fonts";

// Metadatos estáticos. El valor por defecto es noindex; solo la landing lo sobrescribe (TD §28).
export const metadata: Metadata = {
  title: { default: "FIXORA", template: "%s · FIXORA" },
  description: "Gestión y seguimiento de reparaciones de equipos tecnológicos.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
