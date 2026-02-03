# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

Feelnnote는 콘텐츠(도서, 영상, 게임, 음악, 자격증) 소비 기록 및 관리 서비스다. 모노레포 구조:
- `sw/web` - 사용자용 웹 (포트 3000)
- `sw/web-bo` - 관리자 백오피스 (포트 3001)
- `packages/ai-services` - AI 서비스 (OpenAI 연동)
- `packages/content-search` - 콘텐츠 검색 API 클라이언트
- `packages/influence-constants` - 영향력 관련 상수
- `packages/shared` - 공유 유틸리티

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
- pnpm (workspace)

## 아키텍처

### 디렉토리 구조 (sw/web/src)
```
app/
  (auth)/            # 인증 페이지 (login, signup, reset-password)
  (main)/            # 메인 레이아웃
    [userId]/        # 사용자 프로필 (records, stats, achievements, collections, settings)
    content/         # 콘텐츠 상세
    explore/         # 탐색 (celebs, followers, following, friends, similar)
    lounge/          # 라운지 (feed, blind-game, higher-lower, tier-list, timeline, board)
    notifications/   # 알림
    scriptures/      # 경전 (sage, era, profession, chosen)
    board/           # 게시판 (notice, feedback)
  (policy)/          # 약관, 정책
  (standalone)/      # 독립 레이아웃 (search)
  about/             # 서비스 소개
  auth/callback/     # OAuth 콜백
  lab/               # 실험 기능
  reading/           # 읽기 모드

actions/             # Server Actions (도메인별)
  achievements/      # 칭호 시스템
  activity/          # 활동 피드
  ai/                # AI 기능 (리뷰 생성, 요약)
  auth/              # 로그인/로그아웃
  blind-game/        # 블라인드 게임
  board/             # 게시판 (comments, feedbacks, notices)
  celebs/            # 셀럽 관련
  contents/          # 콘텐츠 CRUD
  guestbook/         # 방명록
  home/              # 홈 화면 데이터
  notes/             # 노트
  notifications/     # 알림
  playlists/         # 플레이리스트
  search/            # 검색
  tier/              # 티어 시스템
  user/              # 프로필, 통계

components/
  features/          # 기능별 컴포넌트
  layout/            # 레이아웃 컴포넌트
  shared/            # 공유 컴포넌트
  ui/                # 기본 UI 컴포넌트

contexts/            # React Context (상태 관리)
fonts/               # 로컬 폰트 파일

lib/
  api/               # 외부 API (TMDB, 네이버, IGDB, Spotify)
  config/            # 설정
  errors/            # 에러 처리
  supabase/          # client.ts, server.ts, middleware.ts
  utils/             # 유틸리티 함수

types/               # 타입 정의
constants/           # 상수 (categories.ts, zIndex.ts, celebProfessions.ts)
```

### 디렉토리 구조 (sw/web-bo/src)
```
app/
  (admin)/           # 관리자 페이지 (멤버, 콘텐츠 관리 등)
  api/               # API 라우트
  login/             # 로그인 페이지

actions/             # Server Actions
components/          # UI 컴포넌트
constants/           # 상수
hooks/               # 커스텀 훅
lib/                 # 유틸리티, Supabase 클라이언트
```

### 콘텐츠 타입
5가지: BOOK, VIDEO, GAME, MUSIC, CERTIFICATE
- `@/constants/categories.ts`가 Single Source of Truth
- `@/types/database.ts`의 ContentType과 동기화 필요

### Supabase 연동
- 클라이언트: `createBrowserClient` (lib/supabase/client.ts)
- 서버: `createServerClient` (lib/supabase/server.ts)
- 미들웨어: 세션 갱신 처리 (lib/supabase/middleware.ts)

### 콘텐츠 상세 페이지 라우팅 (중요)
`/[userId]/records/[contentId]` 페이지는 **user_contents 테이블을 기준으로 조회**한다.

- **본인 콘텐츠**: `/{userId}/records/{contentId}` → `getContent(contentId)` 호출
- **타인 콘텐츠**: `/{ownerId}/records/{contentId}` → `getPublicContent(contentId, ownerId)` 호출

```tsx
// 본인 기록 상세
href={`/${currentUserId}/records/${content.id}`}

// 타인 기록 상세
href={`/${ownerId}/records/${content.id}`}
```

### contents 테이블 ID 체계 (주의)
web과 web-bo에서 ID 생성 방식이 다르다:

| 구분 | contents.id | external_id |
|------|-------------|-------------|
| web | 외부 API ID 직접 사용 (ISBN 등) | null |
| web-bo | UUID 생성 | 외부 API ID |

동일 콘텐츠 중복 생성 가능성이 있으므로 주의.

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

## MCP 서버

Supabase MCP 서버가 설정되어 있다. DB 스키마 조회, 마이그레이션, SQL 실행 등에 활용 가능.

- **프로젝트 ID**: `wouqtpvfctednlffross`
- MCP 사용 전 `list_projects`로 ID 확인 필수

## 디자인 시스템

### 색상 (globals.css @theme)
다크 테마 기반. CSS 변수로 정의되어 있다.
- 배경: `bg-main` (#0f1115), `bg-secondary` (#161b22), `bg-card` (#1f242c)
- 텍스트: `text-primary` (white), `text-secondary` (#8b949e)
- 액센트: `accent` (#7c4dff), `accent-hover` (#651fff)
- 보더: `border` (#30363d)
- 글래스: `glass` (rgba(22, 27, 34, 0.7))
- 상태: watching(#238636), completed(#8957e5), paused(#da3633), wish(#d29922)

### 타이포그래피
- 폰트: Pretendard Variable (sans), Maruburi/Noto Serif KR (serif)
- 사이즈: `text-xs` (배지), `text-sm` (기본), `text-base` (강조), `text-lg` (제목)
- 굵기: `font-medium` (기본), `font-semibold` (강조), `font-bold` (제목)

### Border Radius
- `rounded-lg`: 버튼, 입력, 네비게이션 아이템
- `rounded-xl`: 카드, 드롭다운
- `rounded-2xl`: 모달
- `rounded-full`: 아바타, 알림 뱃지

### 그림자
- `shadow-md`: 기본 카드
- `shadow-lg`, `shadow-xl`: 호버 시 강조
- `shadow-2xl`: 모달, 드롭다운

### 간격 (Spacing)
```
gap-2 (8px)  - 인라인 아이템
gap-3 (12px) - 기본 간격
gap-4 (16px) - 섹션 내 요소
gap-6 (24px) - 섹션 간
gap-8 (32px) - 대형 섹션

p-3/p-4   - 카드 내부
p-6       - 모달 내부
px-3 py-2 - 버튼, 네비게이션 아이템
```

### 크기 시스템 (sm/md/lg)
컴포넌트별 크기 변형은 객체 맵핑으로 관리:
```tsx
const sizeStyles = {
  sm: "py-1.5 px-3 text-[13px]",
  md: "py-2 px-5 text-sm",
  lg: "py-3 px-8 text-base",
};
```

### Variant 패턴
스타일 변형은 객체 맵핑으로 정의:
```tsx
const variantStyles = {
  primary: "bg-accent text-white ...",
  secondary: "bg-white/5 text-text-primary ...",
  ghost: "bg-transparent text-text-secondary ...",
};
```

### 상호작용 스타일
- 호버 배경: `hover:bg-white/5`
- 호버 상승: `hover:-translate-y-0.5`
- 활성화: `bg-accent/10 text-accent`
- 비활성화: `opacity-50 cursor-not-allowed`

### 반응형
- 기본: 모바일 우선
- 브레이크포인트: `md:` (768px) 중심으로 데스크톱 스타일 적용
- 예: `p-3 md:p-4`, `gap-3 md:gap-6`

### 레이아웃 상수
- 헤더: 64px (h-16)
- 사이드바: 200px (SIDEBAR_WIDTH 상수)
- 컨텐츠 영역: `calc(100vh - 64px)`

### 애니메이션 (globals.css)
- `animate-fade-in`: 기본 페이드인
- `animate-modal-overlay/content`: 모달 진입
- `animate-bottomsheet-overlay/content`: 바텀시트 진입
- `animate-unlock-bounce/icon`: 업적 해금
- `animate-shimmer`: 로딩 쉬머

### Z-Index
`@/constants/zIndex.ts`에서 중앙 관리:
```
base(0) < sticky(10) < cardBadge(20) < cardMenu(30) < fab(50)
< sidebar/header/bottomNav(100) < dropdown/popover(200) < tooltip(250)
< overlay(500) < modal(600) < toast/notification(700) < top(9999)
```
