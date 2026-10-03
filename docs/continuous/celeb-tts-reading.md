# 읽어보기 한영 음성 일일 작업

인물 5,501명(active 3,283 + inactive 2,218)의 한국어·영어 읽어보기 11,002개가 대상이다. 9/19부터 inactive도 생성 대상이다. DB 본문은 모두 존재한다.

## 승인된 규칙

**등록 기준은 서비스의 라인 바이 라인 포커스다.** 인물 상세에서 음성을 들을 때 읽는 문장이 차례로 켜져야 하며, 문장 타이밍이 본문과 어긋난 음원은 등록해 두지 않는다. 하루의 목표는 생성 건수가 아니라 포커스가 제대로 도는 음원만 남기는 것이다.

사용자는 Gemini·Charon 한영 샘플을 승인했고 전량 생성을 지시했다. 각 대상은 먼저 한 번씩 생성하되, 2026-09-09 추가 지시에 따라 **이미 생성한 음성은 전체 생성 완료를 기다리지 않고 검수·등록한다.** 2026-09-21 지시로 잘못된 음성은 보류하지 않고 **즉시 폐기해 pending으로 되돌려 합성 큐에 넣는다** — 재시도가 다음 회차의 미생성분과 함께 돈다. 한국어는 공백 제외 초당 6자 이상으로 맞추되 적당히 느리면 음높이를 유지해 배속 처리하고 너무 느리면 재생성한다. 영어는 승인한 영어 샘플의 속도를 기준으로 삼는다. MP3 최적화도 요청했다.

명시적으로 이름 붙은 무료 Gemini 키만 사용한다. Qwen 조사나 엔진 변경은 필요 없다. 생성·등록·불량분 재시도는 이미 승인받았다.

생성(한도 소모) → 검수(로컬 Whisper·CUDA) → 등록(R2) 순서를 한 프로세스가 맡는 현 구조를 유지한다. 한도 도달 뒤 검수에서 떨어진 음원은 그날 재생성하지 못하므로 폐기해 다음 회차 큐로 보낸다(26.09.21 지시 — 이전의 「보류로 쌓아 전량 생성 뒤 재시도」 방식을 대체한다). 생성·검수·등록 라인을 분리하거나 한도 일부를 당일 재생성에 남기는 방식은 채택하지 않았다.

## 코드와 폴더

자동 배치는 `sw/web-bo/scripts/celeb/reading-voice-batch.mjs`다. 생성·등록은 `reading-voice.mjs`, 음성 검수는 `sw/audio-bo/scripts/celeb-reading-voice-qc.py`가 맡는다. 검수·등록 스캔을 「작업 필요분」으로 좁히는 큐 생성기는 `reading-voice-work-queue.mjs`다 — 정주행(published + 최종검수 해시 일치 + timing.published + 소스·음원 해시 일치)만 빼고 전부 담는다. manifest 유실 재구축으로 생긴 로컬 파일 없는 published 스텁(26.09.21 시점 5,457개)은 검수도 폐기 점검도 못 하므로 큐에서 빠진다. 속도·인코딩·재시도 상수와 연속 실패 상한은 이 코드들이 쥔다. 등록 시 문장 따라읽기 타이밍(`celebs/{id}/voice/{ko|en}/reading.json`)을 함께 올리며, 등록분마다 manifest에 타이밍 상태가 남는다. 이미 등록된 음원의 타이밍만 다시 맞출 때는 `reading-voice-timing-backfill.mjs --publish`를 쓴다.

합성 모델은 `reading-voice.mjs`의 `MODEL`이 쥔다 — 26.09.30에 `gemini-2.5-flash-preview-tts`에서 `gemini-3.8-flash-tts`로 교체했다. 3.8은 입력 텍스트를 그대로 읽는 verbatim 모델이라 읽기 지시는 본문에 붙이지 않고 `speech_metadata.style`(parts[0] 내부)로 보낸다 — 본문에 붙인 지시문은 전부 음성으로 나와 QC에서 `unexpected-spoken-head`로 떨어진다. 응답은 기본 `audio/wav`(RIFF 헤더)라 코드는 WAV와 구형 `audio/L16` 둘 다 받는다. settings 해시는 구형 2.5 설정을 허용목록으로 인정해 기존 manifest·런 폴더를 그대로 재개한다.

현재 생성 폴더: `D:/audios/interview-cleaner/celeb-reading-voices-sample-20260908`. 기존 오디오와 검수 기록을 재사용하므로 재개할 때 새 폴더를 만들지 않는다. 합성 큐는 같은 폴더의 `reading-voice-synthesis-queue.json`이며 `celebs.id asc → ko → en` 순서로 만들어진다. 보류·등록·재사용 가능한 후보는 큐에서 빠진다. 배치 로그는 `reading-voice-batch.log`에 이어 쓰고, 배치 상태의 `partialQc`는 마지막 회차의 검수 결과다.

## 실행 방식

사용자는 PC를 매일 종료한다. **사용자가 지시할 때만 당일 분량을 실행하고 중간·종료 결과를 보고하며, 실제 진행 상황을 이 문서에 갱신한다.** 자동 예약과 한도 초기화를 기다리는 상주 프로세스를 만들지 않는다. `--wait-for-quota`는 사용하지 않는다. 생성 한도에 도달하면 배치가 확보된 음성의 검수·통과분 등록을 한 차례 수행하고 종료하며, 아래 상태 문단을 스스로 갱신한다. 다음 지시에는 미완료 생성부터 이어간다.

```powershell
node --import tsx scripts/celeb/reading-voice-batch.mjs --status
node --import tsx scripts/celeb/reading-voice-batch.mjs
```

배치는 하네스의 백그라운드 작업으로 띄우지 않는다. 하네스는 메모리가 부족하면 백그라운드 작업을 강제 종료한다(2026-09-11 실측, `sw/web` 개발 서버가 10 GB를 쓰는 상태). `sw/web-bo`에서 PowerShell `Start-Process`로 독립 실행하고 PID를 기록해 그 PID만 끈다. 종료 감시는 로그 tail 파이프가 아니라 30초 폴링으로 배치 상태 파일과 PID를 본다.

중단 사유별 대응: `FREE_KEYS_EXHAUSTED: daily`는 정상 종료다. `Could not recheck current DB source`는 DB 일시 장애로 연속 실패 상한에 걸린 것이라 바로 재시작하면 이어진다. 파이프라인은 항목마다 임시 파일 후 교체로 체크포인트를 남기므로 강제 종료돼도 확보분은 재사용된다.

한도 소진 순간에는 진행 중이던 항목에 「wav 없는 attempt + FREE_KEYS 오류」 레코드가 남는다. 과거 wav는 있지만 전부 재사용 불가인 엔트리가 이 레코드를 가지면, 다음 검수 스캔이 그 행에서 오래된 FREE_KEYS 오류를 새 오류로 던져 전체를 중단시켰다 — 26.09.21에 `eugene-fama/en`·`ruben-ostlund/en` 2건으로 실발. 코드를 고쳐(attempt 오류 중 쿼터 오류는 마지막 오류로 던지지 않음) 재발을 막았고, 기존 2건은 manifest에서 wav 없는 attempt를 지워 정주행시켰다. 중단 뒤 프로세스가 안 끝나면 QC 워커의 10분 타임아웃(QC_TIMEOUT_MS) 대기 중인 것이니 기다리거나 python 자식을 정리하면 된다 — 교착이 아니다.

`--queue-file`은 26.09.13 이전까지 파서 키 불일치(`result['queue-file']` 대 `result.queueFile`)로 조용히 무시됐고, 합성 단계가 큐 대신 전체를 대상으로 삼았다. 고친 뒤로는 **합성 단계가 큐에 있는 항목만 합성한다.** `pending`으로 되돌린 항목은 반드시 합성 큐에 넣는다. 검수·등록 단계는 큐를 받지 않고 전체를 훑는다. 큐를 넘길 때는 `--dry-run`으로 `queuedFiles`가 큐 건수와 같은지 먼저 확인한다 — Git Bash 경로(`/c/...`)를 넘기면 Node가 파일을 못 찾아 다시 무시된다.

R2 음원을 교체할 때 파이프라인이 이전 파일을 `_backup/<id>/<locale>/`에 자동 저장한다. 백업은 남기지 않으므로 등록을 검증한 뒤 지운다.

생성 없이 확보된 음성만 검수·등록할 때는 다음 명령을 쓴다.

```powershell
node --import tsx scripts/celeb/reading-voice.mjs --all-active --locales ko,en --publish --existing-only --concurrency 3 --device cuda --run D:/audios/interview-cleaner/celeb-reading-voices-sample-20260908
```

등록분이 수천 개가 넘어가면 전량 순회의 등록분 재검증(R2 GET + timing PUT, 건당 ~1초)이 지배적 비용이다. 26.09.21부터 일상 회차는 작업큐로 좁혀 돌린다 — 합성이 끝난 뒤 큐를 만들고 검수·등록에 넘긴다.

```powershell
node --import tsx scripts/celeb/reading-voice-work-queue.mjs --run $run --out "$run\reading-voice-work-queue.json"
node --import tsx scripts/celeb/reading-voice.mjs --all-active --include-inactive --locales ko,en --run $run --publish --existing-only --concurrency 3 --device cuda --python $py --queue-file "$run\reading-voice-work-queue.json"
```

전량 순회는 manifest 의심·대규모 폐기 직후 등 감사가 필요할 때만 돌린다.

## 키 관리

무료 키는 `sw/remotion/.env`와 `sw/web-bo/.env`의 `GOOGLE_GENAI_API_KEY_FREE<n>`이며 파이프라인은 이름을 숫자 정렬한 배열로 돌린다. 로그의 `key-disabled` 이벤트 `keyIndex`는 이 배열의 0부터 세는 순번이라, 무효 키(`API_KEY_INVALID`)는 `googleFreeKeyName(keyIndex + 1)`로 변수 이름을 특정한 뒤 두 파일에서 지운다(순번과 변수 번호가 다를 수 있다 — `FREE11~19`가 비어 있다). 2026-09-11에 17번을, 2026-09-14에 무효 키 16번과 프로젝트가 정지(`CONSUMER_SUSPENDED`)돼 403을 내던 11~15·18·19번을 지워 90개가 남았다. 2026-09-15에 ykj 묶음 AQ(Auth) 키 10개를 `FREE100~109`로 양쪽에 추가해 100개가 됐다. `web-5`·`web-6`·`web-7` 묶음은 발급 즉시 정지라 적용하지 않았다. 같은 날 `web-bo`의 `FREE20` 중복 줄도 정리했다. 키 상태는 생성 호출 없이 모델 조회(`GET v1beta/models/<모델>`)로 가른다 — 한도를 쓰지 않고, 로그 순번을 변수 이름으로 되짚지 않아도 된다.

## 들숨·쉼 정리

들숨 제거와 쉼 정리의 규칙·구현·적용 지점은 [`prod-04-voice-cleanup.md`](../project/production/prod-04-voice-cleanup.md)가 쥔다. 여기에는 읽어보기 음성에만 해당하는 것을 적는다.

- `reading-voice.mjs`가 attempt wav를 채택한 직후, 후보 인코딩과 검수 전에 공용 정리(`reading` 프로필)를 부르고 `-clean.wav`로 바꿔 끼운다. 파일 이름(`-clean`·`-nbt`)으로 시도마다 한 번만 정리한다. 합성 전용 단계의 속도 판정은 정리 전 wav로 하므로, 정리하면 기준을 넘길 음원이 느리다고 판정돼 재생성될 수 있다.
- **mp3가 아니라 원본 attempt wav에 적용한다.** 등록 mp3를 풀어 다시 압축하면 2세대 손실 압축이 되고, 파이프라인 표준(`reading-voice.mjs`의 `MP3_SETTINGS`)과 비트레이트도 어긋난다. 26.09.13에 mp3에 적용했다가 96kbps 처리본 343건이 R2에 올라가 wav 경로로 다시 처리했다. wav를 정리해 `attempt.wav`·`wavHash`를 바꾸고 `entry.mp3`·`mp3Hash`·`finalQcHash`와 `candidateMp3`, attempt의 판정 기록(`status`·`qc`·`finalQc`·`qcScriptHash`·`processingHash`·`speed`)을 비우면 파이프라인이 wav부터 다시 검수·인코딩·등록한다. **판정 기록을 남기면 wav를 바꿔도 이전 판정을 그대로 재사용해 정리·검수를 건너뛴다**(26.09.14 파이프라인 실전 시험에서 확인).
- 등록분을 다시 정리해 올릴 때 R2 교체는 replace-first다 — 새 음원이 올라가기 전에 구 음원을 내리지 않는다.
- 정리 뒤에도 검수에서 떨어지는 경우는 둘이다. 끝에 발화 수준의 웅얼거림이 남은 `untranscribed-audio-tail`은 정리가 발화를 자르지 않으므로 풀리지 않아 재생성으로 보낸다. 원래 등록돼 있던 음원이 정리 뒤에만 떨어지면 R2에서 서비스 중인 이전 음원으로 manifest를 되돌린다. R2 공개 주소는 파이썬 기본 User-Agent 요청을 403으로 막으므로 브라우저 User-Agent를 붙여 받는다.
- `celeb-reading-voice-qc.py`의 `LONG_PAUSE_SECONDS`·`TARGET_PAUSE_SECONDS`는 들숨이 쉼 자리를 메우던 시절 값(0.75·0.45초)이라 들숨을 지운 음원을 전부 `pause-repair-required`로 걸었다. 26.09.13에 문장 사이 기준(1.2·1.05초)으로 올렸다. 이 플래그는 결함 판정이 아니라 「쉼을 줄이는 수리가 필요한데 출력 경로가 없어 못 했다」는 상태 표시다.

## 검수 실패분 폐기

26.09.21부터 검수 불합격(held)·처리 실패(failed)는 구분 없이 그 회차에 폐기한다 — 파일을 지우고 엔트리를 `pending`으로 되돌려 합성 큐에 넣는다. manifest에 `held`·`failed`가 누적되지 않는 것이 정상이다. 실행은 `scripts/celeb/_scratch-reading-discard-unsettled.mjs`(dry-run → `--apply`)가 맡는다 — 디렉터리를 `_backup/discard-unsettled-<시각>/`으로 옮기고 엔트리를 최소 필드로 정리한 뒤 큐에 투입하며, 검증 후 백업을 지운다. 폐기 사유 감사는 `_backup/discard-unsettled-audit-<시각>.json`에 남는다.

검수 플래그의 의미(재발 패턴 진단용): `pause-repair-required`·`untranscribed-audio-head/tail`·`unexpected-spoken-head/tail`·`long-mid-sentence-pause`·`non-silent-sentence-pause` 등은 쉼·웅얼거림 계열, `source-content-gap`·`low-match`·`unexpected-spoken-content`·`sample-jump`·`missing-source-*` 등은 원문 누락·없는 말·파형 튐 계열이다. 과거에는 전자를 들숨 제거·쉼 정리로 살렸으나(26.09.13 실측 살림 시험 10건 중 8건 등록) 지금은 전부 재생성으로 보낸다.

## 폐기와 복귀 — 매 회차 절차

배치가 끝나면 매번 등록분의 문장 타이밍을 점검해 어긋난 것을 내리고 대기로 되돌린다. 판정 기준은 `segments < sentences`이며 manifest의 `timing`에 두 값이 있어 집계만 할 때는 manifest를 직접 읽어도 된다. 폐기 전 원본 대조는 active·inactive를 모두 허용한다(`currentSource`에 include-inactive 전달) — active만 보던 시절의 검사는 inactive 등록분에서 STALE_SOURCE로 멈췄다(26.09.20). 최종 검수 기록이 등록 mp3와 맞지 않아 타이밍을 만들 수 없는 등록분(`TIMING_REQUIRES_FINAL_MP3_QC` 등)도 문장 강조를 보장하지 못하므로 폐기 대상에 넣는다. 26.09.14 이전에는 이런 한 건이 점검 전체를 멈췄다.

```powershell
node --import tsx scripts/celeb/reading-voice-discard-unresolved.mjs            # dry-run 점검
node --import tsx scripts/celeb/reading-voice-discard-unresolved.mjs --discard  # R2·DB에서 내린다
node --import tsx scripts/celeb/reading-voice-reset-discarded.mjs               # dry-run 복귀 계획
node --import tsx scripts/celeb/reading-voice-reset-discarded.mjs --apply       # pending 복귀와 큐 투입
```

폐기하면 항목이 `held`로 남고 음원 파일은 백업으로 옮겨져 경로 필드만 남는다. 파이프라인은 이 자리를 「이미 만든 자리」로 보아 재생성하지 않으므로 복귀를 반드시 이어서 한다. 복귀는 배치가 멈춘 상태에서만 돌고, 대상 판정은 필드 유무가 아니라 **음원 파일 실존**으로 한다 — 필드로 판정하면 폐기분을 전부 건너뛴다. 복귀 스크립트는 가장 최근 `discard-audit.json`을 자동으로 집으므로 폐기 직후에 실행한다.

백업은 남기지 않는다. 복귀와 검증이 끝나면 그 회차의 `_backup/removed-timing-unresolved-<시각>/`을 지운다.

원고가 개편돼 manifest의 `sourceHash`와 현재 DB 본문이 대량으로 어긋나면(`Source changed for …` 중단) `scripts/celeb/_scratch-stale-source-discard.mjs`(dry-run → `--apply`)이 manifest 전체를 현 DB와 대조해 stale 등록분을 R2·로컬에서 백업 후 내리고 pending으로 재큐한다. R2 오브젝트가 이미 현행 소스 해시와 같으면 스텁으로 유지한다.

## 현재 도달점

<!-- reading-voice-status:start -->
2026-10-01 05:05 KST 확인: `gemini-3.8-flash-tts` 전환 후 첫 회차. 원고 개편으로 소스 해시가 어긋난 3,501건을 폐기·재큐했고(777건은 R2 음원이 이미 최신이라 유지), 구 프롬프트 오염분 944건 검수에서 942건이 지시문 발화로 떨어져 전량 폐기·복귀했다. 신스키마로 24건 재합성해 7건 등록(rm/ko, satoru-iwata/en, gedik-ahmed-pasha/en, mathias-ortmann/ko, cch-pounder/ko, taika-waititi/ko, sobeoldori/ko). 잔여 17건은 QC 불합격으로 폐기·복귀. 100개 키 전량 소진(90 daily, 10 forbidden) — 다음 리셋 10-01 16:02 KST. manifest: 정상 등록 6,560, pending 2,446(전부 음성 미보유), 보류·실패 0. 합성 큐 2,940행 + inactive 큐 2,348행이 다음 회차 대상.
<!-- reading-voice-status:end -->

3.8 전환 후속 정비(26.10.01): `reading-voice.mjs`는 모델 계열별 실행을 `ENGINE_25`/`ENGINE_38`으로 완전 분리했다 — `TTS_ENGINES` 표에 모델을 넣어 전환하며 미등록 모델은 즉시 에러다. `celeb-reading-voice-qc.py`는 v5로 올려 차용어 표기 차이를 양성 처리한다 — 원문의 영어 단어를 3.8이 영어로 읽으면 Whisper가 한글로 받아써(physical↔피지컬) 문자 diff가 `source-content-gap`으로 오인되던 문제다. 라틴↔한글 단어 교환(replace, 길이비 0.2~1.5)만 무시하고 지어낸 꼬리·실제 누락·insert/delete는 그대로 불합격이다. 폐기분 재검증: 신 QC로 18건 백업의 원문·전사를 대조해 14건이 정합, 4건(환각 꼬리·괄호 영문 누락·실제 삽입)만 불량으로 남았다. 의심 구간 스펙트로그램 도구는 `sw/audio-bo/scripts/_scratch-spectro-review.py`, 산출물은 `_backup/spectro-review/`다.

다음 회차 첫 작업(한도 리셋 후): ① 단위 테스트 — `node --import tsx scripts/celeb/reading-voice.test.mjs` + `python sw/audio-bo/scripts/test_celeb_reading_voice_qc.py`. ② 소량 파일럿 — 합성 큐로 `--synthesize-only --single-pass`를 돌려 20건 안쪽에서 멈추고 바로 검수·등록해 통과율을 본다. ③ 통과율이 높으면 전량 큐 투입, 낮으면 실패 사유를 나눠 QC 재조정 또는 모델 재검토. ④ 폐기 백업 회수 — `_backup/discard-unsettled-2026-09-30T20-02-24-766Z/`의 디렉터리를 원위치로 되돌리고 엔트리를 `pending`+기존 attempt 필드로 되살리면 신 QC가 한도 소모 없이 재검수·등록한다(문자 정합으로 확인된 14건). FREE61~70은 3.8에서 403이라 두 `.env`에 주석을 달았다.

웹의 읽어보기 듣기 버튼, MP3 우선 재생, 문장 강조는 개발 서버에서 사용자가 확인했다(다케다 신겐·오다 에이이치로). 운영 웹 코드 배포는 아직 하지 않았다.

9/19부터 사용자 지시로 **inactive 인물도 생성 대상**이다. `reading-voice.mjs`에 `--include-inactive`를 넣어 `targets`·`currentSource`의 active 전용 가드를 푼다. inactive 합성 큐는 `inactive-missing-items.json`에 있으며, 단계별 실행은 `--queue-file`로 큐를 넘기는 같은 명령에 이 플래그만 붙인다.

manifest 유실 재구축의 안전장치 두 개가 코드에 들어갔다. ① `--generate --publish` 단계에서 로컬 파일 없는 `published` 항목은 R2를 HEAD로 확인해 음원이 살아 있으면 건너뛰고(`remote-published`), 없으면 `pending`으로 되돌려 재생성한다. ② `reading-voice-discard-unresolved.mjs`는 로컬 mp3가 있는 등록분만 검사한다 — 프라이밍 스텁은 타이밍 재구축이 불가해 건드리면 R2 오브젝트를 잘못 내린다. 감사·큐·프라이밍 스크립트는 `scripts/celeb/_scratch-reading-audio-audit.mjs`, `_scratch-reading-queue-build.mjs`, `_scratch-manifest-prime-r2.mjs`다.

`tony-an`(f530fa53…)/ko는 음원이 등록돼 있고 QC도 통과하지만 H.O.T·J.T.L 약어 때문에 문장 정렬이 0건으로 타이밍을 만들지 못해 `unavailable`로 남았다. 같은 본문을 재생성해도 같은 벽이라 재생성 대상이 아니라 정렬 규칙 검토 대상이다.

보류의 대부분은 합성이 원문을 빼먹거나(`source-content-gap`) 없는 말을 넣은(`unexpected-spoken-content`) 경우다. 예전에 같은 사유로 폐기된 원고를 다시 만든 회차는 보류 비율이 높았다(9/14 회차 44%, 등록분 강조 불일치 19.5%). 정리 전 원본과 정리본을 같은 검수에 돌린 12건 중 11건이 같은 사유로 떨어져 들숨·쉼 정리가 원인이 아님을 확인했다. 26.09.21부터 실패분은 보류하지 않고 즉시 폐기해 다음 회차 합성 큐에서 다시 만든다.
