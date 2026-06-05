import { Module } from '@nestjs/common';
import { DedupController } from './dedup.controller';
import { DedupService } from './dedup.service';

@Module({
  controllers: [DedupController],
  providers: [DedupService],
})
export class DedupModule {}
