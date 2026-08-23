. "$PSScriptRoot\env-android.ps1"

$adb = Join-Path $env:ANDROID_HOME "platform-tools\adb.exe"
$apk = Join-Path $PSScriptRoot "..\android\app\build\outputs\apk\debug\app-debug.apk"

& $adb kill-server | Out-Null
Start-Sleep -Seconds 2
& $adb start-server | Out-Null

$ready = $false
for ($i = 0; $i -lt 60; $i++) {
  $devices = & $adb devices
  if ($devices -match "device$") {
    $boot = (& $adb shell getprop sys.boot_completed 2>$null).Trim()
    if ($boot -eq "1") {
      $ready = $true
      break
    }
  }
  Start-Sleep -Seconds 5
}

if (-not $ready) {
  & $adb devices -l
  throw "Emulator chua online/boot xong sau 5 phut."
}

# Keep the emulator on its normal network path. A stale local proxy makes
# Supabase requests fail with "TypeError: Failed to fetch".
& $adb shell settings delete global http_proxy 2>$null | Out-Null
& $adb shell settings delete global global_http_proxy_host 2>$null | Out-Null
& $adb shell settings delete global global_http_proxy_port 2>$null | Out-Null

& $adb install -r $apk
& $adb shell monkey -p com.giadinh.nuocmia 1
