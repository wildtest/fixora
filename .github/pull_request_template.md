## Resumen

<!-- Qué cambia y por qué. Enlaza el change de OpenSpec (CHG-xx). -->

## Compatibilidad hacia atrás de las migraciones (TD §11)

<!-- Marca una opción. Toda migración debe ser compatible con la aplicación actualmente desplegada (expand/contract). -->

- [ ] Esta PR **no** incluye migraciones.
- [ ] Incluye migraciones **aditivas** compatibles con la versión desplegada (expand).
- [ ] Incluye una migración **destructiva** (contract) y el código que la necesitaba ya está desplegado.

## Pruebas añadidas

<!-- Cada regla se prueba en el nivel más barato que la demuestre: unitaria, integración o E2E. No se elimina una prueba para que CI pase sin justificarlo aquí. -->

- [ ] Unitarias:
- [ ] Integración:
- [ ] E2E:

## Trazabilidad

- [ ] Actualicé `docs/07-testing/TRACEABILITY.md` (estado y evidencia de los `SC-*`/`E*` que toca esta PR) y `npm run test:trace` pasa.

## Compuertas

- [ ] `static` y `db-tests` en verde. No se rebajaron umbrales ni compuertas.
- [ ] Sin secretos, `.env` reales ni credenciales de Production en el diff.
