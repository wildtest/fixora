import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { cleanupSeeded, fakeIp, isMobile, login, noHorizontalOverflow, randomCode, seedOrder, uniqueTag, withOwner } from './support/admin-session';

// E2E del ciclo de vida de la reparación (CHG-10): acciones de ADM-04, diálogos E11, cancelación, terminalidad, vista
// desactualizada y reflejo público. Las órdenes son FICTICIAS; el diagnóstico y el costo se preparan con un fixture
// directo en PostgreSQL (no hay UI ni endpoint para escribirlos hasta CHG-11). [SC-05] [SC-06] [SC-09] [E9] [E11] [E13]

test.afterEach(async () => {
  await cleanupSeeded();
});

type Order = { id: string; code: string; tag: string };

async function seed(status: string, extra: { diagnosis?: string | null; cost?: number | null } = {}): Promise<Order> {
  const tag = uniqueTag();
  const id = randomUUID();
  const code = randomCode();
  const base = Date.UTC(2020, 6, 1, 12, 0); // en el pasado: los eventos reales de la prueba (ahora) quedan como los más recientes
  const path: Record<string, [string | null, string][]> = {
    SOLICITUD_RECIBIDA: [[null, 'SOLICITUD_RECIBIDA']],
    EQUIPO_RECIBIDO: [[null, 'SOLICITUD_RECIBIDA'], ['SOLICITUD_RECIBIDA', 'EQUIPO_RECIBIDO']],
    EN_DIAGNOSTICO: [[null, 'SOLICITUD_RECIBIDA'], ['SOLICITUD_RECIBIDA', 'EQUIPO_RECIBIDO'], ['EQUIPO_RECIBIDO', 'EN_DIAGNOSTICO']],
    ESPERANDO_APROBACION: [[null, 'SOLICITUD_RECIBIDA'], ['SOLICITUD_RECIBIDA', 'EQUIPO_RECIBIDO'], ['EQUIPO_RECIBIDO', 'EN_DIAGNOSTICO'], ['EN_DIAGNOSTICO', 'ESPERANDO_APROBACION']],
    LISTO_PARA_RECOJO: [
      [null, 'SOLICITUD_RECIBIDA'], ['SOLICITUD_RECIBIDA', 'EQUIPO_RECIBIDO'], ['EQUIPO_RECIBIDO', 'EN_DIAGNOSTICO'],
      ['EN_DIAGNOSTICO', 'ESPERANDO_APROBACION'], ['ESPERANDO_APROBACION', 'EN_REPARACION'], ['EN_REPARACION', 'LISTO_PARA_RECOJO'],
    ],
  };
  await withOwner(async (db) => {
    await seedOrder(db, {
      id,
      code,
      name: `${tag} Cliente Ciclo`,
      status,
      createdAt: new Date(base),
      diagnosis: extra.diagnosis,
      cost: extra.cost,
      history: (path[status] ?? [[null, 'SOLICITUD_RECIBIDA']]).map(([from, to], i) => ({ from, to, at: new Date(base + i * 60_000) })),
    });
  });
  return { id, code, tag };
}

const db = {
  state: (id: string) => withOwner(async (c) => (await c.query('SELECT status::text AS status, version FROM repair_orders WHERE id = $1', [id])).rows[0]!),
  events: (id: string) => withOwner(async (c) => (await c.query('SELECT from_status::text AS f, to_status::text AS t FROM order_status_history WHERE order_id = $1 ORDER BY occurred_at, id', [id])).rows),
};

const open = async (page: Page, order: Order) => {
  await page.goto(`/admin/ordenes/${order.id}`);
  await expect(page.getByTestId('order-detail')).toBeVisible();
};
const actions = (page: Page) => page.getByTestId('lifecycle-actions');
const advanceButton = (page: Page, label: string) => actions(page).getByRole('button', { name: `Avanzar a ${label}` });
const cancelButton = (page: Page) => actions(page).getByRole('button', { name: 'Cancelar orden' });
const dialog = (page: Page) => page.getByRole('dialog');

async function publicView(page: Page, code: string) {
  const context = await page.context().browser()!.newContext({ extraHTTPHeaders: { 'x-vercel-forwarded-for': fakeIp().slice(0, 40) } });
  const anonymous = await context.newPage();
  await anonymous.goto('/consultar');
  await anonymous.getByLabel('Código de seguimiento').fill(code);
  await anonymous.getByRole('button', { name: 'Consultar estado' }).click();
  await expect(anonymous.getByTestId('tracking-result')).toBeVisible();
  const status = await anonymous.getByTestId('tracking-result').getByTestId('status-badge').first().innerText();
  const html = await anonymous.content();
  await context.close();
  return { status, html };
}

test.describe('avances sin confirmación', () => {
  test('Solicitud recibida → Equipo recibido: se aplica sin diálogo y el detalle muestra estado, recorrido, historial y acciones del servidor', async ({ page }) => {
    const order = await seed('SOLICITUD_RECIBIDA');
    await login(page);
    await open(page, order);
    await expect(advanceButton(page, 'Equipo recibido')).toBeVisible();
    await expect(cancelButton(page)).toBeVisible();
    await expect(page.getByRole('combobox')).toHaveCount(0); // sin selector libre de estados
    const before = await db.state(order.id);

    await advanceButton(page, 'Equipo recibido').click();
    await expect(dialog(page)).toHaveCount(0); // este avance no pide confirmación
    await expect(actions(page).getByRole('status')).toContainText('Estado actualizado');
    await expect(page.getByTestId('journey-headline')).toHaveText('Etapa 2 de 7 · Equipo recibido');
    await expect(page.getByTestId('history-event').first().getByTestId('history-change')).toHaveText('Solicitud recibida → Equipo recibido');
    await expect(advanceButton(page, 'En diagnóstico')).toBeVisible(); // las acciones vigentes vienen del servidor
    expect(await db.state(order.id)).toEqual({ status: 'EQUIPO_RECIBIDO', version: before.version + 1 });
    expect(await db.events(order.id)).toHaveLength(2);

    // Reflejo público (sin datos administrativos).
    const view = await publicView(page, order.code);
    expect(view.status).toBe('Equipo recibido');
    for (const secret of [order.tag, 'CANARY-TELEFONO', 'canary-correo', 'CANARY-DIAGNOSTICO']) expect(view.html, secret).not.toContain(secret);
    await noHorizontalOverflow(page);
  });

  test('un envío repetido (doble clic) solo se aplica una vez', async ({ page }) => {
    const order = await seed('SOLICITUD_RECIBIDA');
    await login(page);
    await open(page, order);
    await advanceButton(page, 'Equipo recibido').dblclick();
    await expect(page.getByTestId('journey-headline')).toHaveText('Etapa 2 de 7 · Equipo recibido');
    expect(await db.events(order.id)).toHaveLength(2);
    expect((await db.state(order.id)).status).toBe('EQUIPO_RECIBIDO');
  });
});

test.describe('avance a Esperando aprobación', () => {
  test('sin diagnóstico y costo el avance aparece bloqueado con su motivo y no es alcanzable; la cancelación sigue disponible', async ({ page }) => {
    const order = await seed('EN_DIAGNOSTICO', { diagnosis: null, cost: null });
    await login(page);
    await open(page, order);
    const advance = advanceButton(page, 'Esperando aprobación');
    await expect(advance).toBeDisabled();
    await expect(page.getByTestId('advance-blocked')).toContainText('Faltan datos de la reparación');
    await advance.click({ force: true }).catch(() => undefined);
    await expect(dialog(page)).toHaveCount(0); // nunca se abre un diálogo vacío
    await expect(cancelButton(page)).toBeEnabled();
    expect((await db.state(order.id)).status).toBe('EN_DIAGNOSTICO');
    await expect(page.getByRole('main')).not.toContainText(/S\/ 0|CANARY-DIAGNOSTICO/);
  });

  test('con diagnóstico y costo (fixture): diálogo #1 normal con foco en la acción; confirmar aplica el cambio', async ({ page }) => {
    const order = await seed('EN_DIAGNOSTICO');
    await login(page);
    await open(page, order);
    const advance = advanceButton(page, 'Esperando aprobación');
    await expect(advance).toBeEnabled();
    await advance.click();
    await expect(dialog(page)).toBeVisible();
    await expect(dialog(page).getByTestId('confirm-chip')).toHaveText('En diagnóstico → Esperando aprobación');
    await expect(dialog(page).getByRole('heading', { name: '¿Publicar diagnóstico y costo estimado?' })).toBeVisible();
    await expect(dialog(page)).toContainText('Al confirmar quedarán congelados y disponibles para el cliente.');
    await expect(dialog(page)).toContainText('Después no podrán modificarse.');
    await expect(dialog(page).getByRole('button', { name: 'Avanzar a Esperando aprobación' })).toBeFocused(); // variante normal
    // CHG-11: el diálogo muestra el resumen real de lo que se publicará (diagnóstico y costo vigentes).
    await expect(dialog(page).getByTestId('summary-diagnosis')).toHaveText('CANARY-DIAGNOSTICO');
    await expect(dialog(page).getByTestId('summary-cost')).toHaveText('S/ 150.00');
    await dialog(page).getByRole('button', { name: 'Avanzar a Esperando aprobación' }).click();
    await expect(page.getByTestId('journey-headline')).toHaveText('Etapa 4 de 7 · Esperando aprobación');
    expect((await db.state(order.id)).status).toBe('ESPERANDO_APROBACION');
  });
});

test.describe('diálogos E11 irreversibles', () => {
  test('#2 Esperando aprobación → En reparación: advertencia, foco en «Volver», Escape no cambia nada y confirmar avanza sin opción de cancelar', async ({ page }) => {
    const order = await seed('ESPERANDO_APROBACION');
    await login(page);
    await open(page, order);
    await advanceButton(page, 'En reparación').click();
    const d = dialog(page);
    await expect(d.getByRole('heading', { name: '¿El cliente aprobó la reparación?' })).toBeVisible();
    await expect(d).toContainText('Confirma solo si el cliente aprobó fuera de FIXORA.');
    await expect(d).toContainText('No se puede deshacer.');
    await expect(d).toContainText('Desde este momento la reparación ya no podrá cancelarse.');
    await expect(d.getByRole('button', { name: 'Volver' })).toBeFocused(); // irreversible: foco inicial en «Volver»
    await page.keyboard.press('Escape'); // Escape equivale a Volver
    await expect(d).toHaveCount(0);
    expect((await db.state(order.id)).status).toBe('ESPERANDO_APROBACION');

    await advanceButton(page, 'En reparación').click();
    await dialog(page).getByRole('button', { name: 'Avanzar a En reparación' }).click();
    await expect(page.getByTestId('journey-headline')).toHaveText('Etapa 5 de 7 · En reparación');
    await expect(cancelButton(page)).toHaveCount(0); // ya no puede cancelarse
    await expect(advanceButton(page, 'Listo para recojo')).toBeVisible();
    expect((await db.state(order.id)).status).toBe('EN_REPARACION');
  });

  test('#3 cancelación: destructiva e irreversible, sin motivo ni notas falsas; deja la orden cerrada y sin acciones', async ({ page }) => {
    const order = await seed('EQUIPO_RECIBIDO');
    await login(page);
    await open(page, order);
    await cancelButton(page).click();
    const d = dialog(page);
    await expect(d).toHaveAttribute('data-variant', 'destructive');
    await expect(d.getByRole('heading', { name: `¿Cancelar la orden ${order.code}?` })).toBeVisible();
    await expect(d.getByTestId('confirm-chip')).toHaveText('Equipo recibido → Cancelado');
    await expect(d).toContainText('Acción irreversible.');
    await expect(d).toContainText('La orden quedará cerrada y no podrá reabrirse.');
    await expect(d).toContainText('Si quieres dejar una explicación pública o interna, regístrala antes de confirmar.'); // E14: nota opcional, sin campo en el diálogo
    await expect(d).not.toContainText(/motivo|Agregar nota/i);
    await expect(d.locator('textarea, input')).toHaveCount(0);
    await expect(d.getByRole('button', { name: 'Volver' })).toBeFocused();
    await d.getByRole('button', { name: 'Volver' }).click();
    expect((await db.state(order.id)).status).toBe('EQUIPO_RECIBIDO');

    await cancelButton(page).click();
    await dialog(page).getByRole('button', { name: 'Cancelar orden' }).click();
    await expect(page.getByTestId('repair-journey').locator('li[data-state="cancelled-here"]')).toHaveCount(1);
    await expect(page.getByTestId('status-badge').first()).toHaveText('Cancelado');
    await expect(actions(page)).toHaveCount(0); // estado final: sin acciones
    await expect(page.getByRole('main').getByRole('button')).toHaveCount(0);
    expect(await db.events(order.id)).toHaveLength(3); // 2 del recorrido sembrado + Cancelado
    expect((await db.state(order.id)).status).toBe('CANCELADO');
    expect((await publicView(page, order.code)).status).toBe('Cancelado');
  });

  test('#4 Listo para recojo → Entregado: orden cerrada y sin acciones', async ({ page }) => {
    const order = await seed('LISTO_PARA_RECOJO');
    await login(page);
    await open(page, order);
    await expect(cancelButton(page)).toHaveCount(0); // no se cancela desde Listo para recojo
    await advanceButton(page, 'Entregado').click();
    const d = dialog(page);
    await expect(d.getByRole('heading', { name: '¿Marcar como entregado?' })).toBeVisible();
    await expect(d).toContainText('La orden quedará cerrada y no podrá modificarse.');
    await expect(d.getByRole('button', { name: 'Volver' })).toBeFocused();
    await d.getByRole('button', { name: 'Avanzar a Entregado' }).click();
    await expect(page.getByTestId('journey-headline')).toHaveText('Etapa 7 de 7 · Entregado');
    await expect(actions(page)).toHaveCount(0);
    expect((await db.state(order.id)).status).toBe('ENTREGADO');
    expect((await publicView(page, order.code)).status).toBe('Entregado');
  });

  test('las órdenes Entregadas y Canceladas no ofrecen ninguna acción', async ({ page }) => {
    for (const status of ['ENTREGADO', 'CANCELADO']) {
      const tag = uniqueTag();
      const id = randomUUID();
      await withOwner(async (c) => {
        await seedOrder(c, { id, name: `${tag} Final`, status, createdAt: new Date(Date.UTC(2099, 7, 1)), history: [{ from: null, to: 'SOLICITUD_RECIBIDA', at: new Date(Date.UTC(2099, 7, 1)) }] });
      });
      if (page.url() === 'about:blank') await login(page);
      await page.goto(`/admin/ordenes/${id}`);
      await expect(page.getByTestId('order-detail')).toBeVisible();
      await expect(actions(page)).toHaveCount(0);
      await expect(page.getByRole('main').getByRole('button')).toHaveCount(0);
    }
  });
});

test.describe('vista desactualizada y sesión', () => {
  test('(E9) un avance sobre una pantalla desactualizada no se aplica, avisa y ofrece actualizar sin reintentar', async ({ page }) => {
    const order = await seed('SOLICITUD_RECIBIDA');
    await login(page);
    const stale = await page.context().newPage();
    await open(page, order);
    await stale.goto(`/admin/ordenes/${order.id}`);
    await expect(advanceButton(stale, 'Equipo recibido')).toBeVisible();

    await advanceButton(page, 'Equipo recibido').click(); // la primera pestaña avanza
    await expect(page.getByTestId('journey-headline')).toHaveText('Etapa 2 de 7 · Equipo recibido');

    await advanceButton(stale, 'Equipo recibido').click(); // la segunda pestaña tiene la versión anterior
    const alert = stale.getByRole('alert').filter({ hasText: 'La orden cambió desde que abriste esta pantalla' });
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('La acción no se ejecutó. Actualiza para ver la información vigente.');
    expect(await db.events(order.id)).toHaveLength(2); // un solo evento nuevo: no hubo reintento automático
    await alert.getByRole('button', { name: 'Actualizar orden' }).click();
    await expect(stale.getByTestId('journey-headline')).toHaveText('Etapa 2 de 7 · Equipo recibido');
    await expect(advanceButton(stale, 'En diagnóstico')).toBeVisible();
    await expect(stale.getByRole('alert').filter({ hasText: 'La orden cambió' })).toHaveCount(0);
  });

  test('(E11) una confirmación abierta sobre una versión anterior no se aplica: queda ligada a la versión revisada', async ({ page }) => {
    const order = await seed('EQUIPO_RECIBIDO');
    await login(page);
    const other = await page.context().newPage();
    await open(page, order);
    await other.goto(`/admin/ordenes/${order.id}`);

    await cancelButton(page).click(); // diálogo de cancelación abierto en la versión revisada
    await expect(dialog(page)).toBeVisible();

    await advanceButton(other, 'En diagnóstico').click(); // otra pestaña cambia la orden
    await expect(other.getByTestId('journey-headline')).toHaveText('Etapa 3 de 7 · En diagnóstico');

    await dialog(page).getByRole('button', { name: 'Cancelar orden' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'La orden cambió desde que abriste esta pantalla' })).toBeVisible();
    await expect(dialog(page)).toHaveCount(0);
    expect((await db.state(order.id)).status).toBe('EN_DIAGNOSTICO'); // la cancelación NO se aplicó
  });

  test('(SC-12/E10) si la sesión se pierde antes de confirmar, la acción no se ejecuta y se avisa que expiró', async ({ page }) => {
    const order = await seed('SOLICITUD_RECIBIDA');
    await login(page);
    await open(page, order);
    await withOwner((c) => c.query('DELETE FROM admin_sessions'));
    await advanceButton(page, 'Equipo recibido').click();
    const alert = page.getByRole('alert').filter({ hasText: 'Tu sesión expiró' });
    await expect(alert).toBeVisible();
    await expect(alert.getByRole('link', { name: 'Ir al inicio de sesión' })).toHaveAttribute('href', '/admin/acceso');
    expect((await db.state(order.id)).status).toBe('SOLICITUD_RECIBIDA');
    expect(await db.events(order.id)).toHaveLength(1);
  });
});

test.describe('diseño responsive', () => {
  test('móvil: el diálogo es una hoja inferior a ancho completo con la acción arriba; escritorio: modal centrado', async ({ page }) => {
    const order = await seed('EQUIPO_RECIBIDO');
    await login(page);
    await open(page, order);
    await cancelButton(page).click();
    const d = dialog(page);
    await expect(d).toBeVisible();
    const box = (await d.boundingBox())!;
    const viewport = page.viewportSize()!;
    const action = (await d.getByRole('button', { name: 'Cancelar orden' }).boundingBox())!;
    const back = (await d.getByRole('button', { name: 'Volver' }).boundingBox())!;
    if (isMobile(page)) {
      expect(box.width).toBeGreaterThanOrEqual(viewport.width - 1);
      expect(box.y + box.height).toBeGreaterThanOrEqual(viewport.height - 1); // anclado abajo
      expect(action.y).toBeLessThan(back.y); // la acción arriba, apilados
      expect(action.height).toBeGreaterThanOrEqual(44);
    } else {
      expect(box.width).toBeLessThanOrEqual(560);
      expect(action.x).toBeGreaterThan(back.x); // «Volver» a la izquierda, la acción a la derecha
    }
    await noHorizontalOverflow(page);
  });
});
