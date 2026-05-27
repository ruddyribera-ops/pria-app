$ErrorActionPreference = 'SilentlyContinue'

Write-Host "Starting PostgreSQL via Docker..." -ForegroundColor Cyan
docker compose up -d postgres

if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker Compose failed. Is Docker Desktop running?" -ForegroundColor Red
    exit 1
}

Write-Host "Waiting for PostgreSQL to be healthy..." -ForegroundColor Yellow
docker compose exec postgres pg_isready -U postgres -t 30 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "PostgreSQL is ready! Connect with DATABASE_URL from .env.example" -ForegroundColor Green
    Write-Host "  postgresql://postgres:pria_local@localhost:5432/pria" -ForegroundColor Cyan
} else {
    Write-Host "PostgreSQL failed to become ready in time." -ForegroundColor Red
}