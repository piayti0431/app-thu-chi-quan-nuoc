import assert from "node:assert/strict";
import { mergeTransactions, pendingTransactions, toRemoteTransaction } from "../www/js/sync-model.js";

const localSale = {
  id: 101,
  ngay: "2026-07-15",
  gio: "08:00",
  loai: "thu",
  soTien: 10000,
  danhMuc: "Bán nước mía",
  ghiChu: "Máy nhà",
  cauNoiGoc: "1 ly nước mía",
  daSuaTay: false,
  daSync: true,
  deleted: false,
  updatedAt: "2026-07-15T01:00:00.000Z",
};

{
  const remoteRows = [
    {
      id: 202,
      device_id: "phone-b",
      ngay: "2026-07-15",
      gio: "09:10",
      loai: "thu",
      so_tien: 16000,
      danh_muc: "Nước mía 1 lít",
      ghi_chu: "Máy phụ",
      cau_noi_goc: "1 chai nước mía 1 lít",
      da_sua_tay: false,
      deleted: false,
      updated_at: "2026-07-15T02:10:00.000Z",
    },
  ];
  const merged = mergeTransactions([localSale], remoteRows);
  assert.equal(merged.items.length, 2);
  assert.equal(merged.items.find((item) => item.id === 202).soTien, 16000);
  assert.equal(merged.stats.pulled, 1);
}

{
  const remoteRows = [
    {
      ...toRemoteTransaction(localSale),
      deleted: true,
      updated_at: "2026-07-15T03:00:00.000Z",
    },
  ];
  const merged = mergeTransactions([localSale], remoteRows);
  assert.equal(merged.items.some((item) => item.id === localSale.id), false);
  assert.equal(merged.stats.removed, 1);
}

{
  const localUnsynced = {
    ...localSale,
    daSync: false,
    soTien: 30000,
    updatedAt: "2026-07-15T04:00:00.000Z",
  };
  const remoteRows = [
    {
      ...toRemoteTransaction(localSale),
      so_tien: 10000,
      updated_at: "2026-07-15T03:00:00.000Z",
    },
  ];
  const merged = mergeTransactions([localUnsynced], remoteRows);
  assert.equal(merged.items.find((item) => item.id === localSale.id).soTien, 30000);
  assert.equal(merged.stats.conflictsKeptLocal, 1);
}

{
  const deletedLocal = { ...localSale, deleted: true, daSync: false };
  const pending = pendingTransactions([localSale, deletedLocal]);
  assert.equal(pending.length, 1);
  assert.equal(toRemoteTransaction(deletedLocal).deleted, true);
}

console.log("PASS sync-model: push, pull, soft-delete, conflict handling");
