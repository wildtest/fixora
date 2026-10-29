import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { expect, test, type Page, type Response } from '@playwright/test';

// E2E de la consulta pública (CHG-06): PUB-04 → PUB-05. Las órdenes se preparan con la conexión del propietario de
// la rama Neon `test` (datos ficticios, deliberadamente POBLADOS con datos privados) y la aplicación las consulta
// con el rol de aplicación. [SC-02] [SC-11] [SC-13] [E4] [E6] [E15]

const OWNER_URL = process.env.TEST_DIRECT_URL;
const ALPHABET = '23456789BDFGHJKMNPRSTWX';
const isMobile = (page: Page) => (page.viewportSize()?.width ?? 0) < 1024;

const randomCode = () => Array.from({ length: 12 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
const fakeIp = () => `198.51.100.${Math.floor(Math.random() * 250) + 1}-${Math.random().toString(36).slice(2, 8)}`;

async function withOwner<T>(work: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString: OWNER_URL });
  await client.connect();
  try {
    return await work(client);
  } finally {
    await client.end();
  }
}

const PRIVATE = {
  name: 'CANARY-NOMBRE Ana Quispe',
  phone: '+51 CANARY-TELEFONO 999',
  email: 'canary-correo@example.com',
  diagnosis: 'CANARY-DIAGNOSTICO pantalla',
  internalNote: 'CANARY-NOTA-INTERNA',
  publicNote: 'CANARY-NOTA-PUBLICA',
};

type Event = { from: string | null; to: string; at: string };

/** Crea una orden poblada con datos privados y devuelve su código. */
async function createOrder(status: string, events: Event[], model: string | null = 'A54'): Promise<string> {
  const code = randomCode();
  await withOwner(async (db) => {
    const id = randomUUID();
    await db.query(
      `INSERT INTO repair_orders (id, tracking_code, status, customer_name, customer_name_search, customer_phone, customer_email,
         device_type, brand, model, problem_description, diagnosis, estimated_cost, version, created_at, updated_at)
       VALUES ($1, $2, 'SOLICITUD_RECIBIDA', $3, 'canary', $4, $5, 'CELULAR', 'Samsung', $6, 'No enciende <b>nada</b>', NULL, NULL, 1, now(), now())`,
      [id, code, PRIVATE.name, PRIVATE.phone, PRIVATE.email, model],
    );
    await db.query('UPDATE repair_orders SET status = $2::order_status, diagnosis = $3, estimated_cost = 321.50, version = 9 WHERE id = $1', [id, status, PRIVATE.diagnosis]);
    for (const event of events) {
      await db.query(
        'INSERT INTO order_status_history (id, order_id, from_status, to_status, occurred_at) VALUES ($1, $2, $3::order_status, $4::order_status, $5::timestamptz)',
        [randomUUID(), id, event.from, event.to, event.at],
      );
    }
    await db.query(
      `INSERT INTO order_notes (id, order_id, visibility, content, version, created_at, updated_at)
       VALUES ($1, $3, 'INTERNAL', $4, 1, now(), now()), ($2, $3, 'PUBLIC', $5, 1, now(), now())`,
      [randomUUID(), randomUUID(), id, PRIVATE.internalNote, PRIVATE.publicNote],
    );
  });
  return code;
}

const FLOW: Event[] = [
  { from: null, to: 'SOLICITUD_RECIBIDA', at: '2026-10-20T15:05:00Z' },
  { from: 'SOLICITUD_RECIBIDA', to: 'EQUIPO_RECIBIDO', at: '2026-10-21T15:00:00Z' },
];

/** Cada prueba usa su propio origen: el limitador es por origen y la base de pruebas es compartida. */
async function isolate(page: Page) {
  await page.setExtraHTTPHeaders({ 'x-vercel-forwarded-for': fakeIp().slice(0, 40) });
}

async function consult(page: Page, input: string) {
  await page.getByLabel('Código de seguimiento').fill(input);
  await page.getByRole('button', { name: 'Consultar estado' }).click();
}

async function noHorizontalOverflow(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

test.skip(!OWNER_URL, 'requiere TEST_DIRECT_URL (rama Neon test)');

test.describe('PUB-04 formulario', () => {
  test('carga con campo, ayuda y orientación para un código perdido, sin recuperación pública', async ({ page }) => {
    await isolate(page);
    await page.goto('/consultar');
    await expect(page.getByRole('heading', { level: 1, name: 'Consultar reparación' })).toBeVisible();
    await expect(page.getByLabel('Código de seguimiento')).toBeVisible();
    await expect(page.getByText('No importa si escribes en mayúsculas o minúsculas.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Consultar estado' })).toBeEnabled();
    // Solo el código da acceso: no hay otros campos ni vía de recuperación.
    await expect(page.getByRole('main').locator('input')).toHaveCount(1);
    await expect(page.getByText(/Contacta al taller por un canal externo/)).toBeVisible();
    await expect(page.getByRole('link', { name: /recuperar|olvid/i })).toHaveCount(0);
    await expect(page.getByTestId('demo-notice')).toBeVisible();
    await noHorizontalOverflow(page);
  });
});

test.describe('el código no tiene otra vía de acceso', () => {
  test('no existe REST de consulta ni ruta con el código', async ({ request }) => {
    for (const path of ['/api/tracking', '/api/tracking/23456789BDFG', '/consultar/23456789BDFG', '/seguimiento/23456789BDFG', '/consultar?codigo=23456789BDFG']) {
      const response = await request.get(path);
      // La última es la misma página de consulta (la query se ignora): nunca resuelve una orden.
      if (path.includes('?')) {
        expect(await response.text()).not.toContain('Seguimiento de tu reparación');
      } else {
        expect(response.status(), path).toBe(404);
      }
    }
  });
});

test.describe('PUB-05 resultado', () => {
  test('[SC-02][E15] muestra la orden con el código en minúsculas y espacios; la URL queda limpia', async ({ page, context }) => {
    const code = await createOrder('EQUIPO_RECIBIDO', FLOW);
    await isolate(page);
    await page.goto('/consultar');
    await consult(page, `  ${code.toLowerCase()}  `);

    const result = page.getByTestId('tracking-result');
    await expect(result).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Seguimiento de tu reparación' })).toBeFocused();
    await expect(page.getByTestId('result-code')).toHaveText(code);
    await expect(page.getByTestId('status-badge')).toHaveText('Equipo recibido');
    await expect(result.getByText('Samsung')).toBeVisible();
    await expect(result.getByText('A54')).toBeVisible();
    await expect(page.getByTestId('result-description')).toHaveText('No enciende <b>nada</b>'); // texto literal
    await expect(page.getByTestId('journey-headline')).toHaveText('Etapa 2 de 7 · Equipo recibido');
    // Historial: más reciente primero y en hora de Perú.
    const timeline = page.getByTestId('status-timeline').getByRole('listitem');
    await expect(timeline).toHaveCount(2);
    await expect(timeline.nth(0)).toContainText('Equipo recibido');
    await expect(timeline.nth(0)).toContainText('21/10/2026 10:00');
    await expect(timeline.nth(1)).toContainText('Solicitud recibida');
    await expect(timeline.nth(1)).toContainText('20/10/2026 10:05');
    // [E6] Sin diagnóstico, costo ni notas públicas: vacío informativo, sin secciones rotas.
    await expect(page.getByTestId('more-info-empty')).toBeVisible();
    await expect(result.getByRole('button')).toHaveCount(1); // solo «Consultar otro código»: nada modifica datos

    // El código no está en la URL, ni en almacenamiento, ni en cookies.
    const url = new URL(page.url());
    expect(url.pathname).toBe('/consultar');
    expect(url.search + url.hash).toBe('');
    expect(page.url()).not.toContain(code);
    const storage = await page.evaluate(() => JSON.stringify({ l: { ...localStorage }, s: { ...sessionStorage } }));
    expect(storage).not.toContain(code);
    expect(JSON.stringify(await context.cookies())).not.toContain(code);
    await noHorizontalOverflow(page);
  });

  test('[SC-11] no filtra datos privados: ni en el DOM, ni en el HTML, ni en la respuesta de la acción', async ({ page }) => {
    const code = await createOrder('ESPERANDO_APROBACION', [
      ...FLOW,
      { from: 'EQUIPO_RECIBIDO', to: 'EN_DIAGNOSTICO', at: '2026-10-22T15:00:00Z' },
      { from: 'EN_DIAGNOSTICO', to: 'ESPERANDO_APROBACION', at: '2026-10-23T15:00:00Z' },
    ]);
    await isolate(page);
    const bodies: string[] = [];
    page.on('response', async (response: Response) => {
      if (response.request().method() === 'POST') bodies.push(await response.text().catch(() => ''));
    });
    await page.goto('/consultar');
    await consult(page, code);
    await expect(page.getByTestId('tracking-result')).toBeVisible();
    await expect(page.getByTestId('status-badge')).toHaveText('Esperando aprobación');

    const everything = [await page.content(), await page.locator('body').innerText(), ...bodies].join('\n');
    expect(bodies.length).toBeGreaterThan(0);
    for (const secret of ['CANARY-NOMBRE', 'Ana Quispe', 'CANARY-TELEFONO', 'canary-correo', 'CANARY-NOTA-INTERNA', 'CANARY-NOTA-PUBLICA']) {
      expect(everything, secret).not.toContain(secret);
    }
    // Desde Esperando aprobación el diagnóstico y el costo SÍ son públicos (CHG-11): solo sus valores vigentes.
    await expect(page.getByTestId('repair-details')).toBeVisible();
    await expect(page.getByTestId('public-cost')).toHaveText('S/ 321.50');
    await expect(page.getByTestId('public-diagnosis')).toHaveText('CANARY-DIAGNOSTICO pantalla');
    await expect(page.getByTestId('more-info-empty')).toHaveCount(0);
  });

  test('la respuesta de la consulta no se cachea y el resultado no es indexable', async ({ page }) => {
    const code = await createOrder('SOLICITUD_RECIBIDA', [FLOW[0]]);
    await isolate(page);
    const posts: Response[] = [];
    page.on('response', (response) => {
      if (response.request().method() === 'POST') posts.push(response);
    });
    await page.goto('/consultar');
    expect(await page.locator('meta[name="robots"]').getAttribute('content')).toContain('noindex');
    await consult(page, code);
    await expect(page.getByTestId('tracking-result')).toBeVisible();
    expect(posts.length).toBeGreaterThan(0);
    for (const post of posts) {
      const cacheControl = post.headers()['cache-control'] ?? '';
      expect(cacheControl).toMatch(/no-store|no-cache|private/);
      expect(cacheControl).not.toMatch(/public|s-maxage|max-age=[1-9]/);
    }
  });

  test('«Consultar otro código» reinicia el formulario', async ({ page }) => {
    const code = await createOrder('SOLICITUD_RECIBIDA', [FLOW[0]]);
    await isolate(page);
    await page.goto('/consultar');
    await consult(page, code);
    await page.getByRole('button', { name: 'Consultar otro código' }).click();
    await expect(page.getByLabel('Código de seguimiento')).toHaveValue('');
    await expect(page.getByLabel('Código de seguimiento')).toBeFocused();
    await expect(page.getByTestId('tracking-result')).toHaveCount(0);
  });
});

test.describe('Repair Journey por estado', () => {
  test('en curso: etapas previas completadas, la actual marcada y las siguientes pendientes', async ({ page }) => {
    const code = await createOrder('EN_REPARACION', [
      ...FLOW,
      { from: 'EQUIPO_RECIBIDO', to: 'EN_DIAGNOSTICO', at: '2026-10-22T15:00:00Z' },
      { from: 'EN_DIAGNOSTICO', to: 'ESPERANDO_APROBACION', at: '2026-10-23T15:00:00Z' },
      { from: 'ESPERANDO_APROBACION', to: 'EN_REPARACION', at: '2026-10-24T15:00:00Z' },
    ]);
    await isolate(page);
    await page.goto('/consultar');
    await consult(page, code);
    const stages = page.getByTestId('repair-journey').getByRole('listitem');
    await expect(stages).toHaveCount(7);
    await expect(stages.nth(0)).toHaveAttribute('data-state', 'completed');
    await expect(stages.nth(3)).toHaveAttribute('data-state', 'completed');
    await expect(stages.nth(4)).toHaveAttribute('data-state', 'current');
    await expect(stages.nth(4)).toHaveAttribute('aria-current', 'step');
    await expect(stages.nth(5)).toHaveAttribute('data-state', 'pending');
    await expect(stages.nth(4)).toContainText('En reparación');
    await expect(stages.nth(4)).toContainText('24/10/2026 10:00');
    await expect(stages.nth(5)).toContainText('—');
    await expect(page.getByTestId('journey-headline')).toHaveText('Etapa 5 de 7 · En reparación');
    await noHorizontalOverflow(page);
  });

  test('entregada: estado final', async ({ page }) => {
    const events: Event[] = [
      ...FLOW,
      { from: 'EQUIPO_RECIBIDO', to: 'EN_DIAGNOSTICO', at: '2026-10-22T15:00:00Z' },
      { from: 'EN_DIAGNOSTICO', to: 'ESPERANDO_APROBACION', at: '2026-10-23T15:00:00Z' },
      { from: 'ESPERANDO_APROBACION', to: 'EN_REPARACION', at: '2026-10-24T15:00:00Z' },
      { from: 'EN_REPARACION', to: 'LISTO_PARA_RECOJO', at: '2026-10-25T15:00:00Z' },
      { from: 'LISTO_PARA_RECOJO', to: 'ENTREGADO', at: '2026-10-26T15:00:00Z' },
    ];
    const code = await createOrder('ENTREGADO', events);
    await isolate(page);
    await page.goto('/consultar');
    await consult(page, code);
    const stages = page.getByTestId('repair-journey').getByRole('listitem');
    await expect(stages.nth(6)).toHaveAttribute('data-state', 'final');
    await expect(stages.nth(6)).toContainText('Estado final');
    await expect(page.getByTestId('status-timeline').getByRole('listitem').first()).toContainText('Entregado');
  });

  test('cancelada antes de Esperando aprobación: la rama sale de la etapa y no hay una octava etapa', async ({ page }) => {
    const code = await createOrder('CANCELADO', [...FLOW, { from: 'EQUIPO_RECIBIDO', to: 'CANCELADO', at: '2026-10-22T15:00:00Z' }]);
    await isolate(page);
    await page.goto('/consultar');
    await consult(page, code);
    await expect(page.getByTestId('status-badge')).toHaveText('Cancelado');
    const stages = page.getByTestId('repair-journey').getByRole('listitem');
    await expect(stages).toHaveCount(7);
    await expect(stages.nth(0)).toHaveAttribute('data-state', 'completed');
    await expect(stages.nth(1)).toHaveAttribute('data-state', 'cancelled-here');
    await expect(stages.nth(1)).toContainText('Cancelado en esta etapa');
    await expect(stages.nth(2)).toHaveAttribute('data-state', 'not-reached');
    await expect(page.getByTestId('journey-headline')).toHaveText('Cancelado desde «Equipo recibido»');
    await expect(page.getByText('Orden cancelada durante «Equipo recibido»')).toBeVisible();
    await expect(page.getByText('La orden está cerrada. Las etapas siguientes no se realizaron.')).toBeVisible();
    // Sin diagnóstico ni costo en ningún caso.
    expect(await page.locator('body').innerText()).not.toMatch(/CANARY|S\/\s?\d/);
  });
});

test.describe('[SC-13][E4] código no encontrado', () => {
  test('inexistente y mal formado muestran exactamente la misma respuesta, sin datos de ninguna orden', async ({ page }) => {
    const existing = await createOrder('SOLICITUD_RECIBIDA', [FLOW[0]]);
    await isolate(page);
    await page.goto('/consultar');
    const outcomes: string[] = [];
    for (const input of [randomCode(), 'esto-no-es-un-codigo', '', existing.slice(0, 11), `${existing}X`, existing.replace(existing[0], existing[0] === '2' ? '3' : '2')]) {
      await consult(page, input);
      const alert = page.getByRole('alert').filter({ hasText: 'No encontramos una reparación con ese código.' });
      await expect(alert).toBeVisible();
      await expect(alert).toContainText('Verifica el código e inténtalo nuevamente.');
      outcomes.push(await alert.innerText());
      await expect(page.getByTestId('tracking-result')).toHaveCount(0);
    }
    expect(new Set(outcomes).size).toBe(1);
    const text = await page.locator('body').innerText();
    for (const leak of ['Samsung', 'CANARY', 'casi', 'formato']) expect(text).not.toContain(leak);
  });
});

test.describe('protección contra abuso', () => {
  test('tras 10 fallos se bloquea el origen (RATE_LIMITED), incluso con un código válido, sin revelar nada', async ({ page }) => {
    test.setTimeout(90_000);
    const code = await createOrder('SOLICITUD_RECIBIDA', [FLOW[0]]);
    await isolate(page);
    await page.goto('/consultar');
    for (let i = 0; i < 10; i += 1) {
      await consult(page, randomCode());
      await expect(page.getByRole('alert').filter({ hasText: 'No encontramos una reparación' })).toBeVisible();
    }
    await consult(page, code); // válido, pero el origen está bloqueado
    const alert = page.getByRole('alert').filter({ hasText: 'Demasiados intentos' });
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('Inténtalo nuevamente más tarde.');
    await expect(page.getByTestId('tracking-result')).toHaveCount(0);
    await expect(page.getByText('No encontramos una reparación')).toHaveCount(0);
    await expect(page.getByText('Servicio no disponible')).toHaveCount(0);
  });

  test('si la protección no está disponible, falla cerrada: SERVICE_UNAVAILABLE distinto de RATE_LIMITED, sin mostrar la orden', async ({ page }) => {
    const code = await createOrder('SOLICITUD_RECIBIDA', [FLOW[0]]);
    await isolate(page);
    await page.goto('/consultar');
    await withOwner((db) => db.query('ALTER TABLE rate_limit_buckets RENAME TO rate_limit_buckets_off'));
    try {
      await consult(page, code);
      const alert = page.getByRole('alert').filter({ hasText: 'Servicio no disponible temporalmente' });
      await expect(alert).toBeVisible();
      await expect(alert).toContainText('Inténtalo nuevamente más tarde.');
      await expect(alert.getByRole('button', { name: 'Reintentar' })).toBeVisible();
      await expect(page.getByTestId('tracking-result')).toHaveCount(0);
      await expect(page.getByText('Demasiados intentos')).toHaveCount(0);
      await expect(page.getByText('No encontramos una reparación')).toHaveCount(0);
    } finally {
      await withOwner((db) => db.query('ALTER TABLE rate_limit_buckets_off RENAME TO rate_limit_buckets'));
    }
    // Restablecida la protección, «Reintentar» funciona.
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.getByTestId('tracking-result')).toBeVisible();
  });
});

test.describe('estado sensible y navegación', () => {
  test('navegar fuera y volver, o recargar, deja la consulta vacía y sin repetir la petición', async ({ page }) => {
    const code = await createOrder('SOLICITUD_RECIBIDA', [FLOW[0]]);
    await isolate(page);
    await page.goto('/consultar');
    await consult(page, code);
    await expect(page.getByTestId('tracking-result')).toBeVisible();

    await page.getByRole('link', { name: 'FIXORA, inicio' }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/consultar$/);
    await expect(page.getByLabel('Código de seguimiento')).toHaveValue('');
    await expect(page.getByTestId('tracking-result')).toHaveCount(0);
    expect(await page.locator('body').innerText()).not.toContain(code);

    // Recarga: formulario vacío y ninguna petición de consulta.
    await consult(page, code);
    await expect(page.getByTestId('tracking-result')).toBeVisible();
    const posts: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'POST') posts.push(request.url());
    });
    await page.reload();
    await expect(page.getByLabel('Código de seguimiento')).toHaveValue('');
    await expect(page.getByTestId('tracking-result')).toHaveCount(0);
    expect(posts).toEqual([]);
  });

  test('un código a medio escribir tampoco se restaura', async ({ page }) => {
    await isolate(page);
    await page.goto('/consultar');
    await page.getByLabel('Código de seguimiento').fill('ABC');
    await page.getByRole('link', { name: 'FIXORA, inicio' }).click();
    await expect(page).toHaveURL(/\/$/); // esperar a que la navegación termine antes de volver
    await page.goBack();
    await expect(page).toHaveURL(/\/consultar$/);
    await expect(page.getByLabel('Código de seguimiento')).toHaveValue('');
  });
});

test.describe('desde la confirmación del registro (PUB-03 → PUB-05)', () => {
  test('«Consultar estado» abre el seguimiento con el código en memoria, sin URL ni reescritura', async ({ page, context }) => {
    await isolate(page);
    await page.goto('/registrar');
    const name = `Flujo Completo ${Math.random().toString(36).slice(2, 8)}`;
    await page.getByLabel(/^Nombre del cliente/).fill(name);
    await page.getByLabel(/^Teléfono/).fill('987654321');
    await page.locator('label').filter({ hasText: 'Laptop' }).first().click();
    await page.getByLabel(/^Marca/).fill('Lenovo');
    await page.getByLabel(/^Descripción del problema/).fill('No enciende');
    await page.getByRole('button', { name: /^Registrar reparación/ }).click();
    const code = (await page.getByTestId('tracking-code').innerText()).trim();

    await page.getByRole('main').getByRole('button', { name: 'Consultar estado' }).click();
    await expect(page.getByTestId('tracking-result')).toBeVisible();
    await expect(page.getByTestId('result-code')).toHaveText(code);
    await expect(page.getByTestId('status-badge')).toHaveText('Solicitud recibida');
    await expect(page.getByTestId('journey-headline')).toHaveText('Etapa 1 de 7 · Solicitud recibida');
    await expect(page.getByTestId('status-timeline').getByRole('listitem')).toHaveCount(1);
    // El cliente ve su equipo y NO sus datos personales.
    expect(await page.locator('body').innerText()).not.toContain(name);
    expect(page.url()).not.toContain(code);
    expect(new URL(page.url()).pathname).toBe('/registrar');
    expect(JSON.stringify(await context.cookies())).not.toContain(code);
    expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain(code);
  });
});

test.describe('responsive', () => {
  test('formulario, resultado y recorrido sin desbordamiento horizontal; controles de 44 px en móvil', async ({ page }) => {
    const code = await createOrder('LISTO_PARA_RECOJO', [
      ...FLOW,
      { from: 'EQUIPO_RECIBIDO', to: 'EN_DIAGNOSTICO', at: '2026-10-22T15:00:00Z' },
      { from: 'EN_DIAGNOSTICO', to: 'ESPERANDO_APROBACION', at: '2026-10-23T15:00:00Z' },
      { from: 'ESPERANDO_APROBACION', to: 'EN_REPARACION', at: '2026-10-24T15:00:00Z' },
      { from: 'EN_REPARACION', to: 'LISTO_PARA_RECOJO', at: '2026-10-25T15:00:00Z' },
    ]);
    await isolate(page);
    await page.goto('/consultar');
    await noHorizontalOverflow(page);
    if (isMobile(page)) {
      expect((await page.getByLabel('Código de seguimiento').boundingBox())!.height).toBeGreaterThanOrEqual(44);
      expect((await page.getByRole('button', { name: 'Consultar estado' }).boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await consult(page, code);
    await expect(page.getByTestId('repair-journey')).toBeVisible();
    await noHorizontalOverflow(page);
    // Journey vertical en móvil (etapas apiladas) y horizontal en escritorio (etapas en la misma fila).
    const tops = await page.getByTestId('repair-journey').getByRole('listitem').evaluateAll((items) => items.map((li) => Math.round(li.getBoundingClientRect().top)));
    if (isMobile(page)) expect(new Set(tops).size).toBe(7);
    else expect(new Set(tops).size).toBe(1);
  });

  test('el teclado basta para consultar', async ({ page }) => {
    const code = await createOrder('SOLICITUD_RECIBIDA', [FLOW[0]]);
    await isolate(page);
    await page.goto('/consultar');
    await page.getByLabel('Código de seguimiento').focus();
    await page.keyboard.type(code.toLowerCase());
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('tracking-result')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Seguimiento de tu reparación' })).toBeFocused();
  });
});
