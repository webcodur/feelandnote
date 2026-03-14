# AGENTS.md

프로젝트 가이드 단일원천. 모든 AI 도구(Claude, Codex 등)는 이 파일을 참조한다.

## 프로젝트 개요

Feelandnote는 콘텐츠(도서, 영상, 게임, 음악, 자격증) 소비 기록 및 관리 서비스다. Neo-Pantheon(고전 신전) 테마의 다크 UI. 모노레포 구조:
- `sw/web` - 사용자용 웹 (포트 3000)
- `sw/web-bo` - 관리자 백오피스 (포트 3001)
- `sw/lab` - 실험 공간 (포트 3002) — 3D/2D 모델, 게임, 영상 테스트
- `sw/remotion` - Remotion 영상 제작 스튜디오
- `packages/content-search` - 외부 콘텐츠 검색 API (Naver, TMDB, IGDB, Spotify, Google Books, Q-Net)
- `packages/ai-services` - AI 서비스 (셀럽 프로필 타입, 영향력 분석)
- `packages/influence-constants` - 영향력 평가 상수
- `packages/shared` - 공유 상수, 타입, 훅

## 주요 명령어

```bash
pnpm dev:web    # 사용자 웹 (포트 3000)
pnpm dev:bo     # 관리자 백오피스 (포트 3001)
pnpm build:web
pnpm build:bo
pnpm dev:lab    # 실험 공간 (포트 3002)
pnpm dev:remotion # Remotion 스튜디오
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

### 영상 — 서재 탐방 (`docs/project/remotion/`)

| 장 | 문서 | 내용 |
|----|------|------|
| 1 | `README.md` | 개요, 코드 구조, SSoT 데이터 흐름, 윤리 원칙 |
| 2 | `longform.md` | 롱폼 — 섹션 구성, 역할·말투, 타이밍, 워크플로 |
| 3 | `shorts.md` | 쇼츠 — 4비트 구조, 비주얼, 음성, 자막 |
| 4 | `tts.md` | 음성 생성 — 엔진, 보이스, 커맨드, web-bo 통합 |
| 5 | `lineup.md` | 편성 — 인물 선정, 라이벌 묶음, 정치 균형 |
| 6 | `rules.md` | 불변 규칙 — 윤리, 데이터 흐름, 개발 주의사항, 체크리스트 |

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

* 마지막 작업 시각: 26.03.11

## 아이디어 응답 방식

네이밍 작명, 문학적 아이디어 등 창작 아이디어 요청 시: 개행·설명·번호 없이, 아이디어만 다수 나열한다.
