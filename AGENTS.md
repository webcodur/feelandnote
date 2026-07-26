# AGENTS.md

프로젝트 가이드 단일원천. 모든 AI 도구(Claude, Codex 등)는 이 파일을 참조한다.

## 프로젝트 개요

Feelandnote는 콘텐츠(도서, 영상, 게임, 음악, 자격증) 소비 기록 및 관리 서비스다. 

| # | 앱 | 경로 | 포트 | 설명 |
|---|-----|------|------|------|
| 1 | web | `sw/web` | 3000 | 사용자용 웹 (Next.js) |
| 2 | web-bo | `sw/web-bo` | 3001 | 관리자 백오피스 (Next.js) |
| 3 | remotion | `sw/remotion` | 3002 + 8001 | 영상 제작 (Studio + serve) |
| 4 | remotion-bo | `sw/remotion-bo` | 3003 | 영상 관리 대시보드 (Next.js) — **서재 탐방 하나만 남았다.** 팩션 구역 폐기 26.07.25 · 가상 담화 구역 폐기 26.07.26, 둘 다 web-bo로 통합. 시리즈가 하나뿐이라 `[series]` 추상화의 존치 여부를 정해야 한다(`docs/project/remotion-bo-plan.md` 「단일 시리즈가 된 뒤」) |
| 5 | lab | `sw/lab` | 3004 | 실험 공간 — 2D/3D, 게임 (Vite) |
| 6 | audio-bo | `sw/audio-bo` | 3005 | 로컬 음원 정리·받아쓰기·화자 학습·음성 합성 작업실 (Next.js) |

**공유 패키지** (`packages/`):
- `content-search` — 외부 콘텐츠 검색 API (Naver, TMDB, IGDB, Spotify, Q-Net). ⚠️ **Google Books는 폐기** — 일일 한도 1,000건이라 대량 수집 불가(키 5개를 돌려써도 부족했다). 코드·`.env` 키·DB 249건은 레거시로 남아 있으나 **신규 사용 금지**. 무료라고 되살리지 마라 — 비용이 아니라 한도가 문제다. 책 메타 출처는 네이버·OpenLibrary만
- `ai-services` — AI 서비스 (셀럽 프로필 타입, 영향력 분석)
- `influence-constants` — 영향력 평가 상수
- `shared` — 공유 상수, 타입, 훅

## AI 작업 완료·검수 보고 원칙

- 이미지·코드·문서 작업은 **실행 → 자체 검수 → 작업보고**를 한 덩어리로 완료한다.
- 자체 검수에서는 형식 충족만 보지 말고, 결과물의 개연성·맥락·구도·실사용 가능성을 직접 판단한다. 실패 후보를 성공한 결과처럼 넘기지 않는다.
- 작업보고에는 산출물과 저장 경로, 변경 내용, 자체 피드백, 현재 사용 가능 여부를 함께 적는다.
- 이미지 생성은 생성 직후 육안으로 검수하며, 공간 관계나 시대·물리적 개연성이 어긋나면 그 이유를 명시하고 승인 후보로 취급하지 않는다.

## 주요 명령어

### 개발 서버

```bash
pnpm dev:web          # 1. 사용자 웹 (:3000)
pnpm dev:bo           # 2. 관리자 백오피스 (:3001)
pnpm dev:remotion     # 3. Remotion Studio (:3002) + serve (:8001)
pnpm dev:remotion-bo  # 4. Remotion 관리 대시보드 (:3003)
pnpm dev:lab          # 5. 실험 공간 (:3004)
pnpm dev:audio-bo     # 6. 음성 작업실 (:3005)
```

### 빌드

```bash
pnpm build:web
pnpm build:bo
pnpm build:audio-bo
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

**일괄 진입점**: 2단계(TTS) 후 **`/voice-sync <에피소드명>`** 한 번 호출로 3·4·5 자동. 상세 규격: `docs/project/remotion/book-recommend/voice/voice-timing-pipeline.md`

**발화속도 통일**: 책별 음성의 체감 자/초를 목표값(기본 6.5)으로 맞추는 영상 배속(`*PlaybackRate`) 자동 산출. **`/remo-voice-cps-match <에피소드명>`** 또는 `voice:match-cps`. 제목 제외·dry-run 기본·`--apply` 저장. 원본 wav 불변, book.ko.json 배속 필드만 기록.

## 기술 스택

- Next.js 16.1 (App Router, Server Components)
- React 19.2
- TailwindCSS 4.1 (@theme CSS Variables)
- Supabase (PostgreSQL, 인증, SSR)
- TypeScript 5, pnpm

## UI 상호작용 원칙 (전 앱 공통)

조작용 요소의 hover는 **즉각 반응**이 기본이다. 사용자가 손을 올린 즉시 상태가 바뀌어야 한다.

1. **한 요소의 hover에는 지연 없이 즉시 바뀌는 반응이 최소 하나 반드시 있어야 한다.** 보통 테두리·글자색·배경의 색 강조가 그 축이며, 여기엔 `transition`·`delay`를 얹지 않는다.
2. **즉각 축이 확보되면 곁들이는 연출은 애니메이션으로 돌려도 된다.** 배경 확대, 장식 페이드인, 밑줄 차오름 등. 단 즉각 축과 **다른 엘리먼트에 나눠 걸고**, `transition-transform`처럼 속성을 특정한다(`transition-all`은 즉각 축까지 굼뜨게 만든다).
3. **애니메이션 자체를 금지하는 규칙이 아니다.** 공간·레이아웃이 실제로 열리고 닫히는 전환(사이드바 여닫기, 아코디언, 모달 등장, 페이지 전환)은 애니메이션이 본질이므로 `transition`을 그대로 쓴다.
4. **판별**: 요소가 자기 상태를 강조하면 즉각, 공간이 이동·개폐하거나 곁들이는 연출이면 애니메이션.

상세 규칙·클래스 예시는 `docs/project/code-rules.md`의 "상호작용" 절 참조.

## 데이터 동기화 원칙 (DB ↔ Remotion)

셀럽의 감상배경(review) 및 도서 목록은 DB와 Remotion이 100% 일치해야 한다(SSoT).
1. **DB → Remotion (스캐폴딩)**: DB에 새로운 도서/콘텐츠가 확정되면, 작업자는 반드시 `sw/remotion/public/episodes/<셀럽>/books/` 에피소드 디렉토리에 폴더를 생성하고 `book.ko.json` 초안을 스캐폴딩하여 누락을 방지한다.
2. **Remotion → DB (환각 방지 백필)**: Remotion 대본 작성 과정에서 추가된 디테일을 DB로 흡수할 때(`/remo-db-review-backfill`), **모든 신규 일화와 인용구는 반드시 `search_web`으로 독립적인 팩트체크를 거친다.** 3자 큐레이션 사이트의 자의적 해석이나 대본 AI의 환각이 DB를 오염시키지 않도록 원천 차단한다.

## 레퍼런스

작업에 해당하는 문서만 참조한다.

### 아키텍처 · 코드

| 문서 | 내용 |
|------|------|
| `docs/vision.md` | **서비스 비전 선언문** — 웹·게임·영상을 관통하는 "향유 분석" 축 |
| `docs/project/architecture.md` | 앱 6종 디렉토리 구조, 네비게이션, 라우팅, `[locale]`·레거시 리다이렉트 |
| `docs/project/service/README.md` | **사용자 대면 화면 허브** — 화면 그룹 구성·전체 지도 |
| `docs/project/service/library.md` | 서가(`/library`) — 시대별·직군별·박물관·학당 |
| `docs/project/service/agora.md` | 광장 — 피드·소셜·게시판 3종 |
| `docs/project/service/profile.md` | 프로필·기록관 — 독서·유산·티어·업적·방명록 |
| `docs/project/service/explore.md` | 탐색 — 인물·랭킹·페르소나·세력도감·타임라인 외 |
| `docs/project/celeb-journey.md` | **인물 생애 행적 SSoT** — 인물 상세 04번 구획(연표 + 활동 반경 지구본). 테이블 `celeb_timeline_events`, 공용 지구본 `WorldGlobe`, 조사·적재 도구 2종, 좌표·링크 함정 7종 |
| `docs/project/web-bo.md` | 관리자 백오피스(web-bo) — 라우팅 전수, 운영 워크플로 |
| `docs/project/audio-bo.md` | 음성 작업실(audio-bo) — 음원 정리·받아쓰기·화자 학습·합성 |
| `docs/project/audio-bo-tts-engine-research.md` | audio-bo TTS 엔진 조사 |
| `docs/project/game-card-images.md` | 쉼터 게임 카드 상징 이미지 발주서 — 로비 캔버스 4종(여명·미궁·패권·천도) 기반 프롬프트·규격·납품 경로 |
| `docs/project/code-rules.md` | 코드 규칙, 디자인 시스템 |
| `docs/project/i18n.md` | 다국어화 계획, 진행 현황, 기술 참조 |

### DB · 데이터

| 문서 | 내용 |
|------|------|
| `docs/project/db-core.md` | DB 스키마 — 사용자, 콘텐츠, 커뮤니티, UUID 체계 |
| `docs/project/db-celeb.md` | DB 스키마 — 셀럽 테이블, 이미지 규격, slug, Wikidata QID |

> content_locales 설계·마이그레이션 기록과 BOOK en 데이터 검증 이력은 완료되어 `docs/archive/`로 옮겼다.

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
| A | `celeb-tag-system.md` | 부록: 세력도감 태그 |
| B | `voice-generation-wave2.md` | 부록: 보이스 생성 Wave 2 (2026-03 회차 스냅샷) |
| S | `../faction-ai-group-refactor.md` | 세력도감 AI 그룹 구조 (구현 완료. `faction-celeb-sync` 스킬이 참조) |
| G | `celeb-gotchas.md` | **셀럽 데이터 함정 모음** — 목록 노출 기준, 페이지 안 뜰 때 증상별 원인, 대사 3대 결함, 등급 승격 조건, 선정 기준, 책 메타 출처 제한, 등록 우회 |

**가상 독백 (`profiles.virtual_monologue`)** — 셀럽 상세 페이지의 1인칭 독백. 규격은 문서가 아니라 코드에 있다.

| 경로 | 내용 |
|------|------|
| `sw/web-bo/scripts/fill-virtual-monologue-gpt.ts` | **실존 인물 독백의 SSoT.** `buildPrompt`가 규격 전문을 쥔다 — 재료는 `bio`+생몰만(감상 여정·페르소나·대사는 오염 우려로 금지), 백지 생성이 아니라 기존 글 개선, 분량은 영향력 등급 연동(65+ 1200자 / 50+ 1000자 / 35+ 850자 / 그 외 800자), 말투는 `commander` 직군 + 지정 4명만 평어체. GPT-5.6(codex 구독, 종량 비용 없음)으로 생성. `--no-force`면 독백 없는 인물만 |
| `sw/web-bo/scripts/translate-virtual-monologue.ts` | **영문본(`virtual_monologue_en`)의 SSoT.** 번역이 아니라 같은 사람이 영어로 다시 쓴 독백이다. 지키는 것은 사실·이름·연대·주장과 감정의 무게뿐, **문장 경계·문단 구분·서술 순서는 영어 산문이 원하는 대로 다시 짠다**(문단 수가 원문과 달라도 됨. 프로젝트 번역 원칙 1:1 매핑 금지=`remo-write-7-translation` 기둥 2). 사극체·고전 register는 같은 무게의 영문 register로 옮긴다(기둥 3). 정중/평어 구분은 영어에 없으므로 어휘·리듬으로 대체, 본인이 실제 영어로 남긴 표현은 원문 복원, em dash 금지. "남들이 나를 이렇게 부른다"로 여는 틀이 반복되지 않게 오프닝은 인물마다 새로 잡는다. Claude Sonnet을 `claude -p` headless로 호출(구독 인증, 종량 비용 없음). `--no-force`(빈 인물만)·`--resume`(중단분)·`--slugs a,b`(지정 인물만) |
| `sw/web-bo/docs/todo/korean-writing-quality.md` | 모델별 한국어 작문 실력 실측(GPT-5.6 60 / GLM-5.2 40 / Claude Opus 15). **이 작업을 Claude가 직접 쓰지 않고 GPT에 발주하는 근거** |
| `.agents/skills/fiction-profile-monologue/` | 신화·허구(`fiction` 티어) 인물 전용 트랙 — 원전 근거·반복 비판 검토·manifest 반영 |

> 옛 규격 문서 `sw/web-bo/docs/todo/virtual-monologue-plan.md`는 26.07.20 `c493cad1`에서 삭제됐다(GLM 시대 규격이라 이미 낡음). 회수하려면 `git show c493cad1^:<경로>`.
> 독백을 고친 뒤 서비스 반영이 안 보이면 캐시 7일이 남은 것이다 — `/api/revalidate`에 `celebs` 태그를 던지면 즉시 갱신된다(전량 갱신 비용 실측 10MB 미만).

**셀럽 아바타 정비 (진행 중, 26.07.20 기준)** — 작업 문서는 **저장소 루트**의 `celeb-avatar-*.md` 4종이다.

| 문서 | 내용 · 상태 |
|------|------|
| `celeb-avatar-defects.md` | 등록분 1,563명 불량 검수(흑백·얼굴 미검출 등) — **26.07.20 완료, 28명 교체**. 재검사 스크립트(`sw/web-bo/scripts/audit-celeb-avatars.ts`)·교체 파이프라인 포함. 동명이인 전수 대조는 미착수 |
| `celeb-avatar-missing.md` | 미등록 138명 명단(역사·신화 80 / 현대 58, 26.07.15) + 옛 인물 외형 프롬프트 기작성 |
| `celeb-avatar-local-assets.md` | 미등록자 로컬 자산 전수 대조(26.07.20) — 완성 개인샷 보유 38 / REF만 45 / 자산 없음 34 |
| `celeb-avatar-modern-targets.md` | 현대 25명 실사 조사(쉬움 15·동명이인 고위험 8 경고). 조사만, 등록 미실행 |

남은 작업: 미등록 ~129명 채우기(완성샷 보유 38명이 최우선 덩어리). 등록 자동화는 `.agents/skills/celeb-avatar-wikimedia/SKILL.md`, 규격은 `docs/project/db-celeb.md`(800×800 webp, 26.03.24 이전분은 300×300 구버전).

**셀럽 자료 디렉토리**

| 경로 | 내용 |
|------|------|
| `docs/celeb-data/dialogue/` | 인물별 고유 대사 원고 11종 (`celeb-speech.md` 트랙 산출물) |

> **어록 채굴물은 `docs/`에 두지 않는다.** 소속 에피소드 폴더의 `quotes/`에 둔다(아래 영상 절 원칙).
> 26.07.16 이관 완료(18종) — 팩션은 `factions/<에피소드>/quotes/`(AI-Supremacy 13, PayPal-Mafia 4), 북리커맨드는 `episodes/<시리즈>/<인물>/quotes/`(관우 1). `docs/resource/언사/`는 비어서 제거했다.

### 인프라 · 운영

| 문서 | 내용 |
|------|------|
| `docs/project/external-services.md` | Supabase, R2, GA, 음성 경로, 크론잡, egress 사고 이력 |
| `docs/project/openai-usage.md` | OpenAI/GPT API — 모델 선택, 이미지 생성 해상도·품질·비용 기준 |
| `docs/project/web-egress-audit-2026-06-29.md` | web egress 전수 재점검 보고서(2026-06-29) — 원인 정정·적용 조치·복구 후 과제 |
| `docs/project/seo.md` | SEO — 사이트맵, robots, 검색엔진 등록, MCP |
| `docs/project/traffic-audit-2026-07-25.md` | **유입·행동 실측 감사(26.07.25)** — 규모는 하루 26명(밑바닥), 그 유입의 91%가 네이버·구글 1.6%. 자체 블로그 경유 가설은 랜딩 480~516종 분포로 기각(블로그 경유 16세션). 인물 화면 체류 78초·재방문 5.3%·로그인 도달 90일 7명. 🔴 **페이지/세션(1.22장)을 참여도로 읽지 마라** — 인물 화면은 한 장에 다 담은 설계이고 겹창(26.07.24 도입)이 화면 전환을 의도적으로 줄인다. 초판의 "홈 4.76장 대비 최악" 판정은 철회됐다. 행동 계측 부재와 그 해소(이벤트 5종). GSC·GA4 조회 수단(서비스계정 JWT)과 재현법 포함. **검색·유입 판단의 기준선** |
| `docs/project/monetization.md` | 수익화 방안 (AdSense 등) |
| `docs/project/adsense-audit-2026-07-15.md` | **AdSense 반복 거절 감사·교정 보고서(26.07.15)** — 원인 규명(색인률 2%)·조치 8종·검증 실측·재신청 절차·남은 과제. AdSense 관련 작업의 SSoT |
| `docs/project/sns-expansion.md` | **[세력확장]** SNS 멀티채널 확장 작전 — 플랫폼 보드·로드맵·결정 로그 (라이브). 트리거 키워드 `[세력확장]` 시 우선 참조 |
| `sw/remotion/docs/project/card-news/IMPLEMENTATION.md` | 카드뉴스 생성기 — 인물·책 카드 7종(BookCard), 편성 A·B, 미리보기(서재 탐방=remotion-bo Cards 탭 / 팩션=web-bo `/factions` 카드 화면, 26.07.25 이관)·편성 저장(faction-cards.json)·출고(render:cards). SNS 카드 출고의 구현 SSoT. (`docs/project/card-news/`에는 시안 html만 있다) |
| `docs/project/tooling-gotchas.md` | **개발 환경·도구 함정 모음** — 인증 토큰이 죽는 원인, server action 캐시 규칙, 조용한 폴백 금지, 권한 설정, 환경 탓 금지, 다른 CLI의 훅 상속, 모델 상태 점검 |

### 제작 규칙 (글쓰기 · 이미지)

작업물의 품질 기준이다. 코드 규칙(`code-rules.md`)과 별개로, **텍스트를 쓰거나 이미지를 발주할 때 항상 참조한다.**

| 문서 | 내용 |
|------|------|
| `docs/project/writing-rules.md` | **한국어 글쓰기 규칙 SSoT** — 문장 규칙(어순·연결어·종결·번역투), 어휘와 톤(단골 어휘·사극투·설교조 마무리·가난 프레임 금지), 구조와 분량(두괄식·압축·호흡), 인용과 사료(직접인용 자격·부재 단정 금지·모국어 검색), 유저 원고 다루기, 영상 대본 각색 |
| `docs/project/image-generation.md` | **이미지 생성·발주 SSoT** — 프롬프트 작성 원칙, 행동·시선·몸방향 결합, 텍스트 수사의 구도 라임, 시그니처 컷, 구도 찍어내기 금지, 얼굴 REF 사용 규칙, 생성 도구별 함정과 회수법 |

### 영상 (`docs/project/remotion/` + `sw/remotion/public/factions/`)

`docs/project/remotion/README.md`가 공통 허브. **에피소드별 조사·기획·어록은 해당 팩션 폴더**에 둔다(docs에 잡다하게 쌓지 않음).

| 경로 | 내용 |
|------|------|
| `docs/project/remotion/README.md` | 공통 — 코드 구조, 명령어, 음성 파이프라인 |
| `docs/project/remotion/gotchas.md` | **영상·음성 제작 함정 모음** — 음성 합성 엔진별 한계·키 로테이션, 정렬과 자막 타이밍(**폐기된 접근 3종** 재제안 금지), 렌더와 미리보기, 데이터 구조 함정, 환경, 작업 규칙 |
| `docs/project/remotion/book-recommend/` | 서재 탐방 — 롱폼·쇼츠·음성·편성·규칙·렌더 |
| `docs/project/remotion/faction.md` | 세력도 **엔진 SSoT** — 컨셉·데이터 모델·편성·제작 워크플로우 |
| `docs/project/remotion/faction-unification.md` | **팩션 완전 통합 SSoT** — DB 단일 원천(faction_* 5테이블), 편집·출간은 web-bo `/factions` 하나, `faction-data.json` 은 렌더용 산출물(직접 편집 금지), 세력도감 출간 규칙. 26.07.25 Phase 5 완료 |
| `docs/project/remotion/faction-rules.md` | **팩션 제작 규칙·함정** — 용어와 데이터 구조, 인물 채택 기준, 대사 규칙, 음성 위치 규칙과 음량 함정, 영상 미디어, 썸네일, 아바타 연동, 진행 중 기획 현황 |
| `docs/project/remotion/discourse.md` | 가상 담화 — 기획 원문(실효 항목은 discourse-unification §0 참조). 독백·난입 반박·대담을 한 엔진으로. 원천=`profiles.virtual_monologue`(사료 — 런타임 의존 아님). **편집은 web-bo `/discourses`** |
| `docs/project/remotion/discourse-unification.md` | **담화 완전 통합 SSoT** — DB 단일 원천(discourse_* 3테이블), 편집·출간은 web-bo `/discourses` 하나, 세 파일(discourse-data·cast·turns)은 렌더용 산출물(직접 편집 금지). 왕복 검증 7종·반증 시험 10종·export 발효·remotion-bo 담화 폐기. **26.07.26 Phase 5 완료** |
| `docs/project/remotion/three-kingdoms.md` | 삼국지 인물 그룹 SSoT — `three-kingdoms` 스킬이 참조 |
| `factions/_docs/folder-rules.md` | **팩션 폴더·파일·단계 규격 SSoT** (춘추전국 정리. 신규 작업 필수) |
| `factions/_voice-casting/README.md` | ELE 보이스 캐스팅 운영 |
| `factions/not-using/IDEAS-BANK.md` | 에피소드 아이디어 뱅크(후보 풀). **폴더 72편은 26.07.26에 DB로 이관됐다** — 상태 `idea`, 폴더 키는 `not-using/<분류>/<이름>`, web-bo `/factions` 표 맨 아래 「아이디어 후보」에서 열고 편집한다. 보관함 밖으로 이름을 바꾸는 것이 곧 승격이다 |
| `factions/not-using/korea-ideas/` | 한국 소재 아이디어 뱅크 |
| `factions/not-using/philosophy-and-myth/` | 신화 시리즈 데이터·`00-QUEUE.md`·`mythology-plan.md` |
| `factions/great-hackers-faces/_docs/plan.md` | 위대한 해커들 3부작 기획 |
| `factions/Digital-Resistance/_docs/saga-expansion.md` | 디지털 레지스탕스 확장 기획 |
| `factions/Social-Network/_docs/social-streaming-plan.md` | 소셜·스트리밍 통합 기획 |
| `factions/Homer-Iliad/_docs/quotes/` · `Homer-Odyssey/_docs/` | 호메로스 어록 조사 |
| `factions/X-Empire/quotes/` · `Path-of-Kings-West/quotes/` | 어록 채굴 |
| `factions/world-best-2026/resume.md` | 2026 월드 베스트 11 보류 — 재개 시 이 문서만 |

**[팩션 REF 이미지 세팅 원칙]**
팩션(세력도) 등 인물 얼굴 REF가 없는 에피소드를 작업할 때는 반드시 다음의 단일 원칙만을 따른다.
1. **오직 `D:\image\완성` 폴더(하위 포함)에서만 인물명과 일치하는 실사 이미지를 검색하여 할당한다.** (`_refs/<세력명>/<인물명>.png` 구조)
2. **`D:\image\_재료` 폴더의 가상 얼굴 재료는 절대 사용하지 않는다.** (여러 인물에게 같은 얼굴이 중복 할당되거나 매칭이 어긋나는 참사를 원천 차단하기 위함)
3. 완성 폴더에 인물 이미지가 없다면, AI가 임의로 인터넷에서 대체 이미지를 다운로드하거나 꼼수를 쓰지 말고 사용자에게 "어떤 인물들의 이미지가 완성 폴더에 없는지"를 누락 명단으로 보고한 뒤 지시를 대기한다.
   - **[주의: 스크립트 작성 및 자동화 절대 금지]** 이미지 할당이나 수집을 명목으로 JS/Python 등의 일회성 자동화 스크립트를 작성하여 실행하는 행위를 엄격히 금지한다.

### 영상 관리 대시보드

| 문서 | 내용 |
|------|------|
| `docs/project/remotion-bo-plan.md` | remotion-bo 기획서 — IA, 라우팅, API, 구현 우선순위, **공용 부품(26.07.20 통합)** |

### 게임 (천도)

| 문서 | 내용 |
|------|------|
| `docs/project/suikoden-dev.md` | 천도 게임 개발 룰북 — ⚠️ **비활성(26.07.16)**. 재개 시 「지뢰밭」 절 필독 |
| `docs/suikoden-sim/` | 천도 게임 기획서 (10개 문서) — ⚠️ **비활성**. 재개 시 `10-implementation-status.md` 대조표부터 |

## TODO

미완료 작업 목록. 각 항목의 상세 계획은 `docs/todo/` 디렉토리 참조.
TODO 작업자는 작업 후 이 파일을 업데이트 하여 아래 QUEUE를 제거하고 추후의 개발자에게 정보를 공유할 필요성이 있는 경우 상단의 "상세 레퍼런스" 에서 참조할 수 있는 문서를 따로 작성함으로서 마무리를 해줘야 한다.

| 작업 | 계획서 | 상태 | 비고 |
|------|--------|------|------|
| 북리커맨드 완전 통합 | `docs/project/remotion-bo-plan.md` 「북리커맨드 통합 방침」 | **고민 필요(26.07.26 유저)** | 통합은 확정이나 **형태 결정이 선행** — ① 팩션식 본서비스 동기화 구조 지향 ② **롱폼 폐지, 솔로–쇼츠 2형태로 점진 전환**. 지금 형태로 옮기면 두 번 공사라 스키마 확정 금지, 정찰(읽기/쓰기 주체 전수)까지만 선행 가능. 완료 시 remotion-bo 소멸 |
| web egress 재점검·잠금 | `docs/project/web-egress-audit-2026-06-29.md` | **진행 중** | Pro 결제 복구(26.07.03). 실측 PostgREST 100%. 페이로드 다이어트(persona 7MB→560KB·review_en·게임)·정적화 머지 완료. **CRON_SECRET(④)·태그 국소화(⑤) 완료(26.07.15)** — BO 저장 1회가 캐시 74곳을 전멸시키던 구조 해소. **tracker RPC 교정 완료(26.07.15)** — `get_tracker_candidates`가 부재 컬럼(`quotes`) 참조로 100% 실패 → 매번 fallback → fallback은 462개 id를 단일 `in()`에 실어 URL 한도 초과(실측 300 OK / 462 fail)로 후보 0 → 미궁 게임 진입 불가였다. RPC 재정의(cultural_journey 기준·본문 제외·전체 후보 반환) + `selectInChunks`(200개 단위) 적용. **잔여 (26.07.16 실측 재조사)**: ① ~~all-persona-vectors 경량화~~ → **완료(26.07.16).** RPC화는 불필요했다 — `celeb_persona`에 이미 flat smallint 16컬럼이 있고 트리거 `trg_sync_persona_columns`가 동기화한다(16축 × 1577행 전수 대조 불일치 0). `getSimilarByCelebId.ts`의 select만 교체. **실측 gzip 2.0MB→0.11MB(18.7배)**, 셀럽 1,000명 top-5 전원 동일·거리값 불일치 0으로 결과 동일성 확인. 조용한 실패(에러 미수신)도 함께 해소. ② **`[locale]` 정적 렌더 — 착수 금지.** ⚠️ 전역 차단자는 셀럽 페이지가 아니라 **루트 `app/layout.tsx`의 `await getLocale()`**이다(locale param이 없어 `setRequestLocale` 불가 → headers 폴백 → 전 라우트 동적 확정). 그 결과 셀럽 page의 `revalidate=3600`은 **죽은 코드**이고(prerender-manifest의 dynamicRoutes 0건, `[locale]` 하위 .html 0건) 그 옆 "쿠키를 읽지 않는다" 주석은 거짓이다(`getCelebBySlug`가 `auth.getUser()` 호출). 게다가 체인에 Suspense 경계가 없어 정적화 시 CSR 이탈이 아니라 빌드 실패/라우트 통째 이탈이다. 착수하려면 루트 레이아웃 구조 변경 + Suspense 신설 + 5개소 연쇄 수정이 선행돼야 하고, 색인 회복 관측 중인 지금은 위험 대비 이득이 안 맞는다 |
| AdSense 승인 | `docs/project/adsense-audit-2026-07-15.md` | **재신청 대기·콘텐츠 기준 재검토** | **과거 거절의 가장 강한 설명은 색인·접근 붕괴지만 유일 원인으로 확정하지 않는다.** AdSense 화면의 정확한 거절 문구가 보존되지 않았고, 색인만 회복되면 승인된다는 보장도 없다. 조치 8종 배포·라이브 잔존 확인(26.07.15~22, `2c1aa1ad`).<br>**26.07.22 GSC 실측 — 회복 신호 없음.** 사이트맵 15,884·오류 0·07-17 재다운로드, `/celeb/elon-musk` `lastCrawlTime`은 05-19 그대로, `/about`은 06-30의 404 기록(라이브 200), 신규 콘텐츠 상세 표본 3건은 Google 미발견. 04-15~07-20 검색 노출 고유 페이지 44·노출 183·클릭 10.<br>**신규 위험 전수 집계**: 콘텐츠 6,665건 중 감상문 1건 5,140건(77.1%), 한국어 감상문 중앙값 158자. MUSIC은 1건 비율 88.6%·중앙값 108자. 이는 “얇은 페이지 확정 비율”이 아니라 콘텐츠 가치 위험 지표다.<br>**재신청 게이트**: ① 실제 AdSense 거절 문구·문제 코드 확보 ② 대표 URL `lastCrawlTime` 07-15 이후 이동 + 검색 노출 페이지 44~45 기준선에서 유의미 상승 ③ 감상문 1건·짧은 외부 요약 상세의 색인/출판 기준 결정. 세 조건 충족 전에는 재신청하지 않는다.<br>**26.07.25 GA4 실측 — 전제 재검토 필요.** 90일 유입 2,627세션 중 네이버 2,394(**91%**)·구글 43(**1.6%**)이다. 즉 색인 회복은 **광고 심사 요건이지 트래픽 대책이 아니다** — 두 목적을 섞어 우선순위를 정하지 마라. `/celeb/jensen-huang` 마지막 크롤도 05-18로 07-22 관측과 동일. 상세는 `docs/project/traffic-audit-2026-07-25.md` |
| BOOK en 데이터 전량 재검증 | `docs/archive/en-book-data-quality.md` | **완료** | naver_book 2,364건 전량 verified. 한글/CJK 잔존 0건 |
| VIDEO 영문 썸네일 수집 (1,340건) | `docs/archive/video-en-thumbnails.md` | **완료** | 1,326건 수집, 14건 unavailable |
| Supabase 타입 재생성 | — | **완료** | 26.06.12 재생성 + any 캐스팅 148건 전량 제거 |
| 셀럽 창작 서가 | — | **완료** | 실시간 Wikidata SPARQL 조회 방식. celeb_works 테이블 DROP 완료 |
| 음성 R2 관리 시스템 | — | **폐기** | R2 음성 동기화 제거 (26.03.23). 영상 음성은 로컬 전용 |
| remotion-bo 프로젝트 | `docs/project/remotion-bo-plan.md` | **Phase 2 완료** | Next.js. 시리즈 레지스트리, 2단 사이드바, Supabase 셀럽 검색, 스캐폴딩. AI 초안은 LLM 연동 시 별도 |
| 포트 정비 | — | **완료** | remotion 3003, lab 3002, remotion-bo 3010+3011. bashrc 동기화 |
| 단어 단위 voiceTimings 파이프라인 | `docs/project/remotion/book-recommend/voice/voice-timing-pipeline.md` | **v5 완료** | WhisperX + diff-match-patch 단어 매핑. Typewriter 글자 스윕 하이라이트. 규격 SSoT라 `todo/`에서 승격 이동 |
| BookCardVisual 페이지 전환 버그 | `docs/archive/book-card-page-break.md` | **완료** | needsQuoteCtxAfterBreak로 quote→contextAfter 3페이지 전환 |
| 쇼츠 이미지 타이밍 수정 | `docs/archive/shorts-image-changelog.md` | **완료** | voiceTimings 없을 때 imageChangeAt 간격에 맞춰 세그먼트 시간 및 크로스페이드 동적 조정 |
| 서재 탐방 1권 모드(SOLO) | `docs/project/remotion/book-recommend/solo.md` | **음성 외 완료** | 16:9 자동 변환 영상. 책 본문(book·meta)이 단일 SSoT — 솔로 전용 데이터·편집 화면 폐기. Remotion 자동 변환 + 렌더·유튜브 자동 메타. 음성 파이프라인은 wav 생성 후 |
| `publication-gate.py` 사망 | `docs/project/remotion/book-recommend/writer/7-translation.md` | **완료(26.07.16)** | 옛 구조(`episodes/{stage}/{slug}/ko.json`)를 전제해 즉시 종료하던 것을 신 구조(`episodes/<인물>/meta.{ko,en}.json` + `books/*/book.{ko,en}.json` + `shorts.{ko,en}.json`)로 재작성. `stage` 인자 폐지(옛 호출은 무시하고 동작). 검증 7종 의도 보존 + 결함 보강(#2가 파싱 실패 시 그냥 크래시하던 것 실제 구현, 숫자·객체 값 가드). **실행 검증**: 링컨 7/7 PASS, 갈릴레오는 영문 쇼츠의 한국어 잔존을 실제 검출, `meta.en.json` 보유 16인 전량 스윕 크래시 0. exit code로 CI 연결 가능 |
| 🔴 PostgREST 1,000행 상한 — 조용한 절단 | — | **주요 교정 완료(26.07.16), 잔여 있음** | **에러도 경고도 없이 전수 select가 1,000행에서 잘린다.** 코드는 그걸 전량으로 믿고, `?? 0`·`?? []` 폴백이 빈자리를 메워 **틀린 값을 정상값으로 위장**한다. 이게 본질이다.<br>**실측 1,000 초과 테이블 10종**: `content_locales` 14,435 · `score_logs` 11,927 · `user_contents` 11,267 · `contents` 7,568 · `user_scores` 1,707 · `profiles` 1,707(CELEB **1,692**) · `user_social` 1,706 · `celeb_influence` 1,581 · `celeb_persona` 1,577 · `celeb_dialogues` 1,577. 감시: `celeb_task_queue` 913.<br>**교정 9곳(실서버 전후 대조)**: 유사인물(1,000→1,577) · 성향분포 · `getCelebs` 순위(**581명 순위 없었음**) · `getContemporaries`(**후보 600명 누락**) · `getCelebDirectory`(**472명 소멸**) · 직군·국적 집계 · `getCelebTimeline`(**471명 누락**) · `getInfluenceDistribution`(**하위 466명 증발**) · BO 대시보드(**6,568건 누락**).<br>**가장 노골적인 증거**: 국적 필터가 전체 수는 `head:true`로 **정확히** 받아놓고 국가별 내역만 잘린 행으로 셌다 — 한 화면 안에서 두 숫자가 서로를 반증하는데 아무도 몰랐다. 실측 **국가 70개 중 63개만 노출**(정렬 순서에 따라 **사라지는 국가가 매번 달라진다**).<br>**해법**: `sw/web/src/lib/supabase/paginate.ts`(`selectAllPages`) — `.order('고유키')` + offset 페이징, **에러는 throw**(조용한 폴백 금지). ⚠️ **동점 정렬키 함정**: `total_score`·`birth_date`·`nickname`은 중복이 많아 단독 정렬키로 쓰면 페이징에서 중복·누락이 난다. **`id`/`celeb_id`를 2차 키로 반드시 고정**하라. 카운트만 필요하면 `head:true count:'exact'`를 쓰고 행을 끌어오지 마라.<br>**전송량**: 합계 gzip 264K→389K(+125K). 7일 단일키 공유 캐시라 순증 월 수 MB, Pro 250GB의 0.002% 미만 — 정확도를 이 값에 팔 이유가 없다.<br>**잔여(판단 필요)**: ① `getFeedActivities` — 페이징으로 고치면 **오히려 깨진다**(BOOK id 4,505건을 `.in()`에 실어야 하는데 이 프로젝트는 **462개에서 실패한 실측 이력**이 있다). `activity_logs.content_id`에 **FK가 없어** 임베드 필터도 불가 → FK 추가(DDL) 또는 RPC. ② 기록 검색 2-step 6곳 — `content_locales` `ilike`가 `%e%` 8,000건 매칭 → 절단 + URL 초과 동시. ③ web-bo 4건(Task#12) ④ `getTrackerRound` 잠복(리뷰 평균 764행/묶음, 상한 근접). ⑤ suikoden 대사는 **고의로 둠**(JSONB 통째라 페이징 시 +1.3MB·48% 악화, 게임 비활성) |
| 유튜브 업로드 정합성 | `docs/project/remotion-bo-plan.md` | **보류(26.07.16 유저 지시)** | ⚠️ **remotion 쪽은 당분간 손대지 않는다.**<br>**유저가 정한 방침(26.07.16)**: ① **옛 인물은 지금 시스템에 맞추지 않는다.** 몇 달 전 인물이 개편된 시스템과 안 맞는 건 **정상이지 사고가 아니다** — 안 맞는 걸 결함으로 규정하지 마라(이번에 그 오판을 했다). ② 진짜 문제는 **"영상 나간 인물 파악이 어렵다 / 출품·미출품 구분이 안 된다"**이고 원인은 **삭제 시 자동화 부재**다(삭제가 잦다).<br>**재개 시 알아야 할 것**: 유저는 **`YouTubePanel`(업로드 패널)로 업로드**하고 **`/[series]/youtube`(YouTube 편성 현황판)의 존재를 모른다**("난 그런 거 본 적이 없는 거 같은데"). 삭제 감지(`deleted`)·기록 정리(`purge`)가 그 **안 쓰는 화면의 수동 버튼**(`page.tsx:244`)이라 아무도 안 누른다 → 지운 영상이 계속 "업로드됨"으로 남는다. **자동화는 업로드 패널에 붙여야 한다.** 단 "업로드 시에만" 갱신하면 **삭제는 업로드 사이에 일어나 못 잡는다**(유저 지적).<br>🔴 **미검증 위험**: 중단 직전 작업자가 `purge`에 **API 호출 실패 시 전 기록을 지우는 구조**로 보인다고 보고했다. 재개 시 **최우선 확인.**<br>~~① 메타 푸시 슬롯 오조회~~ · ~~② 기록에 책 정체 없음~~ · ~~③ slot 미기입~~ · ~~④ 보관 경로 사망~~ → **네 건은 교정 완료**(아래 이력 참조). ⑤ `_status`↔기록 모순 무검사 · ⑥ drift가 제목 한 줄만 비교(로컬로 제목을 다시 만들어 비교하므로 로컬이 틀리면 영원히 OK)는 미해결 | ⚠️ **"장치가 없다"가 아니라 "있는 장치가 고장났고 아무도 모른다"가 진단이다.** 이미 있는 것: `api/[series]/youtube/status-all`(기대목록 유도+교차), `.../sync`(YouTube 조회 → `synced\|drift\|deleted\|not_uploaded` 판정, purge·push 액션), `[series]/youtube` 현황판, `remo-shorts-slot-map` 스킬.<br>~~**① 메타 푸시가 엉뚱한 책 제목을 유튜브에 박음**~~ → **교정 완료(26.07.16)**. `sync/route.ts` 131·361행이 `shortsArr[shortsIndex - 1]` 위치 접근이었다. shortsIndex는 고정 slot이지 배열 위치가 아니다 — 실측 elon-musk 배열 순서 slot `1,6,2,3,4,8,5`라 `ko-shorts-2`가 "신에 맞선 12인"을 집었다(정답=파운데이션). CLI(`youtube-upload.ts:180`)·팩션(`sync:440`)은 이미 slot 조회를 쓴다. 같은 방식으로 통일·검증 완료.<br>~~② 기록에 책 정체가 없다(근본 원인)~~ → **해결 완료(26.07.16)**. `saveUploadRecord`에 `bookFolder`+`titleAtUpload` 추가(쇼츠·솔로 한정, 롱폼은 책이 여럿이라 생략). 로더가 `__folder`로 폴더명을 전달한다. 기록 형태 SSoT인 `packages/shared/src/lib/youtube-meta.ts`의 `UploadRecord`도 갱신(순수 추가라 무영향).<br>**기존 17건 백필 — 슬롯 추론을 안 믿고 독립 증거로 검증했다**: 음성 폴더가 `voice/{loc}/{engine}/shorts-N/`으로 **합성 당시 슬롯**을 보존하고 wav 파일명이 대본 조각 id를 담아 슬롯↔책 대조가 가능했다.<br>🔴 **슬롯 이동이 실제로 일어났음이 증명됐다** — 링컨 고아 기록 `ko-shorts-7`의 음성 조각이 `02-이솝 우화`와 **완전일치**하는데 이솝의 현재 slot은 **1**이다. 즉 7→1로 밀렸다. 또 `ko-shorts-1` 기록은 **현존 어느 책 대본에도 없는 조각**(`closing`·`book-context-3`)을 가져 원본이 사라진 대본이다 — 확정 불가라 비워뒀다. 미채움 6건은 에피소드 폴더가 없는 보관 인물(dario-amodei·marcus-aurelius·alex-karp).<br>~~③ shorts 데이터에 `slot` 미기입~~ → 처리 중/완료(Task#5). 로더가 "파일 slot 우선"을 지원하므로 데이터만 채우면 된다 ~~④ 보관 경로 사망~~ → **교정 완료(26.07.16)**. `server-utils.ts`의 기본값을 `D:/remotion_done`으로. 실제 스캔 로직에 대고 검증 — 완결 3인(alex-karp·dario-amodei·marcus-aurelius) ko/en 6건이 정확히 잡힌다. 보관소에 렌더 산출물 폴더(PascalCase)가 섞여 있으나 인물 JSON이 없어 자연히 빠진다. **잔여: 보관본 파일명이 옛 규격**(`L-VID.mp4`·`S-VID.mp4` vs 현행 `LH-VID.mp4`·`S{슬롯}-VID.mp4`)이라 스캔해도 못 읽는다. AlexKarp는 신·옛 규격 혼재라 일괄 rename 시 덮어쓰기 위험, MarcusAurelius·DarioAmodei는 `S-VID` 하나뿐이라 슬롯 번호 판정 불가 — **인물별 판단 필요** ⑤ `_status` ↔ 기록 모순 무검사 — jensen-huang은 `done`인데 기록 0, Digital-Resistance는 `todo`인데 3/3 완료 ⑥ drift가 제목 한 줄만 비교(`sync:155`) — 게다가 **로컬 데이터로 제목을 다시 만들어 비교**하므로 로컬이 틀리면 영원히 OK.<br>**검사 3종을 `publication-gate.py`에 추가 권장**: ko/en 책 순서 대조 · 고아 기록(링컨 `ko-shorts-7`은 현재 슬롯 집합에 없다) · `_status` 모순.<br>**참고 모델은 팩션** — 기대목록을 `factionVariants()` 공유 함수 단일원천에서 유도하고 part 번호가 데이터에 명시돼 폴더 순서에 안 흔들린다.<br>**손대지 마라**: `profiles.youtube_videos`는 lineup의 단방향 복제본이고 이미 낡았다(elon-musk lineup 8 vs DB 6) |
| ⚠️ `sw/remotion/scripts/`가 타입체크 밖 | `sw/remotion/tsconfig.json:15` | **판단 대기(26.07.16 발견)** | `include: ["src", "episodes"]`라 **`scripts/` 전체가 `tsc --noEmit` 대상이 아니다.** 즉 `youtube-upload.ts`·`episode.ts`·`render-all.ts` 등 운영 스크립트를 고치고 타입체크를 돌려도 **공허하게 통과한다**(`--listFiles`로 실측 확인). 실제로 이번 작업에서 지시된 검증이 무의미했고, 작업자가 컴파일러 옵션을 직접 지정해 별도 검증해야 했다. `include`에 `scripts` 추가를 검토하되 기존 에러가 쏟아질 수 있으니 규모부터 재라 |
| ⚠️ `scripts/remotion/`이 git 제외 | `.gitignore:112` | **판단 대기(26.07.16 발견)** | 폴더 통째가 `.gitignore` 대상이라 **`publication-gate.py`가 유실되면 복구 불가**다. 폴더 대부분은 일회성 이관 스크립트(`migrate-*`·`cleanup-*`)라 제외가 타당하나, 게이트는 `7-translation.md`가 참조하는 **상설 도구**라 성격이 다르다. 예외 규칙(`!/scripts/remotion/publication-gate.py`) 추가 또는 추적 폴더로 이동 검토 필요 |
| 쇼츠 인물 발화 출처 표기 누락 | `docs/project/remotion/book-recommend/writer/7-translation.md` (R5) | **미착수(26.07.16 게이트 검출)** | 되살린 `publication-gate.py`를 영문 보유 16인에 전량 돌린 결과 **13인이 결함, 그중 12건이 이 항목**이다(이미지 앵커 3·긴문장 1과 비교 불가한 최다). **전수 실측: 쇼츠 57개 파일의 인물 발화 104개 중 출처 표기 보유 45개(43%)** — 57개가 비었다. **번역 누락이 아니다** — 한국어판에도 없다(작성 단계 미기입). 게이트가 영문만 검사해 영문 문제로 보였을 뿐. 게이트 기준은 타당하다(실존 인물 발언 인용에 출처 요구는 프로젝트 원칙). **데이터가 미달인 것이므로 채우는 작업 필요** |
| ⚠️ 게이트 검사 3종이 옛 인물을 FAIL로 뱉음 | `scripts/remotion/publication-gate.py` | **보류·조정 필요(26.07.16)** | 26.07.16에 추가한 #8(ko/en 책 정렬)·#9(고아 기록)·#10(`_status`↔기록)이 **옛 인물의 자연스러운 불일치를 결함으로 뱉는다.** 유저 방침은 **"옛 인물은 맞추지 않는다"**이므로 맞출 생각 없는 걸 계속 경고하는 건 노이즈다. 검사 자체는 정확하다(링컨 09/10 뒤바뀜을 서로의 원위치까지 지목, 이순신 오탐 0, 샘 알트만 10/10). **재개 시**: 옛 인물을 검사에서 빼거나 FAIL→정보성으로 낮추고, **신규 제작분에만 적용**하는 쪽을 검토하라 |
| 영문 에피소드 이미지 앵커 미동기화 | — | **후순위(26.07.16 조사)** | ⚠️ **개별 에피소드 데이터 점검은 우선순위가 아니다**(유저 지시 26.07.16). 조사 결과만 남긴다.<br>**링컨만의 문제가 아니라 전반이다.** en 앵커 완비는 `yi-sun-sin`(44/44) **하나뿐**이고, 링컨·갈릴레오·레오나르도·테슬라·잡스 등 **10종이 en 스텁 상태**(책당 2장·앵커 0)로 얼어붙어 있다. 원본이 ko=en=스텁이었고 **ko만 작업이 진행**된 결과다(링컨 ko 2→90장). `remo-image-anchor-sync`의 ko→en 동기화가 실행된 적 없다. 링컨이 12건으로 튄 건 ko를 가장 많이 키웠기 때문이고, 다른 스텁은 ko도 안 자라 점검을 통과할 뿐이다(스크립트가 빈 앵커를 못 잡는다).<br>**이미지 신규 제작 불필요** — ko가 참조하는 90장 전부 디스크에 실재한다. 점검 스크립트의 "ko 파일 없음 23건"은 **오탐**(렌더러 `resolveImageFile`은 인물 폴더 전체를 basename으로 매핑하므로 폴더가 달라도 해소된다).<br>⚠️ **착수 전 차단 요인**: `.agents/skills/remo-image-anchor-sync/SKILL.md`가 **폐기된 옛 구조**(`{done\|live\|todo\|pre-todo}/{name}/ko.json`)를 전제해 실행 불가다. `publication-gate.py`와 동일한 이관 낙후. 스킬을 신 구조로 고쳐야 한다(가이드 문서 쪽은 이미 교정됨) |
| 링컨 09/10 책 파일 뒤바뀜 | — | **처리 안 함(26.07.16)** | 기록만 남긴다 — **링컨은 이미 전편 출품 완료**라 로컬 데이터를 고쳐도 실익이 없다(유저 판단).<br>`09-성경` 폴더에 `book.en`=셰익스피어·`shorts.ko/en`=셰익스피어, `10-셰익스피어 전집` 폴더에 `book.en`=성경·`shorts.ko/en`=성경으로 **서로 뒤바뀌어 있다.** `book.ko.json`과 폴더명만 새 순서로 옮기고 나머지를 두고 온 결과다. **원인**: 「ko 작업 시 en 동시 수정 금지」 규칙이 이관 때 en을 남겨두게 만들었다. 같은 유형이 다른 인물에도 있는지는 미조사 |
| 제휴 구매 버튼 비활성 해제 | `docs/project/monetization.md` | **AdSense 승인 후** | 제휴 링크 UI가 **주석 처리돼 화면에 안 뜬다**(`ContentInfoSection.tsx` 289~318, 사유 주석 「AdSense 승인 전까지 비활성」). 부품·데이터(`affiliateLinks`·`AFFILIATE_PLATFORMS`)는 다 있어 **주석만 풀면 되는 상태**다. 문서가 "완비"로만 적어 이 사실이 묻혀 있었다(26.07.16 교정). AdSense 승인 시점에 함께 처리 |
| **셀럽 명언 전면 복원·감사** | `docs/celeb-data/README.md` | **✅ 완료(26.07.16)** | 명언 데이터 전체(1,577명)를 2단계로 손봤다. **① 유실분 복원 544명**(06-02 사고분, 902→1,446) **② 기존분 전수 감사 902명**(원래 있던 명언도 오염 심함). **오늘 총 846명 손댐, 전수 무결성 통과**(위반 전부 0).<br>🔴 **교훈 — 명언 데이터를 신뢰하지 마라.** 오염률 권역차 큼: 유실분 57~87%, 기존분 중화권17%·한일38%·영어권22~32%·기타비영어권58%·유럽68%.<br>**오염 유형**: 오귀속(피차이↔래리 페이지 **맞바뀜**·커리←빌립보서·드러커←앨런 케이·살다나←마윈) · 의미반전(세네카·지젝·파인만) · 캐릭터 대사(양자경←쿵푸팬더2) · 위작(만델라·히파티아·로스차일드) · **인물 소개문 1인칭 위조**(기존분 최다 — 별명·대표작 삽입 + "~할 따름이다").<br>**원칙**: 진본 무수정, 부풀림 verbatim 복원, 근거 없으면 공란(최종 185명 양쪽 공란=파라오·고대 군주). **원어 검색 필수**(`feedback_search_native_language`), 아그리게이터 맹신 금지.<br>**부수**: 재발 차단(`dialogue-bulk-update.mjs` 병합 전환).<br>**후속 완료(26.07.16 세션2)**: ①중화권 명언 18명 한·영 확정(중국어 원문 verbatim 대조, 셩지아 자오만 근거 부재 공란). ②영문 대사 미번역 **전량 해소** — 완전 미번역 58명 + 부분 미번역 688명. 부분 미번역의 근본 원인은 옛 키 `answer`가 스키마 표준 `roll_call` 자리를 차지한 데이터 결함이었고, 잔재 91명분(단순 제거 55 + 재번역 36)과 원문 무관 오염 대사까지 정리. ③동명이인 오염 3건 교정: 조 샐다나(이름·주소가 Joe Tsai로 오염 → 배우 정본화), 칼 어번(소개·영문 대사가 가수 Keith Urban → 배우 Karl Urban 정본화), 톰 브라운(한국어 대사가 패션 Thom Browne → AI 엔지니어 Tom Brown 정본화). ④감정 표식 한국어 잔존 2명(다이애나 로스·대니얼 골먼) 영문화.<br>**최종 무결(26.07.16 세션2 실측)**: 영문 대사 미번역 0 · `answer` 잔재 키 영문·한국어 모두 0 · 한국어↔영문 대사 배열 길이 불일치 0 · 명언 한·영 **1,411쌍 완전 일치**(한쪽만 존재 0, 역전 해소) · 한국어 대사 21개 완비 인물의 영문 완비 1,547명. |
> **명언 유실 사고 원인(26.06.02)**: 일괄 작업이 `dialogue-bulk-update.mjs`의 `lines = EXCLUDED.lines`(통째 교체)로 579행의 `lines`를 덮어 `quote` 키만 소멸시켰다(정상 8키 vs 손상 7키, 값이 아니라 키 자체 없음). `lines_en`은 무사해 영문>한국어 역전이 생겼다. PITR 28일 < 사고 44일 전이라 복구 불가. 병합(`|| EXCLUDED.lines`)으로 교정해 재발 차단. 복원은 위 완료 항목 참조. 명언 집계 시 **빈 문자열 제외**(포함하면 부풀려짐).
| remotion-bo 죽은 R2 지표 | `docs/project/remotion-bo-plan.md` | **미착수(26.07.16 발견)** | 대시보드 카드의 ● 동기화 지표가 폐기된 R2 잔재라 **항상 0을 표시한다**(`app/page.tsx`의 `synced`). R2 음성 동기화는 26.03.23 폐기됐고 `src/`에 R2 코드가 없다. 지표를 걷어내거나 음성 저장소 상태로 갈아끼우면 된다. 잔재는 이것과 `guide/page.tsx` 설명문 두 곳뿐 |
| 유사 인물 추천에서 577명 누락 | — | **완료(26.07.16)** | **PostgREST 1,000행 상한(db-max-rows)을 전량으로 믿던 문제.** `celeb_id` 정렬 + offset 페이징(`lib/supabase/paginate.ts`의 `selectAllPages`)으로 교정. **RPC화(②)는 실측으로 기각** — 벡터 캐시는 `all-persona-vectors` **단일 키로 전 셀럽이 공유**한다(7일에 1회 조회로 1,577개 페이지를 감당). 거리 계산을 RPC로 옮기면 셀럽마다 별도 호출·캐시 키가 되어 1,577회 × ~1KB ≈ **1.6MB로 되레 9배 악화**되고, `calcDistance`를 SQL에 복제해 결과가 갈릴 위험까지 진다. 페이징 비용은 **+68KB(0.11→0.18MB, 7일당 1회)**로 오늘의 flat 컬럼 성과(2.0MB→0.11MB)는 유지된다. ①의 `selectInChunks`는 id 목록 `in()`의 URL 길이 대책이라 이 건과 무관하다.<br>**실측 검증**: 후보 1,000→**1,577**(신규 577·유실 0·중복 0). 전수 1,577명 대조에서 **거리값 불일치 0** — 공통 후보군이면 결과 동일이 증명됐다. top-5 변동은 표본 30명 중 26명, 새 후보가 top-5에 드는 셀럽 **1,353/1,577**. 남은 차이 23건은 **거리가 같은 동점자의 순서**뿐인데, 기존엔 정렬 없는 select라 요청마다 흔들렸고 이제 고정된다.<br>**같은 상한에 걸린 형제 3종을 함께 교정**(`getPersonaDistribution`): 성향 점수 1,577·`get_review_celeb_ids` **1,281→1,000 절단**(명단에 없다는 이유로 걸러짐)·`celeb_influence` **1,581→1,000 절단**. 3중 절단이 겹쳐 **분포 화면이 1,280명 중 572명만 그렸고**(+708 회복) 그중 **218명은 영향력이 조용히 0으로 찍혔다**(에드워드 텔러 실제 48·엔리코 페르미 64). ⚠️ **1,000행 상한은 이 두 파일만의 문제가 아니다** — 정렬·페이징 없는 전수 select는 어디서든 같은 방식으로 조용히 잘린다 |
| web 서비스 화면 결함 정리 | `docs/project/service/` | **완료(26.07.16)** | 팔로잉 목록 친구 중복 노출 교정(`agora/social`이 `is_friend`를 false로 덮어쓴 뒤 그 값으로 걸러 필터가 무효였다) · 기록관 탭 문구 6종 i18n 전환 · `/explore/figures` tagId 조회 반영(getCelebs는 이미 지원) · 방명록 currentUser prop을 id로 축소(남의 프로필 값을 붙이던 죽은 값 제거). **방명록 작성자 표시는 버그 아님** — 서버가 `author_id`로 신원 확정, 화면은 `entry.author` 사용 |
| 인물 생애 행적 — 잔여 3건 | `docs/project/celeb-journey.md` | **본체 완료(26.07.26)** | 73명 1,231건 적재·화면 가동 중. 남은 것: ① **백오피스 편집 화면** — 지금은 `docs/celeb-data/timeline/<slug>.json`을 고쳐 `timeline-import.mjs --apply`로 다시 넣어야 한다 ② **50점대 132명 확장** — 73명 품질 확인 후 판단(60점↑ 73명 / 50점↑ 205명) ③ **천도 지구본을 `WorldGlobe`로 이관** — 게임 비활성이라 보류. 그리기 532줄이 게임 개념과 얽혀 있어 지금 손대면 확인 없이 깨진다.<br>화면은 26.07.26 유저 육안 확인 완료(회전 튕김·감도 과다 교정 반영) |
| 서가 리네이밍 잔재 | `docs/project/service/library.md` | **미착수** | 주소만 `/scriptures`→`/library`로 바뀌고(26.03.26) 내부는 `scriptures` 그대로 — 액션·컴포넌트 폴더, i18n 네임스페이스, 네비 키, 파일 머리말 주석. 기록관도 동일(주석이 옛 `archive/playlists` 지목) |
| web-bo 결함 정리 | `docs/project/web-bo.md` | **완료(26.07.16)** | **image-proxy SSRF 차단** — 이 창구는 `proxy.ts`가 로그인 검사를 건너뛰어 인증 없이 호출되던 무방비 상태였다. 실측 11종 허용 목록·내부망 차단·리다이렉트 검사 적용, 실서버 검증 완료 · 1x1 픽셀 폴백 제거(실패를 404/502로) · CelebForm 이탈 · 캐시 무효화 경로 교정(slug 키 어긋남 포함) · `/celebs/stats`·`/today-figure`의 id 링크 404 교정(셀럽 1,674명 전원 slug 보유) · 고아 라우트·컴포넌트·액션 정리 |
| web-bo 유저→셀럽 승격 화면 부활 | `docs/project/web-bo.md` (미해결 절) | **판단 대기** | 죽은 컴포넌트 정리 중 `ProfileTypeSwitch`가 제거되며 **승격 기능이 사라졌다.** 액션 `promoteToCeleb`은 살아 있어 화면만 되살리면 복구된다. 대체 경로 없음(`createCeleb`은 더미 계정 신규 생성이라 다른 일). 되살릴지 결정 필요 |
| 음성 파일 매니저 | `docs/archive/voice-file-manager.md` | **완료(26.04.01)** | **표가 틀렸었다.** 계획서를 쓴 당일 같은 흐름(`84f06090`)에서 구현하고 표만 안 고쳤다. remotion-bo에 실재 — `server-utils.ts`의 `getVoiceStorageStatus`/`loadVoiceFiles`/`unloadVoiceFiles`, `api/[series]/voice/storage/route.ts`, `VoiceStorage.tsx`, `[series]/page.tsx` 탭 연결(참조 4건). audio-bo 흡수도 R2 의존도 아니다 |
| 세력도감 태그 후보 풀 | `docs/todo/tag-ideas.md` | **부분 소진(6/14)** | 후보 6종이 이미 등록·노출 중(26.07.16 DB 실측) — 르네상스 마에스트로 7명·전국삼걸 6·왕좌의 독서가 8·실존주의자 8·프랑스 혁명 8·망명자 8. **기준선이 낡았다** — 계획서의 "현재 태그 13개"에 있는 `mapping-ai`는 DB에서 삭제됐고(현재 `AI 선구자들` 14명), 실제는 40종 + 8개 상위 그룹 계층이다. 살아있는 후보 9종. 계획서 내부 결함: Tier 1 "조선의 지식인"은 우선순위 목록에만 있고 본문 정의가 없다 |
| 쇼츠 이미지 규격 3중 중복 정리 | `docs/project/remotion/book-recommend/image-requirements.md` | **완료(26.07.16)** | 정본으로 통합, todo 2건 아카이브. 흡수 시 코드 실측으로 죽은 규칙 다수 폐기(`images/shorts/{slug}.png` 경로·`CINEMATIC_EPISODES`·`prompts.json` 전부 부재). 필터값은 두 문서 다 틀렸고 실측 `brightness(0.35) saturate(0.5)`가 정답 |

* 마지막 작업 시각: 26.07.16

## 문서 점검 상태

문서는 코드·DB와 갈라진다. 그래서 **"언제 실측 대조했는지"를 문서 자신이 들고 있다.**

**표기 규칙**

제목(H1) 바로 아래 한 줄로 둔다. 대조한 범위를 함께 적고, 일부만 봤으면 그 사실을 밝힌다. **하지 않은 것을 했다고 적지 않는다** — 거짓 표기는 없느니만 못하다.

```
> **최종 실측 체크: 26.07.16** — 실 DB 스키마 전량 대조
> **최종 실측 체크: 26.07.16** — 부분 대조: 부재 컬럼만 확인, 문서 전체는 미대조
```

문서를 고칠 때 **코드·DB와 대조했다면** 이 줄을 갱신한다. 글만 다듬었다면 갱신하지 않는다.

**재개 방법 — 표기 없는 문서부터 본다.**

```bash
# 실측 대조 이력이 없는 문서 = 다음 점검 대상
grep -rL "최종 실측 체크" --include="*.md" docs/project docs/todo docs/celeb-data
```

**26.07.16 점검 완료** (44종). 정확한 목록은 아래 명령으로 얻는다 — 이 문단보다 파일 자신의 표기가 정본이다.

```bash
grep -rl "최종 실측 체크" --include="*.md" docs   # 점검 완료
grep -rL "최종 실측 체크" --include="*.md" docs/project docs/todo docs/celeb-data   # 미점검(다음 대상)
```

주요 영역: 아키텍처·서비스 화면 5종·백오피스·DB 2종·셀럽 파이프라인 9종·세력도감 2종·인프라 운영 6종(seo·adsense·monetization·openai·game-card·sns)·영상 4종·셀럽 데이터·태그 후보 풀.

**미점검 — 다음 재개 대상**. 아래는 이번에 **손대지 않았다.** 낡았는지 아닌지도 모르는 상태다.

**26.07.16 기준 남은 것은 대부분 "지금 손댈 수 없는 것"이다.** 착수 가능한 미점검 문서는 사실상 소진됐다.

| 영역 | 상태 | 비고 |
|------|------|------|
| **영상(book-recommend) 20여 종** + `remotion/faction.md`·`README.md`·`three-kingdoms.md`, `audio-bo.md`·`audio-bo-tts-engine-research.md`, `web-egress-audit`, `suikoden-dev.md` | ⏸ **유저 편집 중** | 워킹트리 수정 상태라 손대지 않았다. **유저가 손 뗀 뒤가 다음 대상이다.** 착수 전 `git status`로 재확인할 것 |
| `celeb-data/dialogue/` 11종 | — **점검 대상 아님** | 인물별 대사 **원고(창작물)**다. 코드 경로를 인용하지 않아 대조할 것이 없다. 손대지 마라 |
| `remotion/faction.md` | ⏸ 편집 중 | 냄새 조사상 건강하다 — 경로 15개 중 14개 정확. 유일한 오류: `faction/timing.ts` → 실제는 `faction/shared/timing.ts`. **편집 끝나면 이 한 줄만 고치면 된다** |
| `suikoden-sim/` 11종 | — **비활성** | 재개 결정 전에는 점검 불필요. `10-implementation-status.md`만 대조 완료 |
| `docs/vision.md` | — 대상 얕음 | 비전 선언문이라 코드 인용이 거의 없다 |

**반복 확인된 결함 유형** (26.07.16 점검 44종에서 실제로 나온 것들. 같은 걸 찾아라)

- **없는 것을 있다고 적은 서술** — 가장 흔하다. 삭제된 컬럼(`profiles.quotes`), 실재하지 않는 큐 함수, 없는 컴포넌트 5종을 박아둔 표, **존재하지 않는 디렉토리의 구조·형식·등록 SQL을 상세히 서술**(`celeb-data`의 `persona/`). 그대로 따르면 에러가 나거나 헛손질한다.
- **"미착수"인데 이미 완료** — `voice-file-manager`(계획서 쓴 당일 구현), remotion-bo Phase 4·5. 믿으면 있는 걸 또 만든다. 반대 방향(`안 고쳤는데 완료`)보다 흔했다.
- **고친 뒤 문서를 안 고친 것** — tracker RPC를 교정하고도 "여전히 깨짐"으로 남아 있었다.
- **수치가 낡음** — 사이트맵 URL 1,098→실제 15,884, 셀럽 1,073→1,472, 태그 13종/1,086명→40종/1,674명. **문서의 수치는 기본적으로 의심하라.**
- **리네임/통합 후 옛 이름** — 서고 `/scriptures`→서가 `/library`, 세력도감(옛 스포트라이트) 컴포넌트 6개→`FactionShowcase`(당시 `SpotlightShowcase`) 통합. **1:1 리네임으로 추정하지 마라** — 실제로는 통합·소멸인 경우가 있다.
- **규칙끼리 충돌** — `celeb-content-audit`이 Google Books를 권장했으나 프로젝트 규칙은 네이버·OpenLibrary만 허용. **규칙 쪽이 정본이다.**
- **완료 보고서 안에 현행 규칙 혼입** — 아카이브로 옮겼다가 회수한 적 있다(sources 스키마·verified 정의). 완료 표시만 믿고 격리하지 마라.
- **집계 기준 함정** — 빈 문자열을 세면 명언 904, 제외하면 902. 문서에 수치를 쓸 땐 기준을 함께 적어라.

## 아카이브 (`docs/archive/`)

완료된 일회성 보고서·마이그레이션 기록·실행 지시서를 보관한다. **현역 규칙이 아니므로 작업 시 참조하지 않는다.** 이력 추적 목적으로만 남긴다.

신규 문서를 쓸 때 이 원칙을 지킨다.
- **완료 보고서·회차 스냅샷·1회성 실행 지시서** → 작업이 끝나면 `docs/archive/`로 옮기고 TODO 표 링크를 갱신한다.
- **현역 규격·규칙 문서** → `docs/project/` 해당 영역에 둔다. `docs/todo/`에 남기지 않는다.
- **에피소드별 조사·기획·어록** → `sw/remotion/public/factions/<에피소드>/` 하위(`_docs/`·`quotes/`)에 둔다. `docs/`에 쌓지 않는다.

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
