import { createHash } from 'node:crypto';
import pg from 'pg';
import { expect, test, type Page } from '@playwright/test';
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from './support/admin';

// E2E del acceso administrativo (CHG-08): ADM-01 → entrada protegida. El administrador es FICTICIO y solo existe en la
// rama Neon `test` (global-setup). Cada prueba usa su propio origen: el limitador es por origen y la base es
// compartida. Nunca se imprimen contraseñas ni tokens. [SC-12] [E10] [SC-03 parcial]

const OWNER_URL = process.env.TEST_DIRECT_URL;
const COOKIE = '__Host-fixora_session';
const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');
const fakeIp = () => `198.51.100.${Math.floor(Math.random() * 250) + 1}-${Math.random().toString(36).slice(2, 8)}`;
const isMobile = (page: Page) => (page.viewportSize()?.width ?? 0) < 1024;

async function withOwner<T>(work: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString: OWNER_URL });
  await client.connect();
  try {
    return await work(client);
  } finally {
    await client.end();
  }
}

async function isolate(page: Page) {
  await page.setExtraHTTPHeaders({ 'x-vercel-forwarded-for': fakeIp().slice(0, 40) });
}

async function submit(page: Page, email: string, password: string) {
  await page.getByLabel('Correo').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
}

async function login(page: Page) {
  await isolate(page);
  await page.goto('/admin/acceso');
  await submit(page, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD);
  await expect(page).toHaveURL(/\/admin$/);
}

async function sessionToken(page: Page): Promise<string> {
  const cookie = (await page.context().cookies()).find((c) => c.name === COOKIE);
  expect(cookie, 'cookie de sesión').toBeDefined();
  return cookie!.value;
}

const GENERIC = 'No pudimos iniciar sesión';

test.describe('ADM-01 — pantalla de acceso', () => {
  test('carga con correo y contraseña, sin registro, recuperación, rol ni «recordarme»', async ({ page }) => {
    await isolate(page);
    await page.goto('/admin/acceso');
    await expect(page.getByRole('heading', { level: 1, name: 'Acceso al taller' })).toBeVisible();
    await expect(page.getByLabel('Correo')).toBeVisible();
    await expect(page.getByLabel('Contraseña')).toHaveAttribute('type', 'password');
    await expect(page.locator('[data-testid="demo-notice"]:visible')).toBeVisible();
    for (const text of [/registr/i, /recuper/i, /olvid/i, /crear cuenta/i, /recordarme/i, /rol/i, /google|github|microsoft/i]) {
      await expect(page.getByRole('main').getByText(text)).toHaveCount(0);
    }
    await expect(page.getByRole('main').getByRole('link')).toHaveCount(0);
    await expect(page.getByRole('main')).not.toContainText('15');
    expect(await page.locator('meta[name="robots"]').getAttribute('content')).toContain('noindex');
  });

  test('CSP estricta con nonce por petición, sin unsafe-inline ni unsafe-eval en script-src; la pública no cambia', async ({ page, request }) => {
    const first = await request.get('/admin/acceso');
    const second = await request.get('/admin/acceso');
    const cspOf = (headers: Record<string, string>) => headers['content-security-policy'] ?? '';
    const [a, b] = [cspOf(first.headers()), cspOf(second.headers())];
    const nonce = (csp: string) => /'nonce-([^']+)'/.exec(csp)?.[1];
    expect(nonce(a)).toBeTruthy();
    expect(nonce(a)).not.toBe(nonce(b));
    const scriptSrc = /script-src ([^;]+)/.exec(a)?.[1] ?? '';
    expect(scriptSrc).toContain("'strict-dynamic'");
    expect(scriptSrc).not.toContain('unsafe-inline');
    expect(scriptSrc).not.toContain('unsafe-eval');
    expect(a).not.toMatch(/https?:\/\//);
    expect(first.headers()['cache-control']).toMatch(/no-store|private/);
    expect(first.headers()['x-robots-tag']).toContain('noindex');
    // La página hidrata sin violaciones de CSP.
    const violations: string[] = [];
    page.on('console', (message) => {
      if (/content security policy/i.test(message.text())) violations.push(message.text());
    });
    await isolate(page);
    await page.goto('/admin/acceso');
    await page.getByLabel('Correo').fill('hidrata@example.test'); // el estado de React responde: hubo hidratación
    await expect(page.getByLabel('Correo')).toHaveValue('hidrata@example.test');
    expect(violations).toEqual([]);
    const pub = await request.get('/consultar');
    expect(pub.headers()['content-security-policy']).toContain("'unsafe-inline'");
  });

  test('«Acceso Taller» de la zona pública lleva al acceso', async ({ page }) => {
    await page.goto('/');
    if (isMobile(page)) await page.getByRole('button', { name: /^Menú/ }).click();
    await page.getByRole('link', { name: 'Acceso Taller' }).click();
    await expect(page).toHaveURL(/\/admin\/acceso$/);
  });
});

test.describe('credenciales inválidas (SC-12)', () => {
  test('correo inexistente y contraseña incorrecta producen exactamente el mismo mensaje genérico', async ({ page }) => {
    await isolate(page);
    await page.goto('/admin/acceso');
    await submit(page, 'no-existe@example.test', 'una contraseña cualquiera');
    const unknown = page.getByRole('alert').filter({ hasText: GENERIC });
    await expect(unknown).toBeVisible();
    const unknownText = await unknown.innerText();

    await submit(page, E2E_ADMIN_EMAIL, 'contraseña incorrecta del administrador');
    const wrong = page.getByRole('alert').filter({ hasText: GENERIC });
    await expect(wrong).toBeVisible();
    expect(await wrong.innerText()).toBe(unknownText);

    expect(unknownText).not.toMatch(/correo|contraseña|existe|incorrect|intentos/i);
    await expect(page).toHaveURL(/\/admin\/acceso$/);
    await expect(page.getByLabel('Contraseña')).toHaveValue(''); // la contraseña se descarta tras un fallo
    expect((await page.context().cookies()).some((c) => c.name === COOKIE)).toBe(false);
  });

  test('entrada vacía, mal formada o enorme: el mismo mensaje genérico, sin pistas de política', async ({ page }) => {
    await isolate(page);
    await page.goto('/admin/acceso');
    for (const [email, password] of [
      ['', ''],
      ['correo-mal-formado', 'una contraseña cualquiera'],
      [E2E_ADMIN_EMAIL, ''],
      [E2E_ADMIN_EMAIL, 'x'.repeat(129)],
    ] as const) {
      await submit(page, email, password);
      const alert = page.getByRole('alert').filter({ hasText: GENERIC });
      await expect(alert).toBeVisible();
      await expect(alert).not.toContainText(/mínimo|máximo|caracteres|128|15/i);
    }
  });
});

test.describe('sesión, rutas protegidas y cierre de sesión', () => {
  test('inicio de sesión válido: contraseña exacta (espacios y Unicode), entrada protegida mínima y cookie endurecida', async ({ page }) => {
    await isolate(page);
    const setCookie: string[] = [];
    page.on('response', async (response) => {
      if (response.request().method() !== 'POST' || !response.url().includes('/admin/acceso')) return;
      const header = (await response.allHeaders())['set-cookie'];
      if (header) setCookie.push(header);
    });
    await page.goto('/admin/acceso');
    await submit(page, `  ${E2E_ADMIN_EMAIL.toUpperCase()} `, E2E_ADMIN_PASSWORD); // el correo se normaliza; la contraseña, no
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
    await expect(page.locator('[data-testid="demo-notice"]:visible')).toBeVisible();
    // Entrada protegida: estado autenticado y «Cerrar sesión»/«Salir» presentes (el panel real es de CHG-09a).
    await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();

    // Cabecera Set-Cookie: sesión de navegador (sin Max-Age ni Expires), HttpOnly, Secure, Strict, Path=/, sin Domain.
    const header = setCookie.join('\n');
    expect(header).toContain(`${COOKIE}=`);
    expect(header).toMatch(/HttpOnly/i);
    expect(header).toMatch(/Secure/i);
    expect(header).toMatch(/SameSite=Strict/i);
    expect(header).toMatch(/Path=\//i);
    expect(header).not.toMatch(/Domain=/i);
    expect(header).not.toMatch(/Max-Age=|Expires=/i);

    const cookie = (await page.context().cookies()).find((c) => c.name === COOKIE)!;
    expect(cookie).toMatchObject({ httpOnly: true, secure: true, sameSite: 'Strict', path: '/', expires: -1 });
    expect(await page.evaluate(() => document.cookie)).not.toContain('fixora_session');
    expect(cookie.value).toMatch(/^[A-Za-z0-9_-]{43}$/);

    // En la base solo existe el SHA-256 del token, nunca el token.
    const rows = await withOwner((db) => db.query('SELECT token_hash FROM admin_sessions'));
    const hashes = rows.rows.map((row) => String(row.token_hash));
    expect(hashes).toContain(sha256(cookie.value));
    expect(hashes).not.toContain(cookie.value);
  });

  test('cada inicio de sesión crea una sesión nueva e independiente', async ({ browser }) => {
    const tokens: string[] = [];
    for (let i = 0; i < 2; i += 1) {
      const context = await browser.newContext();
      const page = await context.newPage();
      await login(page);
      tokens.push(await sessionToken(page));
      await context.close();
    }
    expect(tokens[0]).not.toBe(tokens[1]);
  });

  test('acceso directo sin sesión: redirección al acceso sin contenido administrativo', async ({ request }) => {
    const response = await request.get('/admin', { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers()['location']).toMatch(/\/admin\/acceso$/);
    expect(await response.text()).not.toContain('Dashboard');
  });

  test('cookie inventada, con forma válida pero inexistente, o basura: se trata como no autenticada', async ({ browser, baseURL }) => {
    for (const value of ['A'.repeat(43), 'basura', 'x'.repeat(500)]) {
      const context = await browser.newContext();
      await context.addCookies([{ name: COOKIE, value, domain: new URL(baseURL!).hostname, path: '/', secure: true, httpOnly: true, sameSite: 'Strict' }]);
      const page = await context.newPage();
      await page.goto('/admin');
      await expect(page).toHaveURL(/\/admin\/acceso/);
      await expect(page.getByRole('heading', { level: 1, name: 'Acceso al taller' })).toBeVisible();
      await expect(page.getByText('Panel de taller').filter({ visible: true })).toHaveCount(0);
      await context.close();
    }
  });

  test('sesión eliminada en el servidor aunque el navegador conserve la cookie: no se autoriza y se avisa que expiró', async ({ page }) => {
    await login(page);
    const token = await sessionToken(page);
    await withOwner((db) => db.query('DELETE FROM admin_sessions WHERE token_hash = $1', [sha256(token)]));
    expect((await page.context().cookies()).some((c) => c.name === COOKIE)).toBe(true); // el navegador la conserva
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/acceso\?motivo=expirada$/);
    await expect(page.getByRole('alert').filter({ hasText: 'Tu sesión expiró' })).toBeVisible();
    await expect(page.getByText('Panel de taller').filter({ visible: true })).toHaveCount(0);
  });

  test('expiración por inactividad (60 min) y absoluta (12 h) en el servidor', async ({ page }) => {
    await login(page);
    const hash = sha256(await sessionToken(page));
    await withOwner((db) => db.query("UPDATE admin_sessions SET last_seen_at = now() - interval '61 minutes' WHERE token_hash = $1", [hash]));
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/acceso/);

    await login(page);
    const second = sha256(await sessionToken(page));
    await withOwner((db) => db.query("UPDATE admin_sessions SET expires_at = now() - interval '1 second' WHERE token_hash = $1", [second]));
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/acceso/);
  });

  test('una sesión válida que visita el acceso va a la entrada protegida', async ({ page }) => {
    await login(page);
    await page.goto('/admin/acceso');
    await expect(page).toHaveURL(/\/admin$/);
  });

  test('cerrar sesión invalida la sesión en el servidor, retira la cookie y lleva al acceso; Atrás/Adelante no muestran nada', async ({ page }) => {
    await login(page);
    const hash = sha256(await sessionToken(page));
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/admin\/acceso$/);
    expect((await page.context().cookies()).some((c) => c.name === COOKIE)).toBe(false);
    const left = await withOwner((db) => db.query('SELECT 1 FROM admin_sessions WHERE token_hash = $1', [hash]));
    expect(left.rowCount).toBe(0);

    await page.goBack();
    for (const wait of [0, 300, 1500]) {
      await page.waitForTimeout(wait);
      await expect(page.getByText('Panel de taller').filter({ visible: true })).toHaveCount(0);
      await expect(page.getByTestId('admin-status').filter({ visible: true })).toHaveCount(0);
    }
    await expect(page).toHaveURL(/\/admin\/acceso/);
    await page.goForward();
    await expect(page.getByText('Panel de taller').filter({ visible: true })).toHaveCount(0);
    await page.reload();
    await expect(page).toHaveURL(/\/admin\/acceso/);
  });

  test('cerrar sesión sin sesión válida termina en el estado no autenticado, sin error', async ({ page }) => {
    await login(page);
    const hash = sha256(await sessionToken(page));
    await withOwner((db) => db.query('DELETE FROM admin_sessions WHERE token_hash = $1', [hash]));
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/admin\/acceso/);
    await expect(page.getByRole('heading', { level: 1, name: 'Acceso al taller' })).toBeVisible();
    await expect(page.getByText(/ocurrió un problema/i)).toHaveCount(0);
  });

  test('la acción de cierre es accesible con teclado y el shell no desborda en móvil', async ({ page }) => {
    await login(page);
    const button = page.getByRole('button', { name: 'Cerrar sesión' });
    await button.focus();
    await expect(button).toBeFocused();
    if (isMobile(page)) {
      await expect(page.getByText('Salir')).toBeVisible();
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    } else {
      await expect(page.getByText('Cerrar sesión', { exact: true })).toBeVisible();
    }
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/admin\/acceso$/);
  });
});

test.describe('protección contra fuerza bruta y falla cerrada', () => {
  test('tras 5 fallos se bloquea el origen (RATE_LIMITED), incluso con credenciales correctas, sin revelar nada', async ({ page }) => {
    test.setTimeout(90_000);
    await isolate(page);
    await page.goto('/admin/acceso');
    for (let i = 0; i < 5; i += 1) {
      await submit(page, E2E_ADMIN_EMAIL, `contraseña incorrecta número ${i}`);
      await expect(page.getByRole('alert').filter({ hasText: GENERIC })).toBeVisible();
    }
    await submit(page, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD); // correctas, pero el origen está bloqueado
    const alert = page.getByRole('alert').filter({ hasText: 'Demasiados intentos' });
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('Inténtalo nuevamente más tarde.');
    await expect(page).toHaveURL(/\/admin\/acceso$/);
    await expect(page.getByText(GENERIC)).toHaveCount(0);
    await expect(page.getByText('Servicio no disponible')).toHaveCount(0);
    await expect(alert).not.toContainText(/correcta|\d+ intentos/i);
    expect((await page.context().cookies()).some((c) => c.name === COOKIE)).toBe(false);
  });

  test('si la protección no está disponible, falla cerrada: SERVICE_UNAVAILABLE distinto de los otros dos, sin iniciar sesión', async ({ page }) => {
    await isolate(page);
    await page.goto('/admin/acceso');
    await withOwner((db) => db.query('ALTER TABLE rate_limit_buckets RENAME TO rate_limit_buckets_off'));
    try {
      await submit(page, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD);
      const alert = page.getByRole('alert').filter({ hasText: 'Servicio no disponible temporalmente' });
      await expect(alert).toBeVisible();
      await expect(alert.getByRole('button', { name: 'Reintentar' })).toBeVisible();
      await expect(page.getByText(GENERIC)).toHaveCount(0);
      await expect(page.getByText('Demasiados intentos')).toHaveCount(0);
      await expect(page).toHaveURL(/\/admin\/acceso$/);
    } finally {
      await withOwner((db) => db.query('ALTER TABLE rate_limit_buckets_off RENAME TO rate_limit_buckets'));
    }
    // Restablecida la protección, «Reintentar» (con los mismos datos) inicia la sesión.
    await page.getByLabel('Contraseña').fill(E2E_ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page).toHaveURL(/\/admin$/);
  });
});
