import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateConsultationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content!: string;

  @IsOptional()
  @IsDateString()
  consultationDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  summary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  nextAction?: string;

  @IsOptional()
  @IsDateString()
  nextContactDate?: string;

  /** true 이면 저장 후 AI 요약을 자동 생성한다 */
  @IsOptional()
  @IsBoolean()
  autoSummarize?: boolean;
}
