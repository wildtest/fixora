import 'server-only';
import { PrismaPg } from '@prisma/adapter-pg';
import { readDatabaseConfig } from '../config/capabilities';
import { PrismaClient } from './generated/client.ts';

// Cliente Prisma del runtime (CHG-02, D-2): adaptador `pg` sobre `DATABASE_URL` (rol de aplicación, conexión
// pooled), solo en Node.js. Los tipos de Prisma no salen de `infrastructure`. La conexión se crea de forma
// perezosa: importar este módulo nunca exige `DATABASE_URL`.

// Tamaño acotado del pool por instancia serverless (detalle de implementación, OQ-10).
const POOL_MAX = 5;

export function createPrismaClient(connectionString: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString, max: POOL_MAX }) });
}

const globalForPrisma = globalThis as unknown as { __fixoraPrisma?: PrismaClient };

// Instancia única del lado servidor, reutilizada entre invocaciones y recargas en desarrollo.
export function getPrisma(): PrismaClient {
  globalForPrisma.__fixoraPrisma ??= createPrismaClient(readDatabaseConfig().databaseUrl);
  return globalForPrisma.__fixoraPrisma;
}

export type { PrismaClient };
