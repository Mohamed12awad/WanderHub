import { Module } from '@nestjs/common';
import { EmailsController } from './emails.controller';
import { TrackController } from './track.controller';
import { EmailsService } from './emails.service';

@Module({
  controllers: [EmailsController, TrackController],
  providers: [EmailsService],
})
export class EmailsModule {}
