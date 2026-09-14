---
name: orphan-process-cleanup
description: 클로드코드·codex 등 에이전트를 여러 개 동시에 띄워 쓰다 컴퓨터가 느려졌을 때, 지금 작업 중인 세션·개발 서버·IDE 도구는 건드리지 않고 죽거나 중복 spawn된 고아 프로세스만 찾아 정리한다. MCP 서버 중복(재연결마다 새로 뜨고 이전 게 안 죽는 것)이 가장 흔한 원인이고, 부모 잃은 잔존 자식 프로세스도 같은 방법으로 찾는다. "컴퓨터 느려짐", "프로세스 정리해줘", "고아 프로세스", "헛도는 프로세스", "메모리 많이 먹는다" 등으로 호출. Remotion 렌더 잔존 프로세스는 `remo-render-kill`을 대신 쓴다.
---

# 고아 프로세스 정리

여러 클로드코드·codex 세션을 동시에 켜두고 오래 쓰는 환경에서 컴퓨터가 느려지는 원인은 대개 둘 중 하나다.

1. **MCP 서버 중복 spawn** — 살아있는 에이전트가 물고 있는 MCP stdio 서버(`npx -y <pkg>`로 뜨는 것들, 예: `mcp-server-gsc`, `chrome-devtools-mcp`)가 세션 재연결·turn 전환마다 새로 뜨고 이전 프로세스는 안 죽는다. 하루 방치하면 세션 하나당 여러 개씩 쌓인다. **가장 흔한 원인이고, 아래 패턴 A로 잡는다.**
2. **부모를 잃은 잔존 자식** — 이전에 실행됐던 작업(브라우저 자동화, 임시 스크립트 등)의 부모가 죽었는데 자식 프로세스가 안 죽고 남는다. Remotion 렌더의 `chrome-headless-shell` 잔존처럼 도메인이 뚜렷한 경우는 전용 스킬(`remo-render-kill`)이 있으니 그쪽을 쓴다. 그 외 일반적인 경우는 패턴 B로 접근한다.

공통 원칙: **지금 실제로 일하는 세션·개발 서버·IDE 도구는 절대 안 지운다.** 확신 없는 대상은 사용자에게 목록을 보여주고 확인받는다 — 여러 에이전트가 동시에 살아있는 상황이라 잘못 지우면 남의 작업이 끊긴다.

## 공통 진단 절차

### Step 1: 프로세스 스냅샷 + 부모관계

```powershell
$allProcs = Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId, Name, CommandLine, CreationDate
$byId = @{}
foreach ($p in $allProcs) { $byId[$p.ProcessId] = $p }
```

`$pid`는 PowerShell 예약 변수라 덮어쓸 수 없다. 루프 변수명은 `$startId`처럼 다른 이름을 쓴다.

### Step 2: 소유 에이전트로 거슬러 올라가기

```powershell
function Get-RootAgent($startId, $rootNames = @('codex.exe','claude.exe')) {
  $cur = $startId
  $lastAgent = $null
  for ($i=0; $i -lt 10; $i++) {
    if (-not $byId.ContainsKey($cur)) { break }
    $p = $byId[$cur]
    if ($rootNames -contains $p.Name) { $lastAgent = $p.ProcessId }
    if ($p.ParentProcessId -eq 0 -or $p.ParentProcessId -eq $cur) { break }
    $cur = $p.ParentProcessId
  }
  return $lastAgent
}
```

조상 체인이 8~10단을 걸어 올라가도 알려진 에이전트(`codex.exe`/`claude.exe`, 필요하면 다른 IDE 프로세스명도 추가)로 안 이어지면 이 스킬의 대상이 아니다 — 다른 도구(Antigravity IDE 등)가 띄운 것이니 건드리지 않는다.

## 패턴 A: MCP 서버 중복 spawn

같은 (루트 에이전트, MCP 패키지) 조합에서 생성 시각이 다른 여러 세트가 있으면, 가장 최근 것만 지금 쓰는 연결이고 나머지는 stdio 파이프가 끊긴 채 메모리만 쥐고 있는 고아다. 구조는 3단 트리: `node(npx-cli.js) → cmd.exe(/d /s /c <pkg>) → node(실제 서버)`.

```powershell
$npxAll = $allProcs | Where-Object { $_.CommandLine -like '*npx-cli.js*' }
$rows = foreach ($p in $npxAll) {
  [PSCustomObject]@{
    Pid = $p.ProcessId
    Root = Get-RootAgent $p.ProcessId
    Created = $p.CreationDate
    Pkg = if ($p.CommandLine -match '-y\s+([\w.@/-]+)') { $matches[1] } else { 'unknown' }
  }
}
$rows | Where-Object { $_.Root } | Group-Object Root, Pkg | ForEach-Object {
  $sorted = $_.Group | Sort-Object Created
  if ($sorted.Count -gt 1) {
    $sorted | Select-Object -SkipLast 1   # 최신 1개를 뺀 나머지 = 정리 후보
  }
}
```

동시각(초 단위까지 동일) 생성분끼리는 중복이 아니라 daemon 하나에 딸린 별개 자식 세션일 수 있다 — 조상 체인 끝(claude.exe가 여러 겹인지)까지 봐서 서로 다른 세션인지 구분하고, 헷갈리면 죽이지 않는다.

정리 후보(npx-cli.js PID)의 전체 자식 트리를 모은다:

```powershell
$staleNpx = <위 결과 Pid 목록>
$targets = @()
foreach ($n in $staleNpx) {
  $targets += $n
  $shim = $allProcs | Where-Object { $_.ParentProcessId -eq $n }
  foreach ($s in $shim) {
    $targets += $s.ProcessId
    $targets += ($allProcs | Where-Object { $_.ParentProcessId -eq $s.ProcessId }).ProcessId
  }
}
```

## 패턴 B: 부모 잃은 잔존 자식 (일반)

- 조상 체인 끝이 `[MISSING:*]`(최상위 부모가 이미 종료)인 것 자체는 이상 신호가 아니다 — 백그라운드로 detach된 에이전트는 원래 그렇다.
- 의심 신호는 **① 오래도록 `Responding: False`이거나, ② CPU/메모리가 이상치인데 ③ 조상 체인이 codex.exe/claude.exe/사용자가 지금 쓰는 앱으로 안 이어지는 경우**의 조합이다. 하나만으로 판정하지 않는다.
- 특정 도메인 잔존물(Remotion 렌더의 `chrome-headless-shell` 등)은 전용 스킬이 이미 커맨드라인 매칭 패턴을 갖고 있으니 재발명하지 말고 그걸 쓴다.
- 그 외 케이스는 발견한 프로세스의 `CommandLine`을 사용자에게 보여주고 "이거 지금 뭐 하는 건지 아세요?"로 확인받는 게 가장 안전하다 — 자동 판정 규칙을 섣불리 일반화하지 않는다.

## 종료 · 검증

```powershell
$current = Get-CimInstance Win32_Process | Select-Object ProcessId, CommandLine
foreach ($t in $targets) {
  $c = $current | Where-Object { $_.ProcessId -eq $t }
  if ($c) {
    try { Stop-Process -Id $t -Force -ErrorAction Stop } catch {}
  }
}
```

죽이기 직전에 CommandLine을 재확인하고 kill한다(PID가 그새 재사용됐을 수 있음). 끝나면 각 루트 에이전트와 남겨둔 최신 연결이 `Get-Process -Id`로 여전히 `Responding: True`인지 확인해서 사용자에게 보고한다.

## 흔한 함정

- `taskkill`은 한국어 로케일 인자 파싱 버그가 있다 — PowerShell `Stop-Process` 사용(`remo-render-kill` 스킬과 동일 이유).
- `$pid`, `$args`, `$input` 등은 PowerShell 자동변수라 루프 변수로 재사용하면 조용히 실패한다.
- 이 정리는 근본 수정이 아니라 임시방편이다. MCP 클라이언트가 재연결 시 이전 자식을 안 죽이는 게 원인이므로 시간이 지나면 다시 쌓인다 — 컴퓨터가 다시 느려지면 재실행한다.
