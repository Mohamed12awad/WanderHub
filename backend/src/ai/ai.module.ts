import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiKeyService } from './ai-key.service';

@Module({
  controllers: [AiController],
  providers: [AiService, AiKeyService],
})
export class AiModule {}
