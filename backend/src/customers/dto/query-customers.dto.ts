import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/** PRD 7장: 필터 */
export enum CustomerFilter {
  NEEDS_CARE = 'NEEDS_CARE', // 관리 필요
  RECENT_CONSULT = 'RECENT_CONSULT', // 최근 상담
  LONG_UNMANAGED = 'LONG_UNMANAGED', // 장기 미관리
  NEW = 'NEW', // 신규 고객
  VIP = 'VIP',
  BIRTHDAY = 'BIRTHDAY', // 생일 (이번 달)
  CONTRACT = 'CONTRACT', // 계약 관련
  CONSULT_SCHEDULED = 'CONSULT_SCHEDULED', // 상담 예정
}

/** PRD 7장: 정렬 */
export enum CustomerSort {
  AI_SCORE = 'AI_SCORE', // AI 관리점수
  LAST_CONTACT = 'LAST_CONTACT', // 최근 상담일
  CREATED_AT = 'CREATED_AT', // 등록일
  NAME = 'NAME', // 이름
}

export class QueryCustomersDto {
  /** 이름 / 전화번호 / 고객번호 / 메모 / 태그 검색 */
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(CustomerFilter)
  filter?: CustomerFilter;

  /** 태그로 필터 (콤마 구분 시 하나라도 일치) */
  @IsOptional()
  @IsString()
  tag?: string;

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
