# AGENTS.md

프로젝트 가이드 단일원천. 모든 AI 도구(Claude, Codex 등)는 이 파일을 참조한다.

## 프로젝트 개요

Feelandnote는 콘텐츠(도서, 영상, 게임, 음악, 자격증) 소비 기록 및 관리 서비스다. Neo-Pantheon(고전 신전) 테마의 다크 UI. 모노레포 구조:

| # | 앱 | 경로 | 포트 | 설명 |
|---|-----|------|------|------|
| 1 | web | `sw/web` | 3000 | 사용자용 웹 (Next.js) |
| 2 | web-bo | `sw/web-bo` | 3001 | 관리자 백오피스 (Next.js) |
| 3 | remotion | `sw/remotion` | 3002 + 8001 | 영상 제작 (Studio + serve) |
| 4 | remotion-bo | `sw/remotion-bo` | 3003 | 영상 관리 대시보드 (Next.js) |
| 5 | lab | `sw/lab` | 3004 | 실험 공간 — 2D/3D, 게임 (Vite) |

**공유 패키지** (`packages/`):
- `content-search` — 외부 콘텐츠 검색 API (Naver, TMDB, IGDB, Spotify, Google Books, Q-Net)
- `ai-services` — AI 서비스 (셀럽 프로필 타입, 영향력 분석)
- `influence-constants` — 영향력 평가 상수
- `shared` — 공유 상수, 타입, 훅

## 주요 명령어

### 개발 서버

```bash
pnpm dev:web          # 1. 사용자 웹 (:3000)
pnpm dev:bo           # 2. 관리자 백오피스 (:3001)
pnpm dev:remotion     # 3. Remotion Studio (:3002) + serve (:8001)
pnpm dev:remotion-bo  # 4. Remotion 관리 대시보드 (:3003)
pnpm dev:lab          # 5. 실험 공간 (:3004)
```

### 빌드

```bash
pnpm build:web
pnpm build:bo
```

### Remotion 음성/렌더

```bash
pnpm voice -- --episode <name> --update-json          # TTS 생성
pnpm voice -- --episode <name> --upload                # TTS 생성 + R2 업로드
pnpm voice:list -- --episode <name>                    # TTS 대상 목록
```

### 음성 R2 관리 (sw/remotion 내)

```bash
pnpm voice:upload -- --episode <name>     # R2 업로드
pnpm voice:pull -- --episode <name>       # R2 다운로드
pnpm voice:pull -- --all                  # 전체 다운로드
pnpm voice:r2 -- --status                 # 동기화 현황
```

### bash 별칭 (bashrc)

```
1/2/3/4/5     → dev 서버 실행 (web/bo/remotion/remotion-bo/lab)
rv/rvl        → voice/voice:list
rvu/rvp/rvs   → R2 upload/pull/status
```

## 기술 스택

- Next.js 16.1 (App Router, Server Components)
- React 19.2
- TailwindCSS 4.1 (@theme CSS Variables)
- Supabase (PostgreSQL, 인증, SSR)
- TypeScript 5, pnpm

## 레퍼런스

작업에 해당하는 문서만 참조한다.

### 아키텍처 · 코드

| 문서 | 내용 |
|------|------|
| `docs/project/architecture.md` | 디렉토리 구조, 네비게이션, 라우팅 |
| `docs/project/code-rules.md` | 코드 규칙, 디자인 시스템 |
| `docs/project/i18n.md` | 다국어화 계획, 진행 현황, 기술 참조 |

### DB · 데이터

| 문서 | 내용 |
|------|------|
| `docs/project/db-core.md` | DB 스키마 — 사용자, 콘텐츠, 커뮤니티, UUID 체계 |
| `docs/project/db-celeb.md` | DB 스키마 — 셀럽 테이블, 이미지 규격, slug, Wikidata QID |
| `docs/project/content-locales-design.md` | content_locales 설계 |
| `docs/project/content-locales-migration-files.md` | content_locales 마이그레이션 파일 목록 (완료) |
| `docs/en-book-data-quality.md` | BOOK en 데이터 진단·수정 이력 |

### 셀럽 (`docs/project/celeb/`)

| §  | 문서 | 내용 |
|----|------|------|
| 0 | `celeb-pipeline.md` | 파이프라인, 티어, 업데이트 가드, 작업 큐 |
| 1 | `celeb-1-basic-profile.md` | 기본 정보 |
| 2 | `celeb-2-content-collector.md` | 콘텐츠 수집 |
| 3 | `celeb-3-cultural-journey.md` | 감상 여정 |
| 4 | `celeb-4-influence.md` | 영향력 평가 |
| 5 | `celeb-5-persona.md` | 페르소나 |
| 6 | `celeb-speech.md` | Speech 트랙 (tone → quotes → dialogue) |
| 7 | `celeb-i18n.md` | 영문 번역 |
| A | `celeb-tag-system.md` | 부록: 스포트라이트 태그 |
| B | `voice-generation-wave2.md` | 부록: 보이스 생성 Wave 2 |

### 인프라 · 운영

| 문서 | 내용 |
|------|------|
| `docs/project/external-services.md` | Supabase, R2, GA, 음성 경로, 크론잡 |
| `docs/project/seo.md` | SEO — 사이트맵, robots, 검색엔진 등록, MCP |
| `docs/project/monetization.md` | 수익화 방안 (AdSense 등) |

### 영상 (`docs/project/remotion/`)

| 문서 | 내용 |
|------|------|
| `celeb-profile.md` | 인물 열전 — 시리즈 기획서 (페르소나·영향력·명언) |

#### 서재 탐방

| 장 | 문서 | 내용 |
|----|------|------|
| 1 | `README.md` | 개요, 코드 구조, SSoT 데이터 흐름, **에피소드 제작 절차**, 윤리 원칙 |
| 2 | `longform.md` | 롱폼 — 섹션 구성, 역할·말투, 타이밍, 워크플로 |
| 3 | `shorts.md` | 쇼츠 — 4비트 구조, 비주얼, 음성, 자막 |
| 4 | `voice/tts.md` | 음성 생성 — 엔진, 보이스, 커맨드 |
| 4b | `voice/actors.md` | 보이스 배정 — Gemini TTS 전체 목록, 셀럽별 매핑 |
| 4c | `voice/timing-user.md` | 음성 타이밍 사용 가이드 — 갭 기반 파이프라인, 명령어, 트러블슈팅 |
| 5 | `lineup.md` | 편성표 — 배포 순서, 제작 진행 현황 |
| 5b | `candidates.md` | 후보 전략 — 라이벌 묶음, 정치 교차, 주의사항 |
| 5c | `candidates-raw.md` | 후보 전체 리스트 — DB 자동 생성, git 미추적. 재생성 방법은 candidates.md 참조 |
| 6 | `rules.md` | 불변 규칙 — 윤리, 데이터 흐름, 개발 주의사항, 체크리스트 |
| 7 | `render.md` | 렌더 출력 — 명령어, 파일명 규칙, 코덱·PNG 무손실 옵션 |

### 영상 관리 대시보드

| 문서 | 내용 |
|------|------|
| `docs/project/remotion-bo-plan.md` | remotion-bo 기획서 — IA, 라우팅, API, 구현 우선순위 |

### 게임 (천도)

| 문서 | 내용 |
|------|------|
| `docs/project/suikoden-dev.md` | 천도 게임 개발 룰북 |
| `docs/suikoden-sim/` | 천도 게임 기획서 (10개 문서) |

## TODO

미완료 작업 목록. 각 항목의 상세 계획은 `docs/todo/` 디렉토리 참조.
TODO 작업자는 작업 후 이 파일을 업데이트 하여 아래 QUEUE를 제거하고 추후의 개발자에게 정보를 공유할 필요성이 있는 경우 상단의 "상세 레퍼런스" 에서 참조할 수 있는 문서를 따로 작성함으로서 마무리를 해줘야 한다.

| 작업 | 계획서 | 상태 | 비고 |
|------|--------|------|------|
| BOOK en 데이터 전량 재검증 | `docs/en-book-data-quality.md` | **완료** | naver_book 2,364건 전량 verified. 한글/CJK 잔존 0건 |
| VIDEO 영문 썸네일 수집 (1,340건) | `docs/todo/video-en-thumbnails.md` | **완료** | 1,326건 수집, 14건 unavailable |
| Supabase 타입 재생성 | — | 대기 | content_locales 포함, 현재 `as any` 캐스팅 |
| 셀럽 창작 서가 | — | **완료** | 실시간 Wikidata SPARQL 조회 방식. celeb_works 테이블 DROP 완료 |
| 음성 R2 관리 시스템 | — | **완료** | WAV git 제외, R2 업로드/다운로드/동기화. voice-r2.ts |
| remotion-bo 프로젝트 | `docs/project/remotion-bo-plan.md` | **Phase 2 완료** | Next.js. 시리즈 레지스트리, 2단 사이드바, Supabase 셀럽 검색, 스캐폴딩. AI 초안은 LLM 연동 시 별도 |
| 포트 정비 | — | **완료** | remotion 3003, lab 3002, remotion-bo 3010+3011. bashrc 동기화 |
| 단어 단위 voiceTimings 파이프라인 | `docs/todo/voice-timing-gap-pipeline.md` | **v5 완료** | WhisperX + diff-match-patch 단어 매핑. Typewriter 글자 스윕 하이라이트 |
| BookCardVisual 페이지 전환 버그 | `docs/todo/book-card-page-break.md` | **완료** | needsQuoteCtxAfterBreak로 quote→contextAfter 3페이지 전환 |

* 마지막 작업 시각: 26.03.23

## 아이디어 응답 방식

네이밍 작명, 문학적 아이디어 등 창작 아이디어 요청 시: 개행·설명·번호 없이, 아이디어만 다수 나열한다.
