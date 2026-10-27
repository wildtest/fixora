# Proposal

## Why

FIXORA debe proteger todas las superficies administrativas con autenticación y una sesión controlada por el servidor **antes** de construir el dashboard, la gestión de órdenes y cualquier mutación. Sin esa base, cada change administrativo posterior inventaría su propia forma de decidir quién puede operar, y `SC-12` («las capacidades administrativas no son accesibles sin una sesión válida») no tendría un único punto de verdad.

## What Changes

- **Acceso administrativo** (ADM-01): inicio de sesión con correo y contraseña para el único administrador.
- **Respuesta uniforme** ante credenciales inválidas, sin distinguir correo inexistente de contraseña incorrecta.
- **Protección contra fuerza bruta**: 5 intentos fallidos en 15 minutos bloquean 15 minutos (`RATE_LIMITED`); falla cerrada (`SERVICE_UNAVAILABLE`) si la protección o la capacidad de verificación no están disponibles.
- **Sesión administrativa** opaca, controlada por el servidor: 60 minutos de inactividad y 12 horas absolutas.
- **Autorización** de todas las superficies `/admin/**` y de cada acción administrativa (`SESSION_EXPIRED` si la sesión no es válida), con el patrón reutilizable que consumirán los changes administrativos siguientes.
- **Cierre de sesión** que invalida la sesión en el servidor.
- **Frontera operativa de la cuenta**: un único administrador aprovisionado fuera de la aplicación, sin registro, recuperación ni cambio de contraseña dentro del producto.
- **Entrada administrativa protegida mínima** (frontera de autenticación con cierre de sesión), sin datos de negocio.

## Capabilities

### New Capabilities
- `admin-access`: acceso administrativo seguro y sesión controlada para el único administrador, con exclusión de los visitantes no autenticados.

### Modified Capabilities
Ninguna.

## Impact

- **Documentos que respaldan el cambio:** PRD §4.2 y §5.A, `SC-12`, `E10`, `SC-03` (parcial), `RIE-10`; `DESIGN.md` ADM-01, §4.3–§4.6, §13.3, §13.4; Technical Design §15, §16, §21.3, §21.4, §22, §23; ADR-004 y ADR-007; backlog `CHG-08`.
- **Criterios PRD:** `SC-12` (núcleo), `E10`, `SC-03` (parcial: el inicio de sesión). El resto de `SC-03` es de CHG-09a.
- **Código afectado (cuando se implemente):** `src/app/admin/**` (acceso y entrada protegida), módulos `server-only` de contraseñas, sesiones, autorización y limitador de acceso, `proxy.ts` solo para cabeceras (CSP), script operativo de aprovisionamiento y pruebas.
- **Dependencias:** ninguna nueva (criptografía de `node:crypto`; sin Auth.js ni proveedores).
- **Fuera de alcance:** dashboard, órdenes, búsqueda, filtros, ciclo de vida, diagnóstico, notas y correcciones (CHG-09a en adelante), registro de administradores, recuperación o cambio de contraseña, MFA, múltiples administradores o roles, cierre de todas las sesiones y panel de sesiones. No se ejecuta el Architecture Validation Gate: AV-1 (crítico) y AV-2 son previos a `apply`.
- **Orden:** Hard CHG-02 y CHG-04; soft CHG-03; no depende del tracking público.
