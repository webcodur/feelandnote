# 부모가 죽어 고아로 남은 codex 프로세스를 정리한다.
#
# codex 호출 하나가 자식 프로세스를 여럿 띄운다(실측: 동시 3에 22개, 4.5GB). 배치가 강제
# 종료되면 이것들이 통째로 고아가 되어 메모리를 계속 쥐고, 다음 배치가 같은 이유로 또 죽는다.
# 부모 PID 가 살아 있지 않은 것만 고르므로, 지금 돌고 있는 다른 세션의 codex 는 건드리지 않는다.
#
# 출력: 두 줄 — 죽인 개수, 회수한 MB

$all = @(Get-CimInstance Win32_Process -Filter "Name = 'codex.exe'")
$orphan = @($all | Where-Object {
  -not (Get-Process -Id $_.ParentProcessId -ErrorAction SilentlyContinue)
})
$freed = 0
if ($orphan.Count -gt 0) {
  $freed = [int]((($orphan | Measure-Object WorkingSetSize -Sum).Sum) / 1MB)
  foreach ($p in $orphan) {
    Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
  }
}
Write-Output $orphan.Count
Write-Output $freed
