import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AiService } from './ai.service';
import { GenerateMessageDto } from './dto/generate-message.dto';
import { SummarizeDocumentDto } from './dto/summarize-document.dto';
import { SummarizeDto } from './dto/summarize.dto';

@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  /** PRD 6-1: AI 홈 대시보드 */
  @Get('dashboard')
  dashboard(@CurrentUser('userId') userId: string) {
    return this.ai.dashboard(userId);
  }

  /** PRD 18: AI 주간 리포트 */
  @Get('report/weekly')
  weeklyReport(@CurrentUser('userId') userId: string) {
    return this.ai.weeklyReport(userId);
  }

  /** PRD 15: 전체 고객 관리점수 재계산 */
  @Post('recompute')
  recompute(@CurrentUser('userId') userId: string) {
    return this.ai.recomputeAll(userId);
  }

  /** PRD 9: AI 고객분석 */
  @Post('customers/:customerId/analyze')
  analyze(
    @CurrentUser('userId') userId: string,
    @Param('customerId') customerId: string,
  ) {
    return this.ai.analyzeCustomer(userId, customerId);
  }

  /** PRD 10: AI 다음 행동 추천 */
  @Get('customers/:customerId/next-actions')
  nextActions(
    @CurrentUser('userId') userId: string,
    @Param('customerId') customerId: string,
  ) {
    return this.ai.nextActions(userId, customerId);
  }

  /** PRD 11: AI 문자 생성 */
  @Post('customers/:customerId/message')
  generateMessage(
    @CurrentUser('userId') userId: string,
    @Param('customerId') customerId: string,
    @Body() dto: GenerateMessageDto,
  ) {
    return this.ai.generateMessage(userId, customerId, dto);
  }

  /** PRD 13: AI 상담 요약 (저장 없이 요약만) */
  @Post('summarize')
  summarize(@Body() dto: SummarizeDto) {
    return this.ai.summarizeConsultation(dto.content);
  }

  /** 보험증권/약관 문서(PDF·이미지) 요약 (평가 없이 추출만, AI 미구성 시 503) */
  @Post('summarize-document')
  summarizeDocument(@Body() dto: SummarizeDocumentDto) {
    return this.ai.summarizeDocument(dto.file, dto.mimeType);
  }
}
