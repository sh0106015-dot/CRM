import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { computeManagementScore } from '../src/ai/scoring';

const prisma = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);
const daysAhead = (n: number) => new Date(Date.now() + n * DAY);

/** 이번 달 15일생 (생일 필터/점수 테스트용) */
function birthdayThisMonth(year: number): Date {
  const d = new Date();
  return new Date(year, d.getMonth(), 15);
}

const DEMO_EMAIL = 'demo@crm.local';

async function main() {
  // --- 멱등성: 데모 계정과 하위 데이터 전체 삭제 (cascade) ---
  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } });

  const user = await prisma.user.create({
    data: {
      name: '김설계',
      email: DEMO_EMAIL,
      phone: '010-1000-0000',
      occupation: '보험설계사',
      passwordHash: await bcrypt.hash('demo1234', 12),
    },
  });
  console.log(`✔ 데모 사용자 생성: ${user.email} / demo1234`);

  type Seed = {
    name: string;
    phone: string;
    grade: 'NEW' | 'GENERAL' | 'LONGTERM' | 'VIP' | 'POTENTIAL';
    interests: string[];
    tags: string[];
    lastContactAt: Date | null;
    nextContactAt?: Date | null;
    consultStatus?: 'NONE' | 'IN_PROGRESS' | 'SCHEDULED' | 'DONE';
    birthDate?: Date;
    gender?: 'MALE' | 'FEMALE';
    notes?: string;
    consultations?: {
      date: Date;
      content: string;
      summary?: string;
      nextAction?: string;
      nextContactDate?: Date;
    }[];
    schedules?: {
      title: string;
      date: Date;
      type:
        | 'CONTACT'
        | 'PHONE_CONSULT'
        | 'VISIT_CONSULT'
        | 'CONTRACT'
        | 'RENEWAL'
        | 'ANNIVERSARY'
        | 'ETC';
      memo?: string;
    }[];
  };

  const seeds: Seed[] = [
    {
      name: '이준호',
      phone: '010-2345-1001',
      grade: 'VIP',
      gender: 'MALE',
      interests: ['건강보험', '암보험'],
      tags: ['VIP', '관리필요'],
      lastContactAt: daysAgo(45),
      notes: '건강검진 결과 상담 희망. 배우자 보험도 관심.',
      consultStatus: 'NONE',
      consultations: [
        {
          date: daysAgo(45),
          content:
            '건강보험 리모델링 관련 상담. 최근 건강검진에서 경계 수치가 나와 보장 강화를 고민 중. 다음 달 재검 후 다시 논의하기로 함.',
          summary: '건강검진 경계 수치로 보장 강화 검토. 재검 후 재상담.',
          nextAction: '재검 결과 확인 후 보장분석 자료 준비',
          nextContactDate: daysAgo(15),
        },
        {
          date: daysAgo(120),
          content: '암보험 신규 가입 문의. 가족력 있어 진단금 5천 이상 희망.',
          summary: '가족력으로 암 진단금 5천 이상 희망',
        },
      ],
      schedules: [
        {
          title: '이준호 고객 전화상담 (재검 결과)',
          date: daysAhead(1),
          type: 'PHONE_CONSULT',
          memo: '건강검진 재검 결과 확인',
        },
      ],
    },
    {
      name: '박서연',
      phone: '010-2345-1002',
      grade: 'GENERAL',
      gender: 'FEMALE',
      interests: ['자동차보험'],
      tags: ['상담중'],
      lastContactAt: daysAgo(9),
      consultStatus: 'IN_PROGRESS',
      consultations: [
        {
          date: daysAgo(9),
          content:
            '자동차보험 갱신 견적 요청. 현재 보험사 대비 특약 조정으로 보험료 절감 가능한지 확인 중.',
          summary: '자동차보험 갱신 견적 비교 진행 중',
          nextAction: '3개 보험사 견적 비교표 전달',
        },
      ],
    },
    {
      name: '최민재',
      phone: '010-2345-1003',
      grade: 'NEW',
      gender: 'MALE',
      interests: ['실손보험'],
      tags: ['신규', '잠재고객'],
      lastContactAt: null,
      notes: '지인 소개. 첫 연락 예정.',
    },
    {
      name: '정하윤',
      phone: '010-2345-1004',
      grade: 'LONGTERM',
      gender: 'FEMALE',
      interests: ['종신보험', '연금'],
      tags: ['장기고객'],
      lastContactAt: daysAgo(82),
      nextContactAt: daysAgo(10),
      notes: '10년 이상 유지 고객. 연금 전환 시점 문의했었음.',
      consultations: [
        {
          date: daysAgo(82),
          content:
            '종신보험 연금전환 가능 시점과 예상 수령액 문의. 자녀 대학 학자금 계획과 연계해서 검토 요청.',
          summary: '연금전환 시점/수령액 문의, 학자금 계획 연계 검토',
          nextAction: '연금전환 예시표 + 학자금 설계안 준비',
          nextContactDate: daysAgo(60),
        },
      ],
      schedules: [
        {
          title: '정하윤 고객 종신보험 계약 검토',
          date: daysAhead(5),
          type: 'CONTRACT',
          memo: '연금전환 신청서 준비',
        },
      ],
    },
    {
      name: '강도현',
      phone: '010-2345-1005',
      grade: 'POTENTIAL',
      gender: 'MALE',
      interests: ['화재보험'],
      tags: ['소개'],
      lastContactAt: daysAgo(20),
      birthDate: birthdayThisMonth(1990),
      notes: '자영업(카페). 사업장 화재보험 관심.',
      consultations: [
        {
          date: daysAgo(20),
          content: '카페 사업장 화재보험 문의. 집기/인테리어 포함 보장 범위 확인.',
          summary: '사업장 화재보험 보장범위 확인 요청',
        },
      ],
    },
    {
      name: '윤채원',
      phone: '010-2345-1006',
      grade: 'VIP',
      gender: 'FEMALE',
      interests: ['암보험', '어린이보험'],
      tags: ['VIP', '가족'],
      lastContactAt: daysAgo(28),
      consultStatus: 'SCHEDULED',
      notes: '자녀 2명 어린이보험 가입 완료. 갱신 임박.',
      schedules: [
        {
          title: '윤채원 고객 어린이보험 갱신 안내',
          date: daysAhead(3),
          type: 'RENEWAL',
        },
        {
          title: '윤채원 고객 대면상담',
          date: daysAhead(9),
          type: 'VISIT_CONSULT',
          memo: '카페에서 오전 11시',
        },
      ],
    },
    {
      name: '임준영',
      phone: '010-2345-1007',
      grade: 'GENERAL',
      gender: 'MALE',
      interests: ['운전자보험'],
      tags: [],
      lastContactAt: daysAgo(4),
      consultations: [
        {
          date: daysAgo(4),
          content: '운전자보험 벌금/변호사선임비 특약 문의. 자료 검토 후 연락 주기로 함.',
          summary: '운전자보험 특약 문의, 자료 검토 중',
          nextAction: '특약별 보험료 비교 자료 발송',
          nextContactDate: daysAhead(3),
        },
      ],
    },
    {
      name: '한지우',
      phone: '010-2345-1008',
      grade: 'GENERAL',
      gender: 'FEMALE',
      interests: ['치아보험'],
      tags: ['관리필요'],
      lastContactAt: daysAgo(64),
      notes: '치아보험 가입 후 연락 뜸함. 안부 필요.',
    },
  ];

  let customerCount = 0;
  let consultCount = 0;
  let scheduleCount = 0;

  for (const s of seeds) {
    const customer = await prisma.customer.create({
      data: {
        userId: user.id,
        name: s.name,
        phone: s.phone,
        gender: s.gender,
        grade: s.grade,
        interests: s.interests,
        consultStatus: s.consultStatus ?? 'NONE',
        lastContactAt: s.lastContactAt ?? undefined,
        nextContactAt: s.nextContactAt ?? undefined,
        birthDate: s.birthDate,
        notes: s.notes,
        tags: s.tags.length ? { create: s.tags.map((tag) => ({ tag })) } : undefined,
        consultations: s.consultations?.length
          ? {
              create: s.consultations.map((c) => ({
                consultationDate: c.date,
                content: c.content,
                summary: c.summary,
                nextAction: c.nextAction,
                nextContactDate: c.nextContactDate,
              })),
            }
          : undefined,
      },
    });
    customerCount += 1;
    consultCount += s.consultations?.length ?? 0;

    if (s.schedules?.length) {
      await prisma.schedule.createMany({
        data: s.schedules.map((sc) => ({
          userId: user.id,
          customerId: customer.id,
          title: sc.title,
          scheduleDate: sc.date,
          type: sc.type,
          memo: sc.memo,
        })),
      });
      scheduleCount += s.schedules.length;
    }
  }

  // --- 개인 일정 (고객 미연결) ---
  await prisma.schedule.createMany({
    data: [
      {
        userId: user.id,
        title: '오늘 미팅 준비 - 견적서 3건 정리',
        scheduleDate: new Date(new Date().setHours(18, 0, 0, 0)),
        type: 'ETC',
      },
      {
        userId: user.id,
        title: '주간 고객관리 리뷰',
        scheduleDate: daysAhead(2),
        type: 'ETC',
      },
    ],
  });
  scheduleCount += 2;

  // --- AI 관리점수/추천 (규칙 기반) 초기 계산 ---
  const customers = await prisma.customer.findMany({
    where: { userId: user.id },
    include: {
      tags: true,
      consultations: true,
      schedules: { where: { status: 'PENDING' } },
    },
  });

  for (const c of customers) {
    const scoring = computeManagementScore({
      customer: c,
      consultations: c.consultations,
      schedules: c.schedules,
    });
    const topic = c.interests[0] ? `${c.interests[0]} ` : '';
    await prisma.aiRecommendation.create({
      data: {
        customerId: c.id,
        score: scoring.score,
        priority: scoring.priority,
        reason: scoring.factors.join(' ') || '특이사항 없음.',
        recommendation:
          scoring.priority === 'NORMAL'
            ? '현재 관리 상태 양호. 다음 정기 연락 시점에 맞춰 연락하세요.'
            : `안부 연락 후 ${topic}관련 니즈를 확인하세요.`,
        recommendedChannel: '문자 → 전화 상담',
        recommendedAt:
          scoring.priority === 'IMMEDIATE'
            ? new Date()
            : scoring.priority === 'TODAY'
              ? daysAhead(1)
              : daysAhead(5),
      },
    });
  }

  console.log(
    `✔ 고객 ${customerCount}명 / 상담 ${consultCount}건 / 일정 ${scheduleCount}건 / AI추천 ${customers.length}건 생성`,
  );

  await seedDailyNews();

  console.log('\n로그인: demo@crm.local / demo1234');
}

/** 홈 화면 "오늘의 뉴스" 샘플 브리핑 */
async function seedDailyNews() {
  const date = new Date('2026-09-02');
  const payload = {
    quote: {
      text: '대부분 사람은 사과를 자신이 죄책감을 더는 만큼만 하는데 사과는 상대방이 원하는 만큼 해야 하지 않을까?',
      author: '영화배우 차승원',
    },
    indices: [
      { label: '코스피 지수', value: '6,835' },
      { label: '코스닥 지수', value: '821' },
      { label: '미국', unit: '원/달러', value: '1,373' },
      { label: '일본', unit: '원/100엔', value: '858' },
      { label: '휘발유', unit: '원/리터당', value: '1,860' },
      { label: '경유', unit: '원/리터당', value: '1,844' },
    ],
    sections: [
      {
        title: '주요 뉴스',
        items: [
          {
            title: '내년 예산 821조·지출 최대 증가… 162조 미래대응기금 신설',
            body: '내년도 예산안이 총지출 820조원을 웃도는 사상 최대 규모로 편성됐다. 반도체 호황으로 총수입이 200조원 급증하는 상황에 대응해 160조원 규모 미래대응기금이 신설된다.',
          },
          {
            title: '13대 추석 성수품 공급 평시의 1.6배 확대… 돼지고기 역대 최대',
            body: '정부가 추석을 앞두고 성수품 공급을 평시 대비 두 배 가까이 늘리고, 대대적인 농축산물 할인 지원에 나선다. 13대 성수품 16만 3천t을 공급한다.',
          },
          {
            title: '"SRT 플랫폼 찾아뛰던 고생 끝"… KTX·SRT 통합 운행 스타트',
            body: 'KTX와 SRT가 통합 운행을 시작했다. 한 개의 앱에서 기차표를 예매할 수 있어 편해졌다. 두 노선 통합은 10년 만이다.',
          },
          {
            title: '외국인 국민연금 심사 강화한다… 실거주 기간만 추납 가능',
            body: '한국에서 단기간만 일하고 국민연금 보험료를 대거 추납하는 외국인에 대한 심사가 강화된다.',
          },
          {
            title: '국교위 초등 저학년 3시 하교 검토… 교원단체 "국가 아동학대"',
            body: '초등학교 1·2학년의 하교 시간을 오후 1시 무렵에서 3시로 연장하는 교육시간 확대 의견 수렴에 나설 예정이다.',
          },
        ],
      },
      {
        title: '보험관련 소식',
        items: [
          {
            title: '"소상공인 사망 시 대출 갚아준다"… 보험업권, 무료 상생보험 출시',
            body: '보험사들이 7개 지자체와 손잡고 지역 소상공인 대상 무료 상생보험을 선보인다. 약 100만명의 소상공인이 혜택을 받을 것으로 예상된다.',
          },
          {
            title: '실거주한 기간만큼만 외국인 국민연금 보험료 추납 가능',
            body: '외국인 추납 요건 중 국내 거주기간을 국내 실거주 기간으로 강화하도록 지침을 개정, 거주하지 않은 기간은 추납 신청이 불가능하도록 했다.',
          },
        ],
      },
      {
        title: '국제/글로벌경제 소식',
        items: [
          {
            title: '국정원 "북미정상회담 어느 때도 가능… 북미간 대화 징후"',
            body: '국가정보원은 북미 정상회담이 어느 때라도 가능한 상태라고 평가했다. 국회 정보위 전체회의에서 관련 내용을 보고했다.',
          },
          {
            title: '北, 대북 적대시 정책 연일 부각… "트럼프에 결단 촉구" 해석',
            body: '북한의 비판적 반응은 트럼프 대통령에게 대화 전제조건 수용을 촉구하려는 의도라는 분석이 나온다.',
          },
        ],
      },
      {
        title: '기업/사회/연예/스포츠 등 기타',
        items: [
          {
            title: '"제주경찰관, 업무 부담감에 실종 허위종결"… 25건 추가 발견',
            body: '제주 경찰관이 업무 부담감으로 실종사건을 허위 종결한 것으로 조사됐다. 추가로 25건의 허위종결 사건이 발견됐다.',
          },
          {
            title: '비트코인 김치 프리미엄 부활… 한국 개미 돌아왔나 관심 집중',
            body: '한국 시장에서 비트코인이 국제 시세보다 비싸게 거래되는 김치 프리미엄이 되살아났다.',
          },
        ],
      },
      {
        title: '시사상식',
        items: [
          {
            title: '모두의 AI',
            body: '전 국민 누구나 무료로 이용할 수 있는 대국민 AI 서비스. 국산 AI 모델 기반의 범용 AI 챗봇과 공공 AI 에이전트를 구축, 전 국민 1인 1 에이전트 체계로 고도화하는 것을 목표로 한다.',
          },
        ],
      },
    ],
  };

  await prisma.dailyNews.upsert({
    where: { date },
    create: { date, ...payload },
    update: payload,
  });
  console.log('✔ 오늘의 뉴스 브리핑 1건 생성');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
