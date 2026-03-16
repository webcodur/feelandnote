# 음성 생성 (TTS)

## 핵심 특성

- **LLM 기반 TTS(Gemini)는 입력 텍스트를 변조할 수 있다.** 생성 후 반드시 들어보고 자막과 대조해야 한다.
- 출력: PCM 24kHz 16bit mono → WAV 저장

## 음성 3종

| 역할 | Gemini/Cloud 보이스 | ElevenLabs | 성별 | 색상 코드 |
|------|---------------------|-----------|------|-----------|
| 나레이터 | `Kore` / `Neural2-A` | — | 여성 | `#888` (회색) |
| 요약맨 | `Charon` / `Neural2-C` | — | 남성 | `#8bb8a8` (민트) |
| 셀럽 | `Puck` / `Neural2-B` | `elevenlabsVoiceId` | 남성 | `#c8a46e` (골드) |

## 엔진 선택

| 엔진 | 플래그 | 역할 | 비고 |
|------|--------|------|------|
| Gemini Flash TTS | `--engine gemini` (기본) | 나레이터, 요약맨 | LLM 기반, 변조 가능. 키당 10회/일 |
| Google Cloud TTS | `--engine cloud` | 나레이터, 요약맨 | Neural2 월 100만자. 안정적 |
| ElevenLabs | 자동 (elevenlabsVoiceId 설정 시) | 셀럽 | 인물별 커스텀 보이스 |

- **셀럽 role + `elevenlabsVoiceId`가 JSON에 있으면 자동으로 ElevenLabs 사용** (엔진 플래그 무관)
- ElevenLabs 모델: `eleven_multilingual_v2`, 출력: `pcm_24000`
- `.env`에 `ELEVENLABS_API_KEY` 필요

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
pnpm voice -- --episode alexander-the-great --role celeb --force --update-json       # 셀럽만 (ElevenLabs)
pnpm voice -- --episode alexander-the-great --role narrator,summary --update-json     # 나레이터+요약맨만
pnpm voice -- --episode alexander-the-great --update-json                             # 전체
pnpm voice -- --engine cloud --episode alexander-the-great --update-json              # Cloud TTS로 전체
```

### Duration 자동 반영

`--update-json` 플래그를 붙이면 TTS 생성 후 duration을 에피소드 JSON에 자동 기록한다. 수동 복사 불필요.
web-bo 에피소드 에디터에서도 "Duration JSON 자동 반영" 체크박스로 동일 기능 제공.

## Cloud TTS 보이스 매핑

| 역할 | Gemini | Cloud TTS (ko-KR) |
|------|--------|--------------------|
| 나레이터 | Kore (여) | Neural2-A (여) |
| 요약맨 | Charon (남) | Neural2-C (남) |
| 셀럽 | Puck (남) | Neural2-B (남) |

- `.env`에 `GOOGLE_CLOUD_TTS_KEY` 필요. Google Cloud Console에서 TTS API 활성화 후 API 키 발급.
- Cloud TTS는 텍스트를 변조하지 않으므로 Gemini보다 자막 싱크가 정확하다.

## Gemini API 키 로테이션

- 무료 티어: 키당 10회/일. `.env`에 `GOOGLE_GENAI_API_KEY1` ~ `GOOGLE_GENAI_API_KEY50` 등록.
- `generate-voice.ts`가 429/403 에러 시 자동으로 다음 키로 전환.

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

---

## web-bo TTS 통합

`sw/web-bo/src/actions/admin/episodes.ts`에 서버 액션:
- `generateVoice(name, engine, only?, updateJson?)`: TTS 생성 실행
- `listVoiceJobs(name)`: 생성 대상 목록 조회

Windows에서 `execFile`로 pnpm 실행 시 `pnpm.cmd` 사용 필수 (`process.platform === 'win32'` 분기).
