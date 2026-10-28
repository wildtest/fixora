import { expect, test } from '@playwright/test';

// Verificación técnica estable (CHG-03, D-3): NO comprueba textos, maquetación, colores ni contenido de la
// landing (CHG-04 los cambiará). Los E2E funcionales los añade cada slice.

test('el servidor de prueba responde', async ({ request }) => {
  const response = await request.get('/');
  expect(response.status()).toBe(200);
});

test('la página raíz carga sin error fatal', async ({ page }) => {
  const fatal: string[] = [];
  page.on('pageerror', (error) => fatal.push(error.name));
  const response = await page.goto('/');
  expect(response?.ok()).toBe(true);
  await expect(page.locator('body')).toBeVisible();
  expect(fatal).toEqual([]);
});

// `test.fail()` invierte el resultado: la prueba solo pasa si la aserción FALLA. Demuestra que la
// configuración detecta una aserción fallida (si no la detectara, esta prueba se pondría en rojo).
test('la configuración detecta una aserción fallida', () => {
  test.fail();
  expect(1 + 1).toBe(3);
});
