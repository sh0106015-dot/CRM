import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const PRIORITIES = ['IMMEDIATE', 'TODAY', 'THIS_WEEK', 'NORMAL'];

describe('CRM flow (e2e): auth → customer → consultation → AI', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: ReturnType<typeof request>;

  const stamp = Date.now();
  const userA = { name: '이설계', email: `flow-a-${stamp}@e2e.test`, password: 'e2e-pass-1234' };
  const userB = { name: '박설계', email: `flow-b-${stamp}@e2e.test`, password: 'e2e-pass-1234' };

  let tokenA = '';
  let tokenB = '';
  let customerId = '';
  let consultationId = '';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: [userA.email, userB.email] } } });
    await app.close();
  });

  // --- 인증 -----------------------------------------------------------------
  it('회원가입 → accessToken 발급', async () => {
    const res = await http.post('/api/auth/register').send(userA).expect(201);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ email: userA.email, name: userA.name });
    tokenA = res.body.accessToken;
  });

  it('중복 이메일 회원가입 → 409', async () => {
    await http.post('/api/auth/register').send(userA).expect(409);
  });

  it('로그인 → 토큰 재발급', async () => {
    const res = await http
      .post('/api/auth/login')
      .send({ email: userA.email, password: userA.password })
      .expect(201);
    expect(res.body.accessToken).toEqual(expect.any(String));
    tokenA = res.body.accessToken;
  });

  it('잘못된 비밀번호 → 401', async () => {
    await http
      .post('/api/auth/login')
      .send({ email: userA.email, password: 'wrong-password' })
      .expect(401);
  });

  it('GET /auth/me — 토큰 없으면 401, 있으면 이메일 반환', async () => {
    await http.get('/api/auth/me').expect(401);
    const res = await http.get('/api/auth/me').set(auth(tokenA)).expect(200);
    expect(res.body.email).toBe(userA.email);
  });

  // --- 고객 ---------------------------------------------------------------
  it('고객 등록 (필수값 누락 → 400)', async () => {
    await http.post('/api/customers').set(auth(tokenA)).send({ name: '홍길동' }).expect(400);
  });

  it('고객 등록 → 태그·관심분야 저장', async () => {
    const res = await http
      .post('/api/customers')
      .set(auth(tokenA))
      .send({
        name: '김고객',
        phone: '010-5555-1234',
        grade: 'VIP',
        interests: ['건강보험'],
        tags: ['VIP', '관리필요'],
      })
      .expect(201);
    expect(res.body.id).toEqual(expect.any(String));
    expect(res.body.tags.map((t: { tag: string }) => t.tag).sort()).toEqual(['VIP', '관리필요']);
    customerId = res.body.id;
  });

  it('고객 검색 → q 로 조회', async () => {
    const res = await http
      .get('/api/customers')
      .query({ q: '김고객', sort: 'AI_SCORE' })
      .set(auth(tokenA))
      .expect(200);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
    expect(res.body.items.some((c: { id: string }) => c.id === customerId)).toBe(true);
  });

  it('고객 상세 → 상담이력 비어있고 추천 없음', async () => {
    const res = await http.get(`/api/customers/${customerId}`).set(auth(tokenA)).expect(200);
    expect(res.body.consultations).toEqual([]);
    expect(res.body.recommendation).toBeNull();
  });

  it('고객 수정 → 등급 변경 반영', async () => {
    await http
      .patch(`/api/customers/${customerId}`)
      .set(auth(tokenA))
      .send({ grade: 'GENERAL', notes: '메모 추가' })
      .expect(200);
    const res = await http.get(`/api/customers/${customerId}`).set(auth(tokenA)).expect(200);
    expect(res.body.grade).toBe('GENERAL');
    expect(res.body.notes).toBe('메모 추가');
  });

  // --- 태그 일괄 관리 (PRD 16) ----------------------------------------
  it('태그 목록 → 사용 중 태그 + 고객 수', async () => {
    const res = await http.get('/api/tags').set(auth(tokenA)).expect(200);
    const map = Object.fromEntries(
      res.body.map((t: { tag: string; count: number }) => [t.tag, t.count]),
    );
    expect(map['VIP']).toBeGreaterThanOrEqual(1);
    expect(map['관리필요']).toBeGreaterThanOrEqual(1);
  });

  it('태그 이름 일괄 변경 → 모든 고객에 반영', async () => {
    const r = await http
      .patch('/api/tags/VIP')
      .set(auth(tokenA))
      .send({ newTag: '우수고객' })
      .expect(200);
    expect(r.body.renamed).toBeGreaterThanOrEqual(1);

    const detail = await http.get(`/api/customers/${customerId}`).set(auth(tokenA)).expect(200);
    const tags = detail.body.tags.map((t: { tag: string }) => t.tag);
    expect(tags).toContain('우수고객');
    expect(tags).not.toContain('VIP');
  });

  it('선택 고객에 태그 부여/제거', async () => {
    const add = await http
      .post('/api/tags/신규/apply')
      .set(auth(tokenA))
      .send({ customerIds: [customerId] })
      .expect(201);
    expect(add.body.added).toBe(1);

    let detail = await http.get(`/api/customers/${customerId}`).set(auth(tokenA)).expect(200);
    expect(detail.body.tags.map((t: { tag: string }) => t.tag)).toContain('신규');

    await http
      .post('/api/tags/신규/remove')
      .set(auth(tokenA))
      .send({ customerIds: [customerId] })
      .expect(201);
    detail = await http.get(`/api/customers/${customerId}`).set(auth(tokenA)).expect(200);
    expect(detail.body.tags.map((t: { tag: string }) => t.tag)).not.toContain('신규');
  });

  it('태그 일괄 삭제', async () => {
    await http.delete('/api/tags/관리필요').set(auth(tokenA)).expect(200);
    const res = await http.get('/api/tags').set(auth(tokenA)).expect(200);
    expect(res.body.map((t: { tag: string }) => t.tag)).not.toContain('관리필요');
  });

  it('태그로 고객 필터링 (?tag=)', async () => {
    const hit = await http
      .get('/api/customers')
      .query({ tag: '우수고객' })
      .set(auth(tokenA))
      .expect(200);
    expect(hit.body.items.some((c: { id: string }) => c.id === customerId)).toBe(true);

    const miss = await http
      .get('/api/customers')
      .query({ tag: '존재하지않는태그' })
      .set(auth(tokenA))
      .expect(200);
    expect(miss.body.items.some((c: { id: string }) => c.id === customerId)).toBe(false);
  });

  // --- 상담 기록 --------------------------------------------------------
  it('상담 기록 저장 (autoSummarize) → 요약 생성 + 마지막 연락일 갱신', async () => {
    const before = await http.get(`/api/customers/${customerId}`).set(auth(tokenA)).expect(200);
    expect(before.body.lastContactAt).toBeNull();

    const res = await http
      .post(`/api/customers/${customerId}/consultations`)
      .set(auth(tokenA))
      .send({
        content: '고객과 통화함. 건강검진 예정. 다음 달 다시 연락하기로 함.',
        autoSummarize: true,
      })
      .expect(201);
    expect(res.body.content).toContain('건강검진');
    expect(res.body.summary).toEqual(expect.any(String));
    expect(res.body.summary.length).toBeGreaterThan(0);

    const after = await http.get(`/api/customers/${customerId}`).set(auth(tokenA)).expect(200);
    expect(after.body.lastContactAt).not.toBeNull();
    expect(after.body.consultations).toHaveLength(1);
  });

  it('상담이력 목록 조회', async () => {
    const res = await http
      .get(`/api/customers/${customerId}/consultations`)
      .set(auth(tokenA))
      .expect(200);
    expect(res.body).toHaveLength(1);
    consultationId = res.body[0].id;
  });

  it('상담 기록 수정 → 내용 반영', async () => {
    await http
      .patch(`/api/customers/${customerId}/consultations/${consultationId}`)
      .set(auth(tokenA))
      .send({ content: '수정된 상담 내용', nextAction: '다음 주 재확인' })
      .expect(200);
    const list = await http
      .get(`/api/customers/${customerId}/consultations`)
      .set(auth(tokenA))
      .expect(200);
    expect(list.body[0].content).toBe('수정된 상담 내용');
    expect(list.body[0].nextAction).toBe('다음 주 재확인');
  });

  it('상담 기록 삭제', async () => {
    await http
      .delete(`/api/customers/${customerId}/consultations/${consultationId}`)
      .set(auth(tokenA))
      .expect(200);
    const list = await http
      .get(`/api/customers/${customerId}/consultations`)
      .set(auth(tokenA))
      .expect(200);
    expect(list.body).toHaveLength(0);
  });

  // --- 일정 --------------------------------------------------------------
  it('일정 생성 → 완료 처리 → 삭제', async () => {
    const created = await http
      .post('/api/schedules')
      .set(auth(tokenA))
      .send({
        title: '이준호 고객 전화',
        scheduleDate: new Date(Date.now() + 86_400_000).toISOString(),
        type: 'PHONE_CONSULT',
        customerId,
      })
      .expect(201);
    const scheduleId = created.body.id;
    expect(created.body.status).toBe('PENDING');

    await http
      .patch(`/api/schedules/${scheduleId}`)
      .set(auth(tokenA))
      .send({ status: 'DONE' })
      .expect(200);

    const list = await http.get('/api/schedules').set(auth(tokenA)).expect(200);
    expect(list.body.find((s: { id: string }) => s.id === scheduleId)?.status).toBe('DONE');

    await http.delete(`/api/schedules/${scheduleId}`).set(auth(tokenA)).expect(200);
  });

  it('AI 상담 요약 (저장 없음)', async () => {
    const res = await http
      .post('/api/ai/summarize')
      .set(auth(tokenA))
      .send({ content: '10분 통화. 건강검진 예약함. 기존 보험 점검 희망. 다음 달 초 대면 예정.' })
      .expect(201);
    expect(res.body.summary).toEqual(expect.any(String));
    expect(Array.isArray(res.body.keyPoints)).toBe(true);
  });

  // --- AI 분석 / 추천 / 문자 ------------------------------------------
  it('AI 고객분석 → 관리점수 + 우선순위 + 추천', async () => {
    const res = await http
      .post(`/api/ai/customers/${customerId}/analyze`)
      .set(auth(tokenA))
      .expect(201);
    expect(res.body.score).toBeGreaterThanOrEqual(0);
    expect(res.body.score).toBeLessThanOrEqual(100);
    expect(PRIORITIES).toContain(res.body.priority);
    expect(res.body.recommendation).toEqual(expect.any(String));
    expect(res.body.reason).toEqual(expect.any(String));
  });

  it('AI 다음 행동 추천 → 문자열 배열', async () => {
    const res = await http
      .get(`/api/ai/customers/${customerId}/next-actions`)
      .set(auth(tokenA))
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]).toEqual(expect.any(String));
  });

  it('AI 문자 생성 → 저장되고 상세에 노출', async () => {
    const res = await http
      .post(`/api/ai/customers/${customerId}/message`)
      .set(auth(tokenA))
      .send({ purpose: '안부 연락', tone: '정중하게' })
      .expect(201);
    expect(res.body.content).toEqual(expect.any(String));
    expect(res.body.content.length).toBeGreaterThan(0);

    const detail = await http.get(`/api/customers/${customerId}`).set(auth(tokenA)).expect(200);
    expect(detail.body.messages.length).toBeGreaterThanOrEqual(1);
  });

  it('AI 관리점수 재계산 + 대시보드', async () => {
    const recompute = await http.post('/api/ai/recompute').set(auth(tokenA)).expect(201);
    expect(recompute.body.updated).toBeGreaterThanOrEqual(1);

    const dash = await http.get('/api/ai/dashboard').set(auth(tokenA)).expect(200);
    for (const p of PRIORITIES) {
      expect(dash.body.counts).toHaveProperty(p);
    }
    expect(Array.isArray(dash.body.needsCareToday)).toBe(true);
  });

  it('AI 주간 리포트 → 통계 + 분석 텍스트', async () => {
    const res = await http.get('/api/ai/report/weekly').set(auth(tokenA)).expect(200);
    expect(res.body.stats).toEqual(
      expect.objectContaining({
        total: expect.any(Number),
        newCustomers: expect.any(Number),
        consulted: expect.any(Number),
        longUnmanaged: expect.any(Number),
      }),
    );
    expect(res.body.analysis).toEqual(expect.any(String));
    expect(res.body.stats.total).toBeGreaterThanOrEqual(1);
  });

  // --- 내 정보 / 설정 (PRD 21) --------------------------------------
  it('GET /me — 프로필 + 기본 설정값', async () => {
    const res = await http.get('/api/me').set(auth(tokenA)).expect(200);
    expect(res.body).toMatchObject({ email: userA.email, name: userA.name });
    expect(res.body.preferences).toMatchObject({
      dailyDigestEnabled: true,
      aiMessageTone: '정중하게',
      aiRecommendationFrequency: 'DAILY',
    });
  });

  it('설정 변경 → 병합 저장', async () => {
    const patched = await http
      .patch('/api/me/preferences')
      .set(auth(tokenA))
      .send({ dailyDigestEnabled: false, aiMessageTone: '친근하게' })
      .expect(200);
    expect(patched.body).toMatchObject({
      dailyDigestEnabled: false,
      aiMessageTone: '친근하게',
      notifyBirthday: true, // 건드리지 않은 값은 유지
    });

    const again = await http.get('/api/me/preferences').set(auth(tokenA)).expect(200);
    expect(again.body.dailyDigestEnabled).toBe(false);
    expect(again.body.aiMessageTone).toBe('친근하게');
  });

  it('잘못된 설정 값 → 400', async () => {
    await http
      .patch('/api/me/preferences')
      .set(auth(tokenA))
      .send({ aiRecommendationFrequency: 'HOURLY' })
      .expect(400);
  });

  it('비밀번호 변경 → 이전 비번 무효, 새 비번 로그인 성공', async () => {
    const newPassword = 'e2e-pass-9999';

    await http
      .patch('/api/me/password')
      .set(auth(tokenA))
      .send({ currentPassword: 'totally-wrong', newPassword })
      .expect(401);

    await http
      .patch('/api/me/password')
      .set(auth(tokenA))
      .send({ currentPassword: userA.password, newPassword: userA.password })
      .expect(400);

    await http
      .patch('/api/me/password')
      .set(auth(tokenA))
      .send({ currentPassword: userA.password, newPassword })
      .expect(200);

    await http
      .post('/api/auth/login')
      .send({ email: userA.email, password: userA.password })
      .expect(401);

    const relogin = await http
      .post('/api/auth/login')
      .send({ email: userA.email, password: newPassword })
      .expect(201);
    tokenA = relogin.body.accessToken;
    userA.password = newPassword;
  });

  // --- OAuth ----------------------------------------------------------
  it('OAuth — 미구성 서버는 401, 형식 오류는 400', async () => {
    // idToken 누락 → 400 (validation)
    await http.post('/api/auth/oauth/google').send({}).expect(400);
    // 구성 안 됨(GOOGLE_CLIENT_ID 미설정) 또는 잘못된 토큰 → 401
    await http
      .post('/api/auth/oauth/google')
      .send({ idToken: 'not-a-real-token' })
      .expect(401);
    await http
      .post('/api/auth/oauth/apple')
      .send({ identityToken: 'not-a-real-token' })
      .expect(401);
  });

  // --- 푸시 알림 -----------------------------------------------------
  it('디바이스 토큰 등록/해제 + 다이제스트 수동 실행', async () => {
    const token = `ExponentPushToken[e2e-${stamp}]`;

    await http.post('/api/devices').expect(401); // 인증 필요
    const reg = await http
      .post('/api/devices')
      .set(auth(tokenA))
      .send({ token, platform: 'ANDROID' })
      .expect(201);
    expect(reg.body.token).toBe(token);

    // 재등록(upsert) 도 성공해야 한다
    await http.post('/api/devices').set(auth(tokenA)).send({ token }).expect(201);

    const digest = await http
      .post('/api/notifications/daily-digest/run')
      .set(auth(tokenA))
      .expect(201);
    expect(digest.body).toHaveProperty('body');
    expect(digest.body).toHaveProperty('careCount');
    expect(digest.body.deviceCount).toBeGreaterThanOrEqual(1);

    await http
      .delete(`/api/devices/${encodeURIComponent(token)}`)
      .set(auth(tokenA))
      .expect(200);
  });

  // --- 테넌트 격리 ----------------------------------------------------
  it('다른 사용자는 남의 고객에 접근 불가 (404)', async () => {
    const reg = await http.post('/api/auth/register').send(userB).expect(201);
    tokenB = reg.body.accessToken;

    await http.get(`/api/customers/${customerId}`).set(auth(tokenB)).expect(404);
    await http
      .post(`/api/ai/customers/${customerId}/analyze`)
      .set(auth(tokenB))
      .expect(404);
  });

  it('회원탈퇴 → 이후 내 정보 조회 불가', async () => {
    await http.delete('/api/me').set(auth(tokenB)).expect(200);
    await http.get('/api/me').set(auth(tokenB)).expect(404);
    tokenB = ''; // afterAll 정리 대상에서 실질적으로 제외 (이미 삭제됨)
  });
});

function auth(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
