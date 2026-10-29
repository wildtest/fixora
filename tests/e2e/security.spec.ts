import { randomUUID } from 'node:crypto';
import { expect, request as playwrightRequest, test, type Request } from '@playwright/test';
import { cleanupSeeded, fakeIp, login, randomCode, seedOrder, uniqueTag, withOwner } from './support/admin-session';

// Security Pass (CHG-14) — regresión automatizada de seguridad sobre el build de producción. Complementa (no sustituye) la
// verificación formal sobre el despliegue real. Órdenes y valores FICTICIOS. [SC-11] [SC-12] [SC-18]

test.afterEach(async () => {
  await cleanupSeeded();
});

type Order = { id: string; code: string; tag: string };

async function seed(status = 'EN_DIAGNOSTICO'): Promise<Order> {
  const tag = uniqueTag();
  const id = randomUUID();
  const code = randomCode();
  const base = Date.UTC(2020, 6, 1, 12, 0);
  await withOwner(async (db) => {
    await seedOrder(db, {
      id,
      code,
      name: `${tag} Cliente Seguridad`,
      status,
      createdAt: new Date(base),
      diagnosis: null,
      cost: null,
      phone: '+51 999 111 222',
      history: [{ from: null, to: 'SOLICITUD_RECIBIDA', at: new Date(base) }],
    });
  });
  return { id, code, tag };
}

const noteCount = (id: string) =>
  withOwner(async (c) => Number((await c.query('SELECT count(*) AS n FROM order_notes WHERE order_id = $1', [id])).rows[0]!.n));

test.describe('CSRF y acceso directo a Server Actions [SC-12]', () => {
  test('una Server Action reproducida desde otro origen o sin sesión no escribe; el control positivo (mismo origen y cookie) sí', async ({ page, baseURL }) => {
    const order = await seed();
    await login(page);
    await page.goto(`/admin/ordenes/${order.id}`);
    await expect(page.getByTestId('order-detail')).toBeVisible();

    // Captura de la petición real de la acción «crear nota».
    const captured = new Promise<Request>((resolve) => {
      page.on('request', (request) => {
        if (request.method() === 'POST' && request.headers()['next-action']) resolve(request);
      });
    });
    await page.locator('#note-internal').fill('Nota original');
    await page.getByRole('button', { name: 'Guardar nota interna' }).click();
    const original = await captured;
    await expect(page.getByTestId('notes-internal').getByTestId('note-item')).toHaveCount(1);
    expect(await noteCount(order.id)).toBe(1);

    const url = original.url();
    const body = original.postData() ?? '';
    const base = { ...(await original.allHeaders()) };
    delete base['cookie']; // la cookie la aporta el contexto (o su ausencia)
    delete base['content-length'];

    // Control positivo: mismo origen y misma cookie ⇒ la repetición SÍ se ejecuta (el mecanismo de reproducción funciona).
    const same = await page.request.post(url, { headers: base, data: body });
    expect(same.status()).toBe(200);
    expect(await noteCount(order.id)).toBe(2);

    // CSRF: misma cookie (el navegador de la víctima la enviaría) pero `Origin` ajeno ⇒ Next rechaza la acción.
    const cross = await page.request.post(url, { headers: { ...base, origin: 'https://evil.example' }, data: body });
    expect(cross.ok()).toBe(false);
    expect(await noteCount(order.id)).toBe(2);

    // Sin sesión (cookie ausente), mismo origen ⇒ SESSION_EXPIRED y ninguna escritura.
    const anonymous = await playwrightRequest.newContext({ baseURL, extraHTTPHeaders: { 'x-vercel-forwarded-for': fakeIp() } });
    const withoutSession = await anonymous.post(url, { headers: base, data: body });
    expect(await withoutSession.text()).toContain('SESSION_EXPIRED');
    expect(await noteCount(order.id)).toBe(2);
    await anonymous.dispose();
  });
});

test.describe('XSS almacenado: el contenido del cliente y del taller es siempre texto [SC-11]', () => {
  const PAYLOADS = [
    '<script>window.__xss = 1</script>',
    '<img src=x onerror="window.__xss = 1">',
    '"><svg onload="window.__xss = 1">',
    "javascript:window.__xss=1",
  ];

  test('en descripción, marca, nombre, diagnóstico y notas: se muestra literal en el panel y en la consulta pública, y nunca se ejecuta', async ({ page, browser }) => {
    const order = await seed();
    await login(page);
    await page.goto(`/admin/ordenes/${order.id}`);
    await expect(page.getByTestId('order-detail')).toBeVisible();

    // Datos básicos (cliente y equipo).
    await page.getByRole('button', { name: 'Editar datos' }).click();
    await page.getByLabel('Nombre').fill(`${order.tag} ${PAYLOADS[0]}`);
    await page.getByLabel('Marca').fill(PAYLOADS[1]!);
    await page.getByLabel('Modelo').fill(PAYLOADS[2]!);
    await page.getByLabel('Descripción del problema').fill(`${PAYLOADS[0]} ${PAYLOADS[1]} ${PAYLOADS[3]}`);
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByTestId('basic-data-notice')).toHaveText('Datos guardados.');
    await expect(page.getByTestId('detail-name')).toContainText(PAYLOADS[0]!); // la orden ya se recargó con la versión nueva

    // Diagnóstico (se guarda; el equipo aún no lo publica) y notas pública e interna.
    await page.locator('#diagnosis').fill(PAYLOADS[0]!);
    await page.getByRole('button', { name: 'Guardar diagnóstico' }).click();
    await expect(page.getByTestId('diagnosis-notice')).toBeVisible();
    await page.locator('#note-public').fill(PAYLOADS[1]!);
    await page.getByRole('button', { name: 'Publicar nota' }).click();
    await expect(page.getByTestId('notes-public').getByTestId('note-content')).toHaveText(PAYLOADS[1]!);
    await page.locator('#note-internal').fill(PAYLOADS[2]!);
    await page.getByRole('button', { name: 'Guardar nota interna' }).click();
    await expect(page.getByTestId('notes-internal').getByTestId('note-content')).toHaveText(PAYLOADS[2]!);

    // Panel administrativo: texto literal y sin ejecución.
    await page.reload();
    await expect(page.getByTestId('detail-problem')).toContainText(PAYLOADS[0]!);
    await expect(page.getByTestId('block-public')).toContainText(PAYLOADS[1]!);
    await expect(page.getByTestId('detail-name')).toContainText(PAYLOADS[0]!);
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
    expect(await page.locator('#__next script:not([src]), main script:not([src])').count()).toBe(0); // ningún <script> inyectado en el contenido
    expect(await page.locator('main img[src="x"], main svg[onload]').count()).toBe(0);

    // Consulta pública: descripción, marca, modelo y nota pública; nunca se ejecutan.
    const context = await browser.newContext({ extraHTTPHeaders: { 'x-vercel-forwarded-for': fakeIp() } });
    const pub = await context.newPage();
    await pub.goto('/consultar');
    await pub.getByLabel('Código de seguimiento').fill(order.code);
    await pub.getByRole('button', { name: 'Consultar estado' }).click();
    await expect(pub.getByTestId('tracking-result')).toBeVisible();
    await expect(pub.getByTestId('result-description')).toContainText(PAYLOADS[0]!);
    await expect(pub.getByTestId('public-note-content')).toHaveText(PAYLOADS[1]!);
    expect(await pub.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
    expect(await pub.locator('main img[src="x"], main svg[onload]').count()).toBe(0);
    const html = await pub.content();
    expect(html).not.toContain('CANARY-NOMBRE');
    expect(html).not.toContain(`${order.tag}`); // el nombre del cliente no se expone
    await context.close();
  });
});

test.describe('cabeceras y caché del build [SC-18]', () => {
  const PUBLIC_ROUTES = ['/', '/registrar', '/consultar'];

  test('rutas públicas: cabeceras exactas del TD §21.7, CSP estática sin evaluación dinámica ni terceros, sin X-Powered-By', async ({ request }) => {
    for (const route of PUBLIC_ROUTES) {
      const headers = (await request.get(route)).headers();
      expect(headers['x-content-type-options'], route).toBe('nosniff');
      expect(headers['x-frame-options'], route).toBe('DENY');
      expect(headers['referrer-policy'], route).toBe('no-referrer');
      expect(headers['cross-origin-opener-policy'], route).toBe('same-origin');
      expect(headers['cross-origin-resource-policy'], route).toBe('same-origin');
      expect(headers['permissions-policy'], route).toMatch(/camera=\(\).*microphone=\(\).*geolocation=\(\)/);
      expect(headers['x-powered-by'], route).toBeUndefined();
      const csp = headers['content-security-policy'] ?? '';
      for (const directive of ["default-src 'self'", "object-src 'none'", "base-uri 'none'", "form-action 'self'", "frame-ancestors 'none'"]) {
        expect(csp, `${route} ${directive}`).toContain(directive);
      }
      expect(csp, route).not.toContain("'unsafe-eval'");
      expect(csp, route).not.toMatch(/https?:\/\//); // sin orígenes de terceros
      expect(csp, route).not.toMatch(/\*/);
      expect(csp.match(/style-src[^;]*/)?.[0], route).not.toContain("'unsafe-inline'");
    }
  });

  test('/admin/**: nonce distinto por petición coherente con el HTML, sin unsafe-inline ni unsafe-eval en script/style, noindex y sin caché compartida', async ({ request }) => {
    const nonces = new Set<string>();
    for (let i = 0; i < 3; i += 1) {
      const response = await request.get('/admin/acceso');
      const csp = response.headers()['content-security-policy'] ?? '';
      const nonce = /'nonce-([^']+)'/.exec(csp)?.[1];
      expect(nonce, 'nonce en la CSP').toBeTruthy();
      nonces.add(nonce!);
      const script = csp.match(/script-src[^;]*/)?.[0] ?? '';
      const style = csp.match(/style-src[^;]*/)?.[0] ?? '';
      expect(script).not.toMatch(/'unsafe-inline'|'unsafe-eval'/);
      expect(style).not.toMatch(/'unsafe-inline'/);
      expect(csp).toContain("frame-ancestors 'none'");
      expect(response.headers()['x-robots-tag']).toBe('noindex, nofollow');
      const html = await response.text();
      expect(html).toContain(`nonce="${nonce}"`); // el HTML usa el nonce de ESTA respuesta
    }
    expect(nonces.size).toBe(3);
  });

  test('una orden poblada no deja PII ni datos internos en el almacenamiento del navegador ni en la URL tras consultar', async ({ browser }) => {
    const order = await seed();
    await withOwner((c) =>
      c.query("INSERT INTO order_notes (id, order_id, visibility, content, version, created_at, updated_at) VALUES ($1, $2, 'INTERNAL', 'CANARY-INTERNA', 1, now(), now())", [randomUUID(), order.id]),
    );
    const context = await browser.newContext({ extraHTTPHeaders: { 'x-vercel-forwarded-for': fakeIp() } });
    const pub = await context.newPage();
    await pub.goto('/consultar');
    await pub.getByLabel('Código de seguimiento').fill(order.code);
    await pub.getByRole('button', { name: 'Consultar estado' }).click();
    await expect(pub.getByTestId('tracking-result')).toBeVisible();
    const storage = await pub.evaluate(() => JSON.stringify({ l: { ...localStorage }, s: { ...sessionStorage } }));
    expect(storage).not.toMatch(new RegExp(`${order.code}|${order.tag}|CANARY`));
    expect(pub.url()).not.toContain(order.code);
    expect(await pub.content()).not.toContain('CANARY-INTERNA');
    await context.close();
  });
});

test.describe('lectura directa sin sesión [SC-12]', () => {
  test('/admin/**, un UUID conocido, el panel y el directorio no entregan datos sin sesión', async ({ request }) => {
    const order = await seed();
    for (const path of ['/admin', '/admin/ordenes', `/admin/ordenes/${order.id}`]) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect([301, 302, 303, 307, 308], path).toContain(response.status());
      expect(response.headers()['location'], path).toContain('/admin/acceso');
      const text = await response.text();
      expect(text, path).not.toContain(order.tag);
      expect(text, path).not.toContain(order.code);
    }
  });
});
