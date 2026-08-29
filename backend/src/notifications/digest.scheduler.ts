import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';

@Injectable()
export class DigestScheduler {
  private readonly logger = new Logger(DigestScheduler.name);
  private readonly enabled: boolean;

  constructor(
    private readonly notifications: NotificationsService,
    config: ConfigService,
  ) {
    // 기본 활성. DIGEST_CRON_ENABLED=false 로 끌 수 있다.
    this.enabled = config.get<string>('DIGEST_CRON_ENABLED', 'true') !== 'false';
  }

  /** 매일 오전 9시 (서버 타임존) */
  @Cron('0 9 * * *', { name: 'daily-digest' })
  async handleDailyDigest() {
    if (!this.enabled) return;
    this.logger.log('일일 다이제스트 스케줄 실행');
    await this.notifications.runDailyDigestForAll();
  }
}
