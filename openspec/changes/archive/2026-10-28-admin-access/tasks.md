# Tasks

> Planificación únicamente. Nada de esto se ejecuta hasta que el change esté revisado, aprobado y el usuario autorice `/opsx:apply` en la Fase 7, **con CHG-02 y CHG-04 aplicados** (CHG-03 recomendado para las pruebas E2E). No se instalan librerías de autenticación ni se agregan dependencias. No se crea ningún administrador real ni se configura Production. No hay tareas de Dashboard, listados, búsqueda ni órdenes.

## 1. Preflight y decisiones de seguridad

- [x] 1.1 Confirmar el DoR (CHG-02 y CHG-04 archivados, AV-1 y AV-2 aprobados, parámetros de `scrypt` medidos); se verifica con una nota de aprobación en el change.
- [x] 1.2 Releer la guía vigente de `cookies()`, Server Actions, renderizado dinámico, `connection()` y CSP con nonce en `node_modules/next/dist/docs/`; se verifica con una nota de decisiones de implementación.
- [x] 1.3 Medir el candidato `N=2^17, r=8, p=1` (y, si no es viable, una alternativa recomendada vigente de OWASP, documentada y aprobada) con `maxmem` suficiente, longitud de clave y sal (≥ 16 bytes) en Node 24 y el runtime objetivo, junto con el tamaño y la espera del tope de concurrencia; se verifica con la nota de medición (tiempo, memoria) registrada y aprobada antes de implementar. No se degradan parámetros en silencio.

## 2. Primitivas de contraseña

- [x] 2.1 Implementar el hash versionado y autodescriptivo con `scrypt` asíncrono, sal única y comparación de tiempo constante, con su parser estricto; se verifica con pruebas unitarias de codificación, verificación correcta e incorrecta y hashes mal formados.
- [x] 2.2 Implementar el hash ficticio de parámetros equivalentes y el tope de concurrencia acotado (con `SERVICE_UNAVAILABLE` al saturarse); se verifica con pruebas de que el camino del correo inexistente recorre la verificación y de que no hay cola ilimitada.

## 3. Limitador de acceso

- [x] 3.1 Integrar la primitiva de CHG-02 con la política 5 fallos / 15 min / bloqueo 15 min y la derivación del sujeto, consultándola antes de `scrypt`; se verifica con pruebas de integración de bloqueo, reanudación y de que un bloqueado no ejecuta `scrypt`.
- [x] 3.2 Implementar la falla cerrada cuando el limitador no está disponible; se verifica con una prueba de integración que lo fuerza y comprueba `SERVICE_UNAVAILABLE`.

## 4. Sesiones

- [x] 4.1 Implementar el servicio de sesión (token de 256 bits por CSPRNG, solo `SHA-256` persistido, expiración por inactividad y absoluta, *throttling* de `last_seen_at`, limpieza oportunista); se verifica con pruebas unitarias del cálculo de expiración y de integración (el token crudo no se persiste, sesión eliminada, expirada).
- [x] 4.2 Implementar la cookie de producción como cookie de sesión (`__Host-fixora_session`, `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`, sin `Domain`, **sin `Max-Age` ni `Expires`**) y su retirada en logout, y la variante compatible con `localhost` sin degradar Production; se verifica con pruebas de la cabecera `Set-Cookie` y de que una cookie conservada tras expirar la fila no concede acceso.

## 5. Autorización

- [x] 5.1 Implementar `requireAdmin()` (`server-only`, sin `use cache`) y el `AdminContext` opaco, con `SESSION_EXPIRED` uniforme para toda sesión no válida; se verifica con pruebas de integración de sesión válida, inexistente, inventada, expirada y eliminada.
- [x] 5.2 Definir el patrón reutilizable de acción administrativa (`requireAdmin → validar → caso de uso → transacción`) con `SESSION_EXPIRED`; se verifica con una prueba parametrizada de integración de que sin sesión la acción no se ejecuta y no deja estado parcial. No se crea una mutación de depuración.
- [x] 5.3 Configurar el renderizado 100 % dinámico y `noindex` de `/admin/**`, y la CSP con nonce vía `proxy.ts` sin relajarla; se verifica con AV-1 y la inspección de cabeceras.
- [x] 5.4 Crear el *harness* de la matriz de autorización de acciones administrativas (solo infraestructura de pruebas; ningún registro en el producto) que ejecuta cada acción registrada en la matriz sin sesión válida y comprueba `SESSION_EXPIRED`, ausencia de escritura y de estado parcial, de modo que CHG-10, 11, 12 y 13 añadan sus acciones; se verifica con la prueba parametrizada sobre la acción de ejemplo del patrón de 5.2 y la revisión de que no existe un registro de acciones en `src/`.

## 6. Acción de login, logout y UI

- [x] 6.1 Implementar la Server Action de login con comprobación Origin/Host, `cookies()` y `redirect()` en el adaptador y los resultados `INVALID_CREDENTIALS`, `RATE_LIMITED`, `SERVICE_UNAVAILABLE`; se verifica con pruebas de integración y que ninguna respuesta distingue correo inexistente de contraseña incorrecta.
- [x] 6.2 Implementar ADM-01 (campos, estados, envío único y alertas de DESIGN §13.3 y Apéndice A.5, sin recuperación ni «recordarme»); se verifica con Playwright en móvil y escritorio.
- [x] 6.3 Implementar `/admin` protegida con el shell mínimo (marca, aviso demostrativo, estado autenticado, «Cerrar sesión»/«Salir») y el aviso de sesión expirada (DESIGN §13.4), sin datos de negocio; se verifica con Playwright y la revisión de que no hay Dashboard.
- [x] 6.4 Implementar el logout idempotente (elimina la fila, borra la cookie, redirige) y la invariante contra Back/Forward y Activity; se verifica con Playwright.

## 7. Aprovisionamiento

- [x] 7.1 Implementar el script operativo `admin:provision` (contraseña interactiva, política 15–128, mismo hasheador y misma normalización de correo que el login, singleton, confirmación del entorno, rotación que invalida sesiones, credencial operativa privilegiada separada del runtime cuyo rol exacto se valida con CHG-02/AV-2), sin endpoint ni pantalla; se verifica en `development` y `test` con credenciales ficticias y la revisión de que nunca imprime contraseña ni hash.
- [x] 7.2 Preparar la credencial ficticia exclusiva de test para E2E, que no funciona en Production; se verifica con la revisión de CI y del fixture.

## 8. Logs

- [x] 8.1 Emitir solo los eventos del catálogo (`auth.login.failed`, `auth.rate_limited`, `limiter.unavailable`) con el logger de CHG-01; se verifica con pruebas con valores canario de que no aparecen contraseñas, hashes, tokens, cookies, IP en claro ni `FormData`.

## 9. Pruebas y trazabilidad

- [x] 9.1 Completar las pruebas unitarias, de integración y Playwright descritas en `design.md`, incluida la evidencia negativa de `SC-12` (acceso directo, cookie inventada, token inexistente, expirado y sesión eliminada); se verifica con las ejecuciones en verde.
- [x] 9.2 Actualizar `TRACEABILITY.md` con `SC-12` (núcleo), `E10` y `SC-03` (parcial); se verifica con `npm run test:trace`.

## 10. Verificación final

- [x] 10.1 Ejecutar `npm run lint`, `typecheck`, `test:unit`, `test:integration`, `test:e2e` y `build`; se verifica con las ejecuciones en verde.
- [x] 10.2 Revisar el alcance del diff: sin Dashboard, listados, búsqueda, órdenes, roles, registro, recuperación, cambio de contraseña ni librerías de autenticación; se verifica con `git diff` y `openspec validate admin-access --strict`.

## Workflow follow-up

- Revisar y aprobar el change; el usuario autoriza `/opsx:apply` en la Fase 7 con el DoR cumplido.
- Archivar tras implementar y verificar: crea la main spec `admin-access`.
- CHG-09a y los changes administrativos posteriores consumen `requireAdmin()`/`AdminContext`; no rediseñan la autenticación.

## Notas de implementación (2026-10-29)

**Estado: 24/24 tareas completas.** Rama `chg-08-admin-access`. Sin librerías nuevas, sin migraciones, sin cambios en `prisma/` ni en Production.

- **1.1 DoR.** CHG-02 y CHG-04 archivados (también CHG-03 para el E2E); AV-1 y AV-2 PASS; CHG-07 archivado. Los privilegios de `fixora_app` sobre `admin_users` (solo `SELECT`), `admin_sessions` (`SELECT`/`INSERT`/`DELETE` y `UPDATE (last_seen_at)`) y el limitador ya existían (CHG-02), por lo que no hubo migración.
- **1.2 Guía de Next 16.4.3.** Releídos `cookies`, Server Actions (`bodySizeLimit`), `connection()`, `proxy.ts`, la guía de CSP con nonce y «Authentication with Cache Components». Decisiones: `connection()` en el layout `/admin` **fuera** de `<Suspense>` + `instant = false` (AV-1); `proxy.ts` con `matcher` de `/admin/**`; `cookies()` y `redirect()` en el adaptador de la acción, fuera de `runAction`; `serverActions.bodySizeLimit = 64kb`.
- **1.3 Medición de scrypt** (Node 24.22.1, máquina de desarrollo): `N=2^17, r=8, p=1` es **viable**; con el `maxmem` por defecto de Node (32 MiB) la operación se rechaza (`ERR_CRYPTO_INVALID_SCRYPT_PARAMS`), por lo que `maxmem = 2 × (128·N·r) + 1 MiB` (≈ 257 MiB). ≈ 275 ms y ≈ 128 MiB por verificación; 2 en paralelo ≈ 360 ms / 256 MiB; 4 ≈ 490 ms / 512 MiB. Longitud de clave 32 bytes, sal de 16 bytes. Tope de concurrencia: **2** simultáneas por instancia, cola acotada de 4 y espera máxima de 2 s (`SERVICE_UNAVAILABLE` si no cabe). No se degradaron parámetros. **Residuo:** la medición en Vercel (memoria y CPU reales de la función) se confirma al desplegar; hasta entonces el candidato OWASP se mantiene y el tope de 2 acota la memoria a ≈ 256 MiB.
- **2.x–4.x.** `src/infrastructure/security/password-hash.ts` (hash versionado `scrypt$v1$ln=…`, parser estricto, comparación de tiempo constante, hash ficticio), `scrypt-gate.ts`, `src/infrastructure/admin/admin-store.ts`, `src/application/admin/{sign-in,session-service,session-cookie}.ts`. Token de 256 bits (CSPRNG), solo `SHA-256` persistido, vigencia = la menor de 60 min de inactividad y 12 h absolutas, `last_seen_at` con *throttling* de 60 s, limpieza oportunista acotada. Cookie `__Host-fixora_session` (`HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`, sin `Domain`, sin `Max-Age`/`Expires`); `fixora_session` sin `Secure` solo en `next dev`.
- **5.x.** `requireAdmin()` (páginas, redirección al acceso), `guardAdminAction` (`SESSION_EXPIRED`), `AdminContext` opaco, layout dinámico con `noindex` y `src/proxy.ts` (CSP con nonce; además un **307** superficial sin cookie para navegaciones GET, no es autorización). Matriz de autorización: `tests/integration/support/admin-action-matrix.ts` (solo pruebas; ningún registro en `src/`, comprobado por una prueba).
- **6.x.** ADM-01 (`/admin/acceso`), entrada protegida mínima `/admin`, logout idempotente. Se activa «Acceso Taller» en la zona pública (`ENTRY_POINTS.workshop.available = true`) y se adaptan los E2E de CHG-04 que lo daban por deshabilitado, y las de CSP/404 de `/admin/**` (ahora CSP estricta propia y redirección 307 al acceso).
- **7.x.** `scripts/admin-provision.ts` + `npm run admin:provision` (contraseña interactiva oculta, política 15–128, mismo hasheador y normalización, singleton, rotación que invalida sesiones, confirmación del entorno). Credencial ficticia exclusiva de test en `tests/e2e/support/admin.ts`, aprovisionada solo tras la guardia anti-desastre en la rama `test`. Runbook en `docs/09-deploy/RUNBOOKS.md` §4; la ejecución real en Production queda para el lanzamiento (CHG-15).
- **8.1.** Solo `auth.login.failed`, `auth.rate_limited` y `limiter.unavailable`; los inicios y cierres correctos no se registran. Prueba con valores canario.
- **9.x.** Unitarias, de integración (127 en total) y E2E (34 nuevas). `SC-12`, `E10` implementados y `SC-03` parcial en `TRACEABILITY.md`.
- **Observaciones para changes siguientes (no se resuelven aquí).** (1) Con Cache Components la *Activity* de React conserva oculto en el DOM el árbol de la ruta anterior: nada administrativo se muestra tras cerrar sesión (probado), pero los changes con datos sensibles en estado de cliente deben reiniciarlos al ocultarse la ruta. (2) La fuente real de IP (`x-vercel-forwarded-for`) sigue pendiente para CHG-14.
