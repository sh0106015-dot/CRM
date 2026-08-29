import { Injectable } from '@nestjs/common';
import { DevicePlatform } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async register(userId: string, token: string, platform?: DevicePlatform) {
    return this.prisma.deviceToken.upsert({
      where: { token },
      create: { userId, token, platform: platform ?? 'ANDROID' },
      update: { userId, platform: platform ?? undefined, lastSeenAt: new Date() },
    });
  }

  async unregister(userId: string, token: string) {
    await this.prisma.deviceToken.deleteMany({ where: { token, userId } });
    return { deleted: true };
  }

  tokensForUser(userId: string): Promise<string[]> {
    return this.prisma.deviceToken
      .findMany({ where: { userId }, select: { token: true } })
      .then((rows) => rows.map((r) => r.token));
  }

  async pruneInvalid(tokens: string[]) {
    if (tokens.length) {
      await this.prisma.deviceToken.deleteMany({ where: { token: { in: tokens } } });
    }
  }
}
