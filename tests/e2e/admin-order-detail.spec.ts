import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { cleanupSeeded, fakeIp, login, noHorizontalOverflow, randomCode, seedOrder, uniqueTag, withOwner } from './support/admin-session';

// E2E del detalle administrativo en solo lectura (CHG-09b): ADM-04, tramo «iniciar sesión → localizar → abrir el
// detalle». Las órdenes son FICTICIAS, pobladas con datos privados y aisladas por un fragmento único. No se ejecutan
// transiciones, diagnóstico, notas ni edición. [SC-03] [SC-10 presentación] [SC-11] [SC-12]

test.afterEach(async () => {
  await cleanupSeeded();
});

const rows = (page: Page) => page.getByTestId('order-row').filter({ visible: true });
const NOT_FOUND = 'Orden no encontrada';

async function settledSearch(page: Page, text: string) {
  await page.getByLabel('Buscar por código o nombre').fill(text);
  const response = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('/admin/ordenes'));
  await page.getByRole('button', { name: 'Buscar' }).click();
  await response;
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
}

async function seedWithHistory(tag: string, extra: { id?: string; status?: string; email?: string | null; model?: string | null; problem?: string; name?: string } = {}) {
  const id = extra.id ?? randomUUID();
  const code = randomCode();
  const base = Date.UTC(2099, 5, 1, 12, 0);
  await withOwner(async (db) => {
    await seedOrder(db, {
      id,
      code,
      name: extra.name ?? `${tag} Cliente Detalle`,
      status: extra.status ?? 'EN_DIAGNOSTICO',
      createdAt: new Date(base),
      email: extra.email,
      model: extra.model,
      problem: extra.problem ?? 'No enciende y huele a quemado',
      brand: 'Lenovo',
      history: [
        { from: null, to: 'SOLICITUD_RECIBIDA', at: new Date(base) },
        { from: 'SOLICITUD_RECIBIDA', to: 'EQUIPO_RECIBIDO', at: new Date(base + 60 * 60_000) },
        ...((extra.status ?? 'EN_DIAGNOSTICO') === 'EN_DIAGNOSTICO' ? [{ from: 'EQUIPO_RECIBIDO', to: 'EN_DIAGNOSTICO', at: new Date(base + 2 * 60 * 60_000) }] : []),
      ],
    });
  });
  return { id, code };
}

test.describe('ADM-04 — contenido del detalle', () => {
  test('cabecera, recorrido, bloque Público y bloque Interno con sus datos e historial (más reciente primero)', async ({ page }) => {
    const tag = uniqueTag();
    const { id, code } = await seedWithHistory(tag);
    await login(page);
    await page.goto(`/admin/ordenes/${id}`);
    const detail = page.getByTestId('order-detail');
    await expect(detail.getByRole('heading', { level: 1, name: 'Detalle de la orden' })).toBeVisible();
    await expect(detail.getByTestId('detail-code')).toHaveText(code);
    await expect(detail.getByTestId('status-badge').first()).toHaveText('En diagnóstico');
    await expect(detail.getByTestId('detail-created')).toContainText('01/06/2099 07:00'); // 12:00 UTC = 07:00 Lima

    // Recorrido de etapas (presentación): 3 completadas/actual de 7, sin etapas clicables ni acciones.
    const journey = detail.getByTestId('repair-journey');
    await expect(journey.getByTestId('journey-headline')).toHaveText('Etapa 3 de 7 · En diagnóstico');
    await expect(journey.locator('li[data-state="completed"]')).toHaveCount(2);
    await expect(journey.locator('li[data-state="current"]')).toHaveCount(1);
    await expect(journey.locator('li[data-state="pending"]')).toHaveCount(4);
    await expect(journey.getByRole('button')).toHaveCount(0);
    await expect(journey.getByRole('link')).toHaveCount(0);

    // Público: equipo y descripción. Interno: contacto e historial.
    const publicBlock = detail.getByTestId('block-public');
    await expect(publicBlock).toContainText('Público — Visible al cliente');
    await expect(publicBlock).toContainText('Laptop');
    await expect(publicBlock).toContainText('Lenovo');
    await expect(publicBlock.getByTestId('detail-model')).toHaveText('M1');
    await expect(publicBlock.getByTestId('detail-problem')).toHaveText('No enciende y huele a quemado');
    await expect(publicBlock).not.toContainText(`${tag} Cliente Detalle`);
    const internal = detail.getByTestId('block-internal');
    await expect(internal).toContainText('Interno — Solo taller');
    await expect(internal.getByTestId('detail-name')).toHaveText(`${tag} Cliente Detalle`);
    await expect(internal.getByTestId('detail-phone')).toHaveText('+51 CANARY-TELEFONO 999');
    await expect(internal.getByTestId('detail-email')).toHaveText('canary-correo@example.com');

    const history = internal.getByTestId('history-event');
    await expect(history).toHaveCount(3);
    await expect(history.nth(0).getByTestId('history-change')).toHaveText('Equipo recibido → En diagnóstico');
    await expect(history.nth(1).getByTestId('history-change')).toHaveText('Solicitud recibida → Equipo recibido');
    await expect(history.nth(2).getByTestId('history-change')).toHaveText('Solicitud recibida');
    await expect(history.nth(0)).toContainText('01/06/2099 09:00');
    await expect(history.nth(2)).toContainText('01/06/2099 07:00');

    // El UUID es un identificador técnico: no se presenta como dato y el código de seguimiento no va en la URL.
    await expect(page.getByRole('main')).not.toContainText(id);
    expect(page.url()).not.toContain(code);
    await noHorizontalOverflow(page);
  });

  test('correo y modelo ausentes se muestran como «No informado»; la orden recién registrada solo tiene su evento inicial', async ({ page }) => {
    const tag = uniqueTag();
    const id = randomUUID();
    await withOwner(async (db) => {
      await seedOrder(db, {
        id,
        name: `${tag} Sin Datos`,
        email: null,
        model: null,
        createdAt: new Date(Date.UTC(2099, 5, 2)),
        history: [{ from: null, to: 'SOLICITUD_RECIBIDA', at: new Date(Date.UTC(2099, 5, 2)) }],
      });
    });
    await login(page);
    await page.goto(`/admin/ordenes/${id}`);
    await expect(page.getByTestId('detail-email')).toHaveText('No informado');
    await expect(page.getByTestId('detail-model')).toHaveText('No informado');
    await expect(page.getByRole('main')).not.toContainText(/null|undefined/);
    await expect(page.getByTestId('history-event')).toHaveCount(1);
    await expect(page.getByTestId('history-change')).toHaveText('Solicitud recibida');
    await expect(page.getByTestId('repair-journey').locator('li[data-state="current"]')).toHaveCount(1);
  });

  test('texto largo: nombre, correo y descripción se ajustan sin desbordar la página', async ({ page }) => {
    const tag = uniqueTag();
    const { id } = await seedWithHistory(tag, {
      name: `${tag} ${'N'.repeat(180)}`,
      email: `${'e'.repeat(120)}@${'d'.repeat(60)}.example`,
      problem: `${'P'.repeat(900)} ${'palabra '.repeat(80)}`,
    });
    await login(page);
    await page.goto(`/admin/ordenes/${id}`);
    await expect(page.getByTestId('detail-problem')).toBeVisible();
    await noHorizontalOverflow(page);
  });

  test('solo lectura: sin controles de modificación, deshabilitados ni marcadores de funciones futuras', async ({ page }) => {
    const tag = uniqueTag();
    const { id } = await seedWithHistory(tag);
    await login(page);
    await page.goto(`/admin/ordenes/${id}`);
    const main = page.getByRole('main');
    await expect(main.getByRole('button')).toHaveCount(0);
    await expect(main.locator('input, textarea, select, form, [disabled], [contenteditable]')).toHaveCount(0);
    await expect(main.getByText(/Editar|Avanzar|Cancelar orden|Guardar|próximamente|Diagnóstico|Costo|Notas?\b/)).toHaveCount(0);
    await expect(main.getByText('CANARY-DIAGNOSTICO')).toHaveCount(0); // diagnóstico y costo existen en la base y NO se cargan
    await expect(main.getByText(/150(\.00)?/)).toHaveCount(0);
  });
});

test.describe('navegación', () => {
  test('desde las cinco recientes del panel: abre el detalle y «Volver al listado» regresa al directorio', async ({ page }) => {
    const tag = uniqueTag();
    const { id } = await seedWithHistory(tag, { status: 'EN_DIAGNOSTICO' });
    await login(page);
    const recent = page.getByRole('list', { name: 'Órdenes recientes' }).getByTestId('order-row');
    await expect(recent.first()).toContainText(`${tag} Cliente Detalle`); // 2099: la más reciente
    await recent.first().getByRole('link', { name: /^Ver detalle de la orden/ }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/ordenes/${id}$`));
    await expect(page.getByTestId('order-detail')).toBeVisible();
    await page.getByRole('link', { name: /Volver al listado/ }).click();
    await expect(page).toHaveURL(/\/admin\/ordenes$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Listado de órdenes' })).toBeVisible();
  });

  test('desde una fila del directorio con ratón (clic en cualquier parte de la fila) y con teclado', async ({ page }) => {
    const tag = uniqueTag();
    const { id } = await seedWithHistory(tag);
    await login(page);
    await page.goto('/admin/ordenes');
    await settledSearch(page, `${tag} cliente detalle`);
    await expect(rows(page)).toHaveCount(1);

    // Ratón: la fila completa es clicable (clic en una esquina de la fila, lejos del enlace «Ver detalle»).
    await rows(page).first().click({ position: { x: 8, y: 8 } });
    await expect(page).toHaveURL(new RegExp(`/admin/ordenes/${id}$`));
    await expect(page.getByTestId('order-detail')).toBeVisible();

    // Teclado: el enlace «Ver detalle» recibe foco y se activa con Enter.
    await page.getByRole('link', { name: /Volver al listado/ }).click();
    await settledSearch(page, `${tag} cliente detalle`);
    const link = rows(page).first().getByRole('link', { name: /^Ver detalle de la orden/ });
    await link.focus();
    await expect(link).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`/admin/ordenes/${id}$`));
  });

  test('la búsqueda y la página no se guardan para restaurarlas al volver; el código no aparece en la URL', async ({ page }) => {
    const tag = uniqueTag();
    const { id, code } = await seedWithHistory(tag);
    await login(page);
    await page.goto('/admin/ordenes');
    await settledSearch(page, code);
    await rows(page).first().getByRole('link', { name: /^Ver detalle/ }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/ordenes/${id}$`));
    expect(page.url()).not.toContain(code);
    await page.getByRole('link', { name: /Volver al listado/ }).click();
    await expect(page.getByLabel('Buscar por código o nombre')).toHaveValue('');
    expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain(code);
  });
});

test.describe('orden no encontrada y acceso protegido', () => {
  test('UUID inexistente e identificador mal formado: el mismo estado, dentro del shell, sin UUID ni detalles técnicos', async ({ page }) => {
    await login(page);
    const missing = randomUUID();
    for (const raw of [missing, 'no-es-un-uuid', '23456789BDFG', "x'; DROP TABLE repair_orders;--".replaceAll(' ', '%20')]) {
      await page.goto(`/admin/ordenes/${raw}`);
      await expect(page.getByRole('heading', { name: NOT_FOUND })).toBeVisible();
      await expect(page.getByText('La orden que intentas consultar no existe o ya no está disponible.')).toBeVisible();
      const main = page.getByRole('main');
      await expect(main.getByRole('link', { name: 'Volver al listado' })).toHaveAttribute('href', '/admin/ordenes');
      await expect(main.getByRole('button', { name: /reintentar/i })).toHaveCount(0);
      await expect(main).not.toContainText(raw);
      await expect(main).not.toContainText(/prisma|sql|postgres|error|stack|digest|uuid/i);
      // El shell administrativo se conserva (no es el 404 global ni la landing pública).
      await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Volver al inicio' })).toHaveCount(0);
    }
    await page.getByRole('main').getByRole('link', { name: 'Volver al listado' }).click();
    await expect(page).toHaveURL(/\/admin\/ordenes$/);
  });

  test('el 404 global de rutas desconocidas sigue siendo el público', async ({ page }) => {
    const response = await page.goto('/ruta-que-no-existe');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Página no encontrada' })).toBeVisible();
  });

  test('sin sesión: la dirección directa no entrega ningún dato ni «Orden no encontrada» (regresión de SC-12)', async ({ request }) => {
    const tag = uniqueTag();
    const { id } = await seedWithHistory(tag);
    for (const raw of [id, randomUUID(), 'no-es-un-uuid']) {
      const response = await request.get(`/admin/ordenes/${raw}`, { maxRedirects: 0 });
      expect(response.status(), raw).toBe(307);
      expect(response.headers()['location'], raw).toMatch(/\/admin\/acceso$/);
      const body = await response.text();
      expect(body, raw).not.toMatch(/CANARY|Cliente Detalle|Orden no encontrada|Detalle de la orden/);
    }
  });

  test('con una cookie que ya no vale (sesión eliminada) se trata como no autenticada: acceso con aviso de sesión expirada', async ({ page }) => {
    const tag = uniqueTag();
    const { id } = await seedWithHistory(tag);
    await login(page);
    await withOwner((db) => db.query('DELETE FROM admin_sessions'));
    await page.goto(`/admin/ordenes/${id}`);
    await expect(page).toHaveURL(/\/admin\/acceso\?motivo=expirada$/);
    await expect(page.getByRole('alert').filter({ hasText: 'Tu sesión expiró' })).toBeVisible();
    await expect(page.getByText(NOT_FOUND)).toHaveCount(0);
    await expect(page.getByText(`${tag} Cliente Detalle`)).toHaveCount(0);
  });

  test('carga directa del detalle: CSP estricta con nonce en TODOS los scripts y sin violaciones (ruta totalmente dinámica)', async ({ page }) => {
    const tag = uniqueTag();
    const { id } = await seedWithHistory(tag);
    await login(page);
    const violations: string[] = [];
    page.on('console', (message) => {
      if (/content security policy/i.test(message.text())) violations.push(message.text());
    });
    const response = await page.goto(`/admin/ordenes/${id}`);
    const csp = response?.headers()['content-security-policy'] ?? '';
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).not.toContain("'unsafe-inline'");
    const scripts = await page.evaluate(() =>
      Array.from(document.scripts).map((script) => ({ nonce: script.nonce || script.getAttribute('nonce') || '', inline: !script.src })),
    );
    expect(scripts.length).toBeGreaterThan(0);
    expect(scripts.filter((script) => script.nonce === '')).toEqual([]);
    // El cliente hidrata: el enlace «Volver al listado» navega sin recarga completa.
    await page.getByRole('link', { name: /Volver al listado/ }).click();
    await expect(page).toHaveURL(/\/admin\/ordenes$/);
    expect(violations).toEqual([]);
  });

  test('cabeceras: noindex y sin caché compartida', async ({ page }) => {
    const tag = uniqueTag();
    const { id } = await seedWithHistory(tag);
    await login(page);
    const response = await page.goto(`/admin/ordenes/${id}`);
    expect(response?.headers()['cache-control']).toMatch(/no-store|private/);
    expect(response?.headers()['x-robots-tag']).toContain('noindex');
    expect(await page.locator('meta[name="robots"]').getAttribute('content')).toContain('noindex');
  });
});

test.describe('privacidad pública (SC-11)', () => {
  test('lo que el detalle muestra al administrador no aparece en la consulta pública de la misma orden', async ({ page }) => {
    const tag = uniqueTag();
    const { id, code } = await seedWithHistory(tag, { problem: 'Pantalla rota' });
    await page.setExtraHTTPHeaders({ 'x-vercel-forwarded-for': fakeIp().slice(0, 40) });
    await page.goto('/consultar');
    await page.getByLabel('Código de seguimiento').fill(code);
    await page.getByRole('button', { name: 'Consultar estado' }).click();
    await expect(page.getByTestId('tracking-result')).toBeVisible();
    const html = await page.content();
    for (const secret of [tag, 'Cliente Detalle', 'CANARY-TELEFONO', 'canary-correo', 'CANARY-DIAGNOSTICO', id, 'Solo taller', 'Nunca se muestra al cliente']) {
      expect(html, secret).not.toContain(secret);
    }
  });
});
