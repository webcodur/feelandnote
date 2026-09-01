# 안전 문구 절단 복구

이 방식은 기본값이 아니다. ElevenLabs 결과에서 원문 마지막 음절이 잘리거나, 원문이 끝난 뒤 다른 말·웅얼거림이 실제로 붙은 경우에만 쓴다.

## 원리

원래 대사 뒤에 같은 언어의 구별하기 쉬운 안전 문구를 붙여 다시 합성한다. Whisper가 찾은 안전 문구 시작 시각을 기준으로 앞쪽의 VAD 무음 구간을 찾아 자른다. 파형 피크만 보고 자르지 않는다. 큰 피크는 정상 자음이나 감정 연기일 수 있고, 시간축의 발화 경계를 알려 주지 못하기 때문이다.

스크립트는 다음 자료를 보존한다.

- 안전 문구가 붙은 원본 MP3·WAV
- Whisper 단어 시각과 원문 일치율
- VAD 무음 구간과 실제 절단 시각
- 절단본 MP3·WAV와 재검증 결과
- 원본·절단본 파형 SVG

## 실행

저장소 루트에서 먼저 dry-run으로 locale 대사 22개, voice ID, API 계정을 확인한다.

```powershell
D:\audios\interview-cleaner\.venv\Scripts\python.exe sw/audio-bo/scripts/elevenlabs-safe-tail-dialogues.py --slug <slug> --locale <ko|en> --dry-run
```

사용자가 유료 재생성을 승인했고 기본 결과의 문제가 확인됐을 때만 실제로 실행한다.

```powershell
D:\audios\interview-cleaner\.venv\Scripts\python.exe sw/audio-bo/scripts/elevenlabs-safe-tail-dialogues.py --slug <slug> --locale <ko|en>
```

한국어 기본 안전 문구는 `확인용 문장을 지금 시작합니다.`, 영어는 `This verification sentence begins now.`다. 본문과 겹칠 가능성이 있으면 `--safe-phrase`로 같은 언어의 고유한 문장을 지정한다.

## 통과 조건

- 22개 모두 `verified`여야 한다.
- 안전 문구 anchor를 찾지 못한 파일은 실패다.
- 절단 후 안전 문구가 남거나 Whisper 원문 일치율이 72% 미만인 파일은 `review`다.
- `review`와 `failed`가 하나라도 있으면 업로드하지 않고 직접 듣거나 기본 생성으로 다시 만든다.

통과한 run의 등록 명령은 기본 생성과 같다. 등록 스크립트가 `mode: safe-tail`일 때 22개 모두 `verified`인지 다시 검사한다.
