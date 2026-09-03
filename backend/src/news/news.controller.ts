import { Controller, Get, UseGuards } from '@nestjs/common';
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
}
