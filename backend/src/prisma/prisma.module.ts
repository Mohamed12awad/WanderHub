import {
  Global,
  Injectable,
  Module,
  OnModuleDestroy,
} from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaClient } from '@prisma/client';
import { PrismaService, createPrismaClient } from './prisma.service';
import { RequestContextService } from '../common/request-context.service';
import { RequestContextInterceptor } from '../common/request-context.interceptor';

/** Disconnects the (factory-provided) extended client on shutdown. */
@Injectable()
class PrismaConnectionManager implements OnModuleDestroy {
  constructor(private readonly prisma: PrismaService) {}
  async onModuleDestroy() {
    await (this.prisma as unknown as PrismaClient).$disconnect();
  }
}

@Global()
@Module({
  providers: [
    RequestContextService,
    {
      provide: PrismaService,
      useFactory: async (ctx: RequestContextService) => {
        const client = createPrismaClient(ctx);
        await client.$connect();
        return client;
      },
      inject: [RequestContextService],
    },
    PrismaConnectionManager,
    { provide: APP_INTERCEPTOR, useClass: RequestContextInterceptor },
  ],
  exports: [PrismaService, RequestContextService],
})
export class PrismaModule {}
