import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ApplyLeadDto } from './dto/apply.dto';

export function newApplyToken(): string {
  return randomBytes(12).toString('base64url'); // 16자, URL-safe
}

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  /** 공개 상담신청 폼에 표시할 설계사 정보 */
  async agentByToken(token: string): Promise<{ agentName: string }> {
    const user = await this.userByToken(token);
    return { agentName: user.name };
  }

  /** 공개 폼 제출 → 해당 설계사의 잠재고객으로 등록 */
  async createLead(token: string, dto: ApplyLeadDto) {
    const user = await this.userByToken(token);

    // 허니팟 필드가 채워졌으면 봇으로 간주하고 조용히 성공 응답만 반환
    if (dto.website && dto.website.trim()) {
      return { ok: true };
    }

    const notes = [
      '상담 신청 접수',
      dto.message ? `요청사항: ${dto.message}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const customer = await this.prisma.customer.create({
      data: {
        userId: user.id,
        name: dto.name.trim(),
        phone: dto.phone.trim(),
        grade: 'POTENTIAL',
        consultStatus: 'SCHEDULED',
        interests: dto.interest ? [dto.interest.trim()] : [],
        notes,
        nextContactAt: new Date(),
        tags: { create: [{ tag: '잠재고객' }, { tag: '상담신청' }] },
      },
      select: { id: true },
    });
    return { ok: true, customerId: customer.id };
  }

  private async userByToken(token: string) {
    const user = await this.prisma.user.findUnique({
      where: { publicToken: token },
      select: { id: true, name: true },
    });
    if (!user) throw new NotFoundException('유효하지 않은 링크입니다.');
    return user;
  }
}
