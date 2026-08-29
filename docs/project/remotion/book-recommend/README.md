# 서재 탐방 — 시리즈 가이드

셀럽의 추천 도서를 소개하는 영상 시리즈.

## 문서 지도

번호는 실제 실행 순서가 있는 글쓰기 파이프라인 안에서만 쓴다. 나머지는 책임별 문서와 하위 폴더로 찾는다.

| 영역 | 문서 | 책임 |
|---|---|---|
| 영상 형식 | [`longform.md`](longform.md) · [`shorts.md`](shorts.md) · [`solo.md`](solo.md) | 롱폼·쇼츠·1권 SOLO 구성 |
| 글쓰기 | [`writer/`](writer/README.md) · [`shorts-best-cases.md`](shorts-best-cases.md) | 초안부터 번역까지의 0~7단계와 쇼츠 모범 사례 |
| 음성 | [`voice/`](voice/README.md) | 보이스 배정·TTS·메타데이터·5단계 타이밍 파이프라인 |
| 편성 | [`lineup/`](lineup/README.md) | 배포 순서, 제작 현황, 후보 풀 |
| 이미지 | [`image-requirements.md`](image-requirements.md) · [`image-generation-techniques.md`](image-generation-techniques.md) | 이미지 요구사항과 생성 표현법 |
| 이미지 타이밍 | [`shorts-image.md`](shorts-image.md) · [`image-anchor-sync.md`](image-anchor-sync.md) | 화면 전환과 ko/en 앵커 동기화 |
| 출력·검수 | [`render.md`](render.md) · [`final-check.md`](final-check.md) | 렌더 출력과 출품 전 최종 점검 |
| 공통 계약 | [`rules.md`](rules.md) · [`unification-phase1.md`](unification-phase1.md) | 불변 규칙과 본서비스 연결 |

---

## 단일원천 (SSoT) 데이터 흐름

콘텐츠 관계·판본 표지와 영상 원고는 원천이 다르다.

```text
DB celeb_contents → contents → content_locales.thumbnail_url
        ↓ 안정 ID                         ↓ 원본 URL
book.<locale>.json                 covers/content/<contentId>/<locale>.webp
        └─────────────────────── Remotion 렌더
```

- 콘텐츠 관계·외부 표지 URL은 DB가 원본이다.
- 영상 원고·음성·타이밍·연출 이미지는 에피소드 폴더가 원본이다.
- 제목·저자 문자열은 영상 형식에 맞춘 표현일 수 있으므로 DB 판본명으로 자동 덮어쓰지 않는다.
- 상세 연결·캐시 규격은 [1차 통합 문서](unification-phase1.md)를 따른다.

```
public/episodes/<person>/
  <locale>.json          콘텐츠 (텍스트, 메타, 이미지, tts 오버라이드)
  <locale>.timing.json   타이밍 (voiceTimings, *Duration) — 파이프라인 자동 생성
    ↓                      예: elon-musk/ko.json + ko.timing.json
script.ts (JSON import → mergeEpisode → currentEpisode export)
    ↓
scripts/voice/2-synthesize.ts  →  tts.replace 치환맵 적용, tts.titles 오버라이드
    ↓                  --update-json 시 duration을 timing.json에 역반영
timing.ts (타이밍 상수 + 계산 함수)
    ↓
BookRecommend.tsx, BookCardVisual.tsx, Overlay.tsx (모두 timing.ts import)
```

- **콘텐츠는 `<locale>.json`, 타이밍은 `<locale>.timing.json`이 SSoT.** 텍스트·TTS 오버라이드는 content, duration·voiceTimings는 timing.
- **timing.ts가 타이밍 상수 SSoT.** `toFrames`(배치용, +15 버퍼) / `toAudioFrames`(자막용, 버퍼 없음).
- **script.ts가 에피소드 로더.** `mergeEpisode(content, timing)`으로 합성. `EPISODE_NAME` 변경으로 에피소드 전환.
- **⚠️ `sw/remotion/public/episodes/` 전체는 `.gitignore` 대상이다(`.gitignore` 33행). 로컬 전용 자산이라 git이 추적하지 않으며, ripgrep 기반 검색 도구(Grep)는 기본적으로 무시 파일을 건너뛰어 이 폴더 안 텍스트를 찾지 못한다.** 에피소드 대본(`book.ko.json`·`ko.json` 등)을 검색·확인할 때는 파일 경로를 직접 열거나 Bash `grep -r`을 쓴다.

## 에피소드 데이터 — BookEntry

| 필드 | 용도 |
|------|------|
| `summary` | 요약맨: 핵심 요약 |
| `summaryDuration` | 요약맨 음성 길이 (초) |
| `contextMain` | 나레이터: 감상 배경 (3인칭) |
| `contextDuration` | 경위 음성 길이 (초) |
| `quotePairs` | 인용문+후속맥락 배열 (optional). 각 항목: `{ quote, quoteSource?, quoteDuration?, after?, afterDuration? }` |
| `category` | 콘텐츠 카테고리 (BOOK/VIDEO/GAME/MUSIC, 생략 시 BOOK) |
| `contentId` | 본 서비스 `contents.id`. 콘텐츠 식별용 |
| `userContentId` | 해당 인물의 `celeb_contents.id`. 필드명은 에피소드 포맷 호환을 위해 유지하며 감상 관계 검증에 쓴다 |
| `thumbnailSourceUrl` | 렌더 표지 캐시를 만든 DB 원본 URL 스냅샷 |
| `thumbnailSourceLocale` | 표지 원본의 locale |
| `stats` | DB 통계 (celebCount, celebNames, publisher 등) |
| `titleDuration` | 제목+저자 음성 길이 (초) |

## 음성 파일 구조

```
public/common/voice/ko/                     ← 공용 (한국어)
  A1-service-greeting.wav, C1-label-summary.wav, C2-label-context.wav

public/episodes/<person>/voice/<locale>/gemini/  ← 인물별 음성
  A2-service-intro.wav, A3-featured-quote.wav
  B1-celeb-intro.wav, B2-philosophy.wav, E1-outro.wav
  D01a-title.wav, D01b-summary.wav, D01c-context.wav
  D01d1-quote.wav, D01d2-after.wav
  S01-intro.wav, S02-celeb-mid.wav, S03-book-context.wav  ← 쇼츠
  ...
```

## 새 에피소드 제작 절차

에피소드 JSON 생성의 단일 참조 경로. 각 단계의 상세 기준은 링크 문서에서 확인한다.

### 단계별 체크

| 단계 | 작업 | 참조 |
|------|------|------|
| 1 | **편성 확인** — 순서·라이벌 묶음·분량(10권↓단일, 11~20권 2편, 20권↑선별) | [lineup.md](lineup/lineup.md) § 편성 원칙·제작 규칙 |
| 2 | **DB 데이터 수집** — 프로필·명언·콘텐츠·통계·스펙트럼. 콘텐츠 타입(`contents.type`)이 BOOK이 아닌 항목은 category 필드 필수 | 아래 DB 소스 표 |
| 3 | **JSON 초안** — `public/episodes/pre-todo/<name>.json` 작성 (기존 JSON 복사 후 수정) | [longform.md](longform.md) § DB→JSON 변환 체크리스트 |
| 4 | **텍스트 검수** — 주어 규칙·말투·진부 표현 제거 | [longform.md](longform.md) § 말투 규칙, [lineup.md](lineup/lineup.md) § 품질 |
| 5 | **ID·표지 동기화** — DB 관계 연결 + DB 표지 → `covers/content/<contentId>/<locale>.webp` 캐시 | [unification-phase1.md](unification-phase1.md) |
| 6 | **보이스 배정** — 해설은 Gemini Charon, 실제 인물은 ElevenLabs 배정 | [voice/actors.md](voice/actors.md), [lineup.md](lineup/lineup.md) § 보이스 |
| 7 | **승격** — `pre-todo/<name>.json` → `todo/<name>/ko.json` 이동, `script.ts` 등록 | 아래 에피소드 상태 표 |
| 8 | **음성 생성** — [음성 파이프라인 3단계](voice/tts.md) 실행 | [voice/tts.md](voice/tts.md) § 음성 타이밍 |
| 9 | **프리뷰** — `pnpm reboot` | — |

### DB 소스 (2단계)

| 데이터 | 테이블 | 주요 필드 |
|--------|--------|-----------|
| 기본 정보 | `celebs` | nickname, nickname_en, bio, avatar_url, speech_tone |
| 명언 (SSoT) | `celeb_dialogues` | lines→quote |
| 콘텐츠 목록 | `celeb_contents` → `contents` → `content_locales` | title, creator, thumbnail_url, review, **`contents.type`** (category 판별용). 조회 시 `type IN ('BOOK','VIDEO','GAME','MUSIC')` — BOOK만 필터링하면 non-BOOK 누락 |
| celebCount | `celeb_contents` 집계 | content_id별 추천 셀럽 수 |
| 스펙트럼 | `celeb_persona` | `persona` JSONB (philosophy 작성 참고) |

---

## 에피소드 상태 (`_status` 파일 기반)

진척도는 인물 폴더 안 `_status` 파일(한 줄 plain text)이 SSoT다. 폴더 위치는 그룹 축(예: `three-kingdoms/`)으로 자유 사용한다.

```
public/episodes/
  pre-todo/                초안 풀 (flat JSON, 자동 생성)
  <person>/                인물 폴더 1-depth
    _status                "todo" / "live" / "done" 중 하나
    ko.json, voice/, ...   인물 자산
  <group>/<person>/        그룹 폴더 안 인물(예: three-kingdoms/zhuge-liang/)
    _status
```

| `_status` 값 | 설명 |
|----------|------|
| `todo` | 검수 완료. voice 미생성 |
| `live` | voice/이미지 작업 중 |
| `done` | YouTube 업로드 완료 |
| (파일 없음) | 그룹 폴더 또는 비활성 분류 폴더 — 인식 안 함 |

> **변경 이력 (2026-05)**: 옛 `todo/`·`live/`·`done/` 3단 폴더를 폐기하고 `_status` 파일로 분리했다. 진척도와 그룹을 직교 축으로 둘 수 있다. 이관용 일회성 스크립트는 폐기했다.

### 승격 절차

1. **초안 → 대기**: `pre-todo/<name>.json` → `<name>/ko.json` 이동(인물 폴더 생성, `_status`에 `todo` 기록). `script.ts`에 import + episodes 등록.
2. **대기 → 진행**: voice 생성 후 `_status` 파일을 `live`로 갱신. BO 대시보드 드롭다운으로도 가능.
3. **진행 → 완료**: YouTube 게시 후 `_status`를 `done`으로 갱신.

### 영문(en) 작업 시점 원칙

**en 작업은 ko가 한국어 YouTube에 올라간 뒤 안정적이라고 판단된 시점에만 착수한다.**

- 한국어 본이 라이브로 나간 뒤 썸네일·자막·이미지·내러티브 구조에 큰 수정이 없다는 게 확인되면 그때 en을 생성·동기화한다.
- 그 전에 en을 미리 만들면 ko 개편이 있을 때마다 en을 재작업해야 해서 비용만 중복된다.
- 적용 범위: `/remo-i18n-episode`, `/image-anchor-sync`의 en 동기화, en 이미지 앵커, en voice 등 모든 en 관련 파이프라인.
- 따라서 `live/` 단계에서 en.json이 ko.json과 책 수·이미지 수가 맞지 않는 상태는 **정상이며 의도된 상태**다. done 이후에 맞춘다.

---

## 윤리 원칙

- **실제 인물 음성은 ElevenLabs로만 만들고 검증된 직접 인용문에만 사용한다.** AI가 창작한 1인칭 발언을 인물 목소리로 읽지 않으며 Gemini 인물 음성으로 대체하지 않는다.
- 감상 배경(contextMain)은 나레이터가 3인칭으로 전달한다. 출처(인터뷰, 기사 등)를 명시한다.
- 직접 인용문이 없는 책은 quote 단계를 건너뛴다.
