# GEMINI.md

This file provides context and guidance for Gemini Code Assist when working with the **Feelandnote** project.

## 1. 프로젝트 개요 (Project Overview)
**Feelandnote**는 콘텐츠(도서, 영상, 게임, 음악, 자격증) 소비 기록 및 관리 서비스입니다.
사용자는 자신의 문화 생활을 기록하고, 타인(친구, 셀럽)의 기록을 탐색하며 영감을 얻을 수 있습니다.

### 모노레포 구조
- `sw/web`: 사용자용 웹 애플리케이션 (Next.js 16, Port 3000)
- `sw/web-bo`: 관리자 백오피스 (Next.js, Port 3001)
- `packages/content-search`: 외부 콘텐츠 검색 API (Naver, TMDB, IGDB, Spotify, Google Books, Q-Net)
- `packages/ai-services`: AI 서비스 (Gemini, 셀럽 프로필, 영향력 분석)
- `packages/influence-constants`: 영향력 평가 상수
- `packages/shared`: 공유 상수, 타입, 훅

### 주요 명령어
```bash
pnpm dev:web    # 사용자 웹 (포트 3000)
pnpm dev:bo     # 관리자 백오피스 (포트 3001)
pnpm build:web
pnpm build:bo
```

## 2. 기술 스택 (Tech Stack)
- **Framework**: Next.js 16.1 (App Router, Server Components)
- **Library**: React 19.2
- **Styling**: TailwindCSS 4.1 (with CSS Variables & @theme configuration)
- **Database / Auth**: Supabase (PostgreSQL, SSR)
- **State Management**: React Context, Server Actions
- **Package Manager**: pnpm

## 3. 데이터베이스 및 스키마 (Database & Schema)
Supabase (PostgreSQL)을 사용하며, **Project ID**는 `wouqtpvfctednlffross`입니다.

### 주요 테이블 구조 (Key Tables)

#### 1. Core - 사용자/셀럽
- **`profiles`**: 사용자·셀럽 통합 테이블. `profile_type`('USER'|'CELEB')로 구분
    - 공통: `id`, `email`, `nickname`, `avatar_url`, `role`('user'|'admin'|'super_admin')
    - 셀럽 전용: `profession`, `title`, `bio`, `quotes`, `consumption_philosophy`, `nationality`, `birth_date`, `death_date`, `gender`(bool), `is_verified`, `claimed_by`
- **`follows`**: 팔로우 관계 (`follower_id` → `following_id`)
- **`user_social`**: 소셜 카운터 캐시 (follower/following/friend/content_count)

#### 2. Core - 콘텐츠
- **`contents`**: 콘텐츠 마스터. **id는 text** (web: 외부API ID 직접 사용, web-bo: UUID)
    - `type`: `'BOOK'` | `'VIDEO'` | `'GAME'` | `'MUSIC'` | `'CERTIFICATE'`
    - `external_source`: naver_book, tmdb, igdb, spotify, qnet
- **`user_contents`**: 사용자↔콘텐츠 관계
    - `status`: `'WANT'` | `'FINISHED'`
    - `rating`(0~5), `review`, `visibility`('public'|'followers'|'private'), `is_pinned`, `is_recommended`
- **`records`**: 기록 (`type`: 'NOTE' | 'QUOTE')
- **`notes`** / **`note_sections`**: 구조화된 감상 노트 (템플릿, 섹션별 관리)
- **`playlists`** / **`playlist_items`**: 사용자 컬렉션

#### 3. 셀럽 전용
- **`celeb_influence`**: 영향력 6축(political/strategic/tech/social/economic/cultural, 각 0~10) + transhistoricity(0~40) = total_score(0~100)
- **`celeb_tags`** / **`celeb_tag_assignments`**: 기획전 태그 (is_featured, 기간 설정)

#### 4. 커뮤니티/시스템
- **`notifications`**, **`guestbook_entries`**, **`notices`**, **`feedbacks`**, **`board_comments`**
- **`reports`**: 신고 (target_type: user|record|content|comment|guestbook)
- **`user_scores`** / **`score_logs`**: 활동 점수 시스템
- **`tier_lists`**, **`blind_game_scores`**: 전장(Arena) 게임
- **`activity_logs`**: 활동 로그 (90일 보관)
- **`content_recommendations`**: 콘텐츠 추천 (sender→receiver)

## 4. 아키텍처 및 라우팅 (Routing Architecture)

### 네비게이션 (5대 섹션)
`@/constants/navigation.tsx`가 Single Source of Truth. PC 헤더 + 모바일 바텀탭 공유.

| 키 | 라벨 | 경로 | 설명 |
|---|---|---|---|
| explore | 탐색 | /explore | 셀럽/사용자 탐색, 기획전 |
| scriptures | 서고 | /scriptures | 셀럽 아카이브 (시대별, 직군별, 선택, 인물) |
| agora | 광장 | /agora | 피드, 게시판 |
| arena | 전장 | /arena | 게임/퀴즈 (명언, 티어리스트, 타임퍼즐, 업다운) |
| archive | 기록관 | /[userId] | 개인 프로필 (서재, 업적, 독서) |

### 주요 라우트 (sw/web/src/app)
```
(auth)/              # 인증 (login, signup, reset-password)
(main)/              # 메인 레이아웃
  [userId]/           # 프로필/기록관 (chamber, merits, reading)
  agora/              # 광장 (feed, celeb-feed, friend-feed, board)
  arena/              # 전장 (quote, tier-list, time-puzzle, up-down)
  board/              # 게시판 (notice, feedback)
  content/[contentId]/ # 콘텐츠 상세
  explore/            # 탐색 (celebs, followers, following, friends, similar)
  notifications/
  scriptures/         # 서고 (chosen, era, profession, figure)
(policy)/             # 약관
(standalone)/         # 독립 레이아웃 (content, search)
about/  |  auth/callback/  |  lab/
reading/              # 독서 워크스페이스 (독립 라우트, 자체 actions/components/hooks)
```

### 콘텐츠 상세 라우팅
`/content/[contentId]` → `getContentDetail(contentId, category)` 호출.

### contents ID 체계 (주의)
| 구분 | contents.id | external_id |
|------|-------------|-------------|
| web | 외부 API ID 직접 사용 (ISBN 등) | null |
| web-bo | UUID 생성 | 외부 API ID |

## 5. 코딩 규칙 (Coding Rules)
- **언어**: 한국어 (주석, 커밋 메시지, 문서 등)
- **파일**: 파일당 200줄 이하
- **스타일링**: TailwindCSS 4 (`@theme` 변수 활용)
- **컴포넌트**:
    - `src/components/features`: 도메인별 기능 컴포넌트
    - `src/components/ui`: 공용 디자인 컴포넌트
- **데이터 페칭**: Server Actions 우선 사용 (`src/actions/*`)
- **아이콘**: `lucide-react` (범용) + `neo-pantheon` (테마)
- **조건부 렌더링**: && 사용 (삼항 금지)
- **패턴**: if/else보다 삼항식, switch보다 객체 맵핑, early return
- **경로**: 대규모 외부 절대경로(@/), 소규모 내부 상대경로(./)

## 6. 디자인 시스템 (Neo-Pantheon)
**컨셉**: 고대 신전의 권위 + 현대적 선명함. 다크 스톤 테마.

### 6.1 컬러 시스템 (Color System)
`globals.css`의 `@theme` 블록에서 관리됩니다.
- **배경**: `bg-main`(#121212), `bg-secondary`(#0a0a0a), `bg-card`(#1a1a1a), `stone-heavy/light`
- **액센트**: `accent`(#d4af37 골드), `accent-hover`(#f9d76e), `accent-dim`(#8a732a)
- **텍스트**: `text-primary`(#e0e0e0), `text-secondary`(#a0a0a0)
- **상태**: watching(#3fb950), completed(#9e7aff), paused(#db4d4d), wish(#d4af37)

### 6.2 타이포그래피 (Typography)
- **본문**: Noto Sans KR (sans) / **제목·버튼**: Noto Serif KR (serif)
- **영문 장식**: Cinzel (권위적 헤딩), Cormorant Garamond (로고)
- **가독성**: 명확한 대비(Contrast) 중시, 흐릿한 텍스트 지양

### 6.3 효과/텍스처 (Effects)
- `bg-texture-noise/marble`, `effect-bevel/engraved`, `card-sarcophagus`
- `shadow-glow`, `text-3d-gold/marble`, `engraved-plate`

### 6.4 컴포넌트 스타일 (Component Style)
- **Pillar (기둥)**: 화면의 구조적 안정감 부여
- **Sarcophagus/Slab (석판)**: 무게감 있는 컨텐츠 컨테이너
- **Micro-interactions**: 금빛 광택(Glow), 3D 호버 효과

### 6.5 명칭 규칙 (Thematic Naming)
- 컬렉션 → 유산 (Legacy), 방명록 → 방명석 (Inscribed Stone)
- 팔로우 → 지혜의 결속 (Bond of Wisdom)
