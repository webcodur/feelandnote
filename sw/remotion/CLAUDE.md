# Remotion — BookRecommend 영상 제작 룰북

## 아키텍처

셀럽의 추천 도서를 소개하는 영상. 섹션 순서:

```
Brand(4s) → HostIntro(셀럽소개+철학) → Bridge → Book×N → Recap → Outro
```

각 Book 내부 3단계 화자 전환 (인용문은 선택):
```
나레이터(Kore): 제목+저자+년도 (팩트만)
           → TITLE_SUMMARY_GAP →
요약맨(Charon): 핵심 요약
           → SUMMARY_CONTEXT_GAP →
나레이터(Kore): 추천 경위 (3인칭, DB review 기반)
           → CONTEXT_QUOTE_GAP → (직접 인용문이 있을 때만)
셀럽(Puck):     직접 인용문 (검증된 발언만)
```

- 타이밍 상수: `FPS=30`, `BRAND_FRAMES=120`, `CELEB_VISUAL_DELAY=75`, `TITLE_SUMMARY_GAP=25`, `SUMMARY_CONTEXT_GAP=25`, `CONTEXT_QUOTE_GAP=20`, `BOOK_GAP=60`, `RECAP_FRAMES=150`
- **모든 컴포넌트가 동일한 타이밍 공식을 독립적으로 계산한다** (BookRecommend, Overlay, Subtitles 각각). 상수 변경 시 세 곳 모두 반영 필수.

## 윤리 원칙

- **셀럽 음성(Puck)은 검증된 직접 인용문에만 사용한다.** AI가 창작한 1인칭 발언을 셀럽 목소리로 읽지 않는다.
- 추천 경위(context)는 나레이터가 3인칭으로 전달한다. 출처(인터뷰, 기사 등)를 명시한다.
- 직접 인용문이 없는 책은 quote 단계를 건너뛴다 (3단계로 끝남).

## 역할 분담

| 역할 | 담당 | 내용 |
|------|------|------|
| 나레이터 | Kore (여성) | 팩트(제목/저자/년도) + 추천 경위(3인칭) |
| 요약맨 | Charon (남성) | 책 핵심 요약 |
| 셀럽 | Puck (남성) | 직접 인용문만 (없으면 생략) |

나레이터는 설명하지 않는다. 요약은 요약맨의 역할. 셀럽 음성은 실제 발언 인용에만 사용.

## 타이밍 공식

```ts
const toFrames = (sec: number) => Math.ceil(sec * 30) + 15
```

`+15`는 음성 끝과 다음 섹션 사이 여유 버퍼. 이 공식이 영상·자막·SRT 전체의 싱크 기준이므로 절대 변경하지 않는다.

### Book 타이밍

```ts
summaryPhaseEnd  = toFrames(titleDuration) + TITLE_SUMMARY_GAP + toFrames(summaryDuration)
contextPhaseEnd  = summaryPhaseEnd + SUMMARY_CONTEXT_GAP + toFrames(contextDuration)
bookTotalFrames  = quoteDuration
  ? contextPhaseEnd + CONTEXT_QUOTE_GAP + toFrames(quoteDuration)
  : contextPhaseEnd
```

## TTS — Gemini 2.5 Flash TTS

### 핵심 특성
- **LLM 기반 TTS라 입력 텍스트를 변조할 수 있다.** 생성 후 반드시 들어보고 자막과 대조해야 한다.
- 출력: PCM 24kHz 16bit mono → WAV 저장

### 음성 3종
| 역할 | 보이스 | 성별 | 색상 코드 |
|------|--------|------|-----------|
| 나레이터 | `Kore` | 여성 | `#888` (회색) |
| 요약맨 | `Charon` | 남성 | `#8bb8a8` (민트) |
| 셀럽 | `Puck` | 남성 | `#c8a46e` (골드) |

### 텍스트 작성 규칙
- 제목+저자+년도: `'히치하이커 안내서, 더글러스 애덤스, 1979'` — 쉼표 구분, 마침표 없음
- 요약/경위: 마침표로 문장 구분. 자연스러운 호흡을 위해 한 문장이 너무 길지 않게.
- 직접 인용문: 원문 그대로. 짧은 문장.
- SSML 미지원. 순수 텍스트만 전달.

### API 키 로테이션
- 무료 티어: 키당 10회/일. `.env`에 `GOOGLE_GENAI_API_KEY1` ~ `GOOGLE_GENAI_API_KEY19` 등록.
- `generate-voice.mjs`가 429 에러 시 자동으로 다음 키로 전환.

## 데이터 흐름

```
generate-voice.mjs (TTS 텍스트 + 음성 생성)
    ↓ duration 출력
script.ts (duration 값 + 자막용 텍스트)
    ↓
BookRecommend.tsx (오디오 재생 타이밍)
BookCard.tsx      (3단계 화자 전환 시각)
Subtitles.tsx     (자막 표시 타이밍)
Overlay.tsx       (진행도 바 타이밍)
```

- `script.ts`의 텍스트와 `generate-voice.mjs`의 텍스트가 **반드시 일치**해야 한다. 한쪽만 수정하면 자막 불일치.

## 자막 (Subtitles.tsx)

- 문장 단위 분할: `.?!` 기준 split 후 글자 수 비례로 프레임 배분
- 화자 4종: 나레이터(회색) / 요약(민트) / 셀럽(골드)
- 리캡 구간은 자막 없음 (cursor만 이동)

## 한글 경로 우회

Remotion `staticFile()`이 한글 경로에서 동작하지 않는다. 별도 정적 서버로 우회:

```bash
npx serve public -p 3005 --cors
```

`sf()` 헬퍼가 `http://localhost:3005/{path}?v=${Date.now()}` 반환. 캐시 버스터 포함.

## BookEntry 데이터

| 필드 | 용도 |
|------|------|
| `summary` | 요약맨: 핵심 요약 |
| `summaryDuration` | 요약맨 음성 길이 (초) |
| `context` | 나레이터: 추천 경위 (3인칭) |
| `contextDuration` | 경위 음성 길이 (초) |
| `directQuote` | 셀럽 직접 인용문 (optional) |
| `quoteDuration` | 인용문 음성 길이 (optional) |
| `oneLiner` | 리캡용 한줄 요약 |
| `stats` | DB에서 가져온 통계 (celebCount, celebNames, publisher 등) |
| `titleDuration` | 제목+저자 음성 길이 (초) |

## 영상 제작 워크플로

1. `generate-voice.mjs` 텍스트 작성 → 실행 → WAV + duration 확인
2. **음성 청취 후 자막 텍스트와 대조** (Gemini TTS 변조 가능성)
3. `script.ts`에 duration 반영 + 텍스트 동기화
4. Remotion Studio에서 프리뷰 (`npx remotion studio`)
5. 셀럽 추천 통계는 Supabase에서 조회 (`celeb_tier IS NOT NULL`로 셀럽 판별)
