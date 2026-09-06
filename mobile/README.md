# CRM Mobile (Expo)

AI 스마트 고객관리 플랫폼의 모바일 앱.

- **프레임워크**: Expo SDK 57 · React Native 0.86 · expo-router (파일 기반 라우팅)
- **네비게이션**: 하단 5탭 (`홈 / 고객 / AI추천 / 일정 / 메뉴`) — `expo-router/js-tabs` + `@expo/vector-icons`(Ionicons). 네이티브·웹 모두 동일하게 렌더
- **인증**: 이메일/비번 + Google(`expo-auth-session`) + Apple(`expo-apple-authentication`). JWT 토큰은 `expo-secure-store` 에 저장
- **푸시**: `expo-notifications` — 로그인 시 Expo 푸시 토큰을 `/devices` 로 등록, 로그아웃 시 해제
- **백엔드**: `../backend` (NestJS, 기본 `:3000`)

## 실행

```bash
cd mobile
npm install
npx expo start          # QR 로 Expo Go 실행, 또는 a(안드로이드) / i(iOS) / w(웹)
```

먼저 백엔드를 띄우고 시드를 넣어야 합니다:

```bash
cd ../backend && npm run start:dev      # 별도 터미널
# (최초 1회) npm run prisma:seed  →  demo@crm.local / demo1234
```

## OAuth / 푸시 설정 (선택)

- **Google**: `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` / `_ANDROID_CLIENT_ID` / `_WEB_CLIENT_ID`
  (또는 `app.json` `extra.googleClientIds`). 미설정 시 버튼은 "구성 필요" 로 비활성.
- **Apple**: iOS 실기기/시뮬레이터에서만 노출. `app.json` `ios.usesAppleSignIn: true` 설정됨.
- **푸시**: 실기기에서만 토큰이 발급되며, 백엔드가 Expo Push Service 로 전달.
  백엔드에 `GOOGLE_CLIENT_ID` / `APPLE_CLIENT_ID` 도 함께 설정해야 검증이 통과한다.

## 백엔드 주소 설정

`src/lib/config.ts` 가 개발 환경을 자동 감지합니다.

| 환경 | 주소 |
| --- | --- |
| iOS 시뮬레이터 / 웹 | `http://localhost:3000/api` |
| Android 에뮬레이터 | `http://10.0.2.2:3000/api` |
| 실기기 (Expo Go) | Metro 번들러 PC의 LAN IP 재사용 |

수동 지정: `.env` 에 `EXPO_PUBLIC_API_URL=http://192.168.x.x:3000/api`

## 구조

```
src/
├── app/
│   ├── _layout.tsx         루트 Stack + 인증 게이트 (미로그인 → /login)
│   ├── login.tsx           로그인 / 회원가입
│   ├── customer/
│   │   ├── [id]/
│   │   │   ├── index.tsx        고객 상세 — 정보·상태·AI분석·다음행동·상담이력 + 문자 모달
│   │   │   │                    (상담이력 탭 → 수정, 액션바에 수정/일정+/상담+)
│   │   │   ├── edit.tsx         고객 수정 (모달) — PATCH /customers/:id
│   │   │   ├── consultation.tsx 상담 기록 작성/수정/삭제 (모달) — POST/PATCH/DELETE
│   │   │   │                    ?editId= 있으면 수정 모드. autoSummarize + /ai/summarize 미리보기
│   │   │   ├── document.tsx     증권/약관 분석 (모달) — PDF·이미지 선택 → /ai/summarize-document
│   │   │   │                    → 담보·날짜·유의사항, 고객 메모에 추가 가능
│   │   │   └── proposal.tsx     AI 상담 제안서 (모달) — /ai/.../proposal, 섹션별 렌더 + 전체 복사
│   │   └── new.tsx             고객 등록 (모달) — POST /customers
│   ├── schedule/
│   │   └── new.tsx             일정 추가 (모달) — POST /schedules (?customerId= 연결)
│   ├── report.tsx             주간 리포트 (모달) — GET /ai/report/weekly (홈 헤더에서 진입)
│   ├── tags.tsx               태그 관리 (모달) — 목록/이름변경(prompt)/삭제 (고객 헤더에서 진입)
│   ├── news.tsx               오늘의 뉴스 (모달) — GET /news/today, 지수·섹션별 뉴스 (홈 카드에서 진입)
│   ├── apply/[token].tsx      공개 상담 신청 폼 (비로그인) — POST /public/apply/:token → 잠재고객 유입
│   └── (tabs)/
│       ├── _layout.tsx     하단 5탭 (홈·고객·AI추천·일정·메뉴, Ionicons)
│       ├── index.tsx       홈 — /ai/dashboard (카드 탭 → 상세)
│       ├── customers.tsx   고객 — /customers (검색 + 필터/태그 칩 바 + 점수 배지 + 태그 관리 / 등록)
│       ├── ai.tsx          AI추천 — /ai/dashboard + 재계산(/ai/recompute)
│       ├── schedule.tsx    일정 — /schedules/today + /schedules
│       └── settings.tsx    설정 — 계정 · 알림 토글 · AI 말투/추천빈도 · 개인정보 · 로그아웃/회원탈퇴
│                           (GET/PATCH /me/preferences, DELETE /me)
├── lib/
│   ├── config.ts           API base URL 추론
│   ├── api.ts              fetch 래퍼 + 타입 + 엔드포인트
│   ├── auth.tsx            AuthProvider / useAuth (SecureStore)
│   └── use-async.ts        로드 + pull-to-refresh 훅
└── components/
    ├── ui-kit.tsx          Card / Button / Chip / LabeledInput / ScorePill ...
    ├── customer-form.tsx   등록/수정 공용 폼
    ├── dialog.tsx          DialogProvider / useDialog — confirm·actionSheet
    │                       (RN Web 의 Alert 3버튼 미지원 → Modal 기반 크로스플랫폼)
    └── message-modal.tsx   AI 문자 생성 모달 (목적·말투·상황 → /ai/.../message,
                            복사 + sms: 딥링크)
```

> 웹에서도 동작: 토큰 저장은 `localStorage`(네이티브는 SecureStore), 다중 선택
> 다이얼로그는 `useDialog()`. `npx expo start --web` 로 브라우저에서 확인 가능.

## 테스트

`npm test` (jest-expo) — `src/**/*.test.ts`. 현재: `lib/api` (fetch 래퍼 URL·헤더·바디·에러),
`components/ui-kit` (`daysSince`). CSS/`@/` alias 는 `jest.moduleNameMapper` 로 처리.

## 상태

하단 5탭 + 인증(이메일 + Google/Apple) + 14개 화면이 백엔드 실데이터와 연동.
AI 문자/요약/주간리포트, 태그 일괄 관리, 사용자 설정, 비밀번호 변경, 푸시(Expo/FCM),
크로스플랫폼 다이얼로그 포함. `tsc` · `eslint` · Android 번들 · 웹 실행 모두 통과.
