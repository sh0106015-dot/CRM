import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DailyNewsPayload, NewsIndex, NewsSection } from './news.types';

@Injectable()
export class NewsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 가장 최근 브리핑을 반환한다 (오늘 것이 없으면 직전 것). */
  async today(): Promise<DailyNewsPayload> {
    const row = await this.prisma.dailyNews.findFirst({
      orderBy: { date: 'desc' },
    });
    if (!row) {
      throw new NotFoundException('등록된 뉴스 브리핑이 없습니다.');
    }
    return {
      date: row.date.toISOString().slice(0, 10),
      quote: (row.quote as unknown as DailyNewsPayload['quote']) ?? null,
      indices: (row.indices as unknown as NewsIndex[]) ?? [],
      sections: (row.sections as unknown as NewsSection[]) ?? [],
    };
  }
}
