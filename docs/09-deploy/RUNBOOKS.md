# Runbooks mínimos de Production

> CHG-07 D13. Tres procedimientos: migración de esquema, recuperación y *break-glass*. Los demás RB-1…RB-9 del TD los completa CHG-15. **Rollback de aplicación y recuperación de la base de datos son procedimientos distintos: no se confunden.**

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
