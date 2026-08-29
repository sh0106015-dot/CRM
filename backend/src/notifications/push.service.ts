import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface PushResult {
  sent: number;
  failed: number;
  invalidTokens: string[];
}

/**
 * 푸시 발송.
 *
 * 기본 경로는 Expo Push Service (`ExponentPushToken[...]`) 이며,
 * Android 는 내부적으로 FCM, iOS 는 APNs 로 전달된다.
 * 원시 FCM 토큰을 직접 쓰려면 firebase-admin 을 추가해 확장할 수 있다(미구현).
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly accessToken?: string;

  constructor(config: ConfigService) {
    this.accessToken = config.get<string>('EXPO_ACCESS_TOKEN') || undefined;
  }

  isExpoToken(token: string): boolean {
    return /^ExponentPushToken\[.+\]$/.test(token) || /^ExpoPushToken\[.+\]$/.test(token);
  }

  async send(tokens: string[], message: PushMessage): Promise<PushResult> {
    const expoTokens = tokens.filter((t) => this.isExpoToken(t));
    const skipped = tokens.length - expoTokens.length;
    if (skipped > 0) {
      this.logger.warn(
        `${skipped}개의 비-Expo 토큰은 건너뜁니다 (원시 FCM 발송 미구현).`,
      );
    }
    if (expoTokens.length === 0) {
      return { sent: 0, failed: 0, invalidTokens: [] };
    }

    const payload = expoTokens.map((to) => ({
      to,
      title: message.title,
      body: message.body,
      data: message.data ?? {},
      sound: 'default',
    }));

    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const json = (await res.json()) as {
        data?: { status: string; details?: { error?: string } }[];
        errors?: unknown;
      };

      if (!res.ok || json.errors) {
        this.logger.error(`Expo Push 응답 오류: ${JSON.stringify(json.errors ?? json)}`);
        return { sent: 0, failed: expoTokens.length, invalidTokens: [] };
      }

      const tickets = json.data ?? [];
      const invalidTokens: string[] = [];
      let sent = 0;
      let failed = 0;
      tickets.forEach((ticket, i) => {
        if (ticket.status === 'ok') {
          sent += 1;
        } else {
          failed += 1;
          if (ticket.details?.error === 'DeviceNotRegistered') {
            invalidTokens.push(expoTokens[i]);
          }
        }
      });
      return { sent, failed, invalidTokens };
    } catch (err) {
      this.logger.error(`Expo Push 발송 실패: ${String(err)}`);
      return { sent: 0, failed: expoTokens.length, invalidTokens: [] };
    }
  }
}
