# 롱폼 제작

## 섹션 순서

```
Brand(2.5s) → ServiceGreeting(고정 인사 ~2s) → FeaturedQuote(대표명언)
→ HostIntro(셀럽소개+철학) → Bridge
→ Book×N → [Interlude(10개 초과 시)] → Book×M → Recap → Outro(나레이션) → Logo(치임)
```

- 최대 20개 콘텐츠 지원. 10개 초과 시 `Math.ceil(N/2)` 지점에 중간안내(Interlude) 자동 삽입.
- 고대 인물: publishYear가 "기원전"으로 시작하면 "년 집필" 미부착.

### 섹션 상세

- **ServiceGreeting**: 고정 인사 — "안녕하세요, feelandnote 서재 탐방 시간입니다." (ko) / "Welcome to the Feelandnote Library Tour." (en). 모든 에피소드 동일 텍스트, 공용 오디오(`voice/common/A1-service-greeting.wav`).
- **FeaturedQuote**: 셀럽 대표 명언. 아바타 160px + 인용문 중앙 배치. **DB 등록 명언(`celeb_dialogues.lines.quote` 또는 `profiles.quotes`)을 우선 사용한다.**
- **HostIntro**: 좌측 아바타 + 우측 셀럽 소개(Phase 1) → 감상철학(Phase 2) 크로스페이드. 좌상단 라벨 "서재 탐방".
- **Book Gap**: 세로 묶음 — 소형 표지(100×150) + 번호(`N/M`) + 제목. 중앙 배치.
- **Outro → Logo**: 나레이션(outroFrames)과 로고(LOGO_FRAMES=90)가 순차 재생. 치임 SFX는 로고 페이즈에서만.

### Book 내부 화자 전환

인용문·후속맥락은 선택. category가 BOOK이 아닌 항목(VIDEO, GAME, MUSIC)은 포스터 우상단에 아이콘 뱃지, 타이틀 영역에 카테고리명이 표시된다 (BOOK은 표시 없음).

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

### 말투·텍스트 규칙

말투, 주어, 연결어, 텍스트 금기 등 글쓰기 품질 규칙은 **[writer/0-draft.md](writer/0-draft.md)**에서 관리한다.

---

## 타이밍

### 핵심 공식

```ts
const toFrames = (sec: number) => Math.ceil(sec * 30) + 15
```

`+15`는 음성 끝과 다음 섹션 사이 여유 버퍼. 이 공식이 영상·SRT 전체의 싱크 기준이므로 절대 변경하지 않는다.

### 타이밍 상수 (timing.ts)

**섹션 프레임:**
`FPS=60`, `BRAND_FRAMES=150`, `CELEB_VISUAL_DELAY=75`, `TITLE_SUMMARY_GAP=64`, `SUMMARY_CONTEXT_GAP=64`, `CONTEXT_QUOTE_GAP=20`, `QUOTE_CONTEXTAFTER_GAP=20`, `BOOK_GAP=60`, `INTERLUDE_FRAMES=120`, `RECAP_FRAMES=150`, `LOGO_FRAMES=90`

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

### 텍스트 하이라이팅 (Typewriter)

본문 텍스트를 화면에 상시 표시하면서, 현재 읽히는 문장만 밝게 하이라이트한다. voiceTimings가 있으면 음성 타이밍 기반, 없으면 균등 분배 폴백.

**동작:** voiceTimings `start/end`(초) → `Math.round(t.start * FPS)` 프레임으로 변환. `elapsed = frame - startFrame`과 비교하여 문장별 opacity 전환.

**멀티페이지:** 긴 텍스트(192자 초과)는 문장 단위 페이지 분할. voiceTimings도 페이지에 해당하는 문장만 슬라이스하여 전달 (`slicePageTimings`). 페이지 전환 시점도 voiceTimings 기반.

**StudioSubtitles:** voiceTimings 있으면 동일 문장 단위로 자막 표시 (추가 분할/병합 없음). 없으면 비율 기반 + 짧은 문장 병합/긴 문장 분할.

---

## 워크플로

### 새 에피소드 제작

1. `episodes/book-recommend/candidates/<name>.json` 작성 (기존 JSON 복사 후 수정)
2. 텍스트 검수 완료 후 `episodes/book-recommend/`로 이동 (Candidate → Lineup 승격)
3. `script.ts`에 JSON import + episodes 맵 등록 + `EPISODE_NAME` 변경
4. `pnpm voice -- --episode <name> --update-json` 실행 (duration 자동 반영)
5. `pnpm reboot`으로 프리뷰

### 텍스트 수정

1. `episodes/<name>.json` 수정 (자막 텍스트 + 필요시 tts 오버라이드)
2. `pnpm voice -- --episode <name> --only <파일명> --update-json` 실행
3. web-bo 에디터의 TTS 버튼으로도 가능 (Gemini / Cloud 선택)

### DB → 에피소드 JSON 변환 체크리스트

DB 소스 매핑과 필드별 작성 기준은 **[writer/0-draft.md](writer/0-draft.md)** 참조. 아래는 JSON 변환 시 기술적 체크.

1. consumption_philosophy → 1인칭 감상철학 재작성 (speech_tone 반영)
2. **category**: DB `contents.type`이 BOOK이 아닌 항목은 `"category": "VIDEO"` 등 필수 추가
3. stats: celebCount, celebNames (DB 조회)
4. publishYear: 고대 작품은 "기원전 X세기" 형식
5. TTS 오버라이드: 숫자 → 한글, 외래어 발음 조정
6. **표지 이미지**: 한영 양쪽 `content_locales`에 유효한 `thumbnail_url` 필수. 외부 URL은 `public/covers/`에 로컬 다운로드

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
- 150% 스케일 기준: 포스터 440×660(중앙정렬), 제목 히어로 520×780, 본문 38px, 라벨 36px, 인용문 42px.

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
| leonardo-da-vinci | 10 | 20장 |
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

