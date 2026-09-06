import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class FromCardDto {
  /** 명함 이미지 base64 (data URI 접두사 없이) */
  @IsString()
  @MinLength(100)
  @MaxLength(8_000_000) // ~6MB base64
  image!: string;

  @IsIn(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
  mimeType!: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';
}
