---
name: episode-translate
description: ko 에피소드(ko.json)를 영문 번역하여 en.json을 생성/갱신한다. 롱폼(narrator, host, books)과 쇼츠(shorts.segments) 텍스트를 번역하고, 구조·메타데이터·이미지는 보존한다. /episode-translate <에피소드명> 으로 실행.
---

# 에피소드 번역 (ko → en)

ko.json의 모든 텍스트를 영문 번역하여 en.json을 생성하거나 갱신한다.

## 실행

```
/episode-translate <에피소드명>
```

예: `/episode-translate alexander-the-great`

## 전제 조건

- ko.json이 존재해야 한다
- en.json이 이미 있으면 갱신, 없으면 신규 생성

## 파일 위치

```
sw/remotion/public/episodes/{done|live|todo}/{name}/ko.json  ← 소스
sw/remotion/public/episodes/{done|live|todo}/{name}/en.json  ← 타겟
```

done → live → todo 순서로 탐색한다.

## 번역 대상 필드

### 1. host (인물)

| 필드 | 설명 | 번역 방식 |
|------|------|-----------|
| `bio` | 인물 소개 | 자연스러운 영문으로 번역 |
| `title` | 수식어 (예: "마케도니아의 정복자") | 간결한 영문 타이틀 |
| `featuredQuote` | 대표 명언 | 공식 영문 번역이 있으면 사용, 없으면 번역 |
| `philosophy` | 감상 철학 (셀럽 1인칭 나레이션) | 1인칭 영문 나레이션. 원문의 문체·리듬 유지 |

번역하지 않는 필드: `nickname`, `nickname_en` (이미 양쪽 존재), `avatar_url`, `speech_tone`, `elevenlabsVoiceId`, duration 필드들

### 2. narrator (나레이터)

| 필드 | 설명 | 번역 방식 |
|------|------|-----------|
| `serviceGreeting` | 서비스 인사 | 고정 문구: "Welcome to the Feelandnote Library Tour." |
| `serviceIntro` | 오늘의 인물 소개 | 자연스러운 영문 |
| `celebIntro` | 인물 소개 나레이션 | 나레이터 톤의 영문. 문장 수를 ko와 최대한 맞춤 |
| `bridge` | 브릿지 | 자연스러운 영문 |
| `outro` | 아웃트로 | 자연스러운 영문 |

번역하지 않는 필드: duration 필드들, `serviceGreetingParts`

### 3. books[] (책 목록)

각 book에 대해:

| 필드 | 설명 | 번역 방식 |
|------|------|-----------|
| `title` | 책 제목 | 공식 영문 제목 사용 (위키피디아/공식 번역) |
| `creator` | 저자 | 영문 이름 |
| `summary` | 핵심 요약 | 나레이터 톤 영문. 문장 수를 ko와 맞춤 |
| `context` | 추천 경위 | 나레이터 톤 영문. ko의 모든 에피소드/일화를 빠짐없이 포함 |
| `contextAfter` | 후속 맥락 (옵션) | 동일 |
| `directQuote` | 직접 인용 (옵션) | 원문 영문 번역 (출처가 있으면 공식 번역 사용) |
| `directQuoteSource` | 인용 출처 | 영문 표기 |

번역하지 않는 필드: `thumbnail_url`, `source`, `stats`, `titleDuration`, `summaryDuration`, `contextDuration` 등 duration 필드들, `images` (이미지 동기화는 /image-anchor-sync 스킬로 별도 처리)

### 4. shorts.segments[] (쇼츠)

각 segment의 `text` 필드를 번역한다:

| visual | role | 번역 방식 |
|--------|------|-----------|
| hook | narrator | 임팩트 있는 영문. 마침표 기준 두 문장 구조 유지 (ShortVisual에서 위/아래 분할) |
| intro | narrator | 자연스러운 영문 |
| intro | celeb | 1인칭 셀럽 톤 영문 |
| book | narrator/summary | 나레이터 톤 영문. ko의 이미지 전환점(imageChangeAt.text)에 해당하는 내용이 동일 위치에 오도록 문장 배치 |
| cta | narrator | CTA 톤 영문 |

번역하지 않는 필드: `id`, `role`, `visual`, `duration`, `image`, `imageChangeAt` (이미지 동기화는 별도)

### 5. tts (TTS 오버라이드)

ko의 `tts` 구조를 복사하되, 영문에서 발음 오버라이드가 필요한 경우만 설정한다. 대부분의 경우 en에서는 tts 오버라이드가 불필요하다.

## 번역 규칙

### 문체

- **나레이터**: 다큐멘터리 나레이션 톤. 격식체, 명확하고 유려한 문장
- **셀럽 (1인칭)**: 해당 인물의 어투 반영. ko의 문체 뉘앙스를 영문으로 재현
- **요약맨(summary)**: 차분하고 설명적인 톤

### 구조 보존

- ko의 문장 수를 가능한 맞춘다. 영상에서 voiceTimings 매핑이 문장 단위이므로, 문장 수가 크게 달라지면 타이밍 불일치 발생
- ko의 `contextAfter`가 있으면 en에도 반드시 포함. 축약/생략 금지
- 고유명사(인명, 지명, 작품명)는 정확한 영문 표기 사용

### 금지사항

- duration, voiceTimings 등 음성 관련 필드를 건드리지 않는다
- images, imageChangeAt 등 이미지 관련 필드를 건드리지 않는다
- id, role, visual 등 구조 필드를 변경하지 않는다

## 워크플로우

### 1. ko.json 로드

에피소드 디렉토리에서 ko.json을 읽는다.

### 2. en.json 존재 확인

- 있으면: 기존 en.json을 로드하여 텍스트 필드만 갱신
- 없으면: ko.json을 복사하여 기본 구조 생성 후 텍스트 번역

### 3. 번역 실행

위 필드 목록에 따라 순서대로 번역한다. 각 필드 번역 시 ko 원문을 함께 출력하여 검수 가능하게 한다.

### 4. 저장

en.json에 `locale: "en"` 설정 후 저장.

### 5. 후속 안내

저장 후 안내:
```
번역 완료. 후속 작업:
1. 이미지 동기화: /image-anchor-sync <에피소드명>
2. TTS 생성: pnpm voice -- --episode <에피소드명>-en --update-json
3. WhisperX: python scripts/voice/whisper-words.py --episode <에피소드명>-en
4. 타이밍 동기화: pnpm analyze -- --episode <에피소드명>-en --update-json
```

## 검증 출력

```
=== host ===
  bio: (50자 미리보기)
  philosophy: (50자 미리보기)
  featuredQuote: (전문)

=== narrator ===
  serviceGreeting: Welcome to the Feelandnote Library Tour.
  celebIntro: (50자 미리보기) [ko N문장 → en N문장]

=== books (N권) ===
  Book 1: 일리아스 → The Iliad
    summary: [ko N문장 → en N문장]
    context: [ko N문장 → en N문장]
    contextAfter: [ko N문장 → en N문장]
  ...

=== shorts (N세그먼트) ===
  #1 hook: (50자 미리보기)
  #4 book-context: (50자 미리보기) [ko N문장 → en N문장]
  ...
```
