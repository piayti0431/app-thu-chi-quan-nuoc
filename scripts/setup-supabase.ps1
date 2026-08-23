param(
  [string]$ProjectRef
)

$ErrorActionPreference = "Stop"

if (-not $ProjectRef) {
  $ProjectRef = Read-Host "Nhap Supabase Project Ref"
}

if (-not $ProjectRef) {
  throw "Thieu Project Ref"
}

Write-Host "Dang dang nhap Supabase CLI. Hay dan Personal Access Token khi CLI hoi."
npx supabase login

Write-Host "Dang link project $ProjectRef. CLI se hoi Database Password cua Supabase."
npx supabase link --project-ref $ProjectRef

Write-Host "Dang day migration len Supabase bang CLI."
npx supabase db push

Write-Host "Xong. Kiem tra bang public.giao_dich trong Supabase Dashboard."
