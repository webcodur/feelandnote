# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

Feelandnote는 콘텐츠(도서, 영상, 게임, 음악, 자격증) 소비 기록 및 관리 서비스다. Neo-Pantheon(고전 신전) 테마의 다크 UI. 모노레포 구조:
- `sw/web` - 사용자용 웹 (포트 3000)
- `sw/web-bo` - 관리자 백오피스 (포트 3001)
- `packages/content-search` - 외부 콘텐츠 검색 API (Naver, TMDB, IGDB, Spotify, Google Books, Q-Net)
- `packages/ai-services` - AI 서비스 (Gemini, 셀럽 프로필, 영향력 분석)
- `packages/influence-constants` - 영향력 평가 상수
- `packages/shared` - 공유 상수, 타입, 훅

## 주요 명령어

```bash
pnpm dev:web    # 사용자 웹 (포트 3000)
pnpm dev:bo     # 관리자 백오피스 (포트 3001)
pnpm build:web
pnpm build:bo
```

## 기술 스택

- Next.js 16.1 (App Router, Server Components)
- React 19.2
- TailwindCSS 4.1 (@theme CSS Variables)
- Supabase (PostgreSQL, 인증, SSR)
- TypeScript 5, pnpm

## DB 스키마 (핵심 테이블)

Supabase 프로젝트 ID: `wouqtpvfctednlffross`

### Core - 사용자/셀럽
- **`profiles`**: 사용자·셀럽 통합 테이블. `profile_type`('USER'|'CELEB')로 구분. 셀럽 전용: profession, title, bio, quotes, consumption_philosophy, nationality, birth/death_date, gender(bool), is_verified
- **`follows`**: 팔로우 관계 (follower_id → following_id)
- **`user_social`**: 소셜 카운터 캐시 (follower/following/friend/content_count)

### Core - 콘텐츠
- **`contents`**: 콘텐츠 마스터. **id는 text** (web: 외부API ID 직접 사용, web-bo: UUID). type('BOOK'|'VIDEO'|'GAME'|'MUSIC'|'CERTIFICATE'), external_source
- **`user_contents`**: 사용자↔콘텐츠 관계. status('WANT'|'FINISHED'), rating(0~5), review, visibility('public'|'followers'|'private'), is_pinned, is_recommended
- **`records`**: 기록. type('NOTE'|'QUOTE'), content, location
- **`notes`** / **`note_sections`**: 구조화된 감상 노트 (템플릿, 섹션별 관리)
- **`playlists`** / **`playlist_items`**: 사용자 컬렉션

### 셀럽 전용
- **`celeb_influence`**: 영향력 6축(political/strategic/tech/social/economic/cultural, 각 0~10) + transhistoricity(0~40) = total_score(0~100)
- **`celeb_tags`** / **`celeb_tag_assignments`**: 기획전 태그 (is_featured, 기간 설정)

### 커뮤니티/시스템
- **`notifications`**, **`guestbook_entries`**, **`notices`**, **`feedbacks`**, **`board_comments`**
- **`reports`**: 신고 (target_type: user|record|content|comment|guestbook)
- **`user_scores`** / **`score_logs`**: 활동 점수 시스템
- **`tier_lists`**, **`blind_game_scores`**: 전장(Arena) 게임
- **`activity_logs`**: 활동 로그 (90일 보관)
- **`content_recommendations`**: 콘텐츠 추천 (sender→receiver)

## 아키텍처

### 디렉토리 구조 (sw/web/src)
```
app/
  (auth)/              # 인증 (login, signup, reset-password)
  (main)/              # 메인 레이아웃
    [userId]/           # 프로필/기록관 (chamber, merits, reading)
    agora/              # 광장 (feed, celeb-feed, friend-feed, board)
    arena/              # 전장 (quote, tier-list, time-puzzle)
    board/              # 게시판 (notice, feedback)
    content/[contentId]/ # 콘텐츠 상세
    explore/            # 탐색 (celebs, followers, following, friends, similar)
    notifications/
    scriptures/         # 서고 (chosen, era, profession, sage)
  (policy)/             # 약관
  (standalone)/         # 독립 레이아웃 (content, search)
  about/  |  auth/callback/  |  lab/
  reading/              # 독서 워크스페이스 (독립 라우트, 자체 actions/components/hooks)

actions/               # Server Actions: achievements, activity, auth, board, celebs, contents, guestbook, home, notes, notifications, playlists, recommendations, records, scriptures, search, user
components/
  features/            # 도메인별 (agora, board, book, content, explore, game, home, influence, landing, lounge, profile, recommendations, scriptures, user)
  layout/  |  shared/  |  ui/ (cards, icons/neo-pantheon, Layout)
  lab/
contexts/              # SoundContext
lib/                   # auth, config, errors, supabase(client/server/middleware), utils
types/                 # content, database, home, recommendation, supabase(자동생성)
constants/             # agora, archive, arena, board, categories, celebProfessions, filterStyles, image, influence, materials, navigation, scriptures, statuses, titles, zIndex
```

### 디렉토리 구조 (sw/web-bo/src)
```
app/(admin)/           # activity-logs, api-usage, blind-game, celebs, contents, guestbooks, members, notes, playlists, records, reports, scores, settings, tier-lists, titles, users
  api/contents/search/ # 콘텐츠 검색 API
  login/
actions/admin/  |  components/  |  constants/  |  contexts/  |  hooks/  |  lib/supabase/  |  utils/
```

### 네비게이션 (5대 섹션)
`@/constants/navigation.tsx`가 Single Source of Truth. PC 헤더 + 모바일 바텀탭 공유.

| 키 | 라벨 | 경로 | 설명 |
|---|---|---|---|
| explore | 탐색 | /explore | 셀럽/사용자 탐색, 기획전 |
| scriptures | 서고 | /scriptures | 셀럽 아카이브 (시대별, 직군별, 선택, 현인) |
| agora | 광장 | /agora | 피드, 게시판 |
| arena | 전장 | /arena | 게임/퀴즈 (명언, 티어리스트, 타임퍼즐) |
| archive | 기록관 | /[userId] | 개인 프로필 (서재, 업적, 독서) |

### 콘텐츠 상세 라우팅
`/content/[contentId]` → `getContentDetail(contentId, category)` 호출.

### contents ID 체계 (주의)
| 구분 | contents.id | external_id |
|------|-------------|-------------|
| web | 외부 API ID 직접 사용 (ISBN 등) | null |
| web-bo | UUID 생성 | 외부 API ID |

## 코드 규칙

### 필수
- 파일당 200줄 이하
- if/else보다 삼항식, switch보다 객체 맵핑
- early return 적극 활용
- 컴포넌트 조건부 렌더링은 && (삼항 금지)
- any, Record<string, unknown> 금지
- ENUM은 "ENUM_" 접두사 + 언더바 형식
- 아이콘: lucide-react (범용) + neo-pantheon (테마)

### 컴포넌트
- left/right 대신 start/end
- transition, delay 금지 (즉각 반응)
- 반복 UI는 상수 배열 + map 렌더링

### 주석/경로
- 한국어, JSDoc 금지, region/endregion 그룹화
- 대규모 외부: 절대경로(@/), 소규모 내부: 상대경로(./)

## 디자인 시스템 (Neo-Pantheon)

**컨셉**: 고대 신전의 권위 + 현대적 선명함. 다크 스톤 테마.

### 컬러
- 배경: `bg-main`(#121212), `bg-secondary`(#0a0a0a), `bg-card`(#1a1a1a), `stone-heavy/light`
- 액센트: `accent`(#d4af37 골드), `accent-hover`(#f9d76e), `accent-dim`(#8a732a)
- 텍스트: `text-primary`(#e0e0e0), `text-secondary`(#a0a0a0)
- 상태: watching(#3fb950), completed(#9e7aff), paused(#db4d4d), wish(#d4af37)

### 타이포그래피
- 본문: Noto Sans KR (sans) / 제목·버튼: Noto Serif KR (serif)
- 영문 장식: Cinzel (권위), Cormorant Garamond (로고)

### 효과/텍스처
- `bg-texture-noise/marble`, `effect-bevel/engraved`, `card-sarcophagus`
- `shadow-glow`, `text-3d-gold/marble`, `engraved-plate`

### Z-Index (`@/constants/zIndex.ts`)
```
background(-10) < base(0) < sticky(10) < cardBadge(20) < cardMenu(30) < fab(50)
< nav(100) < floatingPlayer(150) < dropdown(200) < tooltip(250)
< overlay(500) < modal(600) < toast(700) < top(9999)
```

### 상호작용
- 호버: `hover:bg-white/5`, `hover:-translate-y-0.5`
- 활성: `bg-accent/10 text-accent`
- 비활성: `opacity-50 cursor-not-allowed`
- 반응형: 모바일 우선, `md:`(768px) 데스크톱

### 명칭 규칙 (Thematic Naming)
- 컬렉션 → 유산(Legacy), 방명록 → 방명석, 팔로우 → 지혜의 결속
- 스타일: Pillar(기둥), Sarcophagus/Slab(석판)

## MCP 서버

Supabase MCP 서버 설정됨. DB 스키마 조회, 마이그레이션, SQL 실행 가능.
- **프로젝트 ID**: `wouqtpvfctednlffross`
