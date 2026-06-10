import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { RequestContextService } from '../common/request-context.service';

/**
 * Models that carry an `updatedById` column and should be auto-stamped with the
 * current user on every write. Keep in sync with the schema (the `updatedBy`
 * relation). Stamping a model NOT in this set would set a non-existent column
 * and fail, so membership is deliberate.
 */
const STAMP_MODELS = new Set<string>([
  'Customer',
  'Deal',
  'Lead',
  'Product',
  'Quote',
  'Invoice',
  'SalesOrder',
  'ExpenseReport',
  'Activity',
  'Task',
  'Supplier',
  'PurchaseOrder',
  'VendorBill',
  'Project',
]);

/**
 * Base Prisma client. Connects through a Prisma 7 driver adapter.
 * The exported `PrismaService` token is provided as the *extended* client
 * (see prisma.module.ts), which transparently stamps `updatedById`.
 */
class BasePrismaClient extends PrismaClient {
  constructor() {
    super({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
  }
}

export function createPrismaClient(ctx: RequestContextService) {
  const base = new BasePrismaClient();
  return base.$extends({
    name: 'updatedByStamp',
    query: {
      $allModels: {
        update({ model, args, query }) {
          const uid = ctx.userId;
          if (uid && STAMP_MODELS.has(model)) {
            const d = args.data as Record<string, unknown>;
            if (d && d.updatedById === undefined) d.updatedById = uid;
          }
          return query(args);
        },
        updateMany({ model, args, query }) {
          const uid = ctx.userId;
          if (uid && STAMP_MODELS.has(model)) {
            const d = args.data as Record<string, unknown>;
            if (d && d.updatedById === undefined) d.updatedById = uid;
          }
          return query(args);
        },
        upsert({ model, args, query }) {
          const uid = ctx.userId;
          if (uid && STAMP_MODELS.has(model)) {
            const d = args.update as Record<string, unknown>;
            if (d && d.updatedById === undefined) d.updatedById = uid;
          }
          return query(args);
        },
      },
    },
  });
}

export type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

/**
 * DI token + type used throughout the app. At runtime the provider supplies the
 * extended client (createPrismaClient); this class declaration exists so existing
 * `private readonly prisma: PrismaService` injections keep their types.
 */
export class PrismaService extends BasePrismaClient {}
