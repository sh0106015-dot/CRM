import {
  Consultation,
  Customer,
  CustomerTag,
  RecommendationPriority,
  Schedule,
} from '@prisma/client';

const DAY = 24 * 60 * 60 * 1000;

export interface ScoringInput {
  customer: Customer & { tags?: CustomerTag[] };
  consultations: Consultation[];
  schedules: Schedule[];
}

export interface ScoringResult {
  score: number; // 0 ~ 100
  priority: RecommendationPriority;
  factors: string[]; // 사람이 읽을 수 있는 근거
}

const GRADE_WEIGHT: Record<string, number> = {
  VIP: 20,
  LONGTERM: 10,
  GENERAL: 6,
  POTENTIAL: 8,
  NEW: 12,
};

/**
 * PRD 15장 - AI 고객관리 점수.
 * 실제 상품 가입 가능성/보장 적정성은 판단하지 않는다 (초기 버전 제외 항목).
 * 순수하게 "관리 우선순위" 만 규칙 기반으로 계산한다.
 */
export function computeManagementScore(input: ScoringInput): ScoringResult {
  const { customer, consultations, schedules } = input;
  const now = Date.now();
  const factors: string[] = [];
  let score = 0;

  // 1) 마지막 연락일 경과 (최대 40점)
  const lastContact = customer.lastContactAt ?? lastConsultDate(consultations);
  if (!lastContact) {
    score += 30;
    factors.push('연락 이력이 없습니다.');
  } else {
    const days = Math.floor((now - lastContact.getTime()) / DAY);
    const contactScore = Math.min(40, Math.floor(days / 3));
    score += contactScore;
    if (days >= 30) factors.push(`마지막 연락 후 ${days}일 경과`);
  }

  // 2) 상담 빈도 (최근 90일) (최대 15점)
  const recent = consultations.filter(
    (c) => now - c.consultationDate.getTime() <= 90 * DAY,
  ).length;
  if (recent === 0) {
    score += 15;
    factors.push('최근 90일 내 상담 없음');
  } else if (recent === 1) {
    score += 7;
  }

  // 3) 고객 등급 가중치 (최대 20점)
  const gradeWeight = GRADE_WEIGHT[customer.grade] ?? 6;
  score += gradeWeight;
  if (customer.grade === 'VIP') factors.push('VIP 고객');

  // 4) 다음 연락 예정일 도래 (최대 15점)
  if (customer.nextContactAt) {
    const dueInDays = Math.ceil(
      (customer.nextContactAt.getTime() - now) / DAY,
    );
    if (dueInDays <= 0) {
      score += 15;
      factors.push('다음 연락 예정일이 지났습니다.');
    } else if (dueInDays <= 3) {
      score += 10;
      factors.push(`다음 연락 예정일까지 ${dueInDays}일`);
    }
  }

  // 5) 임박한 일정 (계약/갱신/기념일) (최대 10점)
  const soonSchedule = schedules.find(
    (s) =>
      s.status === 'PENDING' &&
      s.scheduleDate.getTime() - now <= 7 * DAY &&
      s.scheduleDate.getTime() - now >= -DAY,
  );
  if (soonSchedule) {
    score += 10;
    factors.push(`임박 일정: ${soonSchedule.title}`);
  }

  // 6) 관심분야 존재 시 재상담 여지 (최대 5점)
  if (customer.interests.length > 0) {
    score += 5;
    factors.push(`관심분야: ${customer.interests.join(', ')}`);
  }

  // 7) 사용자가 "관리필요" 태그 지정 (최대 10점)
  if (customer.tags?.some((t) => t.tag === '관리필요')) {
    score += 10;
    factors.push('사용자가 관리필요 태그 지정');
  }

  // 8) 생일 이번 주 (최대 8점)
  if (customer.birthDate && isBirthdayWithin(customer.birthDate, 7)) {
    score += 8;
    factors.push('이번 주 생일');
  }

  score = clamp(Math.round(score), 0, 100);

  return { score, priority: toPriority(score), factors };
}

export function toPriority(score: number): RecommendationPriority {
  if (score >= 80) return 'IMMEDIATE';
  if (score >= 60) return 'TODAY';
  if (score >= 40) return 'THIS_WEEK';
  return 'NORMAL';
}

function lastConsultDate(consultations: Consultation[]): Date | null {
  if (consultations.length === 0) return null;
  return consultations.reduce(
    (max, c) => (c.consultationDate > max ? c.consultationDate : max),
    consultations[0].consultationDate,
  );
}

function isBirthdayWithin(birthDate: Date, days: number): boolean {
  const now = new Date();
  const next = new Date(
    now.getFullYear(),
    birthDate.getMonth(),
    birthDate.getDate(),
  );
  if (next.getTime() < now.getTime() - DAY) {
    next.setFullYear(now.getFullYear() + 1);
  }
  const diff = (next.getTime() - now.getTime()) / DAY;
  return diff >= -1 && diff <= days;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
