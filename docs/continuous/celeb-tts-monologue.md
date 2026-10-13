# 가상독백 한영 음성 생성·등록

`celebs.virtual_monologue`(한국어)·`virtual_monologue_en`(영어) 1인칭 독백을 인물 고유 보이스로 합성해 R2에 등록한다. 대상은 독백 본문이 있고 `voice_id_<locale>`이 있는 인물이다.

## 승인된 규칙

- 인물 안내(`reading`)는 Gemini Charon으로 찍지만 가상독백은 **DB에 설정된 보이스 그대로** 출력한다 — ElevenLabs voice_id면 ElevenLabs(공용 `elevenlabs-defaults.json`의 모델), `gemini:<보이스명>`이면 Gemini TTS(생성기의 Gemini 모델 상수, 무료 키 풀)를 쓴다(26.09.22 지시). `gemini:` 접두사는 생성기가 엔진을 고르는 계약이며, 서재탐방 에피소드의 보이스가 Gemini인 인물에 쓴다(alex-karp = `gemini:Orus`).
- 독백은 덩어리가 커서 **합성 단위(unit)로 나눠 생성하고, 파일도 단위별로 만든 뒤 하나로 잇는다.** 한 문장짜리 문단은 단독 단위로 두지 않고 다음 문단과 함께 생성한다(26.09.22 지시 — 짧은 문단 단독 파일이 끊겨 들렸다). 마지막이 한 문장 문단이면 앞 단위에 붙인다. 단위 사이 쉼은 **총량 목표제**다 — 각 단위 파일 양끝의 실제 무음을 측정해 가장자리 무음(앞 0.06·뒤 0.15초 한도)만 남기고, `gap_seconds - 남긴 무음`만큼 룸톤을 끼운다. 문장·문단 목표값은 [공용 정리 규칙](../project/production/prod-04-voice-cleanup.md)이 쥔다. `--resume-run --paragraph-gap`으로 재합성 없이 쉼만 다시 잇는다.
- `--reuse-from <이전 run>`은 병합 규칙·원문이 바뀌어 단위가 달라졌을 때, 텍스트가 같은 단위의 파일만 복사해 쓰고 나머지 단지만 합성한다 — 바뀐 곳만 다시 찍는다.
- 기본 분할은 생성기의 문장 묶음 규칙을 따른다. 목소리 일관성을 비교하려고 더 큰 덩어리로 생성할 때는 `--unit-break-after <문단 번호…>`로 경계를 지정한다. 피터 틸 한국어는 `--unit-break-after 4`로 1~4문단·5~7문단을 각각 합성한다(2026-10-03 지시). 재개할 때도 같은 옵션을 넘긴다.
- ElevenLabs는 유료 API다. 사용자가 대상을 지시한 경우에만 생성한다.
- 대사 슬롯 `monologue.mp3`(`celeb_dialogues.lines->monologue`)와는 다른 개념이다. 가상독백은 `vmonologue.mp3`/`vmonologue.json`을 쓰며 키가 겹치지 않는다.

## 코드와 폴더

- 생성: `sw/audio-bo/scripts/celeb-monologue-voice-generate.py` — DB에서 본문을 읽어 문단 분할·단위 병합 → 단위별 ElevenLabs 합성 → 공용 정리(`reading` 프로필) → 양끝 무음 정규화 + 룸톤 쉼 스티치 → **통합 라우드니스 -16 LUFS·TP -1.5 정규화**(`voice_cleanup.normalize_loudness`, 선형 게인+리미터, manifest `output.loudness`에 기록) → 공용 문장·문단 쉼 조정 → 최종 MP3 로컬 Whisper 검수(`celeb-reading-voice-qc.py`). 중단돼도 manifest가 남아 재개된다. 문단 TTS 텍스트 교정은 `--tts-overrides`로 합성 전용 치환을 준다(본문은 건드리지 않는다). 결함 unit만 지우고 `--resume-run`하면 그 단위만 다시 찍고 재스티치·재검수한다.
- 등록: `sw/web-bo/scripts/celeb/monologue-voice-publish.ts` — 기본은 프리플라이트이며 `--apply`에서만 업로드한다. manifest·DB 원문·voice_id를 재대조하고, QC 합격·문장 타이밍 정렬이 있어야 올린다. R2는 `celebs/{id}/voice/{locale}/vmonologue.mp3` + `vmonologue.json`(문장 따라읽기 타이밍). 발행 뒤 `voice_v`를 올려 캐시를 끊고 공개 URL 해시를 검증한다. 실패 시 이전 오브젝트를 `_backup/`에서 복원한다.
- 타이밍 공용: `sw/web-bo/scripts/celeb/reading-voice-timing.mjs` — `publishReadingTiming`의 `objectName`이 파일명을 쥔다(기본 `reading`, 독백은 `vmonologue`).
- 웹 재생: `sw/web/src/lib/game/voice/voiceUrl.ts`의 `getVirtualMonologueVoiceUrl`, 타이밍 프록시 `sw/web/src/app/api/reading-timing/route.ts`(`kind=monologue`), `useReadingTiming(kind)`, `FigureReadingTabs`의 독백 탭 플레이어. 표시 본문과 음성 로케일이 어긋나지 않게 `monologueLocale` prop으로 따로 받는다.
- 생성 폴더: `D:/audios/interview-cleaner/celeb-monologue-voices/<slug>/<locale>/<runId>/` — `source.txt`(LF 고정 — Windows `write_text`는 CRLF로 바꿔 해시가 깨진다), `p01.mp3…`, `vmonologue.mp3`, `manifest.json`, `qc.json`, `publish.json`.

위스퍼의 자원 확인·직렬 실행·보류 규칙은 [Audio BO](../project/apps/apps-02-audio-bo.md)가 쥔다.

## 실행

```powershell
cd sw/audio-bo
D:/audios/interview-cleaner/.venv/Scripts/python.exe scripts/celeb-monologue-voice-generate.py --slug <slug> --locale ko --dry-run
D:/audios/interview-cleaner/.venv/Scripts/python.exe scripts/celeb-monologue-voice-generate.py --slug <slug> --locale ko
D:/audios/interview-cleaner/.venv/Scripts/python.exe scripts/celeb-monologue-voice-generate.py --slug <slug> --locale en

cd sw/web-bo
node --env-file=.env --import tsx scripts/celeb/monologue-voice-publish.ts --run <runDir>          # 프리플라이트
node --env-file=.env --import tsx scripts/celeb/monologue-voice-publish.ts --run <runDir> --apply # 발행
```

QC가 본문 문단 경계를 구분하고 최종 간격을 확인한다. 최종 MP3와 연결된 `status: passed` 및 전 문장 타이밍이 있어야 발행한다. `sample-jump`처럼 단위 내부 결함은 해당 `pNN.mp3`를 지우고 `--resume-run`으로 그 단위만 재합성한다(틸 unit 3·4에서 실제로 해소).

## 현재 도달점

이번 신규 합성분은 허사비스 영문 가상독백만 서비스에 유지한다. 로컬 합성본·전사·검수 기록·백업은 전부 폐기했다. 기존 ElevenLabs 보이스는 당시 엔진과 연결해야 하며, Gemini 엔진 선택은 보류 중이다.
