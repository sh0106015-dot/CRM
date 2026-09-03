import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiModule } from '../ai/ai.module';
import { NewsController } from './news.controller';
import { NewsScheduler } from './news.scheduler';
import { NewsService } from './news.service';

@Module({
  imports: [ConfigModule, AiModule],
  controllers: [NewsController],
  providers: [NewsService, NewsScheduler],
})
export class NewsModule {}
