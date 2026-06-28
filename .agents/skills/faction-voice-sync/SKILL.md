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
- `--episode` 에 locale 접미사(-ko/-en)를 붙이면 폴더를 못 찾는다. 팩션은 폴더명 그대로(`01-llm`), 언어는 `--lang`.
- `quoteChunks` 미작성 → 통대사 1덩어리(페이지 전환·의미 단위 점등 없음). 발화 호흡 단위로 끊어 둬야 한다.
- 음성을 재합성(길이 변경)했으면 Step 1(전사)부터 다시. 텍스트만 바꾸고 음원 그대로면 의미 없음(전사는 음원 기준).
