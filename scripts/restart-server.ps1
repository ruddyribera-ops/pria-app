# restart-server.ps1 - PRIA server restart with health check
# Usage: restart-server.ps1 [-DryRun] [-SkipBuild]
# Exit codes: 0=success, 1=health check failed, 2=build failed

param(
    [switch]$DryRun,
    [switch]$SkipBuild
)

$PORT = 3000
$HEALTH_URL = "http://localhost:$PORT/api/health"
$MAX_ATTEMPTS = 30
$LOG_DIR = "$PSScriptRoot\..\logs"
$SERVER_OUT = "$LOG_DIR\server.out.log"
$SERVER_ERR = "$LOG_DIR\server.err.log"

# Ensure logs directory exists
if (-not (Test-Path $LOG_DIR)) {
    New-Item -ItemType Directory -Path $LOG_DIR -Force | Out-Null
}

# Dry run mode
if ($DryRun) {
    Write-Host "[restart] DRY RUN - no changes made"
    exit 0
}

# Kill existing node process on port 3000
Write-Host "[restart] Checking for existing process on port $PORT..."
$conn = Get-NetTCPConnection -LocalPort $PORT -State Listen -ErrorAction SilentlyContinue
if ($conn) {
    $pid = $conn.OwningProcess | Select-Object -First 1
    Write-Host "[restart] Stopping process $pid..."
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
} else {
    Write-Host "[restart] No existing process on port $PORT"
}

# Build
if ($SkipBuild) {
    Write-Host "[restart] Skipping build (SkipBuild)"
} else {
    Write-Host "[restart] Running npm run build..."
    Push-Location "$PSScriptRoot\..\server"
    try {
        $buildOutput = npm run build 2>&1 | Tee-Object -Variable lines
        $exitCode = $LASTEXITCODE
        if ($exitCode -ne 0) {
            Write-Host "[restart] BUILD FAILED (exit $exitCode):"
            $lines | ForEach-Object { Write-Host $_ }
            Pop-Location
            exit 2
        }
        Write-Host "[restart] Build succeeded"
    } catch {
        Write-Host "[restart] BUILD ERROR: $_"
        Pop-Location
        exit 2
    }
    Pop-Location
}

# Copy prompt .md files to dist (defensive)
$srcPromptsDir = "$PSScriptRoot\..\server\src\motores\prompts"
$distPromptsDir = "$PSScriptRoot\..\server\dist\motores\prompts"
if ((Test-Path $srcPromptsDir) -and (Test-Path $distPromptsDir)) {
    $mdFiles = Get-ChildItem -Path $srcPromptsDir -Filter "*.md"
    foreach ($f in $mdFiles) {
        Copy-Item -Path $f.FullName -Destination $distPromptsDir -Force
    }
    Write-Host "[restart] Copied $($mdFiles.Count) prompt files to dist"
}

# Start server
Write-Host "[restart] Starting server..."
$serverScript = "$PSScriptRoot\..\server\dist\index.js"
if (-not (Test-Path $serverScript)) {
    Write-Host "[restart] ERROR: dist\index.js not found at $serverScript"
    exit 2
}

$proc = Start-Process `
    -FilePath "node" `
    -ArgumentList $serverScript `
    -NoNewWindow `
    -PassThru `
    -RedirectStandardOutput $SERVER_OUT `
    -RedirectStandardError $SERVER_ERR

if (-not $proc) {
    Write-Host "[restart] ERROR: Failed to start node process"
    exit 2
}

Write-Host "[restart] Server started (PID: $($proc.Id)), waiting for health..."

# Health check loop
$healthy = $false
for ($i = 1; $i -le $MAX_ATTEMPTS; $i++) {
    Start-Sleep -Seconds 1
    try {
        Invoke-WebRequest -Uri $HEALTH_URL -UseBasicParsing -TimeoutSec 2 | Out-Null
        $healthy = $true
        Write-Host "[restart] Server healthy after ${i}s"
        break
    } catch {
        if ($i % 5 -eq 0) {
            Write-Host "[restart] Health check attempt $i/$MAX_ATTEMPTS..."
        }
    }
}

if (-not $healthy) {
    Write-Host "[restart] HEALTH CHECK FAILED after $MAX_ATTEMPTS attempts"
    if (Test-Path $SERVER_ERR) {
        $errLines = Get-Content $SERVER_ERR -Tail 30
        Write-Host "[restart] Last 30 lines of server.err.log:"
        $errLines | ForEach-Object { Write-Host $_ }
    }
    exit 1
}

Write-Host "[restart] Server ready"
exit 0
