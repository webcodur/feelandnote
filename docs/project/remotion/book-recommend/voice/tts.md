# 음성 생성 (TTS)

## 핵심 특성

- **LLM 기반 TTS(Gemini)는 입력 텍스트를 변조할 수 있다.** 생성 후 반드시 들어보고 자막과 대조해야 한다.
- 출력: PCM 24kHz 16bit mono → WAV 저장

## 음성 역할

| 역할 | Gemini 보이스 | ElevenLabs | 성별 | 색상 코드 |
|------|---------------|-----------|------|-----------|
| 나레이터 | `Kore` | — | 여성 | `#888` (회색) |
| 요약맨 | `Charon` | — | 남성 | `#8bb8a8` (민트) |
| 셀럽 | `Puck` (기본) | `elevenlabsVoiceId` | 남성 | `#c8a46e` (골드) |

## 속도 설계

### 롱폼

속도 지시 없음. 시청자가 유튜브 배속 기능으로 조절한다.

### 쇼츠 (★ 빠른 참조)

| 역할 | 속도 | 텍스트 프롬프트 |
|------|------|----------------|
| 나레이터 (hook) | **원속** | 속도 지시 없음 |
| 나레이터 (그 외) | **1.2배** | `1.2배속으로` |
| 요약맨 | **1.2배** | `1.2배속으로` |
| 셀럽 | **원속** | voiceStyle만 적용 (속도 미삽입) |

- hook·셀럽은 원속. 나레이터(hook 제외)·요약맨만 1.2배.
- 영문은 전부 원속 (속도 지시 없음).
- 프롬프트에 "또박또박 명확하게" 등 부가 지시를 넣으면 속도가 상쇄된다. `1.2배속으로`만 사용.
- **ElevenLabs는 텍스트 프롬프트 속도 지시가 적용되지 않는다.** 커스텀 보이스 자체 속도를 따른다.

### 셀럽 보이스 오버라이드

에피소드 JSON의 `host.geminiVoice`로 Gemini 셀럽 보이스를 인물별로 지정할 수 있다.
전체 보이스 목록과 배정 현황은 [`actors.md`](actors.md) 참조.

```json
{ "host": { "geminiVoice": "Orus" } }
```

### 셀럽 보이스 스타일 지시 (voiceStyle)

Gemini TTS는 보이스가 음색만 결정하고 어조·감정은 텍스트 프롬프트로 제어한다. `host.voiceStyle`을 지정하면 셀럽 역할(`celeb`) 음성 생성 시 텍스트 앞에 지시가 자동 삽입된다.

```json
{ "host": { "voiceStyle": "무게감 있는 목소리로, 권위적이고 위엄 있는 어조로 말한다" } }
```

**주의사항:**
- "천천히", "무게감 있게" 등의 지시는 속도를 크게 늦출 수 있다. 속도 균형이 필요하면 "보통 빠르기로" 등을 병기한다.
- ElevenLabs 엔진에는 적용되지 않는다 (커스텀 보이스 자체에 캐릭터 내장).
- 쇼츠에서도 celeb에는 voiceStyle만 적용되고 속도 지시는 삽입되지 않는다.
- 인물별 voiceStyle 배정 현황은 [`actors.md`](actors.md) 참조.

## 엔진 선택

| 엔진 | 플래그 | 비고 |
|------|--------|------|
| Gemini Flash TTS | `--engine gemini` (기본) | LLM 기반, 변조 가능. 키당 10회/일 |
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
| `C2-label-context.wav` | "감상경위" |

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
pnpm voice -- --engine elevenlabs --episode alexander-the-great --role celeb --update-json  # ElevenLabs 셀럽
```

### Duration 자동 반영

`--update-json` 플래그를 붙이면 TTS 생성 후 duration을 에피소드 JSON에 자동 기록한다. 수동 복사 불필요.

## Gemini API 키 로테이션

- 무료 티어: 키당 10회/일. `.env`에 `GOOGLE_GENAI_API_KEY_FREE1` ~ `GOOGLE_GENAI_API_KEY_FREE100` 등록.
- 에러별 동작:
  - **429/403** (할당량/차단) → 다음 키로 전환
  - **400** (만료) → 다음 키로 전환
  - **500** (서버 오류) → 같은 키로 3초 대기 후 재시도
  - **빈 응답** (no audio) → 같은 키로 2초 대기 후 재시도

## Gemini API 과금 구조 (2026-04 기준)

### 모델 및 가격

| 모델 | 텍스트 입력 | 오디오 출력 | 배치 (입력/출력) |
|------|-------------|-------------|------------------|
| `gemini-2.5-flash-preview-tts` | $0.50/1M tokens | $10.00/1M tokens | $0.25 / $5.00 |

### 결제 계정 등급별 월 한도 (2026-04-01 강제 적용)

| 등급 | 월 한도 | 승급 조건 |
|------|---------|-----------|
| Free | 무료 (RPM/RPD 제한만) | 결제 계정 연결 |
| Tier 1 | $250/월 | 결제 계정 연결 시 |
| Tier 2 | $2,000/월 | 누적 사용량 + 계정 기간 충족 시 자동 |

- **한도 초과 시 다음 달까지 API 차단.** 재정의 양식으로 상향 신청 가능.
- 프로젝트 레벨 지출 한도도 설정 가능 (초과 시 ~10분 내 일시중지).

### 키 로테이션과 과금의 관계

- **Rate limit (RPM/RPD):** API 키(프로젝트) 단위. 키 여러 개 = 할당량 분산 효과 있음.
- **Billing cap:** 결제 계정 단위. 같은 계정의 키 10개는 합산 집계 → 키 분산으로 우회 불가.
- 현재 구조: 계정 10개 × 키 10개 = 100키. rate limit 분산은 유효, billing cap은 계정 수(10개) 기준.

## 음성 파일 경로 해소 (`makeVf`)

```
요청 파일 → COMMON_FILES 매칭? → voice/common/{file}
         → voice-select.json slots 매칭? → voice/{ep}/{engine}/{file}
         → voice-select.json default → voice/{ep}/{default-engine}/{file}
         → voice-select 없음 → voice/{ep}/{file}
```

## 음성 타이밍 (voiceTimings)

영상에서 텍스트가 음성에 맞춰 **단어별로** 하이라이팅된다. 에피소드 JSON의 `voiceTimings` 필드가 이 정보를 담는다.

### 파이프라인 (4단계 필수, 순서 엄수)

```bash
cd sw/remotion
pnpm voice -- --episode <name> --update-json           # 1. TTS 생성 (변경분만 자동 감지)
python scripts/voice/whisper-words.py --episode <name>        # 2. WhisperX 단어 타임스탬프 추출
pnpm analyze -- --episode <name> --update-json          # 3. voiceTimings + duration 동기화
# 4. sub 생성 — Claude Code에 "sub 채워줘" 요청
```

- `--update-json` 누락 시 파일에 저장되지 않는다
- 특정 파일만: `--only D01c-context` (voice, whisper-words 모두 지원)
- 강제 재생성: `--force` (voice만)

### 4단계: 자막 의미 단위 분할 (sub 필드)

3단계 완료 후, voiceTimings 세그먼트에 `sub` 필드를 추가한다.
Claude Code에 아래 프롬프트로 요청한다:

```
/voice-sync <에피소드>          # 신규 sub 생성 (기존 sub 없는 세그먼트만)
시맨틱컷 <에피소드>              # 기존 sub 전량 삭제 후 재분할 (force)
```

**대상**: 의미상 2개 이상의 구절로 나뉘는 모든 세그먼트. 글자 수 기준 없음 — 하나의 짧은 의미 덩어리라면 sub 불필요.

> **⛔ 금지: 글자 수 기반 기계적 분할**
>
> 텍스트를 절반이나 N등분하여 가장 가까운 공백에서 자르는 방식은 **절대 금지**한다.
> 이 방식은 `splitSub()` 렌더 폴백과 동일한 결과를 내며, 고유명사·관형절·보조용언을 파괴한다.
>
> 실패 사례 (중간점 분할):
> - `"맨해튼"` / `"프로젝트가"` — 복합명사 파괴
> - `"다리오 아모데이는 이"` / `"책을 필독서로 꼽고,"` — 지시사+체언 분리
> - `"멈출 수"` / `"없는 판이"` — 보조용언 분리
> - `"리처드 로즈의 원자"` / `"폭탄 만들기."` — 책 제목 파괴
>
> **분할 기준은 오직 문법 구조(절·구 경계)다.** 글자 수는 참고 지표일 뿐이다.

#### 한국어 규칙

**핵심 원칙**: 절(clause)을 절대 찢지 않는다. 연결어미 **뒤**에서 끊는다.

1. **1순위 — 절 경계에서 끊기**: 연결어미(`~고`, `~며`, `~지만`, `~면`, `~서`, `~니`, `~뒤`, `~때`) 뒤에서 분할
2. **2순위 — 주어/목적어 뒤에서 끊기**: `~은/는/이/가` (주격), `~을/를` (목적격) 뒤에서 분할. 단, 서술어까지 10자 이내면 끊지 않고 합침
3. **3순위 — 수식절+피수식어 묶기**: 관형절(`~한`, `~는`, `~던`, `~할`) + 피수식 명사는 반드시 한 덩어리
4. sub 항목당 10~25자 (절을 보존하면 20자 초과 허용)
5. 조사 분리 절대 금지

**나쁜 예 → 좋은 예**:

```
✗ "직접 만난 적이" / "없었지만 그의 가르침에"     ← 절 중간에서 잘림
✓ "직접 만난 적이 없었지만" / "그의 가르침에 평생 감화받았습니다."

✗ "열두 살에 철학에" / "마음을 뺏긴 뒤"           ← 관형절+명사 분리
✓ "열두 살에 철학에 마음을 뺏긴 뒤" / "거친 외투와 맨바닥을 벗삼았다."

✗ "바꿀 수 없는 것에" / "매달리지 않는 것이"      ← 관형절+명사 분리
✓ "바꿀 수 없는 것에 매달리지 않는 것이" / "자유의 시작이라고 가르칩니다."
```

#### 영문 규칙

**핵심 원칙**: 구(phrase) 단위로 끊는다. 절대 SVO 구조를 찢지 않는다.

1. **1순위 — 절 경계**: 접속사(`and`, `but`, `that`, `which`, `when`, `where`, `because`) 앞에서 분할
2. **2순위 — 전치사구 경계**: 전치사(`in`, `of`, `for`, `with`, `from`, `to`, `by`, `about`) 앞에서 분할
3. **3순위 — 주어+동사 묶기, 동사+목적어 묶기**: SV 또는 VO를 찢지 않는다
4. sub 항목당 20~40자 (구를 보존하면 초과 허용)

**나쁜 예 → 좋은 예**:

```
✗ "The story of how a small group" / "of scientists developed"
✓ "The story of how" / "a small group of scientists" / "developed a technology"

✗ "even distributing copies" / "to early Anthropic employees."
✓ "even distributing copies to early Anthropic employees."
```

#### 공통

- `paginateSentences`가 문장 종결(`.!?`) 뒤에서 자동 flush하므로, sub는 문장 내부 분할만 담당
- 글자 수 기준보다 **문법 구조 보존이 항상 우선**

**예시**:
```json
{
  "start": 0, "end": 5.2,
  "text": "알렉산더는 스승 아리스토텔레스가 직접 교정해준 일리아스 필사본을",
  "sub": ["알렉산더는", "스승 아리스토텔레스가 직접 교정해준", "일리아스 필사본을"]
}
```

**타이밍 분배**: `expandSubTimings()` 함수가 sub 항목의 글자수 비례로 start/end를 자동 분배. 수동 타이밍 조정 불필요.

#### 불변식 (invariant)

sub 항목을 **공백으로 연결**하면 원문 text와 정확히 일치해야 한다:

```
sub.join(' ') === text  // 반드시 true
```

이 규칙을 어기면 `expandSubTimings()`의 글자수 비례 분배가 깨진다.

#### 도구

```bash
pnpm sub:check -- --episode <name>   # 깨진 sub + 누락 sub 보고
pnpm sub:apply -- --episode <name> --input subs.json  # sub 매핑 일괄 적용
```

`sub:apply`의 입력 형태:
```json
{ "D01b-summary": { "0": ["청크1", "청크2"] }, ... }
```

### 동작 원리

1. **WhisperX**가 오디오를 듣고 단어별 타임스탬프를 추출 (인식 오류 있을 수 있음)
2. **diff-match-patch**가 WhisperX 인식 텍스트와 원문을 문자 단위로 대조하여 매핑
3. 매핑된 타임스탬프가 원문 단어에 이식

인식이 틀려도("인리아스로") 타이밍은 정확하므로, diff가 원문("일리아스 로")에 올바르게 매핑한다.

### 주의 — splitSentences 우선순위

voiceTimings에 text가 있으면 `book.context` 대신 **voiceTimings 텍스트를 화면에 표시**한다. 텍스트만 바꾸고 파이프라인을 안 돌리면 화면에 옛 텍스트가 남는다.

### 출력 파일

| 파일 | 위치 | git 추적 | 비고 |
|------|------|----------|------|
| `whisper-debug.json` | `public/voice/<에피소드>/` | ❌ | WhisperX 단어 타임스탬프 + diff 매핑 결과 |
| `<에피소드>.json` | `episodes/book-recommend/` | ✅ | voiceTimings (단어 단위) |

### 트러블슈팅

| 증상 | 해결 |
|------|------|
| "No module named 'whisperx'" | `pip install whisperx` |
| "No module named 'diff_match_patch'" | `pip install diff-match-patch` |
| "No data chunk" 에러 | MP3를 .wav로 리네임한 파일. WAV로 재변환 필요 |
| TTS 재생성 후 자막이 밀림 | 전체 파이프라인 3단계 재실행 |
| 텍스트 바꿨는데 화면 안 바뀜 | 파이프라인 3단계 재실행 (splitSentences 우선순위 참고) |
| 잔존 WAV로 whisper 오염 | 세그먼트 ID 변경 후 옛 WAV 삭제. whisper-words.py가 자동 경고 |
| TTS 오버라이드와 자막 불일치 | `tts.*` 오버라이드는 발음 변환 전용. 내용 변경은 `segments[].text` 직접 수정 |
| analyze 후 기존 sub 유실 | `--shorts`/`--long`으로 범위 제한. 텍스트 동일 시 sub 자동 이식됨 |

### 의존성

```bash
pip install whisperx diff-match-patch
```



## 음성 파일 저장

WAV 파일은 git에서 제외하고 로컬 `public/voice/` 디렉토리에서 관리한다.
