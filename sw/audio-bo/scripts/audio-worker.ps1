param(
  [Parameter(Mandatory=$true)][string]$JobId,
  [Parameter(Mandatory=$true)][ValidateSet('extract','clean','transcribe','train','synthesize')][string]$Operation
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = $env:AUDIO_BO_ROOT
if (-not $ProjectRoot) { $ProjectRoot = 'D:\audios\interview-cleaner\projects' }
$CleanerRoot = $env:INTERVIEW_CLEANER_ROOT
if (-not $CleanerRoot) { $CleanerRoot = 'D:\audios\interview-cleaner' }
$ToolRoot = $env:GPT_SOVITS_ROOT
if (-not $ToolRoot) { $ToolRoot = 'D:\GPT-SoVITS\GPT-SoVITS-v2pro-20250604' }
$JobRoot = Join-Path $ProjectRoot $JobId
$JobFile = Join-Path $JobRoot 'job.json'
$LogFile = Join-Path $JobRoot 'worker.log'
$ErrorLog = Join-Path $JobRoot 'worker-error.log'
$Python = Join-Path $CleanerRoot '.venv\Scripts\python.exe'
$Utf8 = New-Object System.Text.UTF8Encoding($false)

function Read-Job { Get-Content -LiteralPath $JobFile -Raw -Encoding UTF8 | ConvertFrom-Json }
function Save-Job($Job) {
  $Job.updatedAt = (Get-Date).ToUniversalTime().ToString('o')
  [IO.File]::WriteAllText($JobFile, ($Job | ConvertTo-Json -Depth 8), $Utf8)
}
function Set-State([string]$Stage, [int]$Progress, [string]$Message) {
  $Job = Read-Job
  $Job.stage = $Stage
  $Job.progress = $Progress
  $Job.message = $Message
  Save-Job $Job
}
function Invoke-Native([scriptblock]$Command) {
  $Previous = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  & $Command
  $Code = $LASTEXITCODE
  $ErrorActionPreference = $Previous
  if ($Code -ne 0) { throw "외부 프로그램 실행 실패: $Code" }
}

try {
  $Job = Read-Job
  $InputDir = Join-Path $JobRoot 'input'
  $OutputDir = Join-Path $JobRoot 'output'
  New-Item -ItemType Directory -Force -Path $InputDir,$OutputDir | Out-Null

  if ($Operation -eq 'extract') {
    Set-State 'extracting' 8 '영상을 D드라이브로 가져오는 중'
    $Template = Join-Path $InputDir 'source.%(ext)s'
    Invoke-Native { & yt-dlp --no-playlist -f 'bv*[height<=720]+ba/b[height<=720]' --merge-output-format mp4 -o $Template $Job.sourceUrl 1>> $LogFile 2>> $ErrorLog }
    $Video = (Get-ChildItem -LiteralPath $InputDir -Filter 'source*.mp4' | Select-Object -First 1).FullName
    $Source = Join-Path $InputDir 'source.wav'
    $Ffmpeg = Join-Path $ToolRoot 'runtime\ffmpeg.exe'
    $Ffprobe = Join-Path $ToolRoot 'runtime\ffprobe.exe'
    Invoke-Native { & $Ffmpeg -y -i $Video -vn -ac 1 -ar 48000 $Source 1>> $LogFile 2>> $ErrorLog }
    $Duration = [math]::Round([double](& $Ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 $Video), 2)
    $Job = Read-Job
    $Job.files | Add-Member -NotePropertyName source -NotePropertyValue $Source -Force
    $Job.files | Add-Member -NotePropertyName video -NotePropertyValue $Video -Force
    $Job | Add-Member -NotePropertyName durationSeconds -NotePropertyValue $Duration -Force
    Save-Job $Job
    Set-State 'idle' 20 '영상과 원본 음원 준비 완료'
  }

  elseif ($Operation -eq 'clean') {
    if (-not $Job.files.source) { throw '먼저 음원을 가져오세요.' }
    Set-State 'cleaning' 28 '변화하는 배경 소음을 줄이는 중'
    $Model = Join-Path $CleanerRoot 'models\DeepFilterNet3'
    Invoke-Native { & (Join-Path $CleanerRoot '.venv\Scripts\deepFilter.exe') --model-base-dir $Model --atten-lim 18 --output-dir $OutputDir $Job.files.source 1>> $LogFile 2>> $ErrorLog }
    $Cleaned = (Get-ChildItem -LiteralPath $OutputDir -Filter '*DeepFilterNet3.wav' | Select-Object -First 1).FullName
    $Job = Read-Job; $Job.files | Add-Member -NotePropertyName cleaned -NotePropertyValue $Cleaned -Force; Save-Job $Job
    Set-State 'idle' 40 '원본과 잡음 감소본 준비 완료'
  }

  elseif ($Operation -eq 'transcribe') {
    if (-not $Job.files.source) { throw '먼저 음원을 가져오세요.' }
    Set-State 'transcribing' 48 '원본과 보정본을 받아쓰는 중'
    Invoke-Native { & $Python (Join-Path $PSScriptRoot 'transcribe.py') --job $JobFile --cleaner-root $CleanerRoot --ffmpeg (Join-Path $ToolRoot 'runtime\ffmpeg.exe') 1>> $LogFile 2>> $ErrorLog }
    Set-State 'idle' 60 '받아쓰기 완료 · 대본을 확인하세요'
  }

  elseif ($Operation -eq 'train') {
    if (-not $Job.transcript) { throw '받아쓰기 대본을 먼저 저장하세요.' }
    Set-State 'training' 66 '학습 자료를 만들고 화자 모델을 학습하는 중'
    Invoke-Native { & $Python (Join-Path $PSScriptRoot 'train-voice.py') --job $JobFile --tool-root $ToolRoot 1>> $LogFile 2>> $ErrorLog }
    Set-State 'idle' 84 '화자 모델 학습 완료'
  }

  elseif ($Operation -eq 'synthesize') {
    if (-not $Job.synthesisText) { throw '새로 읽힐 문장을 입력하고 저장하세요.' }
    Set-State 'synthesizing' 88 '기본·학습·성우형 음성을 만드는 중'
    Invoke-Native { & $Python (Join-Path $PSScriptRoot 'synthesize.py') --job $JobFile --tool-root $ToolRoot 1>> $LogFile 2>> $ErrorLog }
    Set-State 'complete' 100 '세 가지 음성 생성 완료'
  }
} catch {
  $_ | Out-String | Add-Content -LiteralPath $LogFile -Encoding UTF8
  Set-State 'failed' 0 $_.Exception.Message
  exit 1
}


