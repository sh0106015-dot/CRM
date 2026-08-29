import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateConsultationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content?: string;

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

  /** true 이고 content 가 있으면 요약을 다시 생성한다 */
  @IsOptional()
  @IsBoolean()
  autoSummarize?: boolean;
}
