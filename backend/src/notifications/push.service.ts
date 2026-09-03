import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FcmService } from './fcm.service';

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
 * 푸시 발송 라우터.
 *
 * - `ExponentPushToken[...]` / `ExpoPushToken[...]` → Expo Push Service
 *   (Android=FCM, iOS=APNs 로 전달)
 * - 그 외(원시 FCM 등록 토큰) → firebase-admin (`FcmService`).
 *   FcmService 미구성 시 해당 토큰은 건너뛴다.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly accessToken?: string;

  constructor(
    config: ConfigService,
    private readonly fcm: FcmService,
  ) {
    this.accessToken = config.get<string>('EXPO_ACCESS_TOKEN') || undefined;
  }

  isExpoToken(token: string): boolean {
    return /^ExponentPushToken\[.+\]$/.test(token) || /^ExpoPushToken\[.+\]$/.test(token);
  }

  async send(tokens: string[], message: PushMessage): Promise<PushResult> {
    const expoTokens = tokens.filter((t) => this.isExpoToken(t));
    const fcmTokens = tokens.filter((t) => !this.isExpoToken(t));

    const results = await Promise.all([
      this.sendExpo(expoTokens, message),
      this.sendFcm(fcmTokens, message),
    ]);

    return results.reduce<PushResult>(
      (acc, r) => ({
        sent: acc.sent + r.sent,
        failed: acc.failed + r.failed,
        invalidTokens: [...acc.invalidTokens, ...r.invalidTokens],
      }),
      { sent: 0, failed: 0, invalidTokens: [] },
    );
  }

  private async sendFcm(tokens: string[], message: PushMessage): Promise<PushResult> {
    if (tokens.length === 0) return empty();
    if (!this.fcm.enabled) {
      this.logger.warn(`${tokens.length}개의 원시 FCM 토큰은 건너뜁니다 (FCM 미구성).`);
      return empty();
    }
    return this.fcm.send(tokens, message);
  }

  private async sendExpo(tokens: string[], message: PushMessage): Promise<PushResult> {
    if (tokens.length === 0) return empty();

    const payload = tokens.map((to) => ({
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
        return { sent: 0, failed: tokens.length, invalidTokens: [] };
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
            invalidTokens.push(tokens[i]);
          }
        }
      });
      return { sent, failed, invalidTokens };
    } catch (err) {
      this.logger.error(`Expo Push 발송 실패: ${String(err)}`);
      return { sent: 0, failed: tokens.length, invalidTokens: [] };
    }
  }
}

function empty(): PushResult {
  return { sent: 0, failed: 0, invalidTokens: [] };
}
