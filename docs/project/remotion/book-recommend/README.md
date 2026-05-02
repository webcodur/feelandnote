# 서재 탐방 — 시리즈 가이드

셀럽의 추천 도서를 소개하는 영상 시리즈.

## 목차

| 장 | 문서 | 내용 |
|----|------|------|
| 1 | 이 문서 | 데이터 흐름, BookEntry, 음성 파일 구조, **에피소드 제작 절차** |
| 2 | [longform.md](longform.md) | 롱폼 — 섹션 구성, 역할·말투, 타이밍, 워크플로 |
| 3 | [shorts.md](shorts.md) | 쇼츠 — 4비트 구조, 비주얼, 음성, 자막 |
| 4 | [voice/tts.md](voice/tts.md) | 음성 생성 — 엔진, 보이스, 커맨드, **타이밍 파이프라인** |
| 4b | [voice/actors.md](voice/actors.md) | 보이스 배정 — Gemini TTS 목록, 셀럽별 매핑 |
| 5 | [lineup/lineup.md](lineup/lineup.md) | 편성표 — 배포 순서, 제작 진행 현황 |
| 5b | [lineup/candidates.md](lineup/candidates.md) | 후보 전략 — 라이벌 묶음, 정치 교차 |
| 5c | lineup/candidates-raw.md | 후보 전체 리스트 (DB 자동 생성, git 미추적) |
| 6 | [rules.md](rules.md) | 불변 규칙 — 윤리, 데이터 흐름, 개발 주의사항 |
| 7 | [render.md](render.md) | 렌더 출력 — 명령어, 파일명 규칙, 코덱 옵션 |
| 8 | [image-requirements.md](image-requirements.md) | 배경연출 이미지 — 생성 가이드, 프롬프트 규칙, 품질 기준 |
| 8b | [shorts-image.md](shorts-image.md) | 쇼츠 이미지 전환 — imageChangeAt, 앵커 매칭, 크로스페이드 |
| 8c | [image-anchor-sync.md](image-anchor-sync.md) | 이미지 앵커 동기화 파이프라인 — 폴더 스캔·품질 필터·ko/en 동기화 |
| 9 | [writer/](writer/) | 글쓰기 + 교정 파이프라인 |
| 9-0 | [writer/0-draft.md](writer/0-draft.md) | **초안 작성 가이드** — 테마·필드별 기준·말투·문장 원칙·DB 매핑 |
| 9-1 | [writer/1-fact-check.md](writer/1-fact-check.md) | 사료 검증 — 역사적 사실·인용문·출처 교차 검증 |
| 9-2 | [writer/2-chronology.md](writer/2-chronology.md) | 인생 순서 배치 — 생애 연대기 기반 books 배열 |
| 9-3 | [writer/3-story-power.md](writer/3-story-power.md) | 스토리 파워 — 중심축·감정곡선·S급 context·벤치마크 |
| 9-4 | [writer/4-prose.md](writer/4-prose.md) | 글 부드러움 — 주어·연결어·리듬·TTS 친화성 |
| 9-5 | [writer/5-editorial-board.md](writer/5-editorial-board.md) | 5인 편집국 사이클 — 위생·도끼·번역투·사료·직업 분야 단일 SSoT |
| 9-6 | [writer/6-paragraphs.md](writer/6-paragraphs.md) | 문단 분할 — 긴 서술 필드를 `\n\n` 기준으로 분할. 원문 보존 |
| 10 | [final-check.md](final-check.md) | 출품 전 최종 점검 — 한영 정합성·텍스트·이미지·음성·윤리 |

---

## 단일원천 (SSoT) 데이터 흐름

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

## 에피소드 데이터 — BookEntry

| 필드 | 용도 |
|------|------|
| `summary` | 요약맨: 핵심 요약 |
| `summaryDuration` | 요약맨 음성 길이 (초) |
| `contextMain` | 나레이터: 감상 배경 (3인칭) |
| `contextDuration` | 경위 음성 길이 (초) |
| `quotePairs` | 인용문+후속맥락 배열 (optional). 각 항목: `{ quote, quoteSource?, quoteDuration?, after?, afterDuration? }` |
| `category` | 콘텐츠 카테고리 (BOOK/VIDEO/GAME/MUSIC, 생략 시 BOOK) |
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
| 2 | **DB 데이터 수집** — 프로필·명언·콘텐츠·통계·페르소나. 콘텐츠 타입(`contents.type`)이 BOOK이 아닌 항목은 category 필드 필수 | 아래 DB 소스 표 |
| 3 | **JSON 초안** — `public/episodes/pre-todo/<name>.json` 작성 (기존 JSON 복사 후 수정) | [longform.md](longform.md) § DB→JSON 변환 체크리스트 |
| 4 | **텍스트 검수** — 주어 규칙·말투·진부 표현 제거 | [longform.md](longform.md) § 말투 규칙, [lineup.md](lineup/lineup.md) § 품질 |
| 5 | **표지 다운로드** — 외부 URL → 인물 디렉토리 `covers/` | [rules.md](rules.md) § 표지 이미지 |
| 6 | **보이스 배정** — ElevenLabs(`voice_id_ko`) 또는 Gemini 배정 | [voice/actors.md](voice/actors.md), [lineup.md](lineup/lineup.md) § 보이스 |
| 7 | **승격** — `pre-todo/<name>.json` → `todo/<name>/ko.json` 이동, `script.ts` 등록 | 아래 에피소드 상태 표 |
| 8 | **음성 생성** — [음성 파이프라인 3단계](voice/tts.md) 실행 | [voice/tts.md](voice/tts.md) § 음성 타이밍 |
| 9 | **프리뷰** — `pnpm reboot` | — |

### DB 소스 (2단계)

| 데이터 | 테이블 | 주요 필드 |
|--------|--------|-----------|
| 기본 정보 | `profiles` | nickname, nickname_en, bio, avatar_url, speech_tone |
| 명언 (SSoT) | `celeb_dialogues` | lines→quote |
| 콘텐츠 목록 | `user_contents` → `contents` → `content_locales` | title, creator, thumbnail_url, review, **`contents.type`** (category 판별용). 조회 시 `type IN ('BOOK','VIDEO','GAME','MUSIC')` — BOOK만 필터링하면 non-BOOK 누락 |
| celebCount | `user_contents` 집계 | content_id별 추천 셀럽 수 |
| 페르소나 | `celeb_persona` | persona (philosophy 작성 참고) |

---

## 에피소드 상태 (폴더 기반)

인물 폴더의 위치가 곧 상태다. `_status.json` 없음.

```
public/episodes/
  pre-todo/   ← 초안 풀 (flat JSON, 자동 생성)
  todo/       ← 검수 완료, voice 미생성
  live/       ← 진행중 (voice/이미지 작업)
  done/       ← 완료 (YouTube 업로드)
```

| 상태 | 폴더 | 설명 |
|------|------|------|
| 초안 | `pre-todo/` | DB 자동 생성 JSON. 검수 전 |
| 대기 | `todo/` | 검수 완료. voice 미생성 |
| 진행 | `live/` | voice/이미지 작업 중 |
| 완료 | `done/` | YouTube 업로드 완료 |

### 승격 절차

1. **초안 → 대기**: `pre-todo/<name>.json` → `todo/<name>/ko.json` 이동 (디렉토리 생성). `script.ts`에 import + episodes 등록.
2. **대기 → 진행**: voice 생성 후 인물 폴더를 `todo/` → `live/`로 이동.
3. **진행 → 완료**: YouTube 게시 후 인물 폴더를 `live/` → `done/`으로 이동.

### 영문(en) 작업 시점 원칙

**en 작업은 ko가 한국어 YouTube에 올라간 뒤 안정적이라고 판단된 시점에만 착수한다.**

- 한국어 본이 라이브로 나간 뒤 썸네일·자막·이미지·내러티브 구조에 큰 수정이 없다는 게 확인되면 그때 en을 생성·동기화한다.
- 그 전에 en을 미리 만들면 ko 개편이 있을 때마다 en을 재작업해야 해서 비용만 중복된다.
- 적용 범위: `/episode-translate`, `/image-anchor-sync`의 en 동기화, en 이미지 앵커, en voice 등 모든 en 관련 파이프라인.
- 따라서 `live/` 단계에서 en.json이 ko.json과 책 수·이미지 수가 맞지 않는 상태는 **정상이며 의도된 상태**다. done 이후에 맞춘다.

---

## 윤리 원칙

- **셀럽 음성(Puck/ElevenLabs)은 검증된 직접 인용문에만 사용한다.** AI가 창작한 1인칭 발언을 셀럽 목소리로 읽지 않는다.
- 감상 배경(contextMain)은 나레이터가 3인칭으로 전달한다. 출처(인터뷰, 기사 등)를 명시한다.
- 직접 인용문이 없는 책은 quote 단계를 건너뛴다.
