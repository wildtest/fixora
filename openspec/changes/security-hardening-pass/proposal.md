# Proposal

## Why

Con la funcionalidad V1 especificada completa (M4: CHG-01…CHG-13), los controles de seguridad ya pertenecen a sus changes dueños (sesiones, privacidad, limitadores, logger, roles de base de datos, entorno). Falta una **verificación de seguridad integrada y formal** que compruebe que esos controles funcionan **juntos** en el sistema construido, sobre PostgreSQL real, con la configuración de CI/CD y en el **despliegue real**, y que deje un informe con evidencia, severidad y disposición (`SC-18`). La regresión automatizada de seguridad en CI y el Security Pass son actividades complementarias: ninguna reemplaza a la otra.

## What Changes

CHG-14 **verifica y endurece; no es dueño funcional de ningún control**. Planifica, sin ejecutar nada ahora:

- Una **revisión de la cobertura automatizada** de seguridad ya existente y el añadido de pruebas faltantes para controles ya aprobados (hardening técnico, sin comportamiento nuevo).
- El **Security Pass formal** sobre el sistema construido y el despliegue de Vercel: reverificación de `SC-11` (con una orden completamente poblada) y `SC-12` (páginas y Server Actions), sesión y cookie, login y consulta contra abuso, XSS/CSRF/SQL, CSP y cabeceras efectivas, caché y fuga por URL/almacenamiento, registro y logs reales, secretos, privilegios del rol runtime, aislamiento de Preview, flujo de migración y cadena de suministro.
- La **clasificación de hallazgos** (severidad, disposición, evidencia), la **remediación** técnica dentro de CHG-14 cuando preserva el comportamiento observable, el **enrutamiento a un change correctivo funcional** cuando no lo preserva, y el **retest**.
- Un **informe formal** en `docs/08-seguridad/` (se genera en la Fase 7; no existe ni se simula ahora).

No promete ninguna funcionalidad, comportamiento ni control nuevos.

## Capabilities

### New Capabilities
Ninguna. Es un change de calidad (`SKIP_SPECS`): no introduce comportamiento observable.

### Modified Capabilities
Ninguna. No se crea una capability `security-hardening`. Si un hallazgo exige cambiar el contrato observable, **no** se convierte CHG-14 en DELTA SPECS: se abre después un **nuevo change correctivo funcional** sobre la capability afectada.

## Dependencias

- **Hard:** CHG-11, CHG-12 y CHG-13 (con ellos, M4 completa: CHG-01…CHG-13 implementados y verificados).
- **Delivery:** CHG-07 (Production disponible y flujo de entrega operativo).
- **AV:** resultados de **AV-3** (no se ejecuta aquí). CHG-14 no puede cerrarse en la Fase 7 sin ellos.
- **Entrada para ejecutar el Pass:** M4 implementada, despliegue de Production disponible y baseline de despliegue operativo. Esto no impide materializar el plan ahora.
- Audita como fuentes de controles (sin redefinirlos): CHG-01, 02, 03, 06, 07, 08, 10, 11, 12 y 13.

## Impact

- **Documentos que respaldan el cambio:** PRD `SC-18`, `SC-11`, `SC-12` y `RIE-01`; Technical Design §21 (seguridad), §22 (abuso), §23 (logging), §24 (testing y Security Pass), §25 (despliegue), §27 (riesgos), §29 (AV-3); ADR-004, ADR-005, ADR-007, ADR-008, ADR-009, ADR-010; backlog `CHG-14`.
- **Criterios PRD:** dueño de `SC-18`; reverificación de `SC-11` y `SC-12`.
- **Código afectado (cuando se ejecute):** solo endurecimiento técnico que preserve el comportamiento (configuración, cabeceras, pruebas de regresión, allowlist del logger, privilegios) y el informe en `docs/08-seguridad/`.
- **Dependencias:** ninguna nueva (sin WAF, Redis, Sentry, OTel, SIEM, CAPTCHA, MFA, OAuth ni proveedor de identidad).
- **Fuera de alcance:** pruebas de carga, estrés, DDoS o rendimiento; *pentest* teatral o escáneres sin análisis; rediseño anti-spam del registro (`E13`); rediseño de despliegue; hallazgos inventados; el release (CHG-15).
