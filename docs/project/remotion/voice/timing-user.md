# Voice Timing — 사용 가이드

## 이게 뭔가

Remotion 영상에서 텍스트가 음성에 맞춰 **단어별로** 하이라이팅된다. 각 단어가 오디오의 몇 초에 발음되는지 알아야 하며, 이 정보가 에피소드 JSON의 `voiceTimings` 필드다.

## 어떻게 돌아가나

1. **WhisperX**가 오디오를 듣고 단어별 타임스탬프를 추출한다 (인식 오류 있을 수 있음)
2. **diff-match-patch**가 WhisperX 인식 텍스트와 원문을 문자 단위로 대조하여 매핑한다
3. 매핑된 타임스탬프가 원문 단어에 이식된다

인식이 틀려도("인리아스로") 타이밍은 정확하므로, diff가 원문("일리아스 로")에 올바르게 매핑한다.

## 사용법

### 새 에피소드 타이밍 잡기

```bash
cd sw/remotion
pnpm voice -- --episode <name> --update-json        # 1. 음성 생성
python scripts/whisper-words.py --episode <name>     # 2. WhisperX + diff 매핑
pnpm analyze -- --episode <name> --update-json       # 3. duration 동기화
```

### 특정 파일만 다시 잡기

```bash
python scripts/whisper-words.py --episode <name> --only D03c-context
pnpm analyze -- --episode <name> --update-json
```

### 수동 미세 조정

remotion-bo의 VoiceTimingEditor에서 파형을 보면서 직접 조정 가능.

---

## 기술 상세

### 의존성

```bash
pip install whisperx diff-match-patch
```

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
| 한영 혼용 타겟에서 영어 단어 타이밍이 부정확 | diff-match-patch가 자동 보간. 대부분 수용 가능 |
| TTS 재생성 후 자막이 밀림 | 전체 파이프라인 재실행 |
