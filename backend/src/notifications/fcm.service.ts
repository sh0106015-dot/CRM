import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { App } from 'firebase-admin/app';
import type { PushMessage, PushResult } from './push.service';

/**
 * 원시 FCM 토큰(Expo 토큰이 아닌, standalone 빌드의 `getDevicePushTokenAsync()` 결과)
 * 으로 직접 발송한다. firebase-admin 이 구성되지 않으면 `enabled === false` 로
 * 동작하며 상위 PushService 는 해당 토큰을 건너뛴다.
 *
 * 구성 방법 (둘 중 하나):
 *  - FIREBASE_SERVICE_ACCOUNT : 서비스 계정 JSON 문자열
 *  - GOOGLE_APPLICATION_CREDENTIALS : 서비스 계정 JSON 파일 경로 (ADC)
 */
@Injectable()
export class FcmService {
  private readonly logger = new Logger(FcmService.name);
  private app: App | null = null;

  constructor(config: ConfigService) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const admin = require('firebase-admin') as typeof import('firebase-admin');
      const raw = config.get<string>('FIREBASE_SERVICE_ACCOUNT');
      const hasAdc = !!config.get<string>('GOOGLE_APPLICATION_CREDENTIALS');

      if (!raw && !hasAdc) {
        this.logger.warn(
          'FCM 미구성 (FIREBASE_SERVICE_ACCOUNT / GOOGLE_APPLICATION_CREDENTIALS 없음) - 원시 FCM 토큰은 건너뜁니다.',
        );
        return;
      }

      this.app =
        admin.apps.find((a) => a?.name === 'crm-fcm') ??
        admin.initializeApp(
          {
            credential: raw
              ? admin.credential.cert(JSON.parse(raw))
              : admin.credential.applicationDefault(),
          },
          'crm-fcm',
        );
      this.logger.log('FCM(firebase-admin) 초기화 완료');
    } catch (err) {
      this.logger.error(`FCM 초기화 실패: ${String(err)}`);
      this.app = null;
    }
  }

  get enabled(): boolean {
    return this.app !== null;
  }

  async send(tokens: string[], message: PushMessage): Promise<PushResult> {
    if (!this.app || tokens.length === 0) {
      return { sent: 0, failed: 0, invalidTokens: [] };
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const admin = require('firebase-admin') as typeof import('firebase-admin');
    const messaging = admin.messaging(this.app);

    const data: Record<string, string> = {};
    for (const [k, v] of Object.entries(message.data ?? {})) {
      data[k] = typeof v === 'string' ? v : JSON.stringify(v);
    }

    try {
      const res = await messaging.sendEachForMulticast({
        tokens,
        notification: { title: message.title, body: message.body },
        data,
      });
      const invalidTokens: string[] = [];
      res.responses.forEach((r, i) => {
        const code = r.error?.code;
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/invalid-argument'
        ) {
          invalidTokens.push(tokens[i]);
        }
      });
      return {
        sent: res.successCount,
        failed: res.failureCount,
        invalidTokens,
      };
    } catch (err) {
      this.logger.error(`FCM 발송 실패: ${String(err)}`);
      return { sent: 0, failed: tokens.length, invalidTokens: [] };
    }
  }
}
