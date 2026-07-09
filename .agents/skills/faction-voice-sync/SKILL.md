---
name: faction-voice-sync
description: 팩션(세력도, factions/) 음성 후처리 — 받아쓰기(WhisperX --faction)와 발화 시각 산출(voice:faction-align)로 인물 대사의 의미 덩어리별 발화 시각(data.timing.<locale>.json)을 만들어 자막 페이지 전환·글자 점등을 음원에 맞춘다. 팩션 음성 합성(pnpm voice:faction) 이후, 또는 대사·quoteChunks(의미 덩어리)를 바꾼 뒤 호출. "팩션 음성 동기화", "팩션 파이프라인", "팩션 발화 시각", "팩션 sync", "팩션 자막 타이밍", "팩션 점등 맞춰줘" 등으로 호출. 북리커맨드 remo-voice-sync와 별개다(factions/ 구조·2단계·의미분할 없음). /faction-voice-sync <에피소드> 로 실행.
---

# Faction Voice Sync — 팩션 발화 시각 산출

팩션 음성 파이프라인의 후처리 2단계를 순차 실행하는 단일 진입점. 결과물 `data.timing.<locale>.json` 이 생기면 렌더(Faction.tsx)가 자동으로 실제 발화 시각을 써서 **자막을 의미 덩어리 단위로 페이지 전환하고 글자를 점등**한다. 없으면 글자수 비례 폴백으로 동작한다.

## 북리커맨드(remo-voice-sync)와의 차이

| | 북리커맨드 | 팩션 |
|--|--|--|
| 경로 | `episodes/<인물>/` | `public/factions/<에피소드>/` |
| 인자 | `--episode <인물>-ko` + `--long`/`--shorts` | `--episode <폴더명>` + `--faction` / `--lang` |
| 단계 | 3 transcribe → 4 align → 5 **chunk(LLM 의미분할)** | transcribe(--faction) → faction-align **2단계** |
| 의미 단위(sub) | 5단계가 LLM으로 분할 | `data.json` 의 `quoteChunks` 가 곧 sub (사람이 미리 끊어둠) |

**핵심**: 북리커맨드처럼 LLM이 자동 분할하는 별도 단계는 없다. 대신 의미 덩어리(`quoteChunks`)는 **Step 0 에서 Claude 가 손으로 끊는다**. 이 스킬은 그 덩어리에 발화 시각을 입힌다(Step 1·2).

## 사전 조건

- `public/factions/<에피소드>/data.json` 존재. 대사 인물에 `quote`(통대사) 채워짐. `quoteChunks` 는 Step 0 에서 끊는다.
- `public/factions/<에피소드>/voice/*.wav` 존재(`pnpm voice:faction` 으로 합성됨).
- wav 파일명 = 인물 자리 stem(`F01C01P01-quote.wav` 등). `vnPersonQuote` 규칙.

## Step 0: 청크(quoteChunks) 분리 — Claude 수동

각 대사 인물의 `quote`(통대사)를 발화 호흡·의미 단위로 끊어 `quoteChunks` 배열로 채운다(영문판은 `quoteEnChunks`). faction-align 이 이 덩어리별로 발화 시각(`subTimings`)을 산출하고, 렌더(Faction.tsx)가 그 시각에 맞춰 **글자를 점등**하고 분량이 넘치면 **페이지를 전환**한다.

**왜 끊나** — `quoteChunks` 가 1덩어리(또는 미작성)면 faction-align 이 `subTimings` 를 못 만들고, 렌더가 글자수 비례 폴백으로 점등해 음원과 어긋난다. 호흡 단위로 끊어 두면 덩어리마다 실제 발화 시각이 박혀 점등이 음원에 정확히 붙는다. 짧아서 한 페이지에 다 들어가는 대사도 끊어 두는 게 이득이다(페이지 전환은 안 생겨도 점등이 정확해짐).

**분리 규칙**
- **원문 verbatim 보존**. 의미 경계에서 끊기만 한다. 단어를 빼거나 고쳐 쓰지 않는다(축약·재작문 금지 — 메모리 `feedback_faction_quote_terse_not_abbreviation`).
- 끊는 단위는 **구·절(의미 단위)로 잘게**다. **문장을 통째로 한 덩어리에 두지 않는다** — 주어구·목적어구·술어구·부사절 경계에서 쪼갠다. 덩어리당 대략 **6~20자**가 기준(쉼표·조사구 단위). 예) `인간은 자유롭게 태어났지만` / `어디서나 사슬에 묶여 있다.`, `해결책은 없다.` / `무언가를 얻으려면` / `무언가를 내줘야 한다.`
- 입도가 의심되면 **기존 다덩어리 인물(또는 11·09편 등 완성 에피소드)의 청크를 본보기로** 맞춘다. 통문장 덩어리는 "너무 크게 잘랐다"는 신호다.
- 덩어리들을 공백으로 이으면 원래 통대사와 같아야 한다(`chunks.join(' ') === quote`). 단어가 어긋나면 align 의 단어 매칭이 깨져 `subTimings` 가 생략된다.
- 잘게 끊는 1차 효과는 **점등 정밀도**다 — 덩어리마다 실제 발화 시각이 박혀 글자가 구·절 단위로 음원에 또박또박 붙는다. **화면 페이지 전환은 별개**다: 분량이 한 페이지(가로 73자/세로 68자)를 넘어야 자동 전환되고, 그보다 짧으면 잘게 끊어도 한 페이지로 다시 묶인다. 페이지를 강제로 넘기려면 빈 문자열(`""`) 덩어리를 경계로 넣는다(연속 개행 = 페이지 경계).

분리 후 **Step 2(faction-align)만 다시 돌리면 된다** — 음원을 안 바꿨으면 Step 1(전사)은 불필요(전사는 음원 기준).

## 인자 규약

- `--episode <폴더명>` — 예 `01-llm`. **locale 접미사(-ko/-en) 없음**(북리커맨드와 다름).
- `--part <N>` — **편(쇼츠 편) 번호. faction-align 에서 필수**. 그 편 세력(`group.part`) 인물만 처리하고 산출을 `data.timing.p<N>.<lang>.json` 으로 분리 저장한다. 전사(`3-transcribe`)도 같은 편만 받아쓴다. **에피소드는 편으로 나뉘므로 항상 편을 지정해 그 편만 돌린다**(다른 편 파일·작업을 안 건드린다). 편 구성은 `data.json` 의 `group.part` · `subtitleByPart` 로 확인한다.
- `--lang ko|en` — 기본 `ko`.
- `--only <stem-부분일치,…>` — 특정 인물만. 콤마 다중. 예: `--only F03C01P01`.
  - **변경 인물만 좁혀 실행**(필수 원칙): 사용자가 "한 인물만 바꿨다"고 알리면 `--only` 로 좁힌다.

## Step 1: 받아쓰기 (transcribe)

**기본값 — 파이프라인 재실행 시 받아쓰기부터 항상 다시 밟는다.** 유저가 "파이프라인 다시 돌려/sync"라고 하면 전사(Step 1)를 반드시 포함한다. 파일 수정시각(mtime) 비교로 "음원 안 바뀐 것 같다"며 전사를 **임의로 건너뛰지 않는다**. 이 프로젝트는 들숨 제거 등 오디오 크롭·수정이 잦아 전사가 쉽게 낡고(크롭 전 긴 오디오 기준 단어시각이 남음), 그러면 얼라인 경계선이 파형과 어긋난다(자막 위치를 아예 못 잡음). 전사 생략은 **유저가 "받아쓰기 생략"/"얼라인만"/"오디오 그대로"라고 명시할 때만**. (예외: Step 0 처럼 텍스트 청크만 바꾸고 음원을 확실히 안 건드린 경우엔 얼라인만 — 아래 Step 0 말미 참조.)

**스테일 진단**: 의심되면 wav 실제 길이와 `voice/2-word-timings.json` 의 해당 stem 마지막 단어 `end` 를 비교한다. 불일치(예: wav 23.86s 인데 단어 끝 24.75s)면 전사가 낡은 것 — 다시 받아쓴다.

WhisperX 단어 타이밍 추출. **`python` 이 아니라 `py` 런처로 실행한다** — 에이전트 셸의 기본 `python` 은 whisperx 가 없는 격리 venv(hermes-agent)를 가리키고, whisperx 는 시스템 Python(`py`, 예: Python312)에 설치돼 있다.

```bash
# 그 편 전체
py scripts/voice/3-transcribe.py --episode <에피소드> --faction --part <N> --lang ko
# 그 편의 특정 인물만
py scripts/voice/3-transcribe.py --episode <에피소드> --faction --part <N> --lang ko --only F03C01P01
```

- 출력: `public/factions/<에피소드>/voice/2-word-timings.json` (키 = wav stem, 기존 결과 보존+병합)
- 텍스트는 `data.json` 의 인물 대사(원문, 발화 스타일 prefix 제외)에 매핑된다.

## Step 2: 발화 시각 산출 (faction-align) — Claude 실행

```bash
# 그 편 전체
pnpm voice:faction-align -- --episode <에피소드> --part <N> --lang ko
# 그 편의 특정 인물만
pnpm voice:faction-align -- --episode <에피소드> --part <N> --only F03C01P01
```

- 입력: `voice/2-word-timings.json` (Step 1 산출). 없으면 에러로 중단하고 Step 1 을 안내한다(조용한 폴백 금지). `--part` 미지정 시 에러(편별 산출 강제).
- 출력: `public/factions/<에피소드>/data.timing.p<N>.<lang>.json` (편별 분리). 렌더 로더가 한 에피소드의 편별 파일을 모두 읽어 병합한다.
  - 구조: `{ "<stem>": [{ start, end, text, sub: 덩어리[], subTimings: 경계시각[], words }] }`
  - `sub` = `quoteChunks`. `subTimings` = 덩어리 경계 발화 시각(단어 타이밍에서 산출). 덩어리 수와 단어 매칭이 어긋나면 `subTimings` 생략(렌더가 구간 내 글자수 비례로 점등).

## Step 3: 검증·보고

- `faction-align` 로그 확인: `N개 기록 · M개 건너뜀`. 건너뜀(단어 타이밍 없음)은 그 인물 wav 전사가 누락된 것 — Step 1 을 `--only` 로 보강.
- `data.timing.<lang>.json` 이 생겼으면 렌더가 자동으로 실제 시각을 쓴다(재작업 없음). Remotion Studio `Faction-<KEY>` 에서 점등·페이지 전환이 음원과 맞는지 육안 확인을 사용자에게 권한다.

## 흔한 함정

- **`python` 직접 호출 금지** — 에이전트 기본 `python` 은 whisperx 없는 격리 venv(hermes-agent)다. 전사는 반드시 `py` 런처(시스템 Python, whisperx 설치본)로 실행한다. `ModuleNotFoundError: whisperx` 가 뜨면 `python` 으로 호출한 것 — `py` 로 바꾼다.
- **편(`--part`)을 항상 지정** — 에피소드 전체를 한 번에 돌리지 않는다. faction-align 은 `--part` 없으면 에러다. 1편 작업이 2편 `data.timing.p2.*.json` 을 안 건드리도록 편마다 따로 실행한다. 음원이 그 편 일부만 합성됐으면 합성된 인물만 산출되고 나머지는 렌더 폴백으로 남는다(정상).
- **여러 편이면 모든 편을 빠짐없이 돌린다 (편 누락 = 옛 캐시 방치)** — 세력에 `group.part` 가 있으면(예 1편 G1~G3, 2편 G4~G6) 작업 시작 전 편 목록을 먼저 확인하고(`group.part`), **전사·정렬을 편마다 각각** 밟는다(`--part 1`, 그다음 `--part 2` …). `--part 1` 만 돌리고 2편을 잊으면, **2편 인물(예: 마지막 세력의 두로프 F06C01P02)은 전사가 아예 안 돼 `voice/2-word-timings.json` 에 편 나누기 전 옛 대사 캐시가 남고, 자막이 옛 대사 기준으로 통째로 어긋난다.** 자막이 "전혀 안 맞는다" 신고의 흔한 원인. 진단: 전사 텍스트(`targets[stem]` 단어 join)와 자막(`quoteChunks` join)을 글자로 대조 — 내용·순서가 다르면 그 인물이 엉뚱한 편에서 옛 캐시로 처리된 것이다.
- **한 인물만 다시 할 때 `3-transcribe.py --only` 를 쓰지 말 것** — `--only` + `--part` 조합이 그 편에 없는 인물이면 0개 매칭돼 그 인물 전사가 갱신되지 않는다. 전사는 그 편 전체(`--only` 없이), 좁히는 건 `voice:faction-align -- --only` 로 align 단계에서만.
- `--episode` 에 locale 접미사(-ko/-en)를 붙이면 폴더를 못 찾는다. 팩션은 폴더명 그대로(`01-llm`), 언어는 `--lang`.
- `quoteChunks` 미작성 → 통대사 1덩어리(페이지 전환·의미 단위 점등 없음). 발화 호흡 단위로 끊어 둬야 한다.
- **음성을 재합성하거나 크롭(들숨 제거 등)해 오디오가 바뀌었으면 Step 1(전사)부터 다시.** 크롭은 길이를 바꾸므로 크롭 전 전사를 재사용하면 얼라인 경계선이 밀려 어긋난다. 크롭·편집이 다 끝난 뒤 파이프라인을 밟는다(편집 중 미리 전사해두면 무효). 텍스트만 바꾸고 음원은 확실히 그대로면 전사 불필요(전사는 음원 기준).
