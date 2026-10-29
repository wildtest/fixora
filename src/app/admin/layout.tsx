import type { Metadata } from "next";
import type { ReactNode } from "react";
import { connection } from "next/server";

// Zona administrativa (CHG-08, D11; AV-1): 100 % dinámica. `connection()` FUERA de cualquier `<Suspense>` más
// `instant = false` evitan el prerenderizado parcial, de modo que cada petición recibe su nonce (la CSP estricta la
// fija `proxy.ts`). Sin caché compartida ni `use cache` para datos de sesión o administrativos, y con noindex.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  await connection();
  return children;
}
