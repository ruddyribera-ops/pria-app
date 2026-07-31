# dev.ps1 - Unified dev orchestrator for PRIA v10
# Starts backend with tsx watch (no build) and frontend with vite
# Tails logs with [BACKEND] / [FRONTEND] prefixes
# Usage: .\scripts\dev.ps1
# On Ctrl+C: kills both child processes cleanly

param(
    [int]$BackendPort = 3000,
    [int]$FrontendPort = 5173,
    [int]$HealthTimeout = 30
)

$ErrorActionPreference = 'Stop'
$LOG_DIR = "$PSScriptRoot\..\logs"
$BACKEND_LOG = "$LOG_DIR\dev-backend.log"
$FRONTEND_LOG = "$LOG_DIR\dev-frontend.log"
$BACKEND_URL = "http://localhost:$BackendPort/api/health"

# Ensure logs directory
if (-not (Test-Path $LOG_DIR)) {
    New-Item -ItemType Directory -Path $LOG_DIR -Force | Out-Null
}

# Clear old logs
"" | Out-File -FilePath $BACKEND_LOG -Encoding UTF8
"" | Out-File -FilePath $FRONTEND_LOG -Encoding UTF8

Write-Host "[DEV] Killing existing processes on ports $BackendPort and $FrontendPort..."
& "$PSScriptRoot\kill-port.ps1" -Port $BackendPort -TimeoutSec 3 | Out-Null
& "$PSScriptRoot\kill-port.ps1" -Port $FrontendPort -TimeoutSec 3 | Out-Null
Start-Sleep -Seconds 1

Write-Host "[DEV] Starting backend (tsx watch)..."
$backendProc = Start-Process `
    -FilePath "npm" `
    -ArgumentList "run dev" `
    -WorkingDirectory "$PSScriptRoot\..\server" `
    -Environment @{ NODE_ENV = "development" } `
    -NoNewWindow `
    -PassThru `
    -RedirectStandardOutput $BACKEND_LOG `
    -RedirectStandardError "$LOG_DIR\dev-backend.err.log"

Write-Host "[DEV] Backend started (PID: $($backendProc.Id)), waiting for health..."

# Poll health endpoint
$healthy = $false
for ($i = 1; $i -le $HealthTimeout; $i++) {
    Start-Sleep -Seconds 1
    try {
        Invoke-WebRequest -Uri $BACKEND_URL -UseBasicParsing -TimeoutSec 2 | Out-Null
        $healthy = $true
        Write-Host "[DEV] Backend healthy after ${i}s"
        break
    } catch {
        if ($i % 5 -eq 0) {
            Write-Host "[DEV] Waiting for backend... $i/${HealthTimeout}s"
        }
    }
}

if (-not $healthy) {
    Write-Host "[DEV] WARNING: Backend did not become healthy in ${HealthTimeout}s"
    Write-Host "[DEV] Proceeding anyway - check logs/dev-backend.log for errors"
}

Write-Host "[DEV] Starting frontend (vite) on port $FrontendPort..."
$frontendProc = Start-Process `
    -FilePath "npm" `
    -ArgumentList "run dev" `
    -WorkingDirectory "$PSScriptRoot\.." `
    -NoNewWindow `
    -PassThru `
    -RedirectStandardOutput $FRONTEND_LOG `
    -RedirectStandardError "$LOG_DIR\dev-frontend.err.log"

Write-Host "[DEV] Frontend started (PID: $($frontendProc.Id))"
Write-Host ""
Write-Host "[DEV] === DEV SERVERS RUNNING ==="
Write-Host "[DEV] Backend:  http://localhost:$BackendPort"
Write-Host "[DEV] Frontend: http://localhost:$FrontendPort"
Write-Host "[DEV] Logs: $LOG_DIR\dev-backend.log, $LOG_DIR\dev-frontend.log"
Write-Host "[DEV] Press Ctrl+C to stop both servers"
Write-Host ""

# Tail logs in foreground using background jobs
$backendTailJob = Start-Job -ScriptBlock {
    param($log, $prefix)
    Get-Content $log -Wait -Tail 50 | ForEach-Object { Write-Host "$prefix $_" }
} -ArgumentList $BACKEND_LOG, "[BACKEND]"

$frontendTailJob = Start-Job -ScriptBlock {
    param($log, $prefix)
    Get-Content $log -Wait -Tail 50 | ForEach-Object { Write-Host "$prefix $_" }
} -ArgumentList $FRONTEND_LOG, "[FRONTEND]"

# Wait for either child process to exit (crash detection)
$exited = $null
try {
    $exited = Wait-Process -Id $backendProc.Id, $frontendProc.Id -Timeout 31536000
} catch {
    # Timeout means both still running - this is the normal case
}

# Ctrl+C or crash detected
Write-Host ""
Write-Host "[DEV] Shutting down..."

# Kill background tail jobs
Stop-Job -Job $backendTailJob, $frontendTailJob -ErrorAction SilentlyContinue
Remove-Job -Job $backendTailJob, $frontendTailJob -Force -ErrorAction SilentlyContinue

# Kill child processes
if ($backendProc -and -not $backendProc.HasExited) {
    Stop-Process -Id $backendProc.Id -Force -ErrorAction SilentlyContinue
    Write-Host "[DEV] Backend stopped"
}
if ($frontendProc -and -not $frontendProc.HasExited) {
    Stop-Process -Id $frontendProc.Id -Force -ErrorAction SilentlyContinue
    Write-Host "[DEV] Frontend stopped"
}

Write-Host "[DEV] Done"
