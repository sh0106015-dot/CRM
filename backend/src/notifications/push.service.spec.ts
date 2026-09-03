import { ConfigService } from '@nestjs/config';
import { FcmService } from './fcm.service';
import { PushService } from './push.service';

function make(fcmEnabled = false) {
  const config = { get: () => undefined } as unknown as ConfigService;
  const fcm = {
    enabled: fcmEnabled,
    send: jest.fn().mockResolvedValue({ sent: 1, failed: 0, invalidTokens: [] }),
  } as unknown as FcmService;
  return { service: new PushService(config, fcm), fcm };
}

describe('PushService', () => {
  it('Expo 토큰을 구분한다', () => {
    const { service } = make();
    expect(service.isExpoToken('ExponentPushToken[abc123]')).toBe(true);
    expect(service.isExpoToken('ExpoPushToken[abc123]')).toBe(true);
    expect(service.isExpoToken('fcm-raw-registration-token')).toBe(false);
    expect(service.isExpoToken('')).toBe(false);
  });

  it('토큰이 없으면 네트워크 호출 없이 빈 결과', async () => {
    const { service } = make();
    await expect(service.send([], { title: 't', body: 'b' })).resolves.toEqual({
      sent: 0,
      failed: 0,
      invalidTokens: [],
    });
  });

  it('FCM 미구성 시 원시 토큰은 건너뛴다 (throw 없음)', async () => {
    const { service, fcm } = make(false);
    const r = await service.send(['raw-fcm-token'], { title: 't', body: 'b' });
    expect(fcm.send).not.toHaveBeenCalled();
    expect(r).toEqual({ sent: 0, failed: 0, invalidTokens: [] });
  });

  it('FCM 구성 시 원시 토큰을 FcmService 로 라우팅', async () => {
    const { service, fcm } = make(true);
    const r = await service.send(['raw-fcm-token'], { title: 't', body: 'b' });
    expect(fcm.send).toHaveBeenCalledWith(['raw-fcm-token'], expect.any(Object));
    expect(r.sent).toBe(1);
  });
});
