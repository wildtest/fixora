# CLAUDE.md — FIXORA

Lee también `AGENTS.md`: esta versión de Next.js tiene cambios incompatibles con lo que podrías conocer. Antes de escribir código de Next.js, consulta la guía correspondiente en `node_modules/next/dist/docs/`.

## Contexto

**FIXORA** — "Tu reparación, siempre bajo control."

Aplicación web responsive para pequeños servicios técnicos de reparación de equipos tecnológicos. Proyecto final de la especialización "Desarrollo de Software AI-First con Claude".

## Problema que resuelve

Muchos pequeños servicios técnicos gestionan las reparaciones por WhatsApp, llamadas, papel o Excel. Eso desorganiza el taller y obliga al cliente a preguntar repetidamente por el estado de su equipo.

## Usuarios V1

- **Cliente** (sin cuenta): registra una solicitud de reparación, recibe un código de seguimiento y consulta después el estado con ese código.
- **Administrador** (zona protegida): consulta órdenes, registra diagnóstico y costo estimado, actualiza estados, agrega información pública, mantiene notas internas y consulta el historial.

## Estados (flujo conceptual)

Solicitud recibida → Equipo recibido → En diagnóstico → Esperando aprobación → En reparación → Listo para recojo → Entregado. Además existe **Cancelado** cuando las reglas de negocio lo permitan.

No todas las transiciones son válidas (p. ej. una solicitud nueva no puede pasar directamente a Entregado). La matriz exacta de transiciones y sus reglas están aprobadas en el PRD (`docs/01-producto/PRD.md`, §4.4); el Technical Design decide cómo se implementan.

## Diferenciadores aprobados

1. Repair Journey visual.
2. Seguimiento por código sin cuenta de cliente.
3. Máquina de estados real con transiciones controladas.
4. Separación estricta entre información pública y notas internas.

## Alcance V1

Landing · registro de solicitud · código de seguimiento · consulta pública · timeline de estados · login administrativo · dashboard · listado y búsqueda de órdenes · detalle de orden · diagnóstico · costo estimado · cambio controlado de estados · historial de cambios · notas públicas · notas internas · persistencia de datos · testing E2E · Security Pass · CI/CD · deploy en Vercel.

## Fuera de alcance V1

Cuentas, registro/login y recuperación de contraseña de clientes · múltiples roles administrativos · múltiples técnicos con permisos distintos · multiempresa · múltiples sucursales · inventario de repuestos · facturación · pagos online · WhatsApp automático · SMS · email automático · fotos de dispositivos · firma digital · app móvil · diagnóstico con IA · chat cliente-técnico.

## Mapa documental

Fuente de verdad en `docs/` (ver `docs/README.md`). Cada documento consume el anterior.

| Fase | Ruta |
|---|---|
| 00 Definición | `docs/00-definicion/PROJECT-BRIEF.md` |
| 01 PRD | `docs/01-producto/PRD.md` |
| 02 Diseño | `docs/02-diseno/` |
| 03 Arquitectura (Technical Design + ADRs) | `docs/03-arquitectura/` |
| 04 Backlog | `docs/04-backlog/` |
| 05 Specs / OpenSpec | `docs/05-specs/` |
| 06 Diagramas | `docs/06-diagramas/` |
| 07 Testing | `docs/07-testing/` |
| 08 Seguridad | `docs/08-seguridad/` |
| 09 Deploy | `docs/09-deploy/` |

## Fuente de verdad funcional

`docs/00-definicion/PROJECT-BRIEF.md` es el punto de partida. **`docs/01-producto/PRD.md` es la fuente de verdad funcional aprobada de FIXORA V1**; el detalle vigente del alcance, el no alcance, los criterios de éxito (`SC-*`), los casos borde (`E*`) y los supuestos y riesgos (`SUP-*`, `VAL-*`, `RIE-*`) está allí. Las fases siguientes derivan de esos documentos.

Lee el PRD antes de:

- proponer funcionalidad;
- diseñar pantallas;
- tomar decisiones de arquitectura que dependan del producto;
- crear backlog;
- crear specs;
- implementar comportamiento funcional.

No modifiques silenciosamente decisiones del PRD. Si una fase posterior exige cambiar una decisión de producto aprobada, señala primero la contradicción y actualiza la documentación de forma explícita y trazable.

## Estado actual del pipeline

```
00 Definición   COMPLETADO
01 PRD          COMPLETADO
02 Diseño       EN CURSO (Exploración UX COMPLETADA; sistema visual PENDIENTE)
03 Arquitectura PENDIENTE
04 Backlog      PENDIENTE
05 Specs        PENDIENTE
06 Diagramas    PENDIENTE
07 Testing      PENDIENTE
08 Seguridad    PENDIENTE
09 Deploy       PENDIENTE
```

Fase 01 aprobada: el PRD (`docs/01-producto/PRD.md`) fue aprobado el 2026-10-25. La exploración UX con Google Stitch (parte de 02 Diseño) está completada: existe una **Dirección UX Consolidada aprobada** documentada en `docs/02-diseno/UX-EXPLORATION.md` (con `STITCH-BRIEF.md` y las evidencias en `docs/02-diseno/evidencias/stitch/`). La siguiente fase es Claude Design + sistema visual.

- `PRD.md` continúa siendo la **fuente de verdad funcional**.
- `UX-EXPLORATION.md` es la **fuente de verdad de estructura UX y navegación aprobada** (nueve pantallas, flujos, estados).
- Cualquier trabajo de sistema visual debe partir de **PRD + UX-EXPLORATION**.
- No introduzcas silenciosamente nuevas pantallas, flujos ni funcionalidades. Las capturas de Stitch son evidencia, no requisitos: contienen contenido fuera del PRD (ver `UX-EXPLORATION.md` §8 y §19.5) y sus colores, tipografías y componentes son provisionales, no un Design System.

Mantén esta tabla actualizada (aquí y en `docs/README.md`) cuando una fase cambie de estado.

## Stack

Next.js (App Router, `src/`), React y Tailwind CSS están instalados.

**Restricción de entrega:** FIXORA V1 debe disponer de un despliegue público de demostración en Vercel. Vercel figuraba antes como provisional; se fijó durante el PRD (§4.11, `SUP-10`). El Technical Design decide *cómo* desplegar en Vercel, no *si* se utiliza.

Todo lo demás es **provisional y NO aprobado**: persistencia, base de datos, ORM y proveedor (PostgreSQL, Prisma y Neon son solo direcciones provisionales), autenticación y sesiones, OpenSpec, Playwright y GitHub Actions. Se decidirán en el Technical Design.

## Comandos disponibles hoy

- `npm run dev` — servidor de desarrollo.
- `npm run build` — build de producción.
- `npm run start` — servidor de producción (requiere build).
- `npm run lint` — ESLint.

No existen aún scripts de test, typecheck ni base de datos. No inventes ni asumas otros comandos.

## Reglas duras para Claude Code

1. **Consulta antes de implementar.** Antes de planificar código, lee los documentos relevantes de `docs/`, incluido el PRD aprobado (`docs/01-producto/PRD.md`).
2. **No inventes funcionalidades.** Implementa solo lo documentado y aprobado.
3. **Fuera de alcance = no se implementa silenciosamente.** Si algo parece necesario pero está fuera de alcance, detente y consúltalo.
4. **No modifiques decisiones aprobadas de producto en silencio.** Cualquier cambio se propone explícitamente y se refleja en el documento correspondiente.
5. **No conviertas supuestos en decisiones aprobadas.** Márcalos como supuestos.
6. **No corrijas riesgos aceptados en silencio.** Si encuentras uno, repórtalo; no lo "arregles" por tu cuenta.
7. **Verifica antes de dar por terminada una tarea de código:** ejecuta las verificaciones disponibles (`npm run lint`, `npm run build` y las que existan en el futuro) y reporta los resultados con honestidad, incluidos los fallos.
8. **No hagas commits ni push** salvo que se te pida.
9. **No agregues dependencias** sin necesidad justificada y aprobada.

## Reglas sobre decisiones arquitectónicas

- No implementes decisiones de arquitectura futuras (base de datos, ORM, autenticación, estructura de API, estrategia de despliegue, etc.) antes de que exista el **TECH-DESIGN** aprobado. **Vercel ya está fijado como destino de despliegue**; lo pendiente es definir cómo se desplegará y operará FIXORA allí. Antes del Technical Design no inventes arquitectura de hosting, integración con persistencia, ambientes, estrategia de variables, CI/CD, funciones/serverless ni decisiones técnicas equivalentes.
- Toda decisión arquitectónica importante futura debe quedar registrada mediante un **ADR** en `docs/03-arquitectura/`.
- Cuando OpenSpec sea incorporado, los cambios de comportamiento deben pasar por una **Spec** antes de implementarse.
- Cuando la arquitectura quede definida, el **servidor será la fuente de verdad** de las reglas de negocio sensibles (transiciones de estado, separación público/interno, autorización); el cliente nunca es la única barrera.

## Reglas de seguridad

- **Nunca leas ni expongas archivos `.env` reales** (`.env`, `.env.local`, `.env.e2e`, `admin-credentials.local`, etc.). `.claude/settings.json` los bloquea; no intentes rodearlo.
- **Nunca guardes secretos en el repositorio**: ni en código, ni en docs, ni en ejemplos, ni en commits.
- `.env.example` solo documenta nombres de variables, sin valores reales.
- La información interna del taller (notas internas) nunca debe llegar a vistas ni respuestas públicas.
- Trata toda entrada de usuario como no confiable.
