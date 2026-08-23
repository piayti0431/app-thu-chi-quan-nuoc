alter table public.app_updates
  add column if not exists apk_sha256 text;

update public.app_updates
set apk_sha256 = repeat('0', 64)
where apk_sha256 is null;

alter table public.app_updates
  alter column apk_sha256 set not null;

alter table public.app_updates
  add constraint app_updates_apk_sha256_format
  check (apk_sha256 ~ '^[a-fA-F0-9]{64}$');
