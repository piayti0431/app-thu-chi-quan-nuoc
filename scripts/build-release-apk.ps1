. "$PSScriptRoot\env-android.ps1"

Push-Location "$PSScriptRoot\..\android"
try {
  .\gradlew.bat assembleRelease
}
finally {
  Pop-Location
}

$sourceApk = Join-Path $PSScriptRoot "..\android\app\build\outputs\apk\release\app-release.apk"
$distDir = Join-Path $PSScriptRoot "..\dist"
$targetApk = Join-Path $distDir "app-thu-chi-quan-nuoc-release.apk"

New-Item -ItemType Directory -Force -Path $distDir | Out-Null
Copy-Item -Force -Path $sourceApk -Destination $targetApk
Write-Host "Da tao APK release: $targetApk"
