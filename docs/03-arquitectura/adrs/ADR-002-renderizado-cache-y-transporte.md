# ADR-002 — Renderizado, Cache Components y transporte

> Estado: Aceptado
> Fecha: 2026-10-26
> Fase: 5 — Technical Design / Arquitectura
> Relacionado con: [TECHNICAL-DESIGN.md](../TECHNICAL-DESIGN.md) §6, §12, §16, §18, §21.3 · ADR-001, ADR-005, ADR-007

## Contexto

El scaffold de Next.js 16.4.3 ya tiene `cacheComponents` y `partialPrefetching` activados en `next.config.mjs` sin que hubiera una decisión que los respaldara. FIXORA tiene un área pública (landing, registro, consulta) pensada primero para móvil y un área administrativa protegida. El PRD exige que el cliente vea el estado actualizado tras cada cambio (`SC-04`) y que el código de seguimiento no se exponga innecesariamente (`RIE-01`). El administrador renderiza texto escrito por clientes anónimos, lo que hace relevante una CSP estricta (ADR-007).

## Problema / fuerzas que condicionan la decisión

- Los datos de órdenes cambian y deben mostrarse frescos; cachearlos arriesga mostrar estados o diagnósticos obsoletos o ajenos.
- Una CSP con *nonce* exige renderizado dinámico por petición y, según la documentación de Next 16.4.3, es incompatible con el *shell* estático de Prerendering Parcial (PPR).
- El código de seguimiento es un secreto de lectura: no puede ir en la URL, por lo que la consulta no puede ser una página `GET` con parámetro.
- Una página de Next no puede leer un cuerpo `POST`; las Server Actions son endpoints invocables directamente.
- No hay consumidores externos de una API.

## Alternativas consideradas

### Opción A — Todo dinámico
Más simple, pero renuncia al *shell* estático rápido de las pantallas públicas sin necesidad.

### Opción B — Cache Components/PPR en lo público y `/admin/**` totalmente dinámico *(elegida)*
Aprovecha el *shell* estático donde no hay riesgo y reserva el renderizado dinámico donde la CSP con *nonce* lo exige.

### Opción C — SPA o aplicación orientada al cliente
Traslada lógica al navegador, contradice el principio de que el servidor es la autoridad y complica la protección de datos.

### Opción D — API REST/JSON separada para la interfaz
Superficie pública documentable y consumible por terceros que nadie necesita; exige replicar protecciones (origen, CSRF, métodos) que las Server Actions ya traen.

### Opción E — Route Handlers de negocio junto a las Server Actions
Dos mecanismos paralelos para lo mismo, sin beneficio.

## Decisión

- **App Router; Server Components por defecto.**
- **`cacheComponents` permanece habilitado globalmente.** `partialPrefetching` es una opción del scaffold que depende de `cacheComponents` y solo regula el *prefetch* del *shell* de cada ruta: no es una decisión arquitectónica independiente, aunque su comportamiento de caché en cliente se valida en AV-1.
- **Estado preservado (React Activity).** Con `cacheComponents`, Next.js puede conservar el estado y el DOM de rutas ocultas al navegar, así que **no se depende de que «desmontar» elimine el estado sensible**. `/registrar` y `/consultar` no conservan de forma reutilizable el código de seguimiento, `RegistrationConfirmation`, `PublicOrderView` ni el resultado de una consulta tras abandonar el flujo; la implementación es *Activity-aware* (mecanismo exacto en la Spec, compatible con la versión instalada). Nada de ello va a URL, cookie, `sessionStorage` ni almacenamiento persistente; la recarga vuelve al estado inicial. Se prueba con E2E («consultar → navegar fuera → volver») y se valida en AV-1.
- **Rutas públicas** (`/`, `/registrar`, `/consultar`): *shell* estático compatible con PPR, con las partes dinámicas aisladas detrás de `Suspense`.
- **Los datos de órdenes —públicos y administrativos— y los conteos del Dashboard no se cachean con `use cache`**; este se reserva para contenido realmente estático.
- **`/admin/**` es 100 % dinámico** (con `connection()` o el mecanismo vigente equivalente; no basta con leer cookies dentro de `Suspense`), para que todo el HTML administrativo pueda recibir un *nonce* por petición. Es una **excepción consciente de rendimiento por seguridad**, limitada al área administrativa; no desactiva `cacheComponents`.
- **Server Actions como transporte** de mutaciones, login, logout, la consulta pública por código (el código viaja en el cuerpo) y las lecturas interactivas administrativas cuyos criterios no van en la URL. Son **adaptadores delgados**: autenticación, validación, caso de uso; sin reglas de negocio ni acceso directo a Prisma. No son una frontera de seguridad por sí solas.
- **Sin API REST/JSON de negocio** y sin Route Handlers de negocio en V1; solo podrían aparecer por una necesidad técnica u operativa futura y demostrada.
- **Runtime Node.js.**
- **V1 requiere JavaScript** para la experiencia completa.

## Justificación

La combinación B da lo mejor de ambos mundos en el único lugar donde son compatibles: lo público mantiene un *shell* rápido y lo administrativo, que es dinámico de todos modos por la sesión, paga el coste de la CSP estricta que más protege (un XSS almacenado dirigido al administrador). Usar Server Actions evita construir y proteger una API que nadie consume y deja el código del cliente fuera de la URL.

## Consecuencias positivas

- Datos siempre frescos, sin riesgo de caché compartida con datos de órdenes.
- Superficie de red mínima: ningún endpoint documentado ni consumible por terceros.
- Protecciones incorporadas de las Server Actions (solo `POST`, comprobación de origen, identificadores cifrados).

## Consecuencias / trade-offs

- El área administrativa es más lenta de servir que si tuviera *shell* estático (aceptable para una sola persona).
- La consulta pública es una acción: el resultado es efímero y un *reload* vuelve al formulario (ADR-005).
- No hay funcionamiento sin JavaScript ni acceso programático de terceros.
- Las acciones son endpoints directos: exigen validar, autenticar y no confiar en la UI en cada una (ADR-004, ADR-007).

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| La CSP con *nonce* no funciona con Cache Components aunque `/admin/**` sea dinámico | **Architecture Validation Gate AV-1** (aún no ejecutado). Si falla, **no se debilita la CSP automáticamente**: se detiene el trabajo y se registra una decisión nueva |
| Estado público sensible preservado por Activity al navegar y volver | Limpieza *Activity-aware* de los contenedores, prueba E2E de navegar y volver y validación en AV-1 |
| Datos de órdenes cacheados por error | Regla explícita de no usar `use cache` sobre ellos; revisión y pruebas E2E de frescura |
| Fallos de Server Action por versión antigua tras un despliegue | Mensaje genérico de «la aplicación se ha actualizado» ([DESIGN.md](../../02-diseno/DESIGN.md), Apéndice A) |

## Qué queda deliberadamente fuera

La CSP exacta y su política (ADR-007), el diseño del DTO y de `ActionResult` (Technical Design §17–§18), la organización física del App Router y la estrategia de `refresh()` por acción (Specs).

## Condiciones para revisar este ADR

- AV-1 demuestra que la CSP estricta es incompatible con `/admin/**` dinámico.
- Cambia la semántica de Cache Components o de PPR en una versión mayor de Next.
- Surge la necesidad de **consumidores externos** (integraciones, otra aplicación) que justifique una API.
- El rendimiento del área administrativa deja de ser aceptable.

## Referencias

- PRD: `SC-04`, `RIE-01`, §4.11. DESIGN.md: §3, §4, Apéndice A.
- [TECHNICAL-DESIGN.md](../TECHNICAL-DESIGN.md) §6, §12, §16, §18, §21.3, §29.
- Relacionado con: [ADR-001](ADR-001-arquitectura-aplicacion-y-capas.md), [ADR-005](ADR-005-seguimiento-publico-y-privacidad.md), [ADR-007](ADR-007-seguridad-y-proteccion-frente-abuso.md).
