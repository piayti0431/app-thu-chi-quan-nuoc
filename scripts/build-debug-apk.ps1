. "$PSScriptRoot\env-android.ps1"

Push-Location (Join-Path $PSScriptRoot "..\android")
try {
  .\gradlew.bat assembleDebug
} finally {
  Pop-Location
}
