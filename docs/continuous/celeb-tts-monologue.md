# 가상독백 한영 음성 생성·등록

`celebs.virtual_monologue`(한국어)·`virtual_monologue_en`(영어) 1인칭 독백을 인물 고유 보이스로 합성해 R2에 등록한다. 대상은 독백 본문이 있고 `voice_id_<locale>`이 있는 인물이다.

## 승인된 규칙

- 인물 안내(`reading`)는 Gemini Charon으로 찍지만 가상독백은 **DB에 설정된 보이스 그대로** 출력한다 — ElevenLabs voice_id면 ElevenLabs(`eleven_v3`), `gemini:<보이스명>`이면 Gemini TTS(`gemini-2.5-flash-preview-tts`, 무료 키 풀)를 쓴다(26.09.22 지시). `gemini:` 접두사는 생성기가 엔진을 고르는 계약이며, 서재탐방 에피소드의 보이스가 Gemini인 인물에 쓴다(alex-karp = `gemini:Orus`).
- 독백은 덩어리가 커서 **합성 단위(unit)로 나눠 생성하고, 파일도 단위별로 만든 뒤 하나로 잇는다.** 한 문장짜리 문단은 단독 단위로 두지 않고 다음 문단과 함께 생성한다(26.09.22 지시 — 짧은 문단 단독 파일이 끊겨 들렸다). 마지막이 한 문장 문단이면 앞 단위에 붙인다. 단위 사이 쉼은 **총량 목표제**다 — 각 단위 파일 양끝의 실제 무음을 측정해 가장자리 무음(앞 0.06·뒤 0.15초 한도)만 남기고, `gap_seconds - 남긴 무음`만큼 룸톤을 끼워 체감 총량을 목표(기본 1.0초)로 맞춘다(26.09.22 — 고정 삽입은 정리본의 꼬리 여백·인코더 패딩 편차가 그대로 더해져 길고 들쭉날쭉했다). `--resume-run --paragraph-gap`으로 재합성 없이 쉼만 다시 잇는다.
- `--reuse-from <이전 run>`은 병합 규칙·원문이 바뀌어 단위가 달라졌을 때, 텍스트가 같은 단위의 파일만 복사해 쓰고 나머지 단지만 합성한다 — 바뀐 곳만 다시 찍는다.
- ElevenLabs는 유료 API다. 사용자가 대상을 지시한 경우에만 생성한다.
- 대사 슬롯 `monologue.mp3`(`celeb_dialogues.lines->monologue`)와는 다른 개념이다. 가상독백은 `vmonologue.mp3`/`vmonologue.json`을 쓰며 키가 겹치지 않는다.

## 코드와 폴더

- 생성: `sw/audio-bo/scripts/celeb-monologue-voice-generate.py` — DB에서 본문을 읽어 문단 분할·단위 병합 → 단위별 ElevenLabs 합성 → 공용 정리(`reading` 프로필) → 양끝 무음 정규화 + 룸톤 쉼 스티치 → **통합 라우드니스 -16 LUFS·TP -1.5 정규화**(`voice_cleanup.normalize_loudness`, 선형 게인+리미터, manifest `output.loudness`에 기록) → 로컬 Whisper 검수(`celeb-reading-voice-qc.py`). 중단돼도 manifest가 남아 재개된다. 문단 TTS 텍스트 교정은 `--tts-overrides`로 합성 전용 치환을 준다(본문은 건드리지 않는다). 결함 unit만 지우고 `--resume-run`하면 그 단위만 다시 찍고 재스티치·재검수한다.
- 등록: `sw/web-bo/scripts/celeb/monologue-voice-publish.ts` — 기본은 프리플라이트이며 `--apply`에서만 업로드한다. manifest·DB 원문·voice_id를 재대조하고, QC 합격·문장 타이밍 정렬이 있어야 올린다. R2는 `celebs/{id}/voice/{locale}/vmonologue.mp3` + `vmonologue.json`(문장 따라읽기 타이밍). 발행 뒤 `voice_v`를 올려 캐시를 끊고 공개 URL 해시를 검증한다. 실패 시 이전 오브젝트를 `_backup/`에서 복원한다.
- 타이밍 공용: `sw/web-bo/scripts/celeb/reading-voice-timing.mjs` — `publishReadingTiming`의 `objectName`이 파일명을 쥔다(기본 `reading`, 독백은 `vmonologue`).
- 웹 재생: `sw/web/src/lib/game/voice/voiceUrl.ts`의 `getVirtualMonologueVoiceUrl`, 타이밍 프록시 `sw/web/src/app/api/reading-timing/route.ts`(`kind=monologue`), `useReadingTiming(kind)`, `FigureReadingTabs`의 독백 탭 플레이어. 표시 본문과 음성 로케일이 어긋나지 않게 `monologueLocale` prop으로 따로 받는다.
- 생성 폴더: `D:/audios/interview-cleaner/celeb-monologue-voices/<slug>/<locale>/<runId>/` — `source.txt`(LF 고정 — Windows `write_text`는 CRLF로 바꿔 해시가 깨진다), `p01.mp3…`, `vmonologue.mp3`, `manifest.json`, `qc.json`, `publish.json`.

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

QC의 `non-silent-sentence-pause`는 문장 쉼 기준 판정이라 문단 쉼이 상한을 넘을 때만 경고로 남는다 — `verdict: passed`면 발행 가능하다. `sample-jump`처럼 단위 내부 결함은 해당 `pNN.mp3`를 지우고 `--resume-run`으로 그 단위만 재합성한다(틸 unit 3·4에서 실제로 해소).

## 현재 도달점

- 2026-09-22: 문단 쉼을 총량 1.0초 정규화로 바꾸고 기존 발행분을 재스티치·재발행했다. `mark-zuckerberg` ko `voice_v` 18·en 19, `elon-musk` ko 9·en 10, `peter-thiel` ko 4(en은 `voice_id_en` 미설정이라 미생성 — 플레이어는 비활성 형상으로 자리를 지킨다). 타이밍 ko 23·en 23(저커버그), 35·30(머스크), 24(틸) 전량 정렬, 거부 0.
- 원문 수정 이력: `elon-musk` ko/en 첫 필러(“음... 솔직히 말해서,” / “Um... to be honest,”) 제거, `peter-thiel` ko를 한다체→정중체로 전환(8문단 유지, en은 종결어미 체계가 없어 무변경). 둘 다 `virtual_monologue_locked_at` 미잠금 상태에서 읽은 값 대조 후 반영.
- 발행 run: `celeb-monologue-voices/<slug>/<locale>/<runId>` — mark-zuckerberg ko `20260922-172030`·en `20260922-172110`, elon-musk ko `20260922-174341`·en `20260922-174510`, peter-thiel ko `20260922-174623`, alex-karp ko `20260923-split`·en `20260923-split`, vincent-van-gogh ko `20260923-episode-reuse`·en `20260923-011639`.
- 2026-09-23 추가: `vincent-van-gogh` ko/en 발행, `voice_v` 13·14(타이밍 13·12 거부 0). ko는 사용자가 원문을 서재탐방 `host.philosophy`와 동일하게 되돌려 **에피소드 음원(`B2-philosophy.wav`, 같은 ElevenLabs ID)을 재사용**했다 — QC의 수리 제안(문단 경계 쉼 1.22→1.05초 절단)을 원본 wav에 적용해 mp3로 만들고 수동 manifest를 조립해 발행. en은 에피소드 음원이 없어 ElevenLabs 신규 생성(unit 3 sample-jump → `--resume-run` 해소).
- 2026-09-23 추가: `alex-karp` 독백 본문 재편집(ko 543자·en 1047자) 후 ko/en 재생성·발행, 이어 **사후 문단 분할**과 **문장 쉼 정규화**를 적용해 재발행 — 단일 unit으로 올라간 음원을 QC 단어 타이밍으로 쉼 위치를 읽고 문단 경계(s5·s13 뒤, ko/en 동일 논리 구조 3문단) 중간점에서 절단해 p0N 파일로 둔 뒤 `--resume-run`이 총량 1.0초 쉼으로 재스티치했다. DB 원문에도 같은 자리에 빈 줄을 넣어 표시 문단과 음원 문단을 일치시켰다(음원 재합성 없음). Gemini가 문장을 너무 붙여 읽는 문제가 있어 문장 부호 경계마다 QC 단어 타이밍으로 쉼을 측정, 총량 1.0초가 되도록 룸톤을 끼우는 후처리(`sentence-gaps.json`에 삽입 기록, manifest `sentenceGapNormalization`)를 추가했다 — 문단 쉼은 이미 목표라 자동 제외되고 결과적으로 문단>문장 호흡 계층이 유지된다. 최종 `voice_v` 15·16, 타이밍 18·18 거부 0. 보이스는 `gemini:Orus` 유지. Gemini TTS는 간헐적으로 앞머리를 되풀이해 읽거나(`unexpected-spoken-head`) 단위 내부에 `sample-jump`를 낸다 — 결함 unit만 지워 `--resume-run` 재생성으로 해소한다. 무료 키 429는 키 로테이션으로 자연 흡수된다.
- 2026-09-23 추가: `donald-trump` ko/en 발행, `voice_v` 58·59. 보이스 `4BIMsnoIdQXBJCTWCM4X`는 **디폴트 ElevenLabs 계정** 소유 — FEELANDNOTE 키로는 `voice_not_found`가 나므로 `--account` 기본값(=default)을 유지해야 한다. 단일 문장 테스트는 `celeb_dialogue_voice_common.synthesize`를 직접 호출해 같은 설정(eleven_v3·0.5/0.75/0.3/1.0)으로 찍는다(테스트 산출물 `D:/audios/interview-cleaner/trump-voice-test/`). ko/en 모두 4문단→4unit 1차 QC 통과. ko 타이밍 22/23 — 1문장이 `insufficient-text-match`로 정렬 거부(음원 발화는 정상, 하이라이트·문장클릭만 그 문장을 건너뜀). run: ko `20260923-064825`·en `20260923-065000`.
- 발행기는 업로드·voice_v 범프 후 자체 검증 fetch에서 간헐 타임아웃·DB 520을 낸다(zuckerberg ko v18, alex-karp ko v5·en v8). 그 경우 run의 `publish-failed.json`을 남기지만 공개 mp3 해시·타이밍 JSON·`voice_v`를 수동으로 맞춰 보고 `publish.json`으로 정정하거나, DB가 살아나면 `--apply`를 그대로 재실행한다(멱등). 공개 자산 확인은 `assets.feelandnote.com`(r2.dev는 비공개라 항상 401).
- 2026-09-23 추가: 본문 손질·음성 개선분 재발행. `peter-thiel` ko는 사용자 재편집 본문(8→7문단, "노화와 죽음조차…" 문장 개문)으로 새 run + `--reuse-from`(unit 1·5 재사용, 4개 재합성) — `voice_v` 6, 타이밍 21/21. `alex-karp`는 문단 경계 이동("그래요,…"이 3문단 첫머리)으로 ko/en 신규 run — 가이드 없는 원문 그대로 Gemini Orus 합성, en은 unit1 `sample-jump`를 p01 삭제·`--resume-run`으로 해소 — `voice_v` 19·20, 타이밍 18/18. `elon-musk`는 3문단 끝 "아침에 눈을 떴을 때…" 문장 삭제(ko/en), `mark-zuckerberg`는 3문단 "저는 친구들의…싶었습니다"와 말문단 첫 문장(agy 후보 중 "무자비한 포식자" 안) 교체 — 둘 다 `--reuse-from`으로 바뀐 unit만 재합성. 머스크 `voice_v` 11·12(33·29), 저커버그 20·21(23·23) 전량 거부 0.
- 2026-09-23 추가: 보이스별 청감 볼륨 편차(-15.9~-19.6 LUFS)를 통일했다. `voice_cleanup.py`에 `measure_loudness`·`normalize_loudness`(-16 LUFS·TP -1.5, 선형 게인+alimiter)를 추가하고 생성기 스티치 직후에 연결. 기존 발행 11본은 각 run의 `vmonologue.mp3`를 정규화해(`_backup/loudnorm/`에 원본 보존) 발행기 `--apply`로 재업로드 — 텍스트 불변이라 sourceHash·타이밍 세그먼트는 그대로이고 audioEtag만 갱신됐다. 결과 -16.4~-17.0 LUFS, voice_v: trump 61·62, musk 13·14, zuckerberg 22·23, karp 21·22, thiel 7, van-gogh 15·16. `peter-thiel` en은 공개 mp3가 깨진 스텁(27KB 비-mp3) — `voice_id_en` 미설정 상태로 발행된 적 없음.
- 나머지 인물은 아직 생성하지 않았다. 다음 대상 지시가 있으면 같은 순서로 처리한다. `voice_id_en`이 없는 인물은 en을 건너뛰고, `voice_id_ko`조차 없는 인물은 먼저 보이스를 배정해야 한다.
