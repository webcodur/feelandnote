# 세력 개요 한영 음성 작업

`faction_lv2.description`·`description_en`의 한국어·영어 내레이션이다. 신화(`is_myth=true`) 38개부터 시작했고, `--all`로 세력 전체를 돌릴 수 있다. 대상이 생기면 같은 명령을 다시 돌려 이어간다.

## 규칙

인물 읽어보기 음성([`celeb-tts-reading.md`](celeb-tts-reading.md))과 같은 파이프라인·같은 승인 규칙을 따른다. Gemini Charon 무료키 합성 → 로컬 Whisper·CUDA 검수 → 속도 정책(한 초당 6자·영 분당 156단어) → R2 등록을 한 프로세스가 맡는다. 검수 불합격은 재시도하고 연속 실패 상한에 걸리면 중단한다 — 폐기·복귀 절차는 읽어보기 문서를 따른다.

차이는 두 가지다. ① `faction_lv2`에는 `voice_v`가 없으므로 캐시 버스터는 `?v={mp3Hash 앞 12자}`다. ② 웹이 음원 존재를 DB에서 읽지 않고 고정 R2 경로의 타이밍 JSON(`description.json`)을 받아 판단하므로 발행 뒤 웹 캐시 무효화를 하지 않는다. 다만 **개요 본문을 DB에서 고치면** 음원·타이밍과 sourceHash가 어긋나 플레이어가 자동으로 숨는다 — 본문 수정 시 factions 태그 revalidate와 음원 재생성이 세트다.

긴 개요는 문장묶음 합성으로 만든다 — `desc-unit-stitch.mjs`가 문장을 3~6개 묶은 유닛별 합성을 지시하고, 유닛 사이를 룸톤 쉼(문단 이음 1.0초·문장 이음 0.45초)으로 잇는다. `celeb-monologue-voice-generate.py`와 같은 설계로 한 번의 긴 합성 끝이 무너지는 것을 막는다. QC가 삽입된 문단 쉼을 긴 쉼 고장으로 잡으면 쉼 안에만 있을 때 통과로 읽는다(`qcGapVerdict`). 텍스트가 바뀌면 새 `--run` 디렉터리를 쓴다 — manifest의 sourceHash가 다르면 기존 폴더는 오류로 멈춘다.

합성 엔진은 유닛마다 다른 속도로 읽는다 — 파일 평균 속도만 맞추면 재생 중 빠르기가 흔들리므로 각 유닛을 목표 속도에 개별로 맞춘다(`normalizeUnitSpeed`, `-norm.wav`). 단, 유닛 통째 `atempo`는 문장 간 쉼도 같은 비율로 압축해 발음이 달라붙으므로, `normalizeUnitSpeed`는 PCM을 발성·쉼 구간으로 나눠 **발성 구간만 배속하고 쉼은 원래 길이를 보존**한다(파일 총길이는 목표와 동일). 기존 발행분을 유닛 wav 재사용으로 재정규화할 때는 `desc-speed-normalize.mjs`(manifest의 mp3를 바꾸고 status='ready' → 이어서 `--publish`가 R2 업로드·타이밍 재발행), QC 경계선에서 떨어진 건 `desc-speed-normalize-retry.mjs`(유닛 템포 미세 지터로 다른 파형을 만들어 재검수)를 쓴다. QC의 내부 공백 판정(en 12자)이 숫자 표기 차이(「three thousand」↔「3,000」)에 걸리는 것은 `celeb-reading-voice-qc.py`의 `expand_digits`가 숫자를 발화 단어로 펼쳐 양쪽을 맞춰 해결한다 — ko는 한국어 수사(삼천·십이만…), en은 영어 수사(three thousand·nineteen ninety two 연도식 포함). 정렬·문장부호 좌표·단어 스팬이 모두 같은 확장 좌표계를 쓰므로 본문 표기를 고칠 필요가 없다.

## 코드와 폴더

- 생성·검수·등록: `sw/web-bo/scripts/faction/faction-desc-voice.mjs` — `scripts/celeb/reading-voice.mjs`의 합성·검수·체크포인트 구현을 import한다. 속도·인코딩 상수는 그쪽이 SSoT다.
- 음성 검수: `sw/audio-bo/scripts/celeb-reading-voice-qc.py`(공용, 인물 검수와 동일)
- 문장 타이밍: `reading-voice-timing.mjs`의 `publishReadingTiming`을 `audioKey` 오버라이드로 재사용
- R2 경로: `factions/{id}/voice/{ko|en}/description.mp3` + `description.json` — 스크립트의 `factionDescR2Key`가 원천
- 실행 폴더: `D:/audios/interview-cleaner/faction-desc-voices`(manifest·체크포인트 — 재개 시 같은 폴더)

## 실행

```powershell
node --import tsx scripts/faction/faction-desc-voice.mjs --myth --dry-run
node --import tsx scripts/faction/faction-desc-voice.mjs --myth --generate --publish --concurrency 3 --device cuda
node --import tsx scripts/faction/faction-desc-voice.mjs --all --generate --publish --concurrency 3   # 세력 전체
node --import tsx scripts/faction/faction-desc-voice.mjs --slug myth-japan --locales ko --generate --publish
```

`--myth`·`--all`·`--slug` 중 하나만 지정한다. 미공개 신화도 생성 대상이다 — 음원은 공개 R2에 있지만 화면이 링크하지 않으므로 노출되지 않고, 신화 공개 시 음원이 바로 쓸 수 있다.

## 현재 도달점

<!-- faction-desc-voice-status:start -->
2026-09-24 v2 전면 재생성 + 쉼-보존 유닛 속도 정규화 완료 — 신화 개요 38개를 통찰-우선 3문단 규격으로 재작성해 DB 반영하고, 문장묶음 분할+룸톤 스티치(`desc-unit-stitch.mjs`)로 음원을 전량 재합성했다(run: `faction-desc-voices-v2`). 유닛별 속도 흔들림(en 최대 34wpm)을 1차 재정규화로 잡은 뒤, 통째 `atempo`가 문장 간 쉼까지 압축해 발음이 달라붙는 문제를 발성 구간만 배속하는 쉼-보존 정규화(`normalizeUnitSpeed` PCM 경로)로 바꿔 76건 전량 재생성·재발행 — 최종 ko ~6.01cps, en ~156.15wpm이며 유닛 내부 쉼 길이는 원본과 ±0.03초. QC `expand_digits` 패치로 숫자↔수사 표기 오탐(「3,000」↔「three thousand」)을 근본 해소해 gojoseon/en·fengshen/ko·jeju-bonpuri/ko 경계 실패 3건을 채택 스크립트(`_adopt-qc-pass.mjs`)로 회수했다. manifest `published` 76, 타이밍 `description.json` 76. 이후 신규 실존 팩션 2개(영생을 찾아서·특이점이 온다 — is_myth=false, 개요는 기존 세력 규격의 짧은 1문단)의 ko/en 음원 4건도 `--slug`로 같은 경로를 타 발행했다 — 짧은 개요는 유닛 분할 없이 단일 합성으로 처리된다. 다음 배치는 `--all`로 세력 전체를 돌리면 된다.

웹 부착: 일반 세력과 신화 개요는 공용 `sw/web/src/components/features/user/explore/myth/MythOverview.tsx`의 낭독 UI를 쓴다. 타이밍 존재·sourceHash 대조는 `useFactionDescVoice`가 맡고, 문장 강조·문장 눌러 재생은 개요 전문 모달에서 제공한다. 음원이 없으면 소개문만 보인다. 인물 상세 `관계 → 세력도감`의 `FactionMembershipCard.tsx`도 같은 조합이다 — 컨트롤은 항상, 강조 본문은 잘리지 않는 짧은 개요는 곧바로·긴 개요는 「더 보기」 뒤에 선다(접힌 미리보기는 line-clamp 평문 유지). 재생이 시작되면 잘린 긴 개요가 스스로 펼쳐져 강조가 보인다. 카드 쪽 조작 그룹은 aria-label에 세력명을 붙여 인물 자체 읽어보기 그룹과 구분한다(ReadingNarrationControls의 `label` prop). `useClipped`는 `useLayoutEffect`로 재서 첫 프레임 깜빡임이 없다. 인물 탭의 세력 배정은 비신화 소속만 뜬다(getCelebBySlug의 설계) — 신화 인물은 신화 화면이 담당한다.

운영 주의: 인물 배정을 새로 넣으면 인물 상세 캐시(`celebs:<slug>`·`*:__all__` 상세 태그)가 낡는다 — bare `factions`/`celebs` 태그 revalidate는 목록만 비우고 상세는 안 닿는다. 배정·세력 자료 전량 변경 후에는 `/api/revalidate/v2`로 `factions:__all__`(+필요 시 `celebs:__all__`)까지 비운다.
<!-- faction-desc-voice-status:end -->
