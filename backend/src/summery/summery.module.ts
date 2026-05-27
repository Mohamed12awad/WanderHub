import { Module } from '@nestjs/common';
import { SummeryController } from './summery.controller';
import { SummeryService } from './summery.service';

@Module({
  controllers: [SummeryController],
  providers: [SummeryService],
})
export class SummeryModule {}
