import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { DevicesService } from './devices.service';
import { PushService } from './push.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly devices: DevicesService,
    private readonly push: PushService,
  ) {}

  /** PRD 19: "오늘 관리 추천 고객 N명" 다이제스트 + 내일 상담 예정 알림 */
  async dailyDigestForUser(userId: string) {
    const dashboard = await this.ai.dashboard(userId); // 내부에서 recompute 수행
    const careCount = dashboard.needsCareToday.length;

    const tomorrowStart = new Date();
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

    const upcoming = await this.prisma.schedule.count({
      where: {
        userId,
        status: 'PENDING',
        scheduleDate: { gte: tomorrowStart, lt: tomorrowEnd },
      },
    });

    const parts: string[] = [];
    if (careCount > 0) parts.push(`오늘 관리 추천 고객 ${careCount}명`);
    if (upcoming > 0) parts.push(`내일 상담 예정 ${upcoming}건`);
    const body = parts.length ? parts.join(' · ') : '오늘 급히 관리할 고객은 없습니다. 👍';

    const tokens = await this.devices.tokensForUser(userId);
    const result = await this.push.send(tokens, {
      title: 'AI 고객관리',
      body,
      data: { type: 'daily-digest', careCount, upcoming },
    });
    await this.devices.pruneInvalid(result.invalidTokens);

    return { careCount, upcoming, body, push: result, deviceCount: tokens.length };
  }

  /** 스케줄러용 - 모든 사용자에 대해 다이제스트 발송 */
  async runDailyDigestForAll() {
    const users = await this.prisma.user.findMany({ select: { id: true } });
    let notified = 0;
    for (const u of users) {
      try {
        const r = await this.dailyDigestForUser(u.id);
        if (r.push.sent > 0) notified += 1;
      } catch (err) {
        this.logger.warn(`다이제스트 실패 (user ${u.id}): ${String(err)}`);
      }
    }
    this.logger.log(`일일 다이제스트 완료 - ${notified}/${users.length} 사용자에게 발송`);
    return { users: users.length, notified };
  }
}
