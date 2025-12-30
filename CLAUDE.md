# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

Feelnnote는 콘텐츠(도서, 영상, 게임, 음악, 자격증) 소비 기록 및 관리 서비스다. 모노레포 구조로 사용자용 웹(sw/web)과 관리자 백오피스(sw/web-bo)로 구성된다.

## 주요 명령어

```bash
# 사용자 웹 (포트 3000)
cd sw/web && pnpm dev
cd sw/web && pnpm build
cd sw/web && pnpm lint

# 관리자 백오피스 (포트 3001)
cd sw/web-bo && pnpm dev
cd sw/web-bo && pnpm build
```

## 기술 스택

- Next.js 16 (App Router)
- React 19
- Supabase (인증, DB, SSR)
- TailwindCSS 4
- TypeScript 5
- pnpm

## 아키텍처

### 디렉토리 구조 (sw/web/src)
```
app/               # Next.js App Router
  (auth)/          # 인증 관련 페이지
  (main)/          # 메인 레이아웃 적용 페이지
  auth/callback/   # OAuth 콜백

actions/           # Server Actions (도메인별)
  auth/            # 로그인/로그아웃
  contents/        # 콘텐츠 CRUD
  records/         # 기록 관리
  user/            # 프로필, 통계
  achievements/    # 칭호 시스템
  playlists/       # 플레이리스트
  folders/         # 폴더 관리
  search/          # 검색

components/
  layout/          # 레이아웃 컴포넌트
  ui/              # 기본 UI 컴포넌트
  views/           # 페이지별 뷰 컴포넌트
  features/        # 기능별 컴포넌트

lib/
  supabase/        # client.ts, server.ts, middleware.ts
  api/             # 외부 API (TMDB, 네이버, IGDB, Spotify)

types/             # 타입 정의
  database.ts      # Supabase 테이블 타입

constants/         # 상수 (categories.ts)
```

### 콘텐츠 타입
5가지: BOOK, VIDEO, GAME, MUSIC, CERTIFICATE
- `@/constants/categories.ts`가 Single Source of Truth
- `@/types/database.ts`의 ContentType과 동기화 필요

### Supabase 연동
- 클라이언트: `createBrowserClient` (lib/supabase/client.ts)
- 서버: `createServerClient` (lib/supabase/server.ts)
- 미들웨어: 세션 갱신 처리 (lib/supabase/middleware.ts)

## 코드 규칙

### 필수
- 파일당 200줄 이하
- if/else보다 삼항식, switch보다 객체 맵핑
- early return 적극 활용
- 컴포넌트 조건부 렌더링은 && 사용 (삼항 금지)
- any, Record<string, unknown> 사용 금지
- ENUM은 "ENUM_" 접두사 + 언더바 형식
- 아이콘은 lucide-react만 사용

### 컴포넌트
- left/right 대신 start/end 사용
- transition, delay 사용 금지 (즉각적 반응 필요)
- 반복 UI는 상수 배열 + map 렌더링

### 주석
- 한국어
- JSDoc 사용 금지
- 긴 코드는 region/endregion으로 그룹화

### 경로
- 대규모 외부 컴포넌트: 절대경로 (@/)
- 소규모 내부 컴포넌트: 상대경로 (./)

## 페이지/뷰 분리 패턴

페이지 파일(app/**/page.tsx)은 라우팅 역할만 담당하고, 실제 UI는 views/ 컴포넌트에서 구현한다.

```tsx
// app/(main)/dashboard/page.tsx
import { DashboardView } from '@/components/views/main/DashboardView'
export default function DashboardPage() {
  return <DashboardView />
}
```

## MCP 서버

Supabase MCP 서버가 설정되어 있다. DB 스키마 조회, 마이그레이션, SQL 실행 등에 활용 가능.
