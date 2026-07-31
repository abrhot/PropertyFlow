$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3001/api'

$roles = [ordered]@{
  'ORG_ADMIN'        = 'orgadmin@demo.test'
  'PROPERTY_MANAGER' = 'manager@demo.test'
  'MAINTENANCE'      = 'maintenance@demo.test'
  'OWNER'            = 'owner@demo.test'
  'TENANT'           = 'tenant@demo.test'
}

# GET endpoints to probe (read-only, safe)
$endpoints = [ordered]@{
  'me'            = '/auth/me'
  'dashboard'     = '/dashboard/summary'
  'properties'    = '/properties'
  'leases'        = '/leases'
  'payments'      = '/payments'
  'maintenance'   = '/maintenance-requests'
  'work-orders'   = '/work-orders'
  'applications'  = '/applications'
  'tenants'       = '/tenants'
  'reports'       = '/reports/dashboard'
  'messages'      = '/conversations'
  'settings'      = '/settings'
  'invitations'   = '/invitations'
}

function Login($email) {
  $body = @{ email = $email; password = 'Password123' } | ConvertTo-Json
  try {
    $r = Invoke-WebRequest -Uri "$base/auth/login" -Method Post -Body $body -ContentType 'application/json' -UseBasicParsing -TimeoutSec 15
    return ($r.Content | ConvertFrom-Json).accessToken
  } catch {
    Write-Host "LOGIN FAILED for $email : $($_.Exception.Message)" -ForegroundColor Red
    return $null
  }
}

function Probe($token, $path) {
  try {
    $r = Invoke-WebRequest -Uri "$base$path" -Headers @{ Authorization = "Bearer $token" } -UseBasicParsing -TimeoutSec 15
    return $r.StatusCode
  } catch {
    $s = $_.Exception.Response.StatusCode.value__
    if ($s) { return $s } else { return 'ERR' }
  }
}

# Build header
$colW = 13
$header = 'ENDPOINT'.PadRight($colW)
foreach ($r in $roles.Keys) { $header += ($r.Substring(0,[Math]::Min(4,$r.Length))).PadLeft(6) }
Write-Host $header -ForegroundColor Cyan
Write-Host ('-' * $header.Length)

# Login all
$tokens = @{}
foreach ($r in $roles.Keys) { $tokens[$r] = Login $roles[$r] }

foreach ($ep in $endpoints.Keys) {
  $line = $ep.PadRight($colW)
  foreach ($r in $roles.Keys) {
    $code = if ($tokens[$r]) { Probe $tokens[$r] $endpoints[$ep] } else { 'NOAUTH' }
    $line += ("$code").PadLeft(6)
  }
  Write-Host $line
}
Write-Host ''
Write-Host 'Legend: 200/201 OK | 403 forbidden (expected for restricted) | 404 not found | ERR/NOAUTH problem' -ForegroundColor DarkGray
