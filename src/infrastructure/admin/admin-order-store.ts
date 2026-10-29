import 'server-only';
import { isDeviceType } from '../../domain/repair/device-type';
import { isOrderStatus, type OrderStatus } from '../../domain/repair/order-status';
import type { AdminOrderListItem, OrderSearch } from '../../domain/admin/order-directory';
import { getPrisma } from '../db/client';
import { Prisma, type PrismaClient } from '../db/generated/client.ts';

// Repositorio administrativo de LECTURA de órdenes (CHG-09a D6). Funcional y específico: sin `GenericRepository`,
// sin tipos de Prisma hacia arriba y con proyección mínima. SELECCIONA solo las columnas del DTO de lista: no lee
// descripción, diagnóstico, costo, notas, historiales, teléfono, correo ni `version`.
//
// Búsqueda por nombre: SUBCADENA con `strpos(customer_name_search, texto) > 0`. A diferencia de `LIKE`, no tiene
// comodines: `%`, `_` y `\` del usuario son literales POR CONSTRUCCIÓN, sin depender de un escape. El texto llega ya
// normalizado con la primitiva compartida. Sin `$queryRawUnsafe`: todo va parametrizado.

export type OrderCriteria = {
  readonly search: OrderSearch;
  readonly status: OrderStatus | null;
};

export type AdminOrderStore = {
  /** Conteos agrupados por estado: solo devuelve los estados que existen. */
  countByStatus(): Promise<Record<string, number>>;
  /** Registradas más recientemente (`created_at DESC, id DESC`). */
  recent(limit: number): Promise<AdminOrderListItem[]>;
  /** Total del conjunto filtrado. */
  count(criteria: OrderCriteria): Promise<number>;
  /** Una página del conjunto filtrado, en orden estable `created_at DESC, id DESC`. */
  page(criteria: OrderCriteria, offset: number, limit: number): Promise<AdminOrderListItem[]>;
};

type Row = {
  id: string;
  tracking_code: string;
  customer_name: string;
  device_type: string;
  brand: string;
  model: string | null;
  status: string;
  created_at: Date;
};

function toItem(row: Row): AdminOrderListItem {
  if (!isOrderStatus(row.status) || !isDeviceType(row.device_type)) {
    throw new Error('Estado o tipo de equipo almacenado no válido.');
  }
  return {
    id: row.id,
    trackingCode: row.tracking_code,
    customerName: row.customer_name,
    device: { type: row.device_type, brand: row.brand, model: row.model },
    status: row.status,
    createdAt: row.created_at.toISOString(),
  };
}

function where({ search, status }: OrderCriteria): Prisma.Sql {
  const conditions: Prisma.Sql[] = [];
  if (search.kind === 'code') conditions.push(Prisma.sql`o."tracking_code" = ${search.trackingCode}`);
  if (search.kind === 'name') conditions.push(Prisma.sql`strpos(o."customer_name_search", ${search.normalizedName}) > 0`);
  if (status !== null) conditions.push(Prisma.sql`o."status" = ${status}::order_status`);
  return conditions.length > 0 ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}` : Prisma.empty;
}

const COLUMNS = Prisma.sql`o."id"::text AS "id", o."tracking_code", o."customer_name", o."device_type"::text AS "device_type",
  o."brand", o."model", o."status"::text AS "status", o."created_at"`;

export function createAdminOrderStore(prisma: Pick<PrismaClient, '$queryRaw'> = getPrisma()): AdminOrderStore {
  return {
    async countByStatus() {
      const rows = await prisma.$queryRaw<{ status: string; total: number }[]>`
        SELECT "status"::text AS "status", count(*)::int AS "total" FROM "repair_orders" GROUP BY "status"`;
      return Object.fromEntries(rows.map((row) => [row.status, row.total]));
    },

    async recent(limit) {
      const rows = await prisma.$queryRaw<Row[]>`
        SELECT ${COLUMNS} FROM "repair_orders" o ORDER BY o."created_at" DESC, o."id" DESC LIMIT ${limit}::int`;
      return rows.map(toItem);
    },

    async count(criteria) {
      const rows = await prisma.$queryRaw<{ total: number }[]>`
        SELECT count(*)::int AS "total" FROM "repair_orders" o ${where(criteria)}`;
      return rows[0]?.total ?? 0;
    },

    async page(criteria, offset, limit) {
      const rows = await prisma.$queryRaw<Row[]>`
        SELECT ${COLUMNS} FROM "repair_orders" o ${where(criteria)}
        ORDER BY o."created_at" DESC, o."id" DESC LIMIT ${limit}::int OFFSET ${offset}::int`;
      return rows.map(toItem);
    },
  };
}
