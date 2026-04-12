---
name: remo-voice-short-retone
description: 짧은 음성 세그먼트(쇼츠 hook, intro, 짧은 narrator/summary 구간, 롱폼 짧은 임팩트 문장 등)에 사극체·비장체·낮은 톤·속삭임 등 특수 캐릭터 톤을 부여해 재생성한다. 파이프라인 style prefix가 짧은 문장에서 먹히지 않을 때 tail padding 전략 + wav2vec2 forced alignment + 수동 normalize + 후속 파이프라인 동기화를 한 세트로 실행한다. "hook 사극체로 만들어줘", "S02-intro 비장체로", "이 문장 속삭이듯이", "짧은 세그먼트 톤 바꿔줘" 등 호출.
---

# Voice Short Retone — 짧은 세그먼트 특수 톤 재생성 파이프라인

짧은 음성 세그먼트에 사극체·비장체·낮은 톤·속삭임 같은 특수 캐릭터 톤이 필요할 때 사용한다. Gemini TTS는 **짧고 독립적인 문장에서 style prefix가 먹히지 않고 평상어로 되돌아가는 경향**이 있다. 이때는 파이프라인 정석(`pnpm voice`의 `seg.style` prefix) 대신 tail padding 우회 프로세스로 해결한다.

## 적용 대상 (hook 전용 아님)

길이가 짧고 독립적인(주변 문맥 없이 단독 발화되는) 모든 narrator/summary 세그먼트에 적용 가능하다. 대표 예시:

- 쇼츠 `S01-hook` — 15자 이하 임팩트 문장 대부분
- 쇼츠 `S02-intro` — 짧은 도입부 (3~5초)
- 롱폼 `A3-featured-quote` 앞뒤 짧은 narrator 연결 구간
- 롱폼 `D{NN}a-title` 제목 발화 — 연극적 톤이 필요할 때
- 쇼츠/롱폼 어디든 **30~60자 이내** 문장으로 톤이 떠오르지 않는 경우

celeb 세그먼트는 별도 경로(`host.voiceStyle` + ElevenLabs 커스텀 보이스)가 있으므로 이 스킬 대상이 아니다.

## ⛔ 전제

- **유료 API 호출**(Gemini TTS). 반드시 사용자 사전 승인 필수 — `feedback_no_auto_generation` 원칙
- **이 스킬은 메인 트랙 1단계(voice)의 우회 경로**다. 완료 후 2~4단계(whisper → analyze → sub-check)는 **반드시** 같은 `--only` 범위로 완주한다. 절대 중간에 멈추지 않는다
- ad-hoc 스크립트로 Gemini를 직접 호출하므로 파이프라인 `jobs.ts`의 manifest 비교를 우회한다. 후속 `pnpm voice` 실행에서 내 결과가 덮어쓰기되지 않도록 **manifest 재계산**(`--init-manifest`) 필수
- `shorts-N/` 하위 wav는 파이프라인 `normalizeAll`이 스캔하지 못한다 — **`normalizeWav(path)` 단일 파일 호출**로 수동 정규화 (롱폼 OUT_DIR 직속은 normalizeAll로 커버됨)

## 필수 사전 읽기

- `docs/project/remotion/book-recommend/voice/tts.md` — "짧은 narrator 문장 특수 톤 (tail padding)" 섹션, "고유어 수사 vs 한자어 수사" 섹션
- 대상 에피소드의 해당 세그먼트 텍스트 원본: `shorts/ko-N.json` (쇼츠) 또는 `ko.json`의 `narrator`/`books[].summary`/`books[].contextMain` 등 (롱폼), `tts.replace` 현황

## 작업 흐름

사용자가 `<에피소드명> (<쇼츠번호>|long) <세그먼트id>` 또는 자연어로 호출. 예:
- `hook 사극체로 재녹음 yi-sun-sin shorts-1`
- `S02-intro 비장체로 바꿔줘 churchill shorts-2`
- `D03a-title 연극적으로 yi-sun-sin long`
- `이 짧은 문장 속삭이듯이`

### Step 0: 확인 및 승인

1. 대상 세그먼트 텍스트를 원본 json(`shorts/ko-N.json` 또는 `ko.json`)에서 읽어 사용자에게 보여준다
2. 필요한 특수 톤(사극체·비장체·낮은 톤·속삭임 등)과 보이스(`Charon`/`Kore`/`Puck`/`Orus` 등)를 확정
3. **tail padding에 붙일 긴 서술 초안**을 제시하고 사용자 OK를 받는다. tail 서술은 대상 문장과 주제·분위기가 연결되어야 Gemini의 톤 유도가 효과적
4. 숫자 표기가 고유어/한자어 혼합이 아닌지 검사 — 혼합이면 먼저 `tts.replace` 수정 안내 (tts.md 참조)
5. **Gemini 호출 승인 명시적 확인**

### Step 1: ad-hoc 스크립트로 raw 생성

파일 위치: `sw/remotion/scripts/voice/retone-ad-hoc.ts` (일회성, 완료 후 즉시 삭제)

```typescript
import 'dotenv/config'
import path from 'path'

// cli.ts 스코프 체크 우회 — 쇼츠면 --shorts N, 롱폼이면 --long
process.argv.push('--shorts', '<N>', '--episode', '<name>', '--start-key', '5')
// 롱폼 대상이면 위 라인 대신: process.argv.push('--long', '--episode', '<name>', '--start-key', '5')

const { synthesizeGemini } = await import('./1-tts/engines.js')
const { findEpisodeDir } = await import('../lib/episode.js')

const text = `<대상 세그먼트 원문 — 절대 건드리지 말 것>

<tail padding: 해당 톤의 긴 서술 문단 — 절단 후 버릴 부분>`

// 출력 경로 — 쇼츠는 shorts-N/<파일명>, 롱폼은 <파일명> 직속
const outFile = path.join(
  findEpisodeDir('<person>'),
  'voice', 'ko', 'gemini',
  'shorts-<N>',          // 롱폼이면 이 줄 삭제
  '.raw', '<파일명>.wav'  // 예: S01-hook.wav, S02-intro.wav, D03a-title.wav
)

const duration = await synthesizeGemini(text, '<Voice>', outFile)
console.log(`✓ ${duration.toFixed(2)}s`)
```

**실행:**
```bash
cd sw/remotion
npx tsx scripts/voice/retone-ad-hoc.ts
```

**텍스트 작성 원칙:**
- 대상 세그먼트 원문은 본문 **맨 앞**에 배치. tail padding은 **원문 뒤**에 배치. 순서 절대 반대로 하지 말 것
- 숫자는 한자어로 풀어쓰기 (`13 대 133` → `십삼 대 백삼십삼`). `tts.replace`에 맡기지 말고 ad-hoc 스크립트에 직접 하드코딩
- 고유어/한자어 혼합 금지 (`열셋 대 백삼십삼` → ❌, `십삼 대 백삼십삼` → ✅)
- tail padding 문단은 함축·은유 없이 평서체 서술. 해당 톤의 어휘(사극이면 `~했습니다`·`버리자 했지만`·`결의` 등)만 유지. 숫자는 가능한 제거하거나 한자어 풀어쓰기
- 스타일 prefix(`사극체로:` 등) **사용 금지** — 역효과가 더 많다. tail padding 자체가 prefix의 대안이다
- 길이: 대상 세그먼트 2~3문장 + tail 5~8문장(약 30~60초). 너무 짧으면 톤 유도 실패, 너무 길면 API 비용·생성 실패 리스크

### Step 2: wav2vec2 forced alignment로 절단 지점 확정

**⛔ silencedetect 단독 추측으로 자르지 말 것.** 반드시 단어별 타임스탬프로 확정.

ad-hoc alignment 스크립트 (`sw/remotion/scripts/voice/retone-wx.py`, 일회성):

```python
import os, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
import whisperx
import torch

WAV = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    '..', '..',
    'public', 'episodes', '<stage>', '<person>',
    'voice', 'ko', 'gemini',
    'shorts-<N>',                # 롱폼이면 이 줄 삭제
    '.raw', '<파일명>.wav'
)

TEXT = """<Step 1에서 Gemini에 투입한 본문 전문 — 토씨 하나 다르지 않게>"""

device = 'cuda' if torch.cuda.is_available() else 'cpu'
audio = whisperx.load_audio(WAV)
duration = round(len(audio) / 16000.0, 3)
align_model, meta = whisperx.load_align_model(language_code='ko', device=device)
synth = [{'text': TEXT, 'start': 0.0, 'end': duration}]
aligned = whisperx.align(synth, align_model, meta, audio, device)

print('start\tend\tword')
for w in aligned.get('word_segments', []):
    s = w.get('start', 0)
    e = w.get('end', 0)
    word = w.get('word', '?')
    print(f'{s:.3f}\t{e:.3f}\t{word}')
```

**실행:** `python scripts/voice/retone-wx.py`

**절단 지점 확정 규칙:**
1. 대상 세그먼트의 **마지막 단어**(= tail padding 시작 직전 단어)의 `end` 시점을 찾는다
2. 그 다음 단어의 `start`와 사이의 pause 길이 확인
3. 절단 지점 = 마지막 단어 end + **0.5~1.0초 여운** (pause 중간이면 자연스러움)
4. 여운이 너무 길면 템포 붕괴, 너무 짧으면 문장 끝 숨소리가 잘려 부자연스럽다

### Step 3: ffmpeg tail 절단

```bash
# 쇼츠
ffmpeg -y -hide_banner -loglevel error \
  -i public/episodes/<stage>/<person>/voice/ko/gemini/shorts-<N>/.raw/<파일명>.wav \
  -t <절단_초수> \
  -c copy \
  public/episodes/<stage>/<person>/voice/ko/gemini/shorts-<N>/<파일명>.wav

# 롱폼 (shorts-N/ 경로 제거)
ffmpeg -y -hide_banner -loglevel error \
  -i public/episodes/<stage>/<person>/voice/ko/gemini/.raw/<파일명>.wav \
  -t <절단_초수> \
  -c copy \
  public/episodes/<stage>/<person>/voice/ko/gemini/<파일명>.wav

# 길이 확인
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 \
  <output.wav>
```

- `-c copy`로 재인코딩 없이 스트림 복사 (wav PCM이라 안전, 빠름)
- raw는 Step 5 normalize 시점까지는 절대 덮어쓰지 않는다 (재절단이 필요할 수 있음)

### Step 4: tts.replace 동기화

`shorts/ko-N.json` (쇼츠) 또는 `ko.json` (롱폼)의 `tts.replace` 매핑이 **실제 발화 텍스트와 일치**해야 2-whisper.py의 forced alignment가 정확히 동작한다. 대상 세그먼트 관련 매핑을 내가 실제 Gemini에 투입한 텍스트로 맞춘다.

```jsonc
// Before (혼합·고유어)
"13 대 133이": "열셋 대 백서른셋이",
"1 대 133이었습니다.": "일 대 백서른셋이었습니다."

// After (한자어 통일, 실제 발화와 일치)
"13 대 133이": "십삼 대 백삼십삼이",
"1 대 133이었습니다.": "일 대 백삼십삼이었습니다."
```

### Step 5: normalize

**쇼츠**(`shorts-N/` 하위)는 파이프라인 `normalizeAll`이 스캔하지 못하므로 `normalizeWav(path)` 단일 파일 호출로 수동 정규화한다. **롱폼**(OUT_DIR 직속)은 `pnpm voice --normalize` 경로로 normalizeAll이 적용되지만, 이 스킬은 voice 우회 경로이므로 동일하게 ad-hoc 스크립트가 안전하다.

ad-hoc 스크립트 (`sw/remotion/scripts/voice/retone-normalize.ts`, 일회성):

```typescript
import 'dotenv/config'
import path from 'path'

// 쇼츠
process.argv.push('--shorts', '<N>', '--episode', '<name>')
// 롱폼이면 위 라인 대신: process.argv.push('--long', '--episode', '<name>')

const { normalizeWav } = await import('./1-tts/normalize.js')
const { findEpisodeDir } = await import('../lib/episode.js')

const fp = path.join(
  findEpisodeDir('<person>'),
  'voice', 'ko', 'gemini',
  'shorts-<N>',     // 롱폼이면 이 줄 삭제
  '<파일명>.wav'
)

const result = await normalizeWav(fp)
console.log(result ? `✓ in_i=${result.inI}` : '✗ 측정 실패')
```

**실행:** `npx tsx scripts/voice/retone-normalize.ts`

- `normalizeWav`는 `.raw/name`으로 원본을 백업한다. 이 과정에서 **Step 1~3의 긴 raw는 현재 절단본으로 덮어쓰기되어 사라진다**. 사용자에게 "긴 raw 소실 OK?" 사전 확인 (필요 시 Step 3 직전에 긴 raw를 별도 경로로 수동 백업)
- 목표 loudness: I=-19 LUFS, TP=-1.5, LRA=11 (linear 모드)
- 이미 정규화된 상태면 in_i가 target과 유사 — 멱등성 있음

### Step 6: manifest 재계산

```bash
# 쇼츠
pnpm voice -- --episode <name> --shorts <N> --init-manifest

# 롱폼
pnpm voice -- --episode <name> --long --init-manifest
```

- 현재 `jobs.ts` 텍스트(= 원본 json 세그먼트 텍스트 + tts.replace 적용) 기준으로 manifest hash 재기록
- 이후 `pnpm voice`를 돌려도 "변경 없음"으로 판정되어 내 재생성 wav가 덮어쓰기되지 않는다

### Step 7: 파이프라인 2~4단계 완주

```bash
# 쇼츠 예시
python scripts/voice/2-whisper.py --episode <name> --shorts <N> --only <seg>
pnpm analyze -- --episode <name> --shorts <N> --only <seg> --update-json

# 롱폼 예시
python scripts/voice/2-whisper.py --episode <name> --long --only <seg>
pnpm analyze -- --episode <name> --long --only <seg> --update-json

# 공통: sub 검증
pnpm sub:check -- --episode <name>
```

- 2단계가 성공하려면 tts_text(= Step 4에서 수정한 `tts.replace` 적용 결과)와 실제 wav 발화가 일치해야 한다
- 세그먼트 텍스트가 30자 이하면 4단계 sub 생성 스킵 (short 판정). 30자 초과면 `/voice-sync`로 sub 분할

### Step 8: 정리

- ad-hoc 스크립트 3개 전부 삭제 (`retone-ad-hoc.ts`, `retone-wx.py`, `retone-normalize.ts`)
- 이번 작업에서 얻은 패턴(특수 톤 어휘, tail padding 내용 등)이 향후 반복 활용 가능성 있으면 `docs/project/remotion/book-recommend/voice/tts.md` 또는 해당 인물 문서에 남기기

## ⛔ 금지 사항 요약

| 금지 | 이유 |
|------|------|
| 대상 세그먼트 **앞**에 prefix padding | whisper/diff 앵커가 첫 단어 매칭에 실패해 절단 시 첫 단어 소실 |
| silencedetect 단독 추측 절단 | 무음 구간을 문단 경계로 오해해 엉뚱한 위치에서 자름. 반드시 wav2vec2 forced alignment로 확정 |
| 고유어/한자어 혼합 (`열셋 대 백삼십삼`) | Gemini가 앞 숫자를 단위 명사로 오해해 전혀 다른 단어로 발화 |
| 스타일 prefix(`사극체로:`) 사용 | Gemini 한국어 TTS에서 역효과. tail padding이 대체 수단 |
| 파이프라인 2~4단계 스킵 | wav와 voiceTimings/sub가 어긋나 하이라이트·자막 타이밍 전부 붕괴 |
| 사용자 승인 없이 Gemini 재호출 | 유료 API. `feedback_no_auto_generation` 원칙 위반 |
| 긴 raw 보존 가정 (자동 백업 기대) | Step 5 normalize가 `.raw/`를 절단본으로 덮어쓴다. 긴 raw가 필요하면 사전에 별도 경로로 수동 백업 |
| 대상을 hook으로만 한정하는 발상 | 짧은 intro, 롱폼 제목, 임팩트 문장 등 **모든 짧은 독립 문장**에 동일한 메커니즘이 적용된다 |

## 과거 사고 (참고)

- **이순신 쇼츠 S01-hook (2026-04-11)**: v1에서 사극 prefix를 hook 앞에 붙여 생성 후 앞을 자르려 했으나 "열셋 대" 첫 단어가 whisper diff 매칭 실패로 소실되어 "백서른셋이 아니었습니다"부터 잘림. v2에서 tail padding으로 전환 + "백서른셋"→"백삼십삼" 수정했으나 첫 문장 "열셋 대"를 그대로 둔 결과 Gemini가 "열세 척이"로 발화. v3에서 "십삼 대"로 전체 한자어 통일 후 정상. wav2vec2 forced alignment로 확정한 절단 지점 5.9s(마지막 hook 단어 end 5.34s + 여운 0.56s).
