---
name: remo-render-kill
description: 진행 중인 Remotion 렌더 프로세스를 자식 트리까지 강제 종료한다. "랜더 중지", "렌더 끄기", "render kill", "렌더 죽여" 등으로 호출. Remotion Studio(개발 서버)와 Next.js dev 서버는 보존한다.
---

# Remotion Render Kill — 렌더 작업 강제 종료

`render-all.ts` / `remotion-cli render` 작업을 자식 프로세스 트리까지 완전 종료한다.

## 왜 필요한가

- `TaskStop`(Claude Code의 background task 중지)은 **bash 셸만** 종료한다. `pnpm` → `tsx` → `node render-all.ts` → `pnpm render` → `remotion-cli render` → `chrome-headless-shell` 식으로 손자·증손자 프로세스가 살아남아 컴퓨터가 계속 돈다.
- Windows의 `taskkill`은 한국어 로케일에서 인자 파싱 버그가 있어 PowerShell `Stop-Process`를 쓴다.
- 같은 이름(`node.exe`)이 수십 개 떠 있어 PID만으로는 못 가른다. **CommandLine 매칭**이 필수다.

## 호출 키워드

- `/render-kill`, `/렌더-중지`
- "렌더 멈춰", "랜더 중지", "render kill", "렌더 끄기", "렌더 죽여"
- TaskStop으로 중지했는데 컴퓨터가 계속 돈다고 사용자가 말할 때

## 보존 대상 (절대 죽이면 안 됨)

| 프로세스 | 식별 단서 |
|---------|-----------|
| Remotion Studio | CommandLine에 `remotion-cli ... studio` |
| Next.js dev (web/web-bo) | `next dev` 또는 `next/dist/server/lib/start-server.js` |
| MCP 서버 | `mcp-server-*` |
| Claude Code 본체 | `claude` 또는 본 프로세스 자신 |

매칭 패턴은 반드시 **`render`** 또는 **`render-all`** 또는 **`remotion-cli ... render`**(studio 제외)를 포함하는 것만 노린다.

## 실행 흐름

### Step 1: 렌더 프로세스 식별

```powershell
Get-CimInstance Win32_Process |
  Where-Object {
    $_.CommandLine -match "render-all\.ts|remotion-cli.*\brender\b(?!.*studio)|pnpm.*render:all|pnpm\s+render\s+\w+-(KO|EN)-" -and
    $_.CommandLine -notmatch "studio"
  } |
  Select-Object ProcessId, ParentProcessId, Name, CommandLine |
  Format-Table -Wrap -AutoSize
```

매칭 패턴 의도:
- `render-all\.ts` — 최상위 tsx 진입점
- `remotion-cli.*\brender\b` — `remotion render` (studio 제외)
- `pnpm.*render:all` — pnpm 스크립트 진입점
- `pnpm\s+render\s+\w+-(KO|EN)-` — `pnpm render <CompId>` (예: `ZhugeLiang-KO-S3-VID`)

식별된 PID 목록을 사용자에게 보여주고 진행 확인을 받는다(대화 맥락상 명백한 중지 요청이면 생략 가능).

### Step 2: 자식 트리까지 종료

PowerShell `Stop-Process -Force`는 **자식 프로세스를 자동 종료하지 않는다.** 부모 PID를 따라 트리를 직접 수집해 한 번에 죽인다.

```powershell
$targets = @(<PID목록>)  # Step 1 결과
$all = @{}
function Add-Tree($pid) {
  if ($all.ContainsKey($pid)) { return }
  $all[$pid] = $true
  Get-CimInstance Win32_Process -Filter "ParentProcessId=$pid" |
    ForEach-Object { Add-Tree $_.ProcessId }
}
$targets | ForEach-Object { Add-Tree $_ }
$pids = $all.Keys
Stop-Process -Id $pids -Force -ErrorAction SilentlyContinue
"Killed: $($pids -join ', ')"
```

### Step 3: chrome-headless-shell 잔존 정리

Remotion 렌더는 헤드리스 크롬을 다수 띄운다. 부모가 이미 죽었으면 고아 상태로 떠 있을 수 있다.

```powershell
Get-Process | Where-Object {
  $_.ProcessName -match "chrome.*headless|headless.*chrome|chrome-headless-shell"
} | Stop-Process -Force -ErrorAction SilentlyContinue
```

부모 프로세스 트리가 정상이면 Step 2에서 같이 죽으므로 보통 0개 잡힌다. 보험용.

### Step 4: 검증

```powershell
$alive = Get-CimInstance Win32_Process |
  Where-Object {
    $_.CommandLine -match "render-all\.ts|remotion-cli.*\brender\b" -and
    $_.CommandLine -notmatch "studio"
  }
if ($alive) {
  $alive | Select-Object ProcessId, CommandLine | Format-Table -Wrap
  "⚠ 잔존 $($alive.Count)건 — 다시 실행 필요"
} else {
  "✓ 렌더 프로세스 0건 (정리 완료)"
}
```

추가 무거운 node 프로세스 점검(보존 대상과 구분):

```powershell
Get-Process node -ErrorAction SilentlyContinue |
  Where-Object { $_.WorkingSet64 -gt 200MB } |
  ForEach-Object {
    $p = Get-CimInstance Win32_Process -Filter "ProcessId=$($_.Id)"
    [PSCustomObject]@{
      Id = $_.Id
      MB = [math]::Round($_.WorkingSet64/1MB)
      Cmd = ($p.CommandLine -split '\s+' | Select-Object -First 4) -join ' '
    }
  } | Format-Table -AutoSize
```

남은 무거운 node가 Studio·Next.js dev·MCP면 정상.

### Step 5: 보고

```
**[렌더 종료]** N개 프로세스 트리 정리
- pnpm render:all (PID …)
- tsx render-all.ts (PID …)
- pnpm render <CompId> (PID …)
- remotion-cli render (PID …)
- chrome-headless-shell ×K (자식)

보존: Remotion Studio(:3002), Next.js dev, MCP 서버
```

## TaskStop과의 관계

Claude Code가 background task로 띄운 렌더는 두 단계로 끈다:

1. **`TaskStop <task_id>`** — bash 셸 종료 (출력 스트림 차단)
2. **이 스킬** — 자식 프로세스 트리 강제 종료

`TaskStop` 단독으로는 렌더가 멈추지 않는다. 사용자가 "취소"를 말한 직후, **이 스킬 호출이 사실상 필수**다.

## 흔한 함정

- `taskkill /F /T /PID …` — 한국어 Windows에서 인자 파싱 깨짐. PowerShell `Stop-Process` 쓴다.
- `Stop-Process -Force`만으로는 자식 안 죽는다 — 트리 수집 후 일괄 처리.
- `wmic`는 Windows 11에서 deprecated. `Get-CimInstance Win32_Process` 사용.
- CommandLine 매칭 시 `studio`를 명시적으로 제외 안 하면 Remotion Studio dev 서버까지 죽인다.
- `pnpm render <CompId>` 는 내부적으로 `remotion-cli render`를 호출하므로 둘 다 잡혀야 안전.
- 매우 빠르게 새 프로세스가 spawn될 수 있어 Step 2 직후 Step 4에서 잔존 1~2건 보일 수 있다 — 한 번 더 실행하면 정리됨.
