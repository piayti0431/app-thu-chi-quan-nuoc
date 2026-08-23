param(
  [Parameter(Mandatory = $true)]
  [int]$VersionCode,

  [Parameter(Mandatory = $true)]
  [string]$VersionName,

  [string]$ApkPath = "dist/app-thu-chi-quan-nuoc-release.apk",
  [string]$ProjectUrl = $env:SUPABASE_URL,
  [string]$ReleaseNotes = "",
  [string]$BuildLabel = (Get-Date -Format "yyyyMMddHHmmss"),
  [switch]$ForceUpdate
)

$ErrorActionPreference = "Stop"

if (-not $ProjectUrl) {
  $ProjectUrl = "https://rbvpsaotqmddtvcxkyxz.supabase.co"
}
if ($ProjectUrl -ne "https://rbvpsaotqmddtvcxkyxz.supabase.co") {
  throw "ProjectUrl khong khop project Supabase cua app"
}

$resolvedApk = Resolve-Path -LiteralPath $ApkPath
$sourceApkPath = $ApkPath
$apkHash = (Get-FileHash -LiteralPath $resolvedApk.Path -Algorithm SHA256).Hash.ToLowerInvariant()
$safeBuildLabel = $BuildLabel -replace "[^a-zA-Z0-9._-]", "-"
$objectName = "app-thu-chi-quan-nuoc-v$VersionName-$VersionCode-$safeBuildLabel.apk"
$storagePath = "ss:///app-releases/$objectName"
$publicUrl = "$ProjectUrl/storage/v1/object/public/app-releases/$objectName"

$uploadArgs = @(
  "supabase",
  "storage",
  "cp",
  $sourceApkPath,
  $storagePath,
  "--linked",
  "--experimental",
  "--content-type",
  "application/vnd.android.package-archive",
  "--cache-control",
  "no-cache"
)
& npx @uploadArgs
if ($LASTEXITCODE -ne 0) {
  throw "Upload APK len Supabase Storage that bai"
}

$escapedUrl = $publicUrl.Replace("'", "''")
$escapedVersionName = $VersionName.Replace("'", "''")
$escapedNotes = $ReleaseNotes.Replace("'", "''")
$forceValue = if ($ForceUpdate.IsPresent) { "true" } else { "false" }

$sql = @"
update public.app_updates
set enabled = false
where platform = 'android'
  and version_code = $VersionCode;

insert into public.app_updates (
  platform,
  version_code,
  version_name,
  apk_url,
  apk_sha256,
  release_notes,
  force_update,
  enabled
) values (
  'android',
  $VersionCode,
  '$escapedVersionName',
  '$escapedUrl',
  '$apkHash',
  '$escapedNotes',
  $forceValue,
  true
);
"@

$tmpSql = Join-Path $env:TEMP "nuocmia-publish-update-$VersionCode.sql"
Set-Content -LiteralPath $tmpSql -Value $sql -Encoding UTF8
npx supabase db query --linked --file $tmpSql
if ($LASTEXITCODE -ne 0) {
  throw "Insert metadata cap nhat vao Supabase that bai"
}
Remove-Item -LiteralPath $tmpSql -Force

Write-Host "Published update $VersionName ($VersionCode)"
Write-Host "APK URL: $publicUrl"
Write-Host "SHA-256: $apkHash"
