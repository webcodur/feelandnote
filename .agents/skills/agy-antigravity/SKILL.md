---
name: agy-antigravity
description: Claude Code에서 agy(Antigravity CLI)를 비대화로 호출해 Gemini·Claude 텍스트 또는 Gemini 이미지를 생성할 때 적용한다. 헤드리스 실행, 명시적 모델 선택, 결과 수신, 이미지 저장을 다룬다. "agy로 뽑아줘", "안티그래비티로 생성", "제미니로 이미지 생성", "agy 배치" 등에 호출한다.
---

# agy(Antigravity CLI)로 텍스트·이미지 생성

구글 계정 로그인으로 도는 로컬 CLI다. Gemini 텍스트·이미지 모델과 목록에 노출된 Claude 텍스트 모델에 접근한다. codex처럼 종량 API가 아니라 로그인 기반이다.

실행 파일(실측): `C:\Users\webco\AppData\Local\agy\bin\agy.exe`. `.exe`라 codex의 `.cmd` spawn 함정(ENOENT)이 없다.

## 모델은 항상 명시한다

일반 텍스트·이미지 호출은 `--model gemini-4-hydrogen-high`를 붙인다. 사용자가 다른 모델을 지정한 작업은 먼저 `agy models`로 정확한 ID를 확인하고 그 ID를 `--model`에 명시한다. 예를 들어 Claude Opus 4.6 Thinking의 현재 ID는 `claude-opus-4-6-thinking`이다.

`settings.json`의 기본값을 믿지 마라. 2026-08-17 실측에서 기본값이 `Gemini 3.6 Flash (Low)`였고, 그것으로 돌린 한국어 재작성에서 오탈자("변변"), 고유명사 오역(「악양루기」→ `Yueyang Tower`), 금지한 평가어 재삽입이 나왔다. 한 세대 낮은 모델에 추론 강도까지 최하였던 탓이다.

`agy models`로 목록을 본다. 목록은 로그인 계정의 등급에 따라 다르다. Pro 이상 계정에는 `gemini-4-hydrogen-{low,medium,high,xhigh}`, `gemini-4-argon-*`가 있고, Ultra에는 `gemini-4-carbon-*`도 있다. 무료 등급은 `gemini-3.8-flash-*`와 Claude Sonnet 4.6·Opus 4.6·GPT-OSS 120B까지만 보인다. **Flash는 쓰지 않는다(26.11.15 사용자 지시).** 텍스트 모델은 Hydrogen → Argon → Carbon 순서로 모두 high를 쓰며, 순서는 `scripts/agy-call.mjs`의 `AGY_TEXT_MODELS`가 쥔다. 모델 순환은 [agy-text.mjs](../../../sw/web-bo/scripts/naver-blog/lib/agy-text.mjs)가 맡는다. 기본은 지금 로그인한 계정에서 모델만 내려가고, 셋 다 막히면 멈춘다. Hydrogen이 가장 싸다. 같은 계정에서 Hydrogen이 막히면 Argon·Carbon도 막혀 있으므로(26.11.18 사용자 확인), Hydrogen 한도 소진은 그 계정이 다 찬 것으로 본다. 모델을 내려가며 다시 부르는 것은 실패를 확인하는 호출일 뿐이다. CLI 계정은 컴퓨터 전체에 하나라 자동으로 바꾸면 다른 세션의 호출이 끊기므로(26.11.15), 다른 계정으로 넘어가는 것은 `AGY_ALLOW_SWITCH=1`을 준 실행에서만 한다. 모델별 가능 여부는 `agy models`로 확인해 OS 임시 폴더에 하루 동안 둔다. `agm list`의 GEM-PRO %는 gemini-4(Hydrogen·Argon·Carbon) 한도를 반영하지 않으므로 계정 선택 기준으로 쓰지 않는다(26.11.14 Ultra 계정이 0%로 보였지만 Hydrogen 호출은 정상). 한도는 실제 호출의 `Individual quota reached`로만 판정한다. agm 계정 22개 가운데 Hydrogen이 열린 계정은 4개뿐이다(26.11.13 실측). **웹 Gemini 채팅과 agy(CLI)의 한도는 같은 계정이라도 따로 소진된다(26.11.13 사용자 확인).** 웹 독서방식 작업에 배정한 계정을 agy 순환에 같이 써도 서로의 한도를 깎지 않는다. 순환 없이 `agyCall`을 직접 부르는 스크립트는 현재 CLI 계정을 그대로 쓰므로, 기본 CLI 계정은 Hydrogen 가능 계정으로 둔다. 사용자가 쓰지 말라고 한 계정은 `sw/web-bo/.env`의 `AGY_EXCLUDE_ACCOUNTS`에 넣어 순환에서 빼고 기본 계정으로도 두지 않는다. 기본값은 `~/.gemini/antigravity-cli/settings.json`의 `model` 키가 쥐며 사람이 바꿀 수 있으므로, 플래그로 덮어써야 결과가 재현된다.

## 로그인 계정 확인법

agy에는 `whoami` 류 서브커맨드가 없다. **적용된 계정은 `agm list`의 `cli` 태그로 본다** — 계정 풀과 전환은 `agy-accounts` 스킬이 쥔다. 아래 로그 추출은 떠 있는 세션이 실제로 쓴 계정을 확인하는 방법이다. 계정은 수시로 갈아끼우므로 **캐시된 기억을 믿지 말고 매번 새로 확인**한다.

```bash
# 1) 최신 로그를 만들기 위해 가볍게 한 번 호출(쿼터 상태도 같이 드러남)
"C:/Users/webco/AppData/Local/agy/bin/agy.exe" -p "Say OK." --dangerously-skip-permissions --model gemini-4-hydrogen-high --print-timeout 5m 2>&1 | tail -3

# 2) 가장 최근 로그에서 계정 추출
cd "C:/Users/webco/.gemini/antigravity-cli/log" && grep -aoiE "email=[^ ,}\"]+" $(ls -t | head -1) | tail -1
# → email=whdmstnv@gmail.com
```

- 로그 경로: `~/.gemini/antigravity-cli/log/cli-<YYYYMMDD>_<HHMMSS>.log` (실행마다 새 파일).
- 쿼터 소진 계정이면 1)이 `Error: Individual quota reached ... Resets in NNNh`로 떨어진다.
- **배치 호출에서는 쿼터 소진이 오류로 안 떨어질 수 있다(26.09.11 실측).** agy가 내부에서 429 재시도(attempt 3~7)를 반복하며 `--print-timeout`까지 매달려 헬퍼에는 "시간 초과"로만 온다. 그 상태로 계속 돌리면 헛돌기만 한다.
- **배치의 중단 규약**: 타임아웃이 나면 ① 최신 로그에서 `Individual quota reached`를 grep해 쿼터면 **`agy-accounts` 스킬의 절차로 다음 계정으로 전환하고 이어 돈다**(풀 전원 소진 시에만 사용자에게 보고. 자동 재시도·대기 루프 금지). ② 쿼터가 아니면 `Reply with exactly: OK` 같은 인사 프로브를 60초 한도로 한 번 보내 OK가 안 오면 무응답으로 보고 **즉시 멈춘다**. ③ 프로브가 살아 있으면 그 묶음만 실패로 기록하고 계속 간다. 재개는 계정 전환 뒤 같은 명령으로 한다(계획 파일이 진행분을 쥐고 있어 이어 돈다). 구현 예: `sw/web-bo/scripts/contents/book-display-title-plan.mjs`의 `agyQuotaExhausted()`·`agyAlive()`, 중단 시 exit 3.
- **인증이 깨진 agy는 브라우저에 구글 로그인 창을 띄우고 기다린다.** 배치에서 인증 오류(`UNAUTHENTICATED`, `authentication timed out`, `Authentication required`)가 한 번이라도 나면 전체를 멈춘다. 재시도·자동 계정 전환·상태 확인용 짧은 호출을 넣지 않는다. 26.11.18에 러너 여섯 개가 인물마다 재시도하고 복구 스크립트가 확인 호출까지 반복해 로그인 창이 끝없이 떴다. 로그만 읽는 감시 프로세스가 오류 문구를 보면 러너와 그 자식 `agy.exe`를 끊는 구조로 둔다.
- CLI에 적용된 인증은 도는 중에 만료된다. 계정이 멀쩡한데(`agm validate`가 유효) 호출만 실패하면 `agm switch <현재 계정> --target agy`로 다시 적용하면 살아난다. 동시 호출이 열 줄을 넘었을 때 자주 깨졌으므로 배치는 다섯 줄 안쪽으로 돌린다.
- 오래 도는 배치는 세션에 딸린 백그라운드 셸이 아니라 `Start-Process`로 떼어 띄운다. 세션이 끊기거나 재시작하면 딸린 셸은 함께 꺼진다. 재부팅하면 떼어 띄운 것도 꺼지므로 완료분을 건너뛰고 이어 돌 수 있게 짠다.
- `~/.antigravity_cockpit/credentials.json`에도 계정 목록(email·projectId)이 있지만 **IDE 쪽 옛 기록이라 CLI 실제 로그인과 다르다**(실측 2026-07-20: 파일엔 webcodur 외 3개, 실제 CLI 계정은 그중에 없던 계정 → 이후 whdmstnv로 교체됨). 이 파일만 보고 단정하지 마라.

## 핵심 호출법 (텍스트)

```bash
"C:/Users/webco/AppData/Local/agy/bin/agy.exe" -p "프롬프트" --dangerously-skip-permissions --model gemini-4-hydrogen-high --print-timeout 15m
```

- `-p`/`--print` = 비대화(헤드리스) 단발 실행. **결과가 stdout에 순수하게 떨어진다** — codex처럼 `--output-last-message` 파일로 뺄 필요가 없다(codex는 stdout에 세션 헤더·토큰 노이즈가 섞이지만 agy는 깔끔).
- `--dangerously-skip-permissions` = 도구 승인 프롬프트 스킵(codex의 `--dangerously-bypass-approvals-and-sandbox` 대응).
- 긴 프롬프트·따옴표·줄바꿈은 파일로 만들어 `-p "$(cat 프롬프트.txt)"`로 넣는다(shell 이스케이프 파손 방지).
- 모델 지정은 `--model`, 실행 모드는 `--mode`(accept-edits, plan). 기본 모델로도 텍스트·이미지가 동작한다.
- **`--print-timeout`을 반드시 늘린다.** 기본값 5분이라 웹 조사처럼 긴 호출은 `Error: timeout waiting for response`로 306초쯤에 죽는다(26.08.28 실측). 헬퍼는 `timeoutMs`를 이 플래그로도 넘긴다. 맨손 호출이면 `--print-timeout 25m`처럼 명시한다.

**인물 단위 작업은 agy 1회 호출에 1명만 넣는다.** 여러 명을 한 프롬프트에 넣어 CLI 한 번을 재사용하지 않는다. 묶으면 시간 초과 한 번에 묶음 전원이 실패하고(26.10.21 실측: 7~10명 묶음이 1200초 초과로 연속 실패), 응답 잘림·인물 간 섞임도 생긴다. 발주와 실행은 배치로 한다. 대상 목록을 한 번에 넘기고, 1명당 agy 프로세스 하나를 여러 개 동시에 띄워 돌린다(기본 동시 3). 동시 1로 줄지어 돌리지 않는다. 값은 `scripts/agy-call.mjs`의 `AGY_PEOPLE_PER_CALL`이 쥐며, 스크립트는 묶음 크기를 이 상수로 고정하고 묶음 크기 플래그를 받지 않는다. 인물 간 중복 검사처럼 전체를 봐야 하는 일은 호출이 끝난 뒤 코드에서 한다.

반복 호출이나 배치 스크립트에서는 직접 spawn을 다시 만들지 말고 `scripts/agy-call.mjs`의 `agyCall()`을 import한다. 이 헬퍼는 확인된 `.exe` 절대경로, 임시 작업 폴더, 타임아웃, stdout 수신을 한곳에 둔다. Windows 명령행 한도를 넘는 긴 입력은 임시 UTF-8 파일로 자동 전달한다. 기본 모델은 `gemini-4-hydrogen-high`이며 다른 모델은 `agyCall(prompt, { model: '확인한-ID' })`로 명시한다.

## 전역 MCP는 임시 작업 폴더로 격리되지 않는다

agy는 `~/.gemini/config/mcp_config.json`에서 활성화된 MCP를 모든 세션에 주입한다. 임시 cwd를 써도 DB·배포처럼 상태를 바꾸는 MCP가 모델에 노출될 수 있다. 생성 전용 배치에서는 활성 MCP를 값이 출력되지 않는 방식으로 확인하고, 상태 변경 MCP가 있으면 사용자가 끄거나 별도 agy 프로필을 마련하기 전까지 배치를 시작하지 않는다. 다른 agy 세션에도 영향을 주므로 스크립트가 전역 MCP를 임의로 disable·enable하지 않는다. 읽기 전용 웹 검색 MCP(`wigolo`·`firecrawl`)는 상태를 바꾸지 않으므로 생성 배치를 막지 않는다(`sw/web-bo/scripts/naver-blog/lib/agy-text.mjs`의 `READ_ONLY_MCP`). 다만 agy는 호출마다 `~/.gemini/settings.json`의 `mcpServers`에 있는 MCP를 자기 자식 프로세스로 새로 띄운다. wigolo는 헤드리스 크로미움을 끌고 와 한 벌이 1~6GB까지 커진다. 26.11.15 동시 호출 4개가 wigolo 4벌을 띄워 컴퓨터가 멈췄다. 그래서 `settings.json`에서 wigolo·firecrawl을 뺐다(`config/mcp_config.json`의 `disabled`는 agy가 따르지 않았다). agy는 Gemini 자체 웹 검색·열람으로 출처를 읽는다. wigolo는 실행자가 필요할 때만 직접 쓴다. MCP 명령 인자에 토큰이 들어 있으면 프로세스 제목과 로그에도 노출될 수 있으므로 원문 목록을 대화에 출력하지 않는다.

## 이미지 생성 (핵심)

agy는 프롬프트로 지시하면 **내부 이미지 도구(제미니 이미지 모델)로 실제 이미지를 생성**한다. codex 내장 image_gen에 대응하는 안티그래비티 경로다. 유료 종량 아님(로그인 기반).

**호출**: 프롬프트에 "이미지를 생성해 이 절대경로에 PNG로 저장하라"를 명시한다.

```bash
# 1) 프롬프트 파일 작성
cat > prompt.txt <<'EOF'
Generate an image from the description below and save it as a PNG file to this exact absolute path: C:/절대/경로/out.png

Image description:
<영문 이미지 프롬프트 전체>
EOF

# 2) agy 호출
timeout 300 "C:/Users/webco/AppData/Local/agy/bin/agy.exe" -p "$(cat prompt.txt)" --dangerously-skip-permissions --model gemini-4-hydrogen-high --print-timeout 5m 2>&1 | tail -15

# 3) 파일 확인 (반드시)
ls -la C:/절대/경로/out.png
```

- **저장 경로는 절대경로**로 준다. 대상 폴더는 미리 `mkdir -p`로 만들어 둔다.
- agy가 내부적으로 JPG로 생성한 뒤 요청한 PNG로 변환·저장하기도 한다. 결과는 실측 1~2MB 고해상 PNG.
- 생성 후 **반드시 Read로 눈으로 확인**한다. 실패 시 stdout 마지막 메시지에 사유가 있다.
- 품질: 발주 프롬프트(청동 유물 엠블럼 등)를 그대로 주면 재질·조명·문양까지 충실히 살아난다.
- **비율 지시를 충실히 따른다(2026-07-24 실측).** 프롬프트에 "Vertical 9:16"이 있으면 실제로 768×1376 세로로 뽑는다. 옛 도구들은 이 지시를 무시하고 정사각으로 뽑아 발주서의 비율 문구가 잠복 결함이 된 사례가 있다(스트리밍 제국 로고 14장 세로 사고). **생성 전에 대상 자산의 비율과 발주문의 비율을 대조한다** — 프롬프트에 적힌 비율이 그대로 실물이 된다.

### 도구 스펙 (2026-07-24, agy 세션 도구 정의 자기 보고 기반)

- 미디어 생성 도구는 `generate_image` 하나뿐이다. **오디오(wav/mp3)·비디오(mp4)·음악 생성 도구는 없다.**
- 종횡비는 `AspectRatio` 파라미터로 지정: `1:1`(기본) · `2:3` · `3:2` · `3:4` · `4:3` · `9:16` · `16:9`. 프롬프트에 비율을 글로 쓰면 agy가 이 파라미터에 옮겨 심는다 — 그래서 프롬프트 속 비율 문구가 그대로 실물이 된다.
- **참조 이미지는 `ImagePaths` 파라미터로 최대 3장**(절대 경로 배열). 프롬프트에 "이 절대경로 이미지를 참조하라"고 쓰면 agy가 알아서 넣는다. 편집·결합·참조 용도 모두 가능.
- 픽셀 해상도 지정은 불가(비율만). 실측 산출: 9:16 → 768×1376.

## agy는 "얼룩말"이다 — 지시를 명확히

agy는 지시가 두루뭉술하면 엉뚱하게 움직인다. **저장 경로·파일 형식·"생성해서 저장하라"는 동작을 문장으로 또렷이** 박는다. 원하는 그림/결과를 긍정문으로 구체적으로 적는다. 애매하게 던지면 결과물을 안 만들고 설명만 늘어놓거나 경로를 빗나간다.

## 에이전트 분배 배치

로고 세트처럼 여러 장을 뽑을 때는 서브에이전트에 나눠 맡긴다. 각 에이전트에게:
- 담당 프롬프트 출처(발주서 파일 경로)와 대상 목록(세력/슬러그)
- 위 "이미지 생성" 3단계(프롬프트 파일 → agy 호출 → 파일 확인)를 **정확한 명령 그대로** 지시
- **한 번에 하나씩 순차 실행**(동시 다발 자제 — 혼선·rate 방지)
- 실패 건만 1회 재시도, 결과는 파일 존재로 검증
- 이미지 내용 평가는 시키지 말 것(생성만; 육안 판정은 메인이 직접)

## codex 대비 요약

| 항목 | codex | agy |
|------|-------|-----|
| 비대화 실행 | `codex exec -` | `agy -p` |
| 승인 스킵 | `--dangerously-bypass-approvals-and-sandbox` | `--dangerously-skip-permissions` |
| 결과 수신 | `--output-last-message` 파일(stdout엔 노이즈) | stdout 직접(깔끔) |
| 입력 이미지 첨부 | `-i 파일`(여러 장) | 프롬프트 기반(첨부 플래그는 미확인) |
| 이미지 생성 | 내장 image_gen | 내부 이미지 도구(제미니) |
| spawn 함정 | `.cmd`라 ENOENT 주의 | `.exe`라 없음 |

## 무시/주의

- agy는 `~/.claude` 훅·스킬을 상속 실행할 수 있다. 배치 시 훅 소음이 나면 가드가 필요할 수 있다.
- codex 이미지와 agy 이미지는 결과 톤이 다르다(모델이 다름). 같은 프롬프트라도 결과가 갈리니 용도에 맞게 고른다.

## 형제 스킬

외부 CLI 에이전트는 함정이 같은 계열이다. 새로 붙이거나 막히면 나머지도 본다.

| 스킬 | 대상 | 헬퍼 |
|---|---|---|
| `codex-gpt` | GPT (codex) | `scripts/codex-call.mjs` |
| `agy-antigravity` | 제미니 (agy) | `scripts/agy-call.mjs` |
| `devin-swe` | Devin SWE-2 (devin) | `scripts/devin-call.mjs` |

착수 규칙은 `docs/project/agent-rules.md` 「도구」 30~31번이다.
