$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot"
$env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA "Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME

$paths = @(
  (Join-Path $env:JAVA_HOME "bin"),
  (Join-Path $env:ANDROID_HOME "platform-tools"),
  (Join-Path $env:ANDROID_HOME "emulator"),
  (Join-Path $env:ANDROID_HOME "cmdline-tools\latest\bin")
)

$env:Path = ($paths -join ";") + ";" + $env:Path
