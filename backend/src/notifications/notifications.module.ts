import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiModule } from '../ai/ai.module';
import { DevicesService } from './devices.service';
import { DigestScheduler } from './digest.scheduler';
import { FcmService } from './fcm.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';

@Module({
  imports: [ConfigModule, AiModule],
  controllers: [NotificationsController],
  providers: [DevicesService, FcmService, PushService, NotificationsService, DigestScheduler],
  exports: [NotificationsService],
})
export class NotificationsModule {}
