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

codex는 텍스트뿐 아니라 **실제 이미지를 생성**한다(내장 `image_gen` 도구). faction-image 스킬이 말하는 "Codex 내장 이미지 생성"이 이것 — 나노바나나 대체 생성기로 쓸 수 있다. 유료 종량 아님(구독), rate limit만 있다.

**호출**:

```bash
codex exec - -m gpt-5.6-sol --skip-git-repo-check \
  -s workspace-write --dangerously-bypass-approvals-and-sandbox \
  -i 소스이미지.png -i 얼굴REF.jpg \
  --output-last-message OUT.txt --color never < 프롬프트.txt
```

- `-i <파일>` 로 입력 이미지를 여러 장 첨부한다(소스 크롭/기존샷 + 얼굴 REF 등). 프롬프트는 stdin.
- 프롬프트에 저장 경로를 명시하고 "생성 후 그 PNG를 이 경로에 저장하라"고 지시한다.
- `-s workspace-write --dangerously-bypass-approvals-and-sandbox` 로 승인 프롬프트 없이 돌린다.

**함정 — 파일이 지정 경로에 안 떨어진다 (핵심)**: codex가 image_gen으로 이미지를 생성해 base64로 받은 뒤, python 셀에서 파일로 저장하기 전에 세션이 종료되는 일이 잦다. `--output-last-message` 가 "파일을 성공적으로 작성했습니다"라 해도 실제 경로엔 파일이 없을 수 있다. **회수법**: codex 세션 로그에서 생성 이미지 base64를 직접 뽑아 저장한다.

```python
import base64, re, glob, os, time
# 최근 세션들 중 이 작업 고유어가 든 세션만 필터 (동시 codex 작업과 섞임 방지)
files = [f for f in glob.glob(r'C:/Users/<유저>/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl')
         if os.path.getmtime(f) > time.time()-1200]
best = None
for f in files:
    txt = open(f, encoding='utf-8', errors='ignore').read()
    if '작업고유어(예: Penthesilea)' not in txt or 'data:image/png' not in txt:
        continue
    for line in open(f, encoding='utf-8', errors='ignore'):
        for b in re.findall(r'data:image/png;base64,([A-Za-z0-9+/=]+)', line):
            if best is None or len(b) > len(best): best = b
if best:
    open('out.png', 'wb').write(base64.b64decode(best))
```

**세션 섞임 주의**: 이 PC에서 다른 codex 작업이 동시에 돌면(사용자 배치 등) 세션이 뒤섞인다. mtime만으로 최신 세션을 잡으면 남의 이미지를 회수한다(엉뚱한 그룹샷 오염 사례). 반드시 세션 텍스트에 그 작업 고유어 + `data:image/png` 가 함께 있는 세션으로 필터해 최장 base64를 뽑는다. 저장 후 반드시 Read로 눈으로 확인한다.

**품질 실측**: 저해상(≈700KB) 개인샷을 소스로 넣고 "단순 업스케일·복붙 금지, 표면을 전부 새로 렌더" 프롬프트를 주면 2.3~2.4MB 고디테일 컷이 나온다(갑옷 긁힘·모공·머리카락 가닥까지). 신원·자세·의상·조명은 소스대로 유지된다.

## 결과 품질 메모

GPT-5.6은 한국어 문체가 자연스럽고 사실 정확도가 높으며 한자를 흘리지 않는다. 다만 프롬프트의 금지 규칙을 넓게 해석하는 경향이 있다(예: "한자 금지, 모두 한글로"라고 하면 RSS·JSTOR 같은 로마자 약자까지 "알에스에스"로 음차한다). 규칙은 적용 범위를 좁혀서 준다.
