alter table public.giao_dich
  add column if not exists gia_cost_don_vi integer default 0,
  add column if not exists tong_gia_cost integer default 0;
