import { Consultation, Customer, CustomerTag, Schedule } from '@prisma/client';
import { computeManagementScore, toPriority } from './scoring';

const DAY = 24 * 60 * 60 * 1000;
const ago = (n: number) => new Date(Date.now() - n * DAY);
const ahead = (n: number) => new Date(Date.now() + n * DAY);

function customer(overrides: Partial<Customer> & { tags?: CustomerTag[] } = {}) {
  const base = {
    id: 'c1',
    userId: 'u1',
    name: '홍길동',
    phone: '010',
    customerNo: null,
    birthDate: null,
    gender: null,
    occupation: null,
    address: null,
    notes: null,
    grade: 'GENERAL',
    interests: [] as string[],
    consultStatus: 'NONE',
    lastContactAt: null,
    nextContactAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: [] as CustomerTag[],
  };
  return { ...base, ...overrides } as unknown as Customer & { tags: CustomerTag[] };
}

function consultation(date: Date): Consultation {
  return {
    id: 'x',
    customerId: 'c1',
    consultationDate: date,
    content: '내용',
    summary: null,
    nextAction: null,
    nextContactDate: null,
    createdAt: date,
    updatedAt: date,
  };
}

function schedule(date: Date, title = '일정'): Schedule {
  return {
    id: 's',
    customerId: 'c1',
    userId: 'u1',
    title,
    scheduleDate: date,
    type: 'CONTACT',
    status: 'PENDING',
    memo: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Schedule;
}

describe('computeManagementScore', () => {
  it('연락 이력이 없으면 근거에 표시하고 점수를 올린다', () => {
    const r = computeManagementScore({
      customer: customer(),
      consultations: [],
      schedules: [],
    });
    expect(r.factors).toContain('연락 이력이 없습니다.');
    expect(r.score).toBeGreaterThanOrEqual(30);
  });

  it('오래 방치된 VIP + 지난 예정일 → IMMEDIATE', () => {
    const r = computeManagementScore({
      customer: customer({
        grade: 'VIP',
        lastContactAt: ago(120),
        nextContactAt: ago(3),
        interests: ['건강보험'],
        tags: [{ id: 't', customerId: 'c1', tag: '관리필요', createdAt: new Date() }],
      }),
      consultations: [],
      schedules: [],
    });
    expect(r.score).toBeGreaterThanOrEqual(80);
    expect(r.priority).toBe('IMMEDIATE');
    expect(r.factors).toContain('VIP 고객');
    expect(r.factors).toContain('사용자가 관리필요 태그 지정');
  });

  it('최근 연락 + 최근 상담 → NORMAL', () => {
    const r = computeManagementScore({
      customer: customer({ lastContactAt: ago(2) }),
      consultations: [consultation(ago(2)), consultation(ago(10))],
      schedules: [],
    });
    expect(r.priority).toBe('NORMAL');
  });

  it('임박 일정이 근거에 포함된다', () => {
    const r = computeManagementScore({
      customer: customer({ lastContactAt: ago(20) }),
      consultations: [],
      schedules: [schedule(ahead(2), '계약 검토')],
    });
    expect(r.factors).toContain('임박 일정: 계약 검토');
  });

  it('점수는 0~100 으로 제한된다', () => {
    const r = computeManagementScore({
      customer: customer({
        grade: 'VIP',
        lastContactAt: ago(3650),
        nextContactAt: ago(30),
        interests: ['a', 'b'],
        birthDate: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 1),
        tags: [{ id: 't', customerId: 'c1', tag: '관리필요', createdAt: new Date() }],
      }),
      consultations: [],
      schedules: [schedule(ahead(1))],
    });
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.score).toBeGreaterThanOrEqual(0);
  });
});

describe('toPriority', () => {
  it.each([
    [100, 'IMMEDIATE'],
    [80, 'IMMEDIATE'],
    [79, 'TODAY'],
    [60, 'TODAY'],
    [59, 'THIS_WEEK'],
    [40, 'THIS_WEEK'],
    [39, 'NORMAL'],
    [0, 'NORMAL'],
  ])('%i → %s', (score, expected) => {
    expect(toPriority(score as number)).toBe(expected);
  });
});
