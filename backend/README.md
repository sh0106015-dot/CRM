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
| `GOOGLE_CLIENT_ID` | Google OAuth 클라이언트 ID (콤마로 복수) — 없으면 401 | — |
| `APPLE_CLIENT_ID` | Apple 서비스/번들 ID — 없으면 401 | — |
| `EXPO_ACCESS_TOKEN` | Expo Push 액세스 토큰 (선택) | — |
| `DIGEST_CRON_ENABLED` | 매일 09:00 다이제스트 크론 | `true` |

## API 개요 (`/api` prefix)

### 인증 — `AuthModule`
| Method | Path | 설명 |
| --- | --- | --- |
| POST | `/auth/register` | 회원가입 → `{ accessToken, user }` |
| POST | `/auth/login` | 로그인 |
| POST | `/auth/oauth/google` | `{ idToken }` — 앱이 받은 Google ID 토큰 검증 → JWT 발급 |
| POST | `/auth/oauth/apple` | `{ identityToken, fullName? }` — Apple identity 토큰 검증 → JWT 발급 |
| GET | `/auth/me` | 내 정보 (Bearer) |

OAuth 는 앱에서 네이티브 로그인 → 공급자 ID 토큰을 서버로 전달 → 서버가 검증 후
`provider`+`providerId`(없으면 이메일)로 계정을 연결/생성한다. 클라이언트 ID 미설정 시 401.

### 사용자 — `UsersModule` (PRD 21)
| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/me` | 프로필 + 병합된 설정값 |
| GET | `/me/preferences` | 설정 (기본값 위에 저장분 병합) |
| PATCH | `/me/preferences` | 설정 부분 변경 (`dailyDigestEnabled`, `notify*`, `aiMessageTone`, `aiRecommendationFrequency`) |
| PATCH | `/me/password` | 비밀번호 변경 `{ currentPassword, newPassword }` (소셜 계정 400, 오답 401) |
| GET | `/me/apply-link` | 공개 상담 신청 링크 토큰 (없으면 발급) |
| POST | `/me/apply-link/rotate` | 링크 토큰 재발급 (기존 무효화) |
| DELETE | `/me` | 회원탈퇴 (관련 데이터 cascade 삭제) |

### 공개 — `PublicModule` (인증 불필요)
| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/public/apply/:token` | 상담 신청 폼용 설계사 정보 `{ agentName }` (유효하지 않은 토큰 404) |
| POST | `/public/apply/:token` | 상담 신청 `{ name, phone, interest?, message? }` → 해당 설계사의 잠재고객 생성 (태그 `잠재고객`·`상담신청`, `grade: POTENTIAL`, `consultStatus: SCHEDULED`) |

- `dailyDigestEnabled: false` 사용자는 09:00 다이제스트 크론에서 제외된다.
- 설정은 `users.preferences` JSON 컬럼에 저장 (마이그레이션 `20260830074711_user_preferences`).

### 알림 — `NotificationsModule` (PRD 19)
| Method | Path | 설명 |
| --- | --- | --- |
| POST | `/devices` | 푸시 토큰 등록 `{ token, platform }` (앱 시작 시 upsert) |
| DELETE | `/devices/:token` | 푸시 토큰 해제 (로그아웃 시) |
| POST | `/notifications/daily-digest/run` | 지금 나에게 다이제스트 발송 (수동/테스트) |

- `PushService` 가 토큰 형태로 경로를 나눈다:
  - `ExponentPushToken[...]` / `ExpoPushToken[...]` → **Expo Push Service** (Android=FCM, iOS=APNs)
  - 그 외(standalone 빌드의 원시 FCM 등록 토큰) → **firebase-admin** (`FcmService`).
    `FIREBASE_SERVICE_ACCOUNT` 또는 `GOOGLE_APPLICATION_CREDENTIALS` 미설정 시 해당 토큰은 건너뜀.
- 매일 09:00 `DigestScheduler` 크론이 전체 사용자에게 "오늘 관리 추천 N명 · 내일 상담 N건" 푸시.
- 유효하지 않은 토큰(`DeviceNotRegistered` / FCM `registration-token-not-registered`)은 발송 시 자동 정리.

### 고객 — `CustomersModule` (PRD 7·8·16·17)
| Method | Path | 설명 |
| --- | --- | --- |
| POST | `/customers` | 고객 등록 (tags, interests 포함) |
| POST | `/customers/from-card` | 명함 이미지(base64) → 고객 정보 초안 (Claude 비전, 저장 안 함, AI 미구성 시 503) |
| GET | `/customers?q=&filter=&tag=&sort=&page=&pageSize=` | 검색·필터·태그·정렬·페이지네이션 |
| GET | `/customers/:id` | 상세 (상담이력·일정·태그·AI추천 포함) |
| PATCH | `/customers/:id` | 수정 (tags 전체 교체) |
| DELETE | `/customers/:id` | 삭제 |

- `filter`: `NEEDS_CARE` `RECENT_CONSULT` `LONG_UNMANAGED` `NEW` `VIP` `BIRTHDAY` `CONTRACT` `CONSULT_SCHEDULED`
- `tag`: 태그명 (콤마 구분 시 하나라도 일치)
- `sort`: `AI_SCORE`(기본) `LAST_CONTACT` `CREATED_AT` `NAME`

### 뉴스 — `NewsModule`
| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/news/today` | 홈 화면 "오늘의 뉴스" 브리핑 (가장 최근 `DailyNews` 1건) |
| POST | `/news/refresh` | 오늘자 브리핑을 지금 AI 로 재생성 (07:00 크론과 동일) |

- `DailyNews` (`date` unique, `quote`/`indices`/`sections` JSON) — 시드에 2026-09-02 샘플 포함.
- `NewsScheduler` 크론이 **매일 07:00** `NewsService.generateForToday()` 실행 (`NEWS_CRON_ENABLED`).
- 생성은 Claude(`LlmClient`)의 **web_search 도구**로 실제 오늘자 뉴스·지수·환율·유가를 조회해 만든다.
- `ANTHROPIC_API_KEY` 미설정 시 no-op — 직전 브리핑이 계속 제공된다.
- 계정에 웹 검색 도구가 비활성이면 검색 없이 생성되어 정확도가 떨어질 수 있다.

### 태그 — `TagsModule` (PRD 16)
| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/tags` | 사용 중 태그 + 고객 수 (많은 순) |
| PATCH | `/tags/:tag` | 이름 일괄 변경 `{ newTag }` (기존 태그 보유 고객은 병합) |
| DELETE | `/tags/:tag` | 모든 고객에서 해당 태그 제거 |
| POST | `/tags/:tag/apply` | 선택 고객에 태그 부여 `{ customerIds }` |
| POST | `/tags/:tag/remove` | 선택 고객에서 태그 제거 `{ customerIds }` |

### 상담 기록 — `ConsultationsModule` (PRD 12)
| Method | Path | 설명 |
| --- | --- | --- |
| POST | `/customers/:customerId/consultations` | 상담 기록 저장. `autoSummarize:true` 시 AI 요약 자동 생성, 고객 `lastContactAt`/`nextContactAt` 갱신 |
| GET | `/customers/:customerId/consultations` | 상담이력 (최신순) |
| PATCH | `/customers/:customerId/consultations/:id` | 수정 (`autoSummarize` 시 재요약) |
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
| `npm run test:e2e` | e2e — `test/crm-flow.e2e-spec.ts`: 회원가입/로그인/토큰 → 고객 CRUD → 상담 기록 CRUD(autoSummarize) → 태그 목록·이름변경·부여/제거·삭제 → 일정 생성·완료·삭제 → AI 분석·다음행동·문자·대시보드·주간리포트 → 설정 조회·변경 → 비밀번호 변경 → OAuth 미구성 401 → 디바이스 등록/다이제스트 → 테넌트 격리(404) → 회원탈퇴 |

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

MVP 백엔드 구현 완료 — 인증(이메일 + Google/Apple OAuth) · 고객/상담/일정 CRUD ·
AI 분석·추천·문자·요약·대시보드·주간리포트 · 푸시 알림(Expo Push) + 일일 다이제스트 크론.
Prisma 마이그레이션 3건 + 시드 + 유닛/e2e 테스트 + CI 통과.
미구현: 원시 firebase-admin FCM 경로(현재 Expo Push), 조직/관리자(B2B) 기능.
