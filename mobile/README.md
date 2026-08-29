# CRM Mobile (Expo)

AI 스마트 고객관리 플랫폼의 모바일 앱.

- **프레임워크**: Expo SDK 57 · React Native 0.86 · expo-router (파일 기반 라우팅)
- **네비게이션**: 하단 5탭 (`홈 / 고객 / AI추천 / 일정 / 설정`) — `expo-router/unstable-native-tabs`
- **인증**: JWT, 토큰은 `expo-secure-store` 에 저장
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
│   │   ├── [id].tsx        고객 상세 — 기본정보·상태·AI분석·다음행동·상담이력 + 문자 모달
│   │   └── new.tsx         고객 등록 (모달) — /customers POST
│   └── (tabs)/
│       ├── _layout.tsx     NativeTabs 5탭
│       ├── index.tsx       홈 — /ai/dashboard (카드 탭 → 상세)
│       ├── customers.tsx   고객 — /customers (검색 + 점수 배지 + "+ 등록")
│       ├── ai.tsx          AI추천 — /ai/dashboard + 재계산(/ai/recompute)
│       ├── schedule.tsx    일정 — /schedules/today + /schedules
│       └── settings.tsx    설정 — 계정 정보 · API 주소 · 로그아웃
├── lib/
│   ├── config.ts           API base URL 추론
│   ├── api.ts              fetch 래퍼 + 타입 + 엔드포인트
│   ├── auth.tsx            AuthProvider / useAuth (SecureStore)
│   └── use-async.ts        로드 + pull-to-refresh 훅
└── components/
    ├── ui-kit.tsx          Card / Button / Chip / LabeledInput / ScorePill ...
    └── message-modal.tsx   AI 문자 생성 모달 (목적·말투·상황 → /ai/.../message,
                            복사 + sms: 딥링크)
```

## 상태

스캐폴딩 — 5탭 + 인증 + 7개 화면(탭 5 + 고객 상세/등록)이 백엔드 실데이터와 연동됨.
AI 문자 생성 모달 포함. `tsc --noEmit` 통과, Android 번들 성공.
고객 수정 화면, 상담 기록 작성 UI, 푸시 알림(FCM)은 미구현.
