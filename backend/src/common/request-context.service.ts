import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

interface RequestStore {
  userId?: string;
}

/**
 * Request-scoped store backed by AsyncLocalStorage. Lets infrastructure (e.g. the
 * Prisma `updatedBy` stamping extension) read the current authenticated user
 * without threading `userId` through every service/controller signature.
 */
@Injectable()
export class RequestContextService {
  private readonly als = new AsyncLocalStorage<RequestStore>();

  /** Bind a store to the current async execution (called once per request). */
  enter(store: RequestStore): void {
    this.als.enterWith(store);
  }

  get userId(): string | undefined {
    return this.als.getStore()?.userId;
  }
}
