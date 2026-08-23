alter table public.app_updates
  add constraint app_updates_version_code_positive
  check (version_code > 0);

alter table public.app_updates
  add constraint app_updates_apk_url_trusted
  check (
    apk_url like 'https://rbvpsaotqmddtvcxkyxz.supabase.co/storage/v1/object/public/app-releases/%.apk'
  );

revoke all on public.app_updates from anon;
revoke insert, update, delete on public.app_updates from authenticated;
grant select on public.app_updates to authenticated;
