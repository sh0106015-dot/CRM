import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { ConsultationsModule } from './consultations/consultations.module';
import { CustomersModule } from './customers/customers.module';
import { NewsModule } from './news/news.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './prisma/prisma.module';
import { PublicModule } from './public/public.module';
import { SchedulesModule } from './schedules/schedules.module';
import { TagsModule } from './tags/tags.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    // 공개 엔드포인트(상담 신청) 남용 방지용 - 개별 라우트에서 @Throttle 로 조인다.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
    PrismaModule,
    AuthModule,
    CustomersModule,
    ConsultationsModule,
    SchedulesModule,
    AiModule,
    NotificationsModule,
    UsersModule,
    TagsModule,
    NewsModule,
    PublicModule,
  ],
})
export class AppModule {}
