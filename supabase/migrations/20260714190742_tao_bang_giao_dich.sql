create table if not exists public.giao_dich (
  id          bigint primary key,
  user_id     uuid not null default auth.uid(),
  device_id   text,
  ngay        date not null,
  gio         text,
  loai        text not null check (loai in ('thu','chi')),
  so_tien     integer not null check (so_tien > 0),
  danh_muc    text,
  ghi_chu     text,
  cau_noi_goc text,
  da_sua_tay  boolean default false,
  deleted     boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.giao_dich enable row level security;

drop policy if exists "chu_tai_khoan_doc" on public.giao_dich;
drop policy if exists "chu_tai_khoan_ghi" on public.giao_dich;
drop policy if exists "chu_tai_khoan_sua" on public.giao_dich;
drop policy if exists "chu_tai_khoan_xoa" on public.giao_dich;

create policy "chu_tai_khoan_doc" on public.giao_dich
  for select to authenticated using (user_id = auth.uid());

create policy "chu_tai_khoan_ghi" on public.giao_dich
  for insert to authenticated with check (user_id = auth.uid());

create policy "chu_tai_khoan_sua" on public.giao_dich
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "chu_tai_khoan_xoa" on public.giao_dich
  for delete to authenticated using (user_id = auth.uid());

create index if not exists idx_giao_dich_user_ngay on public.giao_dich (user_id, ngay);
create index if not exists idx_giao_dich_user_updated_at on public.giao_dich (user_id, updated_at);
