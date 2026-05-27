$ErrorActionPreference = 'SilentlyContinue'

Write-Host "Stopping PostgreSQL Docker container..." -ForegroundColor Cyan
docker compose down

Write-Host "PostgreSQL stopped." -ForegroundColor Yellow
Write-Host "Data persisted in Docker volume 'pgdata'. Restart with .\scripts\start-db.ps1" -ForegroundColor Cyan