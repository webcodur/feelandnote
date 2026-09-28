param(
  [string]$Action = 'tree',
  [string]$Name,
  [string]$Type,
  [string]$Value,
  [int]$Depth = 8,
  [int]$Index = 0
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Windows.Forms

$root = [System.Windows.Automation.AutomationElement]::RootElement
$cond = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ClassNameProperty, 'Chrome_WidgetWin_1')
$wins = $root.FindAll([System.Windows.Automation.TreeScope]::Children, $cond)
if ($wins.Count -eq 0) { Write-Output 'NO_CHROME_WINDOW'; exit 1 }
# pick the largest window owned by real chrome.exe (not aside/edge)
$win = $null
foreach ($w in $wins) {
  try {
    $proc = Get-Process -Id $w.Current.ProcessId -ErrorAction Stop
    if ($proc.ProcessName -eq 'chrome') {
      if (-not $win -or ($w.Current.BoundingRectangle.Width * $w.Current.BoundingRectangle.Height) -gt ($win.Current.BoundingRectangle.Width * $win.Current.BoundingRectangle.Height)) { $win = $w }
    }
  } catch {}
}
if (-not $win) { Write-Output 'NO_REAL_CHROME_WINDOW'; exit 1 }

function Dump-Tree($el, $depth, $max) {
  if ($depth -gt $max) { return }
  $c = $el.Current
  $name = $c.Name
  if ($name.Length -gt 90) { $name = $name.Substring(0,90) }
  $r = $c.BoundingRectangle
  Write-Output ("{0}{1} [{2}] name='{3}' rect={4},{5},{6},{7}" -f ('  ' * $depth), $c.ControlType.ProgrammaticName, $c.AutomationId, $name, [int]$r.X, [int]$r.Y, [int]$r.Width, [int]$r.Height)
  $kids = $el.FindAll([System.Windows.Automation.TreeScope]::Children, [System.Windows.Automation.Condition]::TrueCondition)
  foreach ($k in $kids) { Dump-Tree $k ($depth+1) $max }
}

switch ($Action) {
  'tree' {
    Write-Output ("WIN title='" + $win.Current.Name + "'")
    Dump-Tree $win 0 $Depth
  }
  'find' {
    # find elements by name substring; optional Type filter (e.g. 'Button','Edit','ComboBox','Text','Document')
    $all = $win.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)
    $i = 0
    foreach ($e in $all) {
      $n = $e.Current.Name
      if ($n -and $n -match [regex]::Escape($Name)) {
        $ct = $e.Current.ControlType.ProgrammaticName
        if ($Type -and $ct -notmatch $Type) { continue }
        $r = $e.Current.BoundingRectangle
        Write-Output ("[{0}] {1} name='{2}' rect={3},{4},{5},{6}" -f $i, $ct, $n, [int]$r.X, [int]$r.Y, [int]$r.Width, [int]$r.Height)
        $i++
      }
    }
    Write-Output ("MATCHES " + $i)
  }
  'invoke' {
    # invoke (click) the Index-th element matching Name
    $all = $win.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)
    $i = 0
    foreach ($e in $all) {
      $n = $e.Current.Name
      if ($n -and $n -match [regex]::Escape($Name)) {
        if ($Type -and $e.Current.ControlType.ProgrammaticName -notmatch $Type) { continue }
        if ($i -eq $Index) {
          try {
            $ip = $e.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
            $ip.Invoke()
            Write-Output ("INVOKED '" + $n + "'")
          } catch {
            # fallback: click center
            $r = $e.Current.BoundingRectangle
            $x = [int]($r.X + $r.Width/2); $y = [int]($r.Y + $r.Height/2)
            [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point($x,$y)
            Add-Type -TypeDefinition 'using System.Runtime.InteropServices; public class M { [DllImport("user32.dll")] public static extern void mouse_event(int f,int x,int y,int d,int e); }' -ErrorAction SilentlyContinue
            [M]::mouse_event(0x0002,0,0,0,0); [M]::mouse_event(0x0004,0,0,0,0)
            Write-Output ("CLICKED '" + $n + "' at $x,$y")
          }
          exit 0
        }
        $i++
      }
    }
    Write-Output 'NOT_FOUND'
    exit 1
  }
  'setvalue' {
    # set value of the Index-th Edit/ComboBox matching Name (empty Name = first match of Type)
    $all = $win.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)
    $i = 0
    foreach ($e in $all) {
      $ct = $e.Current.ControlType.ProgrammaticName
      if ($Type -and $ct -notmatch $Type) { continue }
      $n = $e.Current.Name
      if ($Name -and -not ($n -and $n -match [regex]::Escape($Name))) { continue }
      if ($i -eq $Index) {
        try {
          $e.SetFocus()
          Start-Sleep -Milliseconds 300
          $vp = $e.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
          $vp.SetValue($Value)
          Write-Output ("SET '" + $n + "' = '" + $Value + "'")
        } catch {
          Write-Output ("SET_FAIL " + $_.Exception.Message)
          exit 1
        }
        exit 0
      }
      $i++
    }
    Write-Output 'NOT_FOUND'
    exit 1
  }
  'sendkeys' {
    # send keys to currently focused element
    [System.Windows.Forms.SendKeys]::SendWait($Value)
    Write-Output ("KEYS " + $Value)
  }
  'text' {
    # dump all text/document elements' names (page readable text)
    $all = $win.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)
    $sb = New-Object System.Text.StringBuilder
    foreach ($e in $all) {
      $n = $e.Current.Name
      if ($n -and $n.Trim().Length -gt 0) { [void]$sb.AppendLine($n) }
    }
    Write-Output $sb.ToString()
  }
}
