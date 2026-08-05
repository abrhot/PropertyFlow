$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3001/api'

function Login($email) {
  $body = @{ email = $email; password = 'Password123' } | ConvertTo-Json
  $res = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -Body $body -ContentType 'application/json'
  return $res.accessToken
}

function Get-Count($token, $path) {
  $headers = @{ Authorization = "Bearer $token" }
  try {
    $res = Invoke-RestMethod -Uri "$base$path" -Method Get -Headers $headers
    return $res
  } catch {
    return $null
  }
}

$admin = Login 'orgadmin@demo.test'
$manager = Login 'manager@demo.test'
Write-Output "Logged in admin + manager OK"

$adminProps = (Get-Count $admin '/properties').properties
$mgrProps = (Get-Count $manager '/properties').properties
Write-Output ("Properties  -> admin: {0}, manager: {1}" -f $adminProps.Count, $mgrProps.Count)
Write-Output ("  manager buildings: " + (($mgrProps | ForEach-Object { $_.name }) -join ', '))

$adminLeases = (Get-Count $admin '/leases').leases
$mgrLeases = (Get-Count $manager '/leases').leases
Write-Output ("Leases      -> admin: {0}, manager: {1}" -f $adminLeases.Count, $mgrLeases.Count)

$adminPay = (Get-Count $admin '/payments').payments
$mgrPay = (Get-Count $manager '/payments').payments
Write-Output ("Payments    -> admin: {0}, manager: {1}" -f $adminPay.Count, $mgrPay.Count)

$adminMaint = (Get-Count $admin '/maintenance-requests').requests
$mgrMaint = (Get-Count $manager '/maintenance-requests').requests
Write-Output ("Maintenance -> admin: {0}, manager: {1}" -f $adminMaint.Count, $mgrMaint.Count)

$adminTen = (Get-Count $admin '/tenants').tenants
$mgrTen = (Get-Count $manager '/tenants').tenants
Write-Output ("Tenants     -> admin: {0}, manager: {1}" -f $adminTen.Count, $mgrTen.Count)

# Manager-assignment endpoint: admin allowed, manager forbidden.
$assign = Get-Count $admin '/properties/managers'
Write-Output ("Admin GET /properties/managers -> managers: {0}, properties: {1}" -f $assign.managers.Count, $assign.properties.Count)

$mgrHeaders = @{ Authorization = "Bearer $manager" }
try {
  Invoke-RestMethod -Uri "$base/properties/managers" -Method Get -Headers $mgrHeaders | Out-Null
  Write-Output "Manager GET /properties/managers -> ALLOWED (unexpected!)"
} catch {
  Write-Output ("Manager GET /properties/managers -> blocked ({0})" -f $_.Exception.Response.StatusCode.value__)
}
