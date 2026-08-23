---
name: agy-antigravity
description: Claude Code에서 agy(Antigravity CLI, 구글 제미니 백엔드)를 비대화로 호출해 텍스트를 생성하거나 이미지를 생성할 때 적용한다. 제미니 3 계열 텍스트·이미지 모델에 접근한다. codex와 동일하게 헤드리스 실행하고 결과만 순수 수신하는 법, 이미지 생성·저장, 에이전트 분배 배치를 다룬다. "agy로 뽑아줘", "안티그래비티로 생성", "제미니로 이미지 생성", "agy 배치" 등에 호출한다.
---

# agy(Antigravity CLI)로 텍스트·이미지 생성

구글 계정 로그인으로 도는 로컬 CLI다. 제미니 3 계열 모델(텍스트·이미지)에 접근한다. codex처럼 종량 API가 아니라 로그인 기반이다.

실행 파일(실측): `C:\Users\webco\AppData\Local\agy\bin\agy.exe`. `.exe`라 codex의 `.cmd` spawn 함정(ENOENT)이 없다.

## 모델은 항상 명시한다 — `gemini-3.7-flash-high`

**호출할 때마다 `--model gemini-3.7-flash-high`를 붙인다. 예외 없다.**

`settings.json`의 기본값을 믿지 마라. 2026-08-17 실측에서 기본값이 `Gemini 3.6 Flash (Low)`였고, 그것으로 돌린 한국어 재작성에서 오탈자("변변"), 고유명사 오역(「악양루기」→ `Yueyang Tower`), 금지한 평가어 재삽입이 나왔다. 한 세대 낮은 모델에 추론 강도까지 최하였던 탓이다.

`agy models`로 목록을 본다. 상위부터 `gemini-3.7-flash-{high,medium,low}`, `gemini-3.6-flash-*`, `gemini-3.5-flash-*`, `gemini-3.1-pro-{high,low}`가 있고 Claude Sonnet 4.6·Opus 4.6·GPT-OSS 120B도 붙어 있다. 기본값은 `~/.gemini/antigravity-cli/settings.json`의 `model` 키가 쥐며 사람이 바꿀 수 있으므로, 플래그로 덮어써야 결과가 재현된다.

## 로그인 계정 확인법

agy에는 `whoami` 류 서브커맨드가 없다. **실행 로그에서 뽑는 것이 유일한 확실한 방법**이다. 계정은 유저가 수시로 갈아끼우므로 **캐시된 기억을 믿지 말고 매번 새로 확인**한다.

```bash
# 1) 최신 로그를 만들기 위해 가볍게 한 번 호출(쿼터 상태도 같이 드러남)
"C:/Users/webco/AppData/Local/agy/bin/agy.exe" -p "Say OK." --dangerously-skip-permissions 2>&1 | tail -3

# 2) 가장 최근 로그에서 계정 추출
cd "C:/Users/webco/.gemini/antigravity-cli/log" && grep -aoiE "email=[^ ,}\"]+" $(ls -t | head -1) | tail -1
# → email=whdmstnv@gmail.com
```

- 로그 경로: `~/.gemini/antigravity-cli/log/cli-<YYYYMMDD>_<HHMMSS>.log` (실행마다 새 파일).
- 쿼터 소진 계정이면 1)이 `Error: Individual quota reached ... Resets in NNNh`로 떨어진다. 이때도 로그엔 계정이 남으니 2)는 그대로 동작한다.
- `~/.antigravity_cockpit/credentials.json`에도 계정 목록(email·projectId)이 있지만 **IDE 쪽 옛 기록이라 CLI 실제 로그인과 다르다**(실측 2026-07-20: 파일엔 webcodur 외 3개, 실제 CLI 계정은 그중에 없던 계정 → 이후 whdmstnv로 교체됨). 이 파일만 보고 단정하지 마라.

## 핵심 호출법 (텍스트)

```bash
"C:/Users/webco/AppData/Local/agy/bin/agy.exe" -p "프롬프트" --dangerously-skip-permissions
```

- `-p`/`--print` = 비대화(헤드리스) 단발 실행. **결과가 stdout에 순수하게 떨어진다** — codex처럼 `--output-last-message` 파일로 뺄 필요가 없다(codex는 stdout에 세션 헤더·토큰 노이즈가 섞이지만 agy는 깔끔).
- `--dangerously-skip-permissions` = 도구 승인 프롬프트 스킵(codex의 `--dangerously-bypass-approvals-and-sandbox` 대응).
- 긴 프롬프트·따옴표·줄바꿈은 파일로 만들어 `-p "$(cat 프롬프트.txt)"`로 넣는다(shell 이스케이프 파손 방지).
- 모델 지정은 `--model`, 실행 모드는 `--mode`(accept-edits, plan). 기본 모델로도 텍스트·이미지가 동작한다.

반복 호출이나 배치 스크립트에서는 직접 spawn을 다시 만들지 말고 `scripts/agy-call.mjs`의 `agyCall()`을 import한다. 이 헬퍼는 확인된 `.exe` 절대경로, `gemini-3.7-flash-high`, 임시 작업 폴더, 15분 타임아웃, stdout 수신을 한곳에 고정한다.

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
timeout 300 "C:/Users/webco/AppData/Local/agy/bin/agy.exe" -p "$(cat prompt.txt)" --dangerously-skip-permissions 2>&1 | tail -15

# 3) 파일 확인 (반드시)
ls -la C:/절대/경로/out.png
```

- **저장 경로는 절대경로**로 준다. 대상 폴더는 미리 `mkdir -p`로 만들어 둔다.
- agy가 내부적으로 JPG로 생성한 뒤 요청한 PNG로 변환·저장하기도 한다. 결과는 실측 1~2MB 고해상 PNG.
- 생성 후 **반드시 Read로 눈으로 확인**한다. 실패 시 stdout 마지막 메시지에 사유가 있다.
- 품질: 발주 프롬프트(청동 유물 엠블럼 등)를 그대로 주면 재질·조명·문양까지 충실히 살아난다.
- **비율 지시를 충실히 따른다(2026-07-24 실측).** 프롬프트에 "Vertical 9:16"이 있으면 실제로 768×1376 세로로 뽑는다. 옛 도구들은 이 지시를 무시하고 정사각으로 뽑아 발주서의 비율 문구가 잠복 결함이 된 사례가 있다(스트리밍 제국 로고 14장 세로 사고). **팩션 이미지는 faction-image 스킬 규정대로 비율을 관례(1:1 또는 미명시)와 대조한 뒤 발주하라** — 프롬프트에 적힌 비율이 그대로 실물이 된다.

### 도구 스펙 (2026-07-24, agy 세션 도구 정의 자기 보고 기반)

- 미디어 생성 도구는 `generate_image` 하나뿐이다. **오디오(wav/mp3)·비디오(mp4)·음악 생성 도구는 없다.**
- 종횡비는 `AspectRatio` 파라미터로 지정: `1:1`(기본) · `2:3` · `3:2` · `3:4` · `4:3` · `9:16` · `16:9`. 프롬프트에 비율을 글로 쓰면 agy가 이 파라미터에 옮겨 심는다 — 그래서 프롬프트 속 비율 문구가 그대로 실물이 된다.
- **참조 이미지는 `ImagePaths` 파라미터로 최대 3장**(절대 경로 배열). 프롬프트에 "이 절대경로 이미지를 참조하라"고 쓰면 agy가 알아서 넣는다. 편집·결합·참조 용도 모두 가능. faction-image 스킬의 REF 3장 제한과 일치한다.
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

- agy는 `~/.claude` 훅·스킬을 상속 실행할 수 있다(그록 사례와 유사). 배치 시 훅 소음이 나면 가드가 필요할 수 있다.
- codex 이미지와 agy 이미지는 결과 톤이 다르다(모델이 다름). 같은 프롬프트라도 결과가 갈리니 용도에 맞게 고른다.

## 형제 스킬

외부 CLI 에이전트는 함정이 같은 계열이다. 새로 붙이거나 막히면 나머지도 본다.

| 스킬 | 대상 | 헬퍼 |
|---|---|---|
| `codex-gpt` | GPT (codex) | `scripts/codex-call.mjs` |
| `agy-antigravity` | 제미니 (agy) | `scripts/agy-call.mjs` |
| `grok-cli` | 그록 (grok) | `scripts/grok-call.mjs` |

착수 규칙은 `docs/project/agent-rules.md` 「도구」 30~31번이다.
