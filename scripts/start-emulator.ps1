. "$PSScriptRoot\env-android.ps1"

$proxyPort = 8888
$proxyScript = Join-Path $PSScriptRoot "android-emulator-proxy.mjs"
$existingProxy = Get-CimInstance Win32_Process |
  Where-Object { $_.CommandLine -like "*android-emulator-proxy.mjs*" }

if (-not $existingProxy) {
  Start-Process -WindowStyle Hidden -FilePath "node" -ArgumentList @($proxyScript)
}

emulator -avd NuocMia_API36 -dns-server 8.8.8.8,1.1.1.1
