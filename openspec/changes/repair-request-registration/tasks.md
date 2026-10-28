# Tasks

> Planificación únicamente. Nada de esto se ejecuta hasta que el change esté revisado, aprobado y el usuario autorice `/opsx:apply` en la Fase 7, **con CHG-01, CHG-02, CHG-03 y CHG-04 aplicados**. No se agregan dependencias. No hay consulta, administración, ciclo de vida ni limitador.

## 1. Preflight y DoR

- [x] 1.1 Confirmar el DoR (CHG-01…04 aplicados y archivados, AV-1 aprobado para Server Action y Activity/Back, límites de campos aprobados en la spec); se verifica con una nota de aprobación en el change.
- [x] 1.2 Releer la guía de Server Actions y Cache Components en `node_modules/next/dist/docs/`; se verifica con una nota de decisiones de implementación.

## 2. Validación y dominio

- [x] 2.1 Implementar `DeviceType` (seis valores), la primitiva pura compartida de normalización del nombre para búsqueda (TD §19: `Muñoz → munoz`; la reutilizará CHG-09a) y los validadores puros por campo con `trim`, rechazo de `U+0000`, límites en caracteres (no bytes), opcionales vacíos como `null`, teléfono por dígitos normalizados (7–15) y correo sintáctico; se verifica con pruebas unitarias de válidos, vacíos, límites exactos y excedidos, Unicode multibyte, teléfonos inválidos y correos inválidos; y, para la primitiva, mayúsculas, tildes, `ñ`, espacios interiores y exteriores.
- [x] 2.2 Implementar el parseo explícito de `FormData` con allowlist; se verifica con pruebas unitarias de campos extra ignorados y ausentes.

## 3. Código de seguimiento

- [x] 3.1 Implementar el generador (CSPRNG de `node:crypto`, alfabeto y 12 caracteres exactos, selección sin sesgo); se verifica con pruebas de formato, alfabeto y ausencia de caracteres fuera de rango.
- [x] 3.2 Implementar el reintento acotado ante colisión; se verifica con una prueba de integración que fuerza una colisión.

## 4. Aplicación y persistencia

- [x] 4.1 Implementar el caso de uso `registerRepair` y el repositorio de registro (orden con `customer_name_search` calculado por la primitiva compartida + evento inicial + idempotencia en una sola transacción, sin actualización posterior); se verifica con pruebas de integración en PostgreSQL real (estado `SOLICITUD_RECIBIDA`, historial inicial, atomicidad y `customer_name_search` poblado al existir la orden).
- [x] 4.2 Implementar la idempotencia con `SHA-256(key)`; se verifica con pruebas de replay, de duplicado concurrente y de validación fallida sin consumo de clave.
- [x] 4.3 Implementar la Server Action adaptadora y el `ActionResult` con códigos propios; se verifica con pruebas de que no se filtran Prisma, SQL ni pila.

## 5. Interfaz PUB-02 y PUB-03

- [x] 5.1 Implementar el formulario PUB-02 con validación inmediata, resumen y mensajes por campo, aviso de datos personales y de sensibilidad; se verifica con Playwright en móvil y escritorio.
- [x] 5.2 Implementar PUB-03 con código destacado, «Copiar código», «Consultar estado» y «Volver al inicio»; se verifica con Playwright.
- [x] 5.3 Implementar el reinicio explícito del estado sensible al salir de `/registrar`; se verifica con Playwright (navegar fuera y Back) y con el resultado de AV-1.

## 6. Privacidad

- [x] 6.1 Verificar que el código no aparece en URL ni almacenamiento persistente y que los logs no incluyen datos personales; se verifica con pruebas Playwright e inspección de logs con valores canario.

## 7. Trazabilidad y verificación final

- [x] 7.1 Actualizar `TRACEABILITY.md` (`SC-01`, `SC-16`, `E1`, `E2`, `E3`, `E16`, `E17`, apoyo `E13`); se verifica con `npm run test:trace`.
- [x] 7.2 Ejecutar `npm run lint`, `typecheck`, `test:unit`, `test:integration`, `test:e2e` y `build`; se verifica con las ejecuciones en verde.
- [x] 7.3 Revisar el alcance del diff contra la proposal y las specs; se verifica con `git diff` y `openspec validate repair-request-registration --strict`.

## Notas de implementación (2026-10-28)

- **1.1 DoR.** CHG-01…04 archivados (`main` 62e5139); AV-1 PASS y su verificación pendiente (Server Action, Activity/Back, `not-found`/`error`) quedó cubierta por las pruebas de CHG-04 y de esta change. Límites de campos aprobados en la spec (OQ-1). El usuario autorizó la ejecución autónoma de CHG-05.
- **1.2 Next.** Leída la guía de formularios con Server Actions (`node_modules/next/dist/docs/01-app/02-guides/forms.md`). Decisiones: la Server Action se invoca desde un contenedor de cliente con `FormData` construido explícitamente (allowlist en `application/parse-registration-form.ts`, nunca `Object.fromEntries`); Next verifica Origin/Host; las acciones se despachan en secuencia, por lo que un doble envío llega en orden y el segundo es un replay; la clave de idempotencia se genera en el navegador (`crypto.getRandomValues`, 256 bits) solo después de montar, nunca en el HTML estático.
- **Estructura.** Dominio puro en `src/domain/repair/` (tipos de equipo, validadores, generador del código sin sesgo con fuente inyectada, normalización del nombre de búsqueda, forma de la clave). Caso de uso `registerRepair` y composición de producción en `src/application/`. Repositorio funcional `src/infrastructure/registration/registration-store.ts` con SQL parametrizado: orden (con `customer_name_search` en el mismo `INSERT`) + evento inicial + idempotencia en una transacción. Las unicidades de `tracking_code` y `key_hash` se resuelven con `ON CONFLICT DO NOTHING` (sin depender de excepciones); un envío simultáneo con la misma clave espera al ganador, deshace su transacción y devuelve el resultado original. UI en `src/app/(public)/registrar/`; nuevos campos de formulario, iconos y variantes de alerta (Warning y Success) en `_components`.
- **Acceso activado.** `ENTRY_POINTS.register.available = true` (solo la constante de CHG-05). «Consultar estado» de PUB-03 usa el acceso de consulta, aún sin destino (CHG-06): se muestra deshabilitado con «Disponible próximamente»; el paso del código en memoria hacia PUB-05 es de CHG-06. Se actualizaron las pruebas de CHG-04 que asumían el registro deshabilitado.
- **2.x / 3.x.** 74 pruebas unitarias nuevas (límites exactos y Unicode multibyte en caracteres, teléfono por dígitos normalizados, correo, tipo de equipo, generador, uniformidad, normalización, allowlist del parseo). Cobertura de `domain/` al 100 %.
- **3.2 / 4.x.** 13 pruebas de integración en PostgreSQL real con el rol de aplicación: estado e historial iniciales, `customer_name_search`, clave cruda ausente de toda tabla, replay (incluso con cuerpo distinto), 8 envíos simultáneos con una sola orden y un solo código, órdenes deliberadas independientes, colisión forzada y agotamiento sin residuos, atomicidad (fallo del historial o de la idempotencia deshace todo) y validación sin consumo de clave.
- **4.3 / 6.1.** `registerRepairFromForm` devuelve `INTERNAL_ERROR` genérico y registra solo nombre y código conocido del error, sin nombre, teléfono, correo, descripción, clave ni código (valores canario). La confirmación es un DTO con allowlist (`trackingCode`, tipo, marca y modelo).
- **5.x.** E2E (`chromium-desktop` y `chromium-mobile`, 14 pruebas nuevas por proyecto): campos aprobados y ningún otro, avisos, errores por campo y resumen con valores conservados y botón deshabilitado con motivo, registro con comprobación en la base de pruebas, código solo en memoria (ni URL, ni almacenamiento, ni cookies), copiar código, doble envío real en el navegador, salir y volver (con el formulario a medias también), recarga, texto literal, teclado, sin desbordamiento y objetivos de 44 px.
- **Alcance.** Sin dependencias nuevas ni migraciones. Sin consulta pública, limitador, CAPTCHA ni administración.

## Workflow follow-up

- Revisar y aprobar el change; el usuario autoriza `/opsx:apply` en la Fase 7.
- Archivar tras implementar y verificar: crea las main specs `repair-request-registration` y `public-order-tracking`.
