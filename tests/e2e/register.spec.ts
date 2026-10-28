import pg from 'pg';
import { expect, test, type Locator, type Page } from '@playwright/test';

// E2E del registro público (CHG-05): PUB-02 → PUB-03. Escribe en la base de la rama Neon `test` (el servidor de
// Playwright usa solo TEST_DATABASE_URL) y comprueba con la conexión del propietario de pruebas. Datos ficticios.
// [SC-01] [SC-16] [E1] [E2] [E3] [E16] [E17]

const OWNER_URL = process.env.TEST_DIRECT_URL;
// Nombre único por prueba y proyecto: los dos proyectos de Playwright ejecutan los mismos tests sobre la misma base.
const uniq = (base: string) => `${base} ${Math.random().toString(36).slice(2, 8)}`;
const isMobile = (page: Page) => (page.viewportSize()?.width ?? 0) < 1024;

async function noHorizontalOverflow(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

async function dbQuery<T extends pg.QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
  const client = new pg.Client({ connectionString: OWNER_URL });
  await client.connect();
  try {
    return (await client.query<T>(sql, params)).rows;
  } finally {
    await client.end();
  }
}

type Fill = Partial<{ name: string; phone: string; email: string; device: string; brand: string; model: string; description: string }>;

async function fillForm(page: Page, data: Fill = {}) {
  const v = {
    name: 'Ana Muñoz E2E',
    phone: '+51 987 654 321',
    email: '',
    device: 'Laptop',
    brand: 'Lenovo',
    model: '',
    description: 'No enciende después de una caída.',
    ...data,
  };
  await page.getByLabel(/^Nombre del cliente/).fill(v.name);
  await page.getByLabel(/^Teléfono/).fill(v.phone);
  if (v.email) await page.getByLabel(/^Correo electrónico/).fill(v.email);
  await page.locator('label').filter({ hasText: v.device }).first().click();
  await page.getByLabel(/^Marca/).fill(v.brand);
  if (v.model) await page.getByLabel(/^Modelo/).fill(v.model);
  await page.getByLabel(/^Descripción del problema/).fill(v.description);
}

const submitButton = (page: Page) => page.getByRole('button', { name: /^Registrar reparación|^Registrando/ });
const code = (page: Page): Locator => page.getByTestId('tracking-code');

test.skip(!OWNER_URL, 'requiere TEST_DIRECT_URL (rama Neon test)');

test.describe('PUB-02 formulario', () => {
  test('presenta solo los campos aprobados, la leyenda, los avisos y los seis tipos de equipo', async ({ page }) => {
    await page.goto('/registrar');
    await expect(page.getByRole('heading', { level: 1, name: 'Registrar reparación' })).toBeVisible();
    await expect(page.getByText('Campo obligatorio')).toBeVisible();
    for (const label of [/^Nombre del cliente/, /^Teléfono/, /^Correo electrónico/, /^Marca/, /^Modelo/, /^Descripción del problema/]) {
      await expect(page.getByLabel(label)).toBeVisible();
    }
    const main = page.getByRole('main');
    // Ningún campo adicional: 5 de texto/teléfono/correo, 1 área de texto y 6 opciones de tipo de equipo.
    await expect(main.locator('input:not([type=radio])')).toHaveCount(5);
    await expect(main.locator('textarea')).toHaveCount(1);
    await expect(main.getByRole('radio')).toHaveCount(6);
    await expect(main.locator('input[type=file], input[type=password], input[type=checkbox]')).toHaveCount(0);
    for (const type of ['Celular', 'Tablet', 'Laptop', 'PC', 'Consola', 'Otro']) {
      await expect(main.getByRole('radio', { name: type })).toBeAttached();
    }
    await expect(main.getByText('La descripción podrá mostrarse en la consulta pública')).toBeVisible();
    await expect(main.getByText(/No incluyas contraseñas, PIN, patrones/)).toBeVisible();
    await expect(page.getByText(/Pedimos tu nombre y tu teléfono/)).toBeVisible();
    await expect(page.getByTestId('demo-notice')).toBeVisible();
    await expect(submitButton(page)).toBeDisabled();
    await expect(page.getByText('Completa los campos obligatorios para registrar la reparación.')).toBeVisible();
    await noHorizontalOverflow(page);
  });

  test('[SC-16][E3] validación por campo con resumen, sin perder lo escrito y con el botón deshabilitado', async ({ page }) => {
    await page.goto('/registrar');
    const name = page.getByLabel(/^Nombre del cliente/);
    await name.focus();
    await name.blur();
    await expect(page.getByText('El nombre del cliente es obligatorio.')).toBeVisible();
    await expect(page.getByRole('alert').filter({ hasText: 'Hay campos por corregir' })).toBeVisible();
    await expect(name).toHaveAttribute('aria-invalid', 'true');

    await page.getByLabel(/^Teléfono/).fill('abc');
    await page.getByLabel(/^Teléfono/).blur();
    await expect(page.getByText(/Ingresa un teléfono válido/)).toBeVisible();
    await page.getByLabel(/^Correo electrónico/).fill('no-es-un-correo');
    await page.getByLabel(/^Correo electrónico/).blur();
    await expect(page.getByText('Ingresa un correo válido o déjalo vacío.')).toBeVisible();
    await page.getByLabel(/^Marca/).fill('x'.repeat(61));
    await page.getByLabel(/^Marca/).blur();
    await expect(page.getByText(/La marca no puede superar 60 caracteres/)).toBeVisible();
    // Tipo de equipo sin seleccionar: error de grupo.
    await page.getByLabel(/^Descripción del problema/).focus();
    await page.getByLabel(/^Marca/).focus();
    await page.getByRole('radio', { name: 'Celular' }).focus();
    await page.getByLabel(/^Marca/).focus();
    await expect(submitButton(page)).toBeDisabled();
    await expect(page.getByText('Corrige los campos marcados para continuar.')).toBeVisible();
    // Lo escrito se conserva.
    await expect(page.getByLabel(/^Teléfono/)).toHaveValue('abc');
    await expect(page.getByLabel(/^Correo electrónico/)).toHaveValue('no-es-un-correo');
    // Al corregir desaparecen los errores y el botón se habilita.
    await page.getByLabel(/^Correo electrónico/).fill('');
    await fillForm(page);
    await expect(submitButton(page)).toBeEnabled();
    await expect(page.getByText('Hay campos por corregir')).toHaveCount(0);
  });

  test('un registro válido con solo los obligatorios se acepta (correo y modelo opcionales)', async ({ page }) => {
    await page.goto('/registrar');
    await fillForm(page);
    await expect(submitButton(page)).toBeEnabled();
  });
});

test.describe('registro exitoso y confirmación PUB-03', () => {
  test('[SC-01][E2] crea la orden, muestra el código y un resumen sin datos personales; nada en URL ni almacenamiento', async ({ page, context }) => {
    await page.goto('/registrar');
    const personName = uniq('Camila Quispe E2E');
    await fillForm(page, { name: personName, phone: '(01) 234-5678', email: 'camila@example.com', device: 'Tablet', brand: 'Apple', model: 'iPad 9' });
    await submitButton(page).click();

    await expect(page.getByRole('heading', { level: 1, name: 'Solicitud registrada' })).toBeVisible();
    const trackingCode = (await code(page).innerText()).trim();
    expect(trackingCode).toMatch(/^[2-9BDFGHJKMNPRSTWX]{12}$/);
    await expect(page.getByText('No hay recuperación de autoservicio')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Copiar código' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Volver al inicio' })).toBeVisible();
    // «Consultar estado» aún no tiene destino (CHG-06): deshabilitado con el motivo.
    await expect(page.getByRole('main').getByRole('button', { name: 'Consultar estado' })).toBeDisabled();
    await expect(page.getByRole('main').getByText('Disponible próximamente')).toBeVisible();

    // Resumen del equipo sin datos personales.
    const main = page.getByRole('main');
    await expect(main.getByText('Tablet', { exact: true })).toBeVisible();
    await expect(main.getByText('Apple')).toBeVisible();
    await expect(main.getByText('iPad 9')).toBeVisible();
    const visible = await main.innerText();
    for (const personal of ['Camila', 'Quispe', '234-5678', 'camila@example.com']) expect(visible).not.toContain(personal);

    // Privacidad: ni URL, ni almacenamiento persistente, ni cookies con el código.
    expect(page.url()).not.toContain(trackingCode);
    expect(new URL(page.url()).pathname).toBe('/registrar');
    expect(new URL(page.url()).search + new URL(page.url()).hash).toBe('');
    const storage = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
    expect(storage).not.toContain(trackingCode);
    expect(JSON.stringify(await context.cookies())).not.toContain(trackingCode);

    // Persistencia: una orden en SOLICITUD_RECIBIDA con su evento inicial y datos intactos.
    const [order] = await dbQuery<{ id: string; status: string; customer_name: string; customer_name_search: string; device_type: string; model: string; customer_email: string }>(
      'SELECT id, status, customer_name, customer_name_search, device_type, model, customer_email FROM repair_orders WHERE tracking_code = $1',
      [trackingCode],
    );
    expect(order).toMatchObject({ status: 'SOLICITUD_RECIBIDA', customer_name: personName, customer_name_search: personName.toLowerCase(), device_type: 'TABLET', model: 'iPad 9', customer_email: 'camila@example.com' });
    const history = await dbQuery('SELECT from_status, to_status FROM order_status_history WHERE order_id = $1', [order.id]);
    expect(history).toEqual([{ from_status: null, to_status: 'SOLICITUD_RECIBIDA' }]);
    await noHorizontalOverflow(page);
  });

  test('[E2] «Copiar código» copia el código y muestra «Código copiado»', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/registrar');
    await fillForm(page);
    await submitButton(page).click();
    const trackingCode = (await code(page).innerText()).trim();
    await page.getByRole('button', { name: 'Copiar código' }).click();
    await expect(page.getByText('Código copiado')).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(trackingCode);
  });

  test('[E1] el doble envío del mismo intento crea una sola orden con un solo código', async ({ page }) => {
    await page.goto('/registrar');
    const personName = uniq('Doble Envio E2E');
    await fillForm(page, { name: personName });
    // Dos envíos del mismo formulario en el mismo instante (doble clic / reintento de red).
    await page.evaluate(() => {
      const form = document.querySelector('form') as HTMLFormElement;
      form.requestSubmit();
      form.requestSubmit();
    });
    await expect(page.getByRole('heading', { level: 1, name: 'Solicitud registrada' })).toBeVisible();
    const trackingCode = (await code(page).innerText()).trim();
    const orders = await dbQuery('SELECT id FROM repair_orders WHERE customer_name = $1', [personName]);
    expect(orders).toHaveLength(1);
    const keys = await dbQuery('SELECT count(*)::int AS n FROM registration_idempotency WHERE order_id = $1', [orders[0].id]);
    expect(keys[0].n).toBe(1);
    expect(trackingCode).toMatch(/^[2-9BDFGHJKMNPRSTWX]{12}$/);
  });

  test('dos solicitudes deliberadas con los mismos datos son dos órdenes con códigos distintos', async ({ page }) => {
    const codes: string[] = [];
    const personName = uniq('Misma Persona E2E');
    for (let i = 0; i < 2; i += 1) {
      await page.goto('/registrar');
      await fillForm(page, { name: personName });
      await submitButton(page).click();
      await expect(page.getByRole('heading', { level: 1, name: 'Solicitud registrada' })).toBeVisible();
      codes.push((await code(page).innerText()).trim());
    }
    expect(codes[0]).not.toBe(codes[1]);
    expect(await dbQuery('SELECT id FROM repair_orders WHERE customer_name = $1', [personName])).toHaveLength(2);
  });

  test('el texto con apariencia de código se guarda y se muestra como texto literal', async ({ page }) => {
    await page.goto('/registrar');
    const personName = uniq('Literal E2E');
    await fillForm(page, { name: personName, description: '<script>window.__xss = 1</script> {{7*7}}' });
    await submitButton(page).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Solicitud registrada' })).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
    const [row] = await dbQuery<{ problem_description: string }>('SELECT problem_description FROM repair_orders WHERE customer_name = $1', [personName]);
    expect(row.problem_description).toBe('<script>window.__xss = 1</script> {{7*7}}');
  });
});

test.describe('privacidad de la navegación', () => {
  test('al salir de /registrar y volver, el formulario está vacío y no reaparecen el código ni los datos', async ({ page }) => {
    await page.goto('/registrar');
    const personName = uniq('Salir Y Volver E2E');
    await fillForm(page, { name: personName });
    await submitButton(page).click();
    const trackingCode = (await code(page).innerText()).trim();

    await page.getByRole('link', { name: 'Volver al inicio' }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/registrar$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Registrar reparación' })).toBeVisible();
    await expect(page.getByLabel(/^Nombre del cliente/)).toHaveValue('');
    await expect(page.getByTestId('tracking-code')).toHaveCount(0);
    expect(await page.locator('body').innerText()).not.toContain(trackingCode);
    expect(await page.locator('body').innerText()).not.toContain(personName);
  });

  test('un formulario a medias tampoco se restaura al salir y volver', async ({ page }) => {
    await page.goto('/registrar');
    await page.getByLabel(/^Nombre del cliente/).fill('A Medias E2E');
    await page.getByLabel(/^Marca/).fill('Dell');
    await page.getByRole('link', { name: 'FIXORA, inicio' }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goBack();
    await expect(page.getByLabel(/^Nombre del cliente/)).toHaveValue('');
    await expect(page.getByLabel(/^Marca/)).toHaveValue('');
  });

  test('una recarga completa vuelve a un formulario vacío y no repite el registro', async ({ page }) => {
    await page.goto('/registrar');
    const personName = uniq('Recarga E2E');
    await fillForm(page, { name: personName });
    await submitButton(page).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Solicitud registrada' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Registrar reparación' })).toBeVisible();
    await expect(page.getByLabel(/^Nombre del cliente/)).toHaveValue('');
    expect(await dbQuery('SELECT id FROM repair_orders WHERE customer_name = $1', [personName])).toHaveLength(1);
  });
});

test.describe('responsive y accesibilidad', () => {
  test('formulario y confirmación sin desbordamiento horizontal; botones de 44 px en móvil', async ({ page }) => {
    await page.goto('/registrar');
    await noHorizontalOverflow(page);
    if (isMobile(page)) {
      for (const radio of await page.getByRole('main').locator('label:has(input[type=radio])').all()) {
        expect((await radio.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      }
    }
    await fillForm(page, { name: 'Responsive E2E' });
    if (isMobile(page)) expect((await submitButton(page).boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await submitButton(page).click();
    await expect(code(page)).toBeVisible();
    await noHorizontalOverflow(page);
    // El código nunca se parte en dos líneas.
    const lines = await code(page).evaluate((node) => Math.round(node.getBoundingClientRect().height / parseFloat(getComputedStyle(node).lineHeight)));
    expect(lines).toBeLessThanOrEqual(2); // padding vertical incluido: una sola línea de texto
    const wrapped = await code(page).evaluate((node) => getComputedStyle(node).whiteSpace);
    expect(wrapped).toBe('nowrap');
  });

  test('el formulario se puede completar y enviar solo con teclado', async ({ page }) => {
    await page.goto('/registrar');
    await page.getByLabel(/^Nombre del cliente/).focus();
    await page.keyboard.type('Teclado E2E');
    await page.keyboard.press('Tab');
    await page.keyboard.type('987654321');
    await page.keyboard.press('Tab'); // correo (opcional)
    await page.keyboard.press('Tab'); // primer tipo de equipo
    await page.keyboard.press('ArrowRight'); // selección única con flechas
    await expect(page.getByRole('radio', { name: 'Tablet' })).toBeChecked();
    await page.getByLabel(/^Marca/).focus();
    await page.keyboard.type('Samsung');
    await page.getByLabel(/^Descripción del problema/).focus();
    await page.keyboard.type('No carga');
    await page.getByLabel(/^Descripción del problema/).press('Tab');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { level: 1, name: 'Solicitud registrada' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Solicitud registrada' })).toBeFocused();
  });
});
