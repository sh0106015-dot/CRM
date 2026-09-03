import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { LlmClient } from '../ai/llm.client';
import { PrismaService } from '../prisma/prisma.service';
import { DailyNewsPayload, NewsIndex, NewsSection } from './news.types';

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmClient,
  ) {}

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

  /**
   * 오늘자 브리핑을 AI + 웹 검색으로 생성해 upsert 한다. (매일 07:00 크론 + 수동 트리거)
   * AI 미구성 시 no-op (직전 브리핑이 계속 제공됨).
   *
   * Claude 의 web_search 도구로 실제 오늘자 뉴스와 지수/환율/유가를 조회한다.
   * (계정에 웹 검색이 비활성이면 조회 없이 생성되며 정확도가 떨어질 수 있다.)
   */
  async generateForToday(): Promise<{
    generated: boolean;
    date?: string;
    sections?: number;
    reason?: string;
  }> {
    if (!this.llm.enabled) {
      this.logger.warn('AI 미구성 - 뉴스 자동 생성을 건너뜁니다.');
      return { generated: false, reason: 'AI 미구성' };
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    let payload: DailyNewsPayload | null = null;
    try {
      payload = await this.llm.completeJson<DailyNewsPayload>({
        webSearch: true,
        maxSearches: 6,
        system:
          '당신은 한국의 아침 뉴스 브리핑을 작성한다. 주요 독자는 보험설계사이며 ' +
          '경제/증권/부동산/산업/생활 소식과 보험 관련 소식을 중심으로 정리한다. ' +
          'web_search 도구로 실제 오늘자 뉴스를 확인한 뒤 사실만 간결히 정리한다. ' +
          '각 항목은 한 문단, 추측·과장 금지.',
        user: [
          `오늘은 ${dateStr} 이다. web_search 로 다음을 조회해 아침 뉴스 브리핑을 만들어라.`,
          '- 오늘 대한민국 주요 뉴스 (경제/사회/산업)',
          '- 코스피·코스닥 지수 최근 종가',
          '- 원/달러 환율, 원/100엔 환율',
          '- 전국 평균 휘발유·경유 가격 (원/리터)',
          '- 오늘 보험 업계 뉴스',
          '- 오늘 국제/글로벌 경제 뉴스',
          '',
          'JSON 스키마:',
          '{',
          '  "quote": { "text": string, "author": string },   // 짧은 인용구 1개 (없으면 생략)',
          '  "indices": [ { "label": string, "unit"?: string, "value": string } ],',
          '     // 순서: 코스피 지수, 코스닥 지수, 미국(원/달러), 일본(원/100엔), 휘발유(원/리터당), 경유(원/리터당)',
          '  "sections": [ { "title": string, "items": [ { "title": string, "body": string } ] } ]',
          '     // 섹션: "주요 뉴스"(4~5), "보험관련 소식"(2~3), "국제/글로벌경제 소식"(2),',
          '     //       "기업/사회/연예/스포츠 등 기타"(2), "시사상식"(1)',
          '}',
        ].join('\n'),
        maxTokens: 3000,
      });
    } catch (err) {
      this.logger.error(`뉴스 생성 실패: ${String(err)}`);
      return { generated: false, reason: '생성 오류' };
    }

    if (!payload?.sections?.length) {
      return { generated: false, reason: '생성 결과 없음' };
    }

    const date = new Date(dateStr);
    const data = {
      quote: (payload.quote ?? undefined) as object | undefined,
      indices: (payload.indices ?? []) as unknown as object,
      sections: payload.sections as unknown as object,
    };
    await this.prisma.dailyNews.upsert({
      where: { date },
      create: { date, ...data },
      update: data,
    });
    this.logger.log(`오늘의 뉴스 생성 완료 (${dateStr}, ${payload.sections.length}개 섹션)`);
    return { generated: true, date: dateStr, sections: payload.sections.length };
  }
}
