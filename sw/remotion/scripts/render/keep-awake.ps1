# 렌더 중 시스템 유휴 대기(Modern Standby) 진입 차단 — 밤샘 렌더 동결 방지.
# render-all.ts가 자신의 PID를 넘겨 실행한다. 렌더 프로세스가 사라지면 스스로 종료하고,
# 실행 상태 잠금은 프로세스 종료와 함께 OS가 자동 해제한다.
param([Parameter(Mandatory)][int]$RenderPid)

Add-Type -Name PowerUtil -Namespace Win32 -MemberDefinition @'
[DllImport("kernel32.dll")]
public static extern uint SetThreadExecutionState(uint esFlags);
'@

# ES_CONTINUOUS(0x80000000) | ES_SYSTEM_REQUIRED(0x00000001)
$FLAGS = [uint32]"0x80000001"

while ($true) {
    [Win32.PowerUtil]::SetThreadExecutionState($FLAGS) | Out-Null
    Start-Sleep -Seconds 50
    if (-not (Get-Process -Id $RenderPid -ErrorAction SilentlyContinue)) { break }
}
