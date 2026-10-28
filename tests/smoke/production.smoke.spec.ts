import { expect, test, type Page } from '@playwright/test';

// Smoke de infraestructura (CHG-07 D9). SOLO LECTURA: no registra reparaciones, no envía formularios, no consulta
// códigos (ni inexistentes: no alimenta el limitador), no depende de una orden demo y no crea endpoints. Comprueba
// que el despliegue responde y que la configuración de Production es la esperada. La comprobación de `/admin/**`
// y la consulta de la orden demo ficticia se añadirán a este mismo mecanismo (CHG-08 / CHG-15).

async function loadsWithoutFatalError(page: Page, path: string) {
  const fatal: string[] = [];
  page.on('pageerror', (error) => fatal.push(error.name));
  const response = await page.goto(path);
  expect(response?.status(), path).toBe(200);
  await expect(page.locator('body')).toBeVisible();
  expect(fatal, path).toEqual([]);
}

test('Production responde por HTTPS y sirve la landing', async ({ page, request }) => {
  const response = await request.get('/');
  expect(response.status()).toBe(200);
  expect(response.url()).toMatch(/^https:\/\//);
  await loadsWithoutFatalError(page, '/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('el aviso de entorno de demostración está visible', async ({ page }) => {
  await page.goto('/');
  const notice = page.getByTestId('demo-notice');
  await expect(notice).toBeVisible();
  await expect(notice).toContainText('Entorno de demostración');
  await expect(notice).toContainText('No ingreses datos personales reales ni información sensible');
});

test('/registrar y /consultar cargan (solo lectura: sin enviar nada)', async ({ page }) => {
  await loadsWithoutFatalError(page, '/registrar');
  await expect(page.getByRole('heading', { level: 1, name: 'Registrar reparación' })).toBeVisible();
  await loadsWithoutFatalError(page, '/consultar');
  await expect(page.getByRole('heading', { level: 1, name: 'Consultar reparación' })).toBeVisible();
});

test('una ruta inexistente devuelve el 404 público sin detalles técnicos', async ({ page }) => {
  const response = await page.goto('/ruta-que-no-existe-smoke');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Página no encontrada' })).toBeVisible();
  const text = await page.locator('body').innerText();
  for (const leak of ['node_modules', '/src/', 'digest', 'Error:']) expect(text).not.toContain(leak);
});

test('cabeceras de seguridad de Production presentes y sin X-Powered-By', async ({ request }) => {
  for (const path of ['/', '/registrar', '/consultar']) {
    const headers = (await request.get(path)).headers();
    expect(headers['x-content-type-options'], path).toBe('nosniff');
    expect(headers['x-frame-options'], path).toBe('DENY');
    expect(headers['referrer-policy'], path).toBe('no-referrer');
    expect(headers['strict-transport-security'], path).toContain('max-age=');
    expect(headers['x-powered-by'], path).toBeUndefined();
    const csp = headers['content-security-policy'] ?? '';
    expect(csp, path).toContain("default-src 'self'");
    expect(csp, path).toContain("frame-ancestors 'none'");
    expect(csp, path).not.toMatch(/https?:\/\//); // sin orígenes de terceros
  }
});

test('solo la landing es indexable y Production no está protegida por login de plataforma', async ({ request }) => {
  const landing = await (await request.get('/')).text();
  expect(landing).toMatch(/<meta name="robots" content="index, follow"/);
  const registrar = await (await request.get('/registrar')).text();
  expect(registrar).toContain('noindex');
  // Production pública: nada de redirección a un inicio de sesión de Vercel.
  const response = await request.get('/', { maxRedirects: 0 });
  expect(response.status()).toBe(200);
});
