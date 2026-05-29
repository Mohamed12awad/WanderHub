import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toClient } from '../common/serialize';

// Maps the frontend's coarse actionType buckets onto the human-readable
// action strings produced by the LoggingInterceptor. Mirrors the client-side
// actionType() helper in components/Logs/Logs.tsx.
const ACTION_PREFIXES: Record<string, string[]> = {
  create: ['Created', 'Recorded'],
  delete: ['Deleted', 'Removed'],
  auth: ['Logged', 'Authentication', 'Changed a password'],
};

@Injectable()
export class LogsService {
  private readonly logger = new Logger(LogsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persists an audit entry. Invoked fire-and-forget from the logging
   * interceptor, so it must never throw — a logging failure must not break
   * the request that triggered it.
   */
  async write(
    userId: string,
    action: string,
    method: string,
    endpoint: string,
    recordId?: string,
    recordName?: string,
    success = true,
  ): Promise<void> {
    try {
      await this.prisma.log.create({
        data: { userId, action, method, endpoint, recordId, recordName, success },
      });
    } catch (e) {
      this.logger.error(`Failed to write audit log: ${(e as Error).message}`);
    }
  }

  async findAll(query: Record<string, string>) {
    const { startDate, endDate, actionType, user } = query;
    const where: any = {};

    if (user) where.userId = user;

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) {
        const d = new Date(endDate);
        d.setHours(23, 59, 59, 999);
        where.timestamp.lte = d;
      }
    }

    if (actionType) {
      const prefixes = ACTION_PREFIXES[actionType];
      if (prefixes) {
        where.OR = prefixes.map((p) => ({
          action: { startsWith: p, mode: 'insensitive' },
        }));
      } else if (actionType === 'update') {
        // "update" is the catch-all bucket: anything that isn't create/delete/auth.
        const others = [
          ...ACTION_PREFIXES.create,
          ...ACTION_PREFIXES.delete,
          ...ACTION_PREFIXES.auth,
        ];
        where.NOT = others.map((p) => ({
          action: { startsWith: p, mode: 'insensitive' },
        }));
      }
    }

    const include = {
      user: { select: { id: true, name: true, email: true } },
    };

    const p = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, parseInt(query.limit) || 50);

    const [data, total] = await Promise.all([
      this.prisma.log.findMany({
        where,
        include,
        orderBy: { timestamp: 'desc' },
        skip: (p - 1) * limit,
        take: limit,
      }),
      this.prisma.log.count({ where }),
    ]);

    return { data: toClient(data), total, page: p, pages: Math.ceil(total / limit) };
  }
}
