import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import {
  CustomerFilter,
  CustomerSort,
  QueryCustomersDto,
} from './dto/query-customers.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

const DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateCustomerDto) {
    const { tags, birthDate, lastContactAt, nextContactAt, ...rest } = dto;
    return this.prisma.customer.create({
      data: {
        ...rest,
        userId,
        interests: dto.interests ?? [],
        birthDate: birthDate ? new Date(birthDate) : undefined,
        lastContactAt: lastContactAt ? new Date(lastContactAt) : undefined,
        nextContactAt: nextContactAt ? new Date(nextContactAt) : undefined,
        tags: tags?.length
          ? { create: dedupe(tags).map((tag) => ({ tag })) }
          : undefined,
      },
      include: { tags: true },
    });
  }

  async findAll(userId: string, query: QueryCustomersDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.CustomerWhereInput = { userId };
    const and: Prisma.CustomerWhereInput[] = [];

    if (query.q) {
      const q = query.q.trim();
      and.push({
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q } },
          { customerNo: { contains: q, mode: 'insensitive' } },
          { notes: { contains: q, mode: 'insensitive' } },
          { tags: { some: { tag: { contains: q, mode: 'insensitive' } } } },
        ],
      });
    }

    const now = Date.now();
    switch (query.filter) {
      case CustomerFilter.NEEDS_CARE:
        and.push({
          recommendation: { priority: { in: ['IMMEDIATE', 'TODAY'] } },
        });
        break;
      case CustomerFilter.RECENT_CONSULT:
        and.push({ lastContactAt: { gte: new Date(now - 14 * DAY) } });
        break;
      case CustomerFilter.LONG_UNMANAGED:
        and.push({
          OR: [
            { lastContactAt: null },
            { lastContactAt: { lt: new Date(now - 60 * DAY) } },
          ],
        });
        break;
      case CustomerFilter.NEW:
        and.push({
          OR: [
            { grade: 'NEW' },
            { createdAt: { gte: new Date(now - 30 * DAY) } },
          ],
        });
        break;
      case CustomerFilter.VIP:
        and.push({ grade: 'VIP' });
        break;
      case CustomerFilter.CONTRACT:
        and.push({
          schedules: { some: { type: 'CONTRACT', status: 'PENDING' } },
        });
        break;
      case CustomerFilter.CONSULT_SCHEDULED:
        and.push({
          OR: [
            { consultStatus: 'SCHEDULED' },
            {
              schedules: {
                some: {
                  type: { in: ['PHONE_CONSULT', 'VISIT_CONSULT'] },
                  status: 'PENDING',
                },
              },
            },
          ],
        });
        break;
      case CustomerFilter.BIRTHDAY:
        and.push({ id: { in: await this.birthdayCustomerIds(userId) } });
        break;
      default:
        break;
    }

    if (and.length) where.AND = and;

    const orderBy = this.buildOrderBy(query.sort);

    const [total, items] = await this.prisma.$transaction([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { tags: true, recommendation: true },
      }),
    ]);

    return { total, page, pageSize, items };
  }

  async findOne(userId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, userId },
      include: {
        tags: true,
        recommendation: true,
        consultations: { orderBy: { consultationDate: 'desc' }, take: 20 },
        schedules: { orderBy: { scheduleDate: 'asc' }, take: 20 },
        messages: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!customer) throw new NotFoundException('고객을 찾을 수 없습니다.');
    return customer;
  }

  async update(userId: string, id: string, dto: UpdateCustomerDto) {
    await this.ensureOwned(userId, id);
    const { tags, birthDate, lastContactAt, nextContactAt, ...rest } = dto;

    return this.prisma.customer.update({
      where: { id },
      data: {
        ...rest,
        birthDate: birthDate ? new Date(birthDate) : undefined,
        lastContactAt: lastContactAt ? new Date(lastContactAt) : undefined,
        nextContactAt: nextContactAt ? new Date(nextContactAt) : undefined,
        tags: tags
          ? {
              deleteMany: {},
              create: dedupe(tags).map((tag) => ({ tag })),
            }
          : undefined,
      },
      include: { tags: true, recommendation: true },
    });
  }

  async remove(userId: string, id: string) {
    await this.ensureOwned(userId, id);
    await this.prisma.customer.delete({ where: { id } });
    return { deleted: true };
  }

  private async ensureOwned(userId: string, id: string) {
    const found = await this.prisma.customer.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('고객을 찾을 수 없습니다.');
  }

  private buildOrderBy(
    sort?: CustomerSort,
  ): Prisma.CustomerOrderByWithRelationInput[] {
    switch (sort) {
      case CustomerSort.LAST_CONTACT:
        return [{ lastContactAt: { sort: 'desc', nulls: 'last' } }];
      case CustomerSort.CREATED_AT:
        return [{ createdAt: 'desc' }];
      case CustomerSort.NAME:
        return [{ name: 'asc' }];
      case CustomerSort.AI_SCORE:
      default:
        return [
          { recommendation: { score: 'desc' } },
          { updatedAt: 'desc' },
        ];
    }
  }

  private async birthdayCustomerIds(userId: string): Promise<string[]> {
    const month = new Date().getMonth();
    const rows = await this.prisma.customer.findMany({
      where: { userId, birthDate: { not: null } },
      select: { id: true, birthDate: true },
    });
    return rows
      .filter((r) => r.birthDate && r.birthDate.getMonth() === month)
      .map((r) => r.id);
  }
}

function dedupe(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}
