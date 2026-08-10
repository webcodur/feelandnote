# AGENTS.md

프로젝트 가이드 단일원천. 모든 AI 도구(Claude, Codex 등)는 이 파일을 참조한다.

## 프로젝트 개요

Feelandnote는 콘텐츠(도서, 영상, 게임, 음악) 소비 기록 및 관리 서비스다. 

| # | 앱 | 경로 | 포트 | 설명 |
|---|-----|------|------|------|
| 1 | web | `sw/web` | 3000 | 사용자용 웹 (Next.js) |
| 2 | web-bo | `sw/web-bo` | 3001 | 관리자 백오피스 (Next.js) — 서재 탐방 제작·리소스 관리 포함 |
| 3 | remotion | `sw/remotion` | 3002 + 8001 | 영상 제작 (Studio + serve) |
| 4 | lab | `sw/lab` | 3004 | 실험 공간 — 2D/3D, 게임 (Vite) |
| 5 | audio-bo | `sw/audio-bo` | 3005 | 로컬 음원 정리·받아쓰기·화자 학습·음성 합성 작업실 (Next.js) |
| 6 | android | `sw/android` | — | 안드로이드 앱 셸 (Gradle + TWA). `sw/web`을 감싸는 껍데기라 자체 화면·서버가 없다. Node 패키지가 아니므로 pnpm 워크스페이스에 넣지 않는다. 빌드는 Android Studio |

**공유 패키지** (`packages/`):
- `content-search` — 외부 콘텐츠 검색 API (Kakao, TMDB, IGDB, Spotify, Naver 뉴스·블로그·이미지). **BOOK 한국어 메타는 카카오 도서 검색(`kakao-books.ts`)이 유일 출처다.** 네이버 도서 검색은 26.07.31 종료([공지 32564](https://developers.naver.com/notice/article/32564))라 래퍼·전용 스크립트를 전량 제거했다 — 되살릴 API가 없으니 `naver-books`를 다시 만들지 마라. 전환 내역·카카오 응답 특성(ISBN 두 개 동시 반환, 표지 원본 추출, 판매 상태 제공)은 `docs/project/external-services.md`의 「외부 콘텐츠 검색 API」 절. ⚠️ **Google Books는 폐기** — 일일 한도 1,000건이라 대량 수집 불가(키 5개를 돌려써도 부족했다). 코드·`.env` 키·DB 249건은 레거시로 남아 있으나 **신규 사용 금지**. 무료라고 되살리지 마라 — 비용이 아니라 한도가 문제다. **책 메타 출처는 한국어판 카카오 · 영문 원서 OpenLibrary 둘뿐이다.**
- `ai-services` — AI 서비스 (셀럽 프로필 타입, 영향력 분석)
- `influence-constants` — 영향력 평가 상수
- `shared` — 공유 상수, 타입, 훅

## AI 작업 완료·검수 보고 원칙

- 작업 중에는 명령어만 연속으로 나열하지 말고, 실행 전 목적과 실행 후 발견 사항·다음 판단을 짧게 설명한다.
- 긴 작업은 중간 진행 상황을 주기적으로 공유하며, 계획 변경이나 예상 밖의 문제는 즉시 알린다.
- 이미지·코드·문서 작업은 **실행 → 자체 검수 → 작업보고**를 한 덩어리로 완료한다.
- 자체 검수에서는 형식 충족만 보지 말고, 결과물의 개연성·맥락·구도·실사용 가능성을 직접 판단한다. 실패 후보를 성공한 결과처럼 넘기지 않는다.
- 작업보고에는 산출물과 저장 경로, 변경 내용, 자체 피드백, 현재 사용 가능 여부를 함께 적는다.
- **이미지를 만들었으면 파일의 전체 경로를 답변에 반드시 적는다.** 사용자가 그 줄을 복사해 바로 열 수 있어야 한다.
  - 한 장이면 그 파일의 전체 경로를, 여러 장이면 파일별 경로를 줄 단위로 적는다. 열 장이 넘으면 폴더 전체 경로 + 파일 수를 적고 대표 몇 개만 나열한다.
  - `.tmp/foo.png` 같은 상대 경로나 "산출물 폴더에 저장했다" 같은 서술로 대신하지 않는다. `C:\project\feelandnote\...` 로 시작하는 전체 경로를 쓴다.
  - 대화창에 이미지를 띄워 보여줬더라도 경로는 따로 적는다. 사용자가 원본 해상도로 확인하거나 다른 도구로 열 수 있어야 한다.
  - 임시 파일을 정리하기 전에는 사용자가 확인할 시간을 준다. 보여주자마자 지우지 않는다.

## 주요 명령어

### 개발 서버

```bash
pnpm dev:web          # 1. 사용자 웹 (:3000)
pnpm dev:bo           # 2. 관리자 백오피스 (:3001)
pnpm dev:remotion     # 3. Remotion Studio (:3002) + serve (:8001)
pnpm dev:lab          # 4. 실험 공간 (:3004)
pnpm dev:audio-bo     # 5. 음성 작업실 (:3005)
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

## 환경변수 · 비밀값

**환경변수·비밀 파일은 커밋하지 않는다.** `.gitignore`가 `.env`·`.env.*`·`ga-credentials.json`·`.mcp.json`·`**/credentials/`를 전부 제외한다. 그래서 **`git clone` + `pnpm install` 만으로는 어떤 앱도 뜨지 않는다.** 다른 컴퓨터에서 개발을 시작하려면 아래 파일을 사람이 직접 옮겨야 한다.

| 파일 | 위치 | 없으면 |
|------|------|--------|
| `.env` | `sw/web/` | 사용자 웹 구동 불가 |
| `.env` | `sw/web-bo/` | 백오피스 구동 불가 |
| `.env` | `sw/remotion/` | 음성 합성·R2·DB 조회 실패 |
| `ga-credentials.json` | 루트 | 유입 통계 조회 불가(구동은 됨) |
| `.mcp.json` | 루트 | AI 도구의 DB·검색 콘솔 조회 불가(서비스 무관) |

`sw/lab`·`sw/android`·`packages/*`는 자체 환경변수 파일이 없다. `sw/audio-bo`도 파일 없이 로컬 폴더 경로를 코드 기본값으로 쓴다.
빈칸 서식지 파일도 두지 않는다 — 무엇이 필요한지는 아래 문서가 답한다.

> **키 이름별 용도·발급처·중복 배치·유출 시 처리 순서는 `docs/project/env-vars.md`가 SSoT다.** 값 자체는 어느 문서에도 적지 않는다.

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
| `docs/project/architecture.md` | 앱 6종 디렉토리 구조, 네비게이션, 라우팅, `[locale]`·레거시 리다이렉트 |
| `docs/project/service/README.md` | **사용자 대면 화면 허브** — 화면 그룹 구성·전체 지도 |
| `docs/project/service/library.md` | **작품**(`/library`, 옛 이름 서가) — 시대별·직군별·박물관·학당 |
| `docs/project/service/curated-lists.md` | **기관 선정**(`/library/curated`) — 대학·언론·시상기관이 뽑은 작품 목록. 3층 구조(기관→목록→작품), 수집·적재·연결 도구 3종, 목록별 연결률과 그 한계. 🔴 네이버 책 API 종료·TMDB 영문 검색 필수 등 서지 조회 함정 포함 |
| `docs/project/service/agora.md` | 광장 — 피드·소셜·게시판 3종 |
| `docs/project/service/profile.md` | 프로필·기록관 — 독서·유산·티어·업적·방명록 |
| `docs/project/service/explore.md` | **인물**(옛 이름 탐색) — 인물·랭킹·페르소나·세력도감·타임라인 외 |
| `docs/project/celeb-journey.md` | **인물 행적 SSoT** — 인물 상세 04번 구획(연표 + 활동 반경 지구본)과 DB 직접 조사 파이프라인. 사건=`celeb_timeline_events`, 감사 원장=`celeb_timeline_research_runs`, 공용 큐=`celeb_task_queue`의 `timeline_backfill_v1`. 대상은 live DB에서 사건이 0행인 등록 인물 전원이며 공개 상태·등급·생몰 필터를 두지 않는다 |
| `docs/project/celeb-detail-themes.md` | **인물 상세 세계 표현 SSoT** — 국적·연대 기반 39개 세계의 배너·화보 액자·구획 번호·서체와 5개 세계 재질 계열을 함께 쥔다. 직군 기반 8색 테마는 26.08.03 폐기했고 직군은 아이콘·명칭에만 쓴다. 세계 재질은 39/39 운영 적용됐으며 `/lab/celeb-themes`에서 개별 재질 15종과 대표 조합 5종을 같은 토큰으로 검증한다. |
| `docs/project/celeb-world-banners.md` | **인물 세계 배너 SSoT** — 인물이 산 세계 39종의 배경 사진 규격·장면·검수·모바일 초점 예외·교정 함정. 판정 규칙은 `sw/web/src/lib/celeb/world.ts`가 쥔다. **26.08.03 기준 4판 네이티브 3:1 규격으로 39/39종 서비스 반영 완료**(원본 39·PC/모바일 78) |
| `docs/project/web-bo.md` | 관리자 백오피스(web-bo) — 라우팅 전수, 운영 워크플로 |
| `docs/project/audio-bo.md` | 음성 작업실(audio-bo) — 음원 정리·받아쓰기·화자 학습·합성 |
| `docs/project/audio-bo-tts-engine-research.md` | audio-bo TTS 엔진 조사 |
| `docs/project/game-card-images.md` | 쉼터 게임 카드 상징 이미지 발주서 — 로비 캔버스 4종(여명·미궁·패권·천도) 기반 프롬프트·규격·납품 경로 |
| `docs/project/code-rules.md` | 코드 규칙, 디자인 시스템 |
| `docs/project/i18n.md` | 다국어화 계획, 진행 현황, 기술 참조 |
| `docs/project/android-app-feasibility-review-2026-07-29.md` | **안드로이드 앱 SSoT** — PWA + TWA 방식 선정 근거, Play 정책 요건(UGC 신고·차단·계정 삭제·Data Safety·대상 API), 출시 판정 기준. **§14가 구현 현황이며 본문(07-29 조사)보다 우선한다** |
| `sw/android/README.md` | 안드로이드 앱 셸 — 갖춘 것·없는 것, Android Studio 여는 절차, 키스토어·서명 지문·도메인 검증 순서 |

### DB · 데이터

| 문서 | 내용 |
|------|------|
| `docs/project/db-core.md` | DB 스키마 — 사용자, 콘텐츠, 커뮤니티, UUID 체계 |
| `docs/project/db-celeb.md` | DB 스키마 — 셀럽 테이블, 이미지 규격, slug, Wikidata QID |
| `docs/project/person-image-map.md` | **인물 이미지 지도** — 같은 사람의 그림이 들어가는 여섯 자리(얼굴·인물 대문·세력도감 큰 사진/단체·영상 인물/단체 화면)의 저장 위치·파일 규격·규격 SSoT·채우는 도구와 비었을 때의 폴백. 규격 본문은 복제하지 않는다 |
| `docs/project/fiction-faction-link-audit-2026-07-29.md` | 신화·서사 팩션 18편의 fiction 프로필·태그·대표 원전 전수 연결 실측과 재현 절차 |

> content_locales 설계·마이그레이션 기록과 BOOK en 데이터 검증 이력은 완료되어 `docs/archive/`로 옮겼다.

### 셀럽 (`docs/project/celeb/`)

| §  | 문서 | 내용 |
|----|------|------|
| 0 | `celeb-pipeline.md` | 파이프라인, 티어, 업데이트 가드, 작업 큐 |
| 1 | `celeb-1-basic-profile.md` | 기본 정보 |
| 2 | `celeb-2-content-collector.md` | 콘텐츠 수집 |
| 3 | `celeb-3-cultural-journey.md` | 감상 여정 — ⛔ **폐기 예정. 신규 작성 금지.** 기존 데이터 참조용으로만 남겨 둔다 |
| 4 | `celeb-4-influence.md` | 영향력 평가 |
| 5 | `celeb-5-persona.md` | 페르소나 |
| 6 | `celeb-speech.md` | Speech 트랙 (tone → quotes → dialogue) |
| 7 | `celeb-i18n.md` | 영문 번역 |
| C | `celeb-content-audit.md` | 콘텐츠 데이터 감사 (출처·locale·thumbnail 검증) |
| A | `celeb-tag-system.md` | 부록: 세력도감 태그 |
| B | `voice-generation-wave2.md` | 부록: 보이스 생성 Wave 2 (2026-03 회차 스냅샷) |
| S | `../faction-ai-group-refactor.md` | 세력도감 AI 그룹 구조 (구현 완료. `faction-celeb-sync` 스킬이 참조) |
| G | `celeb-gotchas.md` | **셀럽 데이터 함정 모음** — 목록 노출 기준, 페이지 안 뜰 때 증상별 원인, 대사 3대 결함, 등급 승격 조건, 선정 기준, 책 메타 출처 제한, 등록 우회 |
| V | `../celeb-avatar-spec.md` | **셀럽 아바타 규격 SSoT** — 프레임 기하, 안전 영역, 발주 프롬프트 확정본, 판정 기준, 자르는 규칙과 판정 도구 2종. 수치는 원문에서 확인한다. **소급 교체 없음 — 신규분부터 적용** |
| H | `hero-photo-status.md` | **인물 상세 대표 화보 현황과 미진분** — 목표 크롭 규격, 출처별 채움 현황, 크롭 규격이 통일 안 된 구간(표본 실측), 다시 손볼 때의 절차, 남은 인물. 규격·도구 자체는 `db-celeb.md` |
| M | `virtual-monologue.md` | **가상 독백 유일 SSoT** — 실존·fiction, 국문·영문의 작성·검토·반영 규칙 |
| R | `person-reading.md` | **인물 읽어보기 유일 SSoT** — 인물 안내·인물 탐구의 작성, 2회 개선, 검수, 배치·게시 규칙 |

**가상 독백 (`celebs.virtual_monologue`)** — 서비스 화면 노출은 폐기했다. 값은 담화·인물 읽어보기 제작 재료로만 보존하며, 신규 독백 작성은 중단한다. 남은 규칙과 이력은 `docs/project/celeb/virtual-monologue.md`를 따른다.

**인물 읽어보기 (`celeb_explanations`)** — 서비스 라벨은 `읽어보기 > 인물 안내 | 인물 탐구`다. 작성·검토·배치·게시 규칙은 `docs/project/celeb/person-reading.md`만 따른다.

**셀럽 아바타** — 어느 문서가 무엇을 쥐는지만 적는다. 규격 수치를 이 표에 옮겨 적지 마라.

| 무엇 | 문서 |
|------|------|
| 구도·프레이밍·발주 프롬프트·판정 기준 **(SSoT)** | `docs/project/celeb-avatar-spec.md` |
| 파일 규격(800×800 RGBA WebP)·업로드 경로 | `docs/project/db-celeb.md` |
| 등록 자동화와 신원 근거 강제 수단 | `.agents/skills/celeb-avatar-register/SKILL.md` |
| 교체 대상 잔여 명단 (진행 중) | `docs/todo/celeb/celeb-avatar-defects.md` |
| 배경 지우기 증분 재개 지점 | `docs/todo/celeb/celeb-avatar-nobg-handoff.md` |

**신원 근거 없는 얼굴은 등록하지 않는다.** 출처 불명 로컬 얼굴도, 기존 서비스 아바타도 단독 신원 근거가 못 된다. 현대 실존 인물은 본인·소속기관·공식 매체의 사진으로, 역사 인물은 인물명이 확인되는 초상·도상으로 독립 대조한다. 근거 없이 임의 얼굴을 붙인 후보는 생성 품질과 무관하게 폐기한다. 이를 강제하는 수단(업로드 인자 필수화·검역 목록·자동 검색 차단·팩션 REF 승격 제한)은 위 등록 스킬 문서가 전부 쥔다 — **여기에 다시 적지 않는다.**

> **왜 이 절이 짧아졌나(26.08.06):** 26.08.01 이전엔 문서 5곳이 제각기 규격을 서술해 서로 어긋났다. 그 뒤엔 이 색인이 규격 수치를 옮겨 적고 "이건 색인이지 규격이 아니다"라는 단서까지 달아야 했다. 그러고도 작업 문서 4종이 지워진 뒤 20일 넘게 이 자리에 남아 있었다. **색인은 어디를 열지만 말한다.**

**셀럽 자료 디렉토리**

| 경로 | 내용 |
|------|------|
| `docs/celeb-data/dialogue/` | 인물별 고유 대사 원고 11종 (`celeb-speech.md` 트랙 산출물) |

> **어록 채굴물은 `docs/`에 두지 않는다.** 소속 에피소드 폴더의 `quotes/`에 둔다(아래 영상 절 원칙).
> 26.07.16 이관 완료(18종) — 팩션은 `factions/<에피소드>/quotes/`(AI-Supremacy 13, PayPal-Mafia 4), 북리커맨드는 `episodes/<시리즈>/<인물>/quotes/`(관우 1). `docs/resource/언사/`는 비어서 제거했다.

### 인프라 · 운영

| 문서 | 내용 |
|------|------|
| `docs/project/env-vars.md` | **환경변수·비밀값 SSoT** — 옮겨야 할 파일 6종, 앱별 배치, 키 이름별 용도·발급처, 컴퓨터마다 달라지는 로컬 경로, 유출 시 처리 순서 |
| `docs/project/external-services.md` | Supabase, Vercel, R2, GA, 음성 경로, 크론잡, 전송비용 사고 요약 |
| `docs/project/openai-usage.md` | OpenAI/GPT API — 모델 선택, 이미지 생성 해상도·품질·비용 기준 |
| `docs/project/web-egress-audit-2026-06-29.md` | **웹 전송비용 SSoT** — Supabase egress + Vercel Fast Origin/Fluid CPU 사고, 원인·개선·배포 검증 |
| `docs/project/seo.md` | SEO — 사이트맵, robots, 검색엔진 등록, MCP |
| `docs/project/traffic-audit-2026-07-25.md` | **유입·행동 실측 감사(26.07.25) — 검색·유입 판단의 기준선.** 규모·유입 경로·체류·재방문 실측, 행동 계측 부재와 그 해소, GSC·GA4 조회 수단과 재현법. 🔴 **페이지/세션 수를 참여도로 읽지 마라** — 인물 화면은 한 장에 다 담은 설계라 낮게 나오는 것이 정상이다(초판의 "최악" 판정은 철회됐다) |
| `docs/project/monetization.md` | 수익화 방안 (AdSense 등) |
| `docs/project/adsense-audit-2026-07-15.md` | **AdSense 반복 거절 감사·교정 보고서(26.07.15)** — 원인 규명(색인률 2%)·조치 8종·검증 실측·재신청 절차·남은 과제. AdSense 관련 작업의 SSoT |
| `docs/project/sns-expansion.md` | **[세력확장]** SNS 멀티채널 확장 작전 — 플랫폼 보드·로드맵·결정 로그 (라이브). 트리거 키워드 `[세력확장]` 시 우선 참조 |
| `sw/remotion/docs/project/card-news/IMPLEMENTATION.md` | 카드뉴스 생성기 — 인물·책 카드 7종(BookCard), 편성 A·B, 미리보기(서재 탐방=web-bo `/book-recommend/<인물>/cards` / 팩션=web-bo `/factions` 카드 화면)·편성 저장(faction-cards.json)·출고(render:cards). SNS 카드 출고의 구현 SSoT. (`docs/project/card-news/`에는 시안 html만 있다) |
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
| `docs/project/remotion/faction.md` | 세력도감 **엔진 SSoT** — 컨셉·데이터 모델·편성·제작 워크플로우 |
| `docs/project/remotion/faction-unification.md` | **팩션 완전 통합 SSoT** — DB 단일 원천(faction_* 5테이블), 편집·출간은 web-bo `/factions` 하나, `faction-data.json` 은 렌더용 산출물(직접 편집 금지), 세력도감 출간 규칙. 26.07.25 Phase 5 완료 · **26.08.03 단일화(§4-3)** — 웹은 뷰 `faction_atlas_members` 직독, 출간 텍스트 복사 폐기(패널은 사진·영상·음악 전용) |
| `docs/project/remotion/faction-rules.md` | **팩션 제작 규칙·함정** — 용어와 데이터 구조, 인물 채택 기준, 대사 규칙, 음성 위치 규칙과 음량 함정, 영상 미디어, 썸네일, 아바타 연동, 진행 중 기획 현황 |
| `docs/project/remotion/faction-video-clips.md` | **팩션 화면 영상화 검토(Higgsfield)** — 인물 화면을 정지 이미지에서 AI 생성 영상으로. 수단 넷을 화면 조건에 따라 골라 쓰는 선택 기준표, 우리 쪽 구조 실측, 발주 원칙, 미결정 갈래와 미확인 항목. **26.08.01 조사 · 생성 미착수** |
| `docs/project/remotion/discourse.md` | 가상 담화 — 기획 원문(실효 항목은 discourse-unification §0 참조). 독백·난입 반박·대담을 한 엔진으로. 원천=`celebs.virtual_monologue`(사료 — 런타임 의존 아님). **편집은 web-bo `/discourses`** |
| `docs/project/remotion/discourse-unification.md` | **담화 완전 통합 SSoT** — DB 단일 원천(discourse_* 3테이블), 편집·출간은 web-bo `/discourses` 하나, 세 파일(discourse-data·cast·turns)은 렌더용 산출물(직접 편집 금지). 왕복 검증 7종·반증 시험 10종·export 발효·remotion-bo 담화 폐기. **26.07.26 Phase 5 완료** |
| `docs/project/remotion/three-kingdoms.md` | 삼국지 인물 그룹 SSoT — `three-kingdoms` 스킬이 참조 |
| `factions/_docs/folder-rules.md` | **팩션 폴더·파일·단계 규격 SSoT** (춘추전국 정리. 신규 작업 필수) |
| `factions/_voice-casting/README.md` | ELE 보이스 캐스팅 운영 |
| `sw/remotion/public/factions/_docs/idea-bank/IDEAS-BANK.md` | 에피소드 아이디어 뱅크(후보 풀). 기획 문서만 이곳에 두며, 영상 편 실물은 활성 여부와 무관하게 모두 `public/factions/<폴더>` 한 단계에 둔다. 활성 여부는 경로가 아니라 DB `registered`가 결정한다. `great-hackers-faces`·`great-hackers-masked`·`great-hackers-state` 3편은 `blocked/registered=false` 상태로 유지하며 다시 제작 큐에 넣지 않는다 |
| `sw/remotion/public/factions/_docs/idea-bank/korea-ideas/` | 한국 소재 아이디어 뱅크 문서 |
| `sw/remotion/public/factions/_docs/idea-bank/philosophy-and-myth/` | 신화 시리즈 기획 문서·`00-QUEUE.md`·`mythology-plan.md` |
| `factions/Digital-Resistance/_docs/saga-expansion.md` | 디지털 레지스탕스 확장 기획 |
| `factions/Social-Network/_docs/social-streaming-plan.md` | 소셜·스트리밍 통합 기획 |
| `factions/Homer-Iliad/_docs/quotes/` · `Homer-Odyssey/_docs/` | 호메로스 어록 조사 |
| `factions/X-Empire/quotes/` · `Path-of-Kings-West/quotes/` | 어록 채굴 |
| `factions/world-best-2026/resume.md` | 2026 월드 베스트 11 보류 — 재개 시 이 문서만 |

**[팩션 REF 이미지 세팅 원칙]**
팩션(세력도감) 등 인물 얼굴 REF가 없는 에피소드를 작업할 때는 반드시 다음의 단일 원칙만을 따른다.
1. **오직 `D:\image\완성` 폴더(하위 포함)에서만 인물명과 일치하는 실사 이미지를 검색하여 할당한다.** (`_refs/<세력명>/<인물명>.png` 구조)
2. **`D:\image\_재료` 폴더의 가상 얼굴 재료는 절대 사용하지 않는다.** (여러 인물에게 같은 얼굴이 중복 할당되거나 매칭이 어긋나는 참사를 원천 차단하기 위함)
3. 완성 폴더에 인물 이미지가 없다면, AI가 임의로 인터넷에서 대체 이미지를 다운로드하거나 꼼수를 쓰지 말고 사용자에게 "어떤 인물들의 이미지가 완성 폴더에 없는지"를 누락 명단으로 보고한 뒤 지시를 대기한다.
   - **[주의: 스크립트 작성 및 자동화 절대 금지]** 이미지 할당이나 수집을 명목으로 JS/Python 등의 일회성 자동화 스크립트를 작성하여 실행하는 행위를 엄격히 금지한다.

### 영상 제작 관리

| 문서 | 내용 |
|------|------|
| `docs/project/remotion-bo-plan.md` | 영상 제작 관리 통합 이력 — remotion-bo의 세 시리즈를 web-bo로 이관하고 앱을 폐기한 기록 |

### 게임

| 문서 | 내용 |
|------|------|
| `docs/project/suikoden-dev.md` | 천도 게임 개발 룰북 — **26.07.30 핵심 완주 흐름 구현.** 브라우저 실제 완주·실 DB 고정 인물·전체 web 빌드는 검증 대기 |
| `docs/suikoden-sim/` | 천도 게임 현역 기획서·구현 현황 (README + 10개 문서). 현재 코드 사실은 `10-implementation-status.md`가 기준 |
| `docs/project/wander-game.md` | 유랑 게임 현역 규격 — 시대 선택, 실제 인물 8명과의 사건, 군세·책략·민심 성장, 결정적 귀환 |
| `docs/project/portrait-game.md` | 시대의 초상 현역 규격 — 구현 보존·공개 진입 비공개. 사진 로드 후 타이머, 4단계 점수, 모바일 2열 선택, 사진 오류 성적 제외 |
| `docs/todo/games/game-wave2-contract.md` | **실험 게임 7종 SSoT** — 교차 격자·넷씩 넷·근접도·경로 잇기·어느 쪽·상위 다섯·가림 해제. 검증된 실존 데일리게임 포맷을 이 서비스 데이터로 옮긴 것. 병렬 구현 경계 규정, 체험 표본 규칙, 마감 결정 기록(쉼터 미등록 근거·문구 전송량 실측). 개별 규격은 `docs/todo/games/game-<키>-order.md` 7종. **현재 `/lab/games`에서만 열린다 — 공개 쉼터에 붙이지 않았다** |

## TODO

진행 중 작업의 상세는 `docs/todo/` 하위 영역 폴더가 쥔다. 여기는 **어디를 열지만** 적는다. 완료되면 해당 문서를 정리하고 이 표에서 뺀다.

| 영역 | 문서 (`docs/todo/` 기준) |
|------|------|
| 셀럽 | `celeb/celeb-data-gap-fill.md` 결손 전수 정비 · `celeb/three-kingdoms-data-gap-backfill.md` 삼국지 회차 · `celeb/celeb-avatar-defects.md` 아바타 교체 잔여 · `celeb/celeb-avatar-nobg-handoff.md` 배경 지우기 재개 지점 · `celeb/celeb-reading-full-rework-handoff-2026-08-04.md` 인물 읽어보기 전량 재검수 · `celeb/celeb-timeline-backfill-handoff-2026-08-08.md` 보안 계약 적용·읽기 검증을 통과한 `timeline_backfill_v1` 전원 백필 · `celeb/celeb-buzz-research-2026-08-09.md` 화제성 지표 조사·미결정 계약 |
| 세력도감 | `faction/faction-atlas-reconciliation-2026-08-03.md` 제작↔도감 정합화 실측·계획 · `faction/세력도감-단일화-할일.md` 다음 착수 지점 · `faction/tag-ideas.md` 태그 후보 풀 |
| 게임 | `games/game-wave2-contract.md` 실험 게임 7종 SSoT + 개별 규격 `games/game-<키>-order.md` 7종 |
| 외부 API | `external-api-migration-2026-08-01.md` 네이버·구글 이탈 대응 미결 항목 |

**26.08.07 문서 정비에서 드러난 미결.** 문서가 "있다"고 적었으나 실물이 없거나, 손대다 만 것들이다. 상세는 각 문서에 적어 뒀고 여기는 **무엇이 비어 있는지**만 모은다.

| 무엇 | 지금 상태 | 적힌 곳 |
|------|------|------|
| 네이버 표지 생존 감시 도구 | **없다.** 표지 3,466건이 한꺼번에 깨져도 알아챌 방법이 없다 | `external-services.md` |
| 인물 식별자(QID) 1·2차 검증 도구 | **없다.** 문서가 "필수"라 적은 절차를 실행할 수단이 없어 사람이 직접 대조해야 한다 | `db-celeb.md` |
| 단체 사진 구도 아이디어 풀 | **없다.** 구도가 찍어낸 듯 반복되는 것을 막을 수단이 없다 | `image-generation.md` |
| 학당 게임 강좌 | 자리만 「개발중」으로 세웠고 내용이 없다 | `service/library.md` |
| 박물관 독서법 비교 화면 | 설정만 있고 그리는 코드가 없어 어느 메뉴로도 갈 수 없다 | `service/library.md` |
| 문서 실측 점검 | 67종 미점검. 그중 절반이 영상 문서이고 **착수를 막던 사유는 해소됐다** | 「문서 점검 상태」 절 |

**아래 둘은 할 일이 아니라 함정 기록이다.** 같은 사고를 되풀이하지 않기 위해 둔다.

> **팩션 대사 운영 정정(2026-07-31):** 필수값은 한국어 `quote`와 `quoteChunks`뿐이다. `quoteOrigin`은 자유 메모칸이라 비어 있어도 결손이 아니다. 팩션 영문 대사·영문 청크는 현재 제작하지 않으며 기존 값만 보존한다.

> **명언 유실 사고 원인(26.06.02)**: 일괄 작업이 `dialogue-bulk-update.mjs`의 `lines = EXCLUDED.lines`(통째 교체)로 579행의 `lines`를 덮어 `quote` 키만 소멸시켰다. PITR 28일 < 사고 44일 전이라 복구 불가. 병합(`|| EXCLUDED.lines`)으로 교정해 재발 차단. 명언 집계 시 **빈 문자열 제외**(포함하면 부풀려짐).

## 규약과 수치의 단일원천

**돌아가는 규약의 원천은 코드다.** 판정 조건·모집단 범위·임계값처럼 프로그램이 실제로
쓰는 값은 상수 파일 하나에 두고, 화면·서버 액션·스크립트가 **import해서** 쓴다.
문서는 그 파일을 가리키고 배경만 설명한다.

문서를 원천으로 삼으면 반드시 갈라진다. 사람이 문서를 고쳐도 코드가 안 따라오고,
코드를 고쳐도 문서가 남는다. 「문서 점검 상태」 절의 결함 유형 「수치가 낡음」이
그것이다.

**같은 값을 두 군데 이상에 적지 마라.** 값이 코드에 있으면 문서는 숫자를 옮겨 적지
말고 파일 경로를 적는다. 같은 규약을 문서 서너 곳이 제각기 서술하면, 그중 하나만
고쳐졌을 때 나머지가 낡은 채로 남아 다음 사람이 그걸 보고 코드를 짠다.

**숫자를 꼭 문서에 적어야 하면 실측 날짜를 붙인다.** 그 숫자는 규약이 아니라 그날의
스냅샷이라는 표시다. 날짜 없는 숫자는 규약처럼 읽혀 사고가 난다.

```
✅ 26.08.07 실측: 표시값 0이 1,146명, 그중 조사 모집단은 667명
❌ 조사 대상은 667명이다
```

**적용 예 — 셀럽 콘텐츠 조사(26.08.07).** 표시값 계산과 조사 모집단 조건을
`packages/shared/src/constants/celeb-content-research.ts` 하나로 모으고 회귀 시험을
붙였다. 조사 목록 쿼리는 그 상수를 import한다(전에는 `celeb_tier='light'`가 쿼리에
박혀 있었고 문서 네 곳이 그 조건을 제각기 베껴 적었다). 문서는 전부 참조로 바꿨다.

**현재 원천 (26.08.07 전수 정리 완료)**

| 규약 | 코드 원천 | 문서가 쥐는 것 |
|------|-----------|----------------|
| 콘텐츠 조사 표시값·모집단 | `packages/shared/src/constants/celeb-content-research.ts` | 배경 설명(`celeb-pipeline.md`), 조사 절차(`celeb-2-content-collector.md`) |
| 아바타 프레임 기하 | `sw/web-bo/src/lib/avatar-geometry.ts`의 `AVATAR_SPEC` | 수치의 출처(어느 표본에서 나왔나), 안전 영역, 발주 프롬프트, 사람 눈 판정 절차 |
| 셀럽 등급·노출 게이트 | `packages/shared/src/constants/celeb-tiers.ts` | 등급별 파이프라인 차이 |
| 인물 16축 채점 척도·기준점 | `packages/shared/src/constants/celeb-persona-scale.ts` | 배경과 절차(`celeb/celeb-5-persona.md`) |
| 대표 화보 규격 | `packages/shared/src/constants/celeb-hero-photo.ts` | 채움 현황, 크롭 판정 절차 |
| 아바타 작은 판 규격·주소 규칙 | `packages/shared/src/constants/celeb-avatar-small.ts` | 왜 두는지, 만드는 네 경로(`db-celeb.md`) |
| 캐시 무효화 태그 | `packages/shared/src/constants/cache-tags.ts` | — |

**글쓰기 규칙도 같은 원칙을 따른다.** 코드가 아니라 문서가 원천이지만, 원천은 하나여야 한다.

| 규약 | 원천 | 나머지 문서가 할 일 |
|------|------|---------------------|
| 한국어 작문 전반(번역투·어순·종결·어휘·구조·인용) | `docs/project/writing-rules.md` | 판정 기준을 다시 적지 말고 이 문서를 가리킨다 |
| 문장 단위 번역투 진단표 | `.claude/skills/ko-detranslate/SKILL.md` | |
| 금지 어휘·톤 목록 | `.claude/skills/no-trash-prose/SKILL.md` | |

26.08.07에 팩션 룰북·문장 다듬기·편집국·번역 문서에서 번역투 규칙 서술을 걷어내고 포인터로 바꿨다. 각 문서는 **자기 단계에서 특히 자주 걸리는 것**만 짧게 적고, 판정 기준은 원천에 둔다.

**수치를 문서에 옮겨 적은 곳은 26.08.07에 전부 걷어냈다.** 아바타 기하가 `db-celeb.md`·
`person-image-map.md`에, 콘텐츠 조사 규약이 문서 네 곳에 복제돼 있었다. 새로 적지 마라.

---

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

**현황 (26.08.06 실측)** — 점검 표기 있음 **66종** / 없음 **67종**. 아래 명령이 정본이다. 이 숫자도 문서가 늘면 곧 낡는다.

```bash
grep -rl "최종 실측 체크" --include="*.md" docs   # 점검 완료
grep -rL "최종 실측 체크" --include="*.md" docs/project docs/todo docs/celeb-data   # 미점검(다음 대상)
```

> 26.07.16 시점 이 자리에는 "완료 44종, 착수 가능한 미점검은 사실상 소진"이라 적혀 있었다. **둘 다 틀렸다** — 실측하니 완료는 66종이고 미점검이 67종 남아 있었다. 진행률을 손으로 적지 마라.

**다음 재개 대상**

| 영역 | 상태 |
|------|------|
| 영상 `remotion/` 28종 (book-recommend 20여 + 본체 8) | **착수 가능.** 26.07.16에는 "유저 편집 중"이라 미뤘으나 그 상태는 풀렸다(26.08.06 `git status` 확인). 미점검의 절반이 여기 몰려 있다 |
| 셀럽 `celeb/` 6종 + 아바타 규격·세계 테마·세계 배너 | 착수 가능 |
| `audio-bo.md`·`audio-bo-tts-engine-research.md`·`image-generation.md`·`person-image-map.md` | 착수 가능 |
| `docs/todo/` 13종 | 진행 중 작업이라 문서가 계속 바뀐다. **작업이 끝날 때 함께 갱신한다** |
| `celeb-data/dialogue/` 11종 | **점검 대상 아님.** 인물별 대사 원고(창작물)라 대조할 코드가 없다. 손대지 마라 |
| `remotion/faction.md` | **26.08.07 대조 완료.** 26.07.16 점검이 "`faction/timing.ts`는 오류이고 실제는 `faction/shared/timing.ts`"라고 적어 뒀으나 **그 지적이 틀렸다** — `sw/remotion/src/compositions/Faction/timing.ts`가 실재하고 `Faction/shared/timing.ts`는 없다. `shared/timing.ts`는 다른 앱(web-bo 미리보기)의 파일이고 문서가 이미 따로 적고 있다. 문서 쪽은 고칠 것이 없었다 |
| `suikoden-dev.md`·`suikoden-sim/` | 26.07.30 대조 완료 |

**반복 확인된 결함 유형** (26.07.16 점검 44종에서 실제로 나온 것들. 같은 걸 찾아라)

- **없는 것을 있다고 적은 서술** — 가장 흔하다. 삭제된 컬럼(`profiles.quotes`), 실재하지 않는 큐 함수, 없는 컴포넌트 5종을 박아둔 표, **존재하지 않는 디렉토리의 구조·형식·등록 SQL을 상세히 서술**(`celeb-data`의 `persona/`). 그대로 따르면 에러가 나거나 헛손질한다.
- **"미착수"인데 이미 완료** — `voice-file-manager`(계획서 쓴 당일 구현), remotion-bo Phase 4·5. 믿으면 있는 걸 또 만든다. 반대 방향(`안 고쳤는데 완료`)보다 흔했다.
- **고친 뒤 문서를 안 고친 것** — tracker RPC를 교정하고도 "여전히 깨짐"으로 남아 있었다.
- **수치가 낡음** — 사이트맵 URL 1,098→실제 15,884, 셀럽 1,073→1,472, 태그 13종/1,086명→40종/1,674명. **문서의 수치는 기본적으로 의심하라.**
- **리네임/통합 후 옛 이름** — 서고 `/scriptures`→서가 `/library`, 세력도감(옛 스포트라이트) 컴포넌트 6개→`FactionShowcase`(당시 `SpotlightShowcase`) 통합. **1:1 리네임으로 추정하지 마라** — 실제로는 통합·소멸인 경우가 있다.
- **규칙끼리 충돌** — `celeb-content-audit`이 Google Books를 권장했으나 프로젝트 규칙은 허용하지 않았다. **규칙 쪽이 정본이다.** 그런데 그 규칙을 적은 문단 자신이 26.08.06까지 "네이버·OpenLibrary만"이라는 낡은 문구를 달고 있었다(네이버 책 조회는 26.07.31 종료). **충돌을 적어 둔 문장도 같이 낡는다.**
- **완료 보고서 안에 현행 규칙 혼입** — 아카이브로 옮겼다가 회수한 적 있다(sources 스키마·verified 정의). 완료 표시만 믿고 격리하지 마라.
- **집계 기준 함정** — 빈 문자열을 세면 명언 904, 제외하면 902. 문서에 수치를 쓸 땐 기준을 함께 적어라.

## 아카이브 (`docs/archive/`)

완료된 일회성 보고서·마이그레이션 기록·실행 지시서를 보관한다. **현역 규칙이 아니므로 작업 시 참조하지 않는다.** 이력 추적 목적으로만 남긴다.

신규 문서를 쓸 때 이 원칙을 지킨다.
- **저장소 루트에 문서를 만들지 않는다.** 루트에 두는 것은 `AGENTS.md`·`CLAUDE.md`·`GEMINI.md`와 **유저가 직접 쓴 메모**뿐이다. AI가 만든 인수인계·할 일·조사·덤프는 전부 아래 세 자리 중 하나로 간다.
- **완료 보고서·회차 스냅샷·1회성 실행 지시서·데이터 덤프** → 작업이 끝나면 `docs/archive/`로 옮기고 색인 링크를 갱신한다.
- **현역 규격·규칙 문서** → `docs/project/` 해당 영역에 둔다. `docs/todo/`에 남기지 않는다.
- **아직 안 끝난 작업·인수인계** → `docs/todo/<영역>/`에 둔다. 끝나면 아카이브로 옮기거나 지운다.
- **에피소드별 조사·기획·어록** → `sw/remotion/public/factions/<에피소드>/` 하위(`_docs/`·`quotes/`)에 둔다. `docs/`에 쌓지 않는다.

> **26.08.06 정비:** 루트에 AI 산출 문서 12종이 쌓여 있었고 색인이 아는 것은 3종뿐이었다. 전부 위 자리로 옮겼다. 문서를 만들기 전에 **어느 자리인지 먼저 정하라** — 루트는 자리가 아니다.

## 아이디어 응답 방식

네이밍 작명, 문학적 아이디어 등 창작 아이디어 요청 시: 설명 없이, 아이디어만 다수 나열한다. 개행 등으로 분리만

## 기능 설명 방식 (유저 대상)

유저에게 설명할 때 기술 용어·내부 명칭 최소화

- 개발·작명·파일명·컴포넌트명·함수명·플래그명 등은 전부 AI가 직접 만든 것이다. 유저는 그 이름을 처음 듣는다.
- 따라서 `VoiceTimingEditor`, `imageChangeAt`, `needsQuoteCtxAfterBreak`, `shorts.segments` 같은 이름을 갑자기 꺼내면 유저는 무엇을 가리키는지 알 수 없다.
- **한국어로 보여도 코드에서 새어나온 단어는 내부 명칭이다.** "segment", "line", "field", "라인", "줄", "구간", "필드", "트림", "토글" 등이 데이터 구조·변수명에서 그대로 옮겨온 것이라면 일상어가 아니다. 일상어로 풀거나, 꼭 써야 하면 처음 등장 시 한 줄 설명을 곁들인다.
- 설명은 **개발과 무관한 일상 용어**로 한다. 예: "자막 타이밍 편집 화면", "쇼츠 이미지 전환 간격", "인용문 다음 페이지 분기 처리" 등 **그 기능이 실제로 무엇을 하는지**를 유저의 시선으로 풀어 쓴다.
- "막다", "가두다", "차단" 등 모호·공격적 표현 대신 **무엇이 어떻게 보이거나 동작하는지**를 직접 묘사한다. 예: "잘못 뜬 버튼을 안 보이게 가리고 안내 문구만 둔다".
- 내부 명칭을 꼭 병기해야 할 때는 괄호로 보조 표기만 한다. 예: "쇼츠 이미지 전환 간격(imageChangeAt)".
- 코드 변경 보고·PR 설명처럼 개발 맥락이 명확한 경우에만 원 명칭을 전면에 쓴다.
- **자가 점검**: 답변 보내기 전 다시 본다. "이 단어를 처음 듣는 유저가 즉시 이해하나? 코드에서 따온 단어인가?" 둘 중 하나라도 걸리면 풀어 쓴다.
