import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ScheduleType } from '@prisma/client';

export class CreateScheduleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @IsDateString()
  scheduleDate!: string;

  @IsOptional()
  @IsEnum(ScheduleType)
  type?: ScheduleType;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  memo?: string;
}
