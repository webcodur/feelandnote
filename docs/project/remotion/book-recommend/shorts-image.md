# 쇼츠 이미지 전환 시스템

세그먼트별 배경 이미지(`seg.image`)와 세그먼트 내 이미지 전환(`imageChangeAt`)의 데이터 흐름.

## 데이터 흐름

```
ko.json                           ko.timing.json
  shorts.segments[i]                shorts.segments[i].duration
    .image                          voiceTimings["S04-book-context"]
    .imageChangeAt[].text
    .imageChangeAt[].image
         │                                  │
         └──────────┬───────────────────────┘
                    ▼
           merge-episode.ts              ← (1) duration 머지
                    │
                    ▼
           timing.ts / shortSegLayout    ← (2) 프레임 계산 (imageMinFrames 보장)
                    │
                    ▼
           BookRecommendShort.tsx        ← (3) groups 배열 생성 → 크로스페이드 렌더
```

### (1) 머지 — `merge-episode.ts:17-26`

```typescript
segments: content.shorts.segments.map((seg, i) => ({
  ...seg,                                    // image, imageChangeAt, text 등
  ...(timing.shorts?.segments?.[i] ?? {}),   // duration 덮어씀
}))
```

### (2) 레이아웃 — `timing.ts:154-166` `shortSegLayout()`

```
seg.duration 있음 → toShortFrames(duration)  // ceil(dur×60) + f(0.3)
seg.duration 없음 → fallback                 // hook: 3.5초, 그 외: 2.5초

imageChangeAt 있음 → imageMinFrames = 이미지수 × 2초
최종: Math.max(base, imageMinFrames)          // 이미지 전환 시간 보장
```

### (3) 이미지 전환 — `BookRecommendShort.tsx:207-269`

**groups 배열 생성 (207-241)**:

```
segments.forEach(seg):
  seg.image → push(seg.image, segStarts[i])      // 기본 이미지
  seg.imageChangeAt.forEach(change):
    voiceTimings 있음 → 텍스트 앵커 매칭 → w.start (초)
    voiceTimings 없음 → (텍스트위치/전체길이) × segDurSec
    매칭 실패 → continue (skip)
    → push(change.image, segStarts[i] + f(resolved))

groups.sort() → 프레임 오름차순
```

**크로스페이드 렌더링 (242-269)**:

```
groups.map(group):
  spacing = 다음 이미지까지 프레임 거리
  fadeIn  = min(f(0.5), spacing × 0.4)   // 동적 조정
  fadeOut = min(f(0.2), spacing × 0.4)
  → <Img opacity={min(bgOp, fadeIn, fadeOut)} />
```

## voiceTimings 키 생성

```
vnShort(segIndex, segId)  → "S04-book-context.wav"   // voice-names.ts:35
vnTimingKey(fileName)     → "S04-book-context"        // voice-names.ts:38
```

## imageChangeAt 타입 — `types.ts:171-174`

```typescript
imageChangeAt?: {
  t: number       // 오프셋 (초). analyze-voice가 text 앵커 매칭 시 자동 반영
  image: string   // 전환 이미지 경로 (episodes/... 형식)
  text?: string   // 텍스트 앵커 — voiceTimings에서 해당 텍스트 시작 시간 조회
} | { ... }[]     // 배열로 여러 전환점
```

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
| 데이터 구조 | `seg.imageChangeAt[]` | `book.images[]` (CinematicImage) |
| 앵커 필드 | `text` (같은 역할) | `text` + `field` (섹션 귀속) |
| 렌더링 | groups → 크로스페이드 (동적) | `resolveImageTransitions` → CinematicPanel |
| 폴백 | `(텍스트위치/길이) × segDurSec` | `estimateAnchorFrame` (같은 비율 방식) |
| 매칭 실패 | `continue` (skip) | `findNextSegFrame` (이전 앵커 다음 세그먼트) |
