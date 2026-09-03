import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NewsService } from './news.service';

@UseGuards(JwtAuthGuard)
@Controller('news')
export class NewsController {
  constructor(private readonly news: NewsService) {}

  /** 홈 화면 "오늘의 뉴스" 브리핑 */
  @Get('today')
  today() {
    return this.news.today();
  }

  /** 오늘자 브리핑을 지금 다시 생성 (매일 07:00 크론과 동일 동작, 수동 트리거) */
  @Post('refresh')
  refresh() {
    return this.news.generateForToday();
  }
}
