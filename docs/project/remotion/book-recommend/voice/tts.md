# 음성 생성 (TTS)

## 핵심 특성

- **LLM 기반 TTS(Gemini)는 입력 텍스트를 변조할 수 있다.** 생성 후 반드시 들어보고 자막과 대조해야 한다.
- 출력: PCM 24kHz 16bit mono → WAV 저장

## 음성 역할

| 역할 | Gemini 보이스 | ElevenLabs | 색상 코드 |
|------|---------------|------------|-----------|
| 롱폼·쇼츠·SOLO 해설과 요약 | `Charon` | — | `#888` / `#8bb8a8` |
| 실제 인물의 검증된 발언 | 사용 금지 | 인물별 ELE ID 필수 | `#c8a46e` |

실제 인물은 진행 인물과 조연을 가리지 않고 ELE만 쓴다. ELE ID가 없으면 음성 설정 미완료이며 Gemini로 대체하지 않는다.

## 속도 설계

### 롱폼

속도 지시 없음. 시청자가 유튜브 배속 기능으로 조절한다.

### 쇼츠·롱폼 공통 (★ 빠른 참조)

| 역할 | 기본 prefix | 비고 |
|------|-------------|------|
| 나레이터 (쇼츠·롱폼) | `편안하고 자연스럽게` | `NARRATOR_STYLE_DEFAULT` 전역 기본 |
| 요약맨 | `편안하고 자연스럽게` | 나레이터와 동일 |
| 셀럽 | `voiceStyle`만 적용 | 별도 스타일 지시 없음 |

- 배속 지시는 2026-04-17 전면 폐기. 모든 셀럽이 원속 재생이다.
- `NARRATOR_STYLE_DEFAULT`는 한·영 공통 적용되지만 "편안하고 자연스럽게"는 한국어 지시라 영문 TTS에서는 실효가 제한된다. 영문에 별도 스타일이 필요하면 `segment.style`에 영문 지시문을 넣는다 (경고 로그 발생).
- 해설 스타일 오버라이드는 `episode.host.shortsSpeed` 필드(레거시 이름, 실제는 스타일 문자열)에 저장한다.
- **ElevenLabs는 텍스트 prefix가 적용되지 않는다.** 커스텀 보이스 자체 특성을 따른다.

### 인물 보이스 등록

진행 인물은 `host.voiceEngine: "elevenlabs"`와 `host.elevenlabsVoiceId`를, 조연은 `speakers[].engine: "elevenlabs"`와 `speakers[].voiceId`를 지정한다. `host.geminiVoice`, 장면별 `geminiVoice`, Gemini 화자 등록은 서재탐방 인물 음성에 사용하지 않는다. 자세한 형식은 [`actors.md`](actors.md) 참조.

### 발화 스타일

Gemini의 스타일 지시는 `Charon` 해설에만 적용한다. ElevenLabs 인물 대사의 감정·톤은 ELE 전용 설정을 사용하며 Gemini용 `host.voiceStyle`이나 장면별 `style`로 대신하지 않는다.

### 짧은 narrator/summary 문장 특수 톤 (tail padding)

파이프라인은 `seg.style` prefix로 톤을 지시하지만, Gemini TTS는 **짧고 독립적인 문장에서는 style prefix를 제대로 반영하지 못하고 평상어로 되돌아가는** 경향이 있다. 짧은 세그먼트에 사극체·비장체·낮은 톤·속삭임 같은 특정 캐릭터 톤이 필요할 때는 파이프라인 우회가 필요하다.

**적용 대상** (hook 전용 아님): 쇼츠 `S01-hook`, `S02-intro`, 짧은 narrator 연결 구간, 롱폼 `D{NN}a-title`(연극적 제목 발화) 등 **30~60자 이내의 독립 문장**이라면 어디든 가능. 반복 사용 절차는 `.agents/skills/remo-voice-short-retone` 스킬로 정리되어 있다.

#### ✅ tail padding 전략

1. Hook 원문 **뒤**에 해당 톤의 긴 서술(사극 줄거리, 감정 장면 등)을 붙여 긴 본문으로 Gemini에 투입
2. 생성된 wav에서 앞(hook 원문) 부분만 살리고 뒤 서술은 절단
3. 절단 지점은 반드시 wav2vec2 forced alignment로 단어별 타임스탬프를 확보한 뒤 확정

```typescript
// ad-hoc 스크립트 예시 (scripts/voice/ 하위 일회성)
process.argv.push('--shorts', '1', '--episode', '<name>', '--start-key', '5')
const { synthesizeGemini } = await import('./2-synthesize/engines.js')
const text = `<hook 원문 두 문장>

<해당 톤의 긴 서술 문단 — 절단 후 버릴 부분>`
await synthesizeGemini(text, 'Charon', path.join(rawDir, 'S01-hook.wav'))
```

#### ⛔ 금지 사항

- **hook 앞에 prefix padding 금지** — whisper/diff 앵커가 첫 단어 매칭에 실패해 절단 시 첫 단어가 소실된다. 뒤에 붙이면 hook 원문은 절대 안전
- **silencedetect 단독 추측 절단 금지** — 반드시 wav2vec2 forced alignment(`3-transcribe.py` 경로 또는 ad-hoc)로 마지막 hook 단어의 `end` 시점을 확인한 뒤 0.5~1.0초 여운을 더해 절단
- **고유어/한자어 혼합 텍스트 금지** — 비교 표현("A 대 B")은 반드시 한자어 통일 (`고유어 수사 vs 한자어 수사` 섹션 참조)

#### 후속 파이프라인 정규화

수동 절단 wav는 파이프라인 정석 후속 단계를 반드시 밟는다:

```bash
# 0) tts.replace 동기화 — 실제 발화와 일치해야 forced alignment가 정확
#    shorts/ko-N.json 의 tts.replace 를 실제 한자어 발화로 교체

# 1) 단일 파일 normalize (normalizeAll은 shorts-N/ 하위를 스캔 못함)
#    ad-hoc 스크립트로 normalizeWav(path) 직접 호출

# 2) manifest 재계산 (향후 pnpm voice:tts 실행 시 wav 덮어쓰기 방지)
pnpm voice:tts -- --episode <name> --shorts <N> --init-manifest

# 3~5) 정석 파이프라인 (--only 필수)
python scripts/voice/3-transcribe.py --episode <name> --shorts <N> --only <seg>
pnpm voice:align -- --episode <name> --shorts <N> --only <seg> --update-json
pnpm voice:chunk -- --check -- --episode <name>
```

#### 과거 사고

- **이순신 쇼츠 S01-hook (2026-04-11)**: 처음엔 "사극 prefix + hook" 구조로 생성하고 앞을 자르려다 `"열셋 대"` 첫 단어가 whisper diff 매칭 실패로 소실 → `"백서른셋이 아니었습니다"` 부터 잘려버림. tail padding 전략 + 한자어 통일(`"십삼 대 백삼십삼"`)로 재생성 후 정상화. 절단 지점은 wav2vec2 forced alignment로 `"백삼십삼이었습니다"` 마지막 end(5.34s) + 여운 0.56s → **5.9s** 로 확정.

## 엔진 선택

| 엔진 | 플래그 | 비고 |
|------|--------|------|
| Gemini Flash TTS | `--engine gemini` (기본) | `Charon` 해설 전용. 키당 10회/일 |
| ElevenLabs | `--engine elevenlabs` | 실제 인물 대사 전용. 인물별 ELE ID 필수 |

- **ElevenLabs는 `--engine elevenlabs` 명시 시에만 동작한다.** 자동 호출 없음.
- ElevenLabs 모델: `eleven_multilingual_v2`, 출력: `pcm_24000`
- `.env`에 `ELEVENLABS_API_KEY` 필요

### ElevenLabs와 Gemini 파이프라인의 관계

Gemini 실행은 해설만 만들고 인물 대사는 건너뛴다. ElevenLabs 실행은 반대로 인물 대사만 대상으로 삼으며, ELE ID가 없는 대사는 오류로 중단한다. 이 분리는 해설이 인물 음색으로 생성되거나 인물 대사가 Gemini 대체 음성으로 생성되는 사고를 막는다. 실제 합성은 반드시 사람이 지시했을 때만 한다.

## 공통 음성

에피소드마다 동일한 음성은 `public/voice/common/`에 1회 생성하여 재사용한다.
`2-synthesize.ts`가 자동으로 건너뛰고, `makeVf`가 `voice/common/` 경로로 해소한다.

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

`--long` 또는 `--shorts <N>` 단일 타겟 스코프와 함께 사용한다.

```bash
pnpm voice:tts -- --episode alexander-the-great --long --role celeb --force --update-json       # 롱폼 셀럽만
pnpm voice:tts -- --episode alexander-the-great --long --role narrator,summary --update-json     # 롱폼 나레이터+요약맨만
pnpm voice:tts -- --episode alexander-the-great --long --update-json                             # 롱폼 전체
pnpm voice:tts -- --engine elevenlabs --episode alexander-the-great --long --role celeb --update-json  # ElevenLabs 셀럽
```

### Duration 자동 반영

`--update-json` 플래그를 붙이면 TTS 생성 후 duration을 `<locale>.timing.json`에 자동 기록한다. 수동 복사 불필요.

> ⚠ **`--update-json`은 duration만 갱신한다.** word-level `voiceTimings`는 건드리지 않는다. "timing.json 동기화됐네"로 착각 금지. voiceTimings는 반드시 3-transcribe + 4-align 단계를 거쳐야 갱신된다. voice만 돌리고 끝내면 wav와 voiceTimings가 어긋나 하이라이트·자막 타이밍이 전부 꼬인다.

### ⛔ 메인 트랙 4단계는 한 세트

**voice(1) → whisper(2) → analyze(3) → sub(4) 4단계는 반드시 한 세트로 실행한다.** 단일 세그먼트 실험·테스트·디버깅도 예외 없음. 이유:

- voice 단계가 wav를 새로 쓰는 순간, 옛 wav 기준으로 만들어진 voiceTimings는 즉시 오염된다
- 렌더·preview·YouTube 업로드는 wav + voiceTimings + sub 셋을 모두 참조하므로 어느 한쪽이 옛것이면 바로 깨진다
- 3단계까지만 돌리고 4단계를 건너뛰면 자막이 `splitSub()` 폴백으로 떨어져 고유명사·관형절·보조용언이 파괴된다
- voice `--only`로 한 세그먼트만 돌렸어도, whisper/analyze/sub 모두 **같은 `--only`** 범위로 실행한다

과거 사고: 알렉스 카프 쇼츠2 들숨 테스트 시 voice만 실행하고 whisper·analyze를 스킵했다가 하이라이트가 엉망이 되어 렌더·업로드 이후에 발견.

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

### 파이프라인 (메인 트랙 4단계 필수, 순서 엄수)

> **1단계 실행 전 [0단계: Pre-flight](../../../remotion/README.md#0단계-pre-flight-파이프라인-실행-전-필수) 필수.** 텍스트 전문 읽기 → `tts.replace` 숫자 오버라이드 → `voice-select.json` 점검.

1~4단계 모두 **`--long` 또는 `--shorts <N>` 단일 타겟 스코프 필수**.
한 번의 명령은 정확히 하나의 대상(롱폼 전체 또는 쇼츠 1개)만 처리한다.

```bash
cd sw/remotion
# 롱폼
pnpm voice:tts -- --episode <name> --long --normalize --update-json     # 1. TTS 생성 (변경분만 자동 감지)
python scripts/voice/3-transcribe.py --episode <name> --long           # 2. WhisperX 단어 타임스탬프 추출
pnpm voice:align -- --episode <name> --long --update-json                # 3. voiceTimings + duration 동기화
# 4. /voice-sync <name>                                              # Claude Code가 의미 단위 sub 생성

# 쇼츠 N (N은 1-based)
pnpm voice:tts -- --episode <name> --shorts 1 --normalize --update-json
python scripts/voice/3-transcribe.py --episode <name> --shorts 1
pnpm voice:align -- --episode <name> --shorts 1 --update-json
# 4. /voice-sync <name>
```

- `--update-json` 누락 시 파일에 저장되지 않는다
- 스코프 내 특정 파일만: `--only D01c-context` (voice, whisper-words, analyze 모두 지원, 단일 타겟 스코프와 함께)
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
pnpm voice:chunk -- --check -- --episode <name>   # 깨진 sub + 누락 sub 보고
pnpm voice:chunk -- --episode <name> --input subs.json  # sub 매핑 일괄 적용
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

## 5. 라우드니스 정규화 (옵트인)

Gemini TTS는 동일 보이스라도 텍스트 톤·길이에 따라 세그먼트 간 평균 음량(dB)이 들쑥날쑥하다. 짧고 강렬한 hook이 일반 본문보다 4dB 이상 크게 합성되는 경우가 흔하다. 이를 해소하기 위해 `--normalize` 플래그로 ffmpeg `loudnorm` 후처리를 적용할 수 있다.

### 사용법

```bash
# 신규 생성 + 자동 정규화 (생성된 wav만)
pnpm voice:tts -- --episode <name> --long --normalize --update-json

# 일괄 정규화만 (TTS 생성 없이 OUT_DIR의 모든 wav 후처리)
pnpm voice:tts -- --episode <name> --long --normalize
```

- 매니페스트 비교 결과 `변경된 텍스트 없음`이면 자동으로 일괄 정규화 모드로 전환된다
- `--long` 또는 `--shorts <N>` 단일 타겟 스코프 필수. `--only`와 조합 가능 (해당 범위만 신규 생성·정규화)
- `--engine elevenlabs` 일 때는 자동 비활성화 (셀럽 수작업 검수 영역 보호)

### 타겟 파라미터

| 항목 | 값 | 이유 |
|------|----|------|
| I (Integrated LUFS) | -19 | 깎는 방향 위주로 평준화. 천장(0 dB)에 붙은 wav가 클립되지 않도록 보수적 |
| TP (True Peak) | -1.5 dB | 클리핑 안전 마진 |
| LRA (Loudness Range) | 11 | 기본값. linear 모드에서 큰 영향 없음 |
| linear=true | ✓ | 게인만 조정, 컴프레션 미적용 → 음색·다이나믹 보존 |
| 패스 | 2-pass | 1패스 측정 → 2패스 정확 적용 |

### 백업·롤백

정규화는 원본 wav를 같은 디렉토리의 `.raw/` 하위에 1회 한정으로 자동 백업한 뒤 in-place로 교체한다. 이미 백업이 있는 파일은 백업 단계를 건너뛴다 (재정규화 시에도 원본 보존).

```
public/episodes/<status>/<person>/voice/<locale>/gemini/
├── S01-hook.wav          ← 정규화 후
├── S04-book-context.wav  ← 정규화 후
├── ...
└── .raw/
    ├── S01-hook.wav      ← 원본 (자동 백업)
    ├── S04-book-context.wav
    └── ...
```

롤백:

```bash
cp public/episodes/<status>/<person>/voice/<locale>/gemini/.raw/*.wav \
   public/episodes/<status>/<person>/voice/<locale>/gemini/
```

### 동작 검증

정규화 전후 평균 dB는 ffmpeg `volumedetect`로 측정한다:

```bash
for f in public/episodes/<...>/voice/<locale>/gemini/*.wav; do
  ffmpeg -i "$f" -af volumedetect -vn -sn -dn -f null - 2>&1 | grep -E "mean_volume|max_volume"
done
```

기대치: mean이 `-19 ~ -20 dB` 부근으로 수렴하고, max는 `-1.5 dB` 이하 (피크 안전 마진 확보).

### 주의

- 셀럽 음성(ElevenLabs)에는 적용 금지. 정규화 코드가 자동 차단함
- 너무 짧은 wav (2초 미만)는 LUFS 측정 정확도가 떨어짐. BookRecommend 쇼츠는 모두 충분한 길이라 해당 없음
- linear 모드에서 헤드룸이 부족하면 ffmpeg가 dynamic으로 자동 fallback할 수 있음 (드물게 발생, 음색 영향 미미)

### 출력 파일

| 파일 | 위치 | git 추적 | 비고 |
|------|------|----------|------|
| `2-word-timings.json` | `public/voice/<에피소드>/{locale}/` | ❌ | WhisperX 단어 타임스탬프 + diff 매핑 결과 (중간 산출물) |
| `<locale>.json` | `episodes/<person>/` (또는 `<person>/books/<책>/`) | ❌ | 에피소드 콘텐츠 (텍스트, 메타, 이미지) |
| `<locale>.timing.json` | `episodes/<person>/` (또는 `<person>/books/<책>/`) | ❌ | voiceTimings + duration — 파이프라인 자동 생성 |

> **`episodes/` 전체가 `.gitignore` 대상이다(로컬 전용).** 위 파일은 git이 추적하지 않으며, ripgrep 기반 검색(Grep 도구)에서도 누락된다. 직접 경로로 열거나 Bash `grep -r`로 찾는다. 경로는 `_status` 파일 체계 기준이며, 옛 `done/`·`live/`·`todo/` 3단 폴더는 폐기됐다.

### 트러블슈팅

| 증상 | 해결 |
|------|------|
| "No module named 'whisperx'" | `pip install whisperx` |
| "No module named 'diff_match_patch'" | `pip install diff-match-patch` |
| "No data chunk" 에러 | MP3를 .wav로 리네임한 파일. WAV로 재변환 필요 |
| TTS 재생성 후 자막이 밀림 | 전체 파이프라인 3단계 재실행 |
| 텍스트 바꿨는데 화면 안 바뀜 | 파이프라인 3단계 재실행 (splitSentences 우선순위 참고) |
| 잔존 WAV로 whisper 오염 | 세그먼트 ID 변경 후 옛 WAV 삭제. 3-transcribe.py가 자동 경고 |
| TTS 오버라이드와 자막 불일치 | `tts.replace`는 발음 변환 전용 전역 치환맵. 내용 변경은 `segments[].text` 직접 수정 |
| analyze 후 기존 sub 유실 | `--long` 또는 `--shorts <N>` 으로 단일 타겟 스코프 지정. 텍스트 동일 시 sub 자동 이식됨 |

### 의존성

```bash
pip install whisperx diff-match-patch
```



## 음성 파일 저장

WAV 파일은 git에서 제외하고 로컬 `public/voice/` 디렉토리에서 관리한다.

### 에피소드 파일 분할

에피소드 데이터는 콘텐츠와 타이밍 두 파일로 분리한다:

| 파일 | 내용 |
|------|------|
| `<locale>.json` | 콘텐츠 (텍스트, 메타데이터, 이미지, tts 오버라이드) |
| `<locale>.timing.json` | 타이밍 데이터 — 파이프라인 자동 생성 |

`timing.json`에 저장되는 필드:
- `voiceTimings` — 단어별 타임스탬프
- 모든 `*Duration` 필드 (narrator, host, books, shorts)

- `pnpm voice:tts -- --update-json`: duration을 `timing.json`에 저장
- `pnpm voice:align -- --update-json`: voiceTimings + duration을 `timing.json`에 저장

### TTS 오버라이드 구조

에피소드 JSON(`<locale>.json`)의 `tts` 필드로 발음을 제어한다:

```json
{
  "tts": {
    "titles": ["일리아스, 호메로스, 기원전 팔 세기", null, "국부론, 애덤 스미스, ..."],
    "replace": { "334년": "삼백삼십사 년", "8세기": "팔 세기" }
  }
}
```

| 필드 | 설명 |
|------|------|
| `tts.titles[]` | `books[]`와 인덱스 대응. 책 제목 발음용 전문 오버라이드. `null`이면 자동 생성 |
| `tts.replace` | 전역 치환맵. 모든 텍스트 필드에 적용 (숫자 → 한글 등) |

- 오버라이드는 **발음 변환 전용**이다. 내용 변경은 `segments[].text`를 직접 수정한다.
- 기존의 전문 복사 방식(`tts.narrator`, `tts.books[]` 내 텍스트 사본)은 폐기되었다.

#### ⛔ 숫자 매핑은 반드시 단위 명사까지 포함

화면은 아라비아 숫자로 남기고 발음만 한글로 바꿀 때, `tts.replace` 키는 **숫자 + 단위 명사를 한 덩어리**로 등록해야 한다.

```json
// ❌ 금지 — 숫자만 매핑 (죽은 키가 되거나 diff 경계가 꼬임)
"replace": { "1,704": "천칠백사", "13": "십삼" }

// ✅ 필수 — 단위까지 포함
"replace": {
  "1,704명": "천칠백사 명",
  "3,759명": "삼천칠백오십구 명",
  "12척": "열두 척",
  "1594년": "천오백구십사 년"
}
```

**이유:** `3-transcribe.py`의 TTS 오버라이드는 2단계 매핑(`whisper → match_text → display_text`)을 수행한다. `display_words` 토큰 경계가 `"1,704명"`처럼 단위까지 한 단어로 묶여 있어야 diff-match-patch가 `"1,704명" ↔ "천칠백사 명"`을 DELETE/INSERT 쌍으로 명확히 처리한다. 숫자만 매핑하면 `"1,704"` 와 `"명"`이 별개 토큰으로 잘려 diff 경계가 꼬이고, 해당 세그먼트 `duration`이 실제 발음(2~3초)보다 훨씬 짧은 값(0.5~1초)으로 망가져 하이라이팅이 튄다.

**죽은 키 금지:** 단위 없는 숫자 키(`"13"`, `"305"`)는 단위 포함 키(`"13척"`, `"305편"`)가 먼저 소비하므로 실제로 매칭되지 않는 죽은 키가 된다. 등록하지 않는다. **점검 시 롱폼 본문뿐 아니라 `shorts/*.json` 세그먼트 텍스트도 반드시 포함**하여 검색한다. `tts.replace`는 롱폼·쇼츠 공용이므로 한쪽에만 등장하는 키를 죽은 키로 오판하지 않는다.

**사후 점검:** 파이프라인 실행 후 `voiceTimings`에서 문장 세그먼트 `duration`이 글자수 대비 비정상적으로 짧으면(한글 10자 이상인데 1.5초 미만) 단위 누락을 의심한다. tts.replace 키를 `단위 포함`으로 교체한 뒤 `--only <key>`로 voice·whisper·analyze만 재실행하면 복구된다 (본문·wav 재작성 불필요, manifest 비교로 자동 감지).

**과거 사고:** 이순신 에피소드 D03c-context(`사망자 1,704명, 신음하는 병사 3,759명`)에서 숫자만 매핑한 탓에 세그먼트 `duration`이 0.56초·0.96초로 무너졌고, 화면 타이핑 속도가 번쩍였다. 단위 포함 매핑으로 교체 후 2.33초·1.67초로 정상화.

#### 고유어 수사 vs 한자어 수사

한국어에서 숫자 읽기는 **단위 명사와 문맥**에 따라 고유어(하나, 둘, 셋…) 또는 한자어(일, 이, 삼…)가 결정된다. 하드코딩 불가 — **반드시 본문을 읽고 판단**한다.

| 단위 | 수사 | 예시 |
|------|------|------|
| 척(배), 권(책), 명(소수), 번 | **고유어** | 12척→열두 척, 5권→다섯 권, 2번→두 번 |
| 년, 월, 일, 세기, 편(章), 호 | **한자어** | 1594년→천오백구십사 년, 13편→십삼 편 |
| 명(대수), 척(대수), 편(대수) | **한자어** | 1,704명→천칠백사 명, 133척→백삼십삼 |
| 비교 "A 대 B" (對) | **한자어 통일** | 13 대 133 → 십삼 대 백삼십삼, 1 대 133 → 일 대 백삼십삼 |

**같은 단위도 문맥에 따라 달라진다:**
- "6편으로 정리했으며" (갯수) → **여섯 편** (고유어)
- "13편 전체를 관통합니다" (장 번호/구조) → **십삼 편** (한자어)
- "5권의 책이었습니다" (갯수) → **다섯 권** (고유어)
- "제7권" (순서) → **제칠권** (한자어)

**⛔ 고유어/한자어 혼합 금지:** 같은 문장 또는 인접한 두 문장에서 같은 숫자 개념을 고유어와 한자어로 섞어 쓰면 Gemini TTS가 앞 숫자를 단위 명사로 오해하여 통째로 다른 단어를 발음한다. 비교 표현("A 대 B")은 **한자어로 완전 통일**한다. `"열셋 대 백삼십삼"` 같은 혼합은 금지 — `"십삼 대 백삼십삼"`.

**과거 사고:** 이순신 쇼츠 `S01-hook`("13 대 133이 아니었습니다. 1 대 133이었습니다.")에서 첫 매핑을 `"13 대 133이": "열셋 대 백서른셋이"`, 두 번째를 `"1 대 133이었습니다.": "일 대 백서른셋이었습니다."`로 고유어로 등록 → Gemini가 "열셋 대"를 배 단위로 오해하여 **"열세 척이 백서른셋이"**로 발화. 한자어 통일 (`"십삼 대 백삼십삼이"`, `"일 대 백삼십삼이었습니다."`)로 교체 후 정상.

#### 한자·외국어 괄호 처리

본문에 한국어 음차 + 괄호 원문이 함께 있으면(`모야천지(母也天只)`), 괄호째 제거한다. 그대로 두면 TTS가 한자를 재음독하여 이중 발음이 된다.

```json
// ✅ 괄호째 빈 문자열로 치환
"(母也天只)": "",
"(天只)": ""
```

## 1권 모드(SOLO)

SOLO는 책 번호를 지정해 음성 목록 확인과 합성을 실행한다. 기본 해설은 `Charon`이 읽는다. 같은 흐름의 해설은 대체로 두 문단 전후를 한 음성 파일로 묶는다. 같은 논지를 잇는 짧은 셋째 문단은 앞 파일에 붙이고, 인물의 실제 발언만 별도 ELE 성우 파일로 분리한다.

```bash
# 비용 없이 생성 목록과 화자 확인
pnpm voice:tts -- --episode jensen-huang-ko --solo 2 --list

# 사용자 승인 뒤 실제 합성
pnpm voice:tts -- --episode jensen-huang-ko --solo 2
```

파일명은 `voice/{locale}/solo-B{NN}/S{nn}-{segId}.wav`다. `voice: "actor"`인 장면은 `speaker`가 가리키는 ELE 인물 음색을 사용하며, `host`는 진행 인물의 ELE 음색을 사용한다. 배우 장면에 Gemini를 지정하지 않는다.

합성 뒤에는 일반 서재탐방과 같이 받아쓰기·정렬·의미 단위 분할을 진행한다. 영상은 음성과 단어 시각이 있는 장면에 해당 wav를 붙이고, 아직 음성이 없는 장면은 글자 수로 길이를 추정한다.

텍스트가 확정되기 전에는 유료 합성을 실행하지 않는다. 장면 `id`나 순서를 바꾸면 파일명과 시각 연결이 달라지므로 원고 편집 단계에서는 본문만 수정한다.
