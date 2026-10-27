# FIXORA — Project Brief

> Fase 00 · Definición · Estado: **COMPLETADO**
>
> Este documento recoge únicamente las decisiones aprobadas hasta ahora. No introduce funcionalidades nuevas. Es la entrada del PRD (`docs/01-producto/`).

## 1. Identidad

- **Nombre:** FIXORA
- **Eslogan:** "Tu reparación, siempre bajo control."
- **Tipo:** aplicación web responsive para pequeños servicios técnicos de reparación de equipos tecnológicos.

## 2. Problema

Muchos pequeños servicios técnicos gestionan las reparaciones mediante WhatsApp, llamadas, papel o Excel. Esto:

- dificulta la organización del taller;
- obliga al cliente a preguntar repetidamente cuál es el estado de su equipo.

## 3. Usuarios V1

### 3.1 Cliente

- No tiene cuenta.
- Puede registrar una solicitud de reparación.
- Obtiene un código de seguimiento.
- Puede consultar después el estado de su reparación mediante ese código.

### 3.2 Administrador

- Accede mediante una zona administrativa protegida.
- Puede consultar las órdenes.
- Puede registrar diagnóstico.
- Puede registrar costo estimado.
- Puede actualizar estados.
- Puede agregar información pública para el cliente.
- Puede mantener notas internas.
- Puede consultar el historial de la reparación.

## 4. Flujo conceptual de estados

```
Solicitud recibida
→ Equipo recibido
→ En diagnóstico
→ Esperando aprobación
→ En reparación
→ Listo para recojo
→ Entregado
```

También existirá el estado **Cancelado**, cuando las reglas de negocio lo permitan.

**Regla de producto:** NO todas las transiciones de estado son válidas. Ejemplo: una solicitud recién creada no puede pasar directamente a Entregado.

> Las transiciones concretas permitidas se definirán en el PRD y el Technical Design; este brief no las enumera.

## 5. Diferenciadores aprobados

1. **Repair Journey** visual para representar el avance de la reparación.
2. **Seguimiento mediante código** sin necesidad de cuenta de cliente.
3. **Máquina de estados real** con transiciones controladas.
4. **Separación estricta** entre información pública y notas internas del taller.

## 6. Alcance V1

- Landing.
- Registro de solicitud de reparación.
- Generación de código de seguimiento.
- Consulta pública de reparación.
- Timeline de estados.
- Login administrativo.
- Dashboard administrativo.
- Listado y búsqueda de órdenes.
- Detalle de orden.
- Registro de diagnóstico.
- Registro de costo estimado.
- Cambio controlado de estados.
- Historial de cambios.
- Notas públicas.
- Notas internas.
- Persistencia de datos.
- Testing E2E.
- Security Pass.
- CI/CD.
- Deploy en Vercel.

## 7. Fuera de alcance V1

- Cuentas de clientes.
- Registro/login de clientes.
- Recuperación de contraseña.
- Múltiples roles administrativos.
- Múltiples técnicos con permisos diferentes.
- Multiempresa.
- Múltiples sucursales.
- Inventario de repuestos.
- Facturación.
- Pagos online.
- WhatsApp automático.
- SMS.
- Email automático.
- Fotos de dispositivos.
- Firma digital.
- Aplicación móvil.
- Diagnóstico mediante IA.
- Chat cliente-técnico.

## 8. Dirección tecnológica PROVISIONAL

Ninguno de estos elementos está aprobado arquitectónicamente. Se decidirán formalmente en el Technical Design (`docs/03-arquitectura/`) y quedarán registrados en ADRs.

- Next.js App Router
- React
- Tailwind CSS
- PostgreSQL
- Prisma
- Neon
- Claude Code
- OpenSpec
- Playwright
- GitHub Actions

PostgreSQL, Prisma, Neon y la autenticación en particular **no están aprobados**.

### Actualización de trazabilidad — Vercel (2026-10-25)

Vercel figuraba originalmente en la lista anterior como tecnología provisional. Durante la construcción y aprobación del PRD (`docs/01-producto/PRD.md`, §4.11 y `SUP-10`) se decidió establecerlo como **destino obligatorio del despliegue público de FIXORA V1** (despliegue público de demostración). Por tanto, Vercel **deja de ser provisional** y es una restricción de entrega fija.

El Technical Design decidirá **cómo** desplegar correctamente en Vercel (integración con CI/CD, variables, persistencia y limitaciones), no **si** se utiliza Vercel.

El resto de elementos de la lista anterior continúa provisional hasta el Technical Design.

### Actualización de trazabilidad — Technical Design (2026-10-26)

Esta sección conserva la dirección tecnológica provisional **tal como estaba al definir el proyecto**. Las decisiones técnicas vigentes están en `docs/03-arquitectura/TECHNICAL-DESIGN.md` y sus ADRs (`docs/03-arquitectura/adrs/`), que aprueban, entre otras, PostgreSQL en Neon y Prisma ORM 7.x. OpenSpec se inicializará después de cerrar la Fase 5. La Fase 5 se cerró el 2026-10-26.

## 9. Pipeline del proyecto

```
00 Definición
→ 01 PRD
→ 02 Diseño
→ 03 Technical Design + ADRs
→ revisión adversarial
→ 04 Backlog
→ 05 Spec + Tasks / OpenSpec
→ código
→ code review
→ diagramas
→ testing
→ security pass
→ deploy + CI/CD
```

Cada artefacto posterior debe responder a los documentos anteriores. Ver `docs/README.md`.
