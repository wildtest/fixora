# Proposal

## Why

FIXORA necesita una **verificación final y reproducible** que demuestre que la funcionalidad, las pruebas, la seguridad, el responsive, el CI/CD, la persistencia, el despliegue y la operación mínima están suficientemente evidenciados para considerar V1 **lista para evaluación y demostración**. Cada comportamiento ya pertenece a su change dueño; falta reunir, comprobar y documentar la evidencia final, completar la trazabilidad (`SC-01…SC-20`, `E1…E17`), preparar el *seed* ficticio, los runbooks, el smoke de Production y el plan de retiro de la demo, y decidir el estado de release con honestidad.

## What Changes

CHG-15 es un change de **verificación y entrega**; no es dueño funcional de la persistencia, la interfaz, el responsive, el E2E, CI/CD, el despliegue, la autenticación, el seguimiento, el ciclo de vida, las notas ni la seguridad. Planifica, sin ejecutar nada ahora:

- **`TRACEABILITY.md` final** (20/20 `SC`, 17/17 `E`) con dueño, nivel, evidencia y estado real.
- Cierre de evidencia de `SC-14` (persistencia), revisión manual estructurada de `SC-15` (público y administración, escritorio y móvil), verificación de que `E2E-01` (`SC-17`) pasa realmente, inspección del pipeline (`SC-19`) y demostración de `SC-20` con el **smoke de Production** y el flujo manual de cierre con datos ficticios.
- *Seed* ficticio de demostración (`seed:demo`, mecanismo controlado), runbooks RB-1…RB-9 y el procedimiento *break-glass* de privacidad en `docs/09-deploy/`.
- **Plan de retiro de la demo**, evidencia de operación mínima, riesgos residuales, `VAL-04` explícito y la **decisión de release**.

No añade funcionalidad, endpoints ni interfaz. Si en la Fase 7 aparece un comportamiento faltante o un fallo que exige cambiar el contrato observable, **no** se convierte CHG-15 en DELTA SPECS: se abre un **nuevo change correctivo funcional** sobre la capability propietaria (mismo principio que CHG-14).

## Capabilities

### New Capabilities
Ninguna. Es un change de entrega y calidad (`SKIP_SPECS`).

### Modified Capabilities
Ninguna. No se crea una capability `release`, `deployment`, `release-readiness` ni `operations`.

## Dependencias

- **Hard:** CHG-14 (Security Pass cerrado). **Delivery:** CHG-07 (Production y flujo de entrega). **AV:** resultados de **AV-3** (no se ejecuta aquí).
- **Para ejecutar en la Fase 7:** CHG-14 completado, Production operativa, CHG-07 operativo, AV-3 disponible y un CI real. Esto no impide materializar el plan ahora.
- Consume sin redefinir: CHG-02 (persistencia), CHG-03 (pipeline y `TRACEABILITY.md`/`test:trace`), CHG-04 y las pantallas de cada slice (responsive), CHG-07 (mecanismo y *baseline* del smoke, flujo de migración), CHG-11 (dueño de `E2E-01`) y CHG-14 (informe de seguridad).

## Impact

- **Documentos que respaldan el cambio:** PRD `SC-14`, `SC-15`, `SC-17`, `SC-18`, `SC-19`, `SC-20`, `VAL-03`, `VAL-04`, `RIE-20`; `DESIGN.md` §14 y §15; Technical Design §24, §25, §25.6, §26, §27; ADR-008, ADR-009, ADR-010; backlog `CHG-15` y `M5`.
- **Criterios PRD:** cierre de `SC-14`, `SC-15` (dueño), `SC-17`, `SC-19` y `SC-20`; completa `TRACEABILITY.md`.
- **M5** se alcanzará **solo durante la ejecución en la Fase 7**, cuando se cumpla el DoD; durante la Fase 6.4 está únicamente planificado.
- **Código afectado (cuando se ejecute):** `seed:demo`, extensión de las aserciones del `test:smoke` de CHG-07, `TRACEABILITY.md` y documentos en `docs/07-testing/` y `docs/09-deploy/`.
- **Dependencias:** ninguna nueva.
- **Fuera de alcance:** funcionalidad nueva; repetir el Security Pass; un porcentaje global de cobertura; regresión visual; certificación de navegadores, WCAG o usabilidad con usuarios (`VAL-03`); Sentry, analíticas, OTel o monitor externo; afirmaciones legales o de cumplimiento (`VAL-04`).
