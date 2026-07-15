---
name: codex-gpt
description: Claude Code에서 codex CLI로 GPT(gpt-5.6)를 호출해 텍스트를 생성하거나 대량 배치 처리할 때 적용한다. codex exec 비대화 실행, 순수 결과만 수신하는 법, Windows spawn 함정('codex' is not recognized / ENOENT) 회피, 동시 실행 수와 rate limit(20달러 1x 플랜 기준 누적 500~560건에서 도달, 5시간 주기 회복) 통제를 다룬다. "GPT로 뽑아줘", "챗지피티 시켜봐", "codex로 생성", "GPT 배치 생성", "GPT와 클로드 결과 비교", GPT에게 대량 텍스트를 맡기는 작업에 호출한다.
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

## 결과 품질 메모

GPT-5.6은 한국어 문체가 자연스럽고 사실 정확도가 높으며 한자를 흘리지 않는다. 다만 프롬프트의 금지 규칙을 넓게 해석하는 경향이 있다(예: "한자 금지, 모두 한글로"라고 하면 RSS·JSTOR 같은 로마자 약자까지 "알에스에스"로 음차한다). 규칙은 적용 범위를 좁혀서 준다.
