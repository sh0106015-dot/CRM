import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { mergePreferences, UserPreferences } from './user-preferences';

const SALT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        occupation: true,
        provider: true,
        createdAt: true,
        preferences: true,
      },
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    return { ...user, preferences: mergePreferences(user.preferences) };
  }

  async getPreferences(userId: string): Promise<UserPreferences> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    return mergePreferences(user.preferences);
  }

  async updatePreferences(
    userId: string,
    dto: UpdatePreferencesDto,
  ): Promise<UserPreferences> {
    const current = await this.getPreferences(userId);
    const next: UserPreferences = { ...current, ...dto };
    await this.prisma.user.update({
      where: { id: userId },
      data: { preferences: next as unknown as object },
    });
    return next;
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    if (!user.passwordHash) {
      throw new BadRequestException(
        '소셜 로그인 계정은 비밀번호를 변경할 수 없습니다.',
      );
    }

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('현재 비밀번호가 올바르지 않습니다.');
    }
    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException('새 비밀번호가 기존과 동일합니다.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(dto.newPassword, SALT_ROUNDS) },
    });
    return { changed: true };
  }

  async deleteAccount(userId: string) {
    await this.prisma.user.delete({ where: { id: userId } });
    return { deleted: true };
  }
}
