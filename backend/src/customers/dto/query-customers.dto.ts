import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { CustomerFilter, CustomerSort } from './customer-query.enums';

export { CustomerFilter, CustomerSort } from './customer-query.enums';

export class QueryCustomersDto {
  /** 이름 / 전화번호 / 고객번호 / 메모 / 태그 검색 */
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: CustomerFilter })
  @IsOptional()
  @IsEnum(CustomerFilter)
  filter?: CustomerFilter;

  /** 태그로 필터 (콤마 구분 시 하나라도 일치) */
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ enum: CustomerSort, default: CustomerSort.AI_SCORE })
  @IsOptional()
  @IsEnum(CustomerSort)
  sort?: CustomerSort = CustomerSort.AI_SCORE;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
