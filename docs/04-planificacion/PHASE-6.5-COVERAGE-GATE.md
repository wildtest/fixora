# Fase 6.5 — Coverage & Consistency Gate (primera pasada + corrective pass)

**Estado: Fase 6.5 — COMPLETADA Y APROBADA.** Final technical verdict: **PASS WITH NON-BLOCKING CLEANUP**. Formal review: **APPROVED**. Historial: la **primera pasada** (auditoría de solo lectura sobre el checkpoint `15300e8`) dio **FAIL** y se conserva abajo; el **corrective pass** (§25) aplicó las correcciones aprobadas y la **segunda auditoría completa** (§26) reaudita los 16 changes. Este documento no autoriza `/opsx:apply` ni inicia la Fase 7.

Jerarquía de fuentes aplicada: PRD (autoridad funcional) > DESIGN (UX/UI) > Technical Design y ADR (arquitectura) > OPENSPEC-STRATEGY y BACKLOG (planificación y propiedad de changes) > delta specs (comportamiento futuro materializado). Una fuente inferior nunca «corrige» a una superior.

**Significado de «cobertura»:** `ESPECIFICADO / PLANIFICADO`. No implica implementado, probado en runtime ni listo para release.

## 1. Veredicto ejecutivo

**Primera pasada: FAIL** (histórico, conservado). **Segunda pasada (tras el corrective pass, §25–§26): PASS WITH NON-BLOCKING CLEANUP**, sin BLOCKER, MAJOR ni MINOR pendientes.

Detalle de la primera pasada: FAIL, por **1 hallazgo MAJOR** de cobertura de evidencia (`SC-04`), 4 MINOR y 3 CLEANUP. No hay BLOCKER. No se encontró ninguna contradicción con el PRD, ninguna colisión de requisitos, ningún ciclo de dependencias, ninguna capability accidental, ningún *scope creep* funcional ni conflicto de orden de archivado. Las correcciones recomendadas son locales (texto de tareas y redacciones), no estructurales.

## 2. Línea base del repositorio y OpenSpec

| Elemento | Resultado |
|---|---|
| HEAD | `15300e8` (`specs: materialize OpenSpec wave 4 completion and release`) |
| Working tree inicial | limpio |
| OpenSpec | 1.15.0; `doctor` sano |
| Changes activos | 16 (`archive/` solo contiene `.gitkeep` y no cuenta) |
| Main specs | 0 (correcto: ningún change está implementado, verificado y archivado) |
| `validate --changes --strict` | 16/16 válidos (solo INFO esperados de `skip_specs`) |

## 3. Inventario de los 16 changes

| # | Change | Tratamiento | Tareas | Capabilities (delta) |
|---|---|---|---|---|
| CHG-01 | application-skeleton | SKIP_SPECS | 28 | — |
| CHG-02 | persistence-foundation | SKIP_SPECS | 43 | — |
| CHG-03 | ci-quality-gates | SKIP_SPECS | 34 | — |
| CHG-04 | ui-foundation-and-public-entry | DELTA | 24 | public-site-entry (nueva) |
| CHG-05 | repair-request-registration | DELTA | 16 | repair-request-registration (nueva), public-order-tracking (nueva) |
| CHG-06 | public-order-tracking | DELTA | 19 | public-order-tracking (ext.) |
| CHG-07 | production-environment-baseline | SKIP_SPECS | 28 | — |
| CHG-08 | admin-access | DELTA | 24 | admin-access (nueva) |
| CHG-09a | admin-order-directory | DELTA | 18 | admin-order-management (nueva) |
| CHG-09b | admin-order-detail | DELTA | 18 | admin-order-management (ext.) |
| CHG-10 | repair-status-lifecycle | DELTA | 18 | repair-lifecycle (nueva), admin-order-management, public-order-tracking (ext.) |
| CHG-11 | diagnosis-and-estimate | DELTA | 21 | diagnosis-and-estimate (nueva), admin-order-management, public-order-tracking (ext.) |
| CHG-12 | order-notes | DELTA | 18 | order-notes (nueva), admin-order-management, public-order-tracking (ext.) |
| CHG-13 | order-data-correction | DELTA | 17 | admin-order-management (ext.) |
| CHG-14 | security-hardening-pass | SKIP_SPECS | 27 | — |
| CHG-15 | release-readiness | SKIP_SPECS | 21 | — |

Total de tareas: 374 (371 en la primera pasada; +1 en CHG-08 y +2 en CHG-11 por el corrective pass). No existe un change 17, experimental, correctivo ni duplicado.

## 4. Auditoría de tratamientos

- **SKIP_SPECS = 6** (CHG-01, 02, 03, 07, 14, 15): todos con `skip_specs: true` y sin directorio `specs/` ni deltas.
- **DELTA SPECS = 10** (CHG-04, 05, 06, 08, 09a, 09b, 10, 11, 12, 13): todos con al menos una delta válida y sin `skip_specs`.
- No se encontró mezcla de tratamientos: ningún SKIP_SPECS con specs funcionales, ningún DELTA con `skip_specs`, ninguna capability en CHG-14/15 ni requisito observable escondido en ellos.

## 5. Inventario de capabilities (8/8) y propiedad

| Capability | Change que la introduce | Purpose |
|---|---|---|
| public-site-entry | CHG-04 | sí |
| repair-request-registration | CHG-05 | sí |
| public-order-tracking | CHG-05 | sí (identidad del código) |
| admin-access | CHG-08 | sí |
| admin-order-management | CHG-09a | sí |
| repair-lifecycle | CHG-10 | sí |
| diagnosis-and-estimate | CHG-11 | sí |
| order-notes | CHG-12 | sí |

No existe una novena capability. Las extensiones (CHG-06, 09b, 10, 11, 12, 13) no contienen `## Purpose`.

## 6. Cadenas de capabilities

| Capability | Cadena (requisitos añadidos) | Responsabilidad |
|---|---|---|
| public-order-tracking | CHG-05 (4) → CHG-06 (10) → CHG-10 (3) → CHG-11 (4) → CHG-12 (3) | identidad del código → consulta base → línea de tiempo → diagnóstico y costo publicados → notas públicas |
| admin-order-management | CHG-09a (10) → CHG-09b (9) → CHG-10 (7) → CHG-11 (5) → CHG-12 (6) → CHG-13 (12) | panel y directorio → detalle base → ciclo de vida → diagnóstico/costo → notas → correcciones |
| public-site-entry, repair-request-registration, admin-access, repair-lifecycle, diagnosis-and-estimate, order-notes | un solo change cada una | — |

**Factibilidad de archivado (análisis estático, sin simular):** en el orden de implementación aprobado, cada capability se crea antes de ser extendida, todas las operaciones son `ADDED`, los nombres de requisito son únicos por capability (comparación insensible a mayúsculas), no hay `MODIFIED` previo a la existencia del requisito, no hay `## Purpose` duplicado y el orden Spec-base es realizable. Los experimentos de OpenSpec 1.15.0 de las Olas anteriores validaron *Modified Capability + ADDED Requirements* contra predecesores activos. Sin hallazgos.

## 7. Auditoría de dependencias

- **Hard** (BACKLOG §8): CHG-01→02/04; 02→03/05/07/08; 04→05/08; 05+08→09a→09b; 06+09b→10→11/12/13; 11+12+13→14→15. Sin ciclos ni predecesores imposibles; los *proposals* declaran Hard/Spec-base coherentes con el backlog (CHG-09a: 05 y 08; CHG-09b: 05, 08 y Spec-base 09a; CHG-10: 06 y 09b; CHG-11: 10; CHG-12: 10 y Spec-base 11; CHG-13: 10 y Spec-base 12; CHG-14: 11, 12, 13; CHG-15: 14).
- **Spec-base:** `public-order-tracking`: 05 ⇢ 06 ⇢ 10 ⇢ 11 ⇢ 12; `admin-order-management`: 09a ⇢ 09b ⇢ 10 ⇢ 11 ⇢ 12 ⇢ 13; `repair-lifecycle`: 10. La política (predecesor implementado, verificado y archivado antes de aplicar/archivar el siguiente) está conservada en los *proposals*; materializar no autoriza `apply`.
- **Delivery:** CHG-07 entrega frente a CHG-06; CHG-14 y CHG-15 dependen de CHG-07. CHG-07 no bloquea ningún slice funcional (posición temprana recomendada, no obligatoria).
- **Soft:** CHG-03 antes de las rebanadas; CHG-09a ante 09b. No tratadas como equivalentes a Hard.
- Sin dependencias inventadas ni omitidas.

## 8. Mapa de AV

- Solo se mencionan AV-1, AV-2 y AV-3. «AV-4» aparece únicamente en frases «no se crea AV-4». No hay AV-5 o superiores.
- Bloqueos antes de `apply` (BACKLOG §9, §14): **AV-2** → CHG-02 (y aguas abajo 03, 05, 06, 08, 09a, 09b, 10, 11, 12); **AV-1** (parcial para CHG-04; efectivo antes de CHG-05 y CHG-08, y relevante para 06 y 10); **AV-3** → con CHG-07, y resultados requeridos por CHG-14 y CHG-15. CHG-01 no requiere AV (recomendación de la comprobación acotada ESM/Prisma de AV-2). CHG-13 no requiere AV adicional. Sin divergencias con el backlog.

## 9. Semántica de las deltas

| Aspecto | Resultado |
|---|---|
| Operaciones | 100 % `ADDED` en los 10 changes DELTA. Sin `MODIFIED`, `REMOVED` ni `RENAMED`. Las correcciones cross-wave (CHG-06, CHG-09b) reescribieron requisitos *dentro de sus propios changes* aún no archivados |
| Purpose | Solo en la creación de cada capability; ausente en extensiones |
| Longitud de requisitos | Todos ≤ 500 caracteres (`--strict`) |
| Conteo | 130 requisitos y 298 escenarios en 17 archivos de delta |

## 10. Colisiones de nombres de requisito

Ninguna colisión de nombres idénticos dentro de una capability acumulada. Pares *conceptualmente cercanos* pero válidos: «Administrative status history» (CHG-09b) y «Combined administrative history» (CHG-11), ver GATE-007; «Authorized lifecycle actions / Authorized and bounded edits / Authorized note operations / Authorized correction» (nombres distintos, ámbitos distintos).

## 11. Cobertura funcional del PRD §4 (M4)

| Función PRD §4 | Dueño | Capability | Evidencia planificada |
|---|---|---|---|
| Registro, datos y validaciones, confirmación, idempotencia | CHG-05 | repair-request-registration | U + I + E2E |
| Código de seguimiento (12 caracteres, inmutable, único) | CHG-05 | public-order-tracking | U + I |
| Consulta pública, anti-enumeración, secreto del código | CHG-06 | public-order-tracking | U + I + E2E |
| Repair Journey y línea de tiempo | CHG-06/10 | public-order-tracking | E2E |
| Acceso administrativo, sesión | CHG-08 | admin-access | U + I + E2E |
| Panel, listado, búsqueda, filtro, paginación | CHG-09a | admin-order-management | I + E2E |
| Detalle administrativo | CHG-09b | admin-order-management | I + E2E |
| Máquina de estados, cancelación, estados finales, `E11` | CHG-10 | repair-lifecycle | U (64 pares) + I + E2E |
| Diagnóstico, costo, congelamiento, publicación, historial | CHG-11 | diagnosis-and-estimate | U + I + E2E |
| Notas públicas e internas | CHG-12 | order-notes | I + E2E |
| Corrección de datos básicos | CHG-13 | admin-order-management | U + I + E2E |
| Persistencia, CI/CD, despliegue, Security Pass, release | CHG-02/03/07/14/15 | — (SKIP_SPECS) | pipeline, smoke, informe |

Sin huecos funcionales: **M4 queda completamente especificado**. El gap de evidencia de `SC-04` (GATE-001) de la primera pasada está resuelto (§25).

## 12. Cobertura de pantallas (9/9)

| Pantalla | Introduce | Extienden | Veredicto |
|---|---|---|---|
| PUB-01 Landing | CHG-04 | — | ESPECIFICADO |
| PUB-02 Registrar | CHG-05 | — | ESPECIFICADO |
| PUB-03 Confirmación | CHG-05 | — | ESPECIFICADO |
| PUB-04 Consultar | CHG-06 | — | ESPECIFICADO |
| PUB-05 Seguimiento | CHG-06 | CHG-10, CHG-11, CHG-12 | ESPECIFICADO |
| ADM-01 Acceso | CHG-08 | — | ESPECIFICADO |
| ADM-02 Dashboard | CHG-09a | CHG-10 (conteos) | ESPECIFICADO |
| ADM-03 Listado | CHG-09a | — | ESPECIFICADO |
| ADM-04 Detalle | CHG-09b | CHG-10, CHG-11, CHG-12, CHG-13 | ESPECIFICADO |

No se creó ninguna pantalla nueva para notas, diagnóstico, correcciones ni diálogos `E11`. El panel se limita a ocho conteos por estado y cinco órdenes recientes (sin gráficos ni analítica). La navegación, la accesibilidad (44 px, foco visible, sin significado solo por color) y la hoja inferior móvil del diálogo `E11` se heredan de CHG-04/CHG-10/CHG-13 y DESIGN.

## 13. Cobertura de SC (20/20)

| SC | Dueño primario (BACKLOG §11) | Soporte observado en los changes | Cobertura |
|---|---|---|---|
| SC-01 | CHG-05 | 03, 15 | ESPECIFICADO |
| SC-02 | CHG-06 | — | ESPECIFICADO |
| SC-03 | CHG-09b | 08, 09a | ESPECIFICADO |
| SC-04 | CHG-11 (evidencia primaria; BACKLOG §11.1 y STRATEGY reconciliados) | soporte CHG-10 | ESPECIFICADO: Playwright independiente SR → ENTREGADO con comprobación pública tras cada una de las seis transiciones (distinto de `E2E-01`/`SC-17`) |
| SC-05 | CHG-10 | — | ESPECIFICADO |
| SC-06 | CHG-10 | — | ESPECIFICADO |
| SC-07 | CHG-11 | 02 (CHECK sin `CANCELADO`), 10 | ESPECIFICADO |
| SC-08 | CHG-11 | 10 | ESPECIFICADO |
| SC-09 | CHG-10 | 11, 12, 13 | ESPECIFICADO (completo a nivel de especificación) |
| SC-10 | CHG-11 | 09b, 10 | ESPECIFICADO |
| SC-11 | CHG-06 | 01, 02, 05, 09b, 11, 12, 13; verificación 14 | ESPECIFICADO |
| SC-12 | CHG-08 (patrón y *harness* de pruebas) | todo change administrativo (09a, 09b, 10, 11, 12, 13) y 01, 02, 06, 07; verificación final 14 | ESPECIFICADO (matriz de autorización de acciones, solo de pruebas) |
| SC-13 | CHG-06 | — | ESPECIFICADO |
| SC-14 | CHG-02 | cada slice; cierre 15 | ESPECIFICADO |
| SC-15 | CHG-15 | 04 y cada pantalla | ESPECIFICADO |
| SC-16 | CHG-05 | — | ESPECIFICADO |
| SC-17 | CHG-11 | 03, 10, 15 | ESPECIFICADO (`E2E-01` estable) |
| SC-18 | CHG-14 | 15 | ESPECIFICADO |
| SC-19 | CHG-03 | 07, 15 | ESPECIFICADO |
| SC-20 | CHG-07 (mecanismo y *baseline* del smoke) | ejecución final, evidencia y cierre en CHG-15 | ESPECIFICADO |

Los propietarios coinciden con el BACKLOG; no se reasignó ninguno.

## 14. Cobertura de E (17/17)

| E | Dueño | Soporte | Cobertura |
|---|---|---|---|
| E1 | CHG-05 | 02, 03, 15 | ESPECIFICADO |
| E2 | CHG-05 | — | ESPECIFICADO |
| E3 | CHG-05 | CHG-13 (administrador, mismos validadores) | ESPECIFICADO |
| E4 | CHG-06 | — | ESPECIFICADO |
| E5 | CHG-11 | CHG-10 | ESPECIFICADO |
| E6 | CHG-06 | completan 11 y 12 | ESPECIFICADO |
| E7 | CHG-09a | — | ESPECIFICADO |
| E8 | CHG-09a | — | ESPECIFICADO |
| E9 | CHG-10 | 11, 12 (notas: `STALE_NOTE`), 13 | ESPECIFICADO |
| E10 | CHG-08 | 10 y cada mutación | ESPECIFICADO |
| E11 | CHG-10 | 11 (#1), 12, 13 (invalidación) | ESPECIFICADO (los cuatro casos exactos) |
| E12 | CHG-12 | — | ESPECIFICADO |
| E13 | CHG-10 | 05 (sin anti-spam), 14, 15 | ESPECIFICADO |
| E14 | CHG-10 (núcleo) | CHG-12 (frase y capacidad de notas) | ESPECIFICADO |
| E15 | CHG-06 | 09a | ESPECIFICADO |
| E16 | CHG-05 | — | ESPECIFICADO |
| E17 | CHG-05 | CHG-13 (no editable), 02, 03, 15 | ESPECIFICADO |

17/17 especificados. `E11` cubre exactamente: `EN_DIAGNOSTICO → ESPERANDO_APROBACION`, `ESPERANDO_APROBACION → EN_REPARACION`, cualquier cancelación permitida y `LISTO_PARA_RECOJO → ENTREGADO`; ni más ni menos.

## 15. Coherencia de seguridad y privacidad

- **SC-11:** frontera durable de proyección positiva pública (CHG-06 *Public repair projection* reescrita como lista positiva extensible; CHG-11 no carga diagnóstico/costo no publicados; CHG-12 consulta `visibility = PUBLIC` con proyección positiva `{content, createdAt}` y nunca carga las internas; CHG-13 es regresión: nombre, teléfono y correo siguen privados). `PublicOrderView` y `AdminOrderDetail` son modelos positivos separados (no «objeto administrativo y luego redacción»). Plan de orden completamente poblada: CHG-14 tareas 2.2 y 4.1 (más pruebas por change).
- **SC-12:** `requireAdmin()` como autoridad de servidor en cada página y acción de CHG-08 a CHG-13; `AdminContext` no la sustituye. La matriz de acciones es infraestructura de pruebas definida por CHG-08 (GATE-002 resuelto).
- **Autenticación (CHG-08):** administrador único, correo/contraseña, política 15–128, `scrypt`, hash simulado para correo desconocido, sesión opaca con autoridad en PostgreSQL, inactividad 60 min, absoluta 12 h, `__Host-fixora_session` (`HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`, sin `Domain`, sin `Max-Age`), cierre de sesión revoca.
- **Limitadores:** inicio de sesión 5 fallos/15 min → bloqueo 15 min; consulta pública 10 fallos/10 min → bloqueo 15 min; sin limitador en el registro (`E13`); falla cerrada con `SERVICE_UNAVAILABLE`.
- **Tracking:** 12 caracteres ASCII del alfabeto aprobado (54 bits), único, inmutable, comparación exacta tras recorte e insensibilidad ASCII a mayúsculas, fuera de URL y logs, sin recuperación.

## 16. Coherencia de concurrencia

- **Orden:** `repair_orders.version` + `expectedVersion` + `STALE_ORDER` en transición (CHG-10), diagnóstico y costo (CHG-11) y corrección (CHG-13); doble barrera (comparación temprana + `UPDATE` condicional). Las notas **no** incrementan la versión de la orden.
- **Nota:** `order_notes.version` + `expectedNoteVersion` + `STALE_NOTE`/`NOTE_NOT_FOUND`; la carrera nota/cierre se serializa bloqueando la fila de la orden (AV-2).
- **Registro:** clave de idempotencia con hash y orden + evento inicial atómicos (CHG-05). Los tres mecanismos no se mezclan.
- **No-op:** coherente (sin escritura, sin versión nueva, sin historial) en diagnóstico, costo, edición idéntica de nota y corrección sin cambios.
- **Precedencia:** ciclo de vida y diagnóstico/costo/corrección: `STALE_ORDER` primero; corrección: `STALE_ORDER → ORDER_CLOSED → validación → no-op`; nota: terminal → nota existe → versión de nota → normalización/no-op. Sin contradicciones entre spec, design y tasks.
- **Históricos:** exactamente tres tipados (estado, diagnóstico, costo). La línea de tiempo pública solo transiciones; el historial administrativo combinado solo estado/diagnóstico/costo, sin notas, correcciones ni autores.

## 17. Coherencia de persistencia

El baseline de CHG-02 contempla todos los campos y tablas usados después: `repair_orders` (datos declarados, `customer_name_search`, `diagnosis`, `estimated_cost` numérico, `version`), tres historiales, `order_notes` (con `version`), `registration_idempotency`, `admin_users` (singleton), `admin_sessions`, tablas del limitador, `CHECK` de `SC-07` sin `CANCELADO`, privilegios mínimos (historiales *append-only* para el rol runtime). Fechas: `timestamptz` UTC, interfaz en `America/Lima`, formato `DD/MM/AAAA HH:mm`; sin reglas en conflicto. Dinero: PEN implícito, > 0, máximo dos decimales, cadena canónica, `BigInt`, `NUMERIC`, nunca `number`. Sin campo requerido posteriormente que falte físicamente.

## 18. Coherencia de pruebas y evidencia

Plan coherente por nivel: unitaria (dominio y primitivas), integración con PostgreSQL real (casos de uso, repositorios, privilegios, concurrencia), Playwright (flujos y UI), Security Pass (CHG-14, formal y separado), revisión manual `SC-15` (CHG-15) y smoke de Production (CHG-07/15). Regla del 90 % de líneas **y** ramas solo en `domain/` y módulos puros seleccionados (CHG-03; reafirmada en CHG-15); sin porcentaje global. `E2E-01` estable en CHG-10, CHG-11 y CHG-15 (hasta `ESPERANDO_APROBACION`, sin exigir `ENTREGADO`). Sin hallazgos pendientes: `SC-04` (GATE-001) y la matriz `SC-12` (GATE-002) quedaron resueltos en el corrective pass.

## 19. Límites SKIP_SPECS de CHG-14 y CHG-15

- **CHG-14:** verifica y endurece; no es dueño de controles; sin hallazgos ni informe ficticios; el comportamiento observable nuevo se enruta a un change correctivo funcional; `Deferred to corrective change` no es disposición final; puerta Critical = 0, High = 0, `SC-11` = 0, `SC-12` = 0.
- **CHG-15:** reúne evidencia; sin PASS, smoke ni M5 ficticios; `VAL-04` abierto; «listo para evaluación/demo» distinto de «aprobado para operación real».
- Las tareas de los SKIP_SPECS (01, 02, 03, 07, 14, 15) implementan o validan infraestructura/calidad ya aprobada y no introducen comportamiento funcional nuevo del producto.
- **CHG-07:** sin migración en *build*/runtime, Preview sin BD de Production ni secretos privilegiados, migración solo desde `main` con aprobación.

## 20. Reconciliaciones cruzadas R1–R8 (verificadas contra artifacts)

| ID | Tema | Veredicto |
|---|---|---|
| R1 | `customer_name_search`: CHG-02 columna (tabla de CHG-02), CHG-05 escritura inicial con la primitiva pura (D5), CHG-09a búsqueda (D4 y «Propiedad»), CHG-13 recálculo atómico con la misma primitiva (D7) | **VERIFIED** |
| R2 | Navegación al detalle: CHG-09a fuentes/filas (D9), CHG-09b navegación real | **VERIFIED** |
| R3 | Comprobación temprana de versión: TD §14.4 simplificado; CHG-10 la explicita (D2/D3/D4); CHG-13 (D4); segunda barrera condicional conservada | **VERIFIED** |
| R4 | `E11` #1: CHG-10 exigencia/ligadura; CHG-11 resumen real y aviso de congelación (*Publication confirmation summary*) | **VERIFIED** |
| R5 | `E14`: CHG-10 núcleo e irreversibilidad; CHG-12 frase y capacidad de notas (*Cancellation dialog note guidance*) | **VERIFIED** |
| R6 | Extensibilidad de specs base: CHG-06 lista positiva extensible; CHG-09b solo lectura por defecto con mutaciones explícitas; compatibles con CHG-10, 11, 12 y 13 (la redacción residual de CHG-11, GATE-004, quedó corregida) | **VERIFIED** |
| R7 | Invalidación de `E11` por correcciones: CHG-10 versión/ligadura; CHG-13 *Open confirmation invalidation*; las notas no invalidan | **VERIFIED** |
| R8 | Propiedad del smoke de `SC-20`: CHG-07 mecanismo (`test:smoke`) y *baseline*; CHG-15 ejecución final, evidencia y cierre, reutilizando el mecanismo | **VERIFIED** (sin issue residual; GATE-003 resuelto) |

## 21. Revisión de redacción histórica / no normativa

| Archivo | Frase | Clasificación |
|---|---|---|
| CHG-06 `proposal.md` | «todavía no puede usarlo» (narrativa de la motivación) | PASS (contexto histórico) |
| CHG-09b `proposal.md` | «detalle … en modo lectura», «solo lectura» (alcance de ese change) | RESUELTO: «solo lectura por defecto en este change (línea base)…» (GATE-007) |
| CHG-09b `design.md` | sin «en esta etapa» normativo; el componente de recorrido depende de CHG-06 | PASS |
| CHG-11 `design.md` | «distintos de las futuras notas públicas» | RESUELTO: «las notas públicas que añade CHG-12» (GATE-007) |
| Specs normativas | «únicamente/solo/nunca/por ahora/todavía no» | revisadas una a una; el único con riesgo durable fue GATE-004 (resuelto); GATE-005 no es un defecto |

## 22. Hallazgos (primera pasada, conservados)

La disposición final de cada uno está en §25.

| ID | Severidad | Archivos | Problema | Impacto | Corrección recomendada |
|---|---|---|---|---|---|
| GATE-001 | **MAJOR** | `diagnosis-and-estimate/{proposal,design,tasks}.md`; `repair-status-lifecycle/{design,tasks}.md`; BACKLOG §11.1 vs OPENSPEC-STRATEGY (traza `SC-04`) | `SC-04` («una orden llega de *Solicitud recibida* a *Entregado* por transiciones válidas y el cliente ve el estado y el timeline actualizados tras cada cambio») tiene dueño primario CHG-11 en el BACKLOG, pero CHG-11 nunca la menciona. `E2E-01` se detiene en `ESPERANDO_APROBACION`. Ningún change planifica un recorrido completo hasta `ENTREGADO` con reflejo público tras cada cambio; las pruebas de CHG-10 son por transición y por diálogo. Además el STRATEGY asigna la traza a CHG-10 («completo con CHG-11»). | Un criterio de éxito del PRD sin evidencia planificada; `TRACEABILITY.md` no tendría cómo cerrar `SC-04` | Añadir a las tareas de CHG-11 (y citarlo en su proposal/design) una prueba del ciclo completo (integración y un recorrido Playwright por los siete estados con comprobación pública tras cada cambio), declarar el dueño `SC-04` = CHG-11 con soporte CHG-10, y registrar la diferencia BACKLOG/STRATEGY sin editar fuentes aprobadas salvo orden |
| GATE-002 | MINOR | `diagnosis-and-estimate/tasks.md` (3.1, 7.x); `admin-access/tasks.md` 5.2; `security-hardening-pass/tasks.md` 5.2 | El escenario «Sesión expirada» de CHG-11 no tiene una tarea de verificación explícita (`SESSION_EXPIRED` sin escritura al guardar diagnóstico/costo). Además, no existe un mecanismo común (registro de acciones) que garantice que la prueba parametrizada sin sesión de CHG-08 cubra las acciones de CHG-10–13; la cobertura total depende del Pass de CHG-14 al final | Hueco de regresión `SC-12` hasta la Fase 7 tardía | Añadir la verificación a CHG-11; definir en CHG-08 un registro de acciones administrativas que cada change posterior amplíe, y reflejarlo en las tareas de CHG-10–13 |
| GATE-003 | MINOR | `production-environment-baseline/design.md` D9 («smoke de release de CHG-15 que lo amplía con el flujo funcional»), `…/tasks.md` (línea de CHG-15 «completa el smoke funcional»), `release-readiness/tasks.md` 8.1 («implementar el proyecto `test:smoke`») | La propiedad aprobada (R8) es mecanismo en CHG-07, ejecución/evidencia/cierre en CHG-15, pero CHG-07 conserva la redacción «smoke funcional/de release» y la tarea 8.1 de CHG-15 suena a crear el proyecto de nuevo, duplicando CHG-07 6.2 | Riesgo de duplicación del proyecto de smoke y de interpretar a CHG-15 como dueño funcional | Reescribir 8.1 como «extender el proyecto `test:smoke` de CHG-07 con …» y alinear la nota de CHG-07 |
| GATE-004 | MINOR | `diagnosis-and-estimate/specs/public-order-tracking/spec.md` («No change history in the public view») | «…sino únicamente los valores vigentes publicados y el historial de estados» puede leerse como exclusión de los datos base y de las notas públicas que añade CHG-12; se vuelve falsa en el V1 acumulado | Contradicción potencial al consolidar la main spec | Reformular sin exclusividad («no mostrar los historiales de diagnóstico ni de costo») |
| GATE-005 | MINOR | specs `public-order-tracking` de CHG-06 («Sin información adicional todavía»), CHG-11 («Ausencia sin errores») y CHG-12 («Sin notas todavía»); DESIGN §PUB-05/`E6` | Tres mensajes vacíos distintos («no hay información disponible/adicional»); con una orden sin diagnóstico publicado ni notas podrían mostrarse dos mensajes redundantes o contradictorios | Inconsistencia de UX en PUB-05 | Definir en el design de CHG-12 (o CHG-11) la composición del estado vacío en un único mensaje, alineado con DESIGN |
| GATE-006 | CLEANUP | `repair-request-registration/proposal.md` (fuera de alcance: «administración y login (CHG-07/08)») | Referencia errónea a CHG-07 (es la línea base de Production); el login es CHG-08 | Ninguno normativo | Corregir a «CHG-08» |
| GATE-007 | CLEANUP | `admin-order-detail/proposal.md`; `diagnosis-and-estimate/design.md`; solape «Administrative status history» (CHG-09b) / «Combined administrative history» (CHG-11) | Frases de alcance histórico («en modo lectura», «futuras notas públicas») y dos requisitos que describen la misma sección de historial; coherentes, pero redundantes al consolidar | Ninguno normativo | Conservar como contexto o ajustar de forma documental; opcional: nota de que el combinado extiende al de estados |
| GATE-008 | CLEANUP | OPENSPEC-STRATEGY §11 vs BACKLOG §11.1 | La traza de `SC-04` difiere (CHG-10 «completo con CHG-11» vs CHG-11 primario) | Ambigüedad de dueño | Registrar; resolver con GATE-001 sin editar fuentes aprobadas |

## 23. Pendiente para la Fase 7 (no son hallazgos)

- **AV-1, AV-2 y AV-3** sin ejecutar; comprobación acotada ESM/Prisma de AV-2 recomendada antes de CHG-01.
- Detalles de implementación explícitamente diferidos: mecanismo del singleton de `admin_users`, `GRANT UPDATE` por columnas, escape de `LIKE`, bloqueo de fila (`SELECT … FOR UPDATE`), sintaxis exacta de GitHub Actions, normalización de IP/prefijo IPv6, mecanismo del *seed*, nombres de documentos de evidencia, comandos de runbooks, *viewports* concretos.
- Aprobaciones externas: protecciones de `main`, Environment `production`, integración de Neon/Vercel, instalación de dependencias (cada una con aprobación explícita).
- Evidencia operativa: Security Pass real, smoke de Production, revisión manual `SC-15`, ejecución de CI real, `TRACEABILITY.md` con estados reales. M5 no está alcanzado.
- Este gate **no autoriza `/opsx:apply`**: la Fase 7 requiere autorización explícita del usuario. Sin sync, archive ni main specs.

## 24. Recomendación final del gate (primera pasada)

**FAIL (primera pasada)** por GATE-001 (MAJOR) y los MINOR GATE-002 a GATE-005. Véase §25 y §26 para el resultado tras las correcciones.

Veredicto de la primera pasada: **FAIL**

---

## 25. Corrective pass

Correcciones aprobadas por el usuario (GATE-005 reclasificado tras una reauditoría de comportamiento). Ninguna fuente funcional fue modificada (PRD, DESIGN, Technical Design, ADR y BACKLOG intactos). Única fuente de planificación editada: `OPENSPEC-STRATEGY.md` (una fila).

| ID | Disposición final | Corrección | Archivos modificados |
|---|---|---|---|
| GATE-001 | **RESOLVED** | Era un vacío de **evidencia**, no de comportamiento; no se creó ningún requisito nuevo. Se añadió a CHG-11 la sección «Ciclo completo (`SC-04`)» con el Playwright independiente SR → EQUIPO_RECIBIDO → EN_DIAGNOSTICO → (diagnóstico y costo) → ESPERANDO_APROBACION → EN_REPARACION → LISTO_PARA_RECOJO → ENTREGADO, con comprobación pública (interfaz real) tras cada una de las seis transiciones, distinta de `E2E-01`/`SC-17` (que sigue terminando en ESPERANDO_APROBACION); tarea 7.2 y trazabilidad (7.3); contribución actualizada. CHG-10 conserva el soporte (sin duplicar la prueba) | `diagnosis-and-estimate/{design,tasks,proposal}.md` |
| GATE-002 | **RESOLVED** | CHG-08 define el patrón y el *harness* de una **matriz de autorización de acciones administrativas, solo de pruebas** (sin registro de acciones en el producto) y los changes posteriores amplían la matriz; tarea 5.4 en CHG-08. CHG-11 añade `saveDiagnosis` y `saveEstimatedCost` sin sesión (`SESSION_EXPIRED`, sin escritura, sin historial, sin cambio de versión): tarea 3.4. CHG-10 (4.1 «pruebas de integración parametrizadas de sesión inválida»), CHG-12 (7.1) y CHG-13 (3.1) ya lo cubrían sin ambigüedad: *already covered*, no se tocaron. CHG-14 solo reverifica | `admin-access/{design,tasks}.md`, `diagnosis-and-estimate/tasks.md` |
| GATE-003 | **RESOLVED** (R8 VERIFIED) | CHG-07 = mecanismo `test:smoke` y *baseline* de Production; CHG-15 = ejecución final, evidencia y cierre de `SC-20`, reutilizando el mecanismo y extendiendo aserciones solo si la evidencia aprobada lo exige. Tarea 8.1 de CHG-15 ya no «implementa» el proyecto; la redacción residual «smoke funcional / de release» de CHG-07 se alineó. TD §25.6 sin cambios | `production-environment-baseline/{proposal,design,tasks}.md`, `release-readiness/{proposal,design,tasks}.md` |
| GATE-004 | **RESOLVED** | Requisito *No change history in the public view* reformulado sin exclusividad: no se exponen versiones anteriores ni historial de diagnóstico o costo; cuando son públicos solo se muestran los valores vigentes; la línea de tiempo pública sigue siendo solo de transiciones de estado con fecha; otros contenidos expresamente autorizados por requisitos de la capacidad (p. ej. las notas públicas de CHG-12) pueden coexistir. La lista positiva de `SC-11` no se debilita. Validado: `public-order-tracking`, `diagnosis-and-estimate`, `order-notes` | `diagnosis-and-estimate/specs/public-order-tracking/spec.md` |
| GATE-005 | **NOT A DEFECT** | Reauditoría de comportamiento: ninguna spec exige ocultar una sección mientras otra exige mostrarla; ninguna trata la ausencia como error; ninguna presenta datos privados; todas cumplen `E6` (ausencia → sin error, sin sección rota, mensaje informativo claro). PRD y DESIGN no exigen un copy literal único; los textos contextuales distintos (p. ej. «diagnóstico y costo aún no disponibles», «aún no hay notas públicas») son microcopy de implementación. No se modificó ningún archivo ni DESIGN | — |
| GATE-006 | **RESOLVED** | «administración y login (CHG-07/08)» → «(CHG-08)» | `repair-request-registration/proposal.md` |
| GATE-007 | **RESOLVED** (frases engañosas ajustadas; el resto ACCEPTED HARMLESS) | CHG-09b `proposal.md`: «solo lectura» ahora es «solo lectura por defecto en este change (línea base)…» con las mutaciones añadidas por los changes posteriores; CHG-11 `design.md` y `tasks.md`: «futuras notas» → «notas públicas que añade CHG-12». El solape entre *Administrative status history* (CHG-09b) y *Combined administrative history* (CHG-11) es coherente y se acepta como inocuo (el combinado extiende al de estados) | `admin-order-detail/proposal.md`, `diagnosis-and-estimate/{design,tasks}.md` |
| GATE-008 | **RESOLVED** | `OPENSPEC-STRATEGY.md` §16.1 asignaba `SC-04` a «CHG-10 (completo con CHG-11)»; ahora «CHG-11 (propietario primario de la evidencia del ciclo completo; soporte CHG-10)», coherente con BACKLOG §11.1 (que **no** se modificó). Sin cambios en DAG, dependencias, propiedad de capabilities, numeración ni alcance | `docs/04-planificacion/OPENSPEC-STRATEGY.md` |

**Recuento de tareas tras el corrective pass:** CHG-08 23 → **24** (+5.4); CHG-11 19 → **21** (+3.4, +7.2; la trazabilidad pasa de 7.2 a 7.3). `tasks.md`, `openspec list` y `openspec status` coinciden. Total 374. Los demás changes no cambian.

**Validación del corrective pass:** `validate --strict` individual de `admin-access`, `repair-status-lifecycle`, `diagnosis-and-estimate`, `order-notes`, `order-data-correction`, `production-environment-baseline`, `release-readiness`, `public-order-tracking`, `repair-request-registration` y `admin-order-detail`: válidos; global 16/16; 16 changes activos; 0 main specs.

## 26. Segunda auditoría completa (tras el corrective pass)

Se reauditó el conjunto completo (no solo los archivos modificados):

- **16 changes, 6 SKIP_SPECS, 10 DELTA SPECS, 8 capabilities, 9 pantallas:** sin cambios ni capabilities nuevas; sin colisiones de requisitos (130 requisitos y 298 escenarios, todos `ADDED`); `Purpose` solo en la creación; cadenas y orden de archivado factibles; DAG y tipos de dependencia intactos; AV-1/2/3 únicamente («AV-4» solo en frases «no se crea»).
- **SC 20/20 ESPECIFICADO / PLANIFICADO** (ya no hay gap; `SC-04` primaria CHG-11 con soporte CHG-10; `SC-12` primaria CHG-08, soporte de cada change administrativo, verificación final CHG-14; `SC-17` = `E2E-01`, prueba distinta). No significa `runtime PASS`.
- **E 17/17 ESPECIFICADO**, sin cambio de dueños; `E11` mantiene los cuatro casos exactos.
- **R1–R8:** R1 VERIFIED, R2 VERIFIED, R3 VERIFIED, R4 VERIFIED, R5 VERIFIED, R6 VERIFIED, R7 VERIFIED, R8 VERIFIED.
- **Seguridad, privacidad, concurrencia, persistencia, pruebas:** sin cambios respecto de §15–§18; los cambios del corrective pass no introducen comportamiento funcional ni *scope creep*.
- **Hallazgos nuevos:** ninguno.

Conteo: BLOCKER 0 · MAJOR 0 · MINOR 0 · CLEANUP 2 inocuos aceptados (solape de requisitos de historial 09b/11; narrativas históricas de proposals como la de CHG-06) sin corrección requerida.

El gate no autoriza `/opsx:apply`; la Fase 7 requiere autorización explícita del usuario. Sin sync, archive ni main specs.

**Veredicto técnico: PASS WITH NON-BLOCKING CLEANUP.**

## 27. Cierre formal

- **Final technical verdict:** PASS WITH NON-BLOCKING CLEANUP.
- **Formal review:** APPROVED (segunda pasada aprobada por el usuario: BLOCKER = 0, MAJOR = 0, MINOR = 0; los CLEANUP restantes son deliberadamente no bloqueantes y no requieren otra ronda antes de la Fase 7).
- **Historial conservado:** primera pasada → FAIL; corrective pass → completado; segunda auditoría completa → PASS WITH NON-BLOCKING CLEANUP.
- **Disposición final de los hallazgos:** GATE-001 RESOLVED · GATE-002 RESOLVED · GATE-003 RESOLVED · GATE-004 RESOLVED · GATE-005 NOT A DEFECT · GATE-006 RESOLVED · GATE-007 RESOLVED / ACCEPTED HARMLESS donde corresponde · GATE-008 RESOLVED.
- **Cobertura de planificación:** 16/16 changes · 6/6 SKIP_SPECS · 10/10 DELTA SPECS · 8/8 capabilities · 9/9 pantallas · SC 20/20 ESPECIFICADO / PLANIFICADO · E 17/17 ESPECIFICADO / PLANIFICADO · R1–R8 VERIFIED. Esto **no** significa «20/20 runtime passed»: no existe implementación.
- **Main specs:** 0 (correcto: main specs = comportamiento implementado + verificado + archivado). Los 16 changes siguen activos porque ninguno se ha aplicado.
- **Hitos:** M4 completamente especificado, no implementado; M5 completamente planificado, no alcanzado. `VAL-04` permanece **OPEN**.
- **Tareas:** 374 en total (suma reproducible de los 16 `tasks.md`).
- **Fase 6 — COMPLETADA** (6.1, 6.2, 6.3, 6.4 y 6.5 ✅). **Fase 7 — NO INICIADA**: comienza obligatoriamente por el Architecture Validation Gate (AV-1/AV-2/AV-3, no ejecutado) y requiere autorización explícita del usuario change por change; este cierre **no autoriza `/opsx:apply`**.
