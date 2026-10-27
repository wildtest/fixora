# Proposal

## Why

Antes de construir los flujos de registro y consulta, FIXORA necesita una **entrada pública coherente** y una **base visual** compartida: una landing que oriente al visitante, una navegación estable, el aviso de entorno demostrativo y respuestas seguras cuando una ruta no existe o algo falla. Sin esa base, cada slice inventaría su propio layout, su propio aviso y su propio manejo de errores públicos, y el sistema visual aprobado en `DESIGN.md` se aplicaría de forma desigual.

## What Changes

- Introducir la **base visual de la interfaz** (tokens de color, tipografía, espaciado y radios del sistema visual aprobado, iconos locales y las primitivas de interfaz estrictamente necesarias).
- Crear el **layout público compartido**: cabecera y navegación pública (escritorio y móvil), contenido y estructura responsive.
- Construir la **landing** (PUB-01) con acceso claro a registrar y a consultar, y el **punto de entrada al taller** como acceso secundario.
- Mostrar el **aviso de entorno demostrativo** de forma visible y no intrusiva.
- Presentar de forma segura la **ruta pública inexistente** y el **error inesperado** público, con salida de recuperación y sin detalles técnicos.
- Aplicar las **correcciones del scaffold** que `TECHNICAL-DESIGN.md` §28 asigna a la UI (idioma, retirada del modo oscuro automático y de la fuente de respaldo, metadatos estáticos) y la configuración base de **cabeceras de seguridad y CSP pública**.

## Capabilities

### New Capabilities
- `public-site-entry`: entrada pública durable de FIXORA: la landing con los puntos de entrada para registrar y consultar, la navegación pública con un punto de entrada al acceso administrativo que no es una acción principal del cliente, el aviso de entorno demostrativo, el manejo seguro de rutas públicas inexistentes y la presentación segura de errores inesperados.

### Modified Capabilities
Ninguna (no existe ninguna main spec todavía).

## Impact

- **Documentos que respaldan el cambio:** PRD §4.1 (landing) y §4.10 (aviso demostrativo); `DESIGN.md` PUB-01, §4.1–§4.3, §5, §6, §13.8, §14, §15 y Apéndice A.2–A.4; Technical Design §6, §21.3, §21.7, §28, §30; ADR-002 (renderizado) y ADR-007 (seguridad); backlog `CHG-04`.
- **Criterios PRD:** aporta evidencia **parcial** de `SC-15` (uso en móvil y escritorio sin desplazamiento horizontal) y atiende `RIE-20` (entorno demostrativo). No cierra `SC-15`: la revisión manual global es de CHG-15.
- **Código afectado (cuando se implemente):** `src/app/` (layout raíz, landing, `not-found`, `error`/`global-error`), módulos de interfaz y estilos, configuración de cabeceras de Next y recursos de iconos locales.
- **Dependencias:** ninguna nueva prevista (tipografía con `next/font`, iconos como SVG locales). Cualquier librería de iconos requeriría una aprobación nueva.
- **Fuera de alcance:** formulario de registro, consulta, seguimiento, administración y login (CHG-05 en adelante), base de datos, máquina de estados, Repair Journey, tablas y diálogos administrativos, un sistema de diseño completo, el logger e `instrumentation.ts` (CHG-01) y la CSP con nonce de `/admin/**` (CHG-08). No se ejecuta el Architecture Validation Gate (AV-1 valida en la Fase 7 el comportamiento real de Cache Components, CSP y errores).
