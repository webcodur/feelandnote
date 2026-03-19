# 롱폼 제작

## 섹션 순서

```
Brand(4s) → ServiceIntro(인사+실루엣→reveal) → FeaturedQuote(대표명언)
→ HostIntro(셀럽소개+철학) → Bridge → Book×N → [Interlude(10개 초과 시)]
→ Book×M → Recap → Outro(나레이션) → Logo(치임)
```

- 최대 20개 콘텐츠 지원. 10개 초과 시 `Math.ceil(N/2)` 지점에 중간안내(Interlude) 자동 삽입.
- 고대 인물: publishYear가 "기원전"으로 시작하면 "년 집필" 미부착.

### 섹션 상세

- **ServiceIntro**: 어두운 실루엣 아바타 + "?" 오버레이 → 인물 이름 언급 시점(~70%)에 brightness reveal. "서재 탐방" 코너명 + 설명 텍스트.
- **FeaturedQuote**: 셀럽 대표 명언. 아바타 160px + 인용문 중앙 배치. **DB 등록 명언(`celeb_dialogues.lines.quote` 또는 `profiles.quotes`)을 우선 사용한다.**
- **HostIntro**: 좌측 아바타 + 우측 셀럽 소개(Phase 1) → 감상철학(Phase 2) 크로스페이드. 좌상단 라벨 "서재 탐방".
- **Book Gap**: 세로 묶음 — 소형 표지(100×150) + 번호(`N/M`) + 제목. 중앙 배치.
- **Outro → Logo**: 나레이션(outroFrames)과 로고(LOGO_FRAMES=90)가 순차 재생. 치임 SFX는 로고 페이즈에서만.

### Book 내부 화자 전환

인용문·후속맥락은 선택:

```
나레이터(Kore): 제목+저자+년도 (팩트만)
           → TITLE_SUMMARY_GAP →
요약맨(Charon): 핵심 요약
           → SUMMARY_CONTEXT_GAP →
나레이터(Kore): 추천 경위 (3인칭, DB review 기반)
           → CONTEXT_QUOTE_GAP → (직접 인용문이 있을 때만)
셀럽(Puck):     직접 인용문 (검증된 발언만)
           → QUOTE_CONTEXTAFTER_GAP → (후속맥락이 있을 때만)
나레이터(Kore): 후속 맥락
```

---

## 역할 분담

| 역할 | 담당 | 내용 |
|------|------|------|
| 나레이터 | Kore (여성) | 팩트(제목/저자/년도) + 추천 경위(3인칭) + 후속맥락 |
| 요약맨 | Charon (남성) | 책 핵심 요약 |
| 셀럽 | Puck (남성) | 직접 인용문만 (없으면 생략) |

나레이터는 설명하지 않는다. 요약은 요약맨의 역할. 셀럽 음성은 실제 발언 인용에만 사용.

### 말투 규칙

- **인물 소개 (celebIntro)**: 서술체 (`~이다`, `~했다`). 위키백과 톤.
  - 풀네임 ≠ 닉네임: 한 문장으로 편입 (예: "알렉산드로스 3세 메가스, 통칭 알렉산더 대왕은 고대 마케도니아의 왕이자 역사상 가장 위대한 정복자이다.")
  - 풀네임 ≈ 닉네임: 이름 + 마침표 + 설명 (예: "일론 머스크. 테슬라 창업자이자..."). 수식어는 DB 프로필 기반으로 정확하게.
- **주어 규칙** (나레이터·요약맨 파트에만 적용, celebIntro 제외): 모든 문장에 주어가 있어야 한다. 첫 문장 이후 이름을 반복하지 않을 때는 3인칭 대명사(`그는`, `그의`)로 처리한다. 주어 없는 문장 금지. 인물 소개(celebIntro)는 위키백과 서술체이므로 주어 생략 허용.
- **나레이터 · 요약맨** (그 외): 정중체 (`~입니다`, `~합니다`, `~했습니다`). 시청자에게 설명하는 톤.
- **셀럽 (감상철학 · 직접 인용문)**: 해당 인물의 개인 성향에 맞는 말투. speech_tone 참고.
- 아웃트로: 나레이터이므로 정중체.

---

## 타이밍

### 핵심 공식

```ts
const toFrames = (sec: number) => Math.ceil(sec * 30) + 15
```

`+15`는 음성 끝과 다음 섹션 사이 여유 버퍼. 이 공식이 영상·SRT 전체의 싱크 기준이므로 절대 변경하지 않는다.

### 타이밍 상수 (timing.ts)

**섹션 프레임:**
`FPS=30`, `BRAND_FRAMES=120`, `CELEB_VISUAL_DELAY=75`, `TITLE_SUMMARY_GAP=64`, `SUMMARY_CONTEXT_GAP=64`, `CONTEXT_QUOTE_GAP=20`, `QUOTE_CONTEXTAFTER_GAP=20`, `BOOK_GAP=60`, `INTERLUDE_FRAMES=120`, `RECAP_FRAMES=150`, `LOGO_FRAMES=90`

**폴백 프레임** (JSON duration 없을 때):
`CELEB_INTRO_FALLBACK=150`, `BRIDGE_FALLBACK=105`, `OUTRO_FALLBACK=120`

**자막:**
`SENTENCE_BREATH=8` (TTS 문장 간 호흡 보정)

**타이밍 계산은 timing.ts 단일원천.** BookRecommend, BookCardVisual, Overlay, Subtitles가 모두 import.

### Book 타이밍

```ts
summaryPhaseEnd  = toFrames(titleDuration) + TITLE_SUMMARY_GAP + toFrames(summaryDuration)
contextPhaseEnd  = summaryPhaseEnd + SUMMARY_CONTEXT_GAP + toFrames(contextDuration)
quotePhaseEnd    = contextPhaseEnd + CONTEXT_QUOTE_GAP + toFrames(quoteDuration)
bookTotalFrames  = contextAfterDuration
  ? quotePhaseEnd + QUOTE_CONTEXTAFTER_GAP + toFrames(contextAfterDuration)
  : quoteDuration ? quotePhaseEnd : contextPhaseEnd
```

### Visual 모드 라벨 타이밍

visual 모드에서 "핵심 요약" / "추천 경위" 라벨 오디오는 2열 레이아웃 전환과 동기화해야 한다:
```ts
const labelSummaryFrom = visual
  ? summaryAudioStart - LABEL_FRAMES - 4   // 화면 전환 후 재생
  : bt.titleFrames + PRE_LABEL_GAP          // 오디오 모드: 일반 타이밍
```

### 타이밍 함수 구분

- `toFrames()` (+15 버퍼): 섹션 배치(레이아웃)용
- `toAudioFrames()` (버퍼 없음): 자막/하이라이트 분배용
- `SENTENCE_BREATH` (8 프레임): TTS 문장 간 호흡 보정. timing.ts에서 export.
- 이 세 가지를 혼동하면 자막/하이라이트 싱크가 어긋남

---

## 워크플로

### 새 에피소드 제작

1. `episodes/book-recommend/draft/<name>.json` 작성 (기존 JSON 복사 후 수정)
2. 텍스트 검수 완료 후 `episodes/book-recommend/`로 이동 (드래프트 → 프로덕션 승격)
3. `script.ts`에 JSON import + episodes 맵 등록 + `EPISODE_NAME` 변경
4. `pnpm voice -- --episode <name> --update-json` 실행 (duration 자동 반영)
5. `pnpm reboot`으로 프리뷰

### 텍스트 수정

1. `episodes/<name>.json` 수정 (자막 텍스트 + 필요시 tts 오버라이드)
2. `pnpm voice -- --episode <name> --only <파일명> --update-json` 실행
3. web-bo 에디터의 TTS 버튼으로도 가능 (Gemini / Cloud 선택)

### DB → 에피소드 JSON 변환 체크리스트

1. 셀럽 기본 정보: nickname, bio, avatar_url, speech_tone
2. consumption_philosophy → 1인칭 감상철학 재작성 (speech_tone 반영)
3. 콘텐츠 목록: title, creator, thumbnail, review
4. review → summary(책 자체 설명) + context(추천 경위) 분리
5. directQuote: 검증된 직접 인용문만 (사료 출처 명시)
6. stats: celebCount, celebNames (DB 조회)
7. publishYear: 고대 작품은 "기원전 X세기" 형식
8. TTS 오버라이드: 숫자 → 한글, 외래어 발음 조정
9. source: 출처 명시

---

## 참고

### 고대 인물 vs 현대 인물

| 항목 | 현대 인물 | 고대 인물 |
|------|-----------|-----------|
| 출판년도 | "1979" → "년 집필" 자동 | "기원전 8세기" → 별도 처리 |
| 직접 인용문 | 인터뷰 출처 명확 | 고전 사료 경유 |
| 콘텐츠 수 | 3~5권 (선별적) | 8권+ (역사 기록 기반) |
| TTS 숫자 | 아라비아 → 한글 | "기원전" 포함 시 별도 패턴 |

### 콘텐츠 수별 영상 길이 추정

| 콘텐츠 수 | 추정 길이 | 비고 |
|-----------|-----------|------|
| 3권 | ~5분 | 숏폼 |
| 5권 | ~8분 | 표준 |
| 8권 | ~13분 | 롱폼 |
| 10권 | ~16분 | 롱폼 경계 |
| 11~20권 | ~20~35분 | 중간안내(인터루드) 필수 |

### 유사 콘텐츠 차별화

맥락이 유사한 콘텐츠가 연속될 때:
1. **첫 번째**: 공통 맥락을 상세히 설명
2. **두 번째**: 해당 작품만의 고유 연결점 강조
3. **세 번째**: 간결하게 마무리, 전체 맥락 회수

유사 콘텐츠 사이에 다른 콘텐츠를 배치하는 것도 고려.

### BookCardVisual 레이아웃 규칙

- **[헤더+본문]을 하나의 wrapper div로 묶어서 `alignItems: 'center'`로 세로 중앙 배치.** 헤더와 본문의 시작점을 고정하면 긴 텍스트가 하단에서 잘린다.
- 본문 영역의 요약/경위는 `position: absolute` 크로스페이드. 부모에 충분한 `minHeight`(≥580px) 필요.
- 130% 스케일 기준: 포스터 364×546, 제목 히어로 416×624, 본문 27px, 라벨 19px, 인용문 29px.

---

## 장면 배경 이미지

### 개요

Book 섹션의 2열 레이아웃(요약·경위 페이즈)에서 텍스트 뒤에 깔리는 배경 이미지. `BookCardVisual.tsx`가 렌더링한다. 이미지가 없으면 기본 그라디언트 배경만 표시된다.

### 파일 위치 및 네이밍

```
sw/remotion/public/images/{에피소드명}/
  book-{index}-summary.png    ← 요약 페이즈 배경
  book-{index}-context.png    ← 경위 페이즈 배경
```

- `{에피소드명}`: 에피소드 JSON 파일명 (예: `mark-zuckerberg`, `leonardo-da-vinci`)
- `{index}`: 0부터 시작하는 책 순서 (JSON `books` 배열 인덱스)

### 각 책당 필요 이미지

| 파일 | 표시 시점 | 용도 |
|------|-----------|------|
| `book-{i}-summary.png` | 핵심 요약 텍스트 배경 | 책의 내용/주제를 시각적으로 표현 |
| `book-{i}-context.png` | 추천 경위 텍스트 배경 | 셀럽과 책의 관계/맥락을 시각적으로 표현 |

### 필요 이미지 수 계산

```
에피소드당 이미지 수 = 책 수 × 2
```

| 에피소드 | 책 수 | 필요 이미지 |
|----------|-------|------------|
| alexander-the-great | 8 | 16장 |
| leonardo-da-vinci | 6 | 12장 |
| leonardo-da-vinci-2 | 5 | 10장 |
| mark-zuckerberg | 9 | 18장 |

### 이미지 사양

| 항목 | 값 |
|------|-----|
| 해상도 | 1920×1080 이상 권장 (영상 해상도와 동일) |
| 포맷 | PNG |
| 비율 | 16:9 (영상 우측 60% 영역에 `objectFit: cover`로 채움) |
| 스타일 | 책 내용/맥락에 맞는 사실적·역사적 이미지 |

### 렌더링 방식

이미지는 `BookCardVisual.tsx`에서 다음 처리를 거쳐 표시된다:

1. `brightness(0.2) saturate(0.7)` 필터 → 어둡고 채도 낮게
2. `radial-gradient` 비네팅 오버레이
3. `rgba(10,10,10,0.55)` 반투명 배경
4. 그 위에 텍스트 렌더링

**따라서 이미지 자체가 밝고 선명해도 무방하다.** 필터가 자동으로 어둡게 처리한다. 오히려 너무 어두운 이미지는 배경이 완전히 검게 보일 수 있다.

### 이미지 없을 때

이미지 파일이 없으면 기본 `radial-gradient` 배경만 표시된다. 에러는 발생하지 않는다.

### 프롬프트 작성 가이드

- **summary 이미지**: 책의 핵심 주제/내용을 시각화. 예) 아이네이스 → 고대 로마 함선, 지중해 항해
- **context 이미지**: 셀럽이 그 책과 만난 맥락을 시각화. 예) 아이네이스 context → 고등학교 교실, 라틴어 교과서
- Neo-Pantheon 다크 테마를 강제하지 않는다. **객관적, 사실적, 역사적 스타일**로 생성한다.
- 텍스트, 로고, 워터마크가 포함되지 않도록 한다.
