# 쇼츠 제작

## 콘셉트

**"이 사람은 왜 이 책에 미쳤을까?"**

셀럽의 권위 + 책 한 권의 스토리를 압축. 정보 전달이 아니라 **궁금증 유발 → 해소**의 감정 곡선을 설계한다.

---

## 포맷 원칙

| 원칙 | 설명 |
|------|------|
| **2초마다 시각 변화** | 컷/줌/텍스트 전환. 정적 화면 3초 이상 금지 |
| **자막 필수** | 무음 시청자 60%+. 음성 싱크 자막 항시 표시 |
| **Safe Zone** | 중앙 75% 집중. 우측 하단 120px, 하단 200px 비움 |
| **자연스러운 마무리** | 본문 마지막 문장이 여운으로 닫힌 뒤 곧바로 브랜드 로고로 마무리 |

---

## 텍스트 규칙

쇼츠 텍스트 금기와 4비트 작성 기준은 **[writer/0-draft.md](writer/0-draft.md)** § 쇼츠 텍스트 참조.

---

## 구조

쇼츠는 다음 골격을 따른다.

```
훅 → 인트로 → [대사 OR 해설] × N → 로고
```

- **훅 1개 + 인트로 1개**가 도입부 골격이다. 이 둘은 항상 단수.
- **본문은 [대사(role: celeb) / 해설(role: narrator)]을 N개 자유 배치**한다. 알터네이션이 기본이지만 같은 종류 연속도 허용. 인용–맥락 페어가 늘어나면 `celeb-2`, `book-context-2` 식으로 번호가 자동 부여된다.
- **로고 마무리**: 본문 마지막 세그먼트의 음성·이미지가 끝나면 닫힘 페이즈(0.5초)에서 배경이 사라지고 풀스크린 ShortsThumbnail(매거진 표지)이 페이드인되어 영상이 닫힌다. 별도 CTA 블록·세그먼트는 없다.

각 구간은 독립적 임팩트를 가지며 2~3초마다 시각 변화가 발생한다.

### 훅 (0~3초)

**목적**: 스크롤 멈추기. 첫 1초가 전부.

- **반드시 두 문장으로 구성.** 1문장(임팩트) + 2문장(보조)으로 디자인 분리. 컴포넌트가 자동 감지하여 크기·색상을 달리 적용한다.
- **비주얼**: 이미지 존에 아바타, 텍스트 존에 훅 문장
- **음성**: 훅 문장 나레이션 (무음 텍스트보다 음성+자막이 리텐션 높음)

훅 패턴:
```
"페르시아 왕에게 노획한 보물 상자. 알렉산더가 그 안에 넣은 건 책 한 권이었습니다."
"AI 연구자들 사이에서 성경처럼 읽히는 책이 있습니다. 핵폭탄 만드는 이야기입니다."
"13척의 배로 133척을 물리친 남자. 그의 일기에는 다섯 권의 책이 숨어 있습니다."
```

> 훅은 **결과를 먼저** 보여준다. "이 사람이 이걸 읽었다"가 아니라 "이 책이 이 결과를 만들었다".

### 인트로 — 누구+왜 (3~10초)

**목적**: 권위 확립 + 감정 연결

- **셀럽 리빌**: 아바타 등장 + 이름 + 한줄 정체성
- **인트로 텍스트에 반드시 인물 이름 포함.** 훅에서 이름을 안 밝힌 경우 인트로가 첫 네이밍이므로 생략 금지. 예: "메타의 창업자 마크 주커버그." / "Alexander the Great, King of Macedonia."
- **철학 한마디**: 검증된 실제 발언이 있으면 인물의 ELE 음성으로 제시한다. AI가 정리한 문장은 3인칭 Charon 해설로 쓴다.
- **비주얼**: 아바타 줌인 → 텍스트 오버레이

이 비트에서 시청자는 "아, 이 사람이구나 + 이 사람은 책을 이렇게 대하는구나"를 동시에 파악한다.

```
[아바타 등장]
알렉산더 대왕
"내게 문학은 영혼을 위한 보급품이었다"
```

### 본문 — [대사 / 해설] × N

**목적**: 이 책이 왜 특별한가 — 핵심 스토리를 인용과 맥락의 교차로 풀어낸다.

- **대사(role: celeb)**: 셀럽 1인칭 인용·독백. 검증된 직접 인용 또는 인물 고유의 1인칭 발화.
- **해설(role: narrator)**: 사료·서사 맥락. 롱폼 S급 context 추출.
- **배치**: 알터네이션 권장(대사 → 해설 → 대사 → 해설 …)이지만 같은 종류 연속도 허용. 페어가 늘어나면 id에 번호가 자동 부여된다 (`celeb-2`, `book-context-2`).
- **표지 리빌**: 첫 book 구간 진입 시 큰 표지 등장 (0.5초) → 즉시 본문으로
- **텍스트**: 음성 싱크 자막, 핵심 키워드 강조색
- **비주얼**: 생성 이미지 배경 + 자막. 3~4초마다 시각 변화 (줌, 패닝, 텍스트 전환)

> contextMain(감상 배경)이 보통 더 스토리가 강하다. "아리스토텔레스가 직접 교정한 필사본을 베개 밑에 두고 잤다" — 이런 구체적 에피소드가 숫자보다 강력하다.

### 마무리: 로고

본문 마지막 문장이 여운을 남기며 책 이야기를 닫는 즉시, 닫힘 페이즈(0.5초) 동안 배경이 페이드아웃되고 풀스크린 매거진 표지(ShortsThumbnail)가 페이드인된다.

- **본문 마무리**: 마지막 문장은 정보 전달이 아닌 여운. 스토리의 결론이자 감정의 착지점.
- **자동 처리**: 별도 세그먼트 추가 없이 컴포지션이 마지막 세그먼트 종료 시점부터 자동으로 닫힘 → 로고 페이즈를 실행한다.
- **비주얼**: 매거진 레이아웃의 브랜드 로고 + 인물·책·정보 카드.

---

## 비주얼 설계

### 레이아웃 (1080 x 1920)

3단 구조: **HEADER**(타이틀) + **MID**(배경 이미지 + 텍스트 오버레이) + **FOOTER**(safe zone).

- **HEADER** (~388px): `{title} · {nickname}` 고정 표시. 다크 배경.
- **MID** (~1132px): 배경 이미지가 전면 fill. 그 위에 텍스트가 오버레이. 우측에 아바타/포스터 스트립.
- **FOOTER** (400px): 하단 safe zone. 다크 배경.

```
┌─────────────────────────────┐
│     HEADER (388px)           │  ← 타이틀 고정
├─────────────────────────────┤
│                             │
│   배경 이미지 (full-bleed)   │  ← 4장 레이어 교차 표시
│   + 텍스트 오버레이          │  ← 훅/소개/독백/설명
│                             │
│                  [아바타]    │  ← 우측 스트립 (아래 참조)
│                             │
├─────────────────────────────┤
│     FOOTER (400px)           │  ← 하단 safe zone
└─────────────────────────────┘
```

### 우측 스트립 (아바타 ↔ 포스터)

MID 영역 우측에 아바타와 책 포스터가 교차 표시된다.

| 구간 | 표시 | 비고 |
|------|------|------|
| intro 종료 후 ~ book 시작 전 | 아바타 (fade-in) | hook/intro 구간에서는 숨김 |
| book 구간 | 책 포스터 (cross-fade) | 아바타에서 전환 |
| 로고 진입 직전 | fade-out | 스트립 사라짐 |

### Reveal 애니메이션

쇼츠 시작 시 chime 효과음과 함께 fade-in 리빌 연출이 재생된다. hook 텍스트는 리빌 종료 0.6초 전에 등장하여 음성과 겹치도록 설계.

### 배경 이미지 (4장 레이어 시스템)

에피소드 레벨에서 **2종의 폴백 배경**(`revealBg`, `bookBg`) + **세그먼트별 커스텀 이미지**(`seg.image` + `imageChangeAt`)가 통합 cross-fade 시퀀스로 재생된다. 모든 세그먼트(`hook`/`intro`/`celeb-mid`/`book`)가 자체 이미지를 가질 수 있다.

**파일 규칙:**
- **slug**: 에피소드명에서 `-en` 접미사를 제거한 값 (한/영 공유)
- `.gitignore` 포함 (AI 생성 이미지, 로컬 전용)

**구성 필드:**

| 필드 | 위치 | 용도 |
|------|------|------|
| `shorts.revealBg` | shorts root | 기본 배경. 첫 세그먼트 이미지(또는 book 시작) 직전까지 표시 |
| `shorts.bookBg` | shorts root | book 구간 폴백. book 세그먼트에 `seg.image`가 없을 때만 사용 |
| `seg.image` | 모든 visual 세그먼트 (`hook`/`intro`/`book`) | 해당 세그먼트 시작 시 cross-fade 인 |
| `seg.imageChangeAt` | 모든 visual 세그먼트 | 세그먼트 내 추가 전환점 (텍스트 앵커로 보정) |

**레이어 동작:**

1. **revealBg**: 영상 시작부터 표시. 첫 `seg.image`가 등장하는 시점(또는 book 시작 시점)에 fade-out.
2. **통합 imageGroups**: 모든 세그먼트의 `seg.image` + `imageChangeAt`가 시간순 cross-fade 시퀀스로 합쳐진다. book 세그먼트에 image가 없고 `bookBg`가 있으면 가상 그룹으로 자동 포함되어 hook/intro 이미지에서 자연스럽게 cross-fade 된다.
3. 마지막 세그먼트 종료 후 닫힘 페이즈(0.5초) 동안 배경 전체가 페이드아웃되며 풀스크린 매거진 표지로 전환된다.

**이미지 전환 예시 (에피소드 JSON):**

```jsonc
{
  "revealBg": "twin-towers-2001.webp",
  "bookBg": "berlin-wall.png",
  "segments": [
    {
      "id": "hook",
      "visual": "hook",
      "image": "images/shorts/karp-hook.png"   // ← hook 전용 이미지 (NEW)
    },
    {
      "id": "intro",
      "visual": "intro"
      // image 없음 → hook 이미지가 그대로 유지됨
    },
    {
      "id": "book-context",
      "visual": "book",
      "image": "images/shorts/elon-musk-3.png",
      "imageChangeAt": [
        { "t": 15, "image": "images/shorts/elon-musk-4.png", "text": "지구 문명도 언젠가" },
        { "t": 22.89, "image": "images/shorts/elon-musk-2.png", "text": "인류를 다행성 종으로" }
      ]
    }
  ]
}
```

- `image`: 세그먼트 시작 시 표시할 이미지
- `imageChangeAt.t`: 세그먼트 시작 기준 전환 시점 (초)
- `imageChangeAt.text`: 텍스트 앵커 — `3-timings` 실행 시 voiceTimings에서 해당 텍스트 시작 시간으로 `t` 자동 보정

**시각 효과:**
- 레이어 간 cross-fade 전환 (0.3초)
- 셀럽 인용 구간(`role: 'celeb'` / `visual: 'hook'`)에서 배경 명도·채도 자동 감소 (`brightness 0.35, saturate 0.5`)
- 중앙부에 `radial-gradient` 오버레이로 비네팅

### 색상/톤

- 배경: 다크 (#0a0a0a ~ #1a1510), 숏폼 이미지 brightness 18%
- 텍스트: 크림 (#e8e0d0), 골드 강조 (#c8a46e)
- 자막: 흰색 + 검정 그림자 (가독성 최우선)

### 텍스트 크기 (1080px 기준)

코드 상수: `BookRecommendShort.tsx` → `SHORTS` 객체.

| 용도 | 크기 | 코드 키 | 비고 |
|------|------|---------|------|
| 훅 텍스트 (1문장) | 72px | `headline + 4` | 골드, serif, 센터 |
| 훅 텍스트 (2문장) | 52px | `headline - 16` | 크림, sans |
| 셀럽 이름 | 52px | `name` | |
| 메타 (직함/영문명) | 32px | `meta` | subtitle 스타일 |
| 셀럽 인용문 | 58px | `quote` | 골드, serif |
| 나레이터 본문 | 56px | `body` | 크림, sans |
| 캡션/자막 | 56px | `caption` | |

### 전환 스타일

- **컷**: 기본. 깔끔한 페이드 (8~10프레임)
- **줌**: 표지 리빌 시 spring 줌. 느린 줌인은 텍스트 읽는 동안 배경에 적용
- **텍스트 등장**: 문장 단위 페이드인 (Typewriter)
- **글리치/화려한 전환 지양**: 절제된 우아함

---

## 음성 설계

### 역할

| 역할 | 구간 | 음성 |
|------|------|------|
| 해설 | 훅, 인물 소개, 핵심 내용 | Charon (Gemini) |
| 실제 인물 | 검증된 직접 인용 | 인물별 ElevenLabs |

### BGM

- 로파이/앰비언트 계열, 시작부터 끝까지 깔기
- 볼륨: 음성의 15~20%
- 비트 전환 포인트에 장면 전환 맞추기

### 효과음

- 표지 등장: type-reveal 또는 whoosh (짧게, 0.3초)
- 인용문 등장: chime (가볍게)
- 과도한 SFX 지양. 1개 전환에 1개 효과음 원칙

---

## 자막

쇼츠에서 자막은 선택이 아니라 **필수**. 무음 시청자 비율 60%+.

- **음성 싱크 자막**: 모든 나레이션/셀럽 음성에 하단 자막 표시
- **키워드 강조**: 핵심 단어 색상 변경 (골드 #c8a46e)
- **위치**: 하단 Safe Zone 내 (y: 1400~1600px 범위)
- **배경**: 반투명 검정 박스 또는 텍스트 그림자
- 롱폼과 차이: 각 비트 내에서 독립적 자막. 더 크고, 더 대비 강하게

---

## 에피소드 데이터 (ShortsConfig)

세그먼트 배열로 자유롭게 구성. 나레이션이 흐르고 비주얼이 따라간다.

```typescript
interface ShortsConfig {
  featuredBookIndex?: number    // 소개할 책 인덱스 (기본 0)
  segments: ShortSegment[]      // 순서대로 재생
}

interface ShortSegment {
  id: string                    // 음성 파일명: S{nn}-{id}.wav (0-based)
  role: 'narrator' | 'celeb' | 'summary'  // 화자 (summary = 롱폼 Charon 보이스)
  text: string                  // 자막/TTS 텍스트
  visual: 'hook' | 'intro' | 'book'  // 비주얼 유형
  duration?: number             // TTS 생성 후 자동 반영 (초)
  image?: string                // 세그먼트 배경 이미지 (book 전용). 설정 시 slug-2 폴백 비활성
  imageChangeAt?: ImageChange | ImageChange[]  // 세그먼트 내 이미지 전환점
}

interface ImageChange {
  t: number       // 전환 시점 (세그먼트 시작 기준, 초)
  image: string   // 전환할 이미지 경로
  text?: string   // 텍스트 앵커 — 3-timings가 voiceTimings에서 매칭하여 t 자동 보정
}
```

> **타입 원본**: `src/compositions/BookRecommend/types.ts`

---

## 음성 파일 명명

세그먼트는 `S{nn}-{id}.wav`로 합성된다. `nn`은 세그먼트 0-based 순번.

| 쇼츠 구간 | id 예시 | 비고 |
|----------|----------|--------|
| 훅 | `hook` | chime 오버레이 |
| 인트로 | `intro` | 인물명 필수 |
| 대사 (1번째) | `celeb-mid` | ElevenLabs |
| 해설 (1번째) | `book-context` | 나레이터 |
| 대사 (2번째 이상) | `celeb-2`, `celeb-3` … | 페어 추가 시 자동 번호 |
| 해설 (2번째 이상) | `book-context-2`, `book-context-3` … | 페어 추가 시 자동 번호 |

> 본문 페어 수는 자유. 백오피스에서 `+ 인용` / `+ 맥락` 버튼으로 추가하면 id가 자동 부여된다.

---

---

## 차별화 포인트

1. **AI 생성 이미지 배경**: 책의 분위기를 시각화한 배경. 일반 북토크 쇼츠에 없는 요소
2. **셀럽 음성 클론**: ElevenLabs로 셀럽 목소리 재현. 실제 인터뷰처럼 느껴지는 몰입감
3. **다크 모던 브랜딩**: 고급스러운 다크 UI. 일반적인 밝은 북토크와 차별화
4. **데이터 기반 스토리**: "41명의 셀럽이 추천" 같은 통계 활용 가능

---

## 자막 의미 단위 분할 (sub 필드)

voiceTimings의 `sub` 필드로 긴 세그먼트를 자막용 의미 단위로 분할한다.
상세 규칙은 [`voice/tts.md` — 4단계: sub 생성](voice/tts.md#4단계-자막-의미-단위-분할-sub-필드) 참조.

---

## Composition ID

Remotion Studio에서 쇼츠 컴포지션 이름은 다음 패턴을 따른다:

```
{PascalLabel}-{KO|EN}-S-VID
```

- `PascalLabel`: 에피소드 slug를 PascalCase로 변환 (예: `elon-musk` → `ElonMusk`)
- `KO` / `EN`: 로케일
- `S`: Shorts (롱폼은 `L`)
- `VID`: 영상 (썸네일은 `THUMB`)

예: `ElonMusk-KO-S-VID`, `AlexanderTheGreat-EN-S-VID`

> Studio URL: `http://localhost:3002/{CompositionId}`

---

## 제작 워크플로

```
1. 에피소드 JSON에 shorts.segments 작성
   → 훅 → 인트로 → [대사/해설] × N 골격으로 구성 (마무리 로고는 자동)
   → 백오피스 시나리오 뷰에서 `+ 인용`/`+ 맥락`으로 본문 페어 자유 추가

2. 배경 이미지 생성
   → 도입부(훅·인트로·1번째 대사)와 본문 구간별 이미지 분배
   → 각 세그먼트에 image + imageChangeAt 설정
   → text 앵커로 전환점 지정 (voice:align이 t 자동 보정)

3. TTS 생성 (쇼츠 N번)
   → pnpm voice:tts -- --episode <name> --shorts <N> --update-json
   → 부분 합성은 `--only S01-hook,S02-intro,…` 처럼 실제 세그먼트 id로 지정

4. 음성 분석 (쇼츠 N번)
   → python scripts/voice/3-transcribe.py --episode <name> --shorts <N>
   → pnpm voice:align -- --episode <name> --shorts <N> --update-json
   → (imageChangeAt의 text 앵커가 있으면 t 값 자동 보정됨)

5. Remotion 스튜디오에서 프리뷰
   → http://localhost:3002/{PascalLabel}-KO-S-VID

6. 렌더링
   → npx remotion render {PascalLabel}-KO-S-VID --codec h264
```
