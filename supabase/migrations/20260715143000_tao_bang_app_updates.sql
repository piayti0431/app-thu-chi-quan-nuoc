create table if not exists public.app_updates (
  id              bigserial primary key,
  platform        text not null default 'android',
  version_code    integer not null,
  version_name    text not null,
  apk_url         text not null,
  release_notes   text default '',
  force_update    boolean default false,
  enabled         boolean default true,
  created_at      timestamptz default now()
);

alter table public.app_updates enable row level security;

drop policy if exists "nguoi_dung_doc_ban_cap_nhat" on public.app_updates;

create policy "nguoi_dung_doc_ban_cap_nhat" on public.app_updates
  for select to authenticated using (enabled = true);

grant select on public.app_updates to authenticated;

create index if not exists idx_app_updates_platform_version
  on public.app_updates (platform, version_code desc)
  where enabled = true;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'app-releases',
  'app-releases',
  true,
  52428800,
  array['application/vnd.android.package-archive', 'application/octet-stream']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "doc_file_cap_nhat_cong_khai" on storage.objects;

create policy "doc_file_cap_nhat_cong_khai" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'app-releases');
