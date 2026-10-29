import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { cleanupSeeded, fakeIp, login, noHorizontalOverflow, randomCode, seedOrder, uniqueTag, withOwner } from './support/admin-session';

// E2E de notas públicas e internas (CHG-12, ADM-04 y PUB-05). Órdenes FICTICIAS sembradas con el propietario de la rama `test`.
// [E12] [E14] [SC-09] [SC-11] [SC-12]

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
      name: `${tag} Cliente Notas`,
      status,
      createdAt: new Date(base),
      diagnosis: status === 'EN_DIAGNOSTICO' ? null : undefined,
      cost: status === 'EN_DIAGNOSTICO' ? null : undefined,
      history: [{ from: null, to: 'SOLICITUD_RECIBIDA', at: new Date(base) }],
    });
  });
  return { id, code, tag };
}

const open = async (page: Page, order: Order) => {
  await page.goto(`/admin/ordenes/${order.id}`);
  await expect(page.getByTestId('order-detail')).toBeVisible();
};
const publicBlock = (page: Page) => page.getByTestId('notes-public');
const internalBlock = (page: Page) => page.getByTestId('notes-internal');

async function publicPage(page: Page, code: string) {
  const context = await page.context().browser()!.newContext({ extraHTTPHeaders: { 'x-vercel-forwarded-for': fakeIp().slice(0, 40) } });
  const anonymous = await context.newPage();
  await anonymous.goto('/consultar');
  await anonymous.getByLabel('Código de seguimiento').fill(code);
  await anonymous.getByRole('button', { name: 'Consultar estado' }).click();
  await expect(anonymous.getByTestId('tracking-result')).toBeVisible();
  return { anonymous, close: () => context.close() };
}

const notesInDb = (id: string) =>
  withOwner(async (c) => (await c.query('SELECT visibility::text AS v, content, version FROM order_notes WHERE order_id = $1 ORDER BY created_at, id', [id])).rows);
const orderVersion = (id: string) => withOwner(async (c) => Number((await c.query('SELECT version FROM repair_orders WHERE id = $1', [id])).rows[0]!.version));

test.describe('crear, editar y eliminar', () => {
  test('nota pública e interna: cada una en su bloque, con su etiqueta, sin tocar la versión de la orden', async ({ page }) => {
    const order = await seed();
    await login(page);
    await open(page, order);
    const version = await orderVersion(order.id);

    await expect(publicBlock(page).getByText('Lo verá el cliente').first()).toBeVisible();
    await expect(internalBlock(page).getByText('Solo la verá el taller').first()).toBeVisible();
    await publicBlock(page).locator('#note-public').fill('  Esperando la pieza <b>original</b>  ');
    await publicBlock(page).getByRole('button', { name: 'Publicar nota' }).click();
    await expect(publicBlock(page).getByTestId('note-item')).toHaveCount(1);
    await expect(publicBlock(page).getByTestId('note-content')).toHaveText('Esperando la pieza <b>original</b>'); // texto, nunca HTML
    await expect(publicBlock(page).getByText('Visible al cliente').first()).toBeVisible();
    await expect(publicBlock(page).locator('#note-public')).toHaveValue(''); // el compositor se limpia

    await internalBlock(page).locator('#note-internal').fill('El cliente prefiere que lo llamen por la tarde');
    await internalBlock(page).getByRole('button', { name: 'Guardar nota interna' }).click();
    await expect(internalBlock(page).getByTestId('note-item')).toHaveCount(1);
    await expect(internalBlock(page).getByText('Solo taller').first()).toBeVisible();

    expect(await notesInDb(order.id)).toEqual([
      { v: 'PUBLIC', content: 'Esperando la pieza <b>original</b>', version: 1 },
      { v: 'INTERNAL', content: 'El cliente prefiere que lo llamen por la tarde', version: 1 },
    ]);
    expect(await orderVersion(order.id)).toBe(version);
    await noHorizontalOverflow(page);
  });

  test('validación: vacío y más de 2000 caracteres muestran el mensaje y no guardan', async ({ page }) => {
    const order = await seed();
    await login(page);
    await open(page, order);
    await publicBlock(page).getByRole('button', { name: 'Publicar nota' }).click();
    await expect(publicBlock(page).getByRole('alert')).toContainText('Escribe el contenido de la nota.');
    await publicBlock(page).locator('#note-public').fill('a'.repeat(2001));
    await publicBlock(page).getByRole('button', { name: 'Publicar nota' }).click();
    await expect(publicBlock(page).getByRole('alert')).toContainText('2000 caracteres');
    expect(await notesInDb(order.id)).toEqual([]);
  });

  test('editar y eliminar en línea, sin diálogo; la edición conserva la visibilidad y el cambio se ve en la consulta pública', async ({ page }) => {
    const order = await seed();
    await login(page);
    await open(page, order);
    await publicBlock(page).locator('#note-public').fill('Primera versión');
    await publicBlock(page).getByRole('button', { name: 'Publicar nota' }).click();
    await expect(publicBlock(page).getByTestId('note-item')).toHaveCount(1);

    await publicBlock(page).getByRole('button', { name: 'Editar' }).click();
    await publicBlock(page).getByTestId('note-edit-form').locator('textarea').fill('Segunda versión');
    await publicBlock(page).getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(publicBlock(page).getByTestId('note-content')).toHaveText('Segunda versión');
    expect(await notesInDb(order.id)).toEqual([{ v: 'PUBLIC', content: 'Segunda versión', version: 2 }]);

    const view = await publicPage(page, order.code);
    await expect(view.anonymous.getByTestId('public-note-content')).toHaveText('Segunda versión');
    await expect(view.anonymous.getByTestId('more-info-empty')).toHaveCount(0);

    await publicBlock(page).getByRole('button', { name: 'Eliminar' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0); // sin confirmación
    await expect(publicBlock(page).getByTestId('note-item')).toHaveCount(0);
    expect(await notesInDb(order.id)).toEqual([]);
    await view.close();
    const again = await publicPage(page, order.code);
    await expect(again.anonymous.getByTestId('public-notes')).toHaveCount(0);
    await expect(again.anonymous.getByTestId('more-info-empty')).toBeVisible(); // E6: nada publicado todavía
    await again.close();
  });
});

test.describe('privacidad [SC-11]', () => {
  test('la consulta pública muestra solo las notas públicas, la más reciente primero, y nunca las internas', async ({ page }) => {
    const order = await seed();
    await login(page);
    await open(page, order);
    await internalBlock(page).locator('#note-internal').fill('CANARY-NOTA-INTERNA');
    await internalBlock(page).getByRole('button', { name: 'Guardar nota interna' }).click();
    await expect(internalBlock(page).getByTestId('note-item')).toHaveCount(1);
    for (const text of ['Nota pública uno', 'Nota pública dos']) {
      await publicBlock(page).locator('#note-public').fill(text);
      await publicBlock(page).getByRole('button', { name: 'Publicar nota' }).click();
      await expect(publicBlock(page).getByTestId('note-content').filter({ hasText: text })).toBeVisible(); // la nota ya está publicada (no el texto del compositor)
    }
    const view = await publicPage(page, order.code);
    await expect(view.anonymous.getByTestId('public-note-content')).toHaveText(['Nota pública dos', 'Nota pública uno']);
    expect(await view.anonymous.content()).not.toContain('CANARY-NOTA-INTERNA');
    await view.close();
  });
});

test.describe('orden cerrada y vista desactualizada', () => {
  test('una orden final muestra las notas en «Solo lectura» y sin compositor, Editar ni Eliminar', async ({ page }) => {
    const order = await seed('ENTREGADO');
    await withOwner((c) =>
      c.query("INSERT INTO order_notes (id, order_id, visibility, content, version, created_at, updated_at) VALUES ($1, $2, 'INTERNAL', 'Nota previa', 1, now(), now())", [randomUUID(), order.id]),
    );
    await login(page);
    await open(page, order);
    await expect(internalBlock(page).getByText('Nota previa')).toBeVisible();
    await expect(internalBlock(page).getByText('Solo lectura').first()).toBeVisible();
    await expect(page.getByRole('main').getByRole('button')).toHaveCount(0);
    await expect(page.locator('#note-public, #note-internal')).toHaveCount(0);
  });

  test('si la orden se cierra con la pantalla abierta, crear una nota muestra «La orden ya fue cerrada» y no escribe', async ({ page }) => {
    const order = await seed();
    await login(page);
    await open(page, order);
    await withOwner((c) => c.query("UPDATE repair_orders SET status = 'CANCELADO'::order_status, version = version + 1 WHERE id = $1", [order.id]));
    await publicBlock(page).locator('#note-public').fill('Llegó tarde');
    await publicBlock(page).getByRole('button', { name: 'Publicar nota' }).click();
    await expect(publicBlock(page).getByRole('alert')).toContainText('La orden ya fue cerrada');
    await publicBlock(page).getByRole('button', { name: 'Actualizar orden' }).click();
    await expect(page.locator('#note-public')).toHaveCount(0); // tras actualizar, el detalle ya es de solo lectura
    expect(await notesInDb(order.id)).toEqual([]);
  });

  test('dos pestañas: editar con una versión vieja muestra «La nota cambió…» y «Actualizar notas» trae la vigente', async ({ page }) => {
    const order = await seed();
    await login(page);
    await open(page, order);
    await publicBlock(page).locator('#note-public').fill('Base');
    await publicBlock(page).getByRole('button', { name: 'Publicar nota' }).click();
    await expect(publicBlock(page).getByTestId('note-item')).toHaveCount(1);

    // Otra sesión cambia la nota después de que esta pantalla la cargó.
    await withOwner((c) => c.query("UPDATE order_notes SET content = 'Cambio ajeno', version = version + 1 WHERE order_id = $1", [order.id]));

    await publicBlock(page).getByRole('button', { name: 'Editar' }).click();
    await publicBlock(page).getByTestId('note-edit-form').locator('textarea').fill('Mi cambio');
    await publicBlock(page).getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(publicBlock(page).getByTestId('note-failure')).toContainText('La nota cambió desde que abriste esta pantalla');
    expect(await notesInDb(order.id)).toEqual([{ v: 'PUBLIC', content: 'Cambio ajeno', version: 2 }]);
    await publicBlock(page).getByRole('button', { name: 'Actualizar notas' }).click();
    await expect(publicBlock(page).getByTestId('note-content')).toHaveText('Cambio ajeno');
  });

  test('sin sesión válida la pantalla pide iniciar sesión y la nota no se guarda (SESSION_EXPIRED)', async ({ page }) => {
    const order = await seed();
    await login(page);
    await open(page, order);
    await page.context().clearCookies(); // la cookie de sesión ya no viaja: el servidor responde SESSION_EXPIRED
    await publicBlock(page).locator('#note-public').fill('No debe guardarse');
    await publicBlock(page).getByRole('button', { name: 'Publicar nota' }).click();
    await expect(publicBlock(page).getByTestId('note-failure')).toContainText('Tu sesión expiró');
    expect(await notesInDb(order.id)).toEqual([]);
  });
});

test.describe('cancelación con nota previa [E14]', () => {
  test('el diálogo de cancelación invita a registrar una nota antes de confirmar; la nota queda tras cancelar y es visible al cliente', async ({ page }) => {
    const order = await seed();
    await login(page);
    await open(page, order);
    await publicBlock(page).locator('#note-public').fill('Se cancela por falta de repuestos');
    await publicBlock(page).getByRole('button', { name: 'Publicar nota' }).click();
    await expect(publicBlock(page).getByTestId('note-item')).toHaveCount(1);

    await page.getByTestId('lifecycle-actions').getByRole('button', { name: 'Cancelar orden' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Si quieres dejar una explicación pública o interna, regístrala antes de confirmar.');
    await expect(dialog.locator('textarea, input')).toHaveCount(0); // la nota se registra FUERA del diálogo
    await dialog.getByRole('button', { name: 'Cancelar orden' }).click();
    await expect(page.getByTestId('status-badge').first()).toHaveText('Cancelado');
    await expect(publicBlock(page).getByTestId('note-content')).toHaveText('Se cancela por falta de repuestos');
    await expect(page.locator('#note-public')).toHaveCount(0);

    const view = await publicPage(page, order.code);
    await expect(view.anonymous.getByTestId('public-note-content')).toHaveText('Se cancela por falta de repuestos');
    await view.close();
  });
});
