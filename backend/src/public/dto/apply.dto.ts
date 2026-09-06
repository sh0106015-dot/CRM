import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ApplyLeadDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(30)
  phone!: string;

  /** 관심 보험 (예: 건강보험) */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  interest?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;

  /** 허니팟: 사람은 비워두고 봇은 채우는 숨김 필드 */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}
