import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const MESSAGE_TONES = [
  '친근하게',
  '정중하게',
  '짧게',
  '전문적으로',
  '안부 중심',
  '상담 유도',
] as const;

export type MessageTone = (typeof MESSAGE_TONES)[number];

export class GenerateMessageDto {
  /** 메시지 목적 (예: 안부 연락, 상담 유도, 계약 갱신 안내) */
  @IsString()
  @MaxLength(100)
  purpose!: string;

  @IsOptional()
  @IsIn(MESSAGE_TONES as unknown as string[])
  tone?: MessageTone = '정중하게';

  /** 추가 상황 설명 (선택) */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  context?: string;
}
