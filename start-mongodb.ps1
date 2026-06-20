$dataDir = "C:\ProgramData\MongoDB\data"
$logFile = "C:\ProgramData\MongoDB\log\mongod.log"

if (-not (Test-Path $dataDir)) { New-Item -ItemType Directory -Path $dataDir -Force | Out-Null }
if (-not (Test-Path (Split-Path $logFile))) { New-Item -ItemType Directory -Path (Split-Path $logFile) -Force | Out-Null }

$existing = Get-Process mongod -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "MongoDB is already running (PID: $($existing.Id))"
    exit
}

Start-Process -FilePath "C:\Program Files\MongoDB\Server\8.3\bin\mongod.exe" -ArgumentList "--dbpath", $dataDir, "--port", "27017", "--bind_ip", "127.0.0.1" -WindowStyle Hidden

Start-Sleep -Seconds 4
$proc = Get-Process mongod -ErrorAction SilentlyContinue
if ($proc) {
    Write-Host "MongoDB started (PID: $($proc.Id))"
} else {
    Write-Host "Failed to start MongoDB - check the log: $logFile"
}
