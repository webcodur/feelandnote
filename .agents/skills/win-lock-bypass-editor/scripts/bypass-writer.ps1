param (
    [Parameter(Mandatory=$true)]
    [string]$FilePath,

    [Parameter(Mandatory=$true)]
    [string]$TempPath
)

$FilePath = [System.IO.Path]::GetFullPath($FilePath)
$TempPath = [System.IO.Path]::GetFullPath($TempPath)

Write-Host "============================================="
Write-Host " [Lock Bypass Writer] Starting Swap Process"
Write-Host " Target File : $FilePath"
Write-Host " Temp Source : $TempPath"
Write-Host "============================================="

if (-not (Test-Path -Path $TempPath)) {
    Write-Error "Error: Temporary file not found at $TempPath"
    exit 1
}

$maxAttempts = 5
$attempt = 1
$success = $false
$delay = 100

while ($attempt -le $maxAttempts -and -not $success) {
    try {
        if ($attempt -gt 1) {
            Write-Host "Re-trying swap operation... (Attempt $attempt)"
        }
        Move-Item -Path $TempPath -Destination $FilePath -Force -ErrorAction Stop
        $success = $true
        Write-Host "Success: Swap completed successfully."
    }
    catch {
        Write-Warning "Attempt $attempt failed: $_"
        if ($attempt -lt $maxAttempts) {
            Write-Host "Waiting $delay ms before next attempt..."
            Start-Sleep -Milliseconds $delay
            $delay = $delay * 2
        }
        $attempt++
    }
}

if (-not $success) {
    Write-Error "Error: Failed to replace file after $maxAttempts attempts."
    exit 1
}

if (Test-Path -Path $TempPath) {
    Remove-Item -Path $TempPath -Force -ErrorAction SilentlyContinue
}
