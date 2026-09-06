import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class SummarizeDocumentDto {
  /** 파일 base64 (data URI 접두사 없이) */
  @IsString()
  @MinLength(100)
  @MaxLength(30_000_000) // ~22MB base64
  file!: string;

  @IsIn(['application/pdf', 'image/png', 'image/jpeg'])
  mimeType!: 'application/pdf' | 'image/png' | 'image/jpeg';
}
