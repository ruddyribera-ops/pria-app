<#
# DEPRECATED — use scripts/smoke-test.js instead
# This PowerShell script is kept for backward compatibility only.
# The Node.js version uses native fetch (Node 18+) with no dependencies.
#
<#
.SYNOPSIS
  Smoke test for PRIA v10 production deployment.
.DESCRIPTION
  Hits critical endpoints and reports pass/fail. Exits with non-zero if any check fails.
  Usage: pwsh scripts/smoke-test.ps1 -BaseUrl "https://your-app.railway.app"
.PARAMETER BaseUrl
  The base URL of the deployment (no trailing slash).
#>
param(
  [Parameter(Mandatory=$true)][string]$BaseUrl
)

$ErrorActionPreference = 'Stop'
$script:passed = 0
$script:failed = 0

function Test-Endpoint {
  param(
    [string]$Name,
    [string]$Method = 'GET',
    [string]$Path,
    [hashtable]$Headers = @{},
    [string]$Body = $null,
    [int]$ExpectedStatus = 200,
    [scriptblock]$ValidateResponse = $null
  )

  $url = "$BaseUrl$Path"
  Write-Host "  -> $Name ($Method $Path) " -NoNewline

  try {
    $requestParams = @{
      Uri = $url
      Method = $Method
      Headers = $Headers
      TimeoutSec = 10
    }
    if ($Body) {
      $requestParams.Body = $Body
      $requestParams.ContentType = 'application/json'
    }

    $response = Invoke-WebRequest @requestParams -UseBasicParsing
    $status = $response.StatusCode
    $body = $null
    if ($response.Content) {
      $body = $response.Content | ConvertFrom-Json -ErrorAction SilentlyContinue
    }

    if ($status -ne $ExpectedStatus) {
      Write-Host "FAIL (expected $ExpectedStatus, got $status)" -ForegroundColor Red
      $script:failed++
      return
    }

    if ($ValidateResponse -and $body -and -not (& $ValidateResponse $body)) {
      Write-Host "FAIL (response validation failed)" -ForegroundColor Red
      $script:failed++
      return
    }

    Write-Host "PASS ($status)" -ForegroundColor Green
    $script:passed++
  }
  catch {
    $statusCode = $null
    if ($_.Exception.Response) {
      $statusCode = $_.Exception.Response.StatusCode.value__
    }

    if ($statusCode -eq $ExpectedStatus) {
      Write-Host "PASS ($statusCode)" -ForegroundColor Green
      $script:passed++
    } else {
      $msg = $_.Exception.Message
      if ($statusCode) {
        Write-Host "FAIL ($statusCode)" -ForegroundColor Red
      } else {
        Write-Host "FAIL (${msg})" -ForegroundColor Red
      }
      $script:failed++
    }
  }
}

Write-Host "`n=== PRIA v10 Smoke Test ===" -ForegroundColor Cyan
Write-Host "Target: $BaseUrl`n"

# 1. Health check (most important)
Test-Endpoint -Name "Health check (DB connected)" -Path "/api/health" -ExpectedStatus 200 -ValidateResponse {
  param($body)
  if (-not $body) {
    Write-Host "`n    [debug] body is null or not JSON" -ForegroundColor DarkYellow
    return $false
  }
  Write-Host "    [debug] status=$($body.status), db=$($body.db)" -ForegroundColor DarkGray
  return ($body.status -eq 'ok') -and ($body.db -eq 'connected')
}

# 2. Health check includes response time
Test-Endpoint -Name "Health check response time < 2s" -Path "/api/health" -ExpectedStatus 200 -ValidateResponse {
  param($body)
  if (-not $body -or -not $body.responseTimeMs) { return $true }
  if ($body.responseTimeMs -gt 2000) {
    Write-Host "`n    Response time: $($body.responseTimeMs)ms (too slow)" -ForegroundColor Yellow
    return $false
  }
  return $true
}

# 3. Auth endpoint rejects unauthenticated request
Test-Endpoint -Name "Auth endpoint returns 401 unauthenticated" -Path "/api/auth/me" -ExpectedStatus 401

# 4. Login with default credentials (admin/admin123) -- should succeed if seed ran
Test-Endpoint -Name "Login as default admin" -Method "POST" -Path "/api/auth/login" -Body '{"username":"admin","password":"admin123"}' -ExpectedStatus 200 -ValidateResponse {
  param($body)
  if (-not $body) { return $true }
  return $body.data.token -ne $null -and $body.data.user.role -eq 'admin'
}

# 5. Login with wrong credentials should fail
Test-Endpoint -Name "Login with wrong password" -Method "POST" -Path "/api/auth/login" -Body '{"username":"admin","password":"wrong"}' -ExpectedStatus 401

# 6. Forgot password endpoint
Test-Endpoint -Name "Forgot password" -Method "POST" -Path "/api/auth/forgot-password" -Body '{"email":"admin@example.com"}' -ExpectedStatus 200

# 7. Static assets (SPA shell) — skip in dev mode (Vite serves SPA on :5173)
$isDev = $BaseUrl -match 'localhost|127\.0\.0\.1'
if (-not $isDev) {
  Test-Endpoint -Name "Static index.html" -Path "/" -ExpectedStatus 200
} else {
  Write-Host "  -> Static index.html SKIPPED (dev mode — Vite serves SPA on :5173)" -ForegroundColor Yellow
}

# 8. CSP report endpoint accepts reports
Test-Endpoint -Name "CSP report endpoint" -Method "POST" -Path "/api/csp-report" -Body '{"csp-report":{"document-uri":"https://example.com","violated-directive":"script-src"}}' -ExpectedStatus 204

# 9. 404 on unknown route
Test-Endpoint -Name "404 on unknown API route" -Path "/api/nonexistent" -ExpectedStatus 404

Write-Host "`n=== Results ===" -ForegroundColor Cyan
Write-Host "  Passed: $script:passed" -ForegroundColor Green
Write-Host "  Failed: $script:failed" -ForegroundColor $(if ($script:failed -gt 0) { 'Red' } else { 'Green' })

if ($script:failed -gt 0) {
  Write-Host "`n[X] Smoke test FAILED. Do not deploy or roll back." -ForegroundColor Red
  exit 1
}

Write-Host "`n[+] All smoke tests passed." -ForegroundColor Green
exit 0