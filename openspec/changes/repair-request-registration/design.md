# Design

## Context

CHG-05 entrega el primer tramo del recorrido del cliente: registrar una reparación y recibir el código. Consume lo planificado en CHG-01 (`ActionResult`, `runAction`, logger), CHG-02 (esquema físico completo, transacciones, harness de BD de test) y CHG-04 (shell público y aviso demostrativo). No introduce persistencia como capability propia. La spec define el **qué**; este documento fija el **cómo** conforme a `TECHNICAL-DESIGN.md` (§6, §12, §13, §17, §18) sin reabrir decisiones cerradas.

## Goals / Non-Goals

**Goals:** registro atómico, idempotente y privado; código impredecible y único; validación pura reutilizable; confirmación mínima; navegación sin restauración de datos sensibles.

**Non-Goals:** consulta pública y normalización del código (CHG-06), código perdido, transiciones y cancelación (CHG-10), administración, limitador (E13: V1 no limita el registro y no se usa el limitador de CHG-02), CAPTCHA, notificaciones.

## Decisions

### D1. Flujo
PUB-02 (contenedor de cliente) → Server Action adaptadora → parseo explícito de `FormData` con allowlist (nunca `Object.fromEntries` sin allowlist ni `FormData` crudo hacia `application`) → validación pura → caso de uso `registerRepair` → transacción (CHG-02) { orden + evento inicial `NULL→SOLICITUD_RECIBIDA` + asociación de idempotencia } → código → DTO `RegistrationConfirmation` → PUB-03. Server Actions son el transporte; no hay REST. El shell de `/registrar` es estático y consume el layout y el aviso de CHG-04 sin duplicarlos ni añadir casillas.

### D2. Validación
Validadores propios, puros e isomórficos (sin Zod, TD §18), en `domain`/módulo puro, reutilizables por CHG-13. `trim` exterior en campos de negocio; rechazo de `U+0000`. El servidor es la barrera; la validación del cliente es solo ayuda. `DeviceType` es una unión de seis valores validada en servidor. Los mensajes exactos viven en DESIGN/implementación; la spec solo exige identificar el campo, feedback comprensible y no crear orden.

**Límites aprobados (decisión de producto V1, OQ-1 resuelta):**

| Campo | Regla |
|---|---|
| Nombre | obligatorio; tras `trim` 1–100 caracteres (sin mínimo mayor) |
| Teléfono | obligatorio; 7–15 dígitos (ver D2.1) |
| Correo | opcional; vacío tras `trim` → `null`; máx. 254; sintaxis razonable |
| Marca | obligatoria; 1–60 caracteres |
| Modelo | opcional; vacío tras `trim` → `null`; máx. 60 |
| Descripción | obligatoria; 1–2000 caracteres (sin mínimo artificial) |

**Unicode.** Los límites son de **caracteres de texto**, no bytes UTF-8 ni de PostgreSQL; la forma concreta de contarlos es detalle de implementación y no debe penalizar caracteres válidos multibyte. No se añaden restricciones de contenido (solo letras, tildes, apóstrofes, catálogos de marcas) más allá de `U+0000`, controles prohibidos y los límites.

**Opcionales.** Correo y modelo vacíos equivalen a ausencia; conceptualmente nunca `""` como valor significativo (persistencia: `null`, según CHG-02).

### D2.1. Teléfono: entrada vs. dígitos normalizados
- **Entrada cruda/de visualización (raw/display):** lo que escribió el usuario tras `trim`; es lo que se conserva para el taller.
- **Dígitos normalizados:** solo se usan para validar el conteo; se obtienen quitando espacios, `-`, `(`, `)` y un único `+` inicial permitido. Debe haber 7–15 dígitos.
- Se rechazan letras, extensiones, `#`, `*`, más de un `+`, un `+` fuera del inicio y otros símbolos. Sin reglas por país u operador, sin exigir 9 dígitos, sin inferencia de prefijo, sin canonicalización E.164 obligatoria, sin SMS/WhatsApp ni validación externa (V1 no envía notificaciones). El máximo de 15 sigue E.164; el mínimo de 7 es decisión de producto para admitir números locales.

### D2.2. Correo
Validación sintáctica sencilla y acotada (parte local, `@`, dominio con punto, sin espacios), sin una expresión regular que pretenda reproducir RFC 5322; no se verifica dominio, MX, entregabilidad ni titularidad. No se pasa todo a minúsculas indiscriminadamente (podría alterar la parte local). No se envía correo.

### D3. Generador del código
Server-side con CSPRNG de `node:crypto`, alfabeto y longitud exactos de la spec, selección uniforme sin sesgo (rechazo de bytes fuera de rango). Colisión: reintento acotado y `UNIQUE` en BD como segunda barrera. Prohibidos `Math.random`, marcas de tiempo, secuencias y hashes de datos personales. El máximo de reintentos es detalle de implementación. El código se genera dentro de la transacción de registro.

### D4. Idempotencia
La clave es aleatoria y de alta entropía, generada en el cliente por intento y nunca embebida en HTML estático. Solo se persiste `SHA-256(key)` (`key_hash UNIQUE`, `order_id UNIQUE`); la clave cruda no se almacena ni se registra. Sin claves deterministas ni semilla pública. La vida de la asociación es la de la orden. La clave nunca va en URL, cookie persistente, `localStorage` ni `sessionStorage`. Carrera de dos envíos con la misma clave: la transacción y el `UNIQUE` resuelven y se devuelve el resultado original sin excepción interna. Una validación fallida no consume la clave. Replay devuelve la confirmación original (mismo código).

### D5. Persistencia
Repositorio funcional específico de registro en `infrastructure`, sin tipos de Prisma hacia arriba y sin `GenericRepository`. Estado inicial `SOLICITUD_RECIBIDA`; no hay tabla de transiciones, cancelación ni E11 (CHG-10).

### D6. Resultado y errores
`ActionResult` de CHG-01 con códigos tipados mínimos propios: validación (con errores por campo) y fallo inesperado genérico. Sin Prisma, SQL ni pila hacia el cliente.

### D7. Confirmación y privacidad
DTO con allowlist: `RegistrationConfirmation { trackingCode, device { type, brand, model|null } }`; sin nombre, teléfono, correo, UUID, versión ni clave; no reutiliza DTO administrativos (SC-11 preventivo). El código nunca aparece en URL, ruta, query ni fragmento, ni en almacenamiento persistente; no existe ruta `/confirmacion/<código>`. «Consultar estado» usa el código en memoria para abrir PUB-05 sin reescribirlo. No hay recuperación del código tras refrescar.

### D8. Estado sensible y navegación
Con Cache Components la Activity puede conservar estado: no se confía solo en el desmontaje; el estado sensible (formulario, confirmación, clave) se reinicia explícitamente al ocultarse/salir de `/registrar`. AV-1 lo valida; hasta entonces es un comportamiento por verificar, no asumido.

### D9. Logs
Se usa el logger de CHG-01; nunca se registran código, nombre, teléfono, correo, descripción ni `FormData`.

## Risks / Trade-offs

- Los límites de D2 son decisión de producto V1 aprobada en la Fase 6.4 (OQ-1); no están en el PRD y se reflejan solo aquí y en la spec.
- Sin anti-spam por E13 (riesgo aceptado, no se «arregla»).
- PII accidental en texto libre: solo se advierte, no se impide.

## Open Questions

| ID | Pregunta | Clasificación |
|---|---|---|
| OQ-1 | Límites y formatos de campos | **RESUELTA EN FASE 6.4 / CHG-05** (ver D2) |
| OQ-2 | Server Action, Activity/Back, Cache Components, Origin/Host y uso de redirect si lo hubiera | PRE-IMPLEMENTATION AV-1 |
| OQ-3 | Máximo de reintentos por colisión | IMPLEMENTATION DETAIL |
| OQ-4 | Ciclo de vida de la clave cruda en el navegador tras el éxito y conteo Unicode concreto | IMPLEMENTATION DETAIL |
| OQ-5 | Lookup, normalización del código ingresado, código perdido y limitador de consulta | DEFERRED CHG-06 |
| OQ-6 | Restricciones de BD y baseline (dependen de persistence-foundation) | PRE-IMPLEMENTATION AV-2 (cubierto por CHG-02; no se ejecuta aquí) |

## Pruebas planificadas

Unitarias: validadores, `DeviceType`, generador (formato, alfabeto, uniformidad básica), helpers puros. Integración contra PostgreSQL real, sin mocks de Prisma: registro exitoso, estado e historial iniciales, atomicidad, replay, duplicado concurrente, validación sin consumo de clave, colisión/unicidad, constraints, ausencia de persistencia parcial. Playwright (`chromium-desktop`/`chromium-mobile`): render del formulario, validación por campo, registro exitoso, código visible, doble envío, navegar fuera/Back. Evidencia para `SC-01`, `SC-16`, `E1`, `E2`, `E3`, `E16`, `E17` (apoyo `E13`); primer tramo de E2E-01 (cierra CHG-11). `TRACEABILITY.md` se actualiza al implementar.
