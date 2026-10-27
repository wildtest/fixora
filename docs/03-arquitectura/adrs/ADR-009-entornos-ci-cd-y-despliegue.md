# ADR-009 — Entornos, CI/CD y despliegue

> Estado: Aceptado
> Fecha: 2026-10-26
> Fase: 5 — Technical Design / Arquitectura
> Relacionado con: [TECHNICAL-DESIGN.md](../TECHNICAL-DESIGN.md) §11, §25, §26 · ADR-003, ADR-007, ADR-008

## Contexto

El despliegue público de demostración en Vercel es una restricción fija (PRD §4.11, `SC-20`) y el PRD exige un pipeline de integración y entrega continua que ejecute las verificaciones definidas (`SC-19`); el Technical Design decide su alcance. Hay un único desarrollador. La base de datos es Neon con ramas. El runtime de Vercel tiene Node 24 como versión predeterminada para proyectos nuevos y el Node local actual del proyecto es 26.x. En Vercel las variables de entorno están disponibles tanto en el build como en el runtime.

## Problema / fuerzas que condicionan la decisión

- Aplicar migraciones sin ejecutarlas desde el runtime ni con credenciales de propietario disponibles en Vercel.
- Una sola base de pruebas compartida entre ejecuciones de CI.
- La integración de Marketplace de Neon puede inyectar credenciales de propietario y crear ramas por Preview.
- Los Preview deben ser inspeccionables sin exponer producción ni datos.
- Un rollback de aplicación no revierte la base de datos.

## Alternativas consideradas

### Preview
- **P1 — Preview sin acceso a PostgreSQL** *(elegida)*.
- **P2 — Rama Neon `preview` migrada por CI:** previews funcionales, pero otra base con credenciales y otra migración por PR.
- **P3 — Una rama por Preview mediante la integración:** usa credenciales de propietario y contradice el mínimo privilegio.

### Despliegue a producción
- **R1 — Despliegue automático al fusionar en `main` más migración previa con aprobación** *(elegida)*.
- **R2 — Despliegue en espera con promoción:** más piezas y un token de Vercel con poder de promover.

### Migraciones
- **Workflow manual y separado, con SHA exacto** *(elegido)*.
- **Migrar en el build, el arranque o Preview:** acoplan el despliegue a un cambio de esquema sin aprobación y exponen credenciales al runtime.
- **Migración automática sin aprobación:** descartada para producción.

### Esquema ante errores
- **Roll-forward con expand/contract** *(elegido)* frente a rollback ordinario de migraciones.

### Concurrencia de CI sobre la base de pruebas
- **Cola de un grupo de concurrencia** *(elegida)*.
- **Ramas efímeras de Neon por ejecución:** más complejidad por ahora.
- **Sin control:** ejecuciones que se pisan.

### Rol de la base en runtime
- **Rol de aplicación en Vercel y rol migrador solo en el workflow privilegiado** *(elegido)*.
- **Rol propietario en runtime:** descartado (ADR-007).

## Decisión

- **Node 24.x** en `engines.node`, `.nvmrc`, Vercel y GitHub Actions, sin fijar parche; el Node local debe alinearse con 24 antes de implementar. `npm ci` en CI y como Install Command de Vercel; Prisma 7.x estable explícito.
- **Neon con tres ramas** `development`, `test` y `main`, creadas antes de que `main` tenga datos y con contraseñas de rol separadas (ninguna credencial de producción funciona en development o test). Se audita la integración de Marketplace: el `DATABASE_URL` efectivo de producción usa el rol de aplicación *pooled*, y se desactivan las ramas por Preview.
- **GitHub Actions:** job `static` (sin base de datos: lint, typecheck, pruebas con cobertura, trazabilidad, secret scanning, `npm audit`, build sin conexión a PostgreSQL) y job `db-tests` (`needs: static`, entorno `test`: migraciones, integración, build, `next start` y E2E en un solo job), con un grupo de concurrencia con cola para la base compartida. Verificación de que una base vacía llega al esquema actual solo con migraciones. Permisos mínimos del token, acciones por SHA, nunca `pull_request_target`.
- **Producción** en Vercel desde `main`, pública, con `DATABASE_URL` (rol de aplicación) y `RATE_LIMIT_HMAC_SECRET` únicamente. **`DIRECT_URL` no está en Vercel.**
- **Preview P1**, protegidos por Vercel Authentication, sin credenciales de base de datos; un Preview no es un entorno de aceptación funcional.
- **Workflow `migrate-production`:** manual, en un entorno `production` de GitHub, con `DIRECT_URL` del rol migrador solo ahí, sobre un **SHA exacto** aprobado por el propietario. Es una superficie altamente privilegiada: no ejecuta la aplicación, el build, las pruebas ni el seed, y se evalúa `npm ci --ignore-scripts`. La rama de recuperación en Neon es un prepaso manual.
- **Definición del workflow y contenido de migraciones, separados.** La ejecución que recibe `DIRECT_URL` proviene siempre de `refs/heads/main`, y el Environment `production` restringe el acceso al secreto a la rama `main` (*deployment branch protections*). El SHA de migraciones es un *input* distinto, aprobado, que el workflow desde `main` obtiene para aplicar solo las migraciones autorizadas. **Si GitHub no ofrece esa restricción**, no se almacena `DIRECT_URL` en un secreto accesible desde workflows arbitrarios: se usa temporalmente un procedimiento manual desde un *checkout* limpio del SHA aprobado con la credencial obtenida fuera del repositorio, o se revisa la decisión; la comprobación se registra en las validaciones externas de GitHub. No se añade ningún secreto nuevo.
- **Invariante de migraciones:** no «se fusiona exactamente ese SHA» (un *merge*/*squash* puede producir otro). Lo que debe cumplirse es que **el contenido de `prisma/migrations` aplicado antes a Production sea idéntico al que llega a `main` con la fusión**. Si la PR cambia sus migraciones tras aplicarlas, se vuelve a ejecutar `migrate-production`; si `main` cambia y la PR queda desactualizada, se actualiza, se repite la CI y se vuelve a verificar o aplicar el conjunto cuando haga falta. Para V1, **solo puede existir un tren de migración de Production en curso**; la Spec de CI/CD define la mecánica.
- **Puerta preventiva = PR protegida:** sin *push* directo rutinario a `main`, PR obligatoria, `static` y `db-tests` requeridos, rama actualizada respecto de `main` si hay migraciones y sin *force-push*. La CI posterior al *push* y el smoke de Production son **detectivos**; Vercel no espera a una segunda CI.
- **Expand/contract:** cada migración es compatible con la aplicación desplegada; los cambios destructivos van en una migración posterior.
- **Rollback de aplicación** con Instant Rollback de Vercel (no revierte la base de datos ni las variables; verificar luego la asignación automática de Production); **roll-forward** del esquema con una migración correctiva.
- **Smoke de `SC-20`** público y no mutante tras cada despliegue de producción, sin credenciales administrativas en CI; el flujo completo se verifica manualmente en releases significativas, con evidencia en `docs/09-deploy/`.
- **Configuración por capacidad:** un Preview compila sin secretos de base de datos y falla de forma segura al usarla; un *preflight* evita que esto oculte una mala configuración de Production.
- **Entorno `test`:** además de `TEST_DATABASE_URL` y `TEST_DIRECT_URL`, `RATE_LIMIT_HMAC_SECRET` exclusivo de test; las credenciales del administrador E2E son ficticias, exclusivas de test y nunca funcionan en Production. El *preflight* o el Security Pass verifican por introspección de catálogo los privilegios efectivos del rol runtime de Production (sin DDL, sin `DELETE` en `repair_orders`, sin `UPDATE`/`DELETE` en historiales, sin `UPDATE` en `admin_users`).
- **Operación mínima:** `admin:provision` interactivo, `seed:demo` con casos de uso reales (nunca en `test`) y plan de retiro de la demo. El seed **no usa idempotency keys deterministas ni predecibles** (permitirían recuperar un `RegistrationConfirmation`): usa claves aleatorias de alta entropía y la Spec operativa define cómo evitar una segunda carga.

## Justificación

R1 conserva la simplicidad que necesita un único colaborador y mantiene el secreto más sensible (`DIRECT_URL`) fuera de Vercel y de las funciones. Aplicar migraciones antes del código, con la regla expand/contract, hace seguro el rollback de la aplicación sin revertir esquemas. P1 evita otra base con credenciales y no resta evidencia funcional, porque esta proviene de CI sobre `test`, del smoke de producción, del Security Pass y de `SC-20`.

## Consecuencias positivas

- Superficie de credenciales mínima en Vercel; migraciones aprobadas conscientemente.
- Pipeline simple de dos jobs, con la base de pruebas protegida de ejecuciones simultáneas.
- Entornos aislados; rollback de aplicación rápido.

## Consecuencias / trade-offs

- Las migraciones de producción requieren un paso manual previo a fusionar.
- Un despliegue defectuoso queda en vivo hasta hacer rollback.
- El rollback de Instant Rollback depende del plan (en Hobby puede limitarse al despliegue anterior).
- Los Preview no permiten revisar flujos con datos.
- Las ejecuciones de CI con base de datos esperan en cola.
- Hay que alinear manualmente el Node local con 24.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Credenciales de propietario inyectadas por Marketplace | Auditoría de variables efectivas y sustitución por el rol de aplicación |
| Entrega de `DIRECT_URL` a código no confiable | Definición del workflow solo desde `main`, Environment restringido a `main`, SHA de migraciones aprobado como *input* separado, sin forks, mínimo código ejecutado |
| Contenido de migraciones aplicado a Production distinto del que llega a `main` | Invariante sobre el árbol de `prisma/migrations`, PR actualizada, un solo tren de migración |
| Migración incompatible con el código desplegado | Declaración de compatibilidad por PR y regla expand/contract |
| Arranque en frío de Neon en CI | Calentamiento previo y tiempos de espera generosos |
| Fallos de Server Action por versión antigua | Mensaje genérico de actualización; Skew Protection solo si el plan lo ofrece |

## Qué queda deliberadamente fuera

YAML de los workflows, nombres definitivos de secretos y scripts, regiones concretas, herramienta de secret scanning, y ramas efímeras de Neon como dependencia permanente (Specs y validaciones de despliegue).

## Condiciones para revisar este ADR

- Hay **varios colaboradores** o ritmo de cambios que justifique R2.
- La aplicación pasa a **producción real** con datos reales (`VAL-04`).
- Aparecen **varias etapas** (staging) o necesidad de **Preview funcional**.
- El tiempo de CI exige ramas efímeras.
- Un cambio de plan o de proveedor altera protección de despliegues, rollback o logs.

## Referencias

- PRD: `SC-19`, `SC-20`, §4.11, `RIE-16`, `RIE-20`, `VAL-04`.
- [TECHNICAL-DESIGN.md](../TECHNICAL-DESIGN.md) §11, §25, §26.
- Relacionado con: [ADR-003](ADR-003-postgresql-prisma-y-migraciones.md), [ADR-007](ADR-007-seguridad-y-proteccion-frente-abuso.md), [ADR-008](ADR-008-testing-y-calidad.md).
