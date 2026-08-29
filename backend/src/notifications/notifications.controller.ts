import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DevicesService } from './devices.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { NotificationsService } from './notifications.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class NotificationsController {
  constructor(
    private readonly devices: DevicesService,
    private readonly notifications: NotificationsService,
  ) {}

  /** 푸시 토큰 등록 (앱 시작 시) */
  @Post('devices')
  register(
    @CurrentUser('userId') userId: string,
    @Body() dto: RegisterDeviceDto,
  ) {
    return this.devices.register(userId, dto.token, dto.platform);
  }

  /** 푸시 토큰 해제 (로그아웃 시) */
  @Delete('devices/:token')
  unregister(
    @CurrentUser('userId') userId: string,
    @Param('token') token: string,
  ) {
    return this.devices.unregister(userId, token);
  }

  /** 지금 바로 나에게 다이제스트 발송 (테스트/수동 트리거) */
  @Post('notifications/daily-digest/run')
  runDigest(@CurrentUser('userId') userId: string) {
    return this.notifications.dailyDigestForUser(userId);
  }
}
