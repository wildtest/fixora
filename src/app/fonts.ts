import { Geist, Geist_Mono } from "next/font/google";

// Geist para toda la interfaz; Geist Mono exclusivamente para el código de seguimiento (aún no se usa).
// Fuentes variables: cubren los pesos 400–700 aprobados. Se empaquetan en el build y se sirven desde el propio despliegue (sin CDN en runtime).
export const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
