import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { OAuthProfile } from './oauth.service';
import { RegisterDto } from './dto/register.dto';

const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('이미 가입된 이메일입니다.');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        occupation: dto.occupation,
        passwordHash,
      },
    });

    return this.issueToken(user.id, user.email, user.name);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    return this.issueToken(user.id, user.email, user.name);
  }

  /**
   * OAuth (Google/Apple) 로그인.
   * provider+providerId 로 먼저 찾고, 없으면 이메일로 기존 계정에 연결,
   * 그래도 없으면 신규 생성한다.
   */
  async oauthLogin(profile: OAuthProfile) {
    let user = await this.prisma.user.findFirst({
      where: { provider: profile.provider, providerId: profile.providerId },
    });

    if (!user) {
      const byEmail = await this.prisma.user.findUnique({
        where: { email: profile.email },
      });
      user = byEmail
        ? await this.prisma.user.update({
            where: { id: byEmail.id },
            data: { provider: profile.provider, providerId: profile.providerId },
          })
        : await this.prisma.user.create({
            data: {
              name: profile.name,
              email: profile.email,
              provider: profile.provider,
              providerId: profile.providerId,
            },
          });
    }

    return this.issueToken(user.id, user.email, user.name);
  }

  private issueToken(userId: string, email: string, name: string) {
    const accessToken = this.jwt.sign(
      { sub: userId, email },
      {
        secret: this.config.get<string>('JWT_SECRET', 'change-me-in-production'),
        expiresIn: this.config.get<string>('JWT_EXPIRES_IN', '7d'),
      },
    );
    return { accessToken, user: { id: userId, email, name } };
  }
}
