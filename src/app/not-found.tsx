import { ButtonLink } from "./_components/button-link";
import { EmptyState } from "./_components/empty-state";
import { SearchOffIcon } from "./_components/icons";
import { PublicShell } from "./_components/public-shell";

// 404 público (DESIGN.md A.4): estado técnico dentro del layout público, con el patrón de estado vacío.
// El `not-found` raíz atiende también las URL no reconocidas; por eso renderiza el shell público por sí mismo.
// No ofrece «Reintentar» y no muestra detalles técnicos.
export default function NotFound() {
  return (
    <PublicShell>
      <EmptyState
        icon={<SearchOffIcon size={24} />}
        title="Página no encontrada"
        action={<ButtonLink href="/">Volver al inicio</ButtonLink>}
      >
        La página que buscas no existe o ya no está disponible.
      </EmptyState>
    </PublicShell>
  );
}
