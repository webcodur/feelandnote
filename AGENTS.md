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
- **`celeb_persona`**: 인물 페르소나 수치. **3개 카테고리를 반드시 구분할 것** (단일원천: `sw/web/src/lib/persona/constants.ts`)
  - **덕목 8개** (VirtueKey, 0~100): temperance 절제, diligence 근면, reflection 성찰, courage 용기, loyalty 충의, benevolence 인애, fairness 공정, humility 겸양
  - **능력 4개** (AbilityKey, 0~100): command 통솔, martial 무력, intellect 지력, charisma 매력
  - **성향 4개** (TendencyKey, -50~+50): pessimism_optimism, conservative_progressive, individual_social, cautious_bold
  - **speech_tone** (text): 말투 6종 (loyal/composed/bold/humble/gentle/free). 패권 게임 대사 톤 결정
  - ⚠️ 덕목(품성)과 능력(역량)은 별개. 덕목을 능력으로 취급하거나 혼용 금지
- **`celeb_dialogues`**: 인물별 고유 대사. celeb_id(PK, profiles FK), lines(JSONB: 6상황×3변형=18개 대사)
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
    agora/              # 광장 (feed, celeb-feed, friend-feed, board/notice, board/feedback)
    rest/               # 쉼터 (dawn, labyrinth, hegemony)
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
| rest | 쉼터 | /rest | 미니게임 (여명, 미궁, 패권) |
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

## 외부 서비스

### Supabase (MCP 서버)
DB 스키마 조회, 마이그레이션, SQL 실행 가능.
- **프로젝트 ID**: `wouqtpvfctednlffross`

### Cloudflare R2 (이미지 저장소)
셀럽 아바타 이미지를 Cloudflare R2에 저장한다. S3 호환 API 사용.
- **버킷명**: `feelandnote`
- **Public URL**: `https://pub-048f29057fc54fa5b2927db8f167b305.r2.dev`
- **오브젝트 경로**: `celebs/{celebId}/avatar.webp`
- **URL 형식**: `{R2_PUBLIC_URL}/celebs/{celebId}/avatar.webp?v={timestamp}`
- **환경변수**: `sw/web-bo/.env`에 `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`
- **클라이언트**: `sw/web-bo/src/lib/r2.ts` — `uploadToR2()`, `deleteFromR2()`
- **업로드 로직**: `sw/web-bo/src/actions/admin/storage.ts`

## 크론잡

### Vercel Cron (sw/web/vercel.json)

| 경로 | 스케줄 | 설명 |
|------|--------|------|
| `/api/cron/today-figure` | `5 15 * * *` (매일 00:05 KST) | 오늘의 인물 선정 (뉴스 기반 + seed fallback) |

- Vercel Hobby(무료) 플랜: 크론 **하루 1회** 제한
- 인증: `CRON_SECRET` 환경변수 (Vercel에서 자동 주입)

### GitHub Actions (.github/workflows/)

| 워크플로우 | 스케줄 | 설명 |
|-----------|--------|------|
| `keep-alive.yml` | `*/5 * * * *` (5분 간격) | Supabase Free 플랜 자동 일시정지 방지 |

- Supabase REST API에 간단한 SELECT 쿼리를 보내 프로젝트를 깨운 상태로 유지
- GitHub Secrets 필요: `SUPABASE_ANON_KEY`
- 월 소모량: ~150분 (GitHub Actions 무료 한도 2,000분/월)
