import { expect, test, type Page } from '@playwright/test';

// Smoke de Production (CHG-07 D9; CHG-15 D9, evidencia de `SC-20`). PÚBLICO, SEGURO Y NO MUTANTE: no registra reparaciones,
// no envía formularios de escritura, no inicia sesión, no usa credenciales de Production y no crea endpoints. Comprueba que el
// despliegue responde, que la configuración de Production es la esperada, que `/admin/**` sin sesión no entrega contenido
// administrativo y, si se proporciona `SMOKE_TRACKING_CODE` (secreto: nunca en el repositorio, en nombres de prueba, en
// salidas ni en *traces*), que la consulta REAL de la orden demo ficticia por la interfaz funciona. Una consulta
// con acierto no alimenta el limitador. Sin `SMOKE_TRACKING_CODE` esa prueba se omite explícitamente.

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

test('/admin/** sin sesión no entrega contenido administrativo: redirige al acceso y el acceso es público, noindex y con CSP de nonce', async ({ request, page }) => {
  const UNKNOWN_ORDER = '00000000-0000-4000-8000-000000000000';
  for (const path of ['/admin', '/admin/ordenes', `/admin/ordenes/${UNKNOWN_ORDER}`]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect([301, 302, 303, 307, 308], path).toContain(response.status());
    expect(response.headers()['location'] ?? '', path).toContain('/admin/acceso');
    const body = await response.text();
    expect(body, path).not.toMatch(/Detalle de la orden|Panel|Directorio|Cerrar sesión/);
  }
  const access = await request.get('/admin/acceso');
  expect(access.status()).toBe(200);
  expect(access.headers()['x-robots-tag']).toBe('noindex, nofollow');
  const csp = access.headers()['content-security-policy'] ?? '';
  expect(csp).toMatch(/'nonce-[^']+'/);
  expect(csp.match(/script-src[^;]*/)?.[0] ?? '').not.toMatch(/'unsafe-inline'|'unsafe-eval'/);
  await loadsWithoutFatalError(page, '/admin/acceso');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

// La consulta de la orden demo ficticia por la UI real. El código nunca se imprime: ni en el nombre de la prueba, ni en
// mensajes de aserción (solo comparaciones booleanas), ni en *traces* (desactivados para esta prueba).
const DEMO_CODE = process.env.SMOKE_TRACKING_CODE;

test.describe('orden demo ficticia', () => {
  test.skip(!DEMO_CODE, 'SMOKE_TRACKING_CODE no está definido: la consulta de la orden demo se omite.');

  test('la consulta real muestra solo la proyección pública y no la expone en la URL ni en el almacenamiento', async ({ page }) => {
    const code = DEMO_CODE as string;
    await page.goto('/consultar');
    await page.getByLabel('Código de seguimiento').fill(code);
    await page.getByRole('button', { name: 'Consultar estado' }).click();
    await expect(page.getByTestId('tracking-result')).toBeVisible();
    expect((await page.getByTestId('result-code').innerText()).trim() === code).toBe(true);
    await expect(page.getByTestId('status-badge')).toBeVisible();
    await expect(page.getByTestId('status-timeline')).toBeVisible();
    // Sin datos privados del cliente (el nombre ficticio de la orden demo comienza por «DEMO FIXORA»).
    const text = await page.locator('body').innerText();
    expect(/DEMO FIXORA|\+51 900|@/.test(text)).toBe(false);
    expect(page.url().includes(code)).toBe(false);
    const storage = await page.evaluate(() => JSON.stringify({ l: { ...localStorage }, s: { ...sessionStorage } }));
    expect(storage.includes(code)).toBe(false);
  });
});
