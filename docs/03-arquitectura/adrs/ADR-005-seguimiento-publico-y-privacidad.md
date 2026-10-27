# ADR-005 — Seguimiento público y frontera de privacidad

> Estado: Aceptado
> Fecha: 2026-10-26
> Fase: 5 — Technical Design / Arquitectura
> Relacionado con: [TECHNICAL-DESIGN.md](../TECHNICAL-DESIGN.md) §8, §9, §12, §17 · ADR-002, ADR-006, ADR-007

## Contexto

El cliente no tiene cuenta: registra una solicitud, recibe un código y lo usa para consultar el estado (PRD §4.1). El código es **el único mecanismo de acceso** a la consulta pública (`RIE-01`), que no puede exponer nombre, teléfono, correo, notas internas ni historial administrativo (`SC-11`, innegociable). Diagnóstico y costo son visibles solo desde `ESPERANDO_APROBACION` y nunca si una orden se cancela antes (`SC-08`, `E5`). Un código inexistente no debe revelar datos (`SC-13`, `E4`). El código debe poder leerse, copiarse y comunicarse verbalmente (`E16`) y tolera mayúsculas y espacios exteriores, nada más (`E15`).

## Problema / fuerzas que condicionan la decisión

- Equilibrar facilidad (cliente no técnico, móvil, a veces por teléfono) y resistencia a ser adivinado o enumerado.
- Evitar que el código termine en URL, logs, caché o historial del navegador.
- Garantizar estructuralmente —no solo con filtros— que lo interno no llega a lo público.
- El código emitido es inmutable (`E17`).

## Alternativas consideradas

### Cómo identifica el cliente su reparación
- **Código de seguimiento sin cuenta** *(elegido)*.
- **Cuentas de cliente:** fuera del alcance de V1 (PRD §5.A).
- **Consulta con teléfono o correo:** expone datos personales como identificador y abre la enumeración por datos conocidos.
- **UUID público:** no se comunica verbalmente, incumple `E16`.

### Formato del código
- **Alfanumérico sin ambigüedades de 12 caracteres** *(elegido)*.
- **Solo dígitos:** muy fácil de dictar, pero cadenas largas y propensas a transposiciones.
- **Secuencial con prefijo:** enumerable; descartado por `RIE-01`.
- **Cadena larga aleatoria o UUID:** no comunicable.

### Transporte del código
- **En el cuerpo de una petición (`POST` / Server Action)** *(elegido)*.
- **En la URL:** permite guardar enlaces, pero deja el secreto en historial, logs y *Referer*.
- **Cookie temporal de vista, token secundario o `sessionStorage` con el código:** recrean el secreto en otro lugar o lo persisten.

### Construcción de lo que se muestra
- **DTO de lista positiva con proyección mínima en la base de datos** *(elegido)*.
- **Cargar la orden administrativa completa y filtrar después (lista negra):** una omisión filtra datos internos.

## Decisión

- **Código de 12 caracteres, sin prefijo ni separadores**, del alfabeto `23456789BDFGHJKMNPRSTWX` (23 símbolos, sin vocales ni `0 O 1 I L Q Y`): ≈ **54 bits** de entropía. Se almacena en mayúsculas, es inmutable y es único (`UNIQUE`); no es clave primaria (las relaciones usan el UUID interno).
- **Generación** con el CSPRNG de `node:crypto`, selección uniforme, sin contadores ni datos derivados; la colisión se reintenta de forma acotada. El dominio define alfabeto, longitud, normalización y validación.
- **Normalización exacta (`E15`):** espacio exterior, minúsculas ASCII a mayúsculas, validación de longitud y alfabeto, comparación exacta. Sin guiones, sin corrección de caracteres parecidos, sin Unicode adicional.
- **Es un secreto bearer de lectura.** Nunca va en la URL, ni se registra en logs, ni se guarda en cookies o `sessionStorage`. La consulta viaja por Server Action y la respuesta se muestra de forma efímera: un *reload* vuelve al formulario.
- **No hay recuperación pública ni cuentas de cliente.**
- **Mal formado e inexistente producen el mismo resultado** (`TRACKING_NOT_FOUND`).
- **`PublicOrderView`** se construye por **lista positiva** y con **proyección mínima** desde PostgreSQL: el caso de uso público no carga `customer_*`, notas internas, historial administrativo ni `version`, y consulta las notas con `visibility = PUBLIC`. Una prueba negativa con una orden completamente poblada protege `SC-11`.
- **Publicación de diagnóstico y costo derivada del estado y del historial**, sin ningún indicador «publicado»: visibles desde `ESPERANDO_APROBACION`; en `CANCELADO`, solo si existe un evento a `ESPERANDO_APROBACION` en `order_status_history`. Viajan agrupados en `repairDetails`, que es `null` si no corresponde.
- **La frontera positiva se aplica también a valores todavía no publicados**, no solo a datos administrativos: la consulta pública **no carga en memoria de la aplicación `diagnosis` ni `estimated_cost` mientras no sean públicos**. La autorización se aplica en la propia proyección de persistencia (preferentemente una sola consulta condicionada: estados públicos → valores; `CANCELADO` → valores solo si `EXISTS` un evento hacia `ESPERANDO_APROBACION`; otro caso → `NULL`), no como `SELECT` seguido de un mapper que lo anula. La Spec de persistencia decide la forma (Prisma o SQL parametrizado compatible). Pruebas de integración: antes de la aprobación con valores ya escritos, `CANCELADO` antes de la aprobación, `CANCELADO` después y un estado posterior normal.
- **El resultado de la consulta es efímero también en el cliente:** no sobrevive a la navegación por el estado preservado de React Activity (ADR-002); se prueba con E2E.

## Justificación

La combinación de entropía alta, aleatoriedad criptográfica, respuesta uniforme y limitación de intentos (ADR-007) hace poco práctica la enumeración sin sacrificar legibilidad. Sin vocales ni caracteres ambiguos se reducen errores de transcripción y palabras accidentales; se excluyen además letras que se confunden al dictarlas en español. Sacar el código de la URL y de los logs lo trata como la credencial que es. La lista positiva con proyección en base de datos hace que lo interno no se cargue nunca para una consulta pública, en lugar de depender de recordar excluirlo.

## Consecuencias positivas

- Consulta sin cuenta con un secreto razonable de comunicar y poco enumerable.
- Frontera de privacidad estructural, verificable con una prueba concreta.
- No se almacena ni recrea el secreto fuera de la petición.

## Consecuencias / trade-offs

- **Si el código se filtra, V1 no ofrece rotación, revocación, reemplazo ni regeneración** (`E17`). Es un **riesgo residual aceptado**; solo hay medidas operativas.
- La consulta no se guarda en favoritos: el cliente debe conservar su código (`E2`).
- Quien posee un código válido ve la información pública de esa orden; el diseño limita ese alcance a una orden y a los campos autorizados por el PRD.
- `RIE-01` queda **mitigado, no eliminado**, por el conjunto de controles.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Enumeración masiva de códigos | Entropía, respuesta uniforme y limitador (ADR-007); revisión en el Security Pass |
| Texto sensible escrito por el cliente en campos públicos (`RIE-13`) | Aviso en la interfaz, corrección por el administrador mientras sea editable, tratamiento como texto |
| Fuga de datos internos por una omisión | Lista positiva, proyección en BD, tipos separados, prueba negativa |
| Filtración de diagnóstico o costo aún no publicados por un error de mapeo | Los valores no se leen mientras no sean públicos (autorización en la proyección) y cuatro pruebas de integración |

## Qué queda deliberadamente fuera

Cuentas, rotación o revocación de códigos, recuperación autoservicio, enlaces compartibles con el código, y el diseño del limitador (ADR-007). La estructura detallada de los DTO está en el Technical Design §17.

## Condiciones para revisar este ADR

- Se incorporan **cuentas de cliente** o recuperación de códigos.
- Se necesita **revocar o rotar** un código ya emitido.
- Evidencia de enumeración o de filtraciones del código que los controles no cubran.
- Cambia el modelo de información pública del PRD.

## Referencias

- PRD: `SC-02`, `SC-08`, `SC-11`, `SC-13`, `E2`, `E4`, `E5`, `E15`, `E16`, `E17`, `RIE-01`, `RIE-13`.
- [TECHNICAL-DESIGN.md](../TECHNICAL-DESIGN.md) §8, §9, §12, §17.
- Relacionado con: [ADR-002](ADR-002-renderizado-cache-y-transporte.md), [ADR-006](ADR-006-estados-concurrencia-e-idempotencia.md); la protección frente a enumeración se amplía en [ADR-007](ADR-007-seguridad-y-proteccion-frente-abuso.md).
