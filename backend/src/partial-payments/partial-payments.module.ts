import { Module } from '@nestjs/common';
import { PartialPaymentsController } from './partial-payments.controller';
import { PartialPaymentsService } from './partial-payments.service';

@Module({
  controllers: [PartialPaymentsController],
  providers: [PartialPaymentsService],
})
export class PartialPaymentsModule {}
