alter table public.giao_dich
  add column if not exists phuong_thuc text default 'tien_mat';
