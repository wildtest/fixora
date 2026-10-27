# ADR-007 — Seguridad y protección frente a abuso

> Estado: Aceptado
> Fecha: 2026-10-26
> Fase: 5 — Technical Design / Arquitectura
> Relacionado con: [TECHNICAL-DESIGN.md](../TECHNICAL-DESIGN.md) §11, §21, §22 · ADR-002, ADR-003, ADR-004, ADR-005

## Contexto

`SC-11` (nada administrativo en lo público) y `SC-12` (nada administrativo sin sesión) son innegociables. El administrador renderiza texto escrito por clientes anónimos, lo que crea un riesgo de XSS almacenado dirigido a la sesión administrativa. El código de seguimiento es la única credencial de la consulta pública (`RIE-01`) y el acceso administrativo es una sola cuenta. El PRD acepta explícitamente que el registro público no tiene anti-spam (`E13`, `RIE-11`) y delega al Technical Design la protección frente a intentos masivos y abuso (Apéndice A). El Security Pass es un entregable (`SC-18`).

## Problema / fuerzas que condicionan la decisión

- Aplicar defensa en profundidad con medios simples, sin servicios nuevos.
- Una CSP estricta con *nonce* choca con el *shell* estático de Cache Components (ADR-002).
- La limitación de intentos debe funcionar en infraestructura *serverless*, sin estado en memoria compartida.
- Proteger sin permitir que un atacante bloquee al único administrador ni sin almacenar IPs en claro.
- `E13` limita lo que puede hacerse en el registro.

## Alternativas consideradas

### Política de contenido (CSP)
- **C1 — *Nonce* en todas las rutas:** incompatible con el *shell* estático público.
- **C2 — CSP estática con `unsafe-inline` en todas las rutas:** compatible, pero protege poco frente a XSS.
- **C3 — *Nonce* estricto en `/admin/**` y CSP base estática en lo público** *(elegida)*.
- **C4 — CSP basada en SRI:** es experimental en Next; descartada en V1.

### Limitación de intentos
- **PostgreSQL, en tablas separadas** *(elegida)*.
- **Redis/KV externo:** servicio, secretos y dependencia nuevos para este volumen.
- **Memoria de la instancia:** ineficaz en *serverless* (cada instancia tiene su contador).
- **Solo WAF/firewall de la plataforma:** no expresa «intento fallido de código» y depende del plan.

### Identificador del cliente
- **HMAC de la IP con secreto dedicado** *(elegido)*.
- **IP en claro o SHA-256 sin clave:** la IP en claro expone directamente el dato, y un hash sin clave sigue siendo vulnerable a ataques offline de diccionario o fuerza bruta porque el espacio de direcciones es predecible y de entropía limitada. Un HMAC con secreto dedicado impide comprobar candidatos offline sin conocer ese secreto.

### Fallo del limitador
- **Fallar cerrado** *(elegido)*.
- **Fallar abierto:** elimina la defensa anti-enumeración justo cuando la infraestructura falla.

### Registro público
- **Sin controles anti-spam en la aplicación** *(elegido, por `E13`)*.
- **CAPTCHA o limitación en el registro:** contradice la decisión funcional aprobada; exigiría enmendar `E13`.

### Base de datos
- **Rol de aplicación de mínimo privilegio, separado del migrador** *(elegido)*.
- **Un único rol propietario también en runtime:** una inyección o un fallo permitirían operaciones destructivas.

### CSRF
- **Comprobación de origen de Next más cookie `SameSite=Strict`** *(elegida)*.
- **Tokens CSRF propios:** capa adicional sin beneficio demostrado para acciones solo `POST`.

## Decisión

**Principios.** Defensa en profundidad: dominio, versión, transacciones, restricciones, privilegios y pruebas; la separación visual de DESIGN.md no sustituye a los controles del servidor.

**XSS y entrada.** Todo texto de usuario se renderiza como texto; prohibidos `dangerouslySetInnerHTML`, `eval` y `new Function`; sin Markdown, HTML permitido ni auto-enlazado; se rechaza `U+0000`. Se hace cumplir con ESLint.

**CSP.**
- `/admin/**`: árbol dinámico y CSP estricta con *nonce* (`default-src 'self'`; `script-src 'self' 'nonce-…' 'strict-dynamic'`; `object-src 'none'`; `base-uri 'none'`; `form-action 'self'`; `frame-ancestors 'none'`; entre otras), generada por `proxy.ts` solo como infraestructura de cabeceras. `unsafe-eval` solo en desarrollo.
- **Sin respaldo automático a una CSP más débil en `/admin/**`** (en particular, sin `unsafe-inline` como alternativa por defecto): si el Architecture Validation Gate AV-1 muestra incompatibilidad, se detiene el trabajo y se registra una decisión antes de debilitarla.
- Rutas públicas: CSP base estática; `unsafe-inline` solo donde el *shell* de Next lo exija técnicamente; sin orígenes de terceros.
- Ningún recurso de terceros en runtime (ni CDN de fuentes ni de iconos).

**CSRF y transporte.** Solo `POST`; comprobación de `Origin`/`Host`; `SameSite=Strict`; sin endpoints `GET` que muten; sin CORS de negocio; sin token CSRF propio; `bodySizeLimit` explícito muy inferior al valor por defecto (valor en la Spec).

**SQL.** Solo consultas parametrizadas; prohibido `$queryRawUnsafe`/`$executeRawUnsafe` y la concatenación de SQL con datos de usuario.

**`server-only`.** Módulos de base de datos, configuración, sesión, repositorios, limitador, provisioning y criptografía; sin React Taint experimental.

**Cabeceras.** `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy` restrictiva, `Cross-Origin-Opener-Policy`/`Cross-Origin-Resource-Policy: same-origin`, sin `X-Powered-By` ni `X-XSS-Protection`; HSTS lo publica Vercel y solo se verifica. Respuestas administrativas privadas y no almacenables; `noindex` fuera de la landing.

**Base de datos.** Rol de aplicación sin DDL; `repair_orders` sin `DELETE`; historiales y `registration_idempotency` solo `SELECT`/`INSERT`; `admin_users` solo `SELECT`; `order_notes` con `DELETE`. Los `GRANT` van en las migraciones; la contraseña del rol no. Esto no sustituye a `SC-11`.

**Limitación de intentos.**
- **Consulta pública:** 10 intentos fallidos en 10 minutos por clave → bloqueo de 15 minutos; solo cuentan los fallos (formato inválido e inexistente).
- **Login:** 5 intentos fallidos en 15 minutos por clave → bloqueo de 15 minutos; se evalúa antes de `scrypt`; sin bloqueo permanente de la cuenta.
- **Clave:** `HMAC(secreto dedicado, IP normalizada)`; nunca la IP en claro; tablas separadas de las de negocio. La IP se toma de la cabecera documentada de Vercel mediante una abstracción de infraestructura, nunca de `X-Forwarded-For` arbitrario.
- **Falla cerrada** en ambas superficies (`SERVICE_UNAVAILABLE`, distinto de `RATE_LIMITED`).
- **Registro público: `E13` literal** — sin CAPTCHA, limitación, detección de spam ni bloqueo por IP en la aplicación. `E13` se aplica al registro; **no impide proteger la consulta ni el login.**
- **IPv6:** la clave no puede usar sin más la dirección completa si eso permite eludir el límite rotando direcciones dentro del prefijo asignado; la Security Spec define normalización, canonicalización por prefijo y longitud del prefijo tras validar la realidad de Vercel y las redes (`/64` es un punto de partida evaluable, no una decisión congelada).
- Tope pequeño de verificaciones `scrypt` simultáneas por instancia como protección local de recursos, no como control distribuido. Es **acotado** (sin cola ilimitada ni consumo indefinido de memoria): si no puede admitirse una verificación dentro del límite o la espera que fije la Spec, el resultado es `SERVICE_UNAVAILABLE`, nunca `INVALID_CREDENTIALS`. Tamaño y espera quedan para *benchmark* y Spec.

**Cadena de suministro.** Dependencias mínimas y estables, `npm ci`, `npm audit` como puerta, acciones de GitHub fijadas por SHA, permisos mínimos del token.

## Justificación

La CSP estricta se concentra donde el impacto de un XSS es mayor (la sesión administrativa) y donde la exigencia de renderizado dinámico no cuesta nada adicional. La limitación en PostgreSQL reutiliza una pieza ya presente y funciona sin estado en memoria. Fallar cerrado antepone el principio de que la protección contra enumeración no desaparece cuando la infraestructura falla; el coste es disponibilidad, aceptado explícitamente. Para el **rol de aplicación runtime**, los privilegios de PostgreSQL hacen que los historiales sean *append-only* desde la aplicación: puede leer e insertar, pero no actualizar ni eliminar. Los roles propietario/migrador y las operaciones *break-glass* siguen siendo deliberadamente privilegiados y pueden modificar datos cuando el procedimiento operativo lo exige; la garantía es **frente al runtime normal**, no frente a cualquier principal PostgreSQL existente.

## Consecuencias positivas

- Protección por capas, con controles verificables mediante pruebas automatizadas.
- Sin servicios externos de seguridad que operar.
- Datos de abuso minimizados y no vinculados a órdenes ni clientes.

## Consecuencias / trade-offs

- Una caída del limitador o de la base de datos reduce la disponibilidad de la consulta y del login.
- Los usuarios detrás de una IP compartida (redes móviles, el propio taller) pueden verse limitados antes; por eso los umbrales son holgados.
- El registro público sigue expuesto a solicitudes falsas (`RIE-11`, riesgo aceptado).
- El área administrativa paga el coste de renderizado dinámico.
- Dos roles de base de datos suponen una configuración más por entorno.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Ataque distribuido contra la consulta | Entropía de ≈ 54 bits, limitación por clave, defensa gruesa de la plataforma como complemento; revisión en el Security Pass |
| CSP estricta inviable | Gate AV-1; sin debilitamiento automático |
| Inundación de solicitudes (`E13`) | Medidas temporales de emergencia a nivel de plataforma, solo como respuesta a un incidente y no como comportamiento permanente |
| Configuración incorrecta de roles | Pruebas de integración de privilegios; verificación en el despliegue |

## Qué queda deliberadamente fuera

CAPTCHA o limitación en el registro, Redis/KV, WAF como control principal, SRI, tokens CSRF propios, CSP exacta y matcher de `proxy.ts`, expresiones y parámetros finales (Specs), y la auditoría de accesos.

## Condiciones para revisar este ADR

- Se observa **abuso real del registro** que exija revisar `E13`.
- La carga o la distribución del abuso justifican **Redis/KV** o un servicio especializado.
- Se coloca un **proxy o CDN** adicional delante de Vercel (cambia la fuente de la IP y la topología de origen).
- AV-1 demuestra que la CSP estricta es inviable.
- Aparecen nuevos requisitos legales o de privacidad para uso real (`VAL-04`).

## Referencias

- PRD: `SC-11`, `SC-12`, `SC-13`, `SC-18`, `E4`, `E13`, `RIE-01`, `RIE-11`, `RIE-20`, Apéndice A.
- [TECHNICAL-DESIGN.md](../TECHNICAL-DESIGN.md) §11, §21, §22, §29.
- Relacionado con: [ADR-002](ADR-002-renderizado-cache-y-transporte.md), [ADR-003](ADR-003-postgresql-prisma-y-migraciones.md), [ADR-004](ADR-004-autenticacion-y-sesiones.md), [ADR-005](ADR-005-seguimiento-publico-y-privacidad.md).
