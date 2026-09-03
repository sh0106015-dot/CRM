import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { NewsService } from './news.service';

@Injectable()
export class NewsScheduler {
  private readonly logger = new Logger(NewsScheduler.name);
  private readonly enabled: boolean;

  constructor(
    private readonly news: NewsService,
    config: ConfigService,
  ) {
    this.enabled = config.get<string>('NEWS_CRON_ENABLED', 'true') !== 'false';
  }

  /** 매일 오전 7시 (서버 타임존) - 오늘의 뉴스 브리핑 생성 */
  @Cron('0 7 * * *', { name: 'daily-news' })
  async handleDailyNews() {
    if (!this.enabled) return;
    this.logger.log('오늘의 뉴스 생성 스케줄 실행');
    await this.news.generateForToday();
  }
}
