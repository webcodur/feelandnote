---
name: celeb-dialogue-voice-publish
description: 셀럽의 DB 대사 22종을 ElevenLabs 또는 Gemini로 합성하고 검증해 R2에 등록할 때 사용한다. “대사 음원 생성”, “보이스 22개 박기”, “한국어·영문 보이스 생성과 업로드”, “끝부분 절단이나 후행 웅얼거림 복구” 요청에 적용한다. Remotion 내레이션과 팩션 음성에는 사용하지 않는다.
---

# 셀럽 대사 음성 생성·등록

셀럽 slug와 locale별로 `대사 22종 조회 → 직접 합성 → 검증 → R2 등록`을 수행한다. 기본 생성에서는 DB 대사를 그대로 보내며, 말줄임표·안전 문구·자동 절단을 넣지 않는다.

## 엔진 선택

- web-bo 대사 작업대는 이미 KO·EN별 Gemini와 ElevenLabs 생성·업로드를 지원한다. 현행 자동화 스크립트는 ElevenLabs만 구현돼 있다.
- 사용자가 Gemini를 지정했거나, 엔진을 지정하지 않은 여성 셀럽이면 Gemini를 우선 후보로 검토한다. 이 경우 유료 생성 전에 [현행 작업대 구현](../../../sw/web-bo/src/components/celeb/dialogue-studio/CelebDialogueStudio.tsx)을 기준으로 이 스킬과 스크립트에 Gemini 경로를 먼저 완성한다. ElevenLabs로 임의 대체하지 않는다.
- Gemini 선택은 생성 작업 값이며 `voice_id_ko/en`을 덮어쓰지 않는다. 확장 후에도 아래 22개 전량 검증·백업·등록 안전장치를 동일하게 적용한다.

## 실행 전 확인

- 대상 slug와 locale(`ko` 또는 `en`)을 확정한다. 두 언어는 별도 run으로 처리한다.
- DB의 해당 locale에 quote 1개와 7상황 × 3변형이 모두 있는지 dry-run으로 확인한다.
- locale의 `voice_id_ko` 또는 `voice_id_en`을 사용한다. 영문 voice ID가 없을 때 한국어 ID를 임의로 재사용하지 않는다. 사용자가 명시한 경우에만 `--voice-id`로 덮어쓴다.
- ElevenLabs 호출은 유료다. 사용자가 생성을 명시한 경우에만 실제 생성 명령을 실행한다.
- 기존 감정 태그는 대사의 일부이므로 보존한다. 태그 문제를 따로 진단할 때만 `elevenlabs-v3-tags`를 함께 따른다.
- 사용자 화면에 태그가 노출되거나 문장 중간 이벤트 태그가 필요하면 DB를 합성 대본으로 쓰지 않는다. `elevenlabs-v3-tags`의 합성 전용 JSON과 아래 `--tts-overrides`를 사용한다.

## 현재 ElevenLabs 기본 생성

저장소 루트에서 먼저 읽기 전용 검사를 실행한다.

```powershell
D:\audios\interview-cleaner\.venv\Scripts\python.exe sw/audio-bo/scripts/celeb-dialogue-voice-generate.py --slug <slug> --locale <ko|en> --dry-run
```

검사가 통과하고 생성 권한이 있으면 `--dry-run`만 제거한다.

```powershell
D:\audios\interview-cleaner\.venv\Scripts\python.exe sw/audio-bo/scripts/celeb-dialogue-voice-generate.py --slug <slug> --locale <ko|en>
```

화면용 DB 대사와 별도로 ElevenLabs 태그를 보낼 때는 다음처럼 실행한다.

```powershell
D:\audios\interview-cleaner\.venv\Scripts\python.exe sw/audio-bo/scripts/celeb-dialogue-voice-generate.py --slug <slug> --locale <ko|en> --tts-overrides <json>
```

생성 도중 네트워크 오류나 계정 한도 소진으로 멈췄다면 성공한 파일을 다시 결제해 만들지 않는다. 같은 DB 대사·합성 전용 문구·보이스 ID·설정을 유지한 채 실패한 run을 지정하면 manifest와 파일을 검증하고 빠진 슬롯만 이어서 생성한다.

```powershell
D:\audios\interview-cleaner\.venv\Scripts\python.exe sw/audio-bo/scripts/celeb-dialogue-voice-generate.py --slug <slug> --locale <ko|en> --resume-run <실패한 run 경로> --tts-overrides <json>
```

이 스크립트는 `D:\audios\interview-cleaner\celeb-dialogue-voices\<slug>\<locale>\<시각>`에 MP3 22개와 `manifest.json`을 남긴다. HTML은 만들지 않는다. 생성이 일부라도 실패하면 manifest를 `failed`로 남기며 업로드하지 않는다.

생성 뒤 같은 run을 Whisper로 검수한다. 결과는 run의 `whisper-qc.json`에 남는다.

```powershell
D:\audios\interview-cleaner\.venv\Scripts\python.exe sw/audio-bo/scripts/celeb-dialogue-voice-qc.py --run <절대 run 경로> --fail-on-flag
```

`low-match`는 받아쓰기 후보이므로 원문과 transcript를 직접 대조한다. 고유명사·띄어쓰기 오인식만으로 재생성하지 않는다. `unmatched-tail`과 `tag-spoken`은 공개 전에 반드시 해소한다.

ElevenLabs 계정이 다른 경우 `--account feelandnote`를 사용한다. UI와 같은 기본 설정은 stability 0.5, similarity 0.75, style 0.3, 합성 속도 1.0이다. DB의 `voice_speed`는 사용자 웹 재생 배속이며 합성 속도와 독립적이다. 사용자가 원음 자체의 속도 변경을 명시한 경우에만 `--speed`를 사용한다.

## 등록

업로드도 외부 변경이다. 사용자가 업로드·등록을 명시한 경우에만 수행한다. `sw/web-bo`에서 먼저 preflight를 실행한다.

```powershell
node --env-file=.env --import tsx scripts/celeb/dialogue-voice-publish.ts --run <절대 run 경로>
```

`status: ready`, 대상 인물·locale·voice ID·22개 파일을 확인한 뒤 실제 등록한다.

```powershell
node --env-file=.env --import tsx scripts/celeb/dialogue-voice-publish.ts --run <절대 run 경로> --apply
```

등록 스크립트는 기존 R2 음원을 run 아래 `_backup`에 먼저 보존하고, 22개 전량 업로드와 크기 검증이 끝난 뒤 `voice_id_<locale>`, `has_voice`, `voice_v`를 갱신한다. 공개 URL의 SHA-256까지 일치해야 `publish.json`을 남긴다. 일부 파일, 실패 manifest, 검증되지 않은 복구본은 등록하지 않는다.

## 끝부분 문제가 생긴 경우

기본 생성에서 마지막 음절이 잘리거나 원문 뒤에 웅얼거림·헛소리가 붙은 것이 실제 청취나 받아쓰기로 확인된 경우에만 [안전 문구 복구법](references/safe-tail.md)을 읽고 복구 스크립트를 사용한다. 단순한 후행 무음이나 파형의 큰 피크만으로 복구 모드로 전환하지 않는다.
