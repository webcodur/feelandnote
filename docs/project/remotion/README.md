# 서재 탐방 — Remotion 영상 제작 가이드

셀럽의 추천 도서를 소개하는 영상 시리즈. Remotion(React 기반 영상 프레임워크)으로 제작한다.

## 목차

| 장 | 문서 | 내용 |
|----|------|------|
| 1 | 이 문서 | 개요, 코드 구조, 데이터 흐름 |
| 2 | [longform.md](longform.md) | 롱폼 — 섹션 구성, 역할, 타이밍, 워크플로 |
| 3 | [shorts.md](shorts.md) | 쇼츠 — 4비트 구조, 비주얼, 음성 |
| 4 | [tts.md](tts.md) | 음성 생성 — 엔진, 보이스, 커맨드, web-bo 통합 |
| 5 | [lineup.md](lineup.md) | 편성 — 인물 선정, 라이벌 묶음, 정치 균형 |
| 6 | [rules.md](rules.md) | 불변 규칙 — 윤리, 데이터 흐름, 개발 주의사항, 체크리스트 |

---

## 코드 구조

```
sw/remotion/
  episodes/<name>.json          ← 에피소드 데이터 (SSoT)
  scripts/generate-voice.ts     ← TTS 생성 스크립트
  scripts/dev.mjs               ← 개발 서버 + 정적 파일 서버
  src/
    Root.tsx                    ← Remotion 등록 (Composition)
    compositions/
      BookRecommend/            ← 롱폼 메인
        script.ts               ← 에피소드 로더 (JSON → currentEpisode)
        timing.ts               ← 타이밍 상수 + 계산 (단일원천)
        types.ts                ← 타입 정의
        BookRecommend.tsx       ← 롱폼 컴포지션
        BookRecommendShort.tsx  ← 쇼츠 컴포지션
        BookCard.tsx            ← 책 오디오 모드
        BookCardVisual.tsx      ← 책 비주얼 모드 (2열 레이아웃)
        BrandIntro.tsx          ← 브랜드 인트로
        HostIntro.tsx           ← 셀럽 소개 + 감상철학
        BookRecap.tsx           ← 리캡
        Overlay.tsx             ← 자막 + 타이밍 오버레이
        Subtitles.tsx           ← 롱폼 자막
        KoreanTypewriter.tsx    ← 타이프라이터 효과
        utils.ts                ← 공용 유틸 (sf, makeVf, BrandLogo, safeImg, fadeInOut)
        fonts.ts                ← 폰트 로딩
      ServiceIntro/             ← 서비스 소개 영상 (별도)
  public/
    voice/<episode-name>/       ← 생성된 음성 파일
    images/                     ← 셀럽 아바타, 표지 등
```

## 단일원천 (SSoT) 데이터 흐름

```
episodes/<name>.json (자막 텍스트 + TTS 오버라이드 + duration)
    ↓
script.ts (JSON import → currentEpisode export)
    ↓
generate-voice.ts  →  tts 오버라이드 우선, 없으면 기본 텍스트
    ↓                  --update-json 시 duration을 JSON에 역반영
timing.ts (타이밍 상수 + 계산 함수)
    ↓
BookRecommend.tsx, BookCardVisual.tsx, Overlay.tsx (모두 timing.ts import)
```

- **에피소드 JSON이 SSoT.** duration, 자막 텍스트, TTS 오버라이드 모두 여기에.
- **timing.ts가 타이밍 SSoT.** `toFrames`(배치용, +15 버퍼) / `toAudioFrames`(자막용, 버퍼 없음).
- **script.ts가 에피소드 로더.** `EPISODE_NAME` 변경으로 에피소드 전환.

## 에피소드 데이터 — BookEntry

| 필드 | 용도 |
|------|------|
| `summary` | 요약맨: 핵심 요약 |
| `summaryDuration` | 요약맨 음성 길이 (초) |
| `context` | 나레이터: 추천 경위 (3인칭) |
| `contextDuration` | 경위 음성 길이 (초) |
| `directQuote` | 셀럽 직접 인용문 (optional) |
| `quoteDuration` | 인용문 음성 길이 (optional) |
| `contextAfter` | 나레이터: 후속 맥락 (optional) |
| `contextAfterDuration` | 후속 맥락 음성 길이 (optional) |
| `oneLiner` | 리캡용 한줄 요약 |
| `stats` | DB 통계 (celebCount, celebNames, publisher 등) |
| `titleDuration` | 제목+저자 음성 길이 (초) |

## 음성 파일 구조

```
public/voice/<episode-name>/
  service-intro.wav, featured-quote.wav
  label-summary.wav, label-context.wav       ← 공용 라벨 (에피소드별 생성)
  narrator-celeb-intro.wav, philosophy.wav, narrator-outro.wav
  book-0-title.wav, book-0-summary.wav, book-0-context.wav
  book-0-quote.wav, book-0-context-after.wav
  ...
```

## 윤리 원칙

- **셀럽 음성(Puck/ElevenLabs)은 검증된 직접 인용문에만 사용한다.** AI가 창작한 1인칭 발언을 셀럽 목소리로 읽지 않는다.
- 추천 경위(context)는 나레이터가 3인칭으로 전달한다. 출처(인터뷰, 기사 등)를 명시한다.
- 직접 인용문이 없는 책은 quote 단계를 건너뛴다.
