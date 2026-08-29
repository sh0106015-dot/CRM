import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import appleSignin from 'apple-signin-auth';
import { OAuth2Client } from 'google-auth-library';
import { AuthService } from './auth.service';

export interface OAuthProfile {
  provider: 'google' | 'apple';
  providerId: string;
  email: string;
  name: string;
}

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);
  private readonly googleClient = new OAuth2Client();

  constructor(
    private readonly config: ConfigService,
    private readonly auth: AuthService,
  ) {}

  /** 모바일 앱에서 받은 Google ID 토큰을 검증하고 우리 JWT 로 교환한다. */
  async google(idToken: string) {
    const audience = this.clientIds('GOOGLE_CLIENT_ID');
    if (!audience.length) {
      throw new UnauthorizedException('Google 로그인이 서버에 구성되지 않았습니다.');
    }

    let payload;
    try {
      const ticket = await this.googleClient.verifyIdToken({ idToken, audience });
      payload = ticket.getPayload();
    } catch (err) {
      this.logger.warn(`Google ID 토큰 검증 실패: ${String(err)}`);
      throw new UnauthorizedException('유효하지 않은 Google 토큰입니다.');
    }

    if (!payload?.sub || !payload.email) {
      throw new UnauthorizedException('Google 토큰에 필요한 정보가 없습니다.');
    }

    return this.auth.oauthLogin({
      provider: 'google',
      providerId: payload.sub,
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
    });
  }

  /** 모바일 앱에서 받은 Apple identity 토큰을 검증하고 우리 JWT 로 교환한다. */
  async apple(identityToken: string, fullName?: string) {
    const audience = this.clientIds('APPLE_CLIENT_ID');
    if (!audience.length) {
      throw new UnauthorizedException('Apple 로그인이 서버에 구성되지 않았습니다.');
    }

    let claims;
    try {
      claims = await appleSignin.verifyIdToken(identityToken, {
        audience: audience.length === 1 ? audience[0] : audience,
        ignoreExpiration: false,
      });
    } catch (err) {
      this.logger.warn(`Apple identity 토큰 검증 실패: ${String(err)}`);
      throw new UnauthorizedException('유효하지 않은 Apple 토큰입니다.');
    }

    if (!claims?.sub) {
      throw new UnauthorizedException('Apple 토큰에 필요한 정보가 없습니다.');
    }
    // Apple 은 최초 1회만 이메일을 주며, 이후에는 sub 만 전달된다.
    const email: string = claims.email ?? `${claims.sub}@privaterelay.appleid.com`;

    return this.auth.oauthLogin({
      provider: 'apple',
      providerId: claims.sub,
      email,
      name: fullName?.trim() || email.split('@')[0],
    });
  }

  private clientIds(key: string): string[] {
    return (this.config.get<string>(key) ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
}
