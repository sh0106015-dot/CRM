import { Injectable, NotFoundException } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { UpdateConsultationDto } from './dto/update-consultation.dto';

@Injectable()
export class ConsultationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {}

  async create(userId: string, customerId: string, dto: CreateConsultationDto) {
    await this.ensureCustomer(userId, customerId);

    const consultationDate = dto.consultationDate
      ? new Date(dto.consultationDate)
      : new Date();

    let summary = dto.summary;
    let nextAction = dto.nextAction;
    let nextContactDate = dto.nextContactDate
      ? new Date(dto.nextContactDate)
      : undefined;

    if (dto.autoSummarize && !summary) {
      const result = await this.ai.summarizeConsultation(dto.content);
      summary = result.summary;
      nextAction = nextAction ?? result.nextAction;
      nextContactDate =
        nextContactDate ??
        (result.nextContactDate ? new Date(result.nextContactDate) : undefined);
    }

    const [consultation] = await this.prisma.$transaction([
      this.prisma.consultation.create({
        data: {
          customerId,
          consultationDate,
          content: dto.content,
          summary,
          nextAction,
          nextContactDate,
        },
      }),
      this.prisma.customer.update({
        where: { id: customerId },
        data: {
          lastContactAt: consultationDate,
          nextContactAt: nextContactDate ?? undefined,
        },
      }),
    ]);

    return consultation;
  }

  async findByCustomer(userId: string, customerId: string) {
    await this.ensureCustomer(userId, customerId);
    return this.prisma.consultation.findMany({
      where: { customerId },
      orderBy: { consultationDate: 'desc' },
    });
  }

  async update(
    userId: string,
    customerId: string,
    id: string,
    dto: UpdateConsultationDto,
  ) {
    await this.ensureConsultation(userId, customerId, id);

    let { summary, nextAction } = dto;
    let nextContactDate = dto.nextContactDate
      ? new Date(dto.nextContactDate)
      : undefined;

    if (dto.autoSummarize && dto.content) {
      const result = await this.ai.summarizeConsultation(dto.content);
      summary = summary ?? result.summary;
      nextAction = nextAction ?? result.nextAction;
      nextContactDate =
        nextContactDate ??
        (result.nextContactDate ? new Date(result.nextContactDate) : undefined);
    }

    return this.prisma.consultation.update({
      where: { id },
      data: {
        content: dto.content,
        consultationDate: dto.consultationDate
          ? new Date(dto.consultationDate)
          : undefined,
        summary,
        nextAction,
        nextContactDate,
      },
    });
  }

  async remove(userId: string, customerId: string, id: string) {
    await this.ensureConsultation(userId, customerId, id);
    await this.prisma.consultation.delete({ where: { id } });
    return { deleted: true };
  }

  private async ensureConsultation(
    userId: string,
    customerId: string,
    id: string,
  ) {
    await this.ensureCustomer(userId, customerId);
    const found = await this.prisma.consultation.findFirst({
      where: { id, customerId },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('상담 기록을 찾을 수 없습니다.');
  }

  private async ensureCustomer(userId: string, customerId: string) {
    const found = await this.prisma.customer.findFirst({
      where: { id: customerId, userId },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('고객을 찾을 수 없습니다.');
  }
}
