# Runbooks mínimos de Production

> CHG-07 D13 y CHG-15 D12. Los tres procedimientos de CHG-07 (migración de esquema, recuperación y *break-glass*) y el aprovisionamiento del administrador son las secciones 1–4; los runbooks **RB-1…RB-9** del TD están indexados y completados al final de este documento. **Rollback de aplicación y recuperación de la base de datos son procedimientos distintos: no se confunden.**

## 1. Migración de esquema

Solo para cambios que incluyen `prisma/migrations/**`. Las migraciones son *forward-only* y *expand/contract*: la migración previa al despliegue es compatible con la versión desplegada y con la nueva (por eso el rollback de aplicación sigue siendo viable). No existe rollback SQL ordinario: se corrige con una migración posterior.

1. PR terminada con `static` y `db-tests` en verde; el SQL generado está revisado a mano.
2. Obtener la identidad del contenido de las migraciones **de la cabeza de la PR**: `npm run ops:migration-identity` (imprime un SHA-256).
3. **Prepaso manual (sensible):** crear en Neon una rama de recuperación `pre-release-<fecha>` desde `main`, con acceso restringido y sin conexión a Preview ni a desarrollo. Se elimina al cerrar la ventana de cambio.
4. Lanzar el workflow `migrate-production` (Actions → *Run workflow* en `main`) con: `source_sha` = commit **completo** de la PR, `migrations_identity` = la identidad del paso 2 y la casilla de rama de recuperación marcada.
5. El job `verify` comprueba, sin secretos, que el commit pertenece a una PR de este repositorio y que la identidad coincide. El job `migrate` espera la **aprobación del Environment `production`**: revisar el SHA y la identidad antes de aprobar.
6. Se ejecutan `prisma migrate deploy` y `prisma migrate status`. Si fallan, **no se fusiona** la PR.
7. Verificar los privilegios del rol runtime: `DATABASE_URL=<runtime de Production> npm run ops:privileges`.
8. Solo entonces fusionar la PR a `main` (Vercel despliega por la integración Git) y ejecutar el smoke: `SMOKE_BASE_URL=https://<Production> npm run test:smoke`.
9. Registrar la evidencia (resumen del job, SHA de Git, despliegue de Vercel) en `PRODUCTION-ENVIRONMENT.md`.

**Invalidez.** La autorización cubre el *contenido* de `prisma/migrations/`, no el SHA (un squash produce otro SHA y puede ser correcto). Cualquier cambio posterior que afecte a esas migraciones, un cambio de la cabeza de la PR o de su base, conflictos, o la entrada de otra migración a `main` **invalida la autorización previa**: se recalcula la identidad y se repite desde el paso 2. Antes de fusionar se vuelve a comprobar que `npm run ops:migration-identity` sobre la cabeza de la PR coincide con lo migrado.

**Auditoría posterior a la fusión.** Tras fusionar, `npm run ops:migration-identity` sobre `main` debe dar la identidad migrada. Una discrepancia no es un lanzamiento exitoso: detener cambios, investigar y usar §3. Solo un tren de migración a la vez (el workflow serializa sin cancelar).

**Prohibido** migrar desde `next build`, `next start`, Vercel, Preview o el runtime, y definir `DIRECT_URL` fuera del Environment `production`.

## 2. Recuperación

1. Incidente: clasificar si es de **aplicación** o de **base de datos**; conservar evidencia (registros, SHA, despliegue).
2. **Aplicación:** *Instant Rollback* de Vercel al despliegue anterior conocido bueno (no revierte la base de datos ni las variables actuales; su elegibilidad depende del plan). Verificar que Production quedó asignado y ejecutar el smoke.
3. **Base de datos (excepcional, manual):** capacidades del proveedor según plan y momento (restauración de rama, *point-in-time restore* o equivalente). **No es el mecanismo habitual para revertir una migración**: lo habitual es una migración correctiva (*roll-forward*).
4. Verificar (smoke y privilegios) y documentar. Riesgo aceptado: no hay respaldo independiente fuera de Neon.

## 3. *Break-glass*

1. Identificar el problema y **congelar** los cambios (no fusionar, no migrar).
2. Conservar evidencia antes de actuar.
3. Elegir entre rollback de aplicación (§2.2) o recuperación de la base de datos (§2.3).
4. **Confirmar el objetivo** (proyecto Neon, rama `main`, despliegue) antes de ejecutar nada.
5. Ejecutar con un rol autorizado, **nunca con el rol runtime**; sin automatizar recuperaciones destructivas.
6. Verificar (smoke y privilegios) y documentar el incidente y la causa.

## 4. Aprovisionamiento y rotación del administrador

> CHG-08 entrega el script; **su ejecución en Production es una operación de lanzamiento** (CHG-15) y no forma parte de CHG-08. El rol runtime (`fixora_app`) nunca crea administradores ni rota contraseñas: solo lee `admin_users`.

1. Tener a mano la conexión **directa** del propietario/migrador de la rama de destino (`DIRECT_URL`) en el entorno del operador; nunca en Vercel ni en el repositorio.
2. Ejecutar `npm run admin:provision -- --environment=<development|production> --email=<correo>`. En `test` solo existe la cuenta ficticia de los E2E (no se aprovisiona a mano).
3. El script muestra el entorno, el destino (con el identificador del endpoint ocultado) y el correo, y exige escribir el nombre del entorno para confirmar. La contraseña se pide de forma interactiva y oculta (de 15 a 128 caracteres; admite espacios y Unicode) y se repite para confirmarla. Nunca se pasa por argumento ni se imprime, igual que el hash.
4. Si ya existe un administrador, el script **rota** su credencial (singleton) e **invalida todas sus sesiones**. Es también el mecanismo de recuperación si se pierde la contraseña (`RIE-10`): no existe recuperación dentro del producto.
5. Guardar la contraseña fuera del repositorio. Production y las demás ramas usan contraseñas distintas.

---

# Runbooks RB-1…RB-9 (CHG-15 D12)

> Procedimientos **operativos**, no producto: sin pantallas, endpoints, funciones de administración, rotación de códigos ni borrado normal. Solo documentan lo que las fuentes fijan (TD §25–§27, PRD, ADR-008…010). No contienen secretos ni comandos destructivos ejecutables sin contexto: todo cambio sobre Production se confirma primero (proyecto Neon, rama `main`, despliegue) y se hace con un rol autorizado, **nunca con el rol runtime**.

| RB | Situación | Dónde |
|---|---|---|
| RB-1 | Rollback de aplicación | §2.2 y RB-1 más abajo |
| RB-2 | Migración fallida o parcial | §1 y RB-2 |
| RB-3 | Recuperación o rotación del administrador | §4 |
| RB-4 | Limitador, `SERVICE_UNAVAILABLE` o problemas de Neon | RB-4 |
| RB-5 | Código de seguimiento potencialmente comprometido | RB-5 |
| RB-6 | Dato personal o sensible publicado por accidente | RB-6 y *break-glass* de privacidad |
| RB-7 | Incidente de seguridad y rotación de credenciales | RB-7 |
| RB-8 | Indisponibilidad o cuota de Neon o Vercel | RB-8 |
| RB-9 | Inundación de solicitudes públicas | RB-9 |

## RB-1 · Rollback de aplicación

1. Confirmar que el problema es de la **aplicación** (no de la base de datos) y conservar la evidencia (SHA, despliegue, registros).
2. En Vercel, *Instant Rollback* al último despliegue conocido bueno (su disponibilidad depende del plan). Probado por el propietario el 2026-10-28 (rollback + *Promote*, ver `PRODUCTION-ENVIRONMENT.md`).
3. La base de datos **no** se revierte: el esquema avanza (*roll-forward*) y las migraciones son compatibles hacia atrás (*expand/contract*), por lo que la versión anterior sigue funcionando.
4. Verificar que Production quedó asignado al despliegue esperado y ejecutar el smoke (`SMOKE_BASE_URL=<Production> npm run test:smoke`).
5. Corregir hacia adelante con una PR normal.

## RB-2 · Migración fallida o parcial

1. Detener la promoción: no fusionar la PR y no relanzar `migrate-production` hasta diagnosticar.
2. Leer el resultado de `prisma migrate deploy` y de `prisma migrate status` del job; conservar la salida (sin secretos).
3. **No editar migraciones ya aplicadas.** Corregir con una migración posterior (*roll-forward*) revisada a mano; recalcular la identidad (`npm run ops:migration-identity`) y repetir §1 desde el paso 2.
4. Si el esquema quedó inconsistente y no se puede avanzar, usar la rama de recuperación `pre-release-<fecha>` creada en el prepaso (§1.3) o la restauración del proveedor (ver §2.3), con confirmación explícita del objetivo.
5. Tras recuperar: privilegios (`npm run ops:privileges` con el rol runtime de Production) y smoke.

## RB-4 · Limitador, `SERVICE_UNAVAILABLE` o problemas de Neon

Síntoma: consulta pública o inicio de sesión responden «servicio no disponible» (**falla cerrada** por diseño, TD §22) o hay arranques lentos tras inactividad (arranque en frío de Neon).

1. Distinguir `SERVICE_UNAVAILABLE` (limitador o base de datos no evaluables) de `RATE_LIMITED` (límite alcanzado: comportamiento normal, bloqueo de 15 min).
2. Revisar el estado de Neon (panel y estado del proveedor) y los registros: el evento `limiter.unavailable` o `infrastructure.failure` indican la causa. No se registran IP ni datos.
3. Neon suspende el cómputo por inactividad y lo reanuda en la primera conexión: tras un periodo de reposo, la primera petición puede tardar o fallar de forma segura; reintentar tras unos segundos. Si persiste, revisar la cuota del plan Free en el panel de Neon.
4. **Nunca desactivar el limitador en silencio** ni añadir un *bypass*: la aplicación no tiene bandera para ello. Una limpieza de emergencia de las tablas del limitador reinicia las defensas y se hace conscientemente, dirigida si se puede identificar el cubo, total solo como último recurso, con el rol operativo.
5. Rotar `RATE_LIMIT_HMAC_SECRET` invalida todas las claves previas: es una medida de seguridad, no un modo de desbloquear usuarios.
6. Verificar con el smoke y documentar.

## RB-5 · Código de seguimiento potencialmente comprometido

El código **no se rota, revoca, reemplaza ni regenera** (`E17`): es la única credencial del cliente y su identidad.

1. Evaluar la exposición real: qué datos públicos muestra (equipo, descripción, estado, diagnóstico y costo según el estado, notas públicas) y que **no** muestra nombre, teléfono ni correo.
2. Revisar los registros **sin buscar el código en claro** (no se registran; revisar patrones de `lookup.rate_limited` y volumen de consultas).
3. Si la descripción o una nota pública contiene información sensible, tratarlo como RB-6 (corregir con «Editar datos» o eliminar la nota pública si la orden está abierta).
4. Si la exposición es relevante y persistente, considerar medidas operativas: informar al cliente por el canal habitual del taller, o retirar temporalmente la demo (ver `RELEASE-READINESS.md`, retiro de la demo).

## RB-6 · Dato personal o sensible publicado por accidente

1. Identificar qué dato, dónde (descripción, diagnóstico, nota pública) y desde cuándo, sin copiarlo a tickets ni registros.
2. **Si es editable desde FIXORA** (orden abierta): corregirlo con «Editar datos», editar el diagnóstico (solo hasta *En diagnóstico*) o eliminar/editar la nota pública; el valor anterior de la descripción y de las notas no se conserva, pero el **historial de diagnóstico sí** guarda sus versiones (ver el *break-glass*).
3. **Si no es editable** (orden final, o el dato está en un historial), usar el procedimiento excepcional *break-glass* de privacidad de abajo, fuera del producto.
4. Documentar el incidente (sin repetir el dato) y revisar si el aviso de demostración fue suficiente.

### *Break-glass* de privacidad (fuera del producto)

Solo privacidad. **No existe** botón, endpoint ni Server Action de borrado. Se ejecuta con el rol propietario/migrador de la rama (nunca el rol runtime), respetando las claves foráneas `RESTRICT`, y exige:

1. **Confirmar el entorno** (proyecto, rama y base) antes de ejecutar nada; ensayar primero en `development`.
2. **Postura de respaldo conocida**: ventana de restauración de Neon (plan Free: 6 h), rama `pre-release-*` vigente, sin respaldo independiente fuera de Neon (riesgo aceptado).
3. ***Dry run***: contar las copias afectadas antes de modificar.
4. **Redacción completa en una transacción**: no basta cambiar el valor vigente; se revisan **todas** las copias: `customer_name` y `customer_name_search`, `customer_phone`, `customer_email`, `problem_description`, `diagnosis` y **`diagnosis_history`** (`previous_value`, `new_value`), el contenido de `order_notes` y cualquier columna derivada. Se conservan los valores no nulos que exigen las restricciones del estado (`diagnosis`). Se incrementa `version` para invalidar confirmaciones abiertas. Los historiales de estado y de costo no contienen datos personales.
5. **Verificación posterior**: consultar que no quedan copias sin redactar y que la consulta pública y el panel siguen funcionando.
6. **Ramas y copias**: revisar todas las ramas activas de Neon, las ramas `pre-release-*`, clones y la política efectiva de recuperación/retención. Las copias gestionadas por el proveedor se documentan y se dejan expirar; **no se afirma que el dato desapareció de inmediato**. Si se restaura una copia, se **reaplica** la redacción antes de volver a servir.

Plantilla ensayada en `development` (2026-10-29) sobre una orden DEMO ficticia, dentro de una transacción que terminó en `ROLLBACK`: el *dry run* contó 4 eventos de estado, 1 de diagnóstico, 1 de costo y 1 nota; tras la redacción, **0 copias residuales** en nombre, búsqueda, historial de diagnóstico y notas; tras el `ROLLBACK` los datos volvieron a su estado inicial.

```sql
-- Sustituir :id por el UUID de la orden. Ejecutar con el rol propietario de la rama CONFIRMADA. No usar el rol runtime.
BEGIN;
-- Dry run: copias afectadas.
SELECT (SELECT count(*) FROM diagnosis_history WHERE order_id = :id) AS diag_hist,
       (SELECT count(*) FROM order_notes WHERE order_id = :id) AS notes;
UPDATE repair_orders
   SET customer_name = '[redactado]', customer_name_search = '[redactado]', customer_phone = '[redactado]',
       customer_email = NULL, problem_description = '[redactado]',
       diagnosis = CASE WHEN diagnosis IS NULL THEN NULL ELSE '[redactado]' END,
       version = version + 1, updated_at = now()
 WHERE id = :id;
UPDATE diagnosis_history
   SET previous_value = CASE WHEN previous_value IS NULL THEN NULL ELSE '[redactado]' END,
       new_value = CASE WHEN new_value IS NULL THEN NULL ELSE '[redactado]' END
 WHERE order_id = :id;
UPDATE order_notes SET content = '[redactado]' WHERE order_id = :id;
-- Verificación: debe devolver 0 en cada columna antes de confirmar.
SELECT (SELECT count(*) FROM repair_orders WHERE id = :id AND (customer_name NOT LIKE '[redactado]%' OR customer_phone NOT LIKE '[redactado]%' OR customer_name_search NOT LIKE '[redactado]%')) AS orden,
       (SELECT count(*) FROM diagnosis_history WHERE order_id = :id AND (coalesce(previous_value,'[redactado]') NOT LIKE '[redactado]%' OR coalesce(new_value,'[redactado]') NOT LIKE '[redactado]%')) AS historial,
       (SELECT count(*) FROM order_notes WHERE order_id = :id AND content NOT LIKE '[redactado]%') AS notas;
-- COMMIT;  ← solo tras revisar la verificación; en el ensayo se terminó con ROLLBACK.
ROLLBACK;
```

## RB-7 · Incidente de seguridad y rotación de credenciales

1. Contener: si hay indicios de compromiso, congelar los cambios (no fusionar ni migrar) y conservar la evidencia.
2. **Secretos y credenciales**, según el alcance: contraseña del administrador (`npm run admin:provision`, §4: rota e invalida todas las sesiones); `RATE_LIMIT_HMAC_SECRET` (invalida las claves del limitador); contraseña del rol `fixora_app` (Neon → actualizar `DATABASE_URL` en Vercel Production y redeplegar); credencial del migrador (`DIRECT_URL` en el Environment `production` de GitHub). Cada secreto vive solo en su ámbito (`PRODUCTION-ENVIRONMENT.md`).
3. **Sesiones**: rotar la credencial del administrador elimina todas las sesiones; no hay otras cuentas.
4. **Despliegue**: si el código es sospechoso, RB-1 y revisar el historial de la rama `main` protegida.
5. **Roles de base de datos**: reverificar con `npm run ops:privileges` (rol runtime de Production).
6. Reverificar con el smoke y, si procede, repetir las comprobaciones relevantes del Security Pass (`docs/08-seguridad/SECURITY-REPORT.md`). Sin SIEM ni SOC: la detección depende de los registros de la plataforma.

## RB-8 · Indisponibilidad o cuota de Neon o Vercel

1. Consultar el estado de cada proveedor y las señales nativas (despliegue, uso, avisos de capacidad de Neon, ejecución de CI).
2. La aplicación puede quedar **degradada**: la consulta y el login fallan cerrados (`SERVICE_UNAVAILABLE`) si el limitador o la base no responden (RB-4); el registro falla de forma segura sin crear órdenes parciales.
3. Cuota agotada (plan Free): esperar al reinicio del ciclo o ampliar el plan de forma consciente; no hay SLA, alta disponibilidad, RPO ni RTO.
4. Al recuperarse: smoke y verificación de privilegios. Registrar el incidente.

## RB-9 · Inundación de solicitudes públicas

`E13` está vigente: el registro **no** tiene CAPTCHA, limitador ni detección de spam (riesgo aceptado `RIE-11`). La consulta y el login sí tienen limitador (TD §22).

1. En operación normal no se hace nada: las solicitudes falsas se cancelan como cualquier orden (`E13`).
2. Ante un incidente activo: medidas **temporales** de plataforma (reglas del Firewall/WAF de Vercel si el plan las ofrece) o **retirada temporal de la demo** (ver `RELEASE-READINESS.md`).
3. Una mitigación **permanente** exigiría revisar `E13` en un nuevo change; no se improvisa desde este runbook.
