param([string]$Action, [string]$ProjectRoot = "D:\ACTIVE PROJECTS\PRIA v10")

$ErrorActionPreference = "Stop"

function Start-Backend {
    $serverDir = Join-Path $ProjectRoot "server"
    $envFile = Join-Path $serverDir ".env"
    $drive = "D:"
    $cmd = "cd /d $serverDir && npm run dev"
    Write-Host "[backend] Starting..."
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $cmd -WindowStyle Normal -WorkingDirectory $serverDir
    Start-Sleep 3
    Write-Host "[backend] Window opened"
}

function Start-Frontend {
    $cmd = "cd /d $ProjectRoot && npm run dev"
    Write-Host "[frontend] Starting..."
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $cmd -WindowStyle Normal -WorkingDirectory $ProjectRoot
    Start-Sleep 3
    Write-Host "[frontend] Window opened"
}

function Start-Docker-Postgres {
    Write-Host "[docker] Starting PostgreSQL container..."
    $existing = docker ps -a --filter "name=pria-pg" --format "{{.Names}}" 2>$null
    if ($existing -eq "pria-pg") {
        Write-Host "[docker] Container already exists, removing..."
        docker rm -f pria-pg 2>$null | Out-Null
    }
    docker run -d --name pria-pg -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=pria_local -e POSTGRES_DB=pria -p 5432:5432 postgres:16-alpine
    Start-Sleep 5
    Write-Host "[docker] PostgreSQL started on port 5432"
    # Test connection
    $test = docker exec pria-pg pg_isready -U postgres 2>$null
    Write-Host "[docker] pg_isready: $test"
}

function Kill-All-Node {
    Write-Host "[node] Killing all node processes..."
    taskkill /F /IM node.exe /T 2>$null | Out-Null
    Write-Host "[node] All node processes killed"
}

switch ($Action) {
    "postgres" { Start-Docker-Postgres }
    "backend" { Start-Backend }
    "frontend" { Start-Frontend }
    "all" { Start-Docker-Postgres; Start-Backend; Start-Frontend }
    "clean" { Kill-All-Node }
    default { Write-Host "Usage: .\start-servers.ps1 -Action <postgres|backend|frontend|all|clean>" }
}