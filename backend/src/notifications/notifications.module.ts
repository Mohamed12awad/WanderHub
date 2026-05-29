import { Global, Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationDispatcher } from './notification-dispatcher';

@Global()
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationDispatcher],
  exports: [NotificationsService, NotificationDispatcher],
})
export class NotificationsModule {}
