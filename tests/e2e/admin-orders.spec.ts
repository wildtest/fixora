import { expect, test, type Page } from '@playwright/test';
import { cleanupSeeded, fakeIp, isMobile, login, noHorizontalOverflow, randomCode, seedOrder, uniqueTag, withOwner } from './support/admin-session';

// E2E del dashboard y el directorio administrativo (CHG-09a): ADM-02 y ADM-03, tramo «iniciar sesión → localizar la
// orden». Las órdenes son FICTICIAS y se aíslan por un fragmento único en el nombre (la base de pruebas es compartida).
// No se abre el detalle (CHG-09b). [SC-03 parcial] [E7] [E8] [E15]

test.afterEach(async () => {
  await cleanupSeeded();
});

const STATUS_LABELS: Record<string, string> = {
  SOLICITUD_RECIBIDA: 'Solicitud recibida',
  EQUIPO_RECIBIDO: 'Equipo recibido',
  EN_DIAGNOSTICO: 'En diagnóstico',
  ESPERANDO_APROBACION: 'Esperando aprobación',
  EN_REPARACION: 'En reparación',
  LISTO_PARA_RECOJO: 'Listo para recojo',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
};

// Con Cache Components la Activity conserva oculto el árbol de la ruta anterior: solo cuentan las filas visibles.
const rows = (page: Page) => page.getByTestId('order-row').filter({ visible: true });

// Cada interacción del directorio es una Server Action: se espera su respuesta y el fin del estado pendiente, para que
// ninguna aserción se cumpla por casualidad con el resultado ANTERIOR.
async function settled(page: Page, interaction: () => Promise<unknown>) {
  const response = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('/admin/ordenes'));
  await interaction();
  await response;
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
}

async function search(page: Page, text: string) {
  await page.getByLabel('Buscar por código o nombre').fill(text);
  await settled(page, () => page.getByRole('button', { name: 'Buscar' }).click());
}

async function chooseStatus(page: Page, status: string | null) {
  const label = status ? STATUS_LABELS[status]! : 'Todos';
  if (isMobile(page)) await settled(page, () => page.getByRole('combobox', { name: 'Filtrar por estado' }).selectOption({ label }));
  else await settled(page, () => page.getByRole('group', { name: 'Filtrar por estado' }).getByRole('button', { name: label, exact: true }).click());
}

async function openDirectory(page: Page) {
  await page.goto('/admin/ordenes');
  await expect(page.getByRole('heading', { level: 1, name: 'Listado de órdenes' })).toBeVisible();
}

test.describe('ADM-02 — Dashboard', () => {
  test('ocho estados con su conteo exacto, cinco recientes en orden y sin métricas ni detalle', async ({ page }) => {
    const tag = uniqueTag();
    await withOwner(async (db) => {
      for (let i = 0; i < 7; i += 1) {
        await seedOrder(db, { name: `${tag} Reciente ${i}`, status: i % 2 === 0 ? 'EN_REPARACION' : 'ENTREGADO', createdAt: new Date(Date.UTC(2099, 0, 1, 0, i + 1)) });
      }
    });
    await login(page);
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();

    const dbCounts = await withOwner(async (db) =>
      Object.fromEntries((await db.query('SELECT status::text AS status, count(*)::int AS total FROM repair_orders GROUP BY status')).rows.map((r) => [r.status, r.total])),
    );
    for (const [status, label] of Object.entries(STATUS_LABELS)) {
      const card = page.getByTestId(`status-card-${status}`);
      await expect(card).toBeVisible();
      await expect(card.getByTestId('status-badge')).toHaveText(label);
      await expect(card.getByTestId('status-count')).toHaveText(String(dbCounts[status] ?? 0));
      await expect(card.getByRole('link', { name: `Ver en el listado: ${label}` })).toHaveAttribute('href', `/admin/ordenes?estado=${status}`);
    }

    // Cinco recientes, la registrada más recientemente primero (las siete sembradas están en el futuro inmediato).
    const recent = page.getByRole('list', { name: 'Órdenes recientes' }).getByTestId('order-row');
    await expect(recent).toHaveCount(5);
    const customers = await recent.getByTestId('order-customer').allInnerTexts();
    expect(customers).toEqual([6, 5, 4, 3, 2].map((i) => `${tag} Reciente ${i}`));

    // Sin métricas, gráficos ni acciones de modificación; cada orden reciente ofrece un único enlace «Ver detalle» (CHG-09b).
    await expect(page.getByText(/tendencia|promedio|ingresos|gráfico/i)).toHaveCount(0);
    await expect(recent.first().getByRole('link', { name: /^Ver detalle de la orden/ })).toHaveAttribute('href', /^\/admin\/ordenes\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('button', { name: /ver detalle|editar|eliminar|crear|cambiar estado/i })).toHaveCount(0);
    await expect(recent.first().getByRole('link')).toHaveCount(1);
    await noHorizontalOverflow(page);
  });

  test('«Ver en el listado» abre el directorio ya filtrado por ese estado y «Ver todas» lo abre completo', async ({ page }) => {
    const tag = uniqueTag();
    await withOwner(async (db) => {
      await seedOrder(db, { name: `${tag} Uno`, status: 'LISTO_PARA_RECOJO' });
    });
    await login(page);
    await page.getByTestId('status-card-LISTO_PARA_RECOJO').getByRole('link').click();
    await expect(page).toHaveURL(/\/admin\/ordenes\?estado=LISTO_PARA_RECOJO$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Listado de órdenes' })).toBeVisible();
    if (isMobile(page)) await expect(page.getByRole('combobox', { name: 'Filtrar por estado' })).toHaveValue('LISTO_PARA_RECOJO');
    else await expect(page.getByRole('button', { name: 'Listo para recojo', exact: true })).toHaveAttribute('aria-pressed', 'true');
    const statuses = await rows(page).getByTestId('status-badge').allInnerTexts();
    expect(statuses.length).toBeGreaterThan(0);
    expect(new Set(statuses)).toEqual(new Set(['Listo para recojo']));

    await page.goBack();
    await page.getByRole('link', { name: 'Ver todas' }).click();
    await expect(page).toHaveURL(/\/admin\/ordenes$/);
  });

  test('la navegación del taller tiene Dashboard y Listado de órdenes, con la sección activa marcada', async ({ page }) => {
    await login(page);
    const nav = page.getByRole('navigation', { name: isMobile(page) ? 'Secciones del taller' : 'Navegación del taller' });
    await expect(nav.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
    await nav.getByRole('link', { name: 'Listado de órdenes' }).click();
    await expect(page).toHaveURL(/\/admin\/ordenes$/);
    await expect(nav.getByRole('link', { name: 'Listado de órdenes' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
  });
});

test.describe('ADM-03 — Directorio, búsqueda, filtro y paginación', () => {
  test('buscar por código (completo, minúsculas y espacios) y por nombre parcial sin tildes; el texto buscado nunca va en la URL', async ({ page }) => {
    const tag = uniqueTag();
    const code = randomCode();
    await withOwner(async (db) => {
      await seedOrder(db, { name: `${tag} Carlos Muñoz`, code, createdAt: new Date(Date.now() + 60_000) });
      await seedOrder(db, { name: `${tag} Otra Persona`, createdAt: new Date(Date.now() + 120_000) });
    });
    await login(page);
    await openDirectory(page);

    await search(page, `  ${code.toLowerCase()} `);
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first().getByTestId('order-code')).toHaveText(code);
    expect(page.url()).not.toContain(code);
    expect(page.url()).not.toContain(code.toLowerCase());

    await search(page, `${tag} carlos munoz`);
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first().getByTestId('order-customer')).toHaveText(`${tag} Carlos Muñoz`);
    expect(page.url()).not.toContain(tag);
    expect(new URL(page.url()).search).toBe('');
    await page.reload();
    await expect(page.getByLabel('Buscar por código o nombre')).toHaveValue(''); // la búsqueda no sobrevive en la URL

    // Un código parcial no es coincidencia de código.
    await search(page, code.slice(0, 8));
    await expect(page.getByText('No se encontraron órdenes con esa búsqueda o filtro.')).toBeVisible();
  });

  test('los comodines se buscan como texto literal', async ({ page }) => {
    const tag = uniqueTag();
    await withOwner(async (db) => {
      await seedOrder(db, { name: `${tag} 100% Ruiz`, createdAt: new Date(Date.now() + 60_000) });
      await seedOrder(db, { name: `${tag} Pedro Gomez`, createdAt: new Date(Date.now() + 120_000) });
    });
    await login(page);
    await openDirectory(page);
    await search(page, `${tag} 100%`);
    await expect(rows(page)).toHaveCount(1);
    await search(page, '% ruiz');
    await expect(rows(page)).toHaveCount(1); // '%' literal: solo coincide el nombre que lo contiene
    await expect(rows(page).first().getByTestId('order-customer')).toHaveText(`${tag} 100% Ruiz`);
    await search(page, `${tag} %`); // como comodín coincidiría con ambos nombres; como literal, con ninguno
    await expect(page.getByText('No se encontraron órdenes con esa búsqueda o filtro.')).toBeVisible();
  });

  test('filtro por estado, búsqueda + filtro y «Todos»', async ({ page }) => {
    const tag = uniqueTag();
    await withOwner(async (db) => {
      await seedOrder(db, { name: `${tag} Juan Perez`, status: 'EN_DIAGNOSTICO', createdAt: new Date(Date.now() + 60_000) });
      await seedOrder(db, { name: `${tag} Juan Soto`, status: 'ENTREGADO', createdAt: new Date(Date.now() + 120_000) });
      await seedOrder(db, { name: `${tag} Maria Luna`, status: 'EN_DIAGNOSTICO', createdAt: new Date(Date.now() + 180_000) });
    });
    await login(page);
    await openDirectory(page);
    await search(page, tag);
    await expect(rows(page)).toHaveCount(3);

    await chooseStatus(page, 'EN_DIAGNOSTICO');
    await expect(rows(page)).toHaveCount(2);
    expect(page.url()).toMatch(/\/admin\/ordenes\?estado=EN_DIAGNOSTICO$/); // solo el estado va en la URL

    await search(page, `${tag} juan`);
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first().getByTestId('order-customer')).toHaveText(`${tag} Juan Perez`);
    expect(page.url()).not.toContain(tag);

    await chooseStatus(page, null);
    await expect(rows(page)).toHaveCount(2); // «juan» sin filtro de estado
    expect(new URL(page.url()).search).toBe('');
  });

  test('paginación de 20 en 20 con total, volver a la primera página al cambiar el criterio', async ({ page }) => {
    const tag = uniqueTag();
    await withOwner(async (db) => {
      for (let i = 0; i < 25; i += 1) await seedOrder(db, { name: `${tag} Cliente ${String(i).padStart(2, '0')}`, createdAt: new Date(Date.now() + (i + 1) * 1000) });
    });
    await login(page);
    await openDirectory(page);
    await search(page, tag);
    await expect(rows(page)).toHaveCount(20);
    await expect(page.getByTestId('orders-total')).toHaveText('25 órdenes');
    await expect(page.getByTestId('orders-page')).toHaveText('Página 1 de 2');
    await expect(rows(page).first().getByTestId('order-customer')).toHaveText(`${tag} Cliente 24`);
    await expect(page.getByRole('button', { name: 'Anterior' })).toBeDisabled();

    await settled(page, () => page.getByRole('button', { name: 'Siguiente' }).click());
    await expect(page.getByTestId('orders-page')).toHaveText('Página 2 de 2');
    await expect(rows(page)).toHaveCount(5);
    await expect(page.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
    await noHorizontalOverflow(page);

    // Cambiar el criterio vuelve a la primera página.
    await search(page, `${tag} cliente 1`);
    await expect(page.getByTestId('orders-page')).toHaveCount(0); // 10 resultados: sin paginador
    await search(page, tag);
    await expect(page.getByTestId('orders-page')).toHaveText('Página 1 de 2');
  });

  test('sin resultados: estado vacío (no error) con «Limpiar búsqueda y filtros»; con una sola página no hay paginador', async ({ page }) => {
    await withOwner(async (db) => {
      await seedOrder(db, { name: `${uniqueTag()} Existe` }); // garantiza que el directorio no esté vacío tras limpiar
    });
    await login(page);
    await openDirectory(page);
    await search(page, `${uniqueTag()} nadie`);
    await expect(page.getByText('No se encontraron órdenes con esa búsqueda o filtro.')).toBeVisible();
    await expect(page.getByText('Verifica los términos o elige otro estado.')).toBeVisible();
    await expect(page.getByText(/ocurrió un problema/i)).toHaveCount(0);
    await expect(page.getByTestId('orders-page')).toHaveCount(0);
    await settled(page, () => page.getByRole('button', { name: 'Limpiar búsqueda y filtros' }).click());
    await expect(page.getByLabel('Buscar por código o nombre')).toHaveValue('');
    await expect(rows(page).first()).toBeVisible();
  });

  test('las filas muestran código, fecha en hora de Lima, cliente, equipo y estado; con un único enlace «Ver detalle», sin acciones de modificación; sin desbordamiento', async ({ page }) => {
    const tag = uniqueTag();
    await withOwner(async (db) => {
      await seedOrder(db, { name: `${tag} Fila Completa`, status: 'ESPERANDO_APROBACION', createdAt: new Date('2030-01-01T15:05:00.000Z'), brand: 'Lenovo' });
    });
    await login(page);
    await openDirectory(page);
    await search(page, tag);
    const row = rows(page).first();
    await expect(row.getByTestId('order-customer')).toHaveText(`${tag} Fila Completa`);
    await expect(row).toContainText('01/01/2030 10:05'); // 15:05 UTC = 10:05 en America/Lima
    await expect(row).toContainText('Laptop · Lenovo M1');
    await expect(row.getByTestId('status-badge')).toHaveText('Esperando aprobación');
    await expect(row.getByRole('link')).toHaveCount(1);
    await expect(row.getByRole('button')).toHaveCount(0);
    await expect(page.getByRole('main')).not.toContainText(/CANARY|canary/); // sin teléfono, correo, descripción ni diagnóstico
    await noHorizontalOverflow(page);
  });

  test('los datos de órdenes no se cachean de forma compartida', async ({ page }) => {
    await login(page);
    const response = await page.goto('/admin/ordenes');
    expect(response?.headers()['cache-control']).toMatch(/no-store|private/);
    const dashboard = await page.goto('/admin');
    expect(dashboard?.headers()['cache-control']).toMatch(/no-store|private/);
  });
});

test.describe('lecturas protegidas', () => {
  test('sin sesión no se entrega ningún dato: redirección al acceso para el panel y el directorio', async ({ request }) => {
    for (const path of ['/admin', '/admin/ordenes', '/admin/ordenes?estado=ENTREGADO']) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status(), path).toBe(307);
      expect(response.headers()['location'], path).toMatch(/\/admin\/acceso$/);
      expect(await response.text(), path).not.toMatch(/CANARY|Listado de órdenes|Órdenes recientes/);
    }
  });

  test('un estado inválido en la URL se ignora de forma segura y muestra todo', async ({ page }) => {
    await login(page);
    await page.goto('/admin/ordenes?estado=NO_EXISTE');
    await expect(page.getByRole('heading', { level: 1, name: 'Listado de órdenes' })).toBeVisible();
    await expect(page.getByText(/ocurrió un problema|error/i)).toHaveCount(0);
    if (isMobile(page)) await expect(page.getByRole('combobox', { name: 'Filtrar por estado' })).toHaveValue('');
    else await expect(page.getByRole('button', { name: 'Todos', exact: true })).toHaveAttribute('aria-pressed', 'true');
  });

  test('si la sesión se pierde durante la interacción, la búsqueda avisa que expiró y no entrega datos', async ({ page }) => {
    const tag = uniqueTag();
    await withOwner(async (db) => {
      await seedOrder(db, { name: `${tag} Privado` });
    });
    await login(page);
    await openDirectory(page);
    await withOwner((db) => db.query('DELETE FROM admin_sessions'));
    await search(page, tag);
    const alert = page.getByRole('alert').filter({ hasText: 'Tu sesión expiró' });
    await expect(alert).toBeVisible();
    await expect(alert.getByRole('link', { name: 'Ir al inicio de sesión' })).toHaveAttribute('href', '/admin/acceso');
    await expect(rows(page)).toHaveCount(0);
    await expect(page.getByText(`${tag} Privado`)).toHaveCount(0);
  });

  test('tras cerrar sesión, volver atrás no muestra el directorio', async ({ page }) => {
    const tag = uniqueTag();
    await withOwner(async (db) => {
      await seedOrder(db, { name: `${tag} Confidencial` });
    });
    await login(page);
    await openDirectory(page);
    await search(page, tag);
    await expect(rows(page)).toHaveCount(1);
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/admin\/acceso$/);
    await page.goBack();
    for (const wait of [0, 300, 1500]) {
      await page.waitForTimeout(wait);
      await expect(page.getByText(`${tag} Confidencial`).filter({ visible: true })).toHaveCount(0);
      await expect(rows(page).filter({ visible: true })).toHaveCount(0);
    }
    await expect(page).toHaveURL(/\/admin\/acceso/);
  });
});

test.describe('privacidad pública (SC-11)', () => {
  test('una orden poblada no filtra nada privado a la consulta pública con otro código', async ({ page }) => {
    const tag = uniqueTag();
    const code = randomCode();
    await withOwner(async (db) => {
      await seedOrder(db, { name: `${tag} Cliente Privado`, code });
    });
    await page.setExtraHTTPHeaders({ 'x-vercel-forwarded-for': fakeIp().slice(0, 40) });
    await page.goto('/consultar');
    await page.getByLabel('Código de seguimiento').fill(code);
    await page.getByRole('button', { name: 'Consultar estado' }).click();
    await expect(page.getByTestId('tracking-result')).toBeVisible();
    const html = await page.content();
    for (const secret of [tag, 'CANARY-TELEFONO', 'canary-correo', 'CANARY-DIAGNOSTICO', '150', 'Cliente Privado']) expect(html, secret).not.toContain(secret);
  });
});
