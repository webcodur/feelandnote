# Voice Timing — 사용 가이드

## 이게 뭔가

Remotion 영상에서 텍스트가 음성에 맞춰 하이라이팅되려면, 각 문장이 오디오의 몇 초~몇 초 구간에서 재생되는지 알아야 한다. 이 정보가 에피소드 JSON의 `voiceTimings` 필드다.

예를 들어 "Hello, I'm Jensen Huang. Reading Alice in Wonderland taught me..."라는 오디오가 있으면, "Hello,"는 0~0.48초, "I'm Jensen Huang."은 0.48~1.70초, "Reading Alice..."는 1.70~5.90초 — 이런 식으로 문장별 시작/끝 시각이 필요하다.

이걸 사람이 하나하나 잡으면 에피소드 하나에 수십 분이 걸린다. 그래서 자동화 파이프라인을 만들었다.

## 어떻게 돌아가나

세 가지 도구가 각자 잘하는 일만 한다.

**Whisper**(음성인식 AI)가 오디오를 듣고 "이 단어가 몇 초에 나온다"를 알려준다. 단어를 틀리게 인식할 수 있지만("NVIDIA"를 "Invidia"로 듣는 식) 타이밍은 정확하다.

**RMS 파형 분석**(프로그래밍)은 오디오의 음량을 수치로 변환한다. "이 시점이 무음인가, 소리가 나는 중인가"를 판별하는 용도다.

**Claude**(LLM)가 Whisper의 단어 타이밍과 원본 텍스트를 받아서, 어떤 단어가 어떤 문장에 속하는지 매칭한다. Whisper가 "Invidia"라고 인식해도 Claude는 원본 텍스트의 "NVIDIA"와 대응시킬 수 있다. 그리고 RMS 데이터로 경계가 실제 무음 구간에 있는지 교차검증한다.

## 사용법

### 새 에피소드 타이밍 잡기

터미널에서 두 줄 실행한다:

```bash
cd sw/remotion
pnpm analyze -- --episode <에피소드명> --update-json --export-debug
python scripts/whisper-words.py --episode <에피소드명>
```

그 다음 Claude Code에서:

```
/voice-timing-refine <에피소드명>
```

이것만 하면 Claude가 알아서 데이터를 읽고, 서브에이전트를 돌려서, 에피소드 JSON의 voiceTimings를 채운다.

### 오디오 교체 후 빠른 동기화

TTS를 재생성하거나 오디오 파일을 교체했을 때, 간단히:

```
/voice-sync
```

이러면 RMS 기반 초안이 잡힌다. 대부분은 이것만으로 충분하다. 정밀도가 아쉬우면 위의 전체 파이프라인을 다시 돌리면 된다.

### 특정 파일만 다시 잡기

전체가 아니라 특정 음성 파일만 재처리하고 싶으면:

```bash
pnpm analyze -- --episode <name> --only D03c-context --update-json --export-debug
python scripts/whisper-words.py --episode <name> --only D03c-context
```

```
/voice-timing-refine <name>
```

### 수동 미세 조정

자동 결과가 미세하게 안 맞는 구간은 remotion-bo의 VoiceTimingEditor에서 직접 조정한다. 파형을 보면서 노란선(경계)을 드래그하거나, 더블클릭으로 경계를 추가/제거할 수 있다.

---

## 기술 상세

### Whisper 옵션

```bash
# 기본 (base 모델, CPU)
python scripts/whisper-words.py --episode <name>

# 더 정확한 모델 (느림)
python scripts/whisper-words.py --episode <name> --model small
```

| 모델 | 속도 | 권장 |
|------|------|------|
| base | 빠름 (파일당 3~5초) | **기본값.** 대부분 충분 |
| small | 보통 | 인식 오류가 심할 때 |

### 출력 파일

| 파일 | 위치 | git 추적 | 비고 |
|------|------|----------|------|
| `timing-debug.json` | `public/voice/<에피소드>/` | ❌ | 임시. 보정 후 삭제 가능 |
| `whisper-debug.json` | `public/voice/<에피소드>/` | ❌ | 임시. 보정 후 삭제 가능 |
| `<에피소드>.json` | `episodes/book-recommend/` | ✅ | voiceTimings가 여기에 저장됨 |

### 소요 시간 (26개 타겟 기준)

| 단계 | 시간 |
|------|------|
| RMS 분석 | ~5초 |
| Whisper | ~2분 (CPU) |
| LLM 보정 | ~5분 (서브에이전트 병렬) |

### 트러블슈팅

| 증상 | 해결 |
|------|------|
| "No module named 'whisper'" | `pip install openai-whisper` |
| "No data chunk" 에러 | MP3를 .wav로 리네임한 파일. WAV로 재변환 필요 |
| LLM 보정 후에도 안 맞는 구간 | remotion-bo VoiceTimingEditor에서 수동 조정 |
| Whisper 인식이 심하게 틀림 | `--model small` 사용 |
