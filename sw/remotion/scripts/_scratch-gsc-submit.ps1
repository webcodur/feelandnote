param(
  [string]$QueueFile,
  [string]$LogFile = 'C:\project\feelandnote\data\.tmp-gsc-submit-0923.log',
  [int]$StartIndex = 0
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition 'using System.Runtime.InteropServices; public class U32 { [DllImport("user32.dll")] public static extern bool SetForegroundWindow(System.IntPtr h); [DllImport("user32.dll")] public static extern void mouse_event(int f,int x,int y,int d,int e); }' -ErrorAction SilentlyContinue

function Log($m) {
  $line = (Get-Date -Format 'HH:mm:ss') + ' ' + $m
  Add-Content -Path $LogFile -Value $line -Encoding UTF8
  Write-Output $line
}

function Get-Win {
  $root = [System.Windows.Automation.AutomationElement]::RootElement
  $cond = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ClassNameProperty, 'Chrome_WidgetWin_1')
  $wins = $root.FindAll([System.Windows.Automation.TreeScope]::Children, $cond)
  $best = $null
  foreach ($w in $wins) {
    try {
      $proc = Get-Process -Id $w.Current.ProcessId -ErrorAction Stop
      if ($proc.ProcessName -eq 'chrome') {
        if (-not $best -or ($w.Current.BoundingRectangle.Width * $w.Current.BoundingRectangle.Height) -gt ($best.Current.BoundingRectangle.Width * $best.Current.BoundingRectangle.Height)) { $best = $w }
      }
    } catch {}
  }
  return $best
}

function Focus-Win($win) {
  try { [U32]::SetForegroundWindow([IntPtr]$win.Current.NativeWindowHandle) | Out-Null } catch {}
}

function Get-AllText($win) {
  $all = $win.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)
  $sb = New-Object System.Text.StringBuilder
  foreach ($e in $all) {
    $n = $e.Current.Name
    if ($n -and $n.Trim().Length -gt 0) { [void]$sb.AppendLine($n) }
  }
  return $sb.ToString()
}

function Find-AllEl($win, $namePat, $typePat) {
  $all = $win.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)
  $out = @()
  foreach ($e in $all) {
    $n = $e.Current.Name
    if (-not $n) { continue }
    if ($namePat -and -not ($n -match $namePat)) { continue }
    if ($typePat -and -not ($e.Current.ControlType.ProgrammaticName -match $typePat)) { continue }
    $out += $e
  }
  return $out
}

function Find-El($win, $namePat, $typePat) {
  $r = Find-AllEl $win $namePat $typePat
  if ($r.Count -gt 0) { return $r[0] }
  return $null
}

# true if element has a Document ancestor (i.e. lives inside web page, not browser chrome)
function In-Page($e) {
  $w = [System.Windows.Automation.TreeWalker]::RawViewWalker
  $p = $e
  for ($i = 0; $i -lt 40; $i++) {
    $p = $w.GetParent($p)
    if (-not $p) { return $false }
    if ($p.Current.ControlType.ProgrammaticName -match 'Document') { return $true }
    if ($p.Current.ControlType.ProgrammaticName -match 'Window|Pane' -and $p.Current.ClassName -eq 'Chrome_WidgetWin_1') { return $false }
  }
  return $false
}

function Invoke-El($e) {
  try {
    $e.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke()
    return $true
  } catch {
    try {
      $r = $e.Current.BoundingRectangle
      Focus-Win (Get-Win)
      Start-Sleep -Milliseconds 300
      [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point([int]($r.X+$r.Width/2),[int]($r.Y+$r.Height/2))
      [U32]::mouse_event(0x0002,0,0,0,0); [U32]::mouse_event(0x0004,0,0,0,0)
      return $true
    } catch { return $false }
  }
}

# close result dialog: pick '닫기' button that lives inside the page document
function Close-Dialog {
  $win = Get-Win
  Focus-Win $win
  $btns = Find-AllEl $win '^\s*닫기\s*$' 'Button'
  foreach ($b in $btns) {
    if (In-Page $b) { Invoke-El $b | Out-Null; return $true }
  }
  # no in-page close button: Esc as fallback
  [System.Windows.Forms.SendKeys]::SendWait('{ESC}')
  return $false
}

function Wait-Inspection($win, $url) {
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 3
    $txt = Get-AllText (Get-Win)
    if ($txt -match [regex]::Escape($url) -and $txt -match '최근 크롤링|URL이 Google에 있습니다|색인이 생성되었습니다|색인이 생성되지 않았습니다') {
      return $txt
    }
  }
  return $null
}

function Wait-Result {
  for ($i = 0; $i -lt 50; $i++) {
    Start-Sleep -Seconds 3
    $txt = Get-AllText (Get-Win)
    if ($txt -match '할당량') { return 'QUOTA' }
    if ($txt -match '색인 생성 요청됨' -and $txt -match '대기열') { return 'ACCEPTED' }
    if ($txt -match '오류 발생') { return 'ERROR' }
  }
  return 'RESULT_TIMEOUT'
}

$urls = Get-Content $QueueFile -Encoding UTF8 | Where-Object { $_.Trim() }
Log ("QUEUE " + $urls.Count + " urls, start=" + $StartIndex)

for ($u = $StartIndex; $u -lt $urls.Count; $u++) {
  $url = $urls[$u]
  $win = Get-Win
  if (-not $win) { Log 'FATAL no chrome window'; break }
  Focus-Win $win

  # 0. close leftover modal dialog if any
  $pre = Get-AllText $win
  if ($pre -match '대기열에 추가되었습니다|할당량|오류 발생') {
    Close-Dialog | Out-Null
    Start-Sleep -Milliseconds 900
  }

  Log "INSPECT[$u] $url"

  # 1. set combobox value + Enter
  # dialog may still be animating out — retry find + close a few times before giving up
  $cb = $null
  for ($t = 0; $t -lt 6 -and -not $cb; $t++) {
    $cb = Find-El (Get-Win) '모든 URL 검사' 'ComboBox'
    if (-not $cb) { $cbs = Find-AllEl (Get-Win) '' 'ComboBox'; if ($cbs.Count -gt 0) { $cb = $cbs[0] } }
    if ($cb) { break }
    $now = Get-AllText (Get-Win)
    if ($now -match '대기열에 추가되었습니다|할당량|오류 발생') { Close-Dialog | Out-Null }
    Start-Sleep -Seconds 2
  }
  if (-not $cb) { Log 'FATAL no combobox'; break }
  $ok = $false
  for ($t = 0; $t -lt 3 -and -not $ok; $t++) {
    try {
      $cb.SetFocus(); Start-Sleep -Milliseconds 400
      $cb.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern).SetValue($url)
      Start-Sleep -Milliseconds 400
      $cur = $cb.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern).Current.Value
      $ok = ($cur -eq $url)
    } catch { Start-Sleep -Milliseconds 500 }
  }
  if (-not $ok) { Log "SETVALUE_FAIL $url"; }
  Focus-Win $win
  [System.Windows.Forms.SendKeys]::SendWait('{ENTER}')

  # 2. wait inspection result
  $txt = Wait-Inspection $win $url
  if (-not $txt) { Log 'INSPECT_TIMEOUT'; continue }
  if ($txt -match 'URL이 Google에 있습니다') { Log 'ALREADY_INDEXED'; continue }
  if ($txt -notmatch '색인 생성 요청') { Log 'NO_REQUEST_BUTTON'; continue }

  # 3. click request button (in page only)
  $btns = Find-AllEl (Get-Win) '색인 생성 요청' 'Button'
  $btn = $null
  foreach ($b in $btns) { if (In-Page $b) { $btn = $b; break } }
  if (-not $btn) { Log 'NO_REQUEST_BUTTON'; continue }
  if (-not (Invoke-El $btn)) { Log 'CLICK_FAIL'; continue }
  Log 'REQUEST_CLICKED'

  # 4. wait live-test result
  $result = Wait-Result
  Log "RESULT $result $url"

  # 5. close dialog
  Start-Sleep -Milliseconds 900
  Close-Dialog | Out-Null
  Start-Sleep -Milliseconds 900

  if ($result -eq 'QUOTA') { Log 'STOP quota exceeded'; break }
}
Log 'DRIVER_DONE'
