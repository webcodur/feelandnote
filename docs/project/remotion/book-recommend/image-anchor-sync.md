# 이미지 앵커 동기화 파이프라인

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

```
sw/remotion/public/episodes/{done|live|todo|pre-todo}/{name}/
  ko.json
  en.json
  images/
    *.{jpg,jpeg,png,webp}
```

에피소드 위치는 `done → live → todo → pre-todo` 순서로 탐색한다.

## 전제 조건

- `images/` 폴더에 이미지 파일이 존재한다 (파일명 자유).
- `ko.json`의 본문(`books[].summary/context/contextAfter/directQuote`, `shorts.segments[].text`)이 확정되어 있다.
- `en.json`이 존재하고 번역이 완료되어 있다 (Phase B 필수).

---

## 데이터 구조

### 롱폼 이미지 (`book.images[]`)

```typescript
type CinematicImage = {
  file: string           // 파일명 (images/ 기준 상대)
  field: 'summary' | 'context' | 'contextAfter' | 'directQuote'
  text?: string          // 텍스트 앵커 — 이 문구가 나오는 시점에 이미지 전환
  keyword?: string       // 대안 앵커 (deprecated, 일부 에피소드 잔존)
}
```

### 쇼츠 이미지 (`shorts.segments[].imageChangeAt[]`)

```typescript
type ImageChange = {
  t: number              // 오프셋 (초). 0으로 초기화, analyze-voice가 text 기반 재계산
  image: string          // episodes/... 전체 경로
  text?: string          // 텍스트 앵커
}
```

### 앵커 규칙 (공통)

1. **문자열 매칭**: 앵커는 해당 field/segment 본문에 `includes()`로 정확히 포함되는 연속 문자열이어야 한다. 매칭 실패 시 렌더러는 해당 이미지를 skip.
2. **세그먼트 단위**: 단일 voiceTimings 세그먼트 내부에 들어가야 한다. 쉼표·마침표를 가로지르면 WhisperX 세그먼트 경계를 넘어가 매칭 실패.
3. **길이**: ko 3~7 단어, en 3~5 단어 권장. 너무 짧으면 본문 내 중복 위험, 너무 길면 매칭 실패 위험.

---

## Phase A — ko 앵커 생성

### A-1. 데이터 로드

- `ko.json` 전문을 Read로 읽는다.
- `images/` 폴더를 Glob(`**/*.{jpg,jpeg,png,webp}`)으로 스캔하여 이미지 파일 목록을 확보.
- 기존 앵커가 `ko.json`에 이미 있는 경우:
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

#### A-3-1. 롱폼 (`books[]`)

각 PASS 이미지에 대해:

1. 장면 묘사를 ko.json의 `books[].summary/context/contextAfter/directQuote` 전 영역과 대조.
2. 가장 의미적으로 맞아떨어지는 **(bookIndex, field)** 선정.
3. 해당 field 본문에서 이미지가 "등장해야 할" 전환 지점의 **3~7 단어 ko 앵커**를 뽑는다.
4. 같은 field 내에서 본문 등장 순서대로 정렬.

#### A-3-2. 쇼츠 (`shorts.segments[]`)

1. 각 segment의 `text`와 PASS 이미지를 대조.
2. **배경 이미지 (`seg.image`)**: segment 전체 기간 유지되는 이미지. segment 주제의 대표 장면 1장.
3. **전환 이미지 (`seg.imageChangeAt[]`)**: segment 내 특정 문장에서 교체되는 이미지. 각 항목에 text 앵커 + `t: 0` 초기화.
4. `t` 값은 `pnpm analyze`(analyze-voice) 실행 시 text 앵커 기반으로 자동 재계산된다.

### A-4. SUMMARY/CONTEXT 시작 이미지 보장

각 book에 대해 하드 요구사항:

- **`field: "summary"`인 이미지가 최소 1장** 존재해야 한다.
  - 첫 번째 summary 이미지는 `text` 없이 배치하거나(= field 시작과 동시 표시), summary 첫 문장 앵커를 부여한다.
- **`field: "context"`인 이미지가 최소 1장** 존재해야 한다.
  - context 시작 지점의 앵커를 반드시 부여한다.

#### 미달 시 대처

1. **조건부 승격**: 해당 field에 부합하는 REJECT 이미지를 재검토. 치명적 결함(AI 아티팩트, 시대고증 실패)이 없고 경미한 수준이면 PASS로 승격.
2. **경고 출력**: 여전히 부족하면 해당 book을 "요수동배치" 목록에 올린다. 에피소드 제작자가 이미지를 추가 생성하거나 수동 배치해야 한다.
3. Phase A는 완료하되, Phase B에서 해당 book은 건너뛸 수 있다.

### A-5. ko.json 기록

결과를 `ko.json`에 저장한다:

- `books[].images[]`: `[{ file, field, text?, keyword? }, ...]` (각 field 내 본문 등장 순서대로 정렬).
- `shorts.segments[].image`, `shorts.segments[].imageChangeAt[]`: 위 규칙대로 작성.

**저장 전**: 기존 앵커가 있었던 경우 diff를 출력하고 사용자 승인을 받는다. 신규 작성(기존 앵커 0건)은 승인 없이 진행.

---

## Phase B — en 앵커 동기화

`ko.json`에 확정된 앵커를 `en.json`으로 옮긴다.

### B-1. 롱폼 동기화

각 book에 대해 `ko.books[i].images[]`를 순회:

1. `file`, `field`, `keyword`(있으면) 그대로 복사.
2. `text`가 있는 항목: **en 앵커 생성**(B-3 프롬프트).
3. `text`가 없는 항목(field 시작 이미지): `text` 없이 복사.

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

위 ko 앵커와 의미적으로 동일한 지점에서 시작하는 en 텍스트의 처음 3~5단어를 답하라.
규칙:
- en 본문에 실제 존재하는 연속 텍스트여야 한다
- 해당 위치부터 이미지가 바뀌므로, 새로운 장면/맥락이 시작되는 정확한 지점이어야 한다
- 앵커 텍스트만 출력하라 (따옴표, 설명 없이)
```

### B-4. 검증 & 재시도

- LLM이 생성한 en 앵커가 en 본문에 `includes()` 매칭되지 않으면 즉시 재시도 (최대 2회).
- 재시도 실패 시 해당 앵커는 비우고 경고 출력. 수동 보정 대상으로 보고.

### B-5. en.json 기록

결과를 `en.json`에 저장한다.

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
    #1 trojan-war.jpg (시작)
    #2 warrior.png → "최고의"
  context:
    #3 reading.png → "알렉산더에게" ⭐ context 시작
    #4 sleeping.png → "알렉산더는 스승"
    #5 tomb.png → "기원전 334년 페르시아"
  contextAfter:
    #6 cavalry.png → "그로부터 3년 뒤 페르시아의"
    #7 chest.png → "알렉산더는 다리우스"

Book 2: ...

[쇼츠 배치]
seg 3 (book-context):
  image: sleeping.png
  changeAt[0]: cavalry.png → "기원전 331년"
  changeAt[1]: chest.png → "당시 그는 화려한"

[SUMMARY/CONTEXT 시작 이미지 보장]
✔ Book 1: summary 1장, context 1장
✔ Book 2: summary 1장, context 1장
⚠ Book 3: context 이미지 없음 → 수동 배치 필요

=== Phase B: en 앵커 동기화 ===

Book 1: The Iliad
  #1 trojan-war.jpg (시작)
  #2 warrior.png ko:"최고의" → en:"The greatest"
  #3 reading.png ko:"알렉산더에게" → en:"For Alexander, the"
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
| `sw/remotion/src/compositions/BookRecommend/BookRecommendShort.tsx` | 쇼츠 크로스페이드 렌더 (groups 배열 생성) |
| `sw/remotion/src/compositions/BookRecommend/sections/BookCardVisual/BookCardVisual.tsx` | 롱폼 CinematicPanel 렌더 |
| `sw/remotion/src/compositions/BookRecommend/timing.ts` | `shortSegLayout`, `resolveImageTransitions` |
| `sw/remotion/scripts/voice/analyze-voice.ts` | text 앵커 → voiceTimings 매핑 |
