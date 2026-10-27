# ADR-004 — Autenticación y sesiones

> Estado: Aceptado
> Fecha: 2026-10-26
> Fase: 5 — Technical Design / Arquitectura
> Relacionado con: [TECHNICAL-DESIGN.md](../TECHNICAL-DESIGN.md) §15, §16 · ADR-003, ADR-007

## Contexto

El PRD define **un único administrador** con una zona protegida (`SC-12`, innegociable). Quedan fuera de V1 el registro, la recuperación de contraseña dentro del producto, los múltiples roles y las cuentas de cliente (PRD §5). Las credenciales se aprovisionan y recuperan **fuera del producto** (`SUP-08`) y el Technical Design debe documentar cómo (`RIE-10`). Una sesión inválida no debe dejar estado parcial (`E10`). La interfaz de acceso (ADM-01) usa correo y contraseña.

## Problema / fuerzas que condicionan la decisión

- Proteger de forma robusta una única cuenta sin sumar infraestructura innecesaria.
- Poder cerrar sesión de verdad y revocar sesiones al rotar la contraseña.
- Resistir fuerza bruta y enumeración de usuarios sin permitir que un atacante bloquee permanentemente al administrador.
- Toda operación administrativa debe revalidar la sesión; una acción de servidor puede invocarse directamente.

## Alternativas consideradas

### Frameworks y proveedores
- **Auth.js:** resuelve usuarios, sesiones y proveedores, pero la mayor parte de lo que ofrece (OAuth, registro, múltiples cuentas) queda fuera de V1 y añade esquema y abstracción; además se debía verificar que la versión fuera estable.
- **Better Auth:** mismo balance; tablas y flujos propios que habría que desactivar.
- **Clerk o Auth0 (identidad externa):** dependencia, coste y secretos de un tercero para una sola cuenta.
- **Autenticación propia mínima** *(elegida)*.

### Dónde viven las credenciales
- **Tabla `admin_users` sembrada por un script operativo** *(elegida)*: provisión y recuperación en un único procedimiento, integrado con la revocación de sesiones.
- **Variables de entorno:** más simple de arrancar, pero ata los cambios de credencial a un redespliegue.

### Tipo de sesión
- **Sesión opaca almacenada en PostgreSQL** *(elegida)*.
- **Stateless firmada o cifrada** (cookie con los datos): sin consulta por petición, pero cerrar sesión solo borra la cookie y una cookie robada sigue válida hasta expirar.

### Hash de contraseña
- **`scrypt` de `node:crypto`** *(elegido)*: primitiva estable, memory-hard, sin dependencia nativa.
- **Argon2id (paquete externo):** primera recomendación de OWASP, a cambio de una dependencia con binarios nativos entre Windows, CI y Vercel; el Argon2 incorporado recientemente a Node se descartó para V1.
- **bcrypt:** menor resistencia frente a hardware y límite de 72 bytes.

### Autorización en `proxy.ts`
Rechazada como fuente de autorización: la propia documentación de Next lo limita a comprobaciones optimistas.

## Decisión

- **Autenticación propia mínima**, con un único administrador y correo + contraseña. No se usa ningún framework ni proveedor de identidad.
- **`admin_users`** con el correo normalizado (`trim` + minúsculas) y una restricción que impide más de un administrador. El correo solo identifica: V1 no envía, verifica ni recupera por correo.
- **Contraseña** de 15 a 128 caracteres, con espacios y Unicode permitidos, sin reglas de composición ni cambios periódicos, y **sin `trim`**.
- **`scrypt`** con sal única y formato versionado y autodescriptivo, comparación de tiempo constante; parámetros fijados en la Spec tras *benchmark*. Para un correo inexistente se verifica contra un **hash ficticio** equivalente, y ambos fallos devuelven el mismo resultado visible (`INVALID_CREDENTIALS`). El limitador se consulta **antes** de `scrypt` (ADR-007).
- **Sesiones opacas en PostgreSQL:** token aleatorio de **256 bits**; se persiste solo `SHA-256(token)`; **inactividad de 60 minutos y duración absoluta de 12 horas**; la **fila de `admin_sessions` es la autoridad**: una cookie presente no demuestra por sí sola que la sesión sea válida.
- **Cookie** `__Host-fixora_session`, `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`, sin `Domain`, solo con el token.
- **`requireAdmin()`** (`server-only`) revalida token, existencia, expiración absoluta e inactividad en cada página, lectura y acción administrativa; nunca se cachea.
- **Defensa en profundidad estructural:** los casos de uso exclusivamente administrativos exigen en su firma un `AdminContext`, un tipo opaco (*branded*) que normalmente solo emite el módulo `server-only` que ejecuta `requireAdmin()`. Dificulta olvidar la autenticación durante el desarrollo y la revisión, pero **es una barrera estática y no sustituye la comprobación runtime de la sesión**; TypeScript por sí solo no impide un *bypass* deliberado. Una prueba parametrizada sobre las Server Actions administrativas conocidas verifica que, sin sesión, no ejecutan nada y devuelven `SESSION_EXPIRED`.
- **Logout:** elimina la fila de sesión y la cookie y redirige a ADM-01.
- **Provisioning y recuperación externos** mediante un script interactivo (nunca la contraseña por argumento, nunca impresa), que al rotar invalida todas las sesiones.

## Justificación

**La autenticación propia se justifica exclusivamente por el alcance extremadamente reducido de V1:** una cuenta, sin alta de usuarios, sin OAuth, sin recuperación dentro del producto y sin roles. No es un argumento general a favor de implementar autenticación propia en sistemas mayores. Se usan solo primitivas estándar de Node.js (no se implementa criptografía propia). La sesión opaca en base de datos hace verificable `E10` y que cerrar sesión cierre de verdad, a costa de una consulta por petición administrativa, aceptable para una sola persona.

## Consecuencias positivas

- Sin dependencias nuevas ni servicios de identidad.
- Cierre de sesión y rotación efectivos e inmediatos.
- Un único procedimiento de provisión y recuperación.

## Consecuencias / trade-offs

- Hay código de autenticación propio que mantener y probar; las pruebas de autenticación y sesión son prioritarias y forman parte del Security Pass.
- No hay recuperación dentro del producto; perder también el acceso a Neon y Vercel queda fuera del producto (`RIE-10`).
- Un único administrador es un punto único de falla (`RIE-15`).
- Cada petición administrativa consulta la base de datos.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Fuerza bruta y agotamiento de CPU por `scrypt` | Limitador persistente previo, tope local de verificaciones simultáneas, sin bloqueo permanente (ADR-007) |
| Enumeración del correo por diferencias de tiempo | Hash ficticio equivalente (no se promete tiempo constante) |
| Fijación o robo de sesión | Token nuevo por login, almacenamiento solo del hash, cookie `HttpOnly`/`SameSite=Strict` |
| Olvidar `requireAdmin()` en una acción o página nueva | `AdminContext` en la firma de los casos de uso (defensa estática), revisión y prueba parametrizada de acciones sin sesión |
| Sesión válida durante una transacción ya autorizada | `requireAdmin()` inmediatamente antes de la mutación; una transacción autorizada puede terminar |

## Qué queda deliberadamente fuera

Registro, recuperación de contraseña, múltiples usuarios, roles, MFA, OAuth, auditoría de accesos y gestión de cuentas desde FIXORA. Los parámetros exactos de `scrypt` y los detalles de cookie en `localhost` (Specs).

## Condiciones para revisar este ADR

- Aparecen **múltiples usuarios, roles, MFA, federación o SSO**.
- Se exige **recuperación de credenciales** dentro del producto.
- El Security Pass encuentra un riesgo que la autenticación propia no pueda mitigar razonablemente.
- FIXORA evoluciona más allá del alcance V1 descrito.

## Referencias

- PRD: `SC-12`, `E10`, `SUP-08`, `RIE-10`, `RIE-15`, §5.A.
- [TECHNICAL-DESIGN.md](../TECHNICAL-DESIGN.md) §15, §16, §22.
- Relacionado con: [ADR-003](ADR-003-postgresql-prisma-y-migraciones.md), [ADR-007](ADR-007-seguridad-y-proteccion-frente-abuso.md).
