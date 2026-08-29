import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class GoogleOAuthDto {
  @IsString()
  @MinLength(10)
  idToken!: string;
}

export class AppleOAuthDto {
  @IsString()
  @MinLength(10)
  identityToken!: string;

  /** Apple 최초 로그인 시에만 전달되는 사용자 이름 */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;
}
