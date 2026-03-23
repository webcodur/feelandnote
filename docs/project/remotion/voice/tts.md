# 음성 생성 (TTS)

## 핵심 특성

- **LLM 기반 TTS(Gemini)는 입력 텍스트를 변조할 수 있다.** 생성 후 반드시 들어보고 자막과 대조해야 한다.
- 출력: PCM 24kHz 16bit mono → WAV 저장

## 음성 역할

| 역할 | Gemini 보이스 | Cloud TTS | ElevenLabs | 성별 | 색상 코드 |
|------|---------------|-----------|-----------|------|-----------|
| 나레이터 | `Kore` | `Neural2-A` | — | 여성 | `#888` (회색) |
| 요약맨 | `Charon` | `Neural2-C` | — | 남성 | `#8bb8a8` (민트) |
| 셀럽 | `Puck` (기본) | `Neural2-B` | `elevenlabsVoiceId` | 남성 | `#c8a46e` (골드) |

### 셀럽 보이스 오버라이드

에피소드 JSON의 `host.geminiVoice`로 Gemini 셀럽 보이스를 인물별로 지정할 수 있다.
전체 보이스 목록과 배정 현황은 [`actors.md`](actors.md) 참조.

```json
{ "host": { "geminiVoice": "Orus" } }
```

### 셀럽 보이스 스타일 지시 (voiceStyle)

Gemini TTS는 보이스가 음색만 결정하고 어조·감정·속도는 텍스트 프롬프트로 제어한다. `host.voiceStyle`을 지정하면 셀럽 역할(`celeb`) 음성 생성 시 텍스트 앞에 지시가 자동 삽입된다.

```json
{ "host": { "voiceStyle": "무게감 있는 목소리로, 권위적이고 위엄 있는 어조로, 빠른 속도로 말한다" } }
```

**주의사항:**
- "천천히", "무게감 있게" 등의 지시는 속도를 크게 늦출 수 있다. "빠른 속도로" 등 속도 지시를 함께 사용하여 균형을 맞춘다.
- ElevenLabs 엔진에는 적용되지 않는다 (커스텀 보이스 자체에 캐릭터 내장).
- 인물별 voiceStyle 배정 현황은 [`actors.md`](actors.md) 참조.

## 엔진 선택

| 엔진 | 플래그 | 비고 |
|------|--------|------|
| Gemini Flash TTS | `--engine gemini` (기본) | LLM 기반, 변조 가능. 키당 10회/일 |
| Google Cloud TTS | `--engine cloud` | Neural2 월 100만자. 안정적, 변조 없음 |
| ElevenLabs | `--engine elevenlabs` | 인물별 커스텀 보이스. **명시적 지정 시에만 사용** |

- **ElevenLabs는 `--engine elevenlabs` 명시 시에만 동작한다.** 자동 호출 없음.
- ElevenLabs 모델: `eleven_multilingual_v2`, 출력: `pcm_24000`
- `.env`에 `ELEVENLABS_API_KEY` 필요

## 공통 음성

에피소드마다 동일한 음성은 `public/voice/common/`에 1회 생성하여 재사용한다.
`generate-voice.ts`가 자동으로 건너뛰고, `makeVf`가 `voice/common/` 경로로 해소한다.

| 파일 | 텍스트 |
|------|--------|
| `A1-service-greeting.wav` | "feelandnote 서재 탐방 코너에서는..." |
| `C1-label-summary.wav` | "핵심 요약" |
| `C2-label-context.wav` | "추천 및 감상경위" |

## 텍스트 작성 규칙

- 제목+저자+년도: `'히치하이커 안내서, 더글러스 애덤스, 천구백칠십구 년 집필'` — 쉼표 구분, 마침표 없음. **연도는 한글 + "년 집필"** 형태로 TTS 전달.
- 화면 표시(script.ts): `publishYear: '1979'` → BookCard가 자동으로 `1979년 집필` 표시.
- 요약/경위: 마침표로 문장 구분. 자연스러운 호흡을 위해 한 문장이 너무 길지 않게.
- 직접 인용문: 원문 그대로. 짧은 문장.
- 숫자: TTS용은 한글숫자, 자막용은 아라비아 숫자.
- SSML 미지원. 순수 텍스트만 전달.

## 커맨드

### 역할 필터 (`--role`)

```bash
pnpm voice -- --episode alexander-the-great --role celeb --force --update-json       # 셀럽만
pnpm voice -- --episode alexander-the-great --role narrator,summary --update-json     # 나레이터+요약맨만
pnpm voice -- --episode alexander-the-great --update-json                             # 전체
pnpm voice -- --engine cloud --episode alexander-the-great --update-json              # Cloud TTS로 전체
pnpm voice -- --engine elevenlabs --episode alexander-the-great --role celeb --update-json  # ElevenLabs 셀럽
```

### Duration 자동 반영

`--update-json` 플래그를 붙이면 TTS 생성 후 duration을 에피소드 JSON에 자동 기록한다. 수동 복사 불필요.

## Cloud TTS 보이스 매핑

| 역할 | Gemini | Cloud TTS (ko-KR) |
|------|--------|--------------------|
| 나레이터 | Kore (여) | Neural2-A (여) |
| 요약맨 | Charon (남) | Neural2-C (남) |
| 셀럽 | Puck (남) | Neural2-B (남) |

- 커스텀 셀럽 보이스(Orus 등)는 Cloud에 매핑이 없으므로 `Neural2-B`로 폴백한다.
- `.env`에 `GOOGLE_CLOUD_TTS_KEY` 필요.

## Gemini API 키 로테이션

- 무료 티어: 키당 10회/일. `.env`에 `GOOGLE_GENAI_API_KEY1` ~ `GOOGLE_GENAI_API_KEY100` 등록.
- 에러별 동작:
  - **429/403** (할당량/차단) → 다음 키로 전환
  - **400** (만료) → 다음 키로 전환
  - **500** (서버 오류) → 같은 키로 3초 대기 후 재시도
  - **빈 응답** (no audio) → 같은 키로 2초 대기 후 재시도

## 음성 파일 경로 해소 (`makeVf`)

```
요청 파일 → COMMON_FILES 매칭? → voice/common/{file}
         → voice-select.json slots 매칭? → voice/{ep}/{engine}/{file}
         → voice-select.json default → voice/{ep}/{default-engine}/{file}
         → voice-select 없음 → voice/{ep}/{file}
```

## 음성 파일 R2 관리

WAV 파일은 git에서 제외하고 Cloudflare R2로 관리한다. 로컬 `public/voice/`는 캐시 역할.

### R2 경로

```
remotion/voice/{episode-name}/{파일명}.wav
remotion/voice/{episode-name}/{engine}/{파일명}.wav
```

### 커맨드

```bash
pnpm voice:upload -- --episode <name>       # R2 업로드 (변경분만)
pnpm voice:upload -- --episode <name> --force  # 전체 재업로드
pnpm voice:pull -- --episode <name>          # R2에서 다운로드 (누락분만)
pnpm voice:pull -- --all                     # 전 에피소드 다운로드
pnpm voice:r2 -- --status                    # 동기화 현황
pnpm voice -- --episode <name> --upload      # TTS 생성 후 자동 업로드
```

### 동기화 흐름

1. `generate-voice.ts`로 WAV 생성 → 로컬 `public/voice/{episode}/`에 저장
2. `--upload` 플래그 또는 `voice:upload`으로 R2 업로드
3. 다른 PC에서 `voice:pull`로 다운로드
4. `r2-manifest.json`(에피소드별)이 동기화 상태 추적 → git 추적 대상

### 환경변수

`.env`에 `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` 필요. web-bo와 동일한 값 사용.
