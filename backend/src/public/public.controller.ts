import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApplyLeadDto } from './dto/apply.dto';
import { PublicService } from './public.service';

/** 인증 없이 접근하는 공개 엔드포인트 (상담 신청 폼) */
@Controller('public/apply')
export class PublicController {
  constructor(private readonly svc: PublicService) {}

  @Get(':token')
  info(@Param('token') token: string) {
    return this.svc.agentByToken(token);
  }

  @Post(':token')
  submit(@Param('token') token: string, @Body() dto: ApplyLeadDto) {
    return this.svc.createLead(token, dto);
  }
}
