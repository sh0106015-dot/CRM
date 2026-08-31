import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface TagSummary {
  tag: string;
  count: number;
}

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 사용자의 모든 태그 + 각 태그가 붙은 고객 수 (많은 순) */
  async list(userId: string): Promise<TagSummary[]> {
    const groups = await this.prisma.customerTag.groupBy({
      by: ['tag'],
      where: { customer: { userId } },
      _count: { tag: true },
    });
    return groups
      .map((g) => ({ tag: g.tag, count: g._count.tag }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }

  /** 태그 이름을 사용자의 모든 고객에 대해 일괄 변경 */
  async rename(userId: string, from: string, to: string) {
    const target = to.trim();
    if (!target) throw new BadRequestException('새 태그 이름이 비어 있습니다.');
    if (target === from) return { renamed: 0 };

    const rows = await this.prisma.customerTag.findMany({
      where: { tag: from, customer: { userId } },
      select: { id: true, customerId: true },
    });
    if (rows.length === 0) throw new NotFoundException('해당 태그를 사용하는 고객이 없습니다.');

    // 이미 새 태그를 가진 고객은 중복 방지를 위해 옛 태그 행을 삭제만 한다.
    const already = await this.prisma.customerTag.findMany({
      where: {
        tag: target,
        customerId: { in: rows.map((r) => r.customerId) },
      },
      select: { customerId: true },
    });
    const collide = new Set(already.map((r) => r.customerId));
    const toDelete = rows.filter((r) => collide.has(r.customerId)).map((r) => r.id);
    const toUpdate = rows.filter((r) => !collide.has(r.customerId)).map((r) => r.id);

    await this.prisma.$transaction([
      this.prisma.customerTag.deleteMany({ where: { id: { in: toDelete } } }),
      this.prisma.customerTag.updateMany({
        where: { id: { in: toUpdate } },
        data: { tag: target },
      }),
    ]);
    return { renamed: toUpdate.length, merged: toDelete.length };
  }

  /** 태그를 사용자의 모든 고객에서 제거 */
  async remove(userId: string, tag: string) {
    const res = await this.prisma.customerTag.deleteMany({
      where: { tag, customer: { userId } },
    });
    return { deleted: res.count };
  }

  /** 선택한 고객들에 태그 일괄 부여 */
  async applyToCustomers(userId: string, tag: string, customerIds: string[]) {
    const owned = await this.ownedCustomerIds(userId, customerIds);
    const res = await this.prisma.customerTag.createMany({
      data: owned.map((customerId) => ({ customerId, tag })),
      skipDuplicates: true,
    });
    return { added: res.count };
  }

  /** 선택한 고객들에서 태그 일괄 제거 */
  async removeFromCustomers(userId: string, tag: string, customerIds: string[]) {
    const owned = await this.ownedCustomerIds(userId, customerIds);
    const res = await this.prisma.customerTag.deleteMany({
      where: { tag, customerId: { in: owned } },
    });
    return { removed: res.count };
  }

  private async ownedCustomerIds(
    userId: string,
    ids: string[],
  ): Promise<string[]> {
    const rows = await this.prisma.customer.findMany({
      where: { id: { in: ids }, userId },
      select: { id: true },
    });
    if (rows.length === 0) {
      throw new NotFoundException('대상 고객을 찾을 수 없습니다.');
    }
    return rows.map((r) => r.id);
  }
}
