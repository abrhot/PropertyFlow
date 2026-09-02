<#
.SYNOPSIS
  Builds a standalone PropertyFlow debug APK for a physical Android phone.

.DESCRIPTION
  Gradle cannot run Metro itself in this pnpm monorepo, so the JS bundle is
  produced here, compiled to Hermes bytecode, and dropped where app/build.gradle
  picks it up (see the `usePrebuiltBundle` block there). Build artifacts and the
  Gradle cache live on D: because C: runs out of space.

  The APK is debug-signed but loads the embedded bundle, so it runs with no dev
  server attached.

.PARAMETER SkipApiUrl
  Keep the existing expo.extra.apiUrl instead of re-detecting this machine's LAN IP.

.PARAMETER Clean
  Delete the previous bundle output before exporting.
#>
param(
  [switch]$SkipApiUrl,
  [switch]$Clean
)

$ErrorActionPreference = 'Stop'

$mobileDir = Split-Path -Parent $PSScriptRoot
$androidDir = Join-Path $mobileDir 'android'
$buildRoot = 'D:\propertyflow-build'
$bundleDir = Join-Path $buildRoot 'bundle'

$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME = 'C:\Users\USER\AppData\Local\Android\Sdk'
$env:GRADLE_USER_HOME = Join-Path $buildRoot 'gradle'
$env:TEMP = Join-Path $buildRoot 'tmp'
$env:TMP = $env:TEMP
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:PATH"

# Metro must treat the app folder (not the workspace root) as the project root.
$env:EXPO_NO_METRO_WORKSPACE_ROOT = '1'
$env:NODE_ENV = 'production'
$env:NODE_OPTIONS = '--max-old-space-size=4096'

New-Item -ItemType Directory -Force -Path $bundleDir, $env:TEMP, $env:GRADLE_USER_HOME | Out-Null
Set-Location $mobileDir

if (-not $SkipApiUrl) {
  Write-Host '==> Writing this machine''s LAN address into app.json' -ForegroundColor Cyan
  node scripts/set-api-url.js
  if ($LASTEXITCODE -ne 0) { throw 'Could not determine the LAN API address.' }
}

if ($Clean) {
  Write-Host '==> Clearing previous bundle output' -ForegroundColor Cyan
  Remove-Item -Recurse -Force (Join-Path $bundleDir '*') -ErrorAction SilentlyContinue
}

Write-Host '==> Exporting the JS bundle' -ForegroundColor Cyan
npx expo export:embed `
  --platform android `
  --entry-file index.js `
  --bundle-output (Join-Path $bundleDir 'index.android.bundle') `
  --assets-dest (Join-Path $bundleDir 'res') `
  --dev false
if ($LASTEXITCODE -ne 0) { throw 'expo export:embed failed.' }

$jsBundle = Join-Path $bundleDir 'index.android.bundle'
if (-not (Test-Path $jsBundle) -or (Get-Item $jsBundle).Length -eq 0) {
  throw "Bundle missing or empty: $jsBundle"
}

Write-Host '==> Compiling to Hermes bytecode' -ForegroundColor Cyan
$rnDir = Split-Path (node --print "require.resolve('react-native/package.json')")
$hermesc = Join-Path $rnDir 'sdks\hermesc\win64-bin\hermesc.exe'
if (-not (Test-Path $hermesc)) { throw "hermesc not found at $hermesc" }

$hbc = Join-Path $bundleDir 'index.android.hbc'
& $hermesc -emit-binary -out $hbc -O -w $jsBundle
if ($LASTEXITCODE -ne 0) { throw 'hermesc failed.' }

$hbcSize = [math]::Round((Get-Item $hbc).Length / 1MB, 2)
Write-Host "    bundle=$([math]::Round((Get-Item $jsBundle).Length / 1MB, 2))MB  hbc=${hbcSize}MB" -ForegroundColor DarkGray

Write-Host '==> Assembling the APK' -ForegroundColor Cyan
Set-Location $androidDir
.\gradlew.bat assembleDebug --no-daemon
if ($LASTEXITCODE -ne 0) { throw 'gradlew assembleDebug failed.' }

$apk = Join-Path $androidDir 'app\build\outputs\apk\debug\app-debug.apk'
if (-not (Test-Path $apk)) { throw "APK not found at $apk" }

$outDir = Join-Path $buildRoot 'apk'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$stamped = Join-Path $outDir 'propertyflow.apk'
Copy-Item $apk $stamped -Force

Write-Host ''
Write-Host "APK ready: $stamped ($([math]::Round((Get-Item $stamped).Length / 1MB, 1)) MB)" -ForegroundColor Green
Write-Host "Also at:   $apk" -ForegroundColor DarkGray
