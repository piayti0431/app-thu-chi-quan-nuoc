alter table public.giao_dich
  add column if not exists chi_nhanh text default 'Quán Nhà (Chính)',
  add column if not exists so_luong integer default 1;

create index if not exists idx_giao_dich_user_chi_nhanh on public.giao_dich (user_id, chi_nhanh);
