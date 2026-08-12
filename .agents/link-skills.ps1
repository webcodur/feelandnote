# .agents/skills 의 스킬을 .claude/skills 에 정션으로 연결한다.
# Claude Code 는 .agents 를 스캔하지 않으므로 이 연결이 있어야 스킬을 호출할 수 있다.
# 정션은 관리자 권한 없이 만들어지며, 원본을 그 자리에서 참조하므로 사본이 생기지 않는다.
#
# 사용: 저장소 루트에서  powershell -File .agents/link-skills.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$src  = Join-Path $root '.agents\skills'
$dst  = Join-Path $root '.claude\skills'

if (-not (Test-Path $dst)) { New-Item -ItemType Directory -Path $dst | Out-Null }

$created = 0
$skipped = 0

foreach ($dir in Get-ChildItem -Path $src -Directory) {
    $link = Join-Path $dst $dir.Name

    if (Test-Path $link) { $skipped++; continue }

    New-Item -ItemType Junction -Path $link -Target $dir.FullName | Out-Null
    Write-Host ("연결 " + $dir.Name)
    $created++
}

Write-Host ""
Write-Host ("신규 연결 {0}건, 기존 유지 {1}건" -f $created, $skipped)
Write-Host "새로 연결한 스킬은 .gitignore 에도 추가한다."
