# 이미지 앵커 동기화 파이프라인

> **최종 실측 체크: 26.07.16** — 에피소드 디스크 구조(`sw/remotion/public/episodes/`), `types.ts`의 `CinematicImage`·`imageChangeAt`, `legacy/BookCardVisualLegacy.tsx` 앵커 함수, `scripts/voice/4-align.ts` 대조

에피소드 `images/` 폴더의 이미지를 전수 분석하여 ko 앵커를 자동 부착하고, 이어서 en 에피소드에 대응 앵커를 동기화하는 파이프라인의 상세 가이드.

실행은 `/image-anchor-sync <에피소드명>` 스킬로 한다. 스킬 요약은 `.claude/skills/remo-image-anchor-sync/SKILL.md`.

## 파이프라인 개요

```
images/ 폴더 (N장)
   │
   ▼ Phase A-1  데이터 로드
ko.json 전문 + 이미지 파일 목록
   │
   ▼ Phase A-2  시각 분석 & 품질 평가
PASS 이미지 + REJECT 이미지
   │
   ▼ Phase A-3  본문 매칭
(bookIndex, field, 앵커텍스트) 매핑
   │
   ▼ Phase A-4  SUMMARY/CONTEXT 시작 보장
미달 book 경고
   │
   ▼ Phase A-5  ko.json 저장
   │
   ▼ Phase B    en 앵커 동기화 (ko → en 프롬프트)
   │
   ▼ 검증 보고서 출력
```

## 파일 경로

에피소드는 인물 폴더 바로 아래에 있고, **본문·이미지는 책 단위로 쪼개져 있다**. 단계(stage) 폴더는 없다.

```
sw/remotion/public/episodes/{인물}/
  meta.ko.json / meta.en.json           ← narrator·host·tts (책 본문 없음)
  meta.ko.timing.json / meta.en.timing.json
  books/{NN-책제목}/
    book.ko.json / book.en.json         ← summary·contextMain·quotePairs·images
    book.ko.timing.json / book.en.timing.json
    shorts.ko.json / shorts.en.json     ← segments·revealBg·bgm (쇼츠 있는 책만)
    shorts.ko.timing.json
    images/
      *.{jpg,jpeg,png,webp}             ← 그 책 전용 이미지
  voice/{ko|en}/{gemini|elevenlabs}/
```

- **`ko.json`·`en.json` 단일 파일은 폐기된 레거시 레이아웃이다.** `peter-thiel`만 아직 남아 있다.
- `episodes/todo/`·`pre-todo/`는 빈 폴더이고 `done/`·`live/`는 존재하지 않는다. 단계별 탐색은 하지 않는다.
- 이미지는 에피소드 루트가 아니라 **책 폴더마다 따로** 있다. 루트의 `images_backup/`·`images_unused/`는 대상이 아니다.

## 전제 조건

- 대상 책의 `images/` 폴더에 이미지 파일이 존재한다 (파일명 자유).
- `book.ko.json`의 본문(`summary`/`contextMain`/`quotePairs[].quote`/`quotePairs[].after`)과 `shorts.ko.json`의 `segments[].text`가 확정되어 있다.
- `book.en.json`이 존재하고 번역이 완료되어 있다 (Phase B 필수).

---

## 데이터 구조

### 롱폼 이미지 (`book.ko.json` → `images[]`)

`types.ts`의 `CinematicImage`:

```typescript
type CinematicImage = {
  file: string           // 파일명 (그 책의 images/ 기준 상대)
  field?: 'summary' | 'context' | 'quote'  // 귀속 필드
  text?: string          // 텍스트 앵커 — 이 문구가 나오는 시점에 이미지 전환
  keyword?: string       // Studio 표시용 키워드
}
```

`field` 값 셋:
- `summary` — summary 텍스트 배경
- `context` — contextMain + quotePairs[].quote + quotePairs[].after 통합 배경
- `quote` — 직접 인용 전용. 레거시 데이터는 quote 이미지가 `context`로 들어가 있을 수 있다.

### 쇼츠 이미지 (`shorts.ko.json` → `segments[].imageChangeAt[]`)

```typescript
type ImageChange = {
  t: number              // 오프셋 (초). 0으로 초기화, voice:align(4-align.ts)이 text 기반 재계산
  image: string          // episodes/... 전체 경로
  text?: string          // 텍스트 앵커
}
```

단일 객체 또는 배열 둘 다 허용한다.

### 앵커란 무엇인가 (개념 설명)

영상 렌더러는 음성과 이미지를 시간 축 위에 나란히 올린다. "이 이미지를 음성의 어느 시점에 띄울까?"를 정해야 하는데, 두 가지 방법이 있다.

| 방법 | 예 | 단점 |
|------|------|------|
| 시간(초) 직접 지정 | "12.3초에 trojan.jpg 띄워" | 음성 길이가 1초만 바뀌어도 모든 시간을 다시 계산해야 함 |
| **텍스트 앵커** | "본문에 '트로이'가 나오는 순간 trojan.jpg 띄워" | 음성 재생성·문장 수정에 자동 대응 |

이 파이프라인은 **텍스트 앵커 방식**만 쓴다. 이미지마다 본문 속 짧은 단어 하나를 "앵커"로 지정하면, 렌더러가 WhisperX로 받아쓴 음성 타이밍에서 그 단어가 발음되는 정확한 시점에 이미지를 띄운다.

### 왜 단어 1개여야 하는가

과거에는 앵커를 "3~7 단어" 어구로 잡았는데, 두 가지 함정이 있었다.

1. **세그먼트 경계 문제**: WhisperX는 쉼표·마침표 단위로 음성 세그먼트를 자른다. "그로부터 3년 뒤 페르시아의" 같은 긴 앵커는 세그먼트 경계를 넘어가는 순간 `includes()` 매칭이 통째로 깨진다. 매칭이 깨지면 이미지는 그냥 안 뜬다(혹은 잘못된 시점에 뜬다).
2. **본문 수정 취약성**: 본문에서 단어 하나만 바꿔도 긴 앵커는 통째로 재작성해야 한다.

단어 1개 앵커는 거의 항상 단일 세그먼트 내부에 들어가고, 본문 수정에도 잘 안 깨진다.

### 앵커 규칙 (공통)

1. **문자열 매칭**: 앵커는 해당 field/segment 본문에 `includes()`로 정확히 포함되는 연속 문자열이어야 한다. 매칭 실패 시 렌더러는 해당 이미지를 skip.
2. **세그먼트 단위**: 단일 voiceTimings 세그먼트 내부에 들어가야 한다. 쉼표·마침표를 가로지르면 WhisperX 세그먼트 경계를 넘어가 매칭 실패.
3. **길이**: **단어 1~2개를 권장한다**. 단어 1개만으로 중복 가능성이 있어 모호하다면 안전하게 연속된 두 단어 정도로 묶는다. 단, 3단어 이상의 너무 긴 어구는 WhisperX 세그먼트 경계를 넘기 쉬워 매칭이 깨지므로 피한다.
4. **시작 앵커 필수**: `summary`, `context` 등 모든 field의 첫 이미지는 반드시 그 field 본문의 맨 첫 단어를 앵커로 가진다. `text` 없이 배치(= field 시작 자동 표시)는 금지. 이는 렌더러의 시작 정렬 안정성을 위해 필수.
5. **중복 단어 자동 disambiguation (occurrence-aware matching)**: 같은 단어가 본문에 여러 번 등장해도 보조 필드 없이 그냥 같은 텍스트로 적는다. 매칭 엔진은 **이미지 배열 순서가 본문 등장 순서와 일치한다**는 규약을 활용해, 같은 `(field, text)` 조합이 N번째 등장하면 본문에서도 N번째 등장 위치에 자동 매핑한다.
6. **앵커 위치 = 무조건 문장 또는 문단의 시작점**: 이미지가 문장 중간에 갑자기 바뀌는 것은 시각적으로 부적절하다. 이미지가 묘사하는 내용이 문장 중간에 나오더라도, 화면 전환은 반드시 그 문장이 시작될 때 이뤄져야 자연스럽다. 따라서 앵커 텍스트는 본문의 **새 문단 시작 단어** 또는 **새 문장 시작 단어(마침표·물음표·느낌표·줄바꿈 직후)**여야 한다. 동사나 명사라고 해서 문장 중간 단어나 콤마(,) 직후 단어를 잡는 것은 금지한다.

### Occurrence-aware matching이 어떻게 동작하나 (시각화)

짧은 단어 앵커를 쓰면 자연스럽게 따라오는 문제: "트로이" 혹은 "이 책은"이 본문에 두 번 나오면 어느 쪽인가? 작가에게 `nth: 2` 같은 보조 필드를 적게 하면 번거롭고, 본문 수정에도 깨진다. 그래서 **이미지 배열 순서를 그대로 신뢰**하는 방식을 쓴다.

**입력 예시** (작가가 작성한 이미지 배열)
```json
"summary": "트로이 전쟁의 영웅 아킬레우스. 트로이 성벽 앞에서...",
"images": [
  { "file": "war-scene.jpg",   "field": "summary", "text": "트로이" },
  { "file": "achilles.jpg",    "field": "summary", "text": "아킬레우스" },
  { "file": "wall-scene.jpg",  "field": "summary", "text": "트로이" }
]
```

**매칭 엔진의 동작**
```
본문: "트로이 전쟁의 영웅 아킬레우스. 트로이 성벽 앞에서..."
       ↑①                   ↑              ↑②
       1번째 "트로이"        "아킬레우스"   2번째 "트로이"

이미지 배열 순회:
  [0] "트로이"     → 카운터 0 → 본문 1번째 등장 위치 ①
  [1] "아킬레우스" → 카운터 0 → 본문 1번째 등장 위치
  [2] "트로이"     → 카운터 1 → 본문 2번째 등장 위치 ②
```

**작가가 지켜야 할 단 한 가지**: 이미지 배열을 **본문 등장 순서대로** 정렬한다. 순서를 어기면 매칭도 어긋난다.

**핵심 약속**
- 작가는 보조 필드(`nth`, `before`, `after`) 일절 적지 않는다.
- 같은 단어가 N번 나오면 그냥 N번 적는다.
- 매칭 엔진이 알아서 N번째 위치에 매핑한다.
- 본문 등장 횟수가 부족하면(예: 본문엔 "트로이"가 한 번뿐인데 이미지에선 두 번 사용) 경고를 출력한다 → 작가가 다른 앵커로 바꾼다.

---

## Phase A — ko 앵커 생성

### A-1. 데이터 로드

- 대상 책의 `book.ko.json` 전문을 Read로 읽는다 (쇼츠까지 다루면 같은 폴더의 `shorts.ko.json`도).
- 그 책의 `images/` 폴더를 Glob(`**/*.{jpg,jpeg,png,webp}`)으로 스캔하여 이미지 파일 목록을 확보.
- 기존 앵커가 `book.ko.json`에 이미 있는 경우:
  - **기본 정책**: 기존 앵커는 존중하고, 앵커가 없는 이미지만 추가 배치.
  - **전수 재배치**: 사용자가 명시적으로 승인한 경우에만 수행.

### A-2. 이미지 시각 분석 & 품질 평가

각 이미지 파일에 대해:

1. **Read tool로 이미지 파일을 연다** (Claude 멀티모달 비전).
2. **장면 묘사**: 주요 피사체, 배경, 시대·지리 단서, 행동·감정, 구도 특징을 한 문단으로 기록.
3. **품질 판정**: 아래 8개 기준 중 하나라도 탈락하면 REJECT.

#### 품질 기준 8항목

| # | 항목 | 탈락 조건 |
|---|------|-----------|
| 1 | 시대·복식 고증 | 시대 불명/혼재, 현대 의상·소품 혼입 |
| 2 | 실사감 | 밀랍인형·CG 느낌, 균일한 샤프니스 |
| 3 | 피사계심도 | 배경까지 전체 포커스로 평면적 인상 |
| 4 | 조명 | 광원 방향 불명, 인위적인 균일 조명 |
| 5 | AI 아티팩트 | 손가락 6개, 얼굴 왜곡, 녹아내린 소품, 사시 등 |
| 6 | 텍스트 오염 | 워터마크, 위조 간판 문자, 자막 잔재 |
| 7 | 구도 집중도 | 피사체가 모호하거나 산만함 |
| 8 | 서사 연결성 | 본문에서 시각화할 장면이 전혀 보이지 않음 |

**판정 결과**:
- **PASS** → ko 앵커 배치 후보.
- **REJECT** → 앵커 부착 대상 제외. 파일은 그대로 두되 탈락 사유를 보고서에 기록.
- **중복 장면**: 같은 장면을 그린 이미지가 여럿이면 가장 품질이 높은 1장만 PASS, 나머지는 REJECT("중복: 더 나은 대안 존재").

품질 기준 원전: [image-requirements.md](image-requirements.md).

### A-3. 이미지 → 본문 매칭

PASS된 이미지만 대상으로 한다.

#### A-3-1. 롱폼 (`book.ko.json`)

각 PASS 이미지에 대해:

1. 장면 묘사를 `book.ko.json`의 `summary`/`contextMain`/`quotePairs[].quote`/`quotePairs[].after` 전 영역과 대조.
2. 가장 의미적으로 맞아떨어지는 **field** 선정 (`'summary'`/`'context'`/`'quote'`).
3. 해당 field 본문에서 이미지가 "등장해야 할" 문장을 찾고, 반드시 그 **문장의 맨 첫 단어(중복 우려 시 2단어까지)**를 ko 앵커로 뽑는다.
4. 같은 field 내에서 본문 등장 순서대로 정렬.

#### A-3-2. 쇼츠 (`shorts.ko.json` → `segments[]`)

1. 각 segment의 `text`와 PASS 이미지를 대조.
2. **배경 이미지 (`seg.image`)**: segment 전체 기간 유지되는 이미지. segment 주제의 대표 장면 1장.
3. **전환 이미지 (`seg.imageChangeAt[]`)**: segment 내 특정 문장에서 교체되는 이미지. 각 항목에 text 앵커 + `t: 0` 초기화.
4. `t` 값은 `pnpm voice:align`(4-align.ts) 실행 시 text 앵커 기반으로 자동 재계산된다.

### A-4. SUMMARY/CONTEXT 시작 이미지 보장

각 book에 대해 하드 요구사항:

- **`field: "summary"`인 이미지가 최소 1장** 존재해야 한다.
  - 첫 번째 summary 이미지는 **반드시 summary 본문 첫 단어(또는 첫 1~2 단어)를 `text` 앵커로 가진다**. `text` 없이 배치 금지.
- **`field: "context"`인 이미지가 최소 1장** 존재해야 한다.
  - 첫 번째 context 이미지는 **반드시 contextMain 본문 첫 단어(또는 첫 1~2 단어)를 `text` 앵커로 가진다**.

#### 미달 시 대처

1. **조건부 승격**: 해당 field에 부합하는 REJECT 이미지를 재검토. 치명적 결함(AI 아티팩트, 시대고증 실패)이 없고 경미한 수준이면 PASS로 승격.
2. **경고 출력**: 여전히 부족하면 해당 book을 "요수동배치" 목록에 올린다. 에피소드 제작자가 이미지를 추가 생성하거나 수동 배치해야 한다.
3. Phase A는 완료하되, Phase B에서 해당 book은 건너뛸 수 있다.

### A-5. ko 기록

결과를 저장한다:

- `book.ko.json`의 `images[]`: `[{ file, field, text?, keyword? }, ...]` (각 field 내 본문 등장 순서대로 정렬).
- `shorts.ko.json`의 `segments[].image`, `segments[].imageChangeAt[]`: 위 규칙대로 작성.

**저장 전**: 기존 앵커가 있었던 경우 diff를 출력하고 사용자 승인을 받는다. 신규 작성(기존 앵커 0건)은 승인 없이 진행.

---

## Phase B — en 앵커 동기화

`book.ko.json`에 확정된 앵커를 같은 폴더의 `book.en.json`으로 옮긴다 (쇼츠는 `shorts.ko.json` → `shorts.en.json`).

### B-1. 롱폼 동기화

각 책의 `book.ko.json`의 `images[]`를 순회:

1. `file`, `field`, `keyword`(있으면) 그대로 복사.
2. **모든 항목에 `text`가 존재해야 한다** (Phase A 시작 앵커 필수 규칙). en 앵커 생성(B-3 프롬프트).
3. 만약 ko에 `text` 없는 항목이 발견되면 데이터 오류로 간주하고 경고 출력.

### B-2. 쇼츠 동기화

각 segment에 대해:

1. `seg.image`: 동일 파일 경로 복사.
2. `seg.imageChangeAt[]`: 각 항목의 `image` 복사 + `text` → en 앵커 생성, `t: 0` 초기화.

### B-3. en 앵커 생성 프롬프트

```
ko 필드({field}) 본문:
"{ko 본문}"

ko 앵커: "{ko 앵커 텍스트}"
→ 이 앵커는 "{ko 앵커가 포함된 문장}" 에서 시작되는 이미지 전환점이다.

en 필드({field}) 본문:
"{en 본문}"

위 ko 앵커 문장과 의미적으로 동일하게 대응하는 en 텍스트의 **문장 맨 첫부분(1~2단어)**을 답하라.
규칙:
- en 본문에 실제 존재하는 단어여야 한다.
- 이미지가 문장 중간에 바뀌는 것을 막기 위해, 반드시 번역된 새 문장의 맨 첫부분(1~2단어)을 선택한다 (관사 the/a, 전치사 of/in 등 문장 시작 단어라면 포함해도 무방).
- 해당 문장부터 이미지가 바뀌므로, 화면 전환 호흡에 맞는 정확한 시작 지점이어야 한다.
- 앵커 텍스트만 출력하라 (따옴표, 설명 없이)
```

### B-4. 검증 & 재시도

- LLM이 생성한 en 앵커가 en 본문에 `includes()` 매칭되지 않으면 즉시 재시도 (최대 2회).
- 재시도 실패 시 해당 앵커는 비우고 경고 출력. 수동 보정 대상으로 보고.

### B-5. en 기록

결과를 `book.en.json`·`shorts.en.json`에 저장한다.

---

## 검증 출력 포맷

Phase A·B 완료 후 다음 형식으로 보고한다.

```
=== Phase A: ko 앵커 생성 ===

[이미지 품질 분석]
PASS: 28장 / REJECT: 8장
탈락 사유:
  • rejected-a.png — 손가락 6개 아티팩트
  • rejected-b.png — 시대고증 실패 (현대 시계)
  • rejected-c.png — 중복: 더 나은 대안 존재
  ...

[롱폼 배치]
Book 1: 일리아스 (images: 7)
  summary:
    #1 trojan-war.jpg → "트로이" ⭐ summary 시작
    #2 warrior.png → "아킬레우스"
  context:
    #3 reading.png → "알렉산더에게" ⭐ context 시작
    #4 sleeping.png → "스승"
    #5 tomb.png → "페르시아"
  after (quotePairs[0]):
    #6 cavalry.png → "기병" ⭐ after 시작
    #7 chest.png → "다리우스"

Book 2: ...

[쇼츠 배치]
seg 3 (book-context):
  image: sleeping.png
  changeAt[0]: cavalry.png → "기병"
  changeAt[1]: chest.png → "보석함"

[SUMMARY/CONTEXT 시작 이미지 보장]
✔ Book 1: summary 1장, context 1장
✔ Book 2: summary 1장, context 1장
⚠ Book 3: context 이미지 없음 → 수동 배치 필요

=== Phase B: en 앵커 동기화 ===

Book 1: The Iliad
  #1 trojan-war.jpg ko:"트로이" → en:"Trojan" ⭐ summary 시작
  #2 warrior.png ko:"아킬레우스" → en:"Achilles"
  #3 reading.png ko:"알렉산더에게" → en:"Alexander" ⭐ context 시작
  ...

[en 앵커 실패]
⚠ Book 5 context #3: 재시도 2회 실패 → 수동 보정 필요

=== 요약 ===
총 이미지: 36장
PASS 배치: 28장
REJECT: 8장
ko 앵커 신규: 12장 / 수정: 0장
en 앵커 성공: 27장 / 실패: 1장
수동 조치 대상:
  • Book 3 context 이미지
  • Book 5 context #3 en 앵커
```

---

## 주의사항

### 멀티모달 토큰 소모

- Claude 멀티모달 분석은 토큰 소모가 크다. 36장이면 Phase A만으로도 상당한 context를 차지한다.
- **50장 이상**은 sub-agent 스워밍을 사용한다: 이미지 10~15장 단위로 병렬 분석 에이전트를 띄운다. 각 에이전트는 독립 context를 가지므로 main agent 압박이 최소화된다.
- 에이전트별로 "장면 묘사 + 품질 판정 + 본문 매칭" 결과를 JSON으로 반환받아 main agent가 통합.

### 품질 판정 톤

- **하드 탈락**: 명백한 AI 아티팩트(손가락 개수, 얼굴 왜곡), 시대고증 실패, 워터마크.
- **소프트 판정**: 구도·분위기·컬러그레이딩 같은 주관적 항목은 경계선에서 PASS 쪽으로 관대하게.
- **SUMMARY/CONTEXT 시작 이미지 규칙이 하드 탈락보다 우선**한다. 필수 슬롯이 비면 REJECT 이미지 중 경미한 결함만 있는 것을 승격.

### 기존 앵커 보호

- ko.json에 기존 앵커가 있으면 **기본적으로 보존**. 앵커 없는 이미지만 추가 배치.
- 전면 재작성이 필요하면 사용자에게 명시적으로 확인 (구두 승인 또는 `--force`).
- en.json 동기화는 항상 ko 기준으로 덮어쓴다 (en 단독 편집분은 없다고 간주).

### 디렉토리 구조

- 이 스킬은 이미지 파일을 **이동/삭제하지 않는다**. REJECT된 이미지도 `images/` 폴더에 그대로 남는다.
- 이미지 정리(재명명, reject 폴더 분리 등)는 별도 작업으로 처리한다.

### 방향성

- 이 파이프라인은 **이미지 폴더 → ko → en** 단방향이다.
- en → ko, 이미지 생성, 이미지 재작업은 지원하지 않는다.
- 이미지 생성은 [image-requirements.md](image-requirements.md) 가이드에 따라 별도 워크플로우로.

---

## 관련 문서

| 문서 | 내용 |
|------|------|
| [image-requirements.md](image-requirements.md) | 이미지 생성 가이드 — 프롬프트 규칙, 품질 기준 원전 |
| [shorts-image.md](shorts-image.md) | 쇼츠 이미지 전환 시스템 — imageChangeAt, 크로스페이드 |
| [rules.md](rules.md) | 불변 규칙 — 이미지 전환은 시간이 아닌 텍스트 앵커에 묶는다 |
| [voice/tts.md](voice/tts.md) | voiceTimings 생성 — text 앵커 매핑 기준 |

## 관련 코드

| 파일 | 역할 |
|------|------|
| `sw/remotion/src/compositions/BookRecommend/BookRecommendShort.tsx` | 쇼츠 이미지 groups 배열 생성 (앵커 해소) |
| `sw/remotion/src/compositions/BookRecommend/sections/ShortBackgroundLayer.tsx` | 쇼츠 크로스페이드 렌더 (groups 소비) |
| `sw/remotion/src/compositions/BookRecommend/legacy/BookCardVisualLegacy.tsx` | **현역 롱폼** 렌더, `findAnchorInSection`·`estimateAnchorFrame`·`resolveImageTransitions` |
| `sw/remotion/src/compositions/BookRecommend/timing.ts` | `shortSegLayout` |
| `sw/remotion/scripts/voice/4-align.ts` | text 앵커 → voiceTimings 매핑, 쇼츠 `imageChangeAt.t` 자동 해소 |

> **경로 함정**: 롱폼 현역 렌더는 `legacy/` 폴더에 있다. 이름과 정반대다. `_not-using/sections/BookCardVisual/BookCardVisual.tsx`는 같은 이름의 앵커 함수를 갖고 있지만 **아무 데서도 쓰지 않는 폐기 코드**다. 앵커 동작을 고치거나 읽을 때 이쪽을 보면 안 된다. Root.tsx가 롱폼에 물리는 컴포넌트는 `BookRecommendLegacy`다.

---

## 개선 이력

### 2026-04-06 — 단어 1개 앵커 + Occurrence-aware Matching

**배경**
- 기존 규칙은 앵커 길이를 "ko 3~7 단어 / en 3~5 단어"로 권장했다.
- 긴 앵커는 WhisperX 음성 세그먼트(쉼표·마침표 단위) 경계를 자주 넘어갔고, 경계를 넘는 순간 `includes()` 매칭이 통째로 깨졌다.
- 매칭이 깨지면 이미지가 안 뜨거나 잘못된 시점에 떴는데, 폴백 로직 때문에 **에러 없이 조용히 잘못 동작**해서 디버깅이 어려웠다.

**변경 내용**

1. **앵커 길이 1~2단어 권장 및 문장 시작점 강제**
   - 길이 규칙: `3~7 단어` → `단어 1~2개` (롱폼·쇼츠·en 공통) 중복 우려가 있다면 2단어 묶음 허용
   - 위치 규칙: 문장 중간(콤마 포함)의 핵심 명사/동사를 잡는 것을 금지하고, 반드시 문단이나 문장의 맨 첫 부분으로 고정.
   - 영문 앵커 역시 문장의 맨 첫 단어(들) 사용 (문장이 the/a로 시작한다면 포함하여 허용).

2. **시작 앵커 필수화**
   - `summary`, `context` 모든 field의 첫 이미지는 본문 첫 단어를 `text` 앵커로 가져야 한다.
   - 기존엔 "첫 이미지는 `text` 없이 배치 = field 시작과 동시 표시" 옵션이 열려 있었으나, 시작 정렬 안정성을 위해 폐지.

3. **Occurrence-aware sequential matching 도입**
   - 단어 1개 앵커는 본문 내 중복 가능성이 커졌다 (예: "트로이"가 본문에 두 번).
   - 기존 매칭은 `indexOf` / `find` 단발 호출이라 항상 첫 등장 위치만 잡았다.
   - 변경: 같은 `(field, text)` 조합이 이미지 배열에서 N번째로 등장하면, 본문에서도 N번째 등장 위치에 매핑.
   - 작가는 **이미지 배열을 본문 등장 순서대로 정렬**만 하면 된다. `nth`, `before`, `after` 같은 보조 필드 일절 없음.
   - 본문 등장 횟수가 부족하면 명확한 경고를 출력 → 작가가 인지하고 수정.

**개선 효과**

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| 앵커 길이 | 3~7 단어 어구 | 단어 1개 |
| 세그먼트 경계 위반 | 자주 발생 | 거의 없음 |
| 본문 수정 시 앵커 깨짐 | 빈번 | 드묾 |
| 중복 단어 매칭 | 첫 등장 위치로 잘못 매핑 (조용한 버그) | 자동 disambiguation |
| 작가가 적어야 할 정보 | text 어구 | text 단어 1개 + 본문 순서 정렬 |
| 매칭 실패 가시성 | 폴백으로 묻힘 | `#N` occurrence 표기 경고 |

**코드 변경 파일** (경로는 당시 기준. 현재 롱폼 현역 파일은 `legacy/BookCardVisualLegacy.tsx`이며 아래 함수 셋 모두 그쪽에 살아 있다)
- `sw/remotion/src/compositions/BookRecommend/sections/BookCardVisual/BookCardVisual.tsx`
  - `findAnchorInSection(anchor, section, occurrenceIndex)` — N번째 등장 위치까지 순차 진행
  - `estimateAnchorFrame(...)` — 폴백 함수도 occurrence-aware로 통일
  - `resolveImageTransitions` — `occurrenceCounter: Map<"${field}::${text}", count>` 추가
- `sw/remotion/scripts/voice/4-align.ts`
  - voiceTimings를 word 단위(`seg.words`) 또는 segment 단위로 평탄화
  - `imageChangeAt` 매칭에 occurrence counter 적용
  - 콘솔 로그에 `#N` 표기

**마이그레이션 가이드 (기존 에피소드)**
- 기존 에피소드의 긴 앵커는 즉시 깨지지 않는다 (구버전 매칭이 그대로 동작). 다만 다음 작업 시 단어 1개로 정리하면 안정성이 올라간다.
- 기존 `text` 없는 시작 이미지(field 시작 자동 표시)도 그대로 동작한다 (backward-compat 유지). 다만 신규 작성 시엔 반드시 시작 단어 앵커를 부여한다.
- Occurrence-aware matching은 기존 데이터에도 자동 적용된다. 같은 단어 앵커가 두 번 이상 쓰인 기존 에피소드는 두 번째 매칭이 첫 등장 → 두 번째 등장으로 **이동**한다. 의도한 동작인지 확인이 필요할 수 있다.
