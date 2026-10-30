## Context

`PUB-01` es presentación pura y estática. La base aprobada (header, aviso demo, hero con insignia, dos tarjetas, claridad técnica, «¿Cómo funciona?», privacidad, pie) se conserva y se enriquece.

## Decisions

- **Ilustraciones como SVG en línea en un módulo propio** (`landing-illustrations.tsx`), con colores de los tokens vía `var(--color-*)`. Alternativa descartada: archivos en `public/` servidos por `<img>`/`next/image`: añade peticiones y obliga a revisar la CSP, y los SVG no podrían usar los tokens. El módulo aísla el marcado para que los componentes de sección sigan legibles.
- **Decorativas y ocultas** (`aria-hidden`), con un pie de figura visible «Ilustración conceptual» que cumple la regla de rotular lo ilustrativo. Sin texto con datos dentro del SVG, sin códigos verosímiles (solo marcadores `•`).
- **Sin gradientes, sin recursos externos, sin librerías de animación.** Paleta: Primary `#0F5FA8` y neutros/semánticos existentes.
- **Servicios**: sección `h2` entre «¿Cómo funciona?» y «Privacidad y control»; cuatro tarjetas (`h3`) en lista con `data-testid="services"`, cada una con número, icono, descripción y un detalle visual propio. Copy limitado al flujo V1: diagnóstico y costo estimado se muestran al cliente «cuando la reparación llega a la etapa correspondiente» (publicación derivada del estado, CHG-11); sin cotización automática, delivery ni servicios inexistentes.
- **Microinteracción**: clase `.lift` (elevación de 2 px y sombra nivel 1 con transición breve) solo bajo `prefers-reduced-motion: no-preference`.
- **Responsive**: hero en dos columnas desde `lg`; en tableta y móvil, copy → ilustración → tarjetas. La ilustración usa `w-full max-w-md` y `viewBox`, sin ancho fijo.

## Risks

- Hero más alto en móvil: se limita el ancho de la ilustración con `max-w` y se verifica a 375/412/820/1024/1440.
