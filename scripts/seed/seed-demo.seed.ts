import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { registerRepair } from '../../src/application/register-repair';
import { issueAdminContext } from '../../src/application/admin/admin-context';
import { saveDiagnosis, saveEstimatedCost } from '../../src/application/admin/edit-diagnosis-cost';
import { createNote } from '../../src/application/admin/order-notes';
import { transitionOrder } from '../../src/application/admin/transition-order';
import { generateTrackingCode } from '../../src/domain/repair/tracking-code';
import type { OrderStatus } from '../../src/domain/repair/order-status';
import { createOrderEditStore } from '../../src/infrastructure/admin/order-edit-store';
import { createOrderNotesStore } from '../../src/infrastructure/admin/order-notes-store';
import { createOrderTransitionStore } from '../../src/infrastructure/admin/order-transition-store';
import { parseDatabaseUrl, requirePooled, requireVariable } from '../../src/infrastructure/config/database-url';
import { createPrismaClient } from '../../src/infrastructure/db/client';
import { createRegistrationStore } from '../../src/infrastructure/registration/registration-store';
import { newUuid, secureRandomBytes, sha256Hex } from '../../src/infrastructure/security/crypto';

// `seed:demo` (CHG-15 D10): conjunto PEQUEÑO de órdenes EXCLUSIVAMENTE FICTICIAS para la demostración, creado por los
// casos de uso y las reglas reales (registro público, transiciones, diagnóstico, costo y notas), con el rol de aplicación.
//   - NO es un fixture de pruebas: se ejecuta solo de forma explícita y está PROHIBIDO en la rama `test`.
//   - Exige confirmar el entorno (`SEED_DEMO_CONFIRM=DEVELOPMENT|PRODUCTION`) y muestra el destino con el endpoint oculto.
//   - Nunca se ejecuta en migraciones, build, arranque ni despliegues; no sobrescribe ni borra datos; se niega a cargarse dos
//     veces (si ya existe una orden DEMO).
//   - Sin credenciales, sin contraseña de administrador y sin códigos fijos: los códigos de seguimiento son los normales.
//     No se imprimen; con `SEED_DEMO_SMOKE_CODE_FILE=<ruta fuera del repositorio>` se escribe en ese archivo el código de la
//     orden elegida para el smoke (`SMOKE_TRACKING_CODE`), que se guarda como secreto de GitHub.
//   Uso:  SEED_DEMO_CONFIRM=DEVELOPMENT npm run seed:demo        (con DATABASE_URL del entorno de destino en `.env.local`)

const CONFIRM = process.env.SEED_DEMO_CONFIRM;
const ENABLED = CONFIRM === 'DEVELOPMENT' || CONFIRM === 'PRODUCTION';
const PREFIX = 'DEMO FIXORA';

type Spec = {
  readonly name: string;
  readonly phone: string;
  readonly deviceType: string;
  readonly brand: string;
  readonly model: string;
  readonly problem: string;
  readonly path: readonly OrderStatus[];
  readonly diagnosis?: string;
  readonly cost?: string;
  readonly publicNote?: string;
  readonly internalNote?: string;
};

const SPECS: readonly Spec[] = [
  { name: `${PREFIX} 1 Solicitud`, phone: '+51 900 000 001', deviceType: 'CELULAR', brand: 'MarcaDemo', model: 'D-1', problem: 'Orden de demostración: la pantalla no responde.', path: [] },
  {
    name: `${PREFIX} 2 Diagnóstico`,
    phone: '+51 900 000 002',
    deviceType: 'LAPTOP',
    brand: 'MarcaDemo',
    model: 'D-2',
    problem: 'Orden de demostración: no enciende.',
    path: ['EQUIPO_RECIBIDO', 'EN_DIAGNOSTICO'],
    internalNote: 'Nota interna de demostración: revisar la fuente de poder.',
  },
  {
    name: `${PREFIX} 3 Aprobación`,
    phone: '+51 900 000 003',
    deviceType: 'TABLET',
    brand: 'MarcaDemo',
    model: 'D-3',
    problem: 'Orden de demostración: la batería dura poco.',
    path: ['EQUIPO_RECIBIDO', 'EN_DIAGNOSTICO', 'ESPERANDO_APROBACION'],
    diagnosis: 'Diagnóstico de demostración: batería degradada; se recomienda reemplazarla.',
    cost: '120.00',
    publicNote: 'Nota pública de demostración: esperamos tu aprobación para continuar.',
  },
  {
    name: `${PREFIX} 4 Listo`,
    phone: '+51 900 000 004',
    deviceType: 'PC',
    brand: 'MarcaDemo',
    model: 'D-4',
    problem: 'Orden de demostración: se reinicia sola.',
    path: ['EQUIPO_RECIBIDO', 'EN_DIAGNOSTICO', 'ESPERANDO_APROBACION', 'EN_REPARACION', 'LISTO_PARA_RECOJO'],
    diagnosis: 'Diagnóstico de demostración: ventilador obstruido.',
    cost: '60.00',
    publicNote: 'Nota pública de demostración: tu equipo está listo para recojo.',
  },
];

describe.skipIf(!ENABLED)('seed:demo', () => {
  it('crea las órdenes ficticias de demostración mediante los casos de uso reales', async () => {
    const env = process.env;
    const databaseUrl = requireVariable(env, 'DATABASE_URL');
    const parsed = requirePooled('DATABASE_URL', databaseUrl);
    // Prohibido en `test`: ni la misma URL que la de pruebas.
    expect(env.TEST_DATABASE_URL === undefined || env.TEST_DATABASE_URL !== databaseUrl, 'seed:demo está prohibido en la rama test').toBe(true);
    const host = parseDatabaseUrl('DATABASE_URL', databaseUrl).host.replace(/^ep-[\w-]+/, 'ep-<ID>');
    process.stdout.write(`seed:demo → entorno ${CONFIRM}, destino ${host} / ${parsed.database}\n`);

    const prisma = createPrismaClient(databaseUrl);
    try {
      const existing = await prisma.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM "repair_orders" WHERE "customer_name" LIKE ${`${PREFIX}%`}`;
      expect(existing[0]?.n, 'ya existen órdenes DEMO: seed:demo no se carga dos veces').toBe(0);

      let clock = Date.now();
      const now = () => new Date((clock += 1000));
      const admin = issueAdminContext('seed-demo');
      const registration = createRegistrationStore(prisma);
      const transitionDeps = { store: createOrderTransitionStore(prisma), now };
      const editDeps = { store: createOrderEditStore(prisma), now };
      const notesDeps = { store: createOrderNotesStore(prisma), now };
      const codes: string[] = [];

      for (const spec of SPECS) {
        const registered = await registerRepair(
          {
            customerName: spec.name,
            customerPhone: spec.phone,
            customerEmail: '',
            deviceType: spec.deviceType,
            brand: spec.brand,
            model: spec.model,
            problemDescription: spec.problem,
          },
          newUuid(), // clave de idempotencia aleatoria: nunca predecible
          {
            register: (command) => registration.register(command),
            newOrderId: newUuid,
            newTrackingCode: () => generateTrackingCode(secureRandomBytes),
            hashKey: sha256Hex,
            now,
          },
        );
        expect(registered.ok).toBe(true);
        if (!registered.ok) return;
        const { trackingCode } = registered.data;
        codes.push(trackingCode);
        const rows = await prisma.$queryRaw<{ id: string; version: number }[]>`SELECT "id"::text AS "id", "version" FROM "repair_orders" WHERE "tracking_code" = ${trackingCode}`;
        const id = rows[0]!.id;
        let version = rows[0]!.version;

        for (const target of spec.path) {
          if (target === 'ESPERANDO_APROBACION') {
            const d = await saveDiagnosis(admin, { orderId: id, diagnosis: spec.diagnosis, expectedVersion: version }, editDeps);
            if (!d.ok) throw new Error(`diagnóstico: ${d.code}`);
            version = d.data.version;
            const c = await saveEstimatedCost(admin, { orderId: id, estimatedCost: spec.cost, expectedVersion: version }, editDeps);
            if (!c.ok) throw new Error(`costo: ${c.code}`);
            version = c.data.version;
          }
          const moved = await transitionOrder(admin, { orderId: id, targetStatus: target, expectedVersion: version, confirmed: true }, transitionDeps);
          if (!moved.ok) throw new Error(`transición a ${target}: ${moved.code}`);
          version = moved.data.version;
        }
        if (spec.publicNote) {
          const note = await createNote(admin, { orderId: id, visibility: 'PUBLIC', content: spec.publicNote }, notesDeps);
          if (!note.ok) throw new Error(`nota pública: ${note.code}`);
        }
        if (spec.internalNote) {
          const note = await createNote(admin, { orderId: id, visibility: 'INTERNAL', content: spec.internalNote }, notesDeps);
          if (!note.ok) throw new Error(`nota interna: ${note.code}`);
        }
      }

      process.stdout.write(`seed:demo → ${SPECS.length} órdenes ficticias creadas (los códigos no se imprimen).\n`);
      const file = env.SEED_DEMO_SMOKE_CODE_FILE;
      if (file) {
        // La orden elegida para el smoke: la de aprobación (muestra estado, Journey, diagnóstico, costo y nota pública).
        writeFileSync(file, `${codes[2]}\n`, { encoding: 'utf8', mode: 0o600 });
        process.stdout.write('seed:demo → el código para SMOKE_TRACKING_CODE se escribió en el archivo indicado.\n');
      }
    } finally {
      await prisma.$disconnect();
    }
  });
});
