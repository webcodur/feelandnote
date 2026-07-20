# 쇼츠 이미지 전환 시스템

> **최종 실측 체크: 26.07.16** — `merge-episode.ts`, `timing.ts`(`shortSegLayout`), `BookRecommendShort.tsx`, `sections/ShortBackgroundLayer.tsx`, `voice-names.ts`, `types.ts` 대조. 행 번호 참조는 전부 어긋나 있어 함수·파일 이름 기준으로 교체함

세그먼트별 배경 이미지(`seg.image`)와 세그먼트 내 이미지 전환(`imageChangeAt`)의 데이터 흐름.

## 데이터 흐름

```
books/{NN-책제목}/shorts.ko.json     shorts.ko.timing.json
  segments[i]                          segments[i].duration
    .image                             voiceTimings["shorts-2/S04-book-context"]
    .imageChangeAt[].text
    .imageChangeAt[].image
         │                                  │
         └──────────┬───────────────────────┘
                    ▼
           script.ts                    ← (1) 쇼츠 파일 로드 + duration 머지
                    │
                    ▼
           timing.ts / shortSegLayout    ← (2) 프레임 계산 (imageMinFrames 보장)
                    │
                    ▼
           BookRecommendShort.tsx        ← (3) groups 배열 생성 (앵커 해소)
                    │
                    ▼
           sections/ShortBackgroundLayer.tsx  ← (4) 크로스페이드 렌더
```

### (1) 머지 — `script.ts` / `merge-episode.ts`

쇼츠는 **`mergeEpisode`가 건드리지 않는다**. `script.ts`가 책 폴더의 `shorts.{locale}.json` + `shorts.{locale}.timing.json`을 먼저 병합해 `content.shorts` 배열로 주입하고, `mergeEpisode`는 본체(narrator·host·books) 타이밍만 머지한 뒤 `shorts: content.shorts`로 그대로 통과시킨다.

```typescript
// merge-episode.ts — 쇼츠는 통과만
return {
  ...content,
  voiceTimings: timing.voiceTimings,
  narrator: { ...content.narrator, ...timing.narrator },
  host: { ...content.host, ...timing.host },
  books: content.books?.map((book, i) => ({ ...book, ...(timing.books?.[i] ?? {}) })),
  shorts: content.shorts,   // ← 이미 병합된 배열
}
```

### (2) 레이아웃 — `timing.ts` `shortSegLayout()`

```
seg.disabled       → 0프레임 (시간도 gap도 차지하지 않고 통째로 건너뜀)
seg.duration 있음  → toShortFrames(duration)  // ceil(dur×60) + f(0.3)
seg.duration 없음  → fallback                 // 첫 세그먼트: 3.5초, 그 외: 2.5초

imageChangeAt 있음 → imageMinFrames = 이미지수 × 2초
최종: Math.max(base, imageMinFrames) + tailHold   // 마지막 활성 세그먼트만 tailHold(1.2초)
```

fallback 분기는 `seg.visual === 'hook'`이 아니라 **첫 세그먼트(`i === 0`)** 기준이다.

### (3) 앵커 해소 — `BookRecommendShort.tsx` (imageGroups)

```
segments.forEach(seg):
  seg.image → push(seg.image, segStarts[i])      // 기본 이미지
  seg.image 없으면 imageChangeAt 처리 자체를 건너뜀
  seg.imageChangeAt.forEach(change):
    sub 경계(subTimings) 우선 → 문장 → 단어 순으로 앵커 매칭
    voiceTimings 없음 → (텍스트위치/전체길이) × segDurSec
    매칭 실패 → skip
    → push(change.image, segStarts[i] + f(resolved))

groups.sort() → 프레임 오름차순
간격이 MIN_GROUP_GAP 미만이면 앞 이미지를 버린다 (너무 짧은 노출 방지)
```

앵커 매칭은 **sub(자막 덩어리) 경계를 최우선 원천**으로 쓴다. VoiceTimingEditor에서 자막 타이밍을 손보면 이미지 전환도 같이 따라가도록 묶여 있다.

### (4) 크로스페이드 렌더 — `sections/ShortBackgroundLayer.tsx`

```
imageGroups.map(group):
  spacing = 다음 이미지까지 프레임 거리
  fadeIn  = min(f(0.5), spacing × 0.4)   // 동적 조정
  fadeOut = min(f(0.2), spacing × 0.4)
  → <Img opacity={...} />
```

## voiceTimings 키 생성

`vnShort`는 인자 **3개**이고 쇼츠 번호 접두사가 **필수**다.

```
vnShort(segIndex, segId, shortsIndex)  → "shorts-2/S04-book-context.wav"   // voice-names.ts
vnTimingKey(fileName)                  → "shorts-2/S04-book-context"        // voice-names.ts
```

접두사 없는 레거시 경로(`S04-book-context.wav`)는 더 이상 생성하지 않는다.

## imageChangeAt 타입 — `types.ts` (ShortSegment)

```typescript
imageChangeAt?: {
  t: number       // 오프셋 (초). voice:align(4-align.ts)이 text 앵커 매칭 시 자동 반영
  image: string   // 전환 이미지 경로 (episodes/... 형식)
  text?: string   // 텍스트 앵커 — voiceTimings에서 해당 텍스트 시작 시간 조회
} | { ... }[]     // 배열로 여러 전환점
```

`t`를 채우는 건 `4-align.ts`(`pnpm voice:align`)다. `imageChangeAt`은 본문 단일원천이라 timing 파일 쪽 값은 무시된다.

## 앵커 작성 규칙

1. **단일 voiceTimings 세그먼트 안에 포함되는 텍스트를 사용한다.**
   - WhisperX는 쉼표/마침표 기준으로 세그먼트 분리
   - `"이라크, 아프가니스탄"` → 매칭 실패 (2개 세그먼트에 걸침)
   - `"이라크,"` → 매칭 성공

2. **매칭 실패 시 해당 이미지는 건너뛰어진다** (크래시 방지).

3. **voiceTimings 없이도 동작**하지만 텍스트 위치 비율 추정이라 정밀도가 떨어진다.

## 롱폼 이미지 전환과의 차이

| | 쇼츠 | 롱폼 |
|---|---|---|
| 데이터 구조 | `seg.imageChangeAt[]` | `images[]` (CinematicImage) |
| 앵커 필드 | `text` (같은 역할) | `text` + `field` (섹션 귀속) |
| 렌더링 | groups → 크로스페이드 (동적) | `resolveImageTransitions` → CinematicPanelLegacy |
| 폴백 | `(텍스트위치/길이) × segDurSec` | `estimateAnchorFrame` (같은 비율 방식) |
| 코드 위치 | `BookRecommendShort.tsx` + `sections/ShortBackgroundLayer.tsx` | `legacy/BookCardVisualLegacy.tsx` |

롱폼 앵커 함수(`findAnchorInSection`·`estimateAnchorFrame`·`resolveImageTransitions`)는 **`legacy/BookCardVisualLegacy.tsx`가 현역**이다. `_not-using/sections/BookCardVisual/BookCardVisual.tsx`에도 같은 이름들이 있지만 폐기 코드다.
