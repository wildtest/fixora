import type { Metadata } from "next";
import {
  LandingClarityBand,
  LandingEntryCards,
  LandingFooter,
  LandingHero,
  LandingHowItWorks,
  LandingPrivacy,
  LandingServices,
} from "../_components/landing-sections";

// PUB-01 — Landing (DESIGN.md §3.1; referencia Stitch aprobada): insignia, lema en dos líneas, dos accesos de igual
// jerarquía, banda de seguimiento ilustrativa, «¿Cómo funciona?», privacidad y control, y pie. El acceso al taller
// vive en la navegación. Todo lo ilustrativo está rotulado como tal y no hay campo de consulta.
// La landing es la única ruta indexable; el valor por defecto del layout raíz es noindex.
export const metadata: Metadata = {
  robots: { index: true, follow: true },
};

export default function LandingPage() {
  return (
    <div>
      <LandingHero />
      <LandingEntryCards />
      <LandingClarityBand />
      <LandingHowItWorks />
      <LandingServices />
      <LandingPrivacy />
      <LandingFooter />
    </div>
  );
}
