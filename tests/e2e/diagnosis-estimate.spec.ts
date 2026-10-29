import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { cleanupSeeded, fakeIp, login, noHorizontalOverflow, randomCode, seedOrder, uniqueTag, withOwner } from './support/admin-session';

// E2E de diagnóstico y costo estimado (CHG-11): edición, congelamiento, publicación al cliente, cancelaciones, el
// recorrido obligatorio `E2E-01` y el ciclo completo de `SC-04`. Las órdenes son FICTICIAS. [SC-04] [SC-07] [SC-08]
// [SC-10] [SC-17] [E5] [E6]

test.afterEach(async () => {
  await cleanupSeeded();
});

const PRIVATE_DIAGNOSIS = 'Placa madre dañada; reemplazo del conector de carga.';

type Order = { id: string; code: string; tag: string };

const PATHS: Record<string, [string | null, string][]> = {
  SOLICITUD_RECIBIDA: [[null, 'SOLICITUD_RECIBIDA']],
  EQUIPO_RECIBIDO: [[null, 'SOLICITUD_RECIBIDA'], ['SOLICITUD_RECIBIDA', 'EQUIPO_RECIBIDO']],
  EN_DIAGNOSTICO: [[null, 'SOLICITUD_RECIBIDA'], ['SOLICITUD_RECIBIDA', 'EQUIPO_RECIBIDO'], ['EQUIPO_RECIBIDO', 'EN_DIAGNOSTICO']],
  ESPERANDO_APROBACION: [[null, 'SOLICITUD_RECIBIDA'], ['SOLICITUD_RECIBIDA', 'EQUIPO_RECIBIDO'], ['EQUIPO_RECIBIDO', 'EN_DIAGNOSTICO'], ['EN_DIAGNOSTICO', 'ESPERANDO_APROBACION']],
};

async function seed(status: string, values: { diagnosis?: string | null; cost?: number | null } = {}): Promise<Order> {
  const tag = uniqueTag();
  const id = randomUUID();
  const code = randomCode();
  const base = Date.UTC(2020, 6, 1, 12, 0); // en el pasado: los eventos reales de la prueba quedan como los más recientes
  await withOwner(async (db) => {
    await seedOrder(db, {
      id,
      code,
      name: `${tag} Cliente Diagnóstico`,
      status,
      createdAt: new Date(base),
      diagnosis: values.diagnosis === undefined ? null : values.diagnosis,
      cost: values.cost === undefined ? null : values.cost,
      history: (PATHS[status] ?? [[null, 'SOLICITUD_RECIBIDA']]).map(([from, to], i) => ({ from, to, at: new Date(base + i * 60_000) })),
    });
  });
  return { id, code, tag };
}

const db = {
  order: (id: string) => withOwner(async (c) => (await c.query('SELECT status::text AS status, version, diagnosis, estimated_cost::text AS cost FROM repair_orders WHERE id = $1', [id])).rows[0]!),
  diagnosisEvents: (id: string) => withOwner(async (c) => (await c.query('SELECT previous_value AS p, new_value AS n FROM diagnosis_history WHERE order_id = $1 ORDER BY occurred_at, id', [id])).rows),
  costEvents: (id: string) => withOwner(async (c) => (await c.query('SELECT previous_value::text AS p, new_value::text AS n FROM cost_history WHERE order_id = $1 ORDER BY occurred_at, id', [id])).rows),
};

const open = async (page: Page, order: { id: string }) => {
  await page.goto(`/admin/ordenes/${order.id}`);
  await expect(page.getByTestId('order-detail')).toBeVisible();
};
const advance = (page: Page, label: string) => page.getByTestId('lifecycle-actions').getByRole('button', { name: `Avanzar a ${label}` });
const dialog = (page: Page) => page.getByRole('dialog');
const diagnosisField = (page: Page) => page.locator('#diagnosis');
const costField = (page: Page) => page.locator('#estimatedCost');

async function saveDiagnosis(page: Page, text: string) {
  await diagnosisField(page).fill(text);
  await page.getByRole('button', { name: 'Guardar diagnóstico' }).click();
}
async function saveCost(page: Page, text: string) {
  await costField(page).fill(text);
  await page.getByRole('button', { name: 'Guardar costo' }).click();
}

/** Consulta pública con un navegador sin sesión (contexto nuevo): lo que ve el cliente. */
async function publicConsult(page: Page, code: string) {
  const context = await page.context().browser()!.newContext({ extraHTTPHeaders: { 'x-vercel-forwarded-for': fakeIp().slice(0, 40) } });
  const anonymous = await context.newPage();
  try {
    await anonymous.goto('/consultar');
    await anonymous.getByLabel('Código de seguimiento').fill(code);
    await anonymous.getByRole('button', { name: 'Consultar estado' }).click();
    await expect(anonymous.getByTestId('tracking-result')).toBeVisible();
    const result = anonymous.getByTestId('tracking-result');
    const details = anonymous.getByTestId('repair-details');
    return {
      status: await result.getByTestId('status-badge').first().innerText(),
      timeline: await anonymous.getByTestId('status-timeline').locator('p.font-medium, p.font-semibold').allInnerTexts(),
      journeyHeadline: await result.getByTestId('journey-headline').innerText(),
      hasDetails: (await details.count()) > 0,
      cost: (await details.count()) > 0 ? (await anonymous.getByTestId('public-cost').innerText()).trim() : null,
      diagnosis: (await details.count()) > 0 ? (await anonymous.getByTestId('public-diagnosis').innerText()).trim() : null,
      emptyInfo: (await anonymous.getByTestId('more-info-empty').count()) > 0,
      html: await anonymous.content(),
    };
  } finally {
    await context.close();
  }
}

test.describe('edición de diagnóstico y costo', () => {
  test('crear, modificar y limpiar: guardados independientes, valor vigente del servidor, historial exacto y nada público', async ({ page }) => {
    const order = await seed('EN_DIAGNOSTICO');
    await login(page);
    await open(page, order);
    await expect(page.getByTestId('not-visible-label')).toHaveCount(2);
    await expect(diagnosisField(page)).toHaveValue('');
    await expect(costField(page)).toHaveValue('');
    await expect(page.getByRole('main')).not.toContainText('S/ 0'); // la ausencia nunca se presenta como cero

    await saveDiagnosis(page, `  ${PRIVATE_DIAGNOSIS}  `);
    await expect(page.getByTestId('diagnosis-notice')).toHaveText('Diagnóstico guardado.');
    await expect(diagnosisField(page)).toHaveValue(PRIVATE_DIAGNOSIS); // el valor vigente del servidor (recortado)
    await saveCost(page, '180');
    await expect(page.getByTestId('cost-notice')).toHaveText('Costo guardado.');
    await expect(costField(page)).toHaveValue('180.00');

    // El historial administrativo combina ambos cambios (más reciente primero) con el monto exacto.
    const history = page.getByTestId('status-history').getByTestId('history-event');
    await expect(history.nth(0).getByTestId('history-change')).toHaveText('S/ 180.00');
    await expect(history.nth(1).getByTestId('history-change')).toHaveText(PRIVATE_DIAGNOSIS);
    expect(await db.diagnosisEvents(order.id)).toEqual([{ p: null, n: PRIVATE_DIAGNOSIS }]);
    expect(await db.costEvents(order.id)).toEqual([{ p: null, n: '180.00' }]);

    await saveCost(page, '180.5');
    await expect(costField(page)).toHaveValue('180.50');
    await saveDiagnosis(page, '   '); // limpiar
    await expect(diagnosisField(page)).toHaveValue('');
    expect(await db.order(order.id)).toMatchObject({ diagnosis: null, cost: '180.50' });

    // Antes de Esperando aprobación el cliente no recibe nada aunque ya esté guardado.
    const view = await publicConsult(page, order.code);
    expect(view.hasDetails).toBe(false);
    expect(view.html).not.toMatch(/180\.50|Placa madre/);
    expect(view.emptyInfo).toBe(true); // E6: vacío informativo, sin errores
    await noHorizontalOverflow(page);
  });

  test('valor inválido: error junto al campo, se conserva lo escrito y no se guarda nada', async ({ page }) => {
    const order = await seed('EQUIPO_RECIBIDO');
    await login(page);
    await open(page, order);
    for (const bad of ['0', '0.00', '-5', '50.123', 'abc', '5,50']) {
      await saveCost(page, bad);
      await expect(page.getByRole('alert').filter({ hasText: 'Ingresa un monto mayor que cero con hasta dos decimales.' })).toBeVisible();
      await expect(costField(page)).toHaveValue(bad);
    }
    await saveDiagnosis(page, 'a'.repeat(2001));
    await expect(page.getByRole('alert').filter({ hasText: 'El diagnóstico no puede superar los 2000 caracteres.' })).toBeVisible();
    await expect(diagnosisField(page)).toHaveValue('a'.repeat(2001));
    expect(await db.order(order.id)).toMatchObject({ diagnosis: null, cost: null });
    expect([await db.diagnosisEvents(order.id), await db.costEvents(order.id)]).toEqual([[], []]);
    // 2000 caracteres es válido.
    await saveDiagnosis(page, 'b'.repeat(2000));
    await expect(page.getByTestId('diagnosis-notice')).toHaveText('Diagnóstico guardado.');
  });

  test('guardar un valor igual al vigente no cambia la versión ni crea historial', async ({ page }) => {
    const order = await seed('EN_DIAGNOSTICO', { diagnosis: 'Ya diagnosticado', cost: 50 });
    await login(page);
    await open(page, order);
    const before = await db.order(order.id);
    await saveDiagnosis(page, ' Ya diagnosticado ');
    await expect(page.getByTestId('diagnosis-notice')).toHaveText('Sin cambios que guardar.');
    await saveCost(page, '50');
    await expect(page.getByTestId('cost-notice')).toHaveText('Sin cambios que guardar.');
    expect(await db.order(order.id)).toEqual(before);
    expect([await db.diagnosisEvents(order.id), await db.costEvents(order.id)]).toEqual([[], []]);
  });

  test('(E9) editar sobre una pantalla desactualizada no se aplica, avisa y ofrece actualizar sin fusionar', async ({ page }) => {
    const order = await seed('EN_DIAGNOSTICO');
    await login(page);
    const stale = await page.context().newPage();
    await open(page, order);
    await open(stale, order);

    await saveDiagnosis(page, 'Desde la primera pestaña');
    await expect(page.getByTestId('diagnosis-notice')).toHaveText('Diagnóstico guardado.');

    await saveCost(stale, '99'); // la segunda pestaña conserva la versión anterior: aunque sea otro campo, no se fusiona
    const alert = stale.getByRole('alert').filter({ hasText: 'La orden cambió desde que abriste esta pantalla' });
    await expect(alert).toBeVisible();
    expect((await db.order(order.id)).cost).toBeNull();
    await alert.getByRole('button', { name: 'Actualizar orden' }).click();
    await expect(diagnosisField(stale)).toHaveValue('Desde la primera pestaña');
    await saveCost(stale, '99'); // ya con la versión vigente
    await expect(stale.getByTestId('cost-notice')).toHaveText('Costo guardado.');
  });

  test('(SC-12/E10) si la sesión se pierde antes de guardar, no se guarda nada y se avisa que expiró', async ({ page }) => {
    const order = await seed('EN_DIAGNOSTICO');
    await login(page);
    await open(page, order);
    await withOwner((c) => c.query('DELETE FROM admin_sessions'));
    await saveDiagnosis(page, 'No debe guardarse');
    await expect(page.getByRole('alert').filter({ hasText: 'Tu sesión expiró' })).toBeVisible();
    expect(await db.order(order.id)).toMatchObject({ diagnosis: null });
    expect(await db.diagnosisEvents(order.id)).toEqual([]);
  });
});

test.describe('congelamiento y publicación', () => {
  test('el resumen del diálogo #1 es real; al confirmar se congela y se publica; antes de confirmar el cliente no ve nada', async ({ page }) => {
    const order = await seed('EN_DIAGNOSTICO');
    await login(page);
    await open(page, order);
    await expect(advance(page, 'Esperando aprobación')).toBeDisabled(); // sin diagnóstico ni costo
    await saveDiagnosis(page, PRIVATE_DIAGNOSIS);
    await expect(page.getByTestId('diagnosis-notice')).toBeVisible();
    await saveCost(page, '180');
    await expect(costField(page)).toHaveValue('180.00');
    await expect(advance(page, 'Esperando aprobación')).toBeEnabled();

    await advance(page, 'Esperando aprobación').click();
    await expect(dialog(page).getByTestId('summary-diagnosis')).toHaveText(PRIVATE_DIAGNOSIS);
    await expect(dialog(page).getByTestId('summary-cost')).toHaveText('S/ 180.00');
    await expect(dialog(page)).toContainText('Al confirmar quedarán congelados y disponibles para el cliente.');
    await expect(dialog(page)).toContainText('Después no podrán modificarse.');
    // Con el diálogo abierto (sin confirmar) el cliente todavía no ve nada.
    expect((await publicConsult(page, order.code)).hasDetails).toBe(false);

    await dialog(page).getByRole('button', { name: 'Avanzar a Esperando aprobación' }).click();
    await expect(page.getByTestId('journey-headline')).toHaveText('Etapa 4 de 7 · Esperando aprobación');
    // Congelado: solo lectura, sin guardar.
    await expect(page.getByTestId('diagnosis-readonly-state')).toHaveText('Congelado');
    await expect(page.getByTestId('cost-readonly-state')).toHaveText('Congelado');
    await expect(page.getByTestId('diagnosis-readonly')).toHaveText(PRIVATE_DIAGNOSIS);
    await expect(page.getByTestId('cost-readonly')).toHaveText('S/ 180.00');
    await expect(page.getByRole('button', { name: /Guardar (diagn|costo)/ })).toHaveCount(0);
    await expect(page.locator('#diagnosis, input[name="estimatedCost"]')).toHaveCount(0);
    expect(await db.order(order.id)).toMatchObject({ status: 'ESPERANDO_APROBACION', diagnosis: PRIVATE_DIAGNOSIS, cost: '180.00' });

    // Publicado: el cliente ve el costo destacado y el diagnóstico, sin historiales ni datos administrativos.
    const view = await publicConsult(page, order.code);
    expect(view.status).toBe('Esperando aprobación');
    expect(view.cost).toBe('S/ 180.00');
    expect(view.diagnosis).toBe(PRIVATE_DIAGNOSIS);
    expect(view.emptyInfo).toBe(false);
    for (const secret of [order.tag, 'CANARY-TELEFONO', 'canary-correo', 'Historial administrativo', 'Solo taller']) expect(view.html, secret).not.toContain(secret);
    await noHorizontalOverflow(page);
  });

  test('(E11) si el diagnóstico o el costo cambian antes de confirmar, la confirmación vieja no se aplica ni publica nada', async ({ page }) => {
    const order = await seed('EN_DIAGNOSTICO', { diagnosis: 'Diagnóstico revisado', cost: 100 });
    await login(page);
    const other = await page.context().newPage();
    await open(page, order);
    await open(other, order);

    await advance(page, 'Esperando aprobación').click(); // diálogo con el resumen de la versión revisada
    await expect(dialog(page).getByTestId('summary-cost')).toHaveText('S/ 100.00');

    await saveCost(other, '120'); // otra pestaña cambia el costo (versión nueva)
    await expect(other.getByTestId('cost-notice')).toHaveText('Costo guardado.');

    await dialog(page).getByRole('button', { name: 'Avanzar a Esperando aprobación' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'La orden cambió desde que abriste esta pantalla' })).toBeVisible();
    expect((await db.order(order.id)).status).toBe('EN_DIAGNOSTICO');
    expect((await publicConsult(page, order.code)).hasDetails).toBe(false); // no se publicó nada
  });

  test('Cancelada ANTES de Esperando aprobación: solo lectura «Nunca se publicó al cliente» y el cliente nunca ve diagnóstico ni costo', async ({ page }) => {
    const order = await seed('EN_DIAGNOSTICO', { diagnosis: PRIVATE_DIAGNOSIS, cost: 250 });
    await login(page);
    await open(page, order);
    await page.getByRole('button', { name: 'Cancelar orden' }).click();
    await dialog(page).getByRole('button', { name: 'Cancelar orden' }).click();
    await expect(page.getByTestId('status-badge').first()).toHaveText('Cancelado');
    await expect(page.getByTestId('diagnosis-readonly-state')).toHaveText('Solo lectura');
    await expect(page.getByTestId('never-published').first()).toHaveText('Nunca se publicó al cliente');
    await expect(page.getByRole('button', { name: /Guardar/ })).toHaveCount(0);

    const view = await publicConsult(page, order.code);
    expect(view.status).toBe('Cancelado');
    expect(view.hasDetails).toBe(false);
    expect(view.html).not.toMatch(/250\.00|Placa madre/);
  });

  test('Cancelada DESPUÉS de Esperando aprobación: solo lectura sin la indicación y el cliente sigue viendo diagnóstico y costo', async ({ page }) => {
    const order = await seed('ESPERANDO_APROBACION', { diagnosis: PRIVATE_DIAGNOSIS, cost: 250 });
    await login(page);
    await open(page, order);
    await page.getByRole('button', { name: 'Cancelar orden' }).click();
    await dialog(page).getByRole('button', { name: 'Cancelar orden' }).click();
    await expect(page.getByTestId('status-badge').first()).toHaveText('Cancelado');
    await expect(page.getByTestId('diagnosis-readonly-state')).toHaveText('Solo lectura');
    await expect(page.getByTestId('never-published')).toHaveCount(0);

    const view = await publicConsult(page, order.code);
    expect(view.status).toBe('Cancelado');
    expect(view.cost).toBe('S/ 250.00');
    expect(view.diagnosis).toBe(PRIVATE_DIAGNOSIS);
  });
});

// --- E2E-01 (SC-17) ----------------------------------------------------------------------------------------------------

async function registerRepair(page: Page, name: string): Promise<string> {
  await page.goto('/registrar');
  await page.getByLabel(/^Nombre del cliente/).fill(name);
  await page.getByLabel(/^Teléfono/).fill('+51 987 654 321');
  await page.locator('label').filter({ hasText: 'Laptop' }).first().click();
  await page.getByLabel(/^Marca/).fill('Lenovo');
  await page.getByLabel(/^Descripción del problema/).fill('No carga la batería.');
  await page.getByRole('button', { name: /^Registrar reparación/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Solicitud registrada' })).toBeVisible();
  const code = (await page.getByTestId('tracking-code').innerText()).trim();
  expect(code).toMatch(/^[2-9BDFGHJKMNPRSTWX]{12}$/);
  return code;
}

test.describe('E2E-01 y SC-04', () => {
  test('[SC-17] E2E-01: el cliente registra y recibe el código → el administrador inicia sesión, encuentra la orden, la avanza, registra diagnóstico y costo, confirma E11 #1 → el cliente consulta y ve estado, Journey, diagnóstico y costo', async ({ page }) => {
    test.setTimeout(180_000);
    const tag = uniqueTag();
    const code = await registerRepair(page, `${tag} Cliente E2E01`);

    // El administrador (otra sesión del navegador) inicia sesión, localiza la orden por su código y abre el detalle.
    const adminContext = await page.context().browser()!.newContext();
    const adminPage = await adminContext.newPage();
    try {
      await login(adminPage);
      await adminPage.goto('/admin/ordenes');
      await adminPage.getByLabel('Buscar por código o nombre').fill(code);
      const found = adminPage.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('/admin/ordenes'));
      await adminPage.getByRole('button', { name: 'Buscar' }).click();
      await found;
      const row = adminPage.getByTestId('order-row').filter({ visible: true });
      await expect(row).toHaveCount(1);
      await row.first().getByRole('link', { name: /^Ver detalle/ }).click();
      await expect(adminPage.getByTestId('detail-code')).toHaveText(code);

      // Solicitud recibida → Equipo recibido → En diagnóstico (sin confirmación).
      await advance(adminPage, 'Equipo recibido').click();
      await expect(adminPage.getByTestId('journey-headline')).toHaveText('Etapa 2 de 7 · Equipo recibido');
      await advance(adminPage, 'En diagnóstico').click();
      await expect(adminPage.getByTestId('journey-headline')).toHaveText('Etapa 3 de 7 · En diagnóstico');

      // Diagnóstico y costo; antes de confirmar el cliente no ve nada.
      await saveDiagnosis(adminPage, PRIVATE_DIAGNOSIS);
      await expect(adminPage.getByTestId('diagnosis-notice')).toBeVisible();
      await saveCost(adminPage, '210.5');
      await expect(costField(adminPage)).toHaveValue('210.50');
      expect((await publicConsult(page, code)).hasDetails).toBe(false);

      // E11 #1 con el resumen real; al confirmar pasa a Esperando aprobación.
      await advance(adminPage, 'Esperando aprobación').click();
      await expect(dialog(adminPage).getByTestId('summary-cost')).toHaveText('S/ 210.50');
      await dialog(adminPage).getByRole('button', { name: 'Avanzar a Esperando aprobación' }).click();
      await expect(adminPage.getByTestId('journey-headline')).toHaveText('Etapa 4 de 7 · Esperando aprobación');
    } finally {
      await adminContext.close();
    }

    // El cliente consulta con su código: estado, Journey, diagnóstico y costo.
    const view = await publicConsult(page, code);
    expect(view.status).toBe('Esperando aprobación');
    expect(view.journeyHeadline).toBe('Etapa 4 de 7 · Esperando aprobación');
    expect(view.diagnosis).toBe(PRIVATE_DIAGNOSIS);
    expect(view.cost).toBe('S/ 210.50');
    expect(view.timeline.slice(0, 2)).toEqual(['Esperando aprobación', 'En diagnóstico']);
  });

  test('[SC-04] ciclo completo: Solicitud recibida → … → Entregado; tras CADA una de las seis transiciones el cliente ve el estado y la línea de tiempo actualizados', async ({ page }) => {
    test.setTimeout(240_000);
    const order = await seed('SOLICITUD_RECIBIDA');
    await login(page);
    await open(page, order);

    // Diagnóstico y costo se registran entre la transición 2 y la 3 (con las operaciones separadas de este change).
    const steps: Array<{ label: string; headline: string; confirm: boolean; timelineTop: string; details: boolean }> = [
      { label: 'Equipo recibido', headline: 'Etapa 2 de 7 · Equipo recibido', confirm: false, timelineTop: 'Equipo recibido', details: false },
      { label: 'En diagnóstico', headline: 'Etapa 3 de 7 · En diagnóstico', confirm: false, timelineTop: 'En diagnóstico', details: false },
      { label: 'Esperando aprobación', headline: 'Etapa 4 de 7 · Esperando aprobación', confirm: true, timelineTop: 'Esperando aprobación', details: true },
      { label: 'En reparación', headline: 'Etapa 5 de 7 · En reparación', confirm: true, timelineTop: 'En reparación', details: true },
      { label: 'Listo para recojo', headline: 'Etapa 6 de 7 · Listo para recojo', confirm: false, timelineTop: 'Listo para recojo', details: true },
      { label: 'Entregado', headline: 'Etapa 7 de 7 · Entregado', confirm: true, timelineTop: 'Entregado', details: true },
    ];

    for (const [index, step] of steps.entries()) {
      if (step.label === 'Esperando aprobación') {
        await saveDiagnosis(page, PRIVATE_DIAGNOSIS);
        await expect(page.getByTestId('diagnosis-notice')).toBeVisible();
        await saveCost(page, '300');
        await expect(costField(page)).toHaveValue('300.00');
      }
      await advance(page, step.label).click();
      if (step.confirm) await dialog(page).getByRole('button', { name: `Avanzar a ${step.label}` }).click();
      await expect(page.getByTestId('journey-headline')).toHaveText(step.headline);

      const view = await publicConsult(page, order.code);
      expect(view.status, step.label).toBe(step.label);
      expect(view.journeyHeadline, step.label).toBe(step.headline);
      expect(view.timeline[0], step.label).toBe(step.timelineTop);
      expect(view.timeline.length, step.label).toBe(index + 2); // el evento inicial + una entrada por transición
      expect(view.hasDetails, step.label).toBe(step.details);
      if (step.details) {
        expect(view.cost, step.label).toBe('S/ 300.00');
        expect(view.diagnosis, step.label).toBe(PRIVATE_DIAGNOSIS);
      } else {
        expect(view.html, step.label).not.toMatch(/Placa madre|300\.00/);
      }
    }
    expect((await db.order(order.id)).status).toBe('ENTREGADO');
    await expect(page.getByTestId('lifecycle-actions')).toHaveCount(0);
    await expect(page.getByTestId('diagnosis-readonly-state')).toHaveText('Solo lectura');
  });
});
