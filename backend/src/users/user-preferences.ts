import { Prisma } from '@prisma/client';

export type AiRecommendationFrequency = 'DAILY' | 'WEEKLY' | 'OFF';

/** PRD 21 - 사용자 설정 */
export interface UserPreferences {
  /** 매일 오전 다이제스트 푸시 수신 */
  dailyDigestEnabled: boolean;
  /** 상담 관련 알림 */
  notifyConsultation: boolean;
  /** 고객 생일 알림 */
  notifyBirthday: boolean;
  /** AI 추천 알림 */
  notifyAiRecommendation: boolean;
  /** AI 문자 생성 시 기본 말투 */
  aiMessageTone: string;
  /** AI 추천 빈도 */
  aiRecommendationFrequency: AiRecommendationFrequency;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  dailyDigestEnabled: true,
  notifyConsultation: true,
  notifyBirthday: true,
  notifyAiRecommendation: true,
  aiMessageTone: '정중하게',
  aiRecommendationFrequency: 'DAILY',
};

/** 저장된 JSON 을 기본값 위에 병합해 항상 완전한 객체를 돌려준다. */
export function mergePreferences(
  stored: Prisma.JsonValue | null | undefined,
): UserPreferences {
  const obj =
    stored && typeof stored === 'object' && !Array.isArray(stored)
      ? (stored as Record<string, unknown>)
      : {};
  return { ...DEFAULT_PREFERENCES, ...obj } as UserPreferences;
}
