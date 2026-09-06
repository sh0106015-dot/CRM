import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  Consultation,
  Customer,
  CustomerTag,
  RecommendationPriority,
  Schedule,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateMessageDto } from './dto/generate-message.dto';
import { LlmClient } from './llm.client';
import { computeManagementScore } from './scoring';

const DAY = 24 * 60 * 60 * 1000;

type CustomerContext = Customer & {
  tags: CustomerTag[];
  consultations: Consultation[];
  schedules: Schedule[];
};

export interface ConsultationSummary {
  summary: string;
  keyPoints: string[];
  nextAction?: string;
  nextContactDate?: string; // YYYY-MM-DD
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmClient,
  ) {}

  // -------------------------------------------------------------------------
  // PRD 9 / 15 - AI 고객분석 + 관리 점수
  // -------------------------------------------------------------------------
  async analyzeCustomer(userId: string, customerId: string) {
    const customer = await this.loadContext(userId, customerId);
    const scoring = computeManagementScore({
      customer,
      consultations: customer.consultations,
      schedules: customer.schedules,
    });

    let reason = scoring.factors.join(' ');
    let recommendation = this.fallbackRecommendation(customer, scoring.priority);
    let recommendedChannel = this.fallbackChannel(customer);
    let recommendedAt = this.fallbackTiming(scoring.priority);

    if (this.llm.enabled) {
      try {
        const parsed = await this.llm.completeJson<{
          reason: string;
          recommendation: string;
          recommendedChannel: string;
          recommendedInDays: number;
        }>({
          system:
            '당신은 보험설계사를 돕는 고객관리 어시스턴트입니다. 상품 가입 가능성이나 보장 적정성은 판단하지 않고, 관리 우선순위와 다음 행동만 제안합니다.',
          user: [
            `다음 고객의 관리 방향을 제안하세요. 규칙 기반 관리점수는 ${scoring.score}/100 (${scoring.priority}) 입니다.`,
            this.profileForPrompt(customer),
            '',
            'JSON 스키마: {"reason": string(2문장 이내), "recommendation": string(1~2문장 행동 제안), "recommendedChannel": string(예: "문자 → 전화 상담"), "recommendedInDays": number(며칠 안에 연락할지)}',
          ].join('\n'),
          maxTokens: 700,
        });
        if (parsed) {
          reason = parsed.reason?.trim() || reason;
          recommendation = parsed.recommendation?.trim() || recommendation;
          recommendedChannel =
            parsed.recommendedChannel?.trim() || recommendedChannel;
          if (Number.isFinite(parsed.recommendedInDays)) {
            recommendedAt = new Date(
              Date.now() + parsed.recommendedInDays * DAY,
            );
          }
        }
      } catch (err) {
        this.logger.warn(`analyzeCustomer LLM 실패, 폴백 사용: ${String(err)}`);
      }
    }

    const saved = await this.prisma.aiRecommendation.upsert({
      where: { customerId },
      create: {
        customerId,
        score: scoring.score,
        priority: scoring.priority,
        reason,
        recommendation,
        recommendedChannel,
        recommendedAt,
      },
      update: {
        score: scoring.score,
        priority: scoring.priority,
        reason,
        recommendation,
        recommendedChannel,
        recommendedAt,
      },
    });

    return { ...saved, factors: scoring.factors };
  }

  // -------------------------------------------------------------------------
  // PRD 10 - AI 다음 행동 추천
  // -------------------------------------------------------------------------
  async nextActions(userId: string, customerId: string): Promise<string[]> {
    const customer = await this.loadContext(userId, customerId);
    const scoring = computeManagementScore({
      customer,
      consultations: customer.consultations,
      schedules: customer.schedules,
    });

    if (this.llm.enabled) {
      try {
        const parsed = await this.llm.completeJson<{ steps: string[] }>({
          system:
            '당신은 보험설계사를 돕는 고객관리 어시스턴트입니다. 실행 가능한 행동 단계만 제시합니다.',
          user: [
            `이 고객에게 취할 행동을 2~4단계로 제안하세요. 관리점수 ${scoring.score}/100.`,
            this.profileForPrompt(customer),
            '',
            'JSON 스키마: {"steps": string[]}  (각 단계는 "오늘 문자 발송" 처럼 짧게)',
          ].join('\n'),
          maxTokens: 500,
        });
        if (parsed?.steps?.length) {
          return parsed.steps.map((s) => s.trim()).filter(Boolean);
        }
      } catch (err) {
        this.logger.warn(`nextActions LLM 실패, 폴백 사용: ${String(err)}`);
      }
    }

    return this.fallbackNextActions(customer, scoring.priority);
  }

  // -------------------------------------------------------------------------
  // PRD 11 - AI 문자 생성
  // -------------------------------------------------------------------------
  async generateMessage(
    userId: string,
    customerId: string,
    dto: GenerateMessageDto,
  ) {
    const customer = await this.loadContext(userId, customerId);
    const tone = dto.tone ?? '정중하게';

    let content = this.fallbackMessage(customer, dto.purpose, tone);

    if (this.llm.enabled) {
      try {
        const text = await this.llm.complete({
          system:
            '당신은 보험설계사가 고객에게 보낼 문자를 대신 작성합니다. 2~4문장, 이모지 없이, 과장/압박 없는 표현을 사용합니다. 고객 이름은 "○○님" 형식으로 부릅니다.',
          user: [
            `목적: ${dto.purpose}`,
            `말투: ${tone}`,
            dto.context ? `상황: ${dto.context}` : '',
            this.profileForPrompt(customer),
            '',
            '문자 본문만 출력하세요.',
          ]
            .filter(Boolean)
            .join('\n'),
          maxTokens: 400,
        });
        if (text) content = text;
      } catch (err) {
        this.logger.warn(`generateMessage LLM 실패, 폴백 사용: ${String(err)}`);
      }
    }

    return this.prisma.aiGeneratedMessage.create({
      data: { customerId, purpose: dto.purpose, tone, content },
    });
  }

  // -------------------------------------------------------------------------
  // PRD 13 - AI 상담 요약
  // -------------------------------------------------------------------------
  async summarizeConsultation(content: string): Promise<ConsultationSummary> {
    if (this.llm.enabled) {
      try {
        const parsed = await this.llm.completeJson<ConsultationSummary>({
          system:
            '당신은 상담 기록을 요약하는 어시스턴트입니다. 사실만 간결하게 정리합니다.',
          user: [
            '다음 상담 내용을 요약하세요.',
            '---',
            content,
            '---',
            'JSON 스키마: {"summary": string(1~2문장), "keyPoints": string[](3개 이내), "nextAction": string, "nextContactDate": string(YYYY-MM-DD, 불명확하면 생략)}',
          ].join('\n'),
          maxTokens: 500,
        });
        if (parsed?.summary) {
          return {
            summary: parsed.summary.trim(),
            keyPoints: parsed.keyPoints ?? [],
            nextAction: parsed.nextAction?.trim(),
            nextContactDate: parsed.nextContactDate,
          };
        }
      } catch (err) {
        this.logger.warn(
          `summarizeConsultation LLM 실패, 폴백 사용: ${String(err)}`,
        );
      }
    }

    const firstLine = content.split(/[\n.]/).map((s) => s.trim()).filter(Boolean);
    return {
      summary: firstLine.slice(0, 2).join('. '),
      keyPoints: firstLine.slice(0, 3),
    };
  }

  // -------------------------------------------------------------------------
  // PRD 6-1 / 15 - 전체 고객 관리점수 재계산 + 대시보드
  // -------------------------------------------------------------------------
  async recomputeAll(userId: string) {
    const customers = await this.prisma.customer.findMany({
      where: { userId },
      include: {
        tags: true,
        consultations: { orderBy: { consultationDate: 'desc' }, take: 30 },
        schedules: {
          where: { status: 'PENDING' },
          orderBy: { scheduleDate: 'asc' },
        },
      },
    });

    let updated = 0;
    for (const customer of customers) {
      const scoring = computeManagementScore({
        customer,
        consultations: customer.consultations,
        schedules: customer.schedules,
      });
      await this.prisma.aiRecommendation.upsert({
        where: { customerId: customer.id },
        create: {
          customerId: customer.id,
          score: scoring.score,
          priority: scoring.priority,
          reason: scoring.factors.join(' '),
          recommendation: this.fallbackRecommendation(
            customer,
            scoring.priority,
          ),
          recommendedChannel: this.fallbackChannel(customer),
          recommendedAt: this.fallbackTiming(scoring.priority),
        },
        update: {
          score: scoring.score,
          priority: scoring.priority,
          reason: scoring.factors.join(' '),
        },
      });
      updated += 1;
    }
    return { updated };
  }

  async dashboard(userId: string) {
    await this.recomputeAll(userId);
    const recs = await this.prisma.aiRecommendation.findMany({
      where: { customer: { userId } },
      orderBy: { score: 'desc' },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            interests: true,
            lastContactAt: true,
          },
        },
      },
    });

    const group = (p: RecommendationPriority) =>
      recs.filter((r) => r.priority === p);

    return {
      counts: {
        IMMEDIATE: group('IMMEDIATE').length,
        TODAY: group('TODAY').length,
        THIS_WEEK: group('THIS_WEEK').length,
        NORMAL: group('NORMAL').length,
      },
      needsCareToday: [...group('IMMEDIATE'), ...group('TODAY')].map((r) => ({
        customerId: r.customerId,
        name: r.customer.name,
        score: r.score,
        priority: r.priority,
        reason: r.reason,
        recommendation: r.recommendation,
        recommendedChannel: r.recommendedChannel,
        interests: r.customer.interests,
        lastContactAt: r.customer.lastContactAt,
      })),
    };
  }

  // -------------------------------------------------------------------------
  // PRD 18 - AI 주간 리포트
  // -------------------------------------------------------------------------
  async weeklyReport(userId: string) {
    const weekAgo = new Date(Date.now() - 7 * DAY);
    const [total, newCustomers, consulted, longUnmanaged] = await Promise.all([
      this.prisma.customer.count({ where: { userId } }),
      this.prisma.customer.count({
        where: { userId, createdAt: { gte: weekAgo } },
      }),
      this.prisma.consultation.count({
        where: {
          consultationDate: { gte: weekAgo },
          customer: { userId },
        },
      }),
      this.prisma.customer.count({
        where: {
          userId,
          OR: [
            { lastContactAt: null },
            { lastContactAt: { lt: new Date(Date.now() - 60 * DAY) } },
          ],
        },
      }),
    ]);

    const stats = { total, newCustomers, consulted, longUnmanaged };
    let analysis =
      `이번 주 상담 ${consulted}건, 신규 고객 ${newCustomers}명입니다. ` +
      `장기 미관리 고객이 ${longUnmanaged}명 있습니다.`;

    if (this.llm.enabled) {
      try {
        const text = await this.llm.complete({
          system:
            '당신은 보험설계사의 주간 고객관리 리포트를 작성합니다. 수치를 근거로 2~3문장의 코멘트만 제공합니다.',
          user: `통계(JSON): ${JSON.stringify(stats)}\n이번 주 활동에 대한 짧은 분석과 다음 주 권장 사항을 작성하세요.`,
          maxTokens: 400,
        });
        if (text) analysis = text;
      } catch (err) {
        this.logger.warn(`weeklyReport LLM 실패, 폴백 사용: ${String(err)}`);
      }
    }

    return { periodStart: weekAgo, stats, analysis };
  }

  // -------------------------------------------------------------------------
  // helpers
  // -------------------------------------------------------------------------
  private async loadContext(
    userId: string,
    customerId: string,
  ): Promise<CustomerContext> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, userId },
      include: {
        tags: true,
        consultations: { orderBy: { consultationDate: 'desc' }, take: 30 },
        schedules: {
          where: { status: 'PENDING' },
          orderBy: { scheduleDate: 'asc' },
        },
      },
    });
    if (!customer) throw new NotFoundException('고객을 찾을 수 없습니다.');
    return customer;
  }

  /** PRD 31: 최소 데이터만 프롬프트에 포함 (연락처/주소/생년월일 제외). */
  private profileForPrompt(c: CustomerContext): string {
    const days = c.lastContactAt
      ? Math.floor((Date.now() - c.lastContactAt.getTime()) / DAY)
      : null;
    const recentConsults = c.consultations
      .slice(0, 3)
      .map(
        (x) =>
          `- ${x.consultationDate.toISOString().slice(0, 10)}: ${
            x.summary ?? truncate(x.content, 120)
          }`,
      )
      .join('\n');
    const schedules = c.schedules
      .slice(0, 3)
      .map(
        (s) =>
          `- ${s.scheduleDate.toISOString().slice(0, 10)} ${s.type} ${s.title}`,
      )
      .join('\n');

    return [
      `이름: ${c.name}`,
      `등급: ${c.grade}`,
      c.interests.length ? `관심분야: ${c.interests.join(', ')}` : '',
      c.tags.length ? `태그: ${c.tags.map((t) => t.tag).join(', ')}` : '',
      days === null
        ? '마지막 연락: 기록 없음'
        : `마지막 연락: ${days}일 전`,
      recentConsults ? `최근 상담:\n${recentConsults}` : '최근 상담: 없음',
      schedules ? `예정 일정:\n${schedules}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  private fallbackRecommendation(
    c: Customer,
    priority: RecommendationPriority,
  ): string {
    const topic = c.interests[0] ? `${c.interests[0]} 관련 ` : '';
    switch (priority) {
      case 'IMMEDIATE':
        return `오늘 안부 문자를 보내고 2~3일 내 ${topic}상담을 제안하세요.`;
      case 'TODAY':
        return `오늘 중 안부 연락 후 ${topic}상담 일정을 잡아보세요.`;
      case 'THIS_WEEK':
        return `이번 주 안에 안부 연락을 하세요.`;
      default:
        return `현재 관리 상태 양호. 다음 정기 연락 시점에 맞춰 연락하세요.`;
    }
  }

  private fallbackChannel(c: Customer): string {
    return c.consultStatus === 'IN_PROGRESS' ? '전화 상담' : '문자 → 전화 상담';
  }

  private fallbackTiming(priority: RecommendationPriority): Date {
    const days =
      priority === 'IMMEDIATE'
        ? 0
        : priority === 'TODAY'
          ? 1
          : priority === 'THIS_WEEK'
            ? 5
            : 14;
    return new Date(Date.now() + days * DAY);
  }

  private fallbackNextActions(
    c: Customer,
    priority: RecommendationPriority,
  ): string[] {
    const topic = c.interests[0] ?? '관심사항';
    if (priority === 'NORMAL') {
      return ['다음 정기 연락일에 안부 문자 발송', `상담 시 ${topic} 확인`];
    }
    return [
      '오늘 안부 문자 발송',
      '2~3일 후 전화 연락',
      `상담 시 ${topic} 관련 니즈 확인`,
    ];
  }

  private fallbackMessage(
    c: Customer,
    purpose: string,
    tone: string,
  ): string {
    const topic = c.interests[0] ? `${c.interests[0]} ` : '';
    const honorific = tone === '친근하게' ? '' : '님';
    return (
      `안녕하세요 ○○${honorific}. 잘 지내고 계시죠? ` +
      `${purpose}드리려 연락드립니다. ` +
      `${topic ? `전에 말씀 나눴던 ${topic}관련해서 ` : ''}` +
      `편하실 때 짧게 통화 가능하실까요?`
    );
  }

  // -------------------------------------------------------------------------
  // 보험증권/약관 문서 요약 (Insurance AI Lab 참고)
  // PRD 15장 준수: 보장 적정성/가입 가능성은 판단하지 않고 문서 내용만 요약·추출한다.
  // -------------------------------------------------------------------------
  async summarizeDocument(
    file: string,
    mimeType: 'application/pdf' | 'image/png' | 'image/jpeg',
  ): Promise<{
    docType: string;
    summary: string;
    coverages: { name: string; detail: string }[];
    keyDates: string[];
    notes: string[];
  }> {
    if (!this.llm.enabled) {
      throw new ServiceUnavailableException(
        '문서 요약은 AI(ANTHROPIC_API_KEY) 설정이 필요합니다.',
      );
    }

    const parsed = await this.llm.analyzeDocumentJson<{
      docType?: string;
      summary?: string;
      coverages?: { name?: string; detail?: string }[];
      keyDates?: string[];
      notes?: string[];
    }>({
      base64: file,
      mediaType: mimeType,
      system:
        '당신은 보험증권/약관 문서를 정리하는 어시스턴트다. 문서에 적힌 사실만 추출·요약하며, ' +
        '보장이 충분한지·가입이 적절한지 등 평가나 조언은 절대 하지 않는다.',
      user: [
        '이 보험 문서를 JSON 으로 정리하라.',
        '{',
        '  "docType": string,   // 예: 보험증권, 약관, 청약서',
        '  "summary": string,   // 2~3문장 요약',
        '  "coverages": [ { "name": string, "detail": string } ],  // 담보/보장 항목과 금액·조건',
        '  "keyDates": string[],  // 계약일·만기일·납입기간 등',
        '  "notes": string[]      // 특약, 면책, 유의사항 등',
        '}',
      ].join('\n'),
      maxTokens: 1800,
    });

    if (!parsed?.summary) {
      throw new ServiceUnavailableException('문서를 인식하지 못했습니다.');
    }
    return {
      docType: parsed.docType?.trim() || '보험 문서',
      summary: parsed.summary.trim(),
      coverages: (parsed.coverages ?? [])
        .filter((c) => c?.name)
        .map((c) => ({ name: c.name!.trim(), detail: (c.detail ?? '').trim() })),
      keyDates: parsed.keyDates ?? [],
      notes: parsed.notes ?? [],
    };
  }
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
