import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { cleanupSeeded, fakeIp, login, noHorizontalOverflow, randomCode, seedOrder, uniqueTag, withOwner } from './support/admin-session';

// E2E de la corrección de datos básicos (CHG-13, ADM-04): edición en línea, validación, cancelación, vista desactualizada,
// orden final y reflejo público. Órdenes FICTICIAS sembradas con el propietario de la rama `test`. [E3] [E9] [E17] [SC-09] [SC-11]

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
      name: `${tag} Cliente Original`,
      status,
      createdAt: new Date(base),
      diagnosis: status === 'EN_DIAGNOSTICO' ? null : undefined,
      cost: status === 'EN_DIAGNOSTICO' ? null : undefined,
      phone: '+51 999 111 222', // válido: la corrección aplica las mismas reglas del registro
      brand: 'MarcaOriginal',
      model: 'M1',
      history: [{ from: null, to: 'SOLICITUD_RECIBIDA', at: new Date(base) }],
    });
  });
  return { id, code, tag };
}

const open = async (page: Page, order: Order) => {
  await page.goto(`/admin/ordenes/${order.id}`);
  await expect(page.getByTestId('order-detail')).toBeVisible();
};
const editButton = (page: Page) => page.getByRole('button', { name: 'Editar datos' });
const save = (page: Page) => page.getByRole('button', { name: 'Guardar cambios' });
const row = (id: string) =>
  withOwner(async (c) => (await c.query('SELECT tracking_code, version, customer_name, customer_phone, customer_email, device_type::text AS device_type, brand, model, problem_description FROM repair_orders WHERE id = $1', [id])).rows[0]!);
const historyCount = (id: string) =>
  withOwner(async (c) => Number((await c.query('SELECT (SELECT count(*) FROM order_status_history WHERE order_id = $1) + (SELECT count(*) FROM diagnosis_history WHERE order_id = $1) + (SELECT count(*) FROM cost_history WHERE order_id = $1) AS n', [id])).rows[0]!.n));

async function publicPage(page: Page, code: string) {
  const context = await page.context().browser()!.newContext({ extraHTTPHeaders: { 'x-vercel-forwarded-for': fakeIp().slice(0, 40) } });
  const anonymous = await context.newPage();
  await anonymous.goto('/consultar');
  await anonymous.getByLabel('Código de seguimiento').fill(code);
  await anonymous.getByRole('button', { name: 'Consultar estado' }).click();
  await expect(anonymous.getByTestId('tracking-result')).toBeVisible();
  return { anonymous, close: () => context.close() };
}

test.describe('edición en línea', () => {
  test('«Editar datos» abre los campos en su bloque, sin código editable; guardar muestra los valores nuevos y sube la versión una vez', async ({ page }) => {
    const order = await seed();
    await login(page);
    await open(page, order);
    const before = await row(order.id);
    const history = await historyCount(order.id);

    await expect(save(page)).toHaveCount(0);
    await editButton(page).click();
    await expect(save(page)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancelar edición' })).toBeVisible();
    await expect(page.getByTestId('block-public').getByLabel('Marca')).toBeVisible(); // equipo y descripción: bloque Público
    await expect(page.getByTestId('block-internal').getByLabel('Teléfono')).toBeVisible(); // contacto: bloque Interno
    await expect(page.getByTestId('block-public').getByLabel('Nombre')).toHaveCount(0); // los bloques no se mezclan
    await expect(page.locator('input[name="trackingCode"]')).toHaveCount(0); // E17: el código no es un campo
    await expect(page.getByTestId('detail-code')).toHaveText(order.code);

    await page.getByLabel('Nombre').fill(`${order.tag} Cliente Corregido`);
    await page.getByLabel('Teléfono').fill('+51 988 777 666');
    await page.getByLabel('Correo').fill('');
    await page.getByLabel('Marca').fill('  MarcaCorregida  ');
    await page.getByLabel('Modelo').fill('');
    await page.getByLabel('Descripción del problema').fill('Descripción corregida');
    await page.getByRole('radio', { name: 'Tablet' }).check({ force: true });
    await save(page).click();

    await expect(page.getByTestId('basic-data-notice')).toHaveText('Datos guardados.');
    await expect(save(page)).toHaveCount(0); // vuelve a solo lectura
    await expect(page.getByTestId('detail-name')).toHaveText(`${order.tag} Cliente Corregido`);
    await expect(page.getByTestId('detail-phone')).toHaveText('+51 988 777 666');
    await expect(page.getByTestId('detail-email')).toHaveText('No informado');
    await expect(page.getByTestId('detail-model')).toHaveText('No informado');
    await expect(page.getByTestId('detail-problem')).toHaveText('Descripción corregida');
    await expect(page.getByTestId('block-public')).toContainText('MarcaCorregida');
    await expect(page.getByTestId('block-public')).toContainText('Tablet');
    const after = await row(order.id);
    expect(after).toMatchObject({ tracking_code: before.tracking_code, version: before.version + 1, brand: 'MarcaCorregida', device_type: 'TABLET', customer_email: null, model: null });
    expect(await historyCount(order.id)).toBe(history); // sin historial de correcciones
    await noHorizontalOverflow(page);
  });

  test('«Cancelar edición» descarta lo escrito sin mutar nada; guardar sin cambios es un éxito sin efecto', async ({ page }) => {
    const order = await seed();
    await login(page);
    await open(page, order);
    const before = await row(order.id);
    await editButton(page).click();
    await page.getByLabel('Marca').fill('NoSeGuarda');
    await page.getByRole('button', { name: 'Cancelar edición' }).click();
    await expect(page.getByTestId('block-public')).not.toContainText('NoSeGuarda');
    await expect(editButton(page)).toBeVisible();
    expect(await row(order.id)).toEqual(before);

    await editButton(page).click();
    await save(page).click();
    await expect(page.getByTestId('basic-data-notice')).toHaveText('Sin cambios que guardar.');
    expect(await row(order.id)).toEqual(before); // ni versión ni datos
  });

  test('validación: nombre vacío, teléfono inválido y descripción larga se explican junto al campo, sin salir de ADM-04 y conservando lo escrito', async ({ page }) => {
    const order = await seed();
    await login(page);
    await open(page, order);
    const before = await row(order.id);
    await editButton(page).click();
    await page.getByLabel('Nombre').fill('   ');
    await page.getByLabel('Teléfono').fill('abc');
    await page.getByLabel('Descripción del problema').fill('x'.repeat(2001));
    await page.getByLabel('Marca').fill('MarcaEscrita');
    await save(page).click();
    await expect(page.getByText('El nombre del cliente es obligatorio.')).toBeVisible();
    await expect(page.getByText(/Ingresa un teléfono válido/)).toBeVisible();
    await expect(page.getByText(/La descripción no puede superar/)).toBeVisible();
    await expect(page.getByLabel('Nombre')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByLabel('Marca')).toHaveValue('MarcaEscrita'); // lo escrito se conserva
    await expect(page).toHaveURL(new RegExp(`/admin/ordenes/${order.id}$`));
    expect(await row(order.id)).toEqual(before); // todo o nada
  });
});

test.describe('orden cerrada, vista desactualizada y sesión', () => {
  test('una orden final se muestra en solo lectura, sin «Editar datos» y con el código visible', async ({ page }) => {
    const order = await seed('ENTREGADO');
    await login(page);
    await open(page, order);
    await expect(editButton(page)).toHaveCount(0);
    await expect(page.getByRole('main').getByRole('button')).toHaveCount(0);
    await expect(page.getByTestId('detail-code')).toHaveText(order.code);
  });

  test('si otra pantalla cambió la orden, guardar muestra «La orden cambió…» sin fusionar; «Actualizar orden» trae los valores vigentes', async ({ page }) => {
    const order = await seed();
    await login(page);
    await open(page, order);
    await editButton(page).click();
    await withOwner((c) => c.query("UPDATE repair_orders SET brand = 'CambioAjeno', version = version + 1 WHERE id = $1", [order.id]));
    await page.getByLabel('Marca').fill('MiCambio');
    await save(page).click();
    await expect(page.getByTestId('basic-data-failure')).toContainText('La orden cambió desde que abriste esta pantalla');
    expect((await row(order.id)).brand).toBe('CambioAjeno');
    await page.getByRole('button', { name: 'Actualizar orden' }).click();
    await expect(page.getByTestId('block-public')).toContainText('CambioAjeno');
    await expect(save(page)).toHaveCount(0);
  });

  test('si la orden se cierra con la pantalla abierta, guardar muestra «Esta orden ya no admite cambios» y no escribe', async ({ page }) => {
    const order = await seed();
    await login(page);
    await open(page, order);
    await editButton(page).click();
    await withOwner((c) => c.query("UPDATE repair_orders SET status = 'CANCELADO'::order_status, version = version WHERE id = $1", [order.id]));
    await page.getByLabel('Marca').fill('Tarde');
    await save(page).click();
    await expect(page.getByTestId('basic-data-failure')).toContainText('Esta orden ya no admite cambios');
    expect((await row(order.id)).brand).toBe('MarcaOriginal');
  });

  test('sin sesión válida la pantalla pide iniciar sesión y nada se guarda (SESSION_EXPIRED)', async ({ page }) => {
    const order = await seed();
    await login(page);
    await open(page, order);
    await editButton(page).click();
    await page.context().clearCookies();
    await page.getByLabel('Marca').fill('SinSesion');
    await save(page).click();
    await expect(page.getByTestId('basic-data-failure')).toContainText('Tu sesión expiró');
    expect((await row(order.id)).brand).toBe('MarcaOriginal');
  });
});

test.describe('reflejo público y búsqueda [SC-11]', () => {
  test('la consulta pública muestra equipo y descripción corregidos y nunca el nombre, teléfono ni correo; la búsqueda usa el nombre nuevo', async ({ page }) => {
    const order = await seed();
    await login(page);
    await open(page, order);
    await editButton(page).click();
    await page.getByLabel('Nombre').fill(`${order.tag} Nombre Nuevo`);
    await page.getByLabel('Teléfono').fill('+51 977 123 456');
    await page.getByLabel('Marca').fill('MarcaPublicaNueva');
    await page.getByLabel('Descripción del problema').fill('Descripción pública nueva');
    await save(page).click();
    await expect(page.getByTestId('basic-data-notice')).toHaveText('Datos guardados.');

    const view = await publicPage(page, order.code);
    await expect(view.anonymous.getByTestId('result-description')).toHaveText('Descripción pública nueva');
    await expect(view.anonymous.getByTestId('tracking-result')).toContainText('MarcaPublicaNueva');
    const html = await view.anonymous.content();
    expect(html).not.toContain('Nombre Nuevo');
    expect(html).not.toContain('977 123 456');
    await view.close();

    // La búsqueda del directorio usa el nombre nuevo y ya no encuentra el anterior.
    await page.goto('/admin/ordenes');
    const search = async (text: string) => {
      await page.getByLabel('Buscar por código o nombre').fill(text);
      const response = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('/admin/ordenes'));
      await page.getByRole('button', { name: 'Buscar' }).click();
      await response;
      await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
    };
    await search(`${order.tag} Nombre Nuevo`);
    await expect(page.getByTestId('order-row').filter({ visible: true })).toHaveCount(1);
    await search(`${order.tag} Cliente Original`);
    await expect(page.getByTestId('order-row').filter({ visible: true })).toHaveCount(0);
  });
});
