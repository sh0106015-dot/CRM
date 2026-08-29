import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateScheduleDto) {
    if (dto.customerId) {
      await this.ensureCustomer(userId, dto.customerId);
    }
    return this.prisma.schedule.create({
      data: {
        userId,
        customerId: dto.customerId,
        title: dto.title,
        scheduleDate: new Date(dto.scheduleDate),
        type: dto.type,
        memo: dto.memo,
      },
    });
  }

  async findAll(userId: string, from?: string, to?: string) {
    const where: Prisma.ScheduleWhereInput = { userId };
    if (from || to) {
      where.scheduleDate = {};
      if (from) where.scheduleDate.gte = new Date(from);
      if (to) where.scheduleDate.lte = new Date(to);
    }
    return this.prisma.schedule.findMany({
      where,
      orderBy: { scheduleDate: 'asc' },
      include: { customer: { select: { id: true, name: true, phone: true } } },
    });
  }

  /** PRD 6-1 / 19: 오늘 처리할 일정 + 알림 소스 */
  async findToday(userId: string) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return this.prisma.schedule.findMany({
      where: {
        userId,
        status: 'PENDING',
        scheduleDate: { gte: start, lt: end },
      },
      orderBy: { scheduleDate: 'asc' },
      include: { customer: { select: { id: true, name: true, phone: true } } },
    });
  }

  async update(userId: string, id: string, dto: UpdateScheduleDto) {
    await this.ensureOwned(userId, id);
    return this.prisma.schedule.update({
      where: { id },
      data: {
        title: dto.title,
        scheduleDate: dto.scheduleDate ? new Date(dto.scheduleDate) : undefined,
        type: dto.type,
        status: dto.status,
        memo: dto.memo,
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.ensureOwned(userId, id);
    await this.prisma.schedule.delete({ where: { id } });
    return { deleted: true };
  }

  private async ensureOwned(userId: string, id: string) {
    const found = await this.prisma.schedule.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('일정을 찾을 수 없습니다.');
  }

  private async ensureCustomer(userId: string, customerId: string) {
    const found = await this.prisma.customer.findFirst({
      where: { id: customerId, userId },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('고객을 찾을 수 없습니다.');
  }
}
