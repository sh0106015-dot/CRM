# CRM Backend

AI 스마트 고객관리 플랫폼의 백엔드 API 서버.

- **런타임**: Node.js 20+ / NestJS 10
- **DB**: PostgreSQL (Prisma ORM)
- **인증**: JWT (Bearer)
- **AI**: Anthropic Claude (`@anthropic-ai/sdk`) — `ANTHROPIC_API_KEY` 미설정 시 규칙 기반 폴백

전체 제품 요구사항은 [../docs/PRD.md](../docs/PRD.md) 참고.

## 빠른 시작

```bash
cd backend
npm install
cp .env.example .env          # 값 수정 (DATABASE_URL, JWT_SECRET, ANTHROPIC_API_KEY)
npm run prisma:generate
npm run prisma:migrate        # 최초 마이그레이션 생성 + 적용
npm run start:dev             # http://localhost:3000/api
```

PostgreSQL 이 필요합니다. 로컬에 없다면 Docker:

```bash
docker run --name crm-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=crm -p 5432:5432 -d postgres:16
```

## 환경 변수

| 변수 | 설명 | 기본값 |
| --- | --- | --- |
| `PORT` | 서버 포트 | `3000` |
| `DATABASE_URL` | PostgreSQL 연결 문자열 | — |
| `JWT_SECRET` | JWT 서명 키 | `change-me-in-production` |
| `JWT_EXPIRES_IN` | 토큰 만료 | `7d` |
| `ANTHROPIC_API_KEY` | Claude API 키 (없으면 규칙 기반 폴백) | — |
| `AI_MODEL` | 사용 모델 | `claude-opus-5` |

## API 개요 (`/api` prefix)

### 인증 — `AuthModule`
| Method | Path | 설명 |
| --- | --- | --- |
| POST | `/auth/register` | 회원가입 → `{ accessToken, user }` |
| POST | `/auth/login` | 로그인 |
| GET | `/auth/me` | 내 정보 (Bearer) |

### 고객 — `CustomersModule` (PRD 7·8·16·17)
| Method | Path | 설명 |
| --- | --- | --- |
| POST | `/customers` | 고객 등록 (tags, interests 포함) |
| GET | `/customers?q=&filter=&sort=&page=&pageSize=` | 검색·필터·정렬·페이지네이션 |
| GET | `/customers/:id` | 상세 (상담이력·일정·태그·AI추천 포함) |
| PATCH | `/customers/:id` | 수정 (tags 전체 교체) |
| DELETE | `/customers/:id` | 삭제 |

- `filter`: `NEEDS_CARE` `RECENT_CONSULT` `LONG_UNMANAGED` `NEW` `VIP` `BIRTHDAY` `CONTRACT` `CONSULT_SCHEDULED`
- `sort`: `AI_SCORE`(기본) `LAST_CONTACT` `CREATED_AT` `NAME`

### 상담 기록 — `ConsultationsModule` (PRD 12)
| Method | Path | 설명 |
| --- | --- | --- |
| POST | `/customers/:customerId/consultations` | 상담 기록 저장. `autoSummarize:true` 시 AI 요약 자동 생성, 고객 `lastContactAt`/`nextContactAt` 갱신 |
| GET | `/customers/:customerId/consultations` | 상담이력 (최신순) |
| DELETE | `/customers/:customerId/consultations/:id` | 삭제 |

### 일정 — `SchedulesModule` (PRD 14·19)
| Method | Path | 설명 |
| --- | --- | --- |
| POST | `/schedules` | 일정 생성 (고객 연결 optional) |
| GET | `/schedules?from=&to=` | 기간별 일정 |
| GET | `/schedules/today` | 오늘 처리할 일정 (알림 소스) |
| PATCH | `/schedules/:id` | 수정 / 상태 변경 |
| DELETE | `/schedules/:id` | 삭제 |

### AI — `AiModule` (PRD 9·10·11·13·15·18)
| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/ai/dashboard` | 홈 대시보드 — 우선순위별 카운트 + 오늘 관리 대상 (PRD 6-1) |
| GET | `/ai/report/weekly` | 주간 리포트 (PRD 18) |
| POST | `/ai/recompute` | 전체 고객 관리점수 재계산 (PRD 15) |
| POST | `/ai/customers/:customerId/analyze` | AI 고객분석 → `AiRecommendation` upsert (PRD 9) |
| GET | `/ai/customers/:customerId/next-actions` | 다음 행동 단계 추천 (PRD 10) |
| POST | `/ai/customers/:customerId/message` | 개인화 문자 생성 + 저장 (PRD 11) |
| POST | `/ai/summarize` | 상담 내용 요약 (저장 없음, PRD 13) |

## AI 설계 노트

- **관리점수**(`src/ai/scoring.ts`)는 100% 규칙 기반이다. PRD 15장에 따라
  상품 가입 가능성/보장 적정성은 판단하지 않는다.
- LLM 은 서술형 근거·행동 제안·문자·요약 생성에만 사용하며, 실패 시 항상
  규칙 기반 폴백으로 응답한다.
- PRD 31장(개인정보): 프롬프트에는 최소 데이터만 담는다 — 연락처·주소·생년월일은
  모델로 전송하지 않는다 (`AiService.profileForPrompt`).

## 테스트

| 명령 | 대상 |
| --- | --- |
| `npm test` | 유닛 테스트 — `src/**/*.spec.ts` (예: `ai/scoring.spec.ts` 규칙 기반 점수 로직) |
| `npm run test:e2e` | e2e — `test/crm-flow.e2e-spec.ts`: 회원가입/로그인/토큰 → 고객 CRUD → 상담 기록(autoSummarize) → AI 분석·다음행동·문자·대시보드 → 테넌트 격리(404) |

- e2e 는 실제 DB(`.env` 의 `DATABASE_URL`, `.env.test` 있으면 우선)에 붙어 돌며,
  `flow-*@e2e.test` 사용자를 만들고 `afterAll` 에서 cascade 삭제한다.
- `ANTHROPIC_API_KEY` 미설정 시 규칙 기반 폴백 경로를 검증한다 (네트워크·비용 없음).

## 스크립트

| 명령 | 설명 |
| --- | --- |
| `npm run start:dev` | 개발 서버 (watch) |
| `npm run build` | 프로덕션 빌드 |
| `npm run start:prod` | `dist/main` 실행 |
| `npm run prisma:migrate` | 마이그레이션 (dev) |
| `npm run prisma:seed` | 시드 데이터 |
| `npm run prisma:studio` | Prisma Studio |

## 상태

MVP 백엔드 구현 — 모듈/DI/라우팅/Prisma 스키마 + 첫 마이그레이션 + 시드 완료.
유닛·e2e 테스트 통과 (`npm test`, `npm run test:e2e`).
OAuth(Google/Apple)·FCM 푸시는 미구현.
