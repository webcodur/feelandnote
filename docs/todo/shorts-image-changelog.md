# 쇼츠/롱폼 이미지 앵커 시스템 — 개선 기록

> 2026-04-05 완료

## 요약

voiceTimings 유무에 관계없이 텍스트 앵커 기반 이미지 전환이 동작하도록 개선했다.

## 해결한 문제들

### 1. 쇼츠 — MISS 앵커로 인한 `interpolate` 크래시 (핵심 버그)

**증상**: `inputRange must be strictly monotonically increasing but got [3105,2687]` 에러로 쇼츠 전체가 렌더링 불가.

**원인**: `imageChangeAt` 텍스트 앵커가 voiceTimings 세그먼트 경계를 걸치면 매칭 실패 → `resolved = 0` (세그먼트 시작 프레임)으로 groups에 삽입 → 이미 삽입된 매칭 성공 이미지(4초, 10초 등)보다 앞 프레임이 뒤에 배치 → `interpolate`의 inputRange 역순 → 크래시.

**예시** (alex-karp S04-book-context):
```
groups 삽입 순서:
  berlin_wall    → start=S          (seg.image, 정상)
  311_clash      → start=S+f(4.41)  (매칭 성공)
  weapon_mandala → start=S+f(10.94) (매칭 성공)
  ...
  ukraine-himars → start=S+f(0)=S   (매칭 실패! resolved=0)
  ↑ 이 그룹이 이전 그룹보다 앞 프레임 → fadeOut 계산에서 역순 inputRange
```

**수정** (`BookRecommendShort.tsx:225-230`):
```typescript
if (change.text && timings) {
  let matched = false
  for (const w of timings) {
    if (w.text.includes(change.text)) { resolved = w.start; matched = true; break }
  }
  if (!matched && resolved === 0) continue  // 매칭 실패 → 건너뛰기
}
```
추가로 `groups.sort((a, b) => a.start - b.start)` 안전망 정렬 추가 (241행).

**앵커 매칭 실패 조건**: voiceTimings 세그먼트가 단어 단위로 분리되어 앵커 텍스트가 경계를 걸치는 경우.
- `"이라크, 아프가니스탄"` → seg6 `"이라크,"` + seg7 `"아프가니스탄,"` → 단일 세그먼트에 없음
- **대응**: 앵커 텍스트를 단일 세그먼트 안에 들어가도록 수정 (`"이라크,"`)

### 2. 쇼츠 — voiceTimings 없을 때 텍스트 비율 폴백

**기존 코드**: `estDur = segText.length / 4.5` (텍스트 읽기 시간 추정 ~87초). 하지만 실제 세그먼트 할당 시간은 2.5초(fallback). 이미지 전환 프레임이 세그먼트 범위를 한참 벗어남.

**수정** (`BookRecommendShort.tsx:222`): `segDurSec = segTimings[i] / fps` (실제 할당 시간 사용).

### 3. 쇼츠 — duration 미설정 시 imageChangeAt 기반 세그먼트 확장

**기존**: `duration` 없으면 `SHORT_FALLBACK = 2.5초` 고정 → 10장 이미지 → 각 0.25초 → 크로스페이드(0.5초)보다 짧아 중간 이미지 전부 안 보임.

**수정** (`timing.ts:159-165`):
```typescript
const imageCount = seg.imageChangeAt
  ? (Array.isArray(seg.imageChangeAt) ? seg.imageChangeAt.length : 1)
  : 0
const imageMinFrames = imageCount > 0 ? f(imageCount * 2) : 0  // 이미지당 최소 2초
const base = seg.duration ? toShortFrames(seg.duration) : fallback
return Math.max(base, imageMinFrames)
```

### 4. 쇼츠 — 동적 크로스페이드

이미지 간격이 짧을 때 크로스페이드를 자동 축소 (`BookRecommendShort.tsx:243-256`).

### 5. 롱폼 — voiceTimings 없을 때 텍스트 위치 비율 폴백

**기존**: voiceTimings 없으면 text 앵커 무시, field 섹션 시작 프레임에서만 이미지 표시.

**수정** (`BookCardVisual.tsx:57-68`): `estimateAnchorFrame` 추가.
```typescript
(앵커위치 / 텍스트길이) × 섹션프레임
```

### 6. 쇼츠 — imageChangeAt prefetch 누락

**기존**: `seg.image`만 prefetch, `imageChangeAt[].image`는 미포함.

**수정** (`BookRecommendShort.tsx:80-87`): imageChangeAt 이미지도 prefetch 목록에 추가.

## 변경 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `BookRecommendShort.tsx` | MISS 앵커 skip, groups 정렬, segDurSec 폴백, 동적 크로스페이드, prefetch 확장 |
| `BookCardVisual.tsx` | `estimateAnchorFrame` 추가, `resolveImageTransitions` 시그니처 확장 |
| `timing.ts` | `shortSegLayout`에 imageChangeAt 기반 `imageMinFrames` 최소 보장 |
| `ko.json` (alex-karp) | 앵커 텍스트 3건 수정 (세그먼트 경계 불일치 해소) |

## 앵커 작성 규칙 (향후 참고)

1. **앵커 텍스트는 단일 voiceTimings 세그먼트 안에 포함되어야 한다.**
   - WhisperX는 쉼표/마침표 기준으로 세그먼트를 분리한다.
   - `"이라크, 아프가니스탄"` 처럼 쉼표를 걸치면 매칭 실패.
   - `"이라크,"` 또는 `"아프가니스탄,"` 처럼 단일 구절을 사용한다.

2. **매칭 실패 시 해당 이미지는 건너뛰어진다** (크래시 방지).
   - analyze 스크립트의 경고 메시지로 확인 가능.

3. **voiceTimings 없이도 동작하지만 정밀도가 다르다.**
   - voiceTimings 있음: 단어 시작 프레임에 정확히 매칭
   - voiceTimings 없음: `(앵커위치 / 텍스트길이) × 세그먼트시간` 비율 추정
