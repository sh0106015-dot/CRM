# AI 스마트 고객관리 플랫폼

[![CI](https://github.com/sh0106015-dot/CRM/actions/workflows/ci.yml/badge.svg)](https://github.com/sh0106015-dot/CRM/actions/workflows/ci.yml)

> AI가 고객을 분석하고, 누구에게 언제 무엇을 해야 하는지 알려주는 영업관리 플랫폼

보험설계사·상담 영업인을 위한 CRM. 고객정보 저장에 그치지 않고 AI가 데이터를 분석해
**관리 우선순위 · 다음 연락 시점 · 상담 방향 · 문자**까지 추천한다.

전체 요구사항: [docs/PRD.md](docs/PRD.md)

## 구성

| 디렉터리 | 내용 | 스택 | 상태 |
| --- | --- | --- | --- |
| [`backend/`](backend/) | API 서버 | NestJS · Prisma · PostgreSQL · Anthropic Claude | 스캐폴딩 완료 |
| [`mobile/`](mobile/) | 모바일 앱 | Expo (SDK 57) · React Native · expo-router | 스캐폴딩 완료 (5탭 + 백엔드 연동) |

## 시작하기

```bash
# 1) 백엔드
cd backend
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed          # demo@crm.local / demo1234
npm run start:dev            # http://localhost:3000/api

# 2) 모바일 (별도 터미널)
cd ../mobile
npm install
npx expo start              # Expo Go 로 스캔 · a/i/w
```

자세한 내용은 [backend/README.md](backend/README.md) · [mobile/README.md](mobile/README.md) 참고.

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) — `main` push / PR 시 실행.

| Job | 단계 |
| --- | --- |
| **backend** | `prisma generate` → `lint:ci` (eslint) → `build` → `test` (unit) → `migrate deploy` (Postgres 16 서비스) → `test:e2e` |
| **mobile** | `expo export --platform android` (번들 검증) → `tsc --noEmit` → `expo lint` |

## MVP 범위 (PRD 26)

회원가입/로그인 · 고객 등록/목록/상세 · 상담 기록 · AI 고객분석 ·
AI 관리 우선순위 · AI 다음 행동 추천 · AI 문자 생성 · 일정/알림
# CRM
