# Tasks

> Planificación únicamente. Nada de esto se ejecuta hasta que el change esté revisado, aprobado y el usuario autorice `/opsx:apply` en la Fase 7, **con CHG-01, CHG-02, CHG-03 y CHG-04 aplicados**. No se agregan dependencias. No hay consulta, administración, ciclo de vida ni limitador.

## 1. Preflight y DoR

- [ ] 1.1 Confirmar el DoR (CHG-01…04 aplicados y archivados, AV-1 aprobado para Server Action y Activity/Back, límites de campos aprobados en la spec); se verifica con una nota de aprobación en el change.
- [ ] 1.2 Releer la guía de Server Actions y Cache Components en `node_modules/next/dist/docs/`; se verifica con una nota de decisiones de implementación.

## 2. Validación y dominio

- [ ] 2.1 Implementar `DeviceType` (seis valores), la primitiva pura compartida de normalización del nombre para búsqueda (TD §19: `Muñoz → munoz`; la reutilizará CHG-09a) y los validadores puros por campo con `trim`, rechazo de `U+0000`, límites en caracteres (no bytes), opcionales vacíos como `null`, teléfono por dígitos normalizados (7–15) y correo sintáctico; se verifica con pruebas unitarias de válidos, vacíos, límites exactos y excedidos, Unicode multibyte, teléfonos inválidos y correos inválidos; y, para la primitiva, mayúsculas, tildes, `ñ`, espacios interiores y exteriores.
- [ ] 2.2 Implementar el parseo explícito de `FormData` con allowlist; se verifica con pruebas unitarias de campos extra ignorados y ausentes.

## 3. Código de seguimiento

- [ ] 3.1 Implementar el generador (CSPRNG de `node:crypto`, alfabeto y 12 caracteres exactos, selección sin sesgo); se verifica con pruebas de formato, alfabeto y ausencia de caracteres fuera de rango.
- [ ] 3.2 Implementar el reintento acotado ante colisión; se verifica con una prueba de integración que fuerza una colisión.

## 4. Aplicación y persistencia

- [ ] 4.1 Implementar el caso de uso `registerRepair` y el repositorio de registro (orden con `customer_name_search` calculado por la primitiva compartida + evento inicial + idempotencia en una sola transacción, sin actualización posterior); se verifica con pruebas de integración en PostgreSQL real (estado `SOLICITUD_RECIBIDA`, historial inicial, atomicidad y `customer_name_search` poblado al existir la orden).
- [ ] 4.2 Implementar la idempotencia con `SHA-256(key)`; se verifica con pruebas de replay, de duplicado concurrente y de validación fallida sin consumo de clave.
- [ ] 4.3 Implementar la Server Action adaptadora y el `ActionResult` con códigos propios; se verifica con pruebas de que no se filtran Prisma, SQL ni pila.

## 5. Interfaz PUB-02 y PUB-03

- [ ] 5.1 Implementar el formulario PUB-02 con validación inmediata, resumen y mensajes por campo, aviso de datos personales y de sensibilidad; se verifica con Playwright en móvil y escritorio.
- [ ] 5.2 Implementar PUB-03 con código destacado, «Copiar código», «Consultar estado» y «Volver al inicio»; se verifica con Playwright.
- [ ] 5.3 Implementar el reinicio explícito del estado sensible al salir de `/registrar`; se verifica con Playwright (navegar fuera y Back) y con el resultado de AV-1.

## 6. Privacidad

- [ ] 6.1 Verificar que el código no aparece en URL ni almacenamiento persistente y que los logs no incluyen datos personales; se verifica con pruebas Playwright e inspección de logs con valores canario.

## 7. Trazabilidad y verificación final

- [ ] 7.1 Actualizar `TRACEABILITY.md` (`SC-01`, `SC-16`, `E1`, `E2`, `E3`, `E16`, `E17`, apoyo `E13`); se verifica con `npm run test:trace`.
- [ ] 7.2 Ejecutar `npm run lint`, `typecheck`, `test:unit`, `test:integration`, `test:e2e` y `build`; se verifica con las ejecuciones en verde.
- [ ] 7.3 Revisar el alcance del diff contra la proposal y las specs; se verifica con `git diff` y `openspec validate repair-request-registration --strict`.

## Workflow follow-up

- Revisar y aprobar el change; el usuario autoriza `/opsx:apply` en la Fase 7.
- Archivar tras implementar y verificar: crea las main specs `repair-request-registration` y `public-order-tracking`.
