Get-ChildItem sw/remotion/out -Recurse | Where-Object { $_.Attributes -match "ReparsePoint" } | ForEach-Object {
    $path = $_.FullName
    Write-Host "Deleting symlink: $path"
    [System.IO.File]::Delete($path)
    Write-Host "Deleted successfully."
}
