# ADR-010 — Observabilidad y operación

> Estado: Aceptado
> Fecha: 2026-10-26
> Fase: 5 — Technical Design / Arquitectura
> Relacionado con: [TECHNICAL-DESIGN.md](../TECHNICAL-DESIGN.md) §23, §26, §27 · ADR-005, ADR-007, ADR-009

## Contexto

FIXORA V1 se despliega como demostración pública en Vercel, mantenida por una persona. El PRD excluye la auditoría completa, el historial de accesos y de acciones generales (§5.H), no registra autor de cambios y acepta que la demo pueda recibir datos reales de terceros aun con avisos (`RIE-20`, `VAL-04`). Los Runtime Logs de Vercel son efímeros y su retención depende del plan; los *log drains* no están confirmados en el plan actual. Los datos personales, los códigos de seguimiento y las credenciales no deben terminar en logs.

## Problema / fuerzas que condicionan la decisión

- Poder diagnosticar fallos e incidentes de seguridad sin construir una auditoría encubierta.
- Evitar que registrar errores filtre datos personales, secretos o códigos (los mensajes de errores de base de datos pueden incluir valores de parámetros).
- No añadir servicios, scripts de terceros ni políticas de datos nuevas para una demostración.
- Tener procedimientos para incidentes que la aplicación no resuelve por sí sola.

## Alternativas consideradas

- **Logger propio mínimo** *(elegido)*.
- **Pino o Winston:** potentes pero con una dependencia y configuración que no aportan a este volumen; el control del esquema y la redacción es lo que importa.
- **`console.*` libre:** sin esquema, cualquiera puede registrar cualquier dato.
- **Sentry:** introduciría un proveedor adicional y un nuevo flujo de datos de diagnóstico hacia un tercero; si se utilizara instrumentación en navegador, podría requerir además nuevos orígenes en la CSP según la configuración. No se justifica para V1.
- **OpenTelemetry:** dependencias y superficie sin necesidad en V1.
- **Analytics (Vercel Web Analytics, Speed Insights, Google Analytics):** inyectan scripts y abren una política de datos nueva.
- **Auditoría completa de accesos y acciones:** excluida expresamente por el PRD.
- **Log Drain o monitor de disponibilidad externo:** coste y dependencia sin requisito.

## Decisión

- **Logger propio, mínimo y `server-only`:** JSON estructurado a stdout/stderr, **esquema cerrado y tipado** (`timestamp`, `level`, `event`, `requestId`, `surface`, `resultCode?`, `durationMs?`, `orderId?`, `environment?`, `deploymentSha?`), sin campo de mensaje libre ni objetos arbitrarios; no se serializan errores, `FormData`, `Request`, cabeceras, modelos de Prisma, DTO ni objetos de dominio. `no-console` como error de ESLint fuera del logger y de scripts autorizados.
- **Niveles:** `error`, `warn`, `info` y `debug` (este último solo en desarrollo y pruebas).
- **No es una auditoría:** no se registran rutinariamente logins correctos, logouts, registros creados o repetidos, consultas correctas o incorrectas ni transiciones o ediciones correctas. Lo que debe persistir ya vive en los tres historiales de negocio. El catálogo de eventos es cerrado y orientado a fallo, seguridad o degradación (p. ej. fallo de login, límites alcanzados, limitador no disponible, colisión del código, acción desactualizada, fallo de infraestructura, configuración inválida).
- **Nunca se registran** contraseñas, hashes, tokens, cookies, identificadores o hashes de sesión, **códigos de seguimiento**, claves de idempotencia, términos de búsqueda, nombres, teléfonos, correos, descripciones, diagnósticos, notas, valores de formularios ni parámetros SQL. El UUID de una orden se trata como un identificador pseudónimo correlacionable: solo cuando sea realmente útil.
- **`requestId`** tomado del identificador de Vercel (`x-vercel-id`) cuando exista, o generado en local y pruebas; nunca una cabecera de correlación proporcionada por el cliente. `error.digest` es un concepto distinto y solo se registra si existe.
- **Errores:** en producción solo campos en lista blanca (nombre de la clase, un código conocido y seguro de Prisma/PostgreSQL, `digest`, `requestId`, tipo y patrón de ruta, SHA del despliegue). **Nunca** `error.message`, `cause`, pila cruda, consulta, parámetros ni cuerpo. `onRequestError` registra errores de servidor sin la ruta completa, la consulta, las cabeceras ni las cookies. Una frontera común de Server Actions convierte lo inesperado en `INTERNAL_ERROR` con una «Referencia» opaca, sin tragarse `redirect()` ni `notFound()`.
- **Pruebas con valores canario** sobre un *sink* del logger para comprobar que no se filtra ningún dato sensible.
- **Los Runtime Logs son observabilidad efímera** y dependiente del plan; no son un registro de auditoría ni evidencia duradera. Sin Log Drain.
- **Sin** Sentry, OpenTelemetry propio, analytics, trackers, monitor de disponibilidad externo ni alertas de aplicación; solo señales nativas de GitHub Actions, el smoke, Vercel y Neon. Sin SLO/SLA.
- **Operación:** runbooks mínimos RB-1 a RB-9 (rollback, migración fallida, recuperación del administrador, limitador/`SERVICE_UNAVAILABLE`/Neon, tracking code comprometido, dato sensible publicado, incidente de seguridad, indisponibilidad de proveedor, inundación de solicitudes). Procedimiento ***break-glass*** de redacción o eliminación de datos **fuera del producto**, con rol privilegiado, sin endpoint ni interfaz, que revisa todas las copias persistidas del dato: tablas activas, columnas derivadas, historiales, **todas las ramas activas de Neon**, ramas de recuperación `pre-release-*`, clones deliberados y la política efectiva de *point-in-time restore*, copias y retención del plan. Para copias del proveedor que no admitan eliminación selectiva inmediata se documentan su existencia y plazo de retención, se restringe el acceso y se deja que expiren según la política del proveedor, **sin afirmar que el dato desapareció de inmediato de toda copia física**; si se restaura una copia con un dato ya redactado, la redacción se reaplica antes de poner el entorno en servicio. `VAL-04` sigue siendo requisito antes de un uso operacional real con datos personales. **Plan de retiro de la demo** al terminar la evaluación.
- **Recuperación de datos:** V1 no mantiene un sistema propio de copias de seguridad; depende de las funciones y la retención efectivas del plan de Neon y de las ramas de recuperación creadas antes de cambios relevantes. Se acepta una posible pérdida de datos de la demo; un uso real exigiría revisar RPO/RTO, copias y retención (sin cifras numéricas en V1).

## Justificación

Un logger con interfaz cerrada, campos en lista blanca y eventos tipados **reduce drásticamente la posibilidad de registrar accidentalmente texto libre del usuario por el camino normal de logging**, que es la causa más común de fugas por logs. Las pruebas con valores canario y `no-console` verifican que esa disciplina se mantenga; TypeScript y una API cerrada previenen errores, pero no son por sí solos una frontera criptográfica ni una garantía frente a código privilegiado deliberadamente incorrecto. Nombrar un catálogo reducido de eventos de fallo y seguridad da visibilidad suficiente para una demo sin crear un rastro de actividad que el PRD descarta. Evitar servicios de terceros mantiene la CSP simple y evita una política de datos adicional.

## Consecuencias positivas

- Logs seguros por diseño, sin dependencias.
- Diagnóstico viable de los incidentes que importan (seguridad, degradación, errores inesperados).
- Procedimientos claros para lo que el producto no cubre.

## Consecuencias / trade-offs

- **No hay auditoría de accesos ni de acciones**, ni forense detallada; el diagnóstico depende de logs efímeros y del estado actual de PostgreSQL.
- Los eventos de error se pierden al caducar los logs del proveedor.
- Sin alertas propias, una caída puede pasar desapercibida hasta que alguien la note o llegue un aviso nativo.
- Un tracking code filtrado no se puede rotar ni revocar; solo hay medidas operativas.
- Los procedimientos *break-glass* operan con privilegios altos: un error operativo tiene más impacto que una operación normal.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Registro accidental de datos sensibles | Esquema cerrado, lista blanca de campos, `no-console`, pruebas con canarios, revisión de logs reales en el Security Pass |
| Datos reales de terceros en la demo | Aviso en interfaz, runbooks, procedimiento *break-glass* y plan de retiro |
| Error operativo en un procedimiento privilegiado | Rol operativo separado del runtime, confirmación explícita del entorno y ensayo en `development` |

## Qué queda deliberadamente fuera

Auditoría, métricas propias, trazado distribuido, alertas, SLO/SLA, endpoint de salud y la redacción completa de los runbooks (se escribirán en `docs/09-deploy/`). Los nombres finales de los eventos se consolidan en la Spec.

**Esta elección corresponde a una V1 de demostración.** No implica que esta observabilidad sea suficiente para una operación empresarial real.

## Condiciones para revisar este ADR

- FIXORA se usa con **clientes y datos reales** (`VAL-04`) o hay requisitos de auditoría o retención.
- Aparece más de un administrador o necesidad de atribuir acciones.
- La retención de logs del proveedor resulta insuficiente para diagnosticar incidentes.
- El Security Pass encuentra datos sensibles en logs.

## Referencias

- PRD: §5.H, `RIE-03`, `RIE-15`, `RIE-20`, `VAL-04`.
- [TECHNICAL-DESIGN.md](../TECHNICAL-DESIGN.md) §23, §26, §27.
- Relacionado con: [ADR-005](ADR-005-seguimiento-publico-y-privacidad.md), [ADR-007](ADR-007-seguridad-y-proteccion-frente-abuso.md), [ADR-009](ADR-009-entornos-ci-cd-y-despliegue.md).
