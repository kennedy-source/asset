$ErrorActionPreference = 'Stop'
$base = Split-Path -Parent $PSScriptRoot
$paths = @(
    Join-Path $base 'artifacts\pajoy',
    Join-Path $base 'artifacts\api-server',
    Join-Path $base 'lib'
)
$files = @()
foreach ($p in $paths) {
    if (Test-Path $p) { $files += Get-ChildItem -Path $p -Recurse -File -ErrorAction SilentlyContinue }
}
if ($files.Count -gt 0) {
    $latest = ($files | Measure-Object -Property LastWriteTime -Maximum).Maximum
} else {
    $latest = Get-Date '1/1/2000'
}
$markerFile = Join-Path $base '.last_built'
if (Test-Path $markerFile) { $lastBuilt = (Get-Item $markerFile).LastWriteTime } else { $lastBuilt = Get-Date '1/1/2000' }

if ($latest -gt $lastBuilt) {
    Write-Host "Detected changes since last build (latest: $latest). Building images..."
    docker compose build
    if ($LASTEXITCODE -ne 0) { Write-Error "docker compose build failed with exit code $LASTEXITCODE"; exit $LASTEXITCODE }
    if (Test-Path $markerFile) { Remove-Item $markerFile -Force }
    New-Item -Path $markerFile -ItemType File -Force | Out-Null
    (Get-Item $markerFile).LastWriteTime = Get-Date
    Write-Host "Build completed; updated marker file."
} else {
    Write-Host "No changes detected since last build; skipping image build."
}
