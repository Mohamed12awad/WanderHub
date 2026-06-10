import { Global, Module } from '@nestjs/common';
import { VisibilityService } from './visibility.service';
import { LinkedAccessService } from './linked-access.service';

@Global()
@Module({
  providers: [VisibilityService, LinkedAccessService],
  exports: [VisibilityService, LinkedAccessService],
})
export class VisibilityModule {}
