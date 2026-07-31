# kill-port.ps1 - Robust port killer that kills ALL listeners, not just one
# Usage: .\scripts\kill-port.ps1 -Port <int> [-TimeoutSec <int>]
# Returns: $true if port is free, $false if still held
param(
    [Parameter(Mandatory=$true)]
    [int]$Port,

    [int]$TimeoutSec = 5
)

$ErrorActionPreference = 'Continue'

function Get-PortPids {
    param([int]$Port)
    $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($conns) {
        return @($conns.OwningProcess | Sort-Object -Unique)
    }
    return @()
}

# Check initial state
$initialPids = Get-PortPids -Port $Port
if ($initialPids.Count -eq 0) {
    Write-Host "Port $Port is already free"
    $true
    return
}

Write-Host "Port $Port is held by PIDs: $($initialPids -join ', ')"

# Kill all PIDs
foreach ($pid in $initialPids) {
    $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
    if ($proc) {
        $cmdLine = if ($proc.CommandLine) { $proc.CommandLine } else { "(no command line)" }
        Write-Host "  Killing PID $pid : $cmdLine"
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    } else {
        Write-Host "  PID $pid already gone"
    }
}

# Wait for kernel to release the port
$waited = 0
$interval = 250  # ms
while ($waited -lt ($TimeoutSec * 1000)) {
    Start-Sleep -Milliseconds $interval
    $waited += $interval
    $remaining = Get-PortPids -Port $Port
    if ($remaining.Count -eq 0) {
        Write-Host "Port $Port is now free (after ${waited}ms)"
        $true
        return
    }
    Write-Host "  Still held by: $($remaining -join ', ') - waiting..."
}

# Final check
$stillHeld = Get-PortPids -Port $Port
if ($stillHeld.Count -gt 0) {
    Write-Host "WARNING: Port $Port still held by $($stillHeld -join ', ')"
    $false
} else {
    $true
}
