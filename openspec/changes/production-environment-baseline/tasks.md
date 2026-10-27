# Tasks

> Planificación únicamente. Nada de esto se ejecuta hasta que el change esté revisado, aprobado y el usuario autorice `/opsx:apply` en la Fase 7, **con CHG-02 y CHG-03 aplicados** (y CHG-06 recomendado para que el smoke tenga contenido que consultar). Toda configuración de Vercel, Neon o GitHub, creación de secretos, instalación de herramientas y conexión a Production requiere aprobación explícita en el momento. No hay tareas de lógica funcional. AV-3 se ejecuta con el primer despliegue real.

## 1. Preflight de plataforma y toolchain

- [ ] 1.1 Confirmar el DoR (CHG-02 y CHG-03 archivados, AV-2 aprobado, cuentas y aprobaciones de Vercel, Neon y GitHub); se verifica con una nota de aprobación en el change.
- [ ] 1.2 Preflight de Vercel: Node 24, Production Branch, acceso del recurso solo a Production, comportamiento de Preview, elegibilidad de Instant Rollback y región; se verifica con una nota que registra cada capacidad como disponible, no disponible o con alternativa.
- [ ] 1.3 Preflight de Neon: modo de integración de Marketplace, conexiones *pooled* y directa, creación de roles, plan, retención y capacidades de recuperación; se verifica con una nota equivalente.
- [ ] 1.4 Preflight de GitHub: entorno `production`, restricción a `main`, aprobación requerida según el plan, permisos del workflow y mecanismo para validar el SHA exacto; se verifica con una nota equivalente. Si la restricción, la aprobación humana o la prevención de autorevisión no están disponibles, **detener esta parte y solicitar decisión**; no se sustituye por un secreto global, `DIRECT_URL` en Vercel ni una aprobación informal.
- [ ] 1.5 Preflight de toolchain: `prisma migrate deploy` con Prisma 7, `npm ci --ignore-scripts` y carga de configuración (consume la solución de CHG-02/AV-2); se verifica con una nota de decisión.

## 2. Proyecto de Vercel

- [ ] 2.1 Con aprobación (Production pública, sin cuenta ni contraseña para acceder), conectar el proyecto de Vercel a `main` como Production Branch, con Node 24.x alineado con `engines.node` e Install Command `npm ci`; se verifica con la configuración efectiva y un despliegue sin variables de BD.
- [ ] 2.2 Configurar Preview sin credenciales de BD, sin migraciones, sin clones de Production y sin ramas de BD por Preview (la autenticación de Preview es un endurecimiento opcional a evaluar en AV-3 y no condiciona el change; Production permanece pública); se verifica con un Preview de PR que compila, renderiza el *shell* y falla de forma controlada donde se requiere BD.
- [ ] 2.3 Confirmar que no existe `VERCEL_TOKEN` en GitHub ni otro workflow de despliegue; se verifica con la revisión de secretos y workflows.

## 3. Neon Production

- [ ] 3.1 Con aprobación, provisionar el recurso Neon vía Marketplace, restringido a Production cuando se pueda, con la rama `main`; se verifica con la lista de entornos permitidos y la ausencia de acceso desde Preview y Development.
- [ ] 3.2 Auditar las variables inyectadas por la integración y sustituirlas por el rol de aplicación *pooled*; confirmar que no hay propietario ni conexión directa en el runtime; se verifica con el inventario de variables efectivas por entorno.
- [ ] 3.3 Crear el rol de aplicación como paso operativo interactivo (contraseña fuera de migraciones) y aplicar las migraciones iniciales por el flujo definido; se verifica con el estado de migraciones y los privilegios.
- [ ] 3.4 Verificar por catálogo los privilegios del rol runtime (sin DDL, sin `DELETE` de órdenes, sin `UPDATE`/`DELETE` de historiales, sin migrar); se verifica con el resultado de la introspección registrado.

## 4. Aislamiento de secretos

- [ ] 4.1 Cargar `DATABASE_URL` (pooled) y `RATE_LIMIT_HMAC_SECRET` solo en Vercel Production; se verifica con la matriz de D4 y que Preview y Development no los tienen.
- [ ] 4.2 Guardar `DIRECT_URL` del migrador solo en el entorno GitHub `production`, restringido a `main` (o aplicar la alternativa manual aprobada); se verifica con la revisión del entorno y que no existe en Vercel.
- [ ] 4.3 Confirmar que no se versionó ni imprimió ningún secreto; se verifica con detección de secretos y la revisión de registros con valores canario.

## 5. Flujo `migrate-production`

- [ ] 5.1 Crear el workflow manual (`workflow_dispatch`) desde `refs/heads/main`, con entrada de SHA completo, entorno `production`, permisos `contents: read`, acciones fijadas a SHA y Node 24; se verifica con una ejecución de prueba sin cambios de esquema y la revisión del YAML.
- [ ] 5.2 Limitar los pasos a *checkout* exacto, instalación segura, generación necesaria, `prisma migrate deploy` y verificación mínima, sin aplicación, build, pruebas, *seed* ni scripts de la revisión, entregando `DIRECT_URL` solo al paso que lo necesita y con la definición del workflow tomada de `main`; se verifica con la revisión del workflow y el resultado de AV-3.
- [ ] 5.3 Validar el SHA fuente (completo y asociado a la PR aprobada), calcular la identidad del contenido de `prisma/migrations`, registrar la evidencia (SHA, PR, identidad, fecha, resultado) y comprobar que un cambio posterior de migraciones, de cabeza o de base invalida la autorización; se verifica con ejecuciones válida e inválida controladas.
- [ ] 5.4 Incluir la confirmación de la rama de recuperación como prepaso manual; se verifica con una ejecución que se detiene sin confirmación.
- [ ] 5.5 Comprobar que ninguna migración corre en build, arranque, Preview ni runtime; se verifica con la revisión de scripts y configuración.

## 6. Despliegue y smoke

- [ ] 6.1 Desplegar `main` por la integración Git y registrar SHA, despliegue de Vercel, migración, fecha y resultado; se verifica con el registro de evidencia.
- [ ] 6.2 Crear el smoke de infraestructura público y no mutante (Production responde, `/`, aviso demostrativo, `/registrar`, `/consultar`, cabeceras/configuración de Production, sin fallo fatal) y ejecutarlo contra la URL real; se verifica con la ejecución en verde y que no crea órdenes, no consulta códigos inexistentes ni depende de una orden demo. La comprobación de `/admin/**` y la consulta de la orden demo se incorporan después (CHG-08, CHG-15).
- [ ] 6.3 Ejecutar AV-3 con el despliegue real (fuente de IP, variables inyectadas) y registrar el resultado; se verifica con la nota de AV-3.

## 7. Rollback y recuperación

- [ ] 7.1 Redactar en `docs/09-deploy/` los runbooks de migración, de recuperación y *break-glass* (aplicación frente a BD separados); se verifica con la revisión de que no confunden rollback con recuperación.
- [ ] 7.2 Probar el rollback de aplicación en un entorno seguro y verificar el estado de la asignación automática de Production; se verifica con el registro de la prueba.
- [ ] 7.3 Registrar las capacidades reales de recuperación de Neon y el riesgo residual de ausencia de respaldo independiente; se verifica con la nota en `docs/09-deploy/`.

## 8. Verificación final

- [ ] 8.1 Revisar el alcance: sin funcionalidad, tokens de Vercel, monitoreo externo, respaldo propio ni cambios en `src/`, `prisma/` o `package.json`; se verifica con `git diff`.
- [ ] 8.2 Realizar la auditoría posterior a la fusión (el contenido de migraciones en `main` coincide con el autorizado) y registrar la evidencia de `SC-19` (parcial) y de la línea base de `SC-20`; se verifica con la nota en `docs/09-deploy/` y `openspec validate production-environment-baseline --strict`.

## Workflow follow-up

- Revisar y aprobar el change; el usuario autoriza `/opsx:apply` en la Fase 7.
- Al ser `skip_specs`, confirmar el comportamiento del archive sin deltas.
- CHG-15 completa el smoke funcional, el *seed* y los runbooks restantes.
