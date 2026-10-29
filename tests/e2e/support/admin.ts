// Credencial FICTICIA exclusiva de la rama Neon `test` para los E2E del acceso administrativo (CHG-08, tarea 7.2).
// No existe en Production ni en development: el aprovisionamiento de esta cuenta solo ocurre aquí, tras la guardia
// anti-desastre de pruebas (`global-setup.ts`). No es un secreto real: es un dato de prueba de un entorno aislado.
export const E2E_ADMIN_EMAIL = 'admin-e2e@example.test';
export const E2E_ADMIN_PASSWORD = '  Contraseña ficticia E2E (solo test) 15+  ';
