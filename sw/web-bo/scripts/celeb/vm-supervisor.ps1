# Virtual monologue batch supervisor.
# ASCII only: Windows PowerShell 5.1 reads this file with the ANSI codepage.
# Runs the agy batch, restarts it after a memory kill, and retries 30 minutes
# after the batch stops itself (quota or login). Stop reason comes from the
# batch output file: Start-Process -PassThru returns an empty ExitCode here.
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File <this file>
$repo = 'C:\project\feelandnote'
$s = 'C:\project\_vm-work'
$log = "$s\supervisor.log"
$MinFreeMB = 2000
$script = 'sw/web-bo/scripts/celeb/virtual-monologue.mjs'

if (-not (Test-Path $s)) { New-Item -ItemType Directory -Path $s | Out-Null }

function Write-Log($text) { Add-Content $log "$(Get-Date -f 'HH:mm:ss') $text" }

function Test-Running {
  @(Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match 'virtual-monologue\.mjs (light|repair)' }).Count -gt 0
}

# Returns $true when the batch stopped itself (quota or login), $false otherwise.
function Start-Batch($engineArgs, $tag) {
  $stamp = Get-Date -f 'MMdd-HHmmss'
  $outFile = "$s\$tag-$stamp.out"
  $p = Start-Process -FilePath 'node' -WorkingDirectory $repo -WindowStyle Hidden -PassThru `
    -ArgumentList (@('--env-file=sw/web-bo/.env', $script) + $engineArgs) `
    -RedirectStandardOutput $outFile -RedirectStandardError "$s\$tag-$stamp.err"
  Write-Log "$tag start pid=$($p.Id)"
  $p.WaitForExit()

  $summary = ''
  if (Test-Path $outFile) {
    $lines = @(Get-Content $outFile -Encoding UTF8 -ErrorAction SilentlyContinue)
    if ($lines.Count -gt 0) { $summary = $lines[-1] }
  }
  $applied = 0
  if ($summary -match '"applied":(\d+)') { $applied = [int]$Matches[1] }
  $halted = ($summary -match '"stopped":"[^"]+"')
  Write-Log "$tag done applied=$applied halted=$halted"
  return $halted
}

Write-Log 'supervisor start'
while ($true) {
  while (Test-Running) { Start-Sleep -Seconds 60 }

  $free = [int]((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1KB)
  if ($free -lt $MinFreeMB) {
    Write-Log "wait memory free=${free}MB"
    Start-Sleep -Seconds 120
    continue
  }

  # 고칠 것을 먼저 고치고, 남은 인물을 새로 쓴다.
  $halted = Start-Batch @('repair', '--apply', '--out', "$s\repair-auto.jsonl") 'repair'
  if (-not $halted) {
    $halted = Start-Batch @('light', '--apply', '--out', "$s\light-auto.jsonl") 'agy'
  }
  if ($halted) {
    Write-Log 'agy halted - waiting 30 minutes before retry'
    Start-Sleep -Seconds 1800
  }
  else {
    Start-Sleep -Seconds 30
  }
}
