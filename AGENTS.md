# AGENTS.md

프로젝트 가이드 단일원천. 모든 AI 도구(Claude, Codex 등)는 이 파일을 참조한다.

## 프로젝트 개요

Feelandnote는 콘텐츠(도서, 영상, 게임, 음악, 자격증) 소비 기록 및 관리 서비스다. 

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

### Remotion

음성, 렌더, R2, bash 별칭 등 모든 명령어는 `docs/project/remotion/README.md` 참조.

**음성 파이프라인 5단계 (재규격화 완료)**:

```
1. pronounce  본문 모호표기 ↔ 발화규칙   (voice:pronounce, /voice-pronounce 스킬)
2. tts        음성 합성 (유료, 사용자 수동) (voice:tts)
3. transcribe 단어 시간 추출               (voice:transcribe)
4. align      세그먼트 시간 + 자동 안전망  (voice:align)
5. chunk      의미 단위 분할 + 검증        (voice:chunk)
```

각 단계 = 한 책임 + 자체 검증 + 트랜잭션. **별도 reconcile-check / sub-check 단계 없음** — 4·5 안에 흡수.

**일괄 진입점**: 2단계(TTS) 후 **`/voice-sync <에피소드명>`** 한 번 호출로 3·4·5 자동. 상세 규격: `docs/todo/voice-timing-gap-pipeline.md`

**발화속도 통일**: 책별 음성의 체감 자/초를 목표값(기본 6.5)으로 맞추는 영상 배속(`*PlaybackRate`) 자동 산출. **`/remo-voice-cps-match <에피소드명>`** 또는 `voice:match-cps`. 제목 제외·dry-run 기본·`--apply` 저장. 원본 wav 불변, book.ko.json 배속 필드만 기록.

## 기술 스택

- Next.js 16.1 (App Router, Server Components)
- React 19.2
- TailwindCSS 4.1 (@theme CSS Variables)
- Supabase (PostgreSQL, 인증, SSR)
- TypeScript 5, pnpm

## 데이터 동기화 원칙 (DB ↔ Remotion)

셀럽의 감상배경(review) 및 도서 목록은 DB와 Remotion이 100% 일치해야 한다(SSoT).
1. **DB → Remotion (스캐폴딩)**: DB에 새로운 도서/콘텐츠가 확정되면, 작업자는 반드시 `sw/remotion/public/episodes/<셀럽>/books/` 에피소드 디렉토리에 폴더를 생성하고 `book.ko.json` 초안을 스캐폴딩하여 누락을 방지한다.
2. **Remotion → DB (환각 방지 백필)**: Remotion 대본 작성 과정에서 추가된 디테일을 DB로 흡수할 때(`/remo-review-backfill`), **모든 신규 일화와 인용구는 반드시 `search_web`으로 독립적인 팩트체크를 거친다.** 3자 큐레이션 사이트의 자의적 해석이나 대본 AI의 환각이 DB를 오염시키지 않도록 원천 차단한다.

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
| C | `celeb-content-audit.md` | 콘텐츠 데이터 감사 (출처·locale·thumbnail 검증) |
| A | `celeb-tag-system.md` | 부록: 스포트라이트 태그 |
| B | `voice-generation-wave2.md` | 부록: 보이스 생성 Wave 2 |

### 인프라 · 운영

| 문서 | 내용 |
|------|------|
| `docs/project/external-services.md` | Supabase, R2, GA, 음성 경로, 크론잡, egress 사고 이력 |
| `docs/project/openai-usage.md` | OpenAI/GPT API — 모델 선택, 이미지 생성 해상도·품질·비용 기준 |
| `docs/project/web-egress-audit-2026-06-29.md` | web egress 전수 재점검 보고서(2026-06-29) — 원인 정정·적용 조치·복구 후 과제 |
| `docs/project/seo.md` | SEO — 사이트맵, robots, 검색엔진 등록, MCP |
| `docs/project/monetization.md` | 수익화 방안 (AdSense 등) |
| `docs/project/sns-expansion.md` | **[세력확장]** SNS 멀티채널 확장 작전 — 플랫폼 보드·로드맵·결정 로그 (라이브). 트리거 키워드 `[세력확장]` 시 우선 참조 |
| `docs/project/card-news/IMPLEMENTATION.md` | 카드뉴스 생성기 — 인물·책 카드 7종(BookCard), 편성 A·B, 미리보기(remotion-bo Cards 탭)·편성 저장(faction-cards.json)·출고(render:cards). SNS 카드 출고의 구현 SSoT |

### 영상 (`docs/project/remotion/`)

`README.md`가 공통 허브. 시리즈별 하위 디렉토리 참조.

| 디렉토리 | 내용 |
|----------|------|
| `README.md` | 공통 — 코드 구조, 명령어, 음성 파이프라인 |
| `book-recommend/` | 서재 탐방 — 롱폼·쇼츠·음성·편성·규칙·렌더 |
| `faction.md` | 세력도 — AI 인물 진영별 세로 영상. 컨셉·데이터 모델·편성 원칙·제작 워크플로우 |
| `faction-ideas.md` | 세력도 에피소드 아이디어 뱅크 — 후보 30종 진영·출연 명단(주제 선정은 스킬 faction-series-concept) |
| `faction-hackers-plan.md` | 세력도 「위대한 해커들」 3부작 — 조사 원자료(후보 161건) + 확정 기획(1편 얼굴 있는 자들 / 2편 민간의 가면 / 3편 국가의 군단) |
| `faction-social-streaming-plan.md` | 세력도 「소셜 네트워크 / 스트리밍」 통합 재설계 — 플랫폼 150종+ 전수 조사 + 2시리즈(소셜·스트리밍) 진영 기획. 기존 보류 3에피소드(social-network·streaming·streaming-media) 통합 |

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
| web egress 재점검·잠금 | `docs/project/web-egress-audit-2026-06-29.md` | **진행 중** | Pro 결제 복구(26.07.03). 실측 PostgREST 100%. 페이로드 다이어트(persona 7MB→560KB·review_en·게임)·정적화 머지 완료. 잔여: CRON_SECRET(유저)·태그 국소화·tracker RPC 교정(토큰 갱신 필요)·[locale] 정적 렌더 |
| BOOK en 데이터 전량 재검증 | `docs/en-book-data-quality.md` | **완료** | naver_book 2,364건 전량 verified. 한글/CJK 잔존 0건 |
| VIDEO 영문 썸네일 수집 (1,340건) | `docs/todo/video-en-thumbnails.md` | **완료** | 1,326건 수집, 14건 unavailable |
| Supabase 타입 재생성 | — | **완료** | 26.06.12 재생성 + any 캐스팅 148건 전량 제거 |
| 셀럽 창작 서가 | — | **완료** | 실시간 Wikidata SPARQL 조회 방식. celeb_works 테이블 DROP 완료 |
| 음성 R2 관리 시스템 | — | **폐기** | R2 음성 동기화 제거 (26.03.23). 영상 음성은 로컬 전용 |
| remotion-bo 프로젝트 | `docs/project/remotion-bo-plan.md` | **Phase 2 완료** | Next.js. 시리즈 레지스트리, 2단 사이드바, Supabase 셀럽 검색, 스캐폴딩. AI 초안은 LLM 연동 시 별도 |
| 포트 정비 | — | **완료** | remotion 3003, lab 3002, remotion-bo 3010+3011. bashrc 동기화 |
| 단어 단위 voiceTimings 파이프라인 | `docs/todo/voice-timing-gap-pipeline.md` | **v5 완료** | WhisperX + diff-match-patch 단어 매핑. Typewriter 글자 스윕 하이라이트 |
| BookCardVisual 페이지 전환 버그 | `docs/todo/book-card-page-break.md` | **완료** | needsQuoteCtxAfterBreak로 quote→contextAfter 3페이지 전환 |
| 쇼츠 이미지 타이밍 수정 | `docs/todo/shorts-image-without-voice.md` | **완료** | voiceTimings 없을 때 imageChangeAt 간격에 맞춰 세그먼트 시간 및 크로스페이드 동적 조정 |
| 서재 탐방 1권 모드(SOLO) | `docs/project/remotion/book-recommend/solo.md` | **음성 외 완료** | 16:9 자동 변환 영상. 책 본문(book·meta)이 단일 SSoT — 솔로 전용 데이터·편집 화면 폐기. Remotion 자동 변환 + 렌더·유튜브 자동 메타. 음성 파이프라인은 wav 생성 후 |

* 마지막 작업 시각: 26.05.23

## 아이디어 응답 방식

네이밍 작명, 문학적 아이디어 등 창작 아이디어 요청 시: 설명 없이, 아이디어만 다수 나열한다. 개행 등으로 분리만

## 기능 설명 방식 (유저 대상)

유저에게 기능을 설명할 때는 기술 용어·내부 명칭을 남발하지 않는다.

- 개발·작명·파일명·컴포넌트명·함수명·플래그명 등은 전부 AI가 직접 만든 것이다. 유저는 그 이름을 처음 듣는다.
- 따라서 `VoiceTimingEditor`, `imageChangeAt`, `needsQuoteCtxAfterBreak`, `shorts.segments` 같은 이름을 갑자기 꺼내면 유저는 무엇을 가리키는지 알 수 없다.
- **한국어로 보여도 코드에서 새어나온 단어는 내부 명칭이다.** "segment", "line", "field", "라인", "줄", "구간", "필드", "트림", "토글" 등이 데이터 구조·변수명에서 그대로 옮겨온 것이라면 일상어가 아니다. 일상어로 풀거나, 꼭 써야 하면 처음 등장 시 한 줄 설명을 곁들인다.
- 설명은 **개발과 무관한 일상 용어**로 한다. 예: "자막 타이밍 편집 화면", "쇼츠 이미지 전환 간격", "인용문 다음 페이지 분기 처리" 등 **그 기능이 실제로 무엇을 하는지**를 유저의 시선으로 풀어 쓴다.
- "막다", "가두다", "차단" 등 모호·공격적 표현 대신 **무엇이 어떻게 보이거나 동작하는지**를 직접 묘사한다. 예: "잘못 뜬 버튼을 안 보이게 가리고 안내 문구만 둔다".
- 내부 명칭을 꼭 병기해야 할 때는 괄호로 보조 표기만 한다. 예: "쇼츠 이미지 전환 간격(imageChangeAt)".
- 코드 변경 보고·PR 설명처럼 개발 맥락이 명확한 경우에만 원 명칭을 전면에 쓴다.
- **자가 점검**: 답변 보내기 전 다시 본다. "이 단어를 처음 듣는 유저가 즉시 이해하나? 코드에서 따온 단어인가?" 둘 중 하나라도 걸리면 풀어 쓴다.
