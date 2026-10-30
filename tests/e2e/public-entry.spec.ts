import { expect, test, type Page } from '@playwright/test';

// E2E de CHG-04 (`public-site-entry`) sobre la base de CHG-03. Consultas por rol y test id; no fija el texto de
// marketing. Verificación en dos etapas (design.md OQ-1): CHG-04 demuestra que los puntos de entrada existen y
// que, mientras CHG-05/06/08 no los activen, NO navegan ni simulan operaciones (P-1/P-2 aprobadas); CHG-08 activó el último. Los destinos
// aprobados se prueban en `src/app/_components/public-entry.test.tsx`. [SC-15]

const ENTRY_LABELS = ['Registrar reparación', 'Consultar estado'] as const;
const WORKSHOP = 'Acceso Taller';
const REGISTER = 'Registrar reparación';

// CHG-05 activó «Registrar reparación» (/registrar), CHG-06 «Consultar estado» (/consultar) y CHG-08 «Acceso Taller»
// (/admin/acceso): los tres son enlaces.
const entry = (scope: Pick<Page, 'getByRole'>, label: string) =>
  scope.getByRole('link', { name: label });
const UNAVAILABLE = 'Disponible próximamente';

const isMobile = (page: Page) => (page.viewportSize()?.width ?? 0) < 1024;

async function noHorizontalOverflow(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

async function openMenuIfMobile(page: Page) {
  if (isMobile(page)) {
    await page.getByRole('button', { name: /^Menú/ }).click();
  }
}

test.describe('landing PUB-01', () => {
  test('muestra el lema, la descripción y los dos puntos de entrada del cliente con igual jerarquía', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const main = page.getByRole('main');
    const cards = page.getByTestId('entry-cards').getByRole('listitem');
    await expect(cards).toHaveCount(2);
    for (const label of ENTRY_LABELS) {
      await expect(entry(main, label)).toBeVisible();
    }
    // Igual jerarquía: ambas tarjetas tienen el mismo ancho.
    const widths = await cards.evaluateAll((items) => items.map((item) => Math.round(item.getBoundingClientRect().width)));
    if (!isMobile(page)) expect(widths[0]).toBe(widths[1]);
    await noHorizontalOverflow(page);
  });

  test('los tres puntos de entrada están activos: son enlaces a su ruta, sin controles deshabilitados', async ({ page }) => {
    await page.goto('/');
    const main = page.getByRole('main');
    // Activo (CHG-05): enlace a la ruta aprobada.
    await expect(main.getByRole('link', { name: REGISTER })).toHaveAttribute('href', '/registrar');
    await expect(main.getByRole('button', { name: REGISTER })).toHaveCount(0);
    // CHG-06 activó la consulta: también es un enlace a su ruta aprobada y ya no hay motivo de indisponibilidad.
    await expect(main.getByRole('link', { name: 'Consultar estado' })).toHaveAttribute('href', '/consultar');
    await expect(main.getByRole('button', { name: 'Consultar estado' })).toHaveCount(0);
    await expect(main.getByText(UNAVAILABLE)).toHaveCount(0);
    await page.keyboard.press('Tab');
    for (let i = 0; i < 12; i += 1) {
      const focusedDisabled = await page.evaluate(() => (document.activeElement as HTMLButtonElement | null)?.disabled === true);
      expect(focusedDisabled).toBe(false);
      await page.keyboard.press('Tab');
    }
    expect(new URL(page.url()).pathname).toBe('/');
  });

  test('«Registrar reparación» lleva al formulario', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('main').getByRole('link', { name: REGISTER }).click();
    await expect(page).toHaveURL(/\/registrar$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Registrar reparación' })).toBeVisible();
  });

  test('narrativa aprobada: secciones, encabezados semánticos y contenido ilustrativo', async ({ page }) => {
    await page.goto('/');
    const main = page.getByRole('main');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Tu reparación,');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('siempre bajo control.');
    await expect(main.getByText('Sistema de seguimiento abierto')).toBeVisible();
    for (const [level, name] of [
      [2, 'Registrar reparación'],
      [2, 'Consultar reparación'],
      [2, 'Claridad técnica en tiempo real sin fricción'],
      [2, '¿Cómo funciona el proceso?'],
      [2, 'Privacidad y control absoluto'],
      [3, 'Registra tu equipo'],
      [3, 'Recibe tu código'],
      [3, 'Consulta el avance'],
      [3, 'Sin cuentas ni contraseñas'],
      [3, 'Trazabilidad de estado'],
      [3, 'Protección de datos personales'],
    ] as const) {
      await expect(main.getByRole('heading', { level, name }), name).toBeVisible();
    }
    await expect(main.getByText('NUEVO REGISTRO', { exact: false })).toBeVisible();
    await expect(main.getByText('MONITOREO INMEDIATO', { exact: false })).toBeVisible();
    await expect(page.getByTestId('how-it-works').getByRole('listitem')).toHaveCount(3);
    await expect(page.getByTestId('privacy').getByRole('listitem')).toHaveCount(3);
    // Lo ilustrativo está rotulado, no hay campo de consulta ni códigos verosímiles.
    await expect(page.getByTestId('illustration-code')).toContainText('Ilustración');
    await expect(page.getByTestId('illustration-journey')).toContainText('Ejemplo ilustrativo');
    await expect(main.locator('input, textarea, select')).toHaveCount(0);
    await expect(main).not.toContainText(/FX-2026|EJ-8921|EJ-0000/);
    // Pie con el lema y el aviso demostrativo; la franja sigue siendo única por test id.
    await expect(page.getByTestId('landing-footer')).toContainText('FIXORA © 2026');
    await expect(page.getByTestId('landing-footer')).toContainText('Tu reparación, siempre bajo control');
    await expect(page.getByTestId('landing-footer')).toContainText('Entorno de demostración');
    await expect(page.getByTestId('demo-notice')).toHaveCount(1);
    await noHorizontalOverflow(page);
  });

  test('«Consultar estado» lleva a la consulta real y «Acceso Taller» sigue en la navegación', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('main').getByRole('link', { name: 'Consultar estado' })).toHaveAttribute('href', '/consultar');
    await openMenuIfMobile(page);
    await expect(page.getByRole('link', { name: WORKSHOP }).first()).toHaveAttribute('href', '/admin/acceso');
    await page.keyboard.press('Escape');
    await page.goto('/');
    await page.getByRole('main').getByRole('link', { name: 'Consultar estado' }).click();
    await expect(page).toHaveURL(/\/consultar$/);
  });

  test('la landing es la única ruta indexable', async ({ page, request }) => {
    await page.goto('/');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /index/);
    expect(await page.locator('meta[name="robots"]').getAttribute('content')).not.toContain('noindex');
    const notFound = await request.get('/ruta-que-no-existe');
    expect(notFound.status()).toBe(404);
    expect(await notFound.text()).toContain('noindex');
  });
});

test.describe('navegación pública', () => {
  test('escritorio: Inicio, Registrar y Consultar, y «Acceso Taller» separado y secundario', async ({ page }) => {
    test.skip(isMobile(page), 'solo escritorio');
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Principal' });
    await expect(nav.getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/');
    for (const label of [...ENTRY_LABELS, WORKSHOP]) {
      await expect(entry(nav, label)).toBeVisible();
    }
    // «Acceso Taller» va a la derecha de las acciones del cliente y no tiene el estilo de acción principal.
    const boxes = await Promise.all(
      [...ENTRY_LABELS, WORKSHOP].map((label) => entry(nav, label).boundingBox()),
    );
    expect(boxes[2]!.x).toBeGreaterThan(boxes[1]!.x + boxes[1]!.width);
    const background = await nav.getByRole('link', { name: WORKSHOP }).evaluate((node) => getComputedStyle(node).backgroundColor);
    expect(background).not.toBe('rgb(15, 95, 168)');
    // Teclado: el enlace «Inicio» es operable y los controles no disponibles no reciben foco.
    await nav.getByRole('link', { name: 'Inicio' }).focus();
    await expect(nav.getByRole('link', { name: 'Inicio' })).toBeFocused();
    await expect(nav.getByRole('link', { name: REGISTER })).toHaveAttribute('href', '/registrar');
    await expect(nav.getByRole('link', { name: 'Consultar estado' })).toHaveAttribute('href', '/consultar');
    await expect(nav.getByRole('link', { name: WORKSHOP })).toHaveAttribute('href', '/admin/acceso');
    await expect(nav.getByText(UNAVAILABLE)).toHaveCount(0);
  });

  test('móvil: botón «Menú» rotulado, panel con los mismos puntos de entrada, teclado y cierre', async ({ page }) => {
    test.skip(!isMobile(page), 'solo móvil');
    await page.goto('/');
    const button = page.getByRole('button', { name: /^Menú/ });
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    const panel = page.locator(`#${await button.getAttribute('aria-controls')}`);
    await expect(panel).toBeVisible();
    await expect(panel.getByRole('link', { name: 'Inicio' })).toBeVisible();
    await expect(panel.getByRole('link', { name: REGISTER })).toHaveAttribute('href', '/registrar');
    await expect(panel.getByRole('link', { name: 'Consultar estado' })).toHaveAttribute('href', '/consultar');
    await expect(panel.getByRole('link', { name: WORKSHOP })).toHaveAttribute('href', '/admin/acceso');
    await noHorizontalOverflow(page);
    await page.keyboard.press('Escape');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(panel).toBeHidden();
    await expect(button).toBeFocused();
  });

  test('móvil: el menú se cierra al navegar', async ({ page }) => {
    test.skip(!isMobile(page), 'solo móvil');
    await page.goto('/ruta-que-no-existe');
    const button = page.getByRole('button', { name: /^Menú/ });
    await button.click();
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Inicio' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('button', { name: /^Menú/ })).toHaveAttribute('aria-expanded', 'false');
  });
});

test.describe('aviso de entorno de demostración', () => {
  for (const path of ['/', '/ruta-que-no-existe']) {
    test(`está presente en ${path} y no impide navegar`, async ({ page }) => {
      await page.goto(path);
      const notice = page.getByTestId('demo-notice');
      await expect(notice).toBeVisible();
      await expect(notice).toContainText('Entorno de demostración');
      await expect(notice).toContainText('No ingreses datos personales reales ni información sensible');
      // Sin casilla, modal ni botón de cierre.
      await expect(notice.getByRole('checkbox')).toHaveCount(0);
      await expect(notice.getByRole('button')).toHaveCount(0);
      await expect(page.getByRole('dialog')).toHaveCount(0);
      // No obstruye: el contenido principal sigue visible y se puede navegar.
      await expect(page.getByRole('main')).toBeVisible();
      await openMenuIfMobile(page);
      await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Inicio' }).click();
      await expect(page).toHaveURL(/\/$/);
    });
  }
});

test.describe('404 público', () => {
  test('una ruta inexistente muestra el estado, ofrece volver al inicio y no revela detalles técnicos', async ({ page }) => {
    const response = await page.goto('/ruta-que-no-existe');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Página no encontrada' })).toBeVisible();
    await expect(page.getByText('La página que buscas no existe o ya no está disponible.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reintentar' })).toHaveCount(0);
    const body = await page.locator('body').innerText();
    for (const leak of ['node_modules', '/src/', 'at ', 'Error:', 'digest']) expect(body).not.toContain(leak);
    // El shell público permanece.
    await expect(page.getByTestId('demo-notice')).toBeVisible();
    await noHorizontalOverflow(page);
    await page.getByRole('main').getByRole('link', { name: 'Volver al inicio' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('las rutas /admin/** inexistentes no revelan detalles: sin sesión se redirigen al acceso (CHG-08)', async ({ request }) => {
    const response = await request.get('/admin/no-existe', { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers()['location']).toMatch(/\/admin\/acceso$/);
    const followed = await request.get('/admin/no-existe');
    expect(await followed.text()).not.toMatch(/node_modules|digest/);
  });
});

test.describe('cabeceras y CSP públicas', () => {
  test('la respuesta de / trae las cabeceras de seguridad y no X-Powered-By', async ({ request }) => {
    const headers = (await request.get('/')).headers();
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBe('no-referrer');
    expect(headers['permissions-policy']).toContain('camera=()');
    expect(headers['cross-origin-opener-policy']).toBe('same-origin');
    expect(headers['cross-origin-resource-policy']).toBe('same-origin');
    expect(headers['x-powered-by']).toBeUndefined();
  });

  test('CSP pública: sin orígenes de terceros; /admin/** lleva su propia CSP estricta con nonce, nunca la pública', async ({ request }) => {
    const csp = (await request.get('/')).headers()['content-security-policy'];
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).toContain("style-src 'self'");
    expect(csp).not.toMatch(/https?:\/\//);
    expect(csp).toContain("frame-ancestors 'none'");
    for (const path of ['/admin', '/admin/acceso', '/admin/ordenes/x']) {
      const response = await request.get(path);
      const adminCsp = response.headers()['content-security-policy'];
      expect(adminCsp, path).toContain("'strict-dynamic'");
      expect(adminCsp, path).toMatch(/'nonce-[^']+'/);
      expect(adminCsp, path).not.toContain("'unsafe-inline'");
      expect(response.headers()['x-content-type-options'], path).toBe('nosniff');
    }
  });

  test('navegar la landing no produce violaciones de CSP ni peticiones a terceros', async ({ page }) => {
    const violations: string[] = [];
    const external: string[] = [];
    await page.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', (event) => {
        (window as unknown as { __csp: string[] }).__csp = [
          ...((window as unknown as { __csp?: string[] }).__csp ?? []),
          `${event.violatedDirective}`,
        ];
      });
    });
    page.on('console', (message) => {
      if (/content security policy/i.test(message.text())) violations.push(message.text().slice(0, 120));
    });
    page.on('request', (request) => {
      if (new URL(request.url()).origin !== new URL(page.url() === 'about:blank' ? request.url() : page.url()).origin) {
        external.push(new URL(request.url()).origin);
      }
    });
    await page.goto('/');
    await openMenuIfMobile(page);
    await page.waitForLoadState('networkidle');
    const fromDocument = await page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? []);
    expect(violations).toEqual([]);
    expect(fromDocument).toEqual([]);
    expect(external).toEqual([]);
  });
});

test.describe('responsive sin desbordamiento horizontal', () => {
  for (const [name, path] of [['landing', '/'], ['404', '/ruta-que-no-existe']] as const) {
    test(`${name}: scrollWidth <= clientWidth, también con el menú abierto en móvil`, async ({ page }) => {
      await page.goto(path);
      await noHorizontalOverflow(page);
      await openMenuIfMobile(page);
      await noHorizontalOverflow(page);
    });
  }

  test('los controles táctiles miden al menos 44 px de alto en móvil', async ({ page }) => {
    test.skip(!isMobile(page), 'solo móvil');
    await page.goto('/');
    const menu = await page.getByRole('button', { name: /^Menú/ }).boundingBox();
    expect(menu!.height).toBeGreaterThanOrEqual(44);
    for (const label of ENTRY_LABELS) {
      const box = await entry(page.getByRole('main'), label).boundingBox();
      expect(box!.height, label).toBeGreaterThanOrEqual(44);
    }
  });
});
