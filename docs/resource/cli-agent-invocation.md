# CLI 에이전트가 다른 CLI 에이전트를 호출하는 법

한 AI 코딩 에이전트 안에서 **다른 회사의 AI 에이전트를 셸 명령으로 호출해 일을 시키는** 기법이다. Claude Code에서 GPT(codex)를 부르든, Kiro에서 Claude를 부르든 원리는 같다. 호출하는 쪽(A)과 호출당하는 쪽(B)이 무엇인지는 상관없다.

> 비정본 참고자료다. 이 저장소의 정본 규격은 `.agents/skills/{codex-gpt,agy-antigravity,kiro-gpt,opencode-muse,devin-swe}/SKILL.md`가 쥔다. 아래 경로·수치·플랜 한도는 특정 환경(Windows 11, 개인 구독 플랜)의 실측값이므로 각자 환경에서 다시 재야 한다.

---

## 0. 이 문서를 받은 에이전트가 먼저 할 것

본문은 **CLI가 이미 깔려 있고 로그인돼 있다**고 전제한다. 설치와 인증 절차는 다루지 않는다. 그래서 아래 셋을 먼저 확인하고, 확인된 값으로 본문의 값을 덮어쓴다.

1. **어떤 CLI가 있는가** — `where codex agy kiro-cli opencode claude devin` (Windows) / `which ...` (그 외). 없는 것은 그 행을 통째로 무시한다.
2. **모델 ID가 유효한가** — 본문의 `gpt-5.6-sol`, `gemini-3.8-flash-high` 같은 값은 작성 시점의 것이다. `codex --help`, `agy models`, `opencode models`, `devin models list`로 현재 목록을 확인해 쓴다. **설정 파일 기본값에 맡기지 않는다**(6절).
3. **OS가 무엇인가** — 3-③(`.cmd` spawn), 6절의 `python3` 부재는 Windows 사례다. macOS·Linux면 그 둘은 건너뛰고 나머지는 그대로 적용된다.

동시 실행 수와 한도(5절)는 계정 플랜에 딸린 값이라 그대로 믿지 말고 **작은 배치로 한 번 재고 시작한다.**

---

## 1. 왜 되는가 — 성립 조건은 셋뿐이다

에이전트 CLI는 대부분 대화형 TUI로 알려져 있지만, 전부 **비대화(headless) 단발 실행 모드**를 갖고 있다. 그리고 에이전트에게는 셸 실행 권한이 있다. 그래서 "A가 B를 호출한다"는 특별한 통합이 아니라 그냥 **프로세스 실행 한 번**이다.

성립 조건은 셋이다.

1. 피호출 CLI에 1회 실행 모드가 있다 (`-p`, `exec`, `run`, `--no-interactive` 계열)
2. 호출 측 에이전트가 셸을 쓸 수 있다
3. 결과가 결정론적 경로로 나온다 (stdout 또는 지정 파일)

셋을 만족하면 조합은 자유다. Claude → GPT, GPT → Claude, Kiro → Gemini, 스크립트 → 넷 전부 동시. API 키도 SDK도 필요 없고, 각 CLI가 이미 갖고 있는 **구독 로그인 세션을 그대로 쓴다.**

## 2. 왜 하는가

- **교차 검증** — 같은 원고를 다른 모델에게 각각 쓰게 하고 서로 검수시킨다. 한 모델의 편향이 그대로 산출물이 되는 것을 막는다.
- **쿼터 분산** — 한 계정의 한도에 막혀도 다른 라인으로 계속 돌린다. 구독 두세 개가 병렬 워커가 된다.
- **특기 배분** — 한국어 산문, 사실 조사, 코드 수정, 이미지 생성에서 모델별 결과 차이가 크다. 잘하는 쪽에 맡긴다.
- **팬아웃** — 조사·작성처럼 대상이 독립적인 일은 20건을 동시에 던져 열 배 빠르게 끝낸다.
- **비용 라인 분리** — 종량 API 대신 이미 결제한 구독 CLI를 워커로 쓴다.

---

## 3. CLI별 호출 규격 (핵심 표)

| CLI | 비대화 실행 | 프롬프트 투입 | 결과 수신 | 승인 스킵 | 모델 지정 |
|---|---|---|---|---|---|
| **Claude Code** (`claude`) | `claude -p` | argv / stdin | stdout (`--output-format json` 가능) | `--dangerously-skip-permissions` | `--model` |
| **codex** (GPT) | `codex exec -` | **stdin 필수** | **`--output-last-message FILE`** | `--dangerously-bypass-approvals-and-sandbox` | `-m gpt-5.6-sol` |
| **agy** (Antigravity/Gemini) | `agy -p` | argv | stdout (노이즈 없음) | `--dangerously-skip-permissions` | `--model gemini-3.8-flash-high` |
| **kiro-cli** | `kiro-cli chat --no-interactive` | argv | stdout (`--output-format text`) | `--trust-all-tools` 또는 `--trust-tools=...` | `--model` + `--effort` |
| **opencode** | `opencode run --dir <빈폴더>` | argv | stdout (첫 줄 배너 제거) | — | `-m opencode/muse-spark-1.2-contributor-free` |
| **devin** (Devin CLI) | `devin -p` | argv (`--` 뒤) / `--prompt-file FILE` | stdout (`--export FILE`로 대화 기록) | `--permission-mode dangerous` | `--model` (`swe`, `opus`, `gpt` 등 패밀리명) |

### 실행 예

```bash
# GPT (codex) — 프롬프트는 stdin, 결과는 파일
codex exec - -m gpt-5.6-sol --output-last-message OUT.txt --color never < prompt.txt

# Gemini (agy) — 결과가 stdout에 순수하게 떨어진다
agy -p "$(cat prompt.txt)" --dangerously-skip-permissions \
    --model gemini-3.8-flash-high --print-timeout 15m

# Kiro (GPT-5.6 Sol)
kiro-cli chat --agent-engine v3 --model gpt-5.6-sol --effort high \
    --no-interactive --output-format text --wrap never "프롬프트"

# opencode — 작업 폴더를 반드시 빈 곳으로 격리한다
opencode run --dir /tmp/work -m opencode/muse-spark-1.2-contributor-free "프롬프트"

# Claude Code — 역방향(다른 에이전트가 Claude를 부를 때)도 같은 모양이다
claude -p "프롬프트" --output-format json --model claude-opus-5

# Devin — 비신뢰 디렉터리에서는 trust 확인을 꺼야 한다(아래 주의)
devin -p --model swe --permission-mode dangerous \
    --respect-workspace-trust false -- "프롬프트"
```

### devin만의 함정

> 대량 위임(수백 세션)을 할 때의 운용 지식은 `devin-swe` 스킬이 쥔다 — 층을 나눈 위임(대상 → 구조 → 묶음 → 글), 배치가 서로를 못 볼 때 두는 통합 단계, 검수에서 걸린 항목을 고쳐 주지 말고 되돌려 보내기, 지시서에서 예시가 규칙을 이기는 함정, 검사기가 막아야 할 것(대상 손실·스냅숏 드리프트), Windows 메모리 한계와 재개 가능한 러너 구조. 아래는 호출 자체의 함정만 적는다.

- **비대화 모드는 workspace trust를 통과해야 한다.** `-p`는 신뢰 확인 프롬프트를 띄우지 못해 미신뢰 디렉터리에서 그냥 실패한다. 배치에서는 `--respect-workspace-trust false`를 항상 붙인다.
- **프롬프트는 `--` 뒤에 둔다.** `-p`가 인라인 프롬프트를 옵션 인자로도 받기 때문에, 플래그와 섞어 쓸 때는 `devin -p -- "프롬프트"` 형태로 분리한다. 긴 프롬프트는 `--prompt-file FILE`이 안전하다.
- **`--sandbox`는 네이티브 Windows에서 안 된다.** autonomous 모드는 WSL 2 안에서만 쓸 수 있다. Windows에서 무인 실행은 `--permission-mode dangerous`가 유일한 길이므로 함정 ⑤(cwd 격리·MCP 상속)를 더 엄격히 지킨다. 권한 모드 값은 `auto`·`accept-edits`·`smart`·`dangerous`다(3000.10.23 실측 — `bypass`는 없다).
- **`devin`과 `devin-desktop`은 다르다.** Devin Desktop이 PATH에 심는 `devin-desktop`은 앱 런처다. Desktop만 깔린 PC에서는 CLI가 PATH에 없고 앱 안 `%LOCALAPPDATA%\Programs\Devin\resources\app\extensions\windsurf\devin\bin\devin.exe`에 들어 있다. `where devin`이 비면 이 경로를 본다.
- **CLI 로그인은 Desktop과 따로다.** Desktop에 로그인해 있어도 CLI는 `devin auth login`을 따로 거친다. 로그인 전에는 `devin models list`가 `Not logged in`을 내지만, **`-p` 호출은 오류 없이 멈춘다**(실측 180초 무응답). 배치 전에 `models list`로 로그인부터 확인한다. `auth login`은 방식 고르는 메뉴(브라우저·토큰 붙여넣기·Enterprise)가 콘솔 키 입력을 직접 읽어서, 에이전트가 백그라운드로 띄우거나 stdin에 Enter를 흘려 넣어도 넘어가지 않는다(실측). 로그인은 사람이 자기 터미널에서 한 번 한다.
- **로그인 뒤 첫 실행 설정도 `-p`를 막는다.** 로그인 직후 첫 호출은 비대화 모드여도 「Git 연결 권장 — GitHub 연결 / 다른 Git / 지금은 건너뛰기」 메뉴에서 멈춘다(실측 — 로그에 메뉴만 찍히고 결과가 없다). 사람이 터미널에서 `devin setup`을 한 번 돌려 이 메뉴를 넘긴 뒤 배치를 시작한다.
- **Windows PowerShell 5.1은 devin 출력의 한국어를 깨뜨린다.** 출력은 UTF-8인데 셸이 기본 코드페이지로 읽는다(실측 — 「안녕하세요」가 `?덈뀞?섏꽭??`로 찍혔다). 출력을 파일로 받아 `Get-Content -Encoding UTF8`로 읽거나 Node에서 받는다.
- **모델마다 과금이 다르다.** `devin models list`가 모델별 단가를 보여 준다. 무료는 SWE-2 묶음(`swe-2-high`·`swe-2-medium`·`swe-2-max`, 별칭 `swe`)이고, 이름이 비슷한 SWE-1.7 Lightning이나 Claude·GPT·Gemini는 토큰당 과금이다(26.09.12 기준). 과금을 피하려면 별칭 대신 `--model swe-2-max`처럼 무료 변형명을 적는다.

---

## 4. 다섯 개의 공통 함정

CLI가 달라도 터지는 지점은 같다. 새 CLI를 붙일 때 이 다섯 개만 먼저 확인하면 대부분 걸린다.

### ① 프롬프트가 셸에서 깨진다

긴 한국어 프롬프트에 따옴표·줄바꿈·백틱이 들어가면 argv를 거치며 파손된다.

- **stdin을 지원하면 stdin으로 넣는다** (codex의 `exec -`).
- stdin이 없으면 **하나의 argv로 통째 전달**한다. `shell: true`로 문자열 조립하지 말고 인자 배열로 넘긴다.
- Windows `CreateProcess`의 명령행 길이 한도(약 32KB)를 넘는 입력은 **임시 UTF-8 파일에 쓰고 "이 경로의 파일을 읽어라"로 우회**한다.

### ② 결과에 노이즈가 섞인다

stdout에 세션 헤더, 모델명 배너, 프롬프트 에코, `tokens used` 같은 것이 붙는다.

- 전용 출력 플래그가 있으면 그것을 쓴다 (`--output-last-message`).
- 없으면 배너 형태를 확인해 앞부분만 제거한다. opencode는 `> build · <모델명>` 한 줄이 붙는다.
- **일부 모델은 본문 앞에 자기 진행 보고를 흘린다.** ("먼저 생애를 검증하겠다." → 본문) 프롬프트로 완전히 막히지 않으므로 수신 측에서 걷어낸다.

### ③ Windows에서 spawn이 ENOENT로 죽는다

`.cmd` 래퍼로 설치된 CLI는 Node의 `spawn('codex')`가 직접 실행하지 못한다.

- **`shell: true`만으로도 부족하다.** 동시 실행하면 산발적으로 `'codex' is not recognized`가 터진다. 실측: 동시 5개로 1673건을 돌려 868건이 이 오류로 실패했다.
- **`where`/`which`로 실행 파일 절대경로를 먼저 해석해 캐시**하고 그 경로를 spawn한다. `where`가 확장자 없는 shim과 `.cmd`를 함께 뱉으면 `.cmd`를 고른다.
- `.exe`로 설치된 CLI(agy, opencode)는 이 함정이 없다.

### ④ 타임아웃 기본값에 잘린다

CLI 자체의 대기 한도와 호출부의 타임아웃은 **별개**다. 둘 다 늘려야 한다.

- agy는 `--print-timeout` 기본값이 5분이라 조사를 겸한 호출이 306초쯤 `timeout waiting for response`로 죽는다.
- 조사를 포함한 1건은 40~120초, 사고량이 큰 건은 그 이상이다. **300초 이상 준다.**
- 프로세스 완료 감시는 `close`가 아니라 **`exit` 기준**으로 한다. 보조 프로세스가 stdout 핸들을 오래 쥐어 `close`가 늦게 오는 CLI가 있다.

### ⑤ 호출된 에이전트가 주변 환경을 상속한다

이게 가장 위험하다. 부른 에이전트는 **당신의 저장소 안에서, 당신의 설정으로** 돈다.

- **작업 폴더를 격리한다.** `--dir`이나 `cwd`로 빈 임시 폴더를 준다. 그러지 않으면 `AGENTS.md`와 주변 파일을 읽어 문맥이 오염되고, 최악의 경우 파일을 고친다.
- **전역 MCP는 임시 cwd로 격리되지 않는다.** agy는 전역 설정의 활성 MCP를 모든 세션에 주입한다. DB·배포처럼 상태를 바꾸는 MCP가 물려 있으면 생성 전용 배치라도 위험하다. 시작 전에 확인한다.
- **훅·스킬도 상속될 수 있다.** 배치 중 알 수 없는 로그가 섞이면 이쪽을 의심한다.
- **재귀 위임을 금지한다.** 프롬프트에 "다른 에이전트를 부르지 않는다"를 명시하지 않으면 부른 에이전트가 또 부르고, 동시 실행 수가 통제를 벗어난다.

---

## 5. 배치·병렬 설계

### 재실행 안전이 1번 규칙이다

rate limit은 반드시 걸린다. **이미 처리한 항목을 건너뛰고 남은 것만 처리하는 구조**로 짠다. 한도에 막혀도 회복 후 같은 명령을 다시 치면 이어붙는다. 처음부터 다시 돌리면 시간과 한도를 두 번 쓴다.

### 동시 실행 수 (실측)

| CLI | 권장 동시 | 근거 |
|---|---:|---|
| codex | **3 이하** | 5부터 spawn 산발 실패가 늘었다 |
| opencode (muse) | **12~20** | 1건 70초 → 12건 6초/건. 12와 20이 비슷해 그 근처에서 포화 |
| kiro-cli | **터미널 2 × 내부 워커 3** | 3×3은 후처리 중 `ClientThrottleError` 발생 |
| agy | 순차 권장 | 이미지 배치에서 동시 다발 시 혼선 |

### 한도 신호와 대응

- codex: 20달러(1x) 플랜 기준 **누적 500~560건**에서 도달, 약 5시간 주기로 회복.
- kiro: `ClientThrottleError`, `USER_REQUEST_RATE_EXCEEDED`, `Too many requests`가 강한 제한 신호.
- 신호를 받으면 **결과가 이미 생긴 키는 건드리지 않고, 미완료 키만 새 묶음으로 만들어 동시 수를 한 단계 낮춘다.** 전체를 되돌리지 않는다.
- 한도 소진은 **조용히 실패한다.** 출력 파일이 빈 채로 남거나 exit 1로 죽는데, stderr 앞부분을 무해한 경고가 차지해 원인이 가려진다. 에러 메시지를 300자 이상 넉넉히 남긴다.

### 완료 판정을 자연어로 하지 않는다

호출한 에이전트가 "완료했습니다"라고 말해도 그것은 근거가 아니다. 셋으로 판정한다.

1. 배정된 결과 파일이 전부 존재한다
2. 각 파일을 다시 파싱해 키·스키마를 검사한다
3. 도메인의 결정론적 전체 감사를 통과한다

---

## 6. 품질 통제

### 모델을 항상 명시한다

**설정 파일의 기본값을 믿지 마라.** 실측 사고: agy의 기본값이 한 세대 낮은 `Gemini 3.6 Flash (Low)`로 잡혀 있었고, 그것으로 돌린 한국어 재작성에서 오탈자, 고유명사 오역, 금지 규칙 위반이 한꺼번에 나왔다. 플래그로 덮어써야 결과가 재현된다.

### 조사를 지시하지 않으면 자신 있게 틀린다

내장 웹 검색이 있어도 **시키지 않으면 쓰지 않는다.** 그리고 없는 사실을 지어내는 게 아니라 **실재하는 사실들 사이의 시점·인과·입장을 뒤집는다.** 문장이 매끄러워 육안 검수로 못 거른다.

실측(인물 독백 10건, 조사 미지시): 서구·현대 인물은 무결, **한국 전근대 인물 3명 전원 오류**. 조사를 지시하자 전부 교정됐다.

프롬프트에 이 블록을 넣는다.

```
[먼저 조사한다]
- 쓰기 전에 웹을 검색해 사실을 확인한다. 기억에 의존하지 않는다.
- 특히 확인할 것: 사건 연도와 그때 인물의 소재, 논쟁에서의 입장,
  저작의 성격, 가족·동료의 생몰 시점
- 조사로 확인되지 않은 내용은 쓰지 않는다.
```

조사를 붙여도 **서사로 엮는 단계에서 방향이 뒤집힌다.** 지식이 없어서가 아니라 이야기로 짤 때 틀리는 것이라, 산출물의 사실을 항목으로 뽑아 되물으면 스스로 교정한다. 그 단계를 파이프라인에 넣는다.

### 지시는 동작으로 못 박는다

두루뭉술하게 던지면 결과물을 만들지 않고 설명만 늘어놓는다. **저장 경로·파일 형식·"생성해서 저장하라"는 동작**을 문장으로 또렷이 쓴다. 원하는 것을 긍정문으로 구체적으로 적는다.

### 환경 결함이 시간을 태운다

- codex는 그림을 만든 뒤 파일 복사를 하려고 셸을 부르는데, 이 환경에서 셸 도구가 즉시 죽는다(DLL 초기화 실패). 다른 방법을 찾아 재시도하며 몇 분을 태운다. 프롬프트 끝에 **`Do not run any shell command.`** 한 줄을 넣자 같은 발주가 **5~10분에서 100초**가 됐다.
- opencode의 모델은 분량을 맞추려 `python3`로 글자를 세는데, 이 환경에는 `python`만 있다. 실패 후 재시도하다 턴을 소진하고 **빈 출력**으로 끝난다. "글자 수를 세려고 스크립트를 실행하지 않는다"를 넣고, 남는 무응답은 재시도로 처리한다(3회면 대개 살아난다).

### 빈 출력의 진단 순서

`exit=null`이면서 소요가 타임아웃 값에 딱 붙으면 프롬프트 문제가 아니다. **순서를 지킨다.**

1. **라인이 살아 있는지 먼저 본다.** `"3 곱하기 7은?"`을 던져 `21`이 안 나오면 서비스 쪽이 죽은 것이다.
2. 그다음 프롬프트, 그다음 동시 실행 수.

이 순서를 어기면 오진한다. 실제로 라인이 죽은 구간을 동시 호출 탓으로 결론 내려 "병렬 불가"라는 틀린 규칙이 문서에 박힌 적이 있다.

---

## 7. 최소 헬퍼

CLI마다 규격이 다르므로 호출 지점마다 다시 짜면 함정을 매번 다시 밟는다. **CLI당 헬퍼 하나**로 실행 파일 해석·격리 cwd·타임아웃·결과 수신을 한곳에 가둔다.

```js
import { spawn, execSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'

let BIN = null
function resolveBin(name) {                       // 함정 ③
  if (BIN) return BIN
  const cmd = process.platform === 'win32' ? `where ${name}` : `which ${name}`
  const found = execSync(cmd, { encoding: 'utf8' })
    .split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
  BIN = found.find((p) => p.toLowerCase().endsWith('.cmd')) || found[0] || name
  return BIN
}

export function cliCall(prompt, { bin, args, timeoutMs = 300_000 } = {}) {
  const work = mkdtempSync(resolve(tmpdir(), 'cli-call-'))   // 함정 ⑤: cwd 격리
  return new Promise((ok, fail) => {
    const child = spawn(resolveBin(bin), args(prompt), { cwd: work })
    let out = '', err = ''
    let settled = false
    const done = (fn) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      rmSync(work, { recursive: true, force: true })
      fn()
    }
    const timer = setTimeout(                                 // 함정 ④
      () => { child.kill('SIGKILL'); done(() => fail(new Error('시간 초과'))) },
      timeoutMs,
    )
    child.stdout.on('data', (d) => { out += d })
    child.stderr.on('data', (d) => { err += d })
    child.on('exit', (code) => done(() =>                     // close 아닌 exit
      code === 0 ? ok(out.trim()) : fail(new Error(err.slice(0, 300)))))
  })
}
```

사용:

```js
const text = await cliCall('프롬프트', {
  bin: 'agy',
  args: (p) => ['-p', p, '--dangerously-skip-permissions',
                '--model', 'gemini-3.8-flash-high', '--print-timeout', '15m'],
})
```

프롬프트를 stdin으로 넣는 CLI(codex)는 `child.stdin.end(prompt)`를 더하고, 결과를 파일로 받는 CLI는 임시 파일 경로를 args에 심어 종료 후 읽는다.

---

## 8. 안 하는 것

- **재귀 호출** — 부른 에이전트가 또 부르게 두지 않는다. 동시 실행 수가 통제를 벗어난다.
- **배치 중복 기동** — 같은 배치를 둘 이상 겹쳐 띄우지 않는다. DB 경합과 로그 중복이 생긴다.
- **검수 없는 DB 직행** — 문장 품질에 사실 오류가 가려진다. 사람이나 다른 모델의 검수 단계를 반드시 끼운다.
- **자연어 완료 보고 신뢰** — 5절의 3단계 판정을 거치지 않고 다음 단계로 넘어가지 않는다.
- **비밀 노출** — MCP 인자에 토큰이 들어 있으면 프로세스 목록과 로그에 남는다. 원문을 대화나 로그에 출력하지 않는다.
