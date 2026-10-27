# Design

## Context

CHG-15 es el último change de la materialización (16 de 16): un change de **verificación y entrega** (`SKIP_SPECS`) que reúne, comprueba y documenta la evidencia final de V1. Sigue `TECHNICAL-DESIGN.md` §24, §25 (incluido §25.6), §26 y §27, ADR-008, ADR-009 y ADR-010, el PRD (`SC-14`, `SC-15`, `SC-17`, `SC-18`, `SC-19`, `SC-20`, `VAL-03`, `VAL-04`, `RIE-20`) y el backlog (`CHG-15`, `M5`) sin reabrirlos. **No es dueño** de ningún comportamiento (persistencia CHG-02, pipeline CHG-03, UI y responsive de cada slice, `E2E-01` CHG-11, despliegue CHG-07, seguridad CHG-14). Este documento es una **planificación**: nada se ha ejecutado, no hay evidencia, no hay estados PASS y `M5` **no** se ha alcanzado.

## Goals / Non-Goals

**Goals:** `TRACEABILITY.md` completo con evidencia real; cierre de `SC-14`; revisión manual estructurada de `SC-15`; verificación de `E2E-01`/`SC-17`; inspección del pipeline (`SC-19`); `SC-20` con smoke de Production y flujo manual de cierre; *seed* ficticio; runbooks RB-1…RB-9; *break-glass*; plan de retiro; riesgos residuales; `VAL-04`; decisión de release.

**Non-Goals:** funcionalidad nueva o endpoints; repetir el Security Pass; porcentaje global de cobertura (se mantiene ≥90 % de líneas y ramas solo en los módulos puros seleccionados por TD/CHG-03); regresión visual; certificación de navegadores, WCAG o usabilidad (`VAL-03`); Sentry, analíticas, OTel o monitor externo; afirmaciones legales o de cumplimiento; AV-4.

## Decisions

### D1. Alcance y dependencias
Hard CHG-14; Delivery CHG-07; AV-3. Ejecutable en la Fase 7 con CHG-14 completado, Production operativa, CHG-07 operativo, resultados de AV-3 y un CI real. Materializar el plan ahora no exige nada de eso.

### D2. Frontera «sin cambio de comportamiento»
Si en la Fase 7 aparece un comportamiento faltante, una contradicción funcional o un fallo que exige cambiar el contrato observable, CHG-15 **no** pasa a DELTA SPECS ni se oculta el cambio en una tarea: se abre un **nuevo change correctivo funcional** sobre la capability propietaria (como en CHG-14), y el release permanece **NO READY** hasta su implementación, verificación y reverificación.

### D3. Puertas de release (todas obligatorias)
1. **Código y CI en verde**: las verificaciones aprobadas se ejecutan realmente (`static` y `db-tests`, regresión de seguridad, build).
2. **Migraciones**: Production al esquema esperado mediante el flujo de CHG-07.
3. **Seguridad**: CHG-14 cerrado, con Critical = 0, High = 0 y violaciones de `SC-11`/`SC-12` = 0 abiertas (no se repite el Pass).
4. **AV-3**: resultados disponibles.
5. **`SC-14`**, **`SC-15`**, **`SC-17`**, **`SC-19`**, **`SC-20`**: cada uno con su evidencia real (D5–D9).
6. **`TRACEABILITY.md`**: 20/20 y 17/17 con dueño, evidencia y estado final consistente (D4).
7. **Seed** ficticio y aviso de demostración.
8. **Runbooks** RB-1…RB-9 y procedimiento *break-glass* en `docs/09-deploy/`.
9. **Plan de retiro** de la demo.
10. **Riesgos residuales** listados y `VAL-04` explícito (D17–D18).
11. **Flujo manual de cierre** de V1 ejecutado con datos ficticios (D11).
Un build exitoso o un despliegue accesible **no** bastan si falta cualquiera de las anteriores.

### D4. `TRACEABILITY.md`
Fuente de verdad en `docs/07-testing/TRACEABILITY.md` (creada por CHG-03, completada aquí). Tabla `ID | change dueño | nivel | prueba o evidencia | ubicación | estado | observaciones` para `SC-01…SC-20` y `E1…E17` (no copia el texto del criterio: el PRD sigue siendo la fuente; no se inventan reglas). Estados mínimos distinguibles: pendiente, verificado, fallido y no aplicable (solo con justificación); el vocabulario exacto es detalle de implementación. **El script `test:trace`** (sin dependencias) comprueba la **completitud estructural** (que aparezcan los 37 identificadores, sin desconocidos ni dueños faltantes, referencias a pruebas existentes); **no demuestra que la evidencia sea verdadera**. **Prohibido marcar PASS por presencia del ID**: el estado final se basa en evidencia real. «20/20 y 17/17» significa que cada ID tiene dueño, evidencia y estado consistente, no que todos tengan una prueba E2E. Tipos de evidencia admitidos: unitaria, integración, E2E, inspección del pipeline, Security Pass, revisión manual estructurada, smoke de Production y evidencia documental/operativa.

### D5. `SC-14` (persistencia)
CHG-15 no crea persistencia. Cierra el criterio con la evidencia automatizada de CHG-02 y de las rebanadas funcionales: una orden creada persiste, sus cambios (estado, diagnóstico, costo, notas, datos básicos) persisten y las consultas posteriores recuperan los valores correctos. Inspeccionar tablas o «la BD existe» no basta.

### D6. `SC-15` (revisión manual estructurada)
Checklist manual (no es estudio de usabilidad, certificación WCAG, prueba con usuarios ni demostración de que FIXORA sea «fácil de usar»; eso es `VAL-03`). Cubre como mínimo, según el PRD:
- **Público:** registrar una reparación, obtener y conservar el código, consultar la reparación, interpretar el estado y el Repair Journey.
- **Administración:** iniciar sesión, localizar una orden, abrir el detalle, distinguir lo público de lo interno, realizar las operaciones permitidas y una transición válida.
En **escritorio y móvil** (los tamaños concretos siguen la matriz de Playwright de TD §24; DESIGN §14 no fija *breakpoints* y no se inventan aquí). Criterios: el flujo se completa; acciones principales visibles y utilizables; etiquetas comprensibles; **sin desplazamiento horizontal de la página**; Público antes que Interno en móvil; Repair Journey utilizable (horizontal en escritorio, vertical en móvil); diálogos/hojas inferiores utilizables; formularios sin truncamiento funcional. Fila por flujo: pantalla/flujo, viewport, acción, resultado, desbordamiento horizontal, PASS/FAIL, observación y evidencia saneada solo cuando aporte valor. Playwright responsive apoya pero **no sustituye** la revisión manual. Documento sugerido `docs/07-testing/SC-15-RESPONSIVE-REVIEW.md`.

### D7. `SC-17` (flujo principal)
CHG-11 es el dueño de `E2E-01`; CHG-15 **no lo rediseña**. Verifica que exista evidencia real y que **pase** en la implementación: cliente registra con datos ficticios → tracking → inicio de sesión → búsqueda → detalle → avanza hasta `EN_DIAGNOSTICO` → diagnóstico → costo → `E11` → `ESPERANDO_APROBACION` → el cliente consulta y ve estado, Journey/timeline, diagnóstico y costo. No se exige llegar a `ENTREGADO`. Un archivo de prueba creado o planificado no basta.

### D8. `SC-19` (pipeline)
Inspección del pipeline de CHG-03 y CHG-07; no se crea otro. Con **evidencia de ejecuciones reales de GitHub Actions**: verificaciones estáticas, `db-tests`, regresión de seguridad, build, workflows de despliegue y migración, protección de `main` aplicable y comprobaciones requeridas. Que exista `.github/workflows/` no basta. El alcance de la entrega continua es el aprobado por el TD y CHG-07 (promoción/aprobación donde corresponda): no se afirma que cada *commit* se despliegue automáticamente a Production si la arquitectura usa aprobación manual.

### D9. `SC-20` y smoke de Production
Despliegue público de demostración en Vercel (Production aprobado; ni `localhost`, ni Preview, ni capturas). Se reutiliza el proyecto/mecanismo `test:smoke` establecido por CHG-07 contra la URL real, **público, no mutante y repetible**. Mínimo: `/` responde; `/registrar` y `/consultar` cargan; cabeceras públicas esperadas; una **consulta por la UI real** (sin invocar internals de Server Actions) de una orden demo ficticia conocida; y `/admin/**` sin sesión no entrega contenido administrativo. **No** registra órdenes, cambia estados, crea notas, edita datos ni **inicia sesión** en Production. **Propiedad (reconciliada):** CHG-07 es dueño del *baseline* de Production, del mecanismo/infraestructura de despliegue y del **smoke de Production**; CHG-15 es dueño de la **ejecución final, la recopilación de evidencia y el cierre de `SC-20` para la preparación del release**. CHG-15 no es dueño «funcional» del smoke ni introduce comportamiento (el backlog asigna `SC-20` primario a CHG-07 y cierre a CHG-15). La consulta de la orden demo y la comprobación de `/admin/**` se incorporan al mecanismo cuando existen sus dependencias. TD §25.6 puede seguir describiendo el smoke como un mecanismo completo: la separación es de propiedad de implementación frente a cierre/evidencia de release, no una contradicción técnica; no se edita el TD.
- **`SMOKE_TRACKING_CODE`:** secreto de GitHub; el código nunca se hardcodea en el repositorio, nombres de pruebas, salidas, URL ni *traces* públicos, y nunca se imprime.
- **Sin contraseña de administrador de Production en CI** (el flujo administrativo completo ya se prueba en `test` con credenciales ficticias).
- Un estado «Ready» de Vercel no demuestra `SC-20`.

### D10. *Seed* ficticio (`seed:demo`)
Exclusivamente ficticio (sin nombres, teléfonos, correos ni códigos reales); crea órdenes en estados útiles para la demostración (mostrar el Journey, diagnóstico y costo cuando corresponda, notas públicas e internas, el dato para el smoke) **mediante los casos de uso y reglas reales**; conjunto pequeño, no masivo. **No es un *fixture* de pruebas** (los de `test` viven en la rama `test`; `seed:demo` está prohibido en `test`) ni reutiliza credenciales o internos de pruebas. Se ejecuta **explícitamente** (development y `main`, con confirmación del entorno), nunca en migraciones, *build*, arranque ni despliegues automáticos, y no sobrescribe ni borra datos. Sin claves de idempotencia deterministas o predecibles, sin credenciales ni contraseña de administrador en el seed, y sin un código fijo en el repositorio: los códigos son los normales y, tras el seed, se elige uno como `SMOKE_TRACKING_CODE`. Cómo se evita una segunda carga lo cierra la Spec operativa/Fase 7 (detalle de implementación). Se mantiene el aviso de demostración aprobado (sin casilla).

### D11. Flujo manual de cierre en Production
Al cierre de V1 (y en releases significativas o cambios críticos de autenticación, estado o persistencia) se ejecuta manualmente: registro → administrador → cambio → consulta pública, **solo con datos ficticios**, con evidencia saneada en `docs/09-deploy/`. No se convierte en un smoke automático ni almacena la contraseña de Production en CI.

### D12. Runbooks RB-1…RB-9 (`docs/09-deploy/`)
Procedimientos operativos, no producto (sin UI, endpoints, funciones de administración, rotación de códigos ni borrado normal). Solo se documentan lo que las fuentes fijan; los comandos concretos se completan y validan en la Fase 7 y no se escribe aquí nada destructivo ejecutable sin contexto.
- **RB-1** rollback de aplicación: Instant Rollback cuando exista, verificar después el mapeo de Production; la BD no se revierte y el esquema avanza (*roll-forward*).
- **RB-2** migración fallida o parcial: detener la promoción si es posible, diagnosticar, no editar migraciones ya aplicadas, migración correctiva, *roll-forward*, rama de recuperación si corresponde.
- **RB-3** recuperación/rotación del administrador: mediante el provisioning externo aprobado (`admin:provision`); sin pantalla, correo ni endpoint de reseteo; la rotación invalida sesiones.
- **RB-4** limitador, `SERVICE_UNAVAILABLE` o problemas de Neon: falla cerrada de las superficies protegidas, diagnóstico del limitador/BD, señales del proveedor, restauración segura; nunca desactivar el limitador en silencio.
- **RB-5** tracking code potencialmente comprometido: `E17`; sin rotación, revocación, reemplazo ni regeneración; evaluar exposición, revisar logs **sin buscar el código en claro** y medidas operativas de privacidad o retirada de la demo.
- **RB-6** dato personal/sensible publicado por accidente: si es editable, se corrige con FIXORA; si no, procedimiento excepcional *break-glass* fuera del producto (D13).
- **RB-7** incidente de seguridad y rotación de credenciales: secretos, credenciales, sesiones, despliegue, roles de BD y reverificación cuando corresponda; sin SIEM/SOC.
- **RB-8** indisponibilidad o cuota de Neon o Vercel: diagnóstico, señales nativas, disponibilidad degradada, recuperación; sin prometer SLA.
- **RB-9** inundación de solicitudes públicas: `E13` vigente en operación normal (sin CAPTCHA ni limitador de registro); ante incidente activo, medidas temporales de plataforma o retirada temporal de la demo; una mitigación permanente exigiría revisar `E13` en un nuevo change.

### D13. *Break-glass* de privacidad
Solo privacidad, **fuera del producto**, con el rol operativo/migrador (nunca el rol runtime), respetando el orden de las claves foráneas `RESTRICT`. Exige: confirmación explícita del entorno, postura de respaldo/recuperación conocida, *dry run* cuando aplique, y verificación posterior. Una redacción no está completa si solo cambia el valor vigente: se revisan todas las copias aplicables (`customer_name` y `customer_name_search`, `diagnosis` y `diagnosis_history`, contenido de notas, otras copias históricas, columnas derivadas), todas las ramas activas de Neon, las ramas `pre-release-*`, clones y la política efectiva de recuperación/retención; las copias gestionadas por el proveedor se documentan y se dejan expirar sin afirmar que el dato desapareció de inmediato; si se restaura una copia, se reaplica la redacción antes de volver a servir. Se ensaya primero donde corresponda de forma segura (`development`), no se improvisa en Production, y no se crea botón, endpoint ni Server Action de borrado.

### D14. Retiro de la demo
Plan explícito con disparador operativo (fin de la evaluación o cuando deje de ser necesaria; **sin fecha inventada**): retirar el acceso público, eliminar o desactivar recursos de datos según el checklist, revisar secretos y variables, retirar los recursos no necesarios. La demo puede recibir datos reales pese al aviso (`RIE-20`): el plan contempla privacidad, *break-glass* y retirada; **no se afirma que Production contenga solo datos ficticios**, solo que lo es lo que el proyecto crea (seed, evidencia).

### D15. Operación mínima
Se comprueba que el logger, los logs de plataforma, los runbooks y las señales nativas existentes bastan para la demo aprobada. Sin Sentry, analíticas, OTel ni monitor externo.

### D16. Evidencia y saneado
Ubicación: `docs/07-testing/` (`TRACEABILITY.md`, `SC-15-RESPONSIVE-REVIEW.md`) y `docs/09-deploy/` (runbooks, seed, evidencia de release y de operación; nombres adicionales son detalle de implementación). Toda captura, salida de CLI, *trace*, log, enlace de CI o comprobación de BD evita secretos, tokens de sesión, la contraseña del administrador, códigos de seguimiento reales y PII real. No se crea evidencia ficticia: ni PASS, ni identificadores de CI o de despliegue inventados.

### D17. Riesgos residuales (el artefacto de release los conserva; no se afirma riesgo cero)
Sin copias de seguridad propias (dependencia del plan de Neon; sin SLA/RPO/RTO); tracking code no rotable (`E17`); logs efímeros y sin auditoría; la demo puede recibir datos reales (`RIE-20`) y V1 no elimina órdenes (`RIE-03`); registro sin anti-spam (`E13`, `RIE-11`); administrador único (`RIE-15`); arranque en frío de Neon; credenciales de Marketplace; Preview no es entorno de aceptación; rollback limitado por plan y esquema; paginación por offset; dependencia de JavaScript; disponibilidad reducida cuando el limitador falla cerrado; riesgo operativo del *break-glass*. Se toman de TD §27 y del PRD.

### D18. `VAL-04`
Permanece **ABIERTA: prerrequisito para cualquier uso operacional real**. No bloquea la evaluación académica ni la demo V1. La decisión de release no puede afirmar «aprobado para operación real» ni cumplimiento legal o regulatorio (GDPR, legislación peruana), «listo para clientes» ni «certificado seguro».

### D19. Decisión de release
Dos estados semánticos inequívocos: **LISTO PARA EVALUACIÓN ACADÉMICA / DEMO** (solo si todas las puertas de D3 pasan; alcanza M5) y **NO LISTO** (si cualquiera falla; sin esconder fallos bajo «problema conocido» o «aceptado»). **«Aprobado para operación real» está prohibido mientras `VAL-04` siga abierto.** El formato exacto del estado es detalle de implementación. Durante la Fase 6.4 el único registro posible es «M5 — completamente planificado / pendiente de ejecución»; no se crea ningún estado de release.

### D20. Puerta de salida
`TRACEABILITY.md` 20/20 y 17/17 con estado final consistente; `SC-14`, `SC-15`, `SC-17`, `SC-19` y `SC-20` con evidencia real; CHG-14 cerrado; AV-3 disponible; *seed* y runbooks en `docs/09-deploy/`; plan de retiro; riesgos residuales y `VAL-04` explícitos; decisión de release registrada.

## Traspasos

- **Entrada:** informe de CHG-14, `E2E-01` de CHG-11, pipeline de CHG-03/07, smoke de infraestructura de CHG-07.
- **Fase 6.5:** debe auditar cobertura `SC` 20/20 y `E` 17/17, cadenas de capabilities, semántica de deltas, reconciliaciones entre olas, cobertura funcional de M4, límites `SKIP_SPECS` de CHG-14/15, y que no queden contradicciones durables (incluido el relevo de propiedad del smoke).

## Reconciliaciones registradas para la Fase 6.5

- **R1 `customer_name_search`:** CHG-02 campo físico · CHG-05 escritura inicial · CHG-09a búsqueda · CHG-13 recálculo por corrección — HANDOFF SATISFIED.
- **R2 navegación al detalle:** CHG-09a fuentes del directorio/panel · CHG-09b navegación real — HANDOFF SATISFIED / propiedad escalonada reconciliada.
- **R3 comprobación temprana de versión:** TD §14.4 (diagrama simplificado) · CHG-10/CHG-13 hacen explícito `current.version != expectedVersion` y la escritura condicional sigue siendo la segunda barrera OCC — RECONCILED.
- **R4 `E11` #1:** CHG-10 confirmación, exigencia en servidor y ligadura a la versión · CHG-11 resumen real de diagnóstico y costo y aviso de congelación/publicación — HANDOFF SATISFIED.
- **R5 `E14`/cancelación:** CHG-10 semántica y núcleo del diálogo · CHG-12 capacidad de notas y frase explicativa — HANDOFF SATISFIED.
- **R6 extensibilidad de specs base:** CHG-06 proyección pública como lista positiva extensible por requisitos públicos explícitos · CHG-09b detalle de solo lectura por defecto con mutaciones solo si se autorizan explícitamente — RECONCILED.
- **R7 invalidación de `E11` por correcciones:** CHG-10 `expectedVersion`/ligadura · CHG-13 la corrección efectiva incrementa `repair_orders.version` — HANDOFF SATISFIED.
- **R8 propiedad del smoke de `SC-20`:** CHG-07 mecanismo/baseline de Production · CHG-15 ejecución final/evidencia/cierre — RECONCILED.
- **Observación no normativa:** algunos `proposal.md`/`design.md` previos (p. ej. CHG-06, CHG-09b) pueden conservar frases históricas como «en esta etapa»; las delta specs normativas ya están corregidas. La Fase 6.5 comprueba que no crean contradicción ni inducen una implementación incorrecta, y las conserva como contexto o las ajusta documentalmente; no se modifica masivamente ahora.

## Risks / Trade-offs

- **Integración tardía:** fallos de última hora obligan a changes correctivos y retrasan M5.
- **Dependencia de plataforma:** el smoke y las verificaciones de despliegue requieren Production, AV-3 y CI reales.
- **Datos reales en la demo:** riesgo aceptado (`RIE-20`), mitigado por aviso, *break-glass* y retiro.
- **Evidencia manual:** `SC-15` depende de una revisión humana documentada.

## Open Questions

| ID | Pregunta | Clasificación |
|---|---|---|
| OQ-1 | Ninguna bloqueante para materializar | — |
| OQ-2 | CHG-14 completado; Production y CHG-07 operativos; resultados de AV-3; CI real disponible | PRE-EXECUTION |
| OQ-3 | Nombres exactos de documentos, tamaños de *viewport* (matriz de Playwright), formato del checklist, mecanismo exacto del seed y de evitar una segunda carga, comandos de los runbooks, formato del estado de release | IMPLEMENTATION DETAIL |
| OQ-4 | Cualquier fallo que exija comportamiento observable nuevo | CORRECTIVE-CHANGE TRIGGER |
| OQ-5 | Propiedad del smoke de `SC-20` entre TD §25.6, CHG-07 y CHG-15 | **RECONCILED** (CHG-07 mecanismo/baseline; CHG-15 ejecución final/evidencia/cierre); se registra en la auditoría de la Fase 6.5 |

No se crea AV-4.

## Pruebas planificadas

No hay pruebas de comportamiento nuevas. Se planifican: `test:trace` ampliado a la evidencia final, la extensión del `test:smoke` de CHG-07 (D9), la revisión manual de `SC-15`, la verificación de las ejecuciones reales de CI y de `E2E-01`, y el flujo manual de cierre. **Contribución:** cierre de `SC-14`, dueño de `SC-15`, verificación de `SC-17`, `SC-19` y `SC-20`; M5 al cumplirse el DoD en la Fase 7.
