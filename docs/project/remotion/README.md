# 서재 탐방 — Remotion 영상 제작 가이드

셀럽의 추천 도서를 소개하는 영상 시리즈. Remotion(React 기반 영상 프레임워크)으로 제작한다.

## 목차

| 장 | 문서 | 내용 |
|----|------|------|
| 1 | 이 문서 | 개요, 코드 구조, 데이터 흐름, **에피소드 제작 절차** |
| 2 | [longform.md](longform.md) | 롱폼 — 섹션 구성, 역할·말투, 타이밍, 워크플로 |
| 3 | [shorts.md](shorts.md) | 쇼츠 — 4비트 구조, 비주얼, 음성, 자막 |
| 4 | [voice/tts.md](voice/tts.md) | 음성 생성 — 엔진, 보이스, 커맨드 |
| 4b | [voice/actors.md](voice/actors.md) | 보이스 배정 — Gemini TTS 목록, 셀럽별 매핑 |
| 4c | [voice/timing-user.md](voice/timing-user.md) | 음성 타이밍 사용 가이드 — 갭 기반 파이프라인 |
| 5 | [lineup.md](lineup.md) | 편성표 — 배포 순서, 제작 진행 현황 |
| 5b | [candidates.md](candidates.md) | 후보 전략 — 라이벌 묶음, 정치 교차 |
| 5c | candidates-raw.md | 후보 전체 리스트 (DB 자동 생성, git 미추적) |
| 6 | [rules.md](rules.md) | 불변 규칙 — 윤리, 데이터 흐름, 개발 주의사항 |
| 7 | [render.md](render.md) | 렌더 출력 — 명령어, 파일명 규칙, 코덱 옵션 |
| — | [celeb-profile.md](celeb-profile.md) | 인물 열전 시리즈 기획서 (별도 시리즈) |

---

## 코드 구조

```
sw/remotion/
  episodes/<name>.json          ← 에피소드 데이터 (SSoT, 컴포지션 완료)
  episodes/<name>/candidates/    ← Candidate 에피소드 (Lineup 승격 전)
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
        Typewriter.tsx    ← 타이프라이터 효과
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
public/voice/common/
  A1-service-greeting.wav                    ← 공유 (한국어)
  C1-label-summary.wav                       ← 공유 (한국어)
  C2-label-context.wav                       ← 공유 (한국어)

public/voice/<episode-name>/gemini/          ← 기본 엔진
  A2-service-intro.wav, A3-featured-quote.wav
  B1-celeb-intro.wav, B2-philosophy.wav, E1-outro.wav
  D01a-title.wav, D01b-summary.wav, D01c-context.wav
  D01d-quote.wav, D01e-context-after.wav
  S01-intro.wav, S02-celeb-mid.wav, S03-book-context.wav  ← 쇼츠
  ...
```

## 새 에피소드 제작 절차

에피소드 JSON 생성의 단일 참조 경로. 각 단계의 상세 기준은 링크 문서에서 확인한다.

### 단계별 체크

| 단계 | 작업 | 참조 |
|------|------|------|
| 1 | **편성 확인** — 순서·라이벌 묶음·분량(10권↓단일, 11~20권 2편, 20권↑선별) | [lineup.md](lineup.md) § 편성 원칙·제작 규칙 |
| 2 | **DB 데이터 수집** — 프로필·명언·콘텐츠·통계·페르소나 | 아래 DB 소스 표 |
| 3 | **JSON 초안** — `candidates/<name>.json` 작성 (기존 JSON 복사 후 수정) | [longform.md](longform.md) § DB→JSON 변환 체크리스트 |
| 4 | **텍스트 검수** — 주어 규칙·말투·oneLiner 7~15자·진부 표현 제거 | [longform.md](longform.md) § 말투 규칙, [lineup.md](lineup.md) § 품질 |
| 5 | **표지 다운로드** — 외부 URL → `public/covers/cover-NNN.jpg` | [rules.md](rules.md) § 표지 이미지 |
| 6 | **보이스 배정** — ElevenLabs(`voice_id_ko`) 또는 Gemini 배정 | [voice/actors.md](voice/actors.md), [lineup.md](lineup.md) § 보이스 |
| 7 | **Lineup 승격** — `candidates/` → `episodes/book-recommend/`, `script.ts` 등록 | — |
| 8 | **TTS 생성** — `pnpm voice -- --episode <name> --update-json` | [voice/tts.md](voice/tts.md) |
| 9 | **프리뷰** — `pnpm reboot` | — |

### DB 소스 (2단계)

| 데이터 | 테이블 | 주요 필드 |
|--------|--------|-----------|
| 기본 정보 | `profiles` | nickname, nickname_en, bio, avatar_url, speech_tone |
| 명언 (SSoT) | `celeb_dialogues` | lines→quote |
| 콘텐츠 목록 | `user_contents` → `contents` → `content_locales` | title, creator, thumbnail_url, review |
| celebCount | `user_contents` 집계 | content_id별 추천 셀럽 수 |
| 페르소나 | `celeb_persona` | persona (philosophy 작성 참고) |

---

## 윤리 원칙

- **셀럽 음성(Puck/ElevenLabs)은 검증된 직접 인용문에만 사용한다.** AI가 창작한 1인칭 발언을 셀럽 목소리로 읽지 않는다.
- 추천 경위(context)는 나레이터가 3인칭으로 전달한다. 출처(인터뷰, 기사 등)를 명시한다.
- 직접 인용문이 없는 책은 quote 단계를 건너뛴다.
