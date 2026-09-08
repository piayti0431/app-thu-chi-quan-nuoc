import assert from "node:assert/strict";
import { setupTestEnv } from "./setup.mjs";

const { storage } = setupTestEnv();
const { docDuLieu, luuDuLieu, xuatDuLieuJson, nhapDuLieuTuJson, DEFAULT_DATA } = await import("../www/js/db.js");

console.log("Starting tests/db-backup-restore.test.mjs...");

// Test 1: Export and Import JSON with 0-amount transactions (Bug 4 fix)
{
  const testData = JSON.parse(JSON.stringify(DEFAULT_DATA));
  testData.ds = [
    {
      id: 101,
      ngay: "2026-09-08",
      gio: "10:00",
      loai: "thu",
      soTien: 50000,
      danhMuc: "Nước mía",
    },
    {
      id: 102,
      ngay: "2026-09-08",
      gio: "10:05",
      loai: "xuat_dung",
      soTien: 0,
      soLuong: 2,
      donViTinh: "phần",
      danhMuc: "Đá viên",
      ghiChu: "Xuất dùng đá",
    },
    {
      id: 103,
      ngay: "2026-09-08",
      gio: "10:10",
      loai: "nhap_kho",
      soTien: 0,
      soLuong: 5,
      donViTinh: "bó",
      danhMuc: "Mía cây",
    },
  ];

  await luuDuLieu(testData);
  const exported = await xuatDuLieuJson();
  assert.ok(typeof exported === "string" && exported.length > 50);

  // Clear primary storage and import back
  storage.clear();
  await nhapDuLieuTuJson(exported);
  const importResult = await docDuLieu();
  assert.equal(importResult.ds.length, 3);
  assert.equal(importResult.ds[1].soTien, 0);
  assert.equal(importResult.ds[1].loai, "xuat_dung");

  console.log("PASS 1: Export and import JSON handles 0-amount inventory transactions without error");
}

// Test 2: Backup Mirror and Corruption Recovery (Bug 2 fix)
{
  // Save a good transaction
  await luuDuLieu({
    ds: [
      { id: 999, ngay: "2026-09-08", gio: "12:00", loai: "thu", soTien: 20000, danhMuc: "Mía tắc" },
    ],
  });

  // Verify backup exists in storage
  const backup = storage.getItem("nuocmia_v1_backup");
  assert.ok(backup !== null, "Backup should be persisted in storage");
  assert.ok(backup.includes("999"), "Backup should contain transaction 999");

  // Simulate corruption in primary key
  storage.setItem("nuocmia_v1", "{bad json broken: [");

  // docDuLieu should fall back to backup
  const recovered = await docDuLieu();
  assert.ok(recovered && Array.isArray(recovered.ds));
  assert.equal(recovered.ds[0].id, 999);
  assert.equal(recovered.ds[0].soTien, 20000);

  console.log("PASS 2: Corrupted primary storage automatically recovers from backup mirror");
}

// Test 3: Rejection of invalid JSON / invalid transactions
{
  await assert.rejects(
    async () => {
      await nhapDuLieuTuJson("not a json string");
    },
    (err) => err instanceof SyntaxError || /JSON/i.test(err.message)
  );

  await assert.rejects(
    async () => {
      await nhapDuLieuTuJson(JSON.stringify({ ds: [{ loai: "thu", soTien: -1000 }] }));
    },
    /khong hop le/i
  );

  console.log("PASS 3: Malformed JSON and invalid transactions are safely rejected");
}

console.log("ALL db-backup-restore tests passed successfully!");
