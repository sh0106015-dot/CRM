import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePreferencesDto {
  @IsOptional()
  @IsBoolean()
  dailyDigestEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyConsultation?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyBirthday?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyAiRecommendation?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  aiMessageTone?: string;

  @IsOptional()
  @IsIn(['DAILY', 'WEEKLY', 'OFF'])
  aiRecommendationFrequency?: 'DAILY' | 'WEEKLY' | 'OFF';
}
