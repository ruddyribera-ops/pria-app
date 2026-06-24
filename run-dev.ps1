# PRIA Dev Launcher
# Run this from PowerShell: .\run-dev.ps1

$ErrorActionPreference = "Continue"

Write-Host "=== PRIA Dev Environment ===" -ForegroundColor Cyan

$ProjectRoot = "D:\ACTIVE PROJECTS\PRIA v10"
$ServerDir = "$ProjectRoot\server"

# Kill existing node processes
Write-Host "[clean] Stopping existing node processes..." -ForegroundColor Yellow
taskkill /F /IM node.exe /T 2>$null | Out-Null
Start-Sleep 1

# Start Docker PostgreSQL
Write-Host "[docker] Starting PostgreSQL..." -ForegroundColor Yellow
$existing = docker ps -a --filter "name=pria-pg" --format "{{.Names}}" 2>$null
if ($existing -eq "pria-pg") {
    docker rm -f pria-pg 2>$null | Out-Null
}
docker run -d --name pria-pg -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=pria_local -e POSTGRES_DB=pria -p 5432:5432 postgres:16-alpine
Start-Sleep 3

# Update .env to use PostgreSQL
$envContent = @"
MINIMAX_API_KEY=sk-cp-_heHsYahPF2rslW0e2pySiZAiMxZWhfNgHsdtBvOFLCu2EaqriebA-nWpWqLug6lr_V4JURdzXmlKa1osu_hGIu3_wnYydIL3sO2PO5hR_4j2W9fADSGmpo
JWT_SECRET=0000000000000000000000000000000000000000000000000000000000000000
JWT_EXPIRY=24h
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://postgres:pria_local@localhost:5432/pria
MINIMAX_MODEL=MiniMax-M2.7
MINIMAX_TEMPERATURE=0.2
MINIMAX_MAX_TOKENS=4096
"@

$envContent | Out-File -FilePath "$ServerDir\.env" -Encoding UTF8 -NoNewline
Write-Host "[env] Updated server/.env with PostgreSQL connection" -ForegroundColor Green

# Open backend terminal
Write-Host "[backend] Opening backend server..." -ForegroundColor Yellow
$backendCmd = "cd /d $ServerDir; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd -WorkingDirectory $ServerDir -WindowStyle Normal

# Open frontend terminal
Write-Host "[frontend] Opening frontend server..." -ForegroundColor Yellow
$frontendCmd = "cd /d $ProjectRoot; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd -WorkingDirectory $ProjectRoot -WindowStyle Normal

Start-Sleep 2
Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Green
Write-Host "Backend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "PgAdmin: localhost:5432 (postgres / pria_local)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Check the two PowerShell windows that opened." -ForegroundColor Magenta