import { ApiTags } from '@nestjs/swagger';
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ApplyLeadDto } from './dto/apply.dto';
import { PublicService } from './public.service';

/** 인증 없이 접근하는 공개 엔드포인트 (상담 신청 폼) */
@ApiTags('공개')
@Controller('public/apply')
export class PublicController {
  constructor(private readonly svc: PublicService) {}

  @Get(':token')
  info(@Param('token') token: string) {
    return this.svc.agentByToken(token);
  }

  /** IP 당 분당 10회로 제한 */
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post(':token')
  submit(@Param('token') token: string, @Body() dto: ApplyLeadDto) {
    return this.svc.createLead(token, dto);
  }
}
