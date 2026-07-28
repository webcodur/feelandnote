---
name: codex-gpt
description: Claude Code에서 codex CLI로 GPT(gpt-5.6)를 호출해 텍스트를 생성하거나 대량 배치 처리할 때, 또는 codex 내장 image_gen으로 이미지를 생성할 때 적용한다. codex exec 비대화 실행, 순수 결과만 수신하는 법, Windows spawn 함정('codex' is not recognized / ENOENT) 회피, 동시 실행 수와 rate limit(20달러 1x 플랜 기준 누적 500~560건에서 도달, 5시간 주기 회복) 통제, 이미지 생성(입력 이미지 첨부·세션 로그 base64 회수)을 다룬다. "GPT로 뽑아줘", "챗지피티 시켜봐", "codex로 생성", "GPT 배치 생성", "GPT와 클로드 결과 비교", "codex로 이미지 생성", "코덱스로 그려/뽑아", GPT에게 대량 텍스트를 맡기거나 codex로 이미지를 만드는 작업에 호출한다.
---

# codex로 GPT 호출·통제

Codex 구독 인증으로 도는 로컬 CLI다. **종량제 API 비용이 들지 않는다.** 대신 rate limit이 있다.

## 핵심 호출법

```bash
codex exec - -m gpt-5.6-sol --output-last-message OUT.txt --color never
# 프롬프트는 stdin으로 넣는다. 결과는 OUT.txt 에 순수 텍스트로 떨어진다.
```

세 가지가 핵심이다.

1. **프롬프트는 argv 말고 stdin(`-`)으로** 넣는다. 긴 프롬프트·따옴표·줄바꿈이 shell 이스케이프에서 깨지는 걸 막는다.
2. **결과는 `--output-last-message` 파일로 받는다.** stdout에는 세션 헤더(workdir/model/session id), 프롬프트 에코, `tokens used` 같은 노이즈가 섞여 파싱이 지저분하다.
3. `--color never` 로 ANSI 코드를 없앤다.

기본값: 모델 `gpt-5.6-sol`, reasoning effort `medium`. 결(variant)은 `sol`/`terra`/`luna`가 있다.

## 스크립트에서 부를 때 (Windows 함정)

`scripts/codex-call.mjs` 의 `codexCall()` 을 쓰거나 그 패턴을 따른다. 직접 짤 거라면 반드시 피해야 할 함정:

- **`spawn('codex', ...)` 는 ENOENT로 죽는다.** codex는 `.cmd` 래퍼라 node가 직접 실행하지 못한다.
- **`shell: true` 만으로도 부족하다.** 동시 실행하면 산발적으로 `'codex' is not recognized as an internal or external command` 가 터진다(실측: 동시 5개로 1673건 돌려 868건이 이걸로 실패). **`where codex`로 `.cmd` 절대경로를 먼저 해석해 두고 호출**한다.
- 절대경로에 공백이 있으므로(`C:\Program Files\...`) shell 사용 시 따옴표로 감싼다.

## 동시 실행과 rate limit

- **동시 3 이하**를 권장한다. 5는 산발 실패가 늘었다.
- **20달러(1x) 플랜 실측: 누적 500~560건 즈음 rate limit 도달.** 약 5시간 주기로 회복된다.
- 한도에 닿으면 codex가 exit 1로 죽는다. stderr 앞부분에 무해한 스킬 로드 경고가 껴서 원인이 가려지니, 에러 메시지를 넉넉히(300자 이상) 남긴다.
- **배치는 반드시 재실행 안전하게 설계한다.** 이미 처리한 항목은 건너뛰고 남은 것만 처리하도록 만든다. 한도에 막혀도 회복 후 같은 명령으로 이어붙이면 된다. 처음부터 다시 돌리면 시간과 한도를 두 번 쓴다.
- 1건당 20~70초 걸린다(사고량에 따라 편차).

## 무시해도 되는 경고

```
ERROR codex_core::session::session: failed to load skill ...: missing YAML frontmatter
```

프로젝트 스킬 파일 형식 문제일 뿐 생성 자체에는 영향이 없다. 이 문구가 stderr 앞을 차지해 진짜 원인(rate limit 등)을 가리는 점만 주의한다.

## 배치 러너 패턴

1. 대상 목록을 불러온다(이미 처리된 항목을 제외하는 옵션을 반드시 넣는다).
2. 동시 3으로 청크를 돌린다.
3. 각 건은 `codexCall(prompt)` 로 생성 → 결과 검증(빈 응답·형식·금지 문자) → 저장.
4. 실패는 건별로 삼키고 계속 진행하되, 성공·실패·rate 카운트를 따로 집계해 마지막에 보고한다.
5. rate limit 의심 건이 나오면 몇 건째에서 났는지 기록한다. 다음 회차 계획의 근거가 된다.

## 이미지 생성 (codex 내장 image_gen)

구독제라 종량 과금 없음, rate limit만 있다. 발주 원칙(구도·시선·REF 사용법)은 `docs/project/image-generation.md`, API 직접 호출 규격·비용은 `docs/project/openai-usage.md`. 여기는 **codex로 부를 때의 실행 규칙만** 둔다.

```bash
codex exec - -m gpt-5.6-sol --skip-git-repo-check \
  -s workspace-write --dangerously-bypass-approvals-and-sandbox \
  -i 소스.png -i 얼굴REF.jpg \
  --output-last-message OUT.txt --color never < 프롬프트.txt
```

프롬프트는 stdin, 입력 이미지는 `-i` 로 여러 장. 프롬프트 안에 저장 경로를 명시한다.

### 프롬프트 규격

**인물 REF가 있는 초상 재생성은 [portrait-from-ref.md](portrait-from-ref.md) 양식을 그대로 쓴다.** 남·여 스타일 블록과 넣지 말 것 목록이 거기 있다.

요지: **REF가 신원을 정하므로 인물을 묘사하지 않는다.** "같은 얼굴/나이/피부톤 유지" 류는 불필요할 뿐 아니라 **원본이 흑백이면 흑백으로 고착시킨다**(26.07.28: 흑백 원본 40명 중 30명이 흑백 산출). 넣는 건 스타일·풀컬러·출력 크기·저장 경로 넷뿐이다.

### 출력 크기는 프롬프트에 박는다

**`image_gen`에는 size 파라미터가 없다**(GPT 답변: "exposes no size parameter"). CLI 플래그로도 못 준다. 문장으로 지정하면 정확히 그 크기로 나오고, **안 박으면 `1254`·`1024`·`2048`·`4096`·`8192`로 제각각 튄다**(8192는 26MB라 후속 처리가 통째로 무거워진다).

크게 잡을 이유는 없다 — 목표 규격의 **1.3배면 손실이 없다**(800 아바타용 실측: 1254px 산출물의 얼굴 크롭 영역이 1266~1674px). 2048은 토큰만 +13%.

### 회수 — 파일이 안 떨어지고, 실패하면 원본이 딸려온다

codex가 base64를 받은 뒤 파일 저장 전에 세션이 끝나는 일이 잦다. `--output-last-message`가 "성공적으로 작성"이라 해도 경로엔 파일이 없을 수 있다. 세션 로그(`~/.codex/sessions/…/rollout-*.jsonl`)에서 `data:image/png;base64,([A-Za-z0-9+/=]+)` 로 최장 base64를 뽑아 저장한다.

**🔴 그런데 `-i` 로 넣은 입력 이미지도 같은 형식으로 로그에 남는다.** 생성이 실패한 세션에서 최장 base64를 뽑으면 **방금 넣어준 원본이 그대로 나온다.** 파일은 멀쩡히 생기고 크기 검사도 통과해 러너는 성공으로 집계한다. 26.07.28 실측 — 한도 소진 후에도 배치가 돌아 1,141건 중 292건만 진짜였는데 로그는 전량 `ok`였다(1,129장 폐기).

회수 직후 반드시 검사한다.

- **원본과 축소 지문(64×64 md5) 대조** — 같으면 실패 처리하고 파일을 지운다
- **해상도가 소스 이하면 실패** — 재생성은 항상 커진다
- **세션 섞임 차단** — 프롬프트에 `TASK-ID: <고유값>`을 박고, 그 문자열이 든 세션만 필터한다(동시 작업이 있으면 mtime만으로는 남의 이미지를 가져온다)
- **한도 소진 감지** — `--output-last-message` 파일이 빈 채로 남는다. 존재만 보지 말고 내용을 본다

### 토큰

`codex exec` stdout 마지막 `tokens used` 다음 줄에 총 토큰이 찍힌다(`--output-last-message` 파일에는 없다).

REF 1장 + 생성 1장이 **~36,000**. **REF 해상도는 무시해도 된다** — 300px와 1254px의 첨부 비용 차이가 ~1,170으로 전체의 3% 미만이라 생성 토큰 변동에 묻힌다. REF를 줄이는 전처리는 하지 마라(각 조건 1회 실측).

## 결과 품질 메모

GPT-5.6은 한국어 문체가 자연스럽고 사실 정확도가 높으며 한자를 흘리지 않는다. 다만 프롬프트의 금지 규칙을 넓게 해석하는 경향이 있다(예: "한자 금지, 모두 한글로"라고 하면 RSS·JSTOR 같은 로마자 약자까지 "알에스에스"로 음차한다). 규칙은 적용 범위를 좁혀서 준다.
